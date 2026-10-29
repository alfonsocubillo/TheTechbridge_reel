"""Orquestador del agente.

  python -m agent.main generate              # investiga, escribe, prepara y renderiza → out/reel.mp4
  python -m agent.main generate --storyboard ejemplo.json   # renderiza un guion fijo (pruebas)
  python -m agent.main publish --video-url https://... [--cover-url https://...]   # publica el último vídeo
  python -m agent.main refresh-token          # imprime un token de Instagram renovado
"""
from __future__ import annotations

import argparse
import json
import random
import re
import subprocess
from datetime import datetime, timezone

from . import assets, instagram, news, writer
from .common import FPS, OUT_DIR, VIDEO_DIR, env, load_config, load_history, log, save_history

ROTATION = ["noticia", "truco", "dato", "antes_despues", "tendencia", "prompt", "mito"]
COVER_FRAME = 75  # fotograma de la portada: las animaciones de entrada ya han terminado


def choose_format(cfg: dict, history: list[dict], have_news: bool) -> str:
    start = len(history) % len(ROTATION)
    recent = [h.get("format") for h in history[-2:]]
    for i in range(len(ROTATION)):
        f = ROTATION[(start + i) % len(ROTATION)]
        if f not in cfg["formats"] or f in recent:
            continue
        if cfg["formats"][f]["needs_news"] and not have_news:
            continue
        return f
    return "truco"


def build_props(cfg: dict, sb: dict, fmt_key: str, history: list[dict]) -> dict:
    run = assets.prepare_run()
    vis = cfg["visual"]
    # Cada formato tiene su color fijo: vídeo y portada coinciden y el perfil queda ordenado
    accent = vis["accents"][int(cfg["formats"][fmt_key].get("accent", len(history))) % len(vis["accents"])]

    use_voice = bool(env("ELEVENLABS_API_KEY") and env("ELEVENLABS_VOICE_ID")) and \
        random.random() < float(cfg["audio"]["voice_ratio"])
    log.info("Modo de audio: %s", "voz + música" if use_voice else "música + texto")

    used_clips = {cid for h in history[-60:] for cid in h.get("stock_ids", [])}
    scenes, captions, stock_ids = [], [], []
    cursor = 0  # en frames
    voices = [s["voice"] for s in sb["scenes"]]

    for i, s in enumerate(sb["scenes"]):
        scene = dict(s)
        if use_voice:
            vpath = run / f"voice{i}.mp3"
            words = assets.tts(s["voice"], vpath,
                               prev_text=" ".join(voices[:i])[-300:], next_text=" ".join(voices[i + 1:])[:300])
            seconds = max(assets.media_duration(vpath) + 0.35, 2.0)
            if s["type"] == "prompt":
                seconds = max(seconds, 5.5)
            scene["voiceSrc"] = f"run/voice{i}.mp3"
            for w in words:
                captions.append({"word": w["word"],
                                 "start": cursor + round(w["start"] * FPS),
                                 "end": cursor + round(w["end"] * FPS)})
        else:
            seconds = assets.reading_seconds(s)

        frames = round(seconds * FPS)
        if s.get("broll") and s["type"] in {"hook", "stat", "broll", "quote"}:
            clip = run / f"clip{i}.mp4"
            cid = assets.stock_clip(s["broll"], seconds, clip, used_clips | set(stock_ids))
            if cid:
                stock_ids.append(cid)
                scene["video"] = f"run/clip{i}.mp4"
        scene.update({"from": cursor, "durationInFrames": frames})
        scenes.append(scene)
        cursor += frames

    total_seconds = cursor / FPS
    music = assets.pick_music(run / "music.m4a", total_seconds)
    props = {
        "brand": {
            "name": cfg["brand"]["name"], "handle": cfg["brand"]["handle"],
            "bg": vis["background"], "text": vis["text"], "muted": vis["muted"],
            "accentA": accent[0], "accentB": accent[1],
            "logo": assets.fetch_logo(cfg["brand"]["logo_url"], run),
        },
        "formatLabel": cfg["formats"][fmt_key]["label"],
        "audioMode": "voice" if use_voice else "music",
        "music": f"run/{music.name}",
        "musicVolume": cfg["audio"]["music_volume_with_voice" if use_voice else "music_volume_alone"],
        "sfx": assets.make_sfx(run),
        "scenes": scenes,
        "captions": captions,
        "durationInFrames": cursor,
    }
    hook = sb["scenes"][0]
    cover = sb.get("cover") or {}
    cover_props = {
        "brand": props["brand"],
        "formatLabel": props["formatLabel"],
        "title": cover.get("title") or hook.get("text", ""),
        "highlight": cover.get("highlight") or hook.get("highlight", ""),
    }
    return {"props": props, "cover": cover_props, "stock_ids": stock_ids, "use_voice": use_voice}


def render(props: dict) -> None:
    props_file = OUT_DIR / "props.json"
    subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", "Reel", str(OUT_DIR / "reel.mp4"),
         f"--props={props_file}", "--codec=h264", "--crf=18", "--audio-codec=aac", "--audio-bitrate=192k",
         f"--concurrency={env('RENDER_CONCURRENCY', '2')}"],
        cwd=VIDEO_DIR, check=True,
    )


