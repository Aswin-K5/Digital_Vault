from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import json
from database import get_db
from utils.auth_deps import get_current_user
from utils.security import encrypt_content, decrypt_content
from services.ai_service import summarize_text

router = APIRouter()

class NoteCreate(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None

def note_to_dict(note, decrypt=False):
    d = dict(note)
    d["tags"] = json.loads(d.get("tags", "[]"))
    d["is_pinned"] = bool(d.get("is_pinned", 0))
    if decrypt and d.get("encrypted_content"):
        try:
            d["content"] = decrypt_content(d["encrypted_content"])
        except Exception:
            d["content"] = ""
    d.pop("encrypted_content", None)
    d.pop("embedding", None)
    return d

@router.get("/")
def list_notes(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        notes = conn.execute(
            "SELECT id, user_id, title, tags, is_pinned, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC",
            (current_user["id"],)
        ).fetchall()
    return [note_to_dict(n) for n in notes]

@router.post("/")
def create_note(data: NoteCreate, current_user: dict = Depends(get_current_user)):
    encrypted = encrypt_content(data.content)
    tags_json = json.dumps(data.tags)
    
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO notes (user_id, title, encrypted_content, tags) VALUES (?, ?, ?, ?)",
            (current_user["id"], data.title, encrypted, tags_json)
        )
        note_id = cursor.lastrowid
        note = conn.execute("SELECT id, user_id, title, tags, is_pinned, created_at, updated_at FROM notes WHERE id = ?", (note_id,)).fetchone()
    
    return note_to_dict(note)

@router.get("/{note_id}")
def get_note(note_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        note = conn.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user["id"])).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_to_dict(note, decrypt=True)

@router.put("/{note_id}")
def update_note(note_id: int, data: NoteUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        note = conn.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user["id"])).fetchone()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        updates = []
        params = []
        
        if data.title is not None:
            updates.append("title = ?")
            params.append(data.title)
        if data.content is not None:
            updates.append("encrypted_content = ?")
            params.append(encrypt_content(data.content))
        if data.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(data.tags))
        if data.is_pinned is not None:
            updates.append("is_pinned = ?")
            params.append(1 if data.is_pinned else 0)
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(note_id)
            conn.execute(f"UPDATE notes SET {', '.join(updates)} WHERE id = ?", params)
        
        updated = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    
    return note_to_dict(updated, decrypt=True)

@router.delete("/{note_id}")
def delete_note(note_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        note = conn.execute("SELECT id FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user["id"])).fetchone()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    return {"message": "Note deleted"}

@router.get("/{note_id}/related")
def get_related_notes(note_id: int, current_user: dict = Depends(get_current_user)):
    """Find related notes by matching tags."""
    with get_db() as conn:
        note = conn.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user["id"])).fetchone()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        note_tags = json.loads(note["tags"] or "[]")
        if not note_tags:
            return []
        
        other_notes = conn.execute(
            "SELECT id, title, tags, updated_at FROM notes WHERE user_id = ? AND id != ?",
            (current_user["id"], note_id)
        ).fetchall()
    
    # Score by tag overlap
    results = []
    for n in other_notes:
        other_tags = json.loads(n["tags"] or "[]")
        if not other_tags:
            continue
        overlap = len(set(t.lower() for t in note_tags) & set(t.lower() for t in other_tags))
        if overlap > 0:
            max_possible = max(len(note_tags), len(other_tags))
            results.append({
                "id": n["id"],
                "title": n["title"],
                "tags": other_tags,
                "updated_at": n["updated_at"],
                "similarity": round(overlap / max_possible, 2)
            })
    
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:5]

@router.post("/{note_id}/summarize")
def summarize_note(note_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        note = conn.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, current_user["id"])).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    content = decrypt_content(note["encrypted_content"])
    summary = summarize_text(content)
    return {"summary": summary}