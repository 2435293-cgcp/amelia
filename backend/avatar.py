import httpx
import os
import json
import io
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image

load_dotenv(Path(__file__).parent / ".env")

D_ID_KEY = os.getenv("D_ID_API_KEY")

DEFAULT_PRESENTER_URL = "https://d-id-public-bucket.s3.amazonaws.com/alice.jpg"
CONFIG_FILE = Path(__file__).parent / "config.json"


def _load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {}


def _save_config(data: dict):
    CONFIG_FILE.write_text(json.dumps(data, indent=2))


def get_presenter_url() -> str:
    return _load_config().get("presenter_url", DEFAULT_PRESENTER_URL)


def set_presenter_url(url: str):
    cfg = _load_config()
    cfg["presenter_url"] = url
    _save_config(cfg)


def get_presenter_preview() -> str:
    return _load_config().get("presenter_preview", "")


def get_presenter_idle_video() -> str:
    return _load_config().get("presenter_idle_video", "")


# ── D-ID Talks API (photo talking-head video) ─────────────────────────────

async def upload_image_to_did(image_bytes: bytes) -> str:
    """Convert image to JPEG if needed, upload to D-ID, return hosted URL."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    jpeg_bytes = buf.getvalue()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.d-id.com/images",
            headers={"Authorization": f"Basic {D_ID_KEY}"},
            files={"image": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
            timeout=30.0,
        )
        data = resp.json()
        if "url" not in data:
            raise ValueError(f"D-ID image upload error: {data}")
        return data["url"]


async def create_talk(text: str) -> str:
    """Submit text to D-ID Talks API with photo presenter. Returns talk_id."""
    presenter_url = get_presenter_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.d-id.com/talks",
            headers={
                "Authorization": f"Basic {D_ID_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "source_url": presenter_url,
                "script": {
                    "type": "text",
                    "input": text,
                    "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"},
                },
                "config": {"fluent": True, "pad_audio": 0.0, "stitch": True},
            },
            timeout=30.0,
        )
        data = resp.json()
        if "id" not in data:
            raise ValueError(f"D-ID error: {data}")
        return data["id"]


async def get_talk(talk_id: str) -> dict:
    """Poll D-ID for talk status. Returns status + video_url when done."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.d-id.com/talks/{talk_id}",
            headers={"Authorization": f"Basic {D_ID_KEY}", "Accept": "application/json"},
            timeout=15.0,
        )
        data = resp.json()
        return {
            "status": data.get("status", "pending"),
            "video_url": data.get("result_url"),
            "error": data.get("error"),
        }
