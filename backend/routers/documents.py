from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from database import get_db
from utils.auth_deps import get_current_user
from services.ai_service import extract_text_from_file, summarize_text
import os
import json
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"

def process_document_bg(doc_id: int, filepath: str, mimetype: str):
    """Background: extract text and summarize. No embeddings needed."""
    text = extract_text_from_file(filepath, mimetype)
    summary = summarize_text(text) if text else ""
    
    with get_db() as conn:
        conn.execute(
            "UPDATE documents SET extracted_text = ?, summary = ? WHERE id = ?",
            (text, summary, doc_id)
        )

def doc_to_dict(doc):
    d = dict(doc)
    d.pop("embedding", None)
    d.pop("extracted_text", None)
    return d

@router.get("/")
def list_documents(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        docs = conn.execute(
            "SELECT id, user_id, filename, original_name, file_url, summary, file_size, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],)
        ).fetchall()
    return [doc_to_dict(d) for d in docs]

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    allowed_ext = {".pdf", ".docx", ".txt"}
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {', '.join(allowed_ext)}")
    
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, unique_name)
    
    content = await file.read()
    file_size = len(content)
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_url = f"/uploads/{unique_name}"
    
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO documents (user_id, filename, original_name, file_url, file_size) VALUES (?, ?, ?, ?, ?)",
            (current_user["id"], unique_name, file.filename, file_url, file_size)
        )
        doc_id = cursor.lastrowid
        doc = conn.execute(
            "SELECT id, user_id, filename, original_name, file_url, summary, file_size, created_at FROM documents WHERE id = ?",
            (doc_id,)
        ).fetchone()
    
    background_tasks.add_task(process_document_bg, doc_id, filepath, file.content_type or "")
    return doc_to_dict(doc)

@router.get("/{doc_id}")
def get_document(doc_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"])).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    d = dict(doc)
    d.pop("embedding", None)
    return d

@router.get("/{doc_id}/download")
def download_document(doc_id: int, current_user: dict = Depends(get_current_user)):
    """Download original document file."""
    with get_db() as conn:
        doc = conn.execute(
            "SELECT filename, original_name FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, current_user["id"])
        ).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    filepath = os.path.join(UPLOAD_DIR, doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=filepath,
        filename=doc["original_name"],
        media_type="application/octet-stream",
    )

@router.delete("/{doc_id}")
def delete_document(doc_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"])).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        filepath = os.path.join(UPLOAD_DIR, doc["filename"])
        if os.path.exists(filepath):
            os.remove(filepath)
        
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    return {"message": "Document deleted"}

@router.post("/{doc_id}/rescan")
def rescan_document(doc_id: int, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user["id"])).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    filepath = os.path.join(UPLOAD_DIR, doc["filename"])
    background_tasks.add_task(process_document_bg, doc_id, filepath, "")
    return {"message": "Processing started"}