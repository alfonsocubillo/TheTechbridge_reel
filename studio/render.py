"""Convierte piezas (contenido + modelo) en archivos: prepara las props de Remotion, renderiza todo en un solo lote
y guarda cada pieza en su carpeta con su ficha.

Una pieza es un dict:
  {canal, modelo, categoria, contenido (tipo: atajo, noticia_rapida...), familia (solo feed), tema, enfoque,
   data (lo que pide el `schema` del modelo), portada (solo feed: kicker, title, highlight, subtitle, glyph, layout),
   texto_publicacion (solo feed), fuente (url), origen}
"""
from __future__ import annotations

import json
import random
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

from agent.common import FPS, VIDEO_DIR, load_config, log

from . import library, sound
from .catalog import MODELS, PUBLICACION

COVER_KEYS = ("kicker", "title", "highlight", "subtitle", "glyph", "layout", "cta", "total")


def cover_props(piece: dict) -> dict:
    """Todas las claves explícitas: Remotion rellena las que faltan con las de la muestra de la composición."""
    c = piece["portada"]
    return {k: c.get(k) for k in COVER_KEYS} | {"family": piece["familia"], "layout": c.get("layout") or "a"}


SFX_OLD = ("whoosh1", "whoosh2", "whoosh3", "impact", "riser", "shimmer", "pop", "tick", "ding", "type", "swipe")


def _story_actual_props(cfg: dict, d: dict, music: dict) -> tuple[dict, int, int]:
    from agent.main import hero_for
    from agent.stories import KINDS, timing
    vis = cfg["visual"]
    kind = KINDS.get(d.get("kind"), KINDS["truco"])
    fmt = kind["format"] or "noticia"
    accent = vis["accents"][int(cfg["formats"].get(fmt, {}).get("accent", 0)) % len(vis["accents"])]
    dur, split = timing(d)
    props = {
        "brand": {"name": cfg["brand"]["name"], "handle": cfg["brand"]["handle"], "bg": vis["background"], "text": vis["text"],
                  "muted": vis["muted"], "accentA": accent[0], "accentB": accent[1], "logo": None},
        "kind": d.get("kind"), "badge": kind["badge"], "label": kind["label"], "hero": hero_for(cfg, d.get("product")),
        "title": d["title"], "highlight": d.get("highlight", ""), "body": d.get("body", ""), "cta": d.get("cta", ""),
        "points": d.get("points") or [], "source": d.get("source", ""), "splitAt": split,
        "music": f"lib/music/{music['file']}", "sfx": {k: f"lib/sfx/{k}.wav" for k in SFX_OLD}, "durationInFrames": dur,
    }
    return props, dur, (split - 12) if split else dur - 15


def _terminal_frames(d: dict) -> int:
    """Duración del modelo Terminal (misma cuenta que storyVideoDuration en StoryVideos.tsx)."""
    chars = sum(len(str(l["cmd"])) / 1.6 + 14 + len(l.get("out") or []) * 6 for l in d.get("lines", []))
    return round(20 + chars + 30 + 150)


def _seconds(model: str, data: dict) -> float:
    if model.startswith("RL"):
        n = len(data.get("scenes", []))
        return 6.0 * n + 4
    return 16.0


def jobs_for(piece: dict, out: Path, music: dict | None) -> tuple[list[dict], list[str]]:
    """Trabajos de render de una pieza y la lista de archivos que generará (el primero es el principal)."""
    cfg = load_config()
    m = MODELS[piece["modelo"]]
    d = piece["data"]
    jobs, files = [], []

    def job(comp: str, props: dict, name: str, kind: str = "still", **kw) -> None:
        jobs.append({"composition": comp, "props": props, "out": str(out / name), "kind": kind, **kw})
        files.append(name)

    if m["kind"] == "foto":
        job("StudioStoryStill", {"model": piece["modelo"], "data": d}, "historia.jpg")
    elif piece["modelo"] == "HVACTUAL":
        props, _dur, poster = _story_actual_props(cfg, d, music)
        job("Story", props, "historia.mp4", "video", crf=20)
        job("Story", props, "miniatura.jpg", frame=poster, scale=0.5)
    elif m["kind"] == "video":
        props = {"model": piece["modelo"], "data": d, "music": f"lib/music/{music['file']}", "musicStart": music["start"],
                 "bpm": piece.get("bpm", 120), "palette": piece.get("paleta", random.randrange(4))}
        job("StudioStoryVideo", props, "historia.mp4", "video", crf=20)
        job("StudioStoryVideo", props, "miniatura.jpg", frame={"HVPULSO": 300, "HVQUIZ": 330}.get(piece["modelo"]) or _terminal_frames(d) - 40, scale=0.5)
    elif m["kind"] == "reel":
        props = {"model": piece["modelo"], "family": piece["familia"], "hero": d.get("hero"), "scenes": d["scenes"],
                 "extra": {k: d[k] for k in ("a", "b") if k in d}, "music": f"lib/music/{music['file']}",
                 "musicStart": music["start"], "musicVolume": 0.45}
        job("StudioReel", props, "reel.mp4", "video")
        job("StudioCoverReel", cover_props(piece), "portada.jpg")
    elif m["kind"] == "carrusel":
        slides = d["slides"]
        base = {"model": piece["modelo"], "family": piece["familia"], "cover": cover_props(piece),
                "slides": slides, "extra": {k: d[k] for k in ("a", "b") if k in d}}
        for i in range(len(slides) + 1):
            job("StudioCarousel", {**base, "index": i}, f"{i + 1:02d}.jpg")
    return jobs, files


