"""Consigue y prepara todo lo que el vídeo necesita: clips de stock, voz, música, efectos y logo."""
from __future__ import annotations

import base64
import random
import re
import shutil
import subprocess
from pathlib import Path

import requests

from .common import FPS, PUBLIC_RUN, ROOT, env, log, media_duration

PEXELS_URL = "https://api.pexels.com/videos/search"
PIXABAY_URL = "https://pixabay.com/api/videos/"
ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps"
MUSIC_DIR = ROOT / "assets" / "music"
W, H = 1080, 1920


def ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


# ───────────────────────── Stock video ─────────────────────────

def _pexels(query: str) -> list[dict]:
    key = env("PEXELS_API_KEY")
    if not key:
        return []
    r = requests.get(PEXELS_URL, headers={"Authorization": key},
                     params={"query": query, "orientation": "portrait", "per_page": 20}, timeout=30)
    r.raise_for_status()
    found = []
    for v in r.json().get("videos", []):
        files = [f for f in v["video_files"]
                 if f.get("file_type") == "video/mp4" and f.get("height") and f["height"] >= 1280
                 and f["width"] < f["height"]]
        if files:
            best = min(files, key=lambda f: abs(f["height"] - 1920))
            found.append({"id": f"pexels:{v['id']}", "url": best["link"], "duration": v["duration"], "vertical": True})
    return found


def _pixabay(query: str) -> list[dict]:
    key = env("PIXABAY_API_KEY")
    if not key:
        return []
    r = requests.get(PIXABAY_URL, params={"key": key, "q": query[:100], "per_page": 20, "safesearch": "true"},
                     timeout=30)
    r.raise_for_status()
    found = []
    for v in r.json().get("hits", []):
        # Casi todos son horizontales y se recortan al centro, así que lo que importa es la altura.
        files = [f for f in (v.get("videos") or {}).values()
                 if f.get("url") and (f.get("height") or 0) >= 1080 and (f.get("size") or 0) < 150_000_000]
        if files:
            best = min(files, key=lambda f: abs(f["height"] - 1920))
            found.append({"id": f"pixabay:{v['id']}", "url": best["url"], "duration": v.get("duration") or 0,
                          "vertical": best["width"] < best["height"]})
    return found


