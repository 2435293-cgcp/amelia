import os
import asyncio
import threading
from pathlib import Path
from dotenv import load_dotenv
from memory import save_memory, get_all_memories, save_message, get_recent_history
from tools import web_search, get_current_time

load_dotenv(Path(__file__).parent / ".env")

OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_KEY    = os.getenv("GEMINI_API_KEY", "")
CLAUDE_MODEL  = "claude-haiku-4-5-20251001"
GEMINI_MODEL  = "gemini-2.0-flash"

SYSTEM_PROMPT = """You are Kagzso, a warm friendly AI assistant. Reply in 1-2 short sentences only — your response will be spoken aloud. Be natural, never robotic. Plain text only, no bullet points or markdown.

Kagzso is an AI automation company. Its solutions include: KOT & POS systems for restaurants, hospital management automation, AI-based attendance systems, school timetable automation, and other custom AI automation projects. If the user asks about any of these topics or wants more detail, mention that they can check www.kagzso.com for full details.
{memories_block}
{rag_block}"""

# ── context builder (RAG + memory always injected) ────────────────────────────

def _build_context_sync(user_message: str, user_id: str):
    memories = get_all_memories(user_id)
    memories_text = (
        "What you know about this user:\n" + "\n".join(f"- {m}" for m in memories)
        if memories else ""
    )
    rag_text = ""
    try:
        from rag import query_knowledge
        hits = query_knowledge(user_message, n_results=3)
        if hits:
            rag_text = "Relevant knowledge base information:\n" + "\n\n".join(hits)
    except Exception:
        pass
    system  = SYSTEM_PROMPT.format(memories_block=memories_text, rag_block=rag_text)
    history = get_recent_history(user_id, limit=4)
    return system, history


async def _build_context(user_message: str, user_id: str):
    memories = get_all_memories(user_id)
    memories_text = (
        "What you know about this user:\n" + "\n".join(f"- {m}" for m in memories)
        if memories else ""
    )
    rag_text = ""
    try:
        from rag import query_knowledge
        hits = await asyncio.to_thread(query_knowledge, user_message, n_results=3)
        if hits:
            rag_text = "Relevant knowledge base information:\n" + "\n\n".join(hits)
    except Exception:
        pass
    system  = SYSTEM_PROMPT.format(memories_block=memories_text, rag_block=rag_text)
    history = get_recent_history(user_id, limit=4)
    return system, history


def _is_connection_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ("connect", "refused", "timeout", "socket", "unreachable", "network", "ollama"))


# ── Ollama tools ──────────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information, news, facts, prices, or anything that might have changed recently.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "The search query"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remember_fact",
            "description": "Remember an important fact about the user for future conversations.",
            "parameters": {
                "type": "object",
                "properties": {"fact": {"type": "string", "description": "The fact to remember"}},
                "required": ["fact"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Get the current date and time.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _run_tool(tool_name: str, tool_input: dict, user_id: str) -> str:
    if tool_name == "web_search":
        return web_search(tool_input.get("query", ""))
    elif tool_name == "remember_fact":
        save_memory(user_id, tool_input.get("fact", ""))
        return "Got it, I'll remember that."
    elif tool_name == "get_current_time":
        return get_current_time()
    return "Unknown tool."


# ── Non-streaming backends ────────────────────────────────────────────────────

def _chat_ollama_sync(user_message: str, user_id: str, system: str, history: list) -> str:
    import ollama
    trimmed = list(history)
    while trimmed and trimmed[-1]["role"] == "user":
        trimmed.pop()
    messages = [{"role": "system", "content": system}] + trimmed + [{"role": "user", "content": user_message}]

    for _ in range(5):
        try:
            response = ollama.chat(model=OLLAMA_MODEL, messages=messages, tools=TOOLS)
        except Exception:
            response = ollama.chat(model=OLLAMA_MODEL, messages=messages)
        tool_calls = response.message.tool_calls or []
        if not tool_calls:
            text = response.message.content or ""
            save_message(user_id, "assistant", text)
            return text
        messages.append(response.message)
        for tc in tool_calls:
            result = _run_tool(tc.function.name, tc.function.arguments or {}, user_id)
            messages.append({"role": "tool", "content": result})
    return "Sorry, something went wrong. Please try again."


def _chat_gemini_sync(user_message: str, user_id: str, system: str, history: list) -> str:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=system)

    gemini_history = []
    for m in history:
        role = "model" if m["role"] == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [m["content"]]})

    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(user_message)
    text = response.text or ""
    save_message(user_id, "assistant", text)
    return text


def _chat_claude_sync(user_message: str, user_id: str, system: str, history: list) -> str:
    import anthropic
    trimmed = [{"role": m["role"], "content": m["content"]} for m in history]
    while trimmed and trimmed[-1]["role"] == "user":
        trimmed.pop()
    trimmed.append({"role": "user", "content": user_message})

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    response = client.messages.create(
        model=CLAUDE_MODEL, max_tokens=150, system=system, messages=trimmed
    )
    text = response.content[0].text if response.content else ""
    save_message(user_id, "assistant", text)
    return text


# ── Non-streaming entry point: Ollama → Gemini → Anthropic ───────────────────

