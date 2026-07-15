"""NyaySetu FastAPI Backend — Main application server."""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from models import ChatRequest, DraftRequest, PathwayRequest, RightsRequest, IntakeRequest, HealthResponse, SessionCreateRequest, SessionUpdateRequest
from database import (
    init_db,
    save_message,
    save_document_analysis,
    save_draft,
    save_intake,
    get_recent_messages,
    list_sessions,
    create_session,
    rename_session,
    set_session_pinned,
    archive_session,
)
import ai_engine
import document_processor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="NyaySetu API",
    description="Multilingual AI Legal Assistant powered by Google Gemma",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


# ── Health Check ───────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", model=ai_engine.MODEL)


# ── Chat (Streaming SSE) ──────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Stream chat response from Gemma via Server-Sent Events."""

    async def event_stream():
        try:
            history = [{"role": m.role, "content": m.content} for m in request.history]
            if request.session_id:
                await save_message(request.session_id, "user", request.message)
            assistant_text = []
            async for chunk in ai_engine.stream_chat(
                request.message, history, request.language
            ):
                assistant_text.append(chunk)
                data = json.dumps({"text": chunk})
                yield f"data: {data}\n\n"
            if request.session_id and assistant_text:
                await save_message(request.session_id, "assistant", "".join(assistant_text))
            yield "data: [DONE]\n\n"
        except Exception as e:
            error = json.dumps({"error": str(e)})
            yield f"data: {error}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Document Analysis ──────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    session_id: str = Form(default=""),
):
    """Upload and analyze a legal document."""

    # Validate file size (10 MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 10 MB.")

    # Validate file type
    allowed = {".pdf", ".docx", ".txt", ".md"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported format: {ext}. Supported: {', '.join(allowed)}")

    try:
        text = document_processor.extract_text(contents, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))

    analysis = await ai_engine.analyze_document(text, language)
    if session_id:
        await save_document_analysis(session_id, file.filename, analysis)
    return {
        "filename": file.filename,
        "text_length": len(text),
        "analysis": analysis,
    }


# ── Draft Generation (Streaming SSE) ──────────────────────────────────────

@app.post("/api/draft")
async def generate_draft(request: DraftRequest):
    """Stream a generated legal draft."""

    async def event_stream():
        try:
            full_text = []
            async for chunk in ai_engine.stream_draft(
                request.draft_type, request.details, request.language
            ):
                full_text.append(chunk)
                data = json.dumps({"text": chunk})
                yield f"data: {data}\n\n"
            if request.session_id and full_text:
                await save_draft(request.session_id, request.draft_type, "".join(full_text))
            yield "data: [DONE]\n\n"
        except Exception as e:
            error = json.dumps({"error": str(e)})
            yield f"data: {error}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Legal Pathway ─────────────────────────────────────────────────────────

@app.post("/api/pathway")
async def legal_pathway(request: PathwayRequest):
    """Generate a step-by-step legal action plan."""
    result = await ai_engine.generate_pathway(request.situation, request.language)
    return result


# ── Rights Explorer ────────────────────────────────────────────────────────

@app.post("/api/rights")
async def explore_rights(request: RightsRequest):
    """Explore legal rights for a given category."""
    result = await ai_engine.explore_rights(
        request.category, request.scenario, request.language
    )
    return result


# â”€â”€ Case Intake / Triage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/api/intake")
async def intake_case(request: IntakeRequest):
    """Turn a raw legal problem into a structured triage map."""
    result = await ai_engine.intake_case(request.text, request.language)
    if request.session_id:
        await save_intake(request.session_id, request.text, result)
    return result


# ── Supported Languages ───────────────────────────────────────────────────

@app.get("/api/languages")
async def get_languages():
    return {"languages": ai_engine.LANGUAGE_NAMES}


@app.get("/api/sessions")
async def sessions(limit: int = 25, include_archived: bool = False):
    return {"sessions": await list_sessions(limit=limit, include_archived=include_archived)}


@app.post("/api/sessions")
async def new_session(request: SessionCreateRequest):
    session_id = await create_session(request.language)
    return {"session_id": session_id}


@app.patch("/api/sessions/{session_id}")
async def update_session(session_id: str, request: SessionUpdateRequest):
    if request.title:
        await rename_session(session_id, request.title)
    if request.pinned is not None:
        await set_session_pinned(session_id, request.pinned)
    return {"session_id": session_id, "ok": True}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    await archive_session(session_id)
    return {"session_id": session_id, "archived": True}


@app.get("/api/sessions/{session_id}/messages")
async def session_messages(session_id: str):
    return {"session_id": session_id, "messages": await get_recent_messages(session_id, limit=50)}


# ── Serve the SPA ─────────────────────────────────────────────────────────

from fastapi.responses import FileResponse

@app.get("/")
async def serve_index():
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "NyaySetu API is running. Frontend not found."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
