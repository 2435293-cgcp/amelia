import base64
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ELEVENLABS_KEY   = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = "21m00Tcm4TlvDq8ikWAM"  # Rachel — natural female voice


async def text_to_speech(text: str):
    """ElevenLabs only. Returns (base64_audio, word_timings)."""
    if not ELEVENLABS_KEY:
        return "", []
    try:
        return await _elevenlabs_tts(text)
    except Exception:
        return "", []


async def _elevenlabs_tts(text: str):
    import httpx

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
            headers={
                "xi-api-key": ELEVENLABS_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            },
        )
        if resp.status_code != 200:
            raise ValueError(f"ElevenLabs {resp.status_code}: {resp.text[:120]}")

        return base64.b64encode(resp.content).decode(), _estimate_word_timings(text)


def _estimate_word_timings(text: str, rate: int = 165) -> list:
    words = text.split()
    if not words:
        return []
    base_duration = 60.0 / rate
    timings = []
    current_time = 0.08
    for word in words:
        clean    = word.strip(".,!?;:\"'")
        duration = max(0.08, len(clean) * base_duration * 0.55)
        timings.append({"w": word, "t": round(current_time, 3), "d": round(duration, 3)})
        current_time += duration + 0.025
    return timings
