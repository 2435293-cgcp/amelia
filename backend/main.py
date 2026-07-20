import asyncio
import os
import tempfile
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager
from PIL import Image
import io
from memory import init_db
from amelia import chat, chat_stream
from tts import text_to_speech
from avatar import (
    create_talk, get_talk,
    upload_image_to_did, set_presenter_url, get_presenter_url,
    get_presenter_preview, get_presenter_idle_video,
    D_ID_KEY,
)

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_DOC_EXTENSIONS = {".pdf", ".txt", ".docx", ".doc", ".csv", ".md"}


async def _warm_ollama():
    """Pre-load Ollama model so first message isn't slow."""
    try:
        import ollama
        model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
        await asyncio.to_thread(
            ollama.chat,
            model=model,
            messages=[{"role": "user", "content": "hi"}],
            options={"num_predict": 1},
        )
    except Exception:
        pass


async def _warm_rag():
    """Pre-load embedding model into RAM so first message isn't slow."""
    try:
        from rag import _get_embedder, _get_collection
        await asyncio.to_thread(_get_embedder)
        await asyncio.to_thread(_get_collection)
    except Exception:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    asyncio.create_task(_warm_ollama())
    asyncio.create_task(_warm_rag())
    yield


app = FastAPI(title="Amelia API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


class ChatRequest(BaseModel):
    message: str
    user_id: str = "default"


class ChatResponse(BaseModel):
    response: str
    audio: str
    talk_id: str = ""
    timings: list = []


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        response_text = await asyncio.to_thread(chat, req.message, req.user_id)
        audio_b64, word_timings = await text_to_speech(response_text)

        talk_id = ""
        try:
            talk_id = await create_talk(response_text)
        except Exception:
            talk_id = ""

        return ChatResponse(
            response=response_text, audio=audio_b64,
            talk_id=talk_id, timings=word_timings,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── D-ID avatar ───────────────────────────────────────────────────────────────

@app.get("/api/talk/{talk_id}")
async def talk_status(talk_id: str):
    try:
        return await get_talk(talk_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/upload-avatar")
async def upload_avatar(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    jpeg_bytes = buf.getvalue()
    local_path = UPLOADS_DIR / "avatar.jpg"
    local_path.write_bytes(jpeg_bytes)

    did_url = None
    try:
        did_url = await upload_image_to_did(jpeg_bytes)
        set_presenter_url(did_url)
    except Exception:
        pass

    return {
        "url": did_url or "/uploads/avatar.jpg",
        "local": True,
        "message": "Avatar saved!" + (" D-ID video enabled." if did_url else " (D-ID video needs credits)"),
    }


@app.get("/api/avatar")
async def get_avatar():
    local = (UPLOADS_DIR / "avatar.jpg").exists()
    return {
        "presenter_url": get_presenter_url(),
        "presenter_preview": get_presenter_preview(),
        "presenter_idle_video": get_presenter_idle_video(),
        "local_url": "/uploads/avatar.jpg" if local else None,
        "did_enabled": bool(D_ID_KEY),
    }


# ── Streaming chat ────────────────────────────────────────────────────────────

@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """SSE endpoint — streams tokens as Ollama generates them, then sends audio."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    async def event_stream():
        full_text = ""
        try:
            async for event in chat_stream(req.message, req.user_id):
                if "token" in event:
                    full_text += event["token"]
                    yield f"data: {json.dumps({'token': event['token']})}\n\n"

                elif "done" in event:
                    # ElevenLabs TTS — send audio before end so frontend plays girl's voice
                    audio_b64 = ""
                    if full_text.strip():
                        try:
                            audio_b64, _ = await text_to_speech(full_text)
                        except Exception:
                            pass
                    if audio_b64:
                        yield f"data: {json.dumps({'audio': audio_b64})}\n\n"

                    # D-ID talking video
                    talk_id = ""
                    if D_ID_KEY and full_text.strip():
                        try:
                            talk_id = await create_talk(full_text)
                        except Exception:
                            talk_id = ""
                    yield f"data: {json.dumps({'end': True, 'talk_id': talk_id})}\n\n"

                elif "error" in event:
                    yield f"data: {json.dumps({'error': event['error']})}\n\n"
                    yield f"data: {json.dumps({'end': True})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield f"data: {json.dumps({'end': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── RAG knowledge base ────────────────────────────────────────────────────────

@app.post("/api/docs/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document (PDF, DOCX, TXT, CSV, MD) into Amelia's knowledge base."""
    ext = Path(file.filename or "file.txt").suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_DOC_EXTENSIONS)}"
        )

    content = await file.read()
    tmp_path = Path(tempfile.mktemp(suffix=ext))
    try:
        tmp_path.write_bytes(content)
        from rag import add_document
        chunks = await asyncio.to_thread(add_document, str(tmp_path), file.filename)
        return {"ok": True, "doc": file.filename, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)


@app.get("/api/docs")
async def list_docs():
    """List all documents stored in the knowledge base."""
    from rag import list_documents
    docs = await asyncio.to_thread(list_documents)
    return {"documents": docs}


@app.delete("/api/docs/{doc_name:path}")
async def delete_doc(doc_name: str):
    """Remove a document from the knowledge base by name."""
    from rag import delete_document
    ok = await asyncio.to_thread(delete_document, doc_name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Document '{doc_name}' not found")
    return {"ok": True, "deleted": doc_name}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "name": "Amelia", "mode": "local"}
