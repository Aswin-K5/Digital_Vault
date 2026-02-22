from fastapi import APIRouter, Depends
from fastapi import Query as QueryParam
from database import get_db
from utils.auth_deps import get_current_user
import json, re

router = APIRouter()

def tokenize(text: str) -> set:
    return set(re.findall(r'\w+', text.lower()))

def score_match(query_tokens: set, title: str, tags_str: str, summary: str = "") -> float:
    if not query_tokens:
        return 0.0
    title_hits = len(query_tokens & tokenize(title or ""))
    tag_hits = len(query_tokens & tokenize(tags_str or ""))
    summary_hits = len(query_tokens & tokenize(summary or ""))
    weighted = (title_hits * 3) + (tag_hits * 2) + (summary_hits * 1)
    max_possible = len(query_tokens) * 3
    return min(round(weighted / max_possible, 2), 1.0) if max_possible > 0 else 0.0

@router.get("/")
def smart_search(
    q: str = QueryParam(..., min_length=1),
    include_notes: bool = True,
    include_docs: bool = True,
    ai_boost: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = q.strip()
    if ai_boost:
        try:
            from services.ai_service import expand_search_query
            search_terms = expand_search_query(query)
        except Exception:
            search_terms = [query]
    else:
        search_terms = list(set([query] + query.split()))

    query_tokens = tokenize(query)
    results = {"notes": [], "documents": [], "query": query, "ai_boost": ai_boost}

    with get_db() as conn:
        cursor = conn.cursor()
        if include_notes:
            conditions = []
            params = [current_user["id"]]
            for term in search_terms:
                conditions.append("(title ILIKE %s OR tags ILIKE %s)")
                params.extend([f"%{term}%", f"%{term}%"])
            where = " OR ".join(conditions) if conditions else "1=0"
            cursor.execute(
                f"SELECT id, title, tags, updated_at FROM notes WHERE user_id = %s AND ({where}) ORDER BY updated_at DESC LIMIT 20",
                params
            )
            notes = cursor.fetchall()
            seen_ids = set()
            for n in notes:
                if n["id"] in seen_ids:
                    continue
                seen_ids.add(n["id"])
                tags_raw = n["tags"] or "[]"
                tags_list = json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
                score = score_match(query_tokens, n["title"], tags_raw)
                if score > 0:
                    results["notes"].append({
                        "id": n["id"], "title": n["title"], "tags": tags_list,
                        "updated_at": n["updated_at"], "similarity": score, "type": "note"
                    })

        if include_docs:
            conditions = []
            params = [current_user["id"]]
            for term in search_terms:
                conditions.append("(original_name ILIKE %s OR summary ILIKE %s)")
                params.extend([f"%{term}%", f"%{term}%"])
            where = " OR ".join(conditions) if conditions else "1=0"
            cursor.execute(
                f"SELECT id, original_name, summary, created_at FROM documents WHERE user_id = %s AND ({where}) ORDER BY created_at DESC LIMIT 10",
                params
            )
            docs = cursor.fetchall()
            seen_ids = set()
            for d in docs:
                if d["id"] in seen_ids:
                    continue
                seen_ids.add(d["id"])
                summary = d["summary"] or ""
                score = score_match(query_tokens, d["original_name"], "", summary)
                if score > 0:
                    results["documents"].append({
                        "id": d["id"], "name": d["original_name"],
                        "summary": summary[:200] + ("…" if len(summary) > 200 else ""),
                        "created_at": d["created_at"], "similarity": score, "type": "document"
                    })
        cursor.close()

    results["notes"].sort(key=lambda x: x["similarity"], reverse=True)
    results["documents"].sort(key=lambda x: x["similarity"], reverse=True)
    results["total"] = len(results["notes"]) + len(results["documents"])
    results["expanded_terms"] = search_terms if ai_boost else []
    return results