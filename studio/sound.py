"""Biblioteca de música y efectos: catálogo con estados de ánimo, elección según el contenido y sin repetir.

Las pistas propias (tb-*) tienen su estilo fijado al componerlas. Las de HoliznaCC0 se clasifican solas por
energía y ritmo (se analiza el audio una vez y se guarda en assets/music/catalogo.json).
Todas son CC0 o propias: se pueden publicar en Instagram sin problemas de derechos.
"""
from __future__ import annotations

import json
import random
import shutil
import subprocess
from pathlib import Path

import numpy as np

from agent.common import ROOT, VIDEO_DIR

MUSIC_DIR = ROOT / "assets" / "music"
SFX_DIR = ROOT / "assets" / "sfx"
CATALOG = MUSIC_DIR / "catalogo.json"
PUBLIC_LIB = VIDEO_DIR / "public" / "lib"

# Estados de ánimo que entiende el sistema
MOODS = {
    "tech": "electrónica con pulso, para tecnología y novedades",
    "noticia": "tensión ligera y ritmo de reloj, para noticias",
    "cinematica": "épica o atmosférica, para análisis y Reels cinematográficos",
    "calma": "tranquila, para tutoriales y prompts",
    "alegre": "luminosa y con rebote, para curiosidades y trucos",
    "oscura": "grave y misteriosa, para ciberseguridad",
}

OWN = {
    "tb-tech-pulse": (["tech"], "Tecno minimal 122 BPM", 122),
    "tb-synthwave-drive": (["tech", "alegre"], "Synthwave 100 BPM", 100),
    "tb-cinematic-rise": (["cinematica"], "Cinematográfica, subida épica 80 BPM", 80),
    "tb-cyber-noir": (["oscura", "tech"], "Cyber noir medio tiempo 90 BPM", 90),
    "tb-uplift-corporate": (["alegre"], "Corporativa luminosa 116 BPM", 116),
    "tb-ambient-focus": (["calma", "cinematica"], "Ambiental de concentración 70 BPM", 70),
    "tb-news-ticker": (["noticia", "tech"], "Pulso informativo 120 BPM", 120),
    "tb-deep-house": (["tech", "calma"], "Deep house suave 118 BPM", 118),
}

# Para qué contenido va cada estado de ánimo (por orden de preferencia)
CONTENT_MOOD = {
    "noticia": ["noticia", "tech"], "noticia_rapida": ["noticia", "tech"], "noticia_importante": ["noticia", "cinematica"],
    "lanzamiento": ["tech", "noticia"], "analisis": ["cinematica", "noticia"], "tendencia": ["cinematica", "tech"],
    "tutorial": ["calma", "alegre"], "prompt_corto": ["calma", "alegre"], "prompting_avanzado": ["calma", "cinematica"],
    "truco": ["alegre", "tech"], "atajo": ["alegre", "tech"], "curiosidad": ["alegre", "calma"], "dato": ["tech", "alegre"],
    "historia_tech": ["cinematica", "alegre"], "ciberseguridad": ["oscura", "tech"], "programacion": ["tech", "oscura"],
    "comando": ["tech", "oscura"], "automatizacion": ["tech", "calma"], "comparativa": ["tech", "alegre"],
    "herramienta": ["alegre", "tech"], "concepto": ["calma", "cinematica"], "mito": ["alegre", "oscura"],
    "caso_uso": ["cinematica", "calma"], "lista": ["alegre", "calma"],
}


