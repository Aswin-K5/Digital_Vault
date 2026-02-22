from fastapi import APIRouter, Depends
from database import get_db
from utils.auth_deps import get_current_user

router = APIRouter()

@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    with get_db() as conn:
        total_notes = conn.execute("SELECT COUNT(*) FROM notes WHERE user_id = ?", (uid,)).fetchone()[0]
        total_docs = conn.execute("SELECT COUNT(*) FROM documents WHERE user_id = ?", (uid,)).fetchone()[0]
        ai_summaries = conn.execute("SELECT COUNT(*) FROM documents WHERE user_id = ? AND summary IS NOT NULL AND summary != ''", (uid,)).fetchone()[0]
        storage_bytes = conn.execute("SELECT SUM(file_size) FROM documents WHERE user_id = ?", (uid,)).fetchone()[0] or 0
        notes_with_tags = conn.execute("SELECT COUNT(*) FROM notes WHERE user_id = ? AND tags != '[]'", (uid,)).fetchone()[0]
        
        # Recent activity
        recent_notes = conn.execute(
            "SELECT id, title, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5",
            (uid,)
        ).fetchall()
        recent_docs = conn.execute(
            "SELECT id, original_name, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
            (uid,)
        ).fetchall()
        
        # Tag distribution
        all_tags_rows = conn.execute("SELECT tags FROM notes WHERE user_id = ? AND tags != '[]'", (uid,)).fetchall()
        
        # Weekly activity (last 8 weeks)
        weekly_notes = conn.execute("""
            SELECT 
                strftime('%Y-%W', created_at) as week,
                COUNT(*) as count
            FROM notes 
            WHERE user_id = ? AND created_at >= date('now', '-56 days')
            GROUP BY week ORDER BY week
        """, (uid,)).fetchall()
        
        weekly_docs = conn.execute("""
            SELECT 
                strftime('%Y-%W', created_at) as week,
                COUNT(*) as count
            FROM documents 
            WHERE user_id = ? AND created_at >= date('now', '-56 days')
            GROUP BY week ORDER BY week
        """, (uid,)).fetchall()
    
    import json
    from collections import Counter
    from datetime import datetime, timedelta
    
    tag_counter = Counter()
    for row in all_tags_rows:
        try:
            tags = json.loads(row["tags"])
            tag_counter.update(tags)
        except Exception:
            pass
    top_tags = [{"tag": t, "count": c} for t, c in tag_counter.most_common(8)]
    
    storage_mb = round(storage_bytes / (1024 * 1024), 2)
    
    # Build 8-week activity chart data
    notes_by_week = {r["week"]: r["count"] for r in weekly_notes}
    docs_by_week = {r["week"]: r["count"] for r in weekly_docs}
    
    activity = []
    today = datetime.now()
    for i in range(7, -1, -1):
        d = today - timedelta(weeks=i)
        week_key = d.strftime("%Y-%W")
        # Short label like "Jan 6", "Jan 13"
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