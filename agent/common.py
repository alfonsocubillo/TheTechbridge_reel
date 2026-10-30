"""Utilidades compartidas: rutas, configuración, historial y logging."""
from __future__ import annotations

import json
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "brand.yaml"
HISTORY_PATH = ROOT / "data" / "history.json"
VIDEO_DIR = ROOT / "video"
PUBLIC_RUN = VIDEO_DIR / "public" / "run"
OUT_DIR = ROOT / "out"
FPS = 30

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("reels")


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def local_now(cfg: dict | None = None) -> datetime:
    """Hora de Madrid (o la de config). FAKE_NOW="2026-10-30T10:05" la simula en pruebas."""
    cfg = cfg or load_config()
    tz = ZoneInfo(cfg["review"]["timezone"])
    override = os.environ.get("FAKE_NOW")
    return datetime.fromisoformat(override).replace(tzinfo=tz) if override else datetime.now(tz)


def minutes(hhmm: str) -> int:
    h, m = map(int, str(hhmm).split(":"))
    return h * 60 + m


def claude_allowed(now: datetime | None = None, cfg: dict | None = None) -> bool:
    """El agente no usa Claude en la franja protegida (por defecto 04:00-14:00): así no toca la ventana
    de 5 horas de la suscripción mientras el usuario trabaja de 9 a 14."""
    if os.environ.get("CLAUDE_IGNORE_QUIET"):
        return True
    cfg = cfg or load_config()
    q = cfg.get("claude") or {}
    now = now or local_now(cfg)
    t = now.hour * 60 + now.minute
    return not (minutes(q.get("quiet_from", "04:00")) <= t < minutes(q.get("quiet_to", "14:00")))


def load_history() -> list[dict]:
    if HISTORY_PATH.exists():
        return json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    return []


def save_history(history: list[dict]) -> None:
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Nos quedamos con los últimos 200 para que el fichero no crezca sin fin
    HISTORY_PATH.write_text(json.dumps(history[-200:], ensure_ascii=False, indent=2), encoding="utf-8")


def env(name: str, default: str | None = None, required: bool = False) -> str | None:
    value = os.environ.get(name, default)
    if required and not value:
        raise SystemExit(f"Falta la variable de entorno {name}")
    return value


def _fernet():
    """Clave para cifrar en el repo (público) lo que escribe la directora."""
    secret = os.environ.get("STATE_KEY") or os.environ.get("MAIL_APP_PASSWORD")
    if not secret:
        return None
    import base64
    import hashlib
    from cryptography.fernet import Fernet
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))


def seal(obj) -> str:
    data = json.dumps(obj, ensure_ascii=False)
    f = _fernet()
    if f is None:
        log.warning("Sin clave de cifrado: el estado privado se guarda en claro (solo pruebas)")
        return "plain:" + data
    return f.encrypt(data.encode()).decode()


def unseal(blob: str | None):
    if not blob:
        return None
    if blob.startswith("plain:"):
        return json.loads(blob[6:])
    return json.loads(_fernet().decrypt(blob.encode()))


def media_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())