def chat(user_message: str, user_id: str) -> str:
    system, history = _build_context_sync(user_message, user_id)
    save_message(user_id, "user", user_message)

    # 1. Offline-first: Ollama
    try:
        return _chat_ollama_sync(user_message, user_id, system, history)
    except Exception as e:
        if not _is_connection_error(e):
            raise

    # 2. Gemini
    if GEMINI_KEY:
        try:
            return _chat_gemini_sync(user_message, user_id, system, history)
        except Exception:
            pass

    # 3. Anthropic
    if ANTHROPIC_KEY:
        try:
            return _chat_claude_sync(user_message, user_id, system, history)
        except Exception as e:
            return f"Sorry, I had a problem: {e}"

    return "No AI backend is reachable. Start Ollama or add a GEMINI_API_KEY / ANTHROPIC_API_KEY."


# ── Streaming backends ────────────────────────────────────────────────────────

async def _stream_ollama(user_message: str, user_id: str, system: str, history: list):
    import ollama
    trimmed = list(history)
    while trimmed and trimmed[-1]["role"] == "user":
        trimmed.pop()
    messages = [{"role": "system", "content": system}] + trimmed + [{"role": "user", "content": user_message}]
    loop:  asyncio.AbstractEventLoop = asyncio.get_event_loop()
    queue: asyncio.Queue             = asyncio.Queue()

    def _run():
        try:
            full_text = ""
            stream = ollama.chat(
                model=OLLAMA_MODEL, messages=messages, stream=True,
                options={"num_predict": 80, "temperature": 0.7, "num_ctx": 2048},
            )
            for chunk in stream:
                token = chunk["message"]["content"]
                if token:
                    full_text += token
                    asyncio.run_coroutine_threadsafe(queue.put({"token": token}), loop)
            save_message(user_id, "assistant", full_text)
            asyncio.run_coroutine_threadsafe(queue.put({"done": True, "text": full_text}), loop)
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(queue.put({"error": str(exc), "offline": _is_connection_error(exc)}), loop)

    threading.Thread(target=_run, daemon=True).start()
    while True:
        event = await queue.get()
        yield event
        if "done" in event or "error" in event:
            break


async def _stream_gemini(user_message: str, user_id: str, system: str, history: list):
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=system)

    gemini_history = []
    for m in history:
        role = "model" if m["role"] == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [m["content"]]})

    full_text = ""
    try:
        chat_session = model.start_chat(history=gemini_history)
        response = await asyncio.to_thread(
            lambda: chat_session.send_message(user_message, stream=True)
        )
        for chunk in response:
            token = chunk.text or ""
            if token:
                full_text += token
                yield {"token": token}
        save_message(user_id, "assistant", full_text)
        yield {"done": True, "text": full_text}
    except Exception as exc:
        yield {"error": str(exc)}


async def _stream_claude(user_message: str, user_id: str, system: str, history: list):
    import anthropic
    trimmed = [{"role": m["role"], "content": m["content"]} for m in history]
    while trimmed and trimmed[-1]["role"] == "user":
        trimmed.pop()
    trimmed.append({"role": "user", "content": user_message})

    client    = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    full_text = ""
    try:
        with client.messages.stream(
            model=CLAUDE_MODEL, max_tokens=150, system=system, messages=trimmed,
        ) as stream:
            for text in stream.text_stream:
                if text:
                    full_text += text
                    yield {"token": text}
        save_message(user_id, "assistant", full_text)
        yield {"done": True, "text": full_text}
    except Exception as exc:
        yield {"error": str(exc)}


# ── Streaming entry point: Ollama → Gemini → Anthropic ───────────────────────

async def chat_stream(user_message: str, user_id: str):
    """
    Priority: Ollama (offline) → Gemini → Anthropic.
    RAG + memory context is always injected regardless of backend.
    Yields {"token": str}, then {"done": True} or {"error": str}.
    """
    system, history = await _build_context(user_message, user_id)
    save_message(user_id, "user", user_message)

    # ── 1. Ollama (fully offline) ─────────────────────────────────────────────
    ollama_failed_offline = False
    try:
        async for event in _stream_ollama(user_message, user_id, system, history):
            if "error" in event and event.get("offline"):
                # Connection refused → silently fall through to cloud
                ollama_failed_offline = True
                break
            yield event
            if "done" in event or ("error" in event and not event.get("offline")):
                return  # Ollama responded (even with an error) — we're done
    except Exception:
        ollama_failed_offline = True

    if not ollama_failed_offline:
        return

    # ── 2. Gemini ─────────────────────────────────────────────────────────────
    if GEMINI_KEY:
        gemini_ok = False
        try:
            async for event in _stream_gemini(user_message, user_id, system, history):
                gemini_ok = True
                yield event
                if "done" in event or "error" in event:
                    return
        except Exception:
            pass
        if gemini_ok:
            return

    # ── 3. Anthropic ──────────────────────────────────────────────────────────
    if ANTHROPIC_KEY:
        async for event in _stream_claude(user_message, user_id, system, history):
            yield event
            if "done" in event or "error" in event:
                return

    # Nothing worked
    yield {"error": "No AI backend is reachable. Start Ollama or add a GEMINI_API_KEY / ANTHROPIC_API_KEY."}
    yield {"done": True}