def render_cover() -> None:
    """Portada del Reel: misma plantilla para todos los vídeos, con el color del formato."""
    subprocess.run(
        ["npx", "remotion", "still", "src/index.ts", "Cover", str(OUT_DIR / "cover.jpg"),
         f"--props={OUT_DIR / 'cover_props.json'}", f"--frame={COVER_FRAME}",
         "--image-format=jpeg", "--jpeg-quality=92"],
        cwd=VIDEO_DIR, check=True,
    )


def caption_text(cfg: dict, sb: dict) -> str:
    """Descripción del post: el texto, la firma fija de la marca y los hashtags
    (primero los de marca, sin repetir y como mucho los que admite Instagram)."""
    c = cfg.get("caption") or {}
    tags, seen = [], set()
    for t in [*c.get("brand_hashtags", []), *sb.get("hashtags", [])]:
        t = "#" + re.sub(r"[^\w]", "", str(t))
        if len(t) > 1 and t.lower() not in seen:
            seen.add(t.lower())
            tags.append(t)
    parts = [sb["caption"].strip(), str(c.get("footer") or "").strip(), " ".join(tags[:int(c.get("max_hashtags", 5))])]
    return "\n\n".join(x for x in parts if x)[:2200]


def produce(storyboard: str | None = None, fmt: str | None = None, feedback: str | None = None,
            do_render: bool = True, materials: str = "", images: list[dict] | None = None) -> dict:
    """Genera un vídeo completo.
    `feedback` = lo que pide la directora; `materials`/`images` = lo que ha adjuntado (fuente principal)."""
    cfg = load_config()
    history = load_history()
    story, article = None, ""

    if storyboard:
        sb = json.loads(open(storyboard, encoding="utf-8").read())
        writer.validate(sb)
        fmt_key = sb.get("format", "truco")
    else:
        used = {h.get("source_url") for h in history if h.get("source_url")}
        items = news.recent_news(cfg["sources"], used)
        recent_titles = [h.get("topic", "") for h in history]
        if feedback is not None or materials or images:
            fmt_key, story = writer.plan_from_feedback(cfg, feedback or "", items, materials)
        else:
            fmt_key = fmt or choose_format(cfg, history, have_news=bool(items))
            if cfg["formats"][fmt_key]["needs_news"] and not items:
                log.warning("No hay noticias nuevas para '%s'; cambio a 'truco'", fmt_key)
                fmt_key = "truco"
            if cfg["formats"][fmt_key]["needs_news"]:
                story = writer.pick_story(cfg, fmt_key, items, recent_titles)
        log.info("Formato: %s", fmt_key)
        if story:
            article = news.fetch_article_text(story["url"])
        sb = writer.write_storyboard(cfg, fmt_key, story, article, recent_titles, feedback=feedback,
                                     materials=materials, images=images)
        log.info("Tema: %s", sb.get("topic"))

    built = build_props(cfg, sb, fmt_key, history)
    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "props.json").write_text(json.dumps(built["props"], ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "cover_props.json").write_text(json.dumps(built["cover"], ensure_ascii=False), encoding="utf-8")
    if do_render:
        render(built["props"])
        render_cover()

    meta = {
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "format": fmt_key,
        "format_label": cfg["formats"][fmt_key]["label"],
        "topic": sb.get("topic"),
        "source_url": story["url"] if story else None,
        "source_name": story["source"] if story else None,
        "caption": caption_text(cfg, sb),
        "cover_title": built["cover"]["title"],
        "storyboard": sb,
        "stock_ids": built["stock_ids"],
        "voice": built["use_voice"],
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Listo: out/reel.mp4 + out/meta.json")
    return meta


def record_published(meta: dict, link: str) -> None:
    history = load_history()
    history.append({k: meta.get(k) for k in ("date", "format", "topic", "source_url", "stock_ids", "voice")} |
                   {"permalink": link})
    save_history(history)


def cmd_generate(args) -> None:
    produce(args.storyboard, args.format, args.feedback, not args.no_render)


def cmd_publish(args) -> None:
    meta = json.loads((OUT_DIR / "meta.json").read_text(encoding="utf-8"))
    link = instagram.publish_reel(args.video_url, meta["caption"], cover_url=args.cover_url)
    record_published(meta, link)


def cmd_refresh(_args) -> None:
    print(instagram.refresh_token(env("IG_ACCESS_TOKEN", required=True)))


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("generate")
    g.add_argument("--storyboard")
    g.add_argument("--format")
    g.add_argument("--feedback", help="Indicaciones para el vídeo (como si las pidiera la directora)")
    g.add_argument("--no-render", action="store_true")
    g.set_defaults(func=cmd_generate)
    pub = sub.add_parser("publish")
    pub.add_argument("--video-url", required=True)
    pub.add_argument("--cover-url")
    pub.set_defaults(func=cmd_publish)
    sub.add_parser("refresh-token").set_defaults(func=cmd_refresh)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