def _ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _analyse(path: Path) -> dict:
    """Duración, energía y densidad de golpes de la pista (audio a 11 kHz mono)."""
    raw = subprocess.run([_ffmpeg(), "-v", "error", "-i", str(path), "-ac", "1", "-ar", "11025", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    dur = len(x) / 11025
    frames = x[: len(x) // 512 * 512].reshape(-1, 512)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    flux = np.maximum(np.diff(rms), 0)
    onsets = (flux > flux.mean() + 2 * flux.std()).sum() / max(dur, 1)
    spec = np.abs(np.fft.rfft(frames[:: max(1, len(frames) // 200)], axis=1)).mean(axis=0)
    bright = float((spec * np.arange(len(spec))).sum() / (spec.sum() + 1e-9) / len(spec))
    return {"duration": round(dur, 1), "energy": round(float(np.percentile(rms, 70)), 4),
            "onsets": round(float(onsets), 2), "bright": round(bright, 3)}


def build_catalog(force: bool = False) -> list[dict]:
    old = {} if force or not CATALOG.exists() else {t["file"]: t for t in json.loads(CATALOG.read_text(encoding="utf-8"))}
    tracks = []
    for p in sorted(MUSIC_DIR.iterdir()):
        if p.suffix.lower() not in {".mp3", ".m4a", ".wav"}:
            continue
        if p.name in old:
            tracks.append(old[p.name])
            continue
        a = _analyse(p)
        if p.stem in OWN:
            moods, style, bpm = OWN[p.stem]
            t = {"file": p.name, "moods": moods, "style": style, "license": "Propia (CC0), compuesta por código", **a}
        else:
            t = {"file": p.name, "style": "Lo-fi / chill (HoliznaCC0)", "license": "CC0 · HoliznaCC0", **a}
        tracks.append(t)
    # Clasificación por energía relativa de las pistas que no tienen estilo fijado
    auto = [t for t in tracks if "moods" not in t or t.get("auto")]
    if auto:
        energies = sorted(t["energy"] for t in auto)
        for t in auto:
            rank = energies.index(t["energy"]) / max(len(energies) - 1, 1)
            t["auto"] = True
            if rank > 0.66:
                t["moods"] = ["alegre", "tech"] if t["onsets"] > 1.2 else ["alegre"]
            elif rank > 0.33:
                t["moods"] = ["alegre", "calma"] if t["bright"] > 0.08 else ["calma", "oscura"]
            else:
                t["moods"] = ["calma", "cinematica"]
    CATALOG.write_text(json.dumps(tracks, ensure_ascii=False, indent=2), encoding="utf-8")
    return tracks


def pick_music(content: str, seconds: float, recent: list[str], rnd: random.Random | None = None) -> dict:
    """Pista para un contenido: primero por estado de ánimo, evitando las usadas hace poco.
    Devuelve {file, start, moods, style}."""
    rnd = rnd or random.Random()
    tracks = build_catalog()
    wanted = CONTENT_MOOD.get(content, ["alegre", "calma"])
    fresh = [t for t in tracks if t["file"] not in recent[-8:]] or tracks
    for mood in wanted:
        pool = [t for t in fresh if mood in t.get("moods", [])]
        if pool:
            break
    else:
        pool = fresh
    # Pesos: las menos usadas de la memoria pesan más
    weights = [1.0 / (1 + recent.count(t["file"])) for t in pool]
    t = rnd.choices(pool, weights=weights)[0]
    start = rnd.uniform(0, max(0.0, min(t["duration"] - seconds - 2, t["duration"] * 0.45)))
    return {"file": t["file"], "start": round(start, 1), "moods": t.get("moods", []), "style": t.get("style", "")}


def sync_public() -> None:
    """Copia música y efectos a video/public/lib para que Remotion los pueda usar."""
    for src, dest in ((MUSIC_DIR, PUBLIC_LIB / "music"), (SFX_DIR, PUBLIC_LIB / "sfx")):
        dest.mkdir(parents=True, exist_ok=True)
        for f in src.iterdir():
            if f.suffix.lower() in {".mp3", ".wav", ".m4a"}:
                d = dest / f.name
                if not d.exists() or d.stat().st_size != f.stat().st_size:
                    shutil.copy2(f, d)


def catalog_markdown() -> str:
    rows = ["# Biblioteca musical", "", "Todas las pistas son CC0 (dominio público) o propias: se pueden usar en Instagram.", "",
            "| Archivo | Estilo | Ánimo | Duración | Licencia |", "|---|---|---|---|---|"]
    for t in build_catalog():
        rows.append(f"| {t['file']} | {t['style']} | {', '.join(t.get('moods', []))} | {t['duration']:.0f} s | {t['license']} |")
    return "\n".join(rows) + "\n"
