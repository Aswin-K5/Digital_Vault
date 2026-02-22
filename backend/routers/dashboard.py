from fastapi import APIRouter, Depends
from database import get_db
from utils.auth_deps import get_current_user
import json
from collections import Counter
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as c FROM notes WHERE user_id = %s", (uid,))
        total_notes = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM documents WHERE user_id = %s", (uid,))
        total_docs = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM documents WHERE user_id = %s AND summary IS NOT NULL AND summary != ''", (uid,))
        ai_summaries = cursor.fetchone()["c"]

        cursor.execute("SELECT SUM(file_size) as s FROM documents WHERE user_id = %s", (uid,))
        storage_bytes = cursor.fetchone()["s"] or 0

        cursor.execute("SELECT COUNT(*) as c FROM notes WHERE user_id = %s AND tags != '[]'", (uid,))
        notes_with_tags = cursor.fetchone()["c"]

        cursor.execute("SELECT id, title, updated_at FROM notes WHERE user_id = %s ORDER BY updated_at DESC LIMIT 5", (uid,))
        recent_notes = cursor.fetchall()

        cursor.execute("SELECT id, original_name, created_at FROM documents WHERE user_id = %s ORDER BY created_at DESC LIMIT 5", (uid,))
        recent_docs = cursor.fetchall()

        cursor.execute("SELECT tags FROM notes WHERE user_id = %s AND tags != '[]'", (uid,))
        all_tags_rows = cursor.fetchall()

        # Weekly activity - PostgreSQL uses to_char instead of strftime
        cursor.execute("""
            SELECT to_char(created_at, 'IYYY-IW') as week, COUNT(*) as count
            FROM notes WHERE user_id = %s AND created_at >= NOW() - INTERVAL '56 days'
            GROUP BY week ORDER BY week
        """, (uid,))
        weekly_notes = cursor.fetchall()

        cursor.execute("""
            SELECT to_char(created_at, 'IYYY-IW') as week, COUNT(*) as count
            FROM documents WHERE user_id = %s AND created_at >= NOW() - INTERVAL '56 days'
            GROUP BY week ORDER BY week
        """, (uid,))
        weekly_docs = cursor.fetchall()
        cursor.close()

    tag_counter = Counter()
    for row in all_tags_rows:
        try:
            tags = json.loads(row["tags"])
            tag_counter.update(tags)
        except Exception:
            pass
    top_tags = [{"tag": t, "count": c} for t, c in tag_counter.most_common(8)]
    storage_mb = round(storage_bytes / (1024 * 1024), 2)

    notes_by_week = {r["week"]: r["count"] for r in weekly_notes}
    docs_by_week = {r["week"]: r["count"] for r in weekly_docs}

    activity = []
    today = datetime.now()
    for i in range(7, -1, -1):
        d = today - timedelta(weeks=i)
        week_key = d.strftime("%G-%V")
        week_start = d - timedelta(days=d.weekday())
        label = week_start.strftime("%b %d")
        activity.append({
            "week": label,
            "notes": notes_by_week.get(week_key, 0),
            "documents": docs_by_week.get(week_key, 0),
        })

    return {
        "total_notes": total_notes,
        "total_documents": total_docs,
        "ai_summaries": ai_summaries,
        "storage_mb": storage_mb,
        "notes_with_tags": notes_with_tags,
        "top_tags": top_tags,
        "recent_notes": [dict(n) for n in recent_notes],
        "recent_documents": [dict(d) for d in recent_docs],
        "weekly_activity": activity,
    }