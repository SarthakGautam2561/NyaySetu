"""Document text extraction for NyaySetu — supports PDF, DOCX, and plain text."""

import io
from pathlib import Path

from PyPDF2 import PdfReader
from docx import Document


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text.strip())
    return "\n\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content from a DOCX file."""
    doc = Document(io.BytesIO(file_bytes))
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text.strip())
    return "\n\n".join(text_parts)


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract text from a file based on its extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext == ".docx":
        text = extract_text_from_docx(file_bytes)
    elif ext in (".txt", ".md", ".text"):
        text = file_bytes.decode("utf-8", errors="replace")
    elif ext == ".doc":
        raise ValueError("Legacy .doc files are not supported. Please convert the file to PDF or DOCX first.")
    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported: PDF, DOCX, TXT")

    if not text.strip():
        raise ValueError("Could not extract any text from the document. The file may be scanned/image-based.")

    # Truncate very long documents to stay within context limits
    max_chars = 50000  # ~12k tokens — well within Gemma's 256k window
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[... Document truncated for analysis ...]"

    return text
