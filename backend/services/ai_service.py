import os
import json
import re
from groq import Groq


def get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


# ── Text Cleanup ─────────────────────────────────────────────────────────────

def clean_extracted_text(text: str) -> str:
    """Clean up raw extracted text from PDFs."""
    if not text:
        return ""
    
    lines = text.split("\n")
    cleaned = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines (but keep one)
        if not stripped:
            if cleaned and cleaned[-1] != "":
                cleaned.append("")
            continue
        
        # Skip lines that are just page numbers
        if re.match(r"^\d{1,4}$", stripped):
            continue
        
        # Skip common PDF artifacts
        if stripped.lower() in ("page", "chapter", "table of contents"):
            continue
        
        # Skip very short lines that look like headers/footers (repeated across pages)
        if len(stripped) < 4 and not stripped[0].isalpha():
            continue
        
        cleaned.append(stripped)
    
    result = "\n".join(cleaned)
    
    # Collapse multiple blank lines
    result = re.sub(r"\n{3,}", "\n\n", result)
    
    return result.strip()


# ── Text Extraction ──────────────────────────────────────────────────────────

def extract_text_from_file(file_path: str, mimetype: str = "") -> str:
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()

        elif ext == ".pdf":
            import pdfplumber
            pages_text = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        pages_text.append(page_text)
            
            raw_text = "\n\n".join(pages_text)
            return clean_extracted_text(raw_text) or "No text found in PDF."

        elif ext == ".docx":
            from docx import Document
            doc = Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs]).strip()

        else:
            return "Unsupported file type."

    except Exception as e:
        return f"Unable to extract text: {str(e)}"


# ── Summarization ────────────────────────────────────────────────────────────

def summarize_text(text: str) -> str:
    """Generate a comprehensive summary using Groq LLM.
    
    Strategy:
    - Groq free tier limit is 6000 TPM, so we cap input to ~12000 chars (~3500 tokens)
    - Short docs: send the whole thing
    - Long docs: send beginning + middle + end chunks
    """
    if not text or len(text.strip()) < 50:
        return text[:200] if text else "No content available."

    clean = text.strip()
    char_count = len(clean)
    
    # Cap total text at ~12000 chars to stay under Groq's 6000 TPM limit
    # (~3.5 chars per token, plus system prompt + output tokens)
    MAX_CHARS = 12000
    
    if char_count <= MAX_CHARS:
        doc_text = clean
    else:
        # Long document: sample beginning, middle, and end
        chunk_size = 3500
        beginning = clean[:chunk_size]
        
        mid_start = (char_count // 2) - (chunk_size // 2)
        middle = clean[mid_start:mid_start + chunk_size]
        
        ending = clean[-chunk_size:]
        
        doc_text = (
            f"[BEGINNING OF DOCUMENT]\n{beginning}\n\n"
            f"[MIDDLE OF DOCUMENT]\n{middle}\n\n"
            f"[END OF DOCUMENT]\n{ending}"
        )
    
    client = get_client()
    
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a document summarizer. Write a clear, comprehensive summary "
                    "of the provided document. Your summary should:\n"
                    "- Be 5-8 sentences long\n"
                    "- Cover the main themes, key points, and conclusions\n"
                    "- For fiction: include genre, setting, main characters, and central conflict (no spoilers)\n"
                    "- For non-fiction: include the main argument, key evidence, and conclusions\n"
                    "- Start directly with the summary content — do NOT begin with phrases like "
                    "'Here is a summary' or 'This document is about' or 'The provided passage'\n"
                    "- Write in a natural, informative tone"
                )
            },
            {
                "role": "user",
                "content": f"Summarize this document:\n\n{doc_text}"
            }
        ],
        max_tokens=500,
        temperature=0.3
    )
    
    summary = response.choices[0].message.content.strip()
    
    # Clean up any preamble the LLM might still add
    preamble_patterns = [
        r"^Here(?:'s| is) (?:a |the )?(?:\d+-?\d*\s+)?(?:sentence )?summary[:\s]*",
        r"^(?:The |This )(?:provided |given )?(?:document|text|passage|book|article)[:\s]+(?:is about|discusses|covers|describes)\s*",
        r"^Summary[:\s]*",
    ]
    for pattern in preamble_patterns:
        summary = re.sub(pattern, "", summary, count=1, flags=re.IGNORECASE)
    
    return summary.strip()


# ── Search Query Expansion ───────────────────────────────────────────────────

def expand_search_query(query: str) -> list[str]:
    """
    Use Groq LLM to expand a search query into related keywords/synonyms.
    Returns a list of search terms including the original query.
    """
    try:
        client = get_client()
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a search query expander. Given a search query, "
                        "return 3-5 related keywords or short phrases that someone "
                        "might use as titles or tags for notes about this topic. "
                        "Return ONLY a JSON array of strings, nothing else. "
                        'Example: ["machine learning", "ML", "neural networks", "deep learning", "AI"]'
                    )
                },
                {"role": "user", "content": query}
            ],
            max_tokens=100,
            temperature=0.3
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        expanded = json.loads(raw)
        if isinstance(expanded, list):
            return list(set([query] + [str(k) for k in expanded]))
    except Exception:
        pass
    return [query]