def run_jobs(jobs: list[dict]) -> None:
    sound.sync_public()
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
        json.dump(jobs, fh, ensure_ascii=False)
        path = fh.name
    node = shutil.which("node") or "node"
    log.info("Renderizando %d trabajos…", len(jobs))
    p = subprocess.run([node, "studio-render.mjs", path], cwd=VIDEO_DIR, text=True, encoding="utf-8")
    Path(path).unlink(missing_ok=True)
    if p.returncode:
        log.warning("Algún render falló (mira los ERROR de arriba)")


def produce(pieces: list[dict], origin: str = "ejemplo") -> list[dict]:
    """Renderiza un lote de piezas y las registra en la biblioteca. Devuelve las fichas creadas."""
    mem = library.load_memory()
    recent_music = [e.get("musica") for e in mem if e.get("musica")]
    rnd = random.Random()
    plan, all_jobs = [], []
    now = datetime.now()
    for piece in pieces:
        m = MODELS[piece["modelo"]]
        out = library.new_piece_dir(piece["modelo"], piece["tema"], now)
        music = None
        if m["kind"] in {"video", "reel"}:
            music = sound.pick_music(piece.get("contenido", ""), _seconds(piece["modelo"], piece["data"]), recent_music, rnd)
            recent_music.append(music["file"])
        jobs, files = jobs_for(piece, out, music)
        all_jobs += jobs
        plan.append((piece, out, files, music))
    run_jobs(all_jobs)

    fichas = []
    for piece, out, files, music in plan:
        made = [f for f in files if (out / f).exists()]
        if not made:
            log.warning("La pieza '%s' no se generó; se descarta", piece["tema"])
            shutil.rmtree(out, ignore_errors=True)
            continue
        m = MODELS[piece["modelo"]]
        if piece["canal"] == PUBLICACION:
            cover_src = out / ("portada.jpg" if m["kind"] == "reel" else "01.jpg")
            if cover_src.exists():
                dest = library.base_dir() / "Portadas" / ("Reels" if m["kind"] == "reel" else "Carruseles") / f"{out.name}.jpg"
                shutil.copy2(cover_src, dest)
        ficha = {
            "id": f"{now:%m%d}-{piece['modelo']}-{library.slug(piece['tema'], 18)}",
            "fecha": now.isoformat(timespec="minutes"),
            "canal": piece["canal"], "tipo": m["kind"], "modelo": piece["modelo"], "modelo_nombre": m["name"],
            "familia": piece.get("familia"), "categoria": piece.get("categoria"), "contenido": piece.get("contenido"),
            "tema": piece["tema"], "enfoque": piece.get("enfoque", ""), "fuente": piece.get("fuente"),
            "musica": music["file"] if music else None, "musica_estilo": music["style"] if music else None,
            "musica_inicio_s": music["start"] if music else None,
            "efectos": _sfx_summary(piece["modelo"]), "estructura": _structure(piece),
            "archivos": made, "texto_publicacion": piece.get("texto_publicacion"), "origen": origin,
            "datos": piece["data"], "portada": piece.get("portada"),
        }
        fichas.append(library.register(out, ficha))
        log.info("✓ %s · %s → %s", m["name"], piece["tema"], out.relative_to(library.base_dir()))
    return fichas


def _structure(piece: dict) -> str:
    d = piece["data"]
    if "scenes" in d:
        return " → ".join(s["type"] for s in d["scenes"])
    if "slides" in d:
        return "portada → " + " → ".join(s["kind"] for s in d["slides"])
    return MODELS[piece["modelo"]]["name"]


def _sfx_summary(model: str) -> list[str]:
    return {
        "HVACTUAL": ["whoosh", "impact", "swipe", "pop"], "HVPULSO": ["thud", "click", "swoosh_up", "keyclack/data/boom", "impact", "pop"],
        "HVTERMINAL": ["scan", "keyclack", "click", "data", "success"], "HVQUIZ": ["notif", "pop", "countdown", "silencio", "success", "impact"],
        "RL01": ["reverse", "boom", "whoosh", "shimmer", "data/ding", "riser", "chime"], "RL02": ["swipe", "notif", "tick", "pop", "riser", "chime"],
        "RL03": ["swipe", "boom", "impact", "glitch", "riser", "thud", "chime"],
    }.get(model, [])