def stock_clip(query: str, seconds: float, out: Path, avoid_ids: set[str]) -> str | None:
    """Busca un clip de stock en Pexels o Pixabay (según qué clave haya) y lo deja listo en `out`.
    Sin ninguna clave devuelve None y la escena usa el fondo animado de la marca."""
    for source in (_pexels, _pixabay):
        for q in (query, " ".join(query.split()[:2]), "abstract technology dark"):
            try:
                clips = [c for c in source(q) if c["id"] not in avoid_ids]
            except requests.RequestException as e:
                log.warning("%s falló para '%s': %s", source.__name__.strip("_"), q, e)
                continue
            random.shuffle(clips)
            clips.sort(key=lambda c: (c["duration"] >= seconds, c["vertical"]), reverse=True)  # largos y verticales
            for c in clips[:3]:
                raw = out.with_suffix(".raw.mp4")
                try:
                    with requests.get(c["url"], stream=True, timeout=120) as dl:
                        dl.raise_for_status()
                        with open(raw, "wb") as fh:
                            shutil.copyfileobj(dl.raw, fh)
                    # Normalizamos: 1080x1920, 30 fps, duración exacta (en bucle si hace falta), sin audio
                    ff("-stream_loop", "-1", "-i", str(raw), "-t", f"{seconds + 0.5:.2f}",
                       "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1",
                       "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out))
                except (requests.RequestException, subprocess.CalledProcessError) as e:
                    log.warning("No se pudo preparar el clip %s: %s", c["id"], e)
                    continue
                finally:
                    raw.unlink(missing_ok=True)
                log.info("Clip '%s' → %s", q, c["id"])
                return c["id"]
    return None


# ───────────────────────── Voz ─────────────────────────

def tts(text: str, out: Path, prev_text: str = "", next_text: str = "") -> list[dict]:
    """Genera la locución y devuelve los tiempos de cada palabra (para subtítulos sincronizados)."""
    r = requests.post(
        ELEVEN_URL.format(voice=env("ELEVENLABS_VOICE_ID", required=True)),
        headers={"xi-api-key": env("ELEVENLABS_API_KEY", required=True), "content-type": "application/json"},
        params={"output_format": "mp3_44100_128"},
        json={
            "text": text,
            "model_id": env("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "previous_text": prev_text or None,
            "next_text": next_text or None,
            "voice_settings": {"stability": 0.42, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True},
        },
        timeout=120,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:300]}")
    data = r.json()
    out.write_bytes(base64.b64decode(data["audio_base64"]))
    al = data.get("alignment") or {}
    chars, starts, ends = al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", [])
    words, cur, t0, prev_end = [], "", None, 0.0
    for c, s, e in zip(chars, starts, ends):
        if c.isspace():
            if cur:
                words.append({"word": cur, "start": t0, "end": prev_end})
            cur, t0 = "", None
            continue
        if not cur:
            t0 = s
        cur += c
        prev_end = e
    if cur:
        words.append({"word": cur, "start": t0, "end": prev_end})
    return words


# ───────────────────────── Música y efectos ─────────────────────────

def pick_music(dest: Path, seconds: float) -> Path:
    tracks = [p for p in MUSIC_DIR.glob("*") if p.suffix.lower() in {".mp3", ".m4a", ".wav", ".aac"}]
    if tracks:
        src = random.choice(tracks)
        log.info("Música: %s", src.name)
        # Arrancamos en un punto aleatorio de la primera mitad para que no suene siempre igual
        total = media_duration(src)
        start = random.uniform(0, max(0.0, min(total - seconds - 1, total * 0.4)))
        ff("-ss", f"{start:.2f}", "-i", str(src), "-t", f"{seconds + 1:.2f}",
           "-af", f"afade=t=in:d=0.8,afade=t=out:st={max(0.0, seconds - 1.5):.2f}:d=1.5", "-ar", "44100", str(dest))
        return dest
    log.warning("No hay música en assets/music → uso una base sintética de respaldo (añade pistas propias)")
    pad = ("0.12*(sin(2*PI*if(lt(mod(t,8),4),110,87.31)*t)+sin(2*PI*if(lt(mod(t,8),4),164.81,130.81)*t)"
           "+sin(2*PI*if(lt(mod(t,8),4),220,174.61)*t)+0.6*sin(2*PI*if(lt(mod(t,8),4),329.63,261.63)*t))"
           "*(0.65+0.35*sin(2*PI*0.25*t))")
    kick = "0.55*sin(2*PI*(45+90*exp(-mod(t,0.5)*28))*mod(t,0.5))*exp(-mod(t,0.5)*9)"
    hat = "0.04*(random(0)*2-1)*exp(-mod(t+0.25,0.5)*60)"
    ff("-f", "lavfi", "-i", f"aevalsrc='{pad}+{kick}+{hat}':s=44100:d={seconds + 1:.2f}",
       "-af", f"lowpass=f=5000,aecho=0.8:0.6:120:0.25,afade=t=in:d=1.2,afade=t=out:st={max(0.0, seconds - 1.5):.2f}:d=1.5",
       str(dest))
    return dest


def make_sfx(run: Path) -> dict:
    whoosh, hit = run / "whoosh.wav", run / "hit.wav"
    ff("-f", "lavfi", "-i", "anoisesrc=d=0.7:c=pink:a=0.6",
       "-af", "highpass=f=500,lowpass=f=7000,afade=t=in:d=0.4:curve=exp,afade=t=out:st=0.4:d=0.3", str(whoosh))
    ff("-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*(38+90*exp(-t*18))*t)*exp(-t*5)':s=44100:d=1.4",
       "-af", "lowpass=f=900", str(hit))
    return {"whoosh": "run/whoosh.wav", "hit": "run/hit.wav"}


def fetch_logo(url: str, run: Path) -> str | None:
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        (run / "logo.png").write_bytes(r.content)
        return "run/logo.png"
    except requests.RequestException as e:
        log.warning("No se pudo descargar el logo: %s", e)
        return None


# ───────────────────────── Tiempos ─────────────────────────

def visible_words(s: dict) -> int:
    parts = [s.get(k, "") for k in ("text", "title", "subtitle", "label", "left", "right", "source", "prompt")]
    parts += s.get("items", []) + s.get("result", [])
    return len(re.findall(r"\w+", " ".join(str(p) for p in parts)))


def reading_seconds(s: dict) -> float:
    base = 1.4 + visible_words(s) * 0.30
    if s["type"] == "prompt":
        base += 1.5
    if s["type"] == "hook":
        base = max(base, 2.4)
    return min(max(base, 2.4), 7.0)


def prepare_run() -> Path:
    if PUBLIC_RUN.exists():
        shutil.rmtree(PUBLIC_RUN)
    PUBLIC_RUN.mkdir(parents=True)
    return PUBLIC_RUN
