"""Historias de Instagram: guiones, render, horario y estado.

  · Cada noche, junto al Reel, se preparan `stories.per_day` historias y se reparten a horas al azar entre
    `stories.window` (por defecto de 9:00 a 21:00), separadas al menos `min_gap_minutes`.
  · La directora puede pedir historias por correo (botón "Historias con esto", con archivos o mensajes).
  · A las `news_check` se mira si ha salido algo importante de los productos y, si lo hay, se añade una
    historia de "Última hora" para la tarde.
Ninguna de estas tareas usa Claude dentro de la franja protegida (config → claude).
"""
from __future__ import annotations

import json
import random
from datetime import date, datetime, timedelta

from . import assets, news, writer
from .common import FPS, OUT_DIR, env, load_history, log, minutes
from .main import accent_for, hero_for, remotion

# tipo de historia → rótulo, icono de la insignia y formato del que toma el color
KINDS = {
    "noticia": {"label": "NOTICIA", "badge": "noticia", "format": "noticia"},
    "ultima_hora": {"label": "ÚLTIMA HORA", "badge": "noticia", "format": "dato"},
    "truco": {"label": "TRUCO RÁPIDO", "badge": "truco", "format": "truco"},
    "dato": {"label": "¿SABÍAS QUE?", "badge": "dato", "format": "dato"},
    "pregunta": {"label": "PREGUNTA", "badge": "pregunta", "format": "prompt"},
    "reel": {"label": "NUEVO REEL", "badge": "noticia", "format": None},
}


def timing(s: dict) -> tuple[int, int | None]:
    """(duración total, fotograma de la segunda parte). Las noticias tienen dos partes: titular y lo que cambia;
    cada una dura lo que se tarda en leerla con calma (unas 3 palabras por segundo, más la entrada)."""
    words1 = len(f"{s.get('title', '')} {s.get('body', '')}".split())
    part1 = min(max(2.6 + words1 * 0.33, 5.0), 10.0)
    points = s.get("points") or []
    if not points:
        words1 += len(str(s.get("cta", "")).split())
        return round(min(max(2.6 + words1 * 0.33, 7.0), 12.0) * FPS), None
    words2 = len(" ".join([*points, str(s.get("source", "")), str(s.get("cta", ""))]).split())
    part2 = min(max(2.0 + words2 * 0.33, 6.0), 10.0)
    return round((part1 + part2) * FPS), round(part1 * FPS)


def render_stories(cfg: dict, stories: list[dict], reel_format: str | None = None, prefix: str = "story") -> list[dict]:
    """Renderiza cada historia (mp4 + miniatura para el correo) en out/ y devuelve sus datos."""
    run = assets.prepare_run()
    vis = cfg["visual"]
    sfx = assets.make_sfx(run)
    OUT_DIR.mkdir(exist_ok=True)
    done = []
    for i, s in enumerate(stories):
        kind = KINDS.get(s.get("kind"), KINDS["truco"])
        fmt = kind["format"] or reel_format or "noticia"
        accent = accent_for(cfg, fmt, s.get("product"))
        dur, split = timing(s)
        music = assets.pick_music(run / f"story_music{i}.m4a", dur / FPS)
        props = {
            "brand": {"name": cfg["brand"]["name"], "handle": cfg["brand"]["handle"], "bg": vis["background"],
                      "text": vis["text"], "muted": vis["muted"], "accentA": accent[0], "accentB": accent[1], "logo": None},
            "kind": s.get("kind"), "badge": kind["badge"], "label": kind["label"],
            "hero": hero_for(cfg, s.get("product")),
            "title": s["title"], "highlight": s.get("highlight", ""), "body": s.get("body", ""), "cta": s.get("cta", ""),
            "points": s.get("points") or [], "source": s.get("source", ""), "splitAt": split,
            "music": f"run/{music.name}", "sfx": sfx or None, "durationInFrames": dur,
        }
        props_file = OUT_DIR / f"{prefix}{i}_props.json"
        props_file.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
        mp4, jpg = OUT_DIR / f"{prefix}{i}.mp4", OUT_DIR / f"{prefix}{i}.jpg"
        remotion("render", "src/index.ts", "Story", str(mp4), f"--props={props_file}", "--codec=h264", "--crf=20",
                 "--audio-codec=aac", f"--concurrency={env('RENDER_CONCURRENCY', '4')}")
        remotion("still", "src/index.ts", "Story", str(jpg), f"--props={props_file}", f"--frame={(split - 12) if split else dur - 15}",  # miniatura: el titular
                 "--image-format=jpeg", "--jpeg-quality=85", "--scale=0.34")
        log.info("Historia %d lista: %s — %s", i, kind["label"], s["title"])
        done.append({**s, "label": kind["label"], "file": mp4.name, "thumb": jpg.name})
    return done


def schedule(cfg: dict, day: date, n: int, earliest: datetime | None = None, taken: list[str] = (),
             start: str | None = None) -> list[str]:
    """n horas al azar dentro de la ventana, separadas entre sí (y de las ya ocupadas) lo más posible."""
    st = cfg.get("stories") or {}
    lo, hi = minutes(start or st.get("window", ["09:00", "21:00"])[0]), minutes(st.get("window", ["09:00", "21:00"])[1])
    if earliest is not None and earliest.date() == day:
        lo = max(lo, earliest.hour * 60 + earliest.minute + 20)
    if hi - lo < 10 * n:
        return []
    rnd = random.Random(f"{day.isoformat()}-{n}-{lo}-{len(taken)}")
    taken_m = [minutes(t) for t in taken]
    gap = float(st.get("min_gap_minutes", 120))
    for attempt in range(600):
        if attempt and attempt % 150 == 0:
            gap *= 0.7  # si no caben con esa separación, se relaja poco a poco
        picks = sorted(rnd.randint(lo, hi) for _ in range(n))
        allm = sorted(picks + taken_m)
        if all(b - a >= gap for a, b in zip(allm, allm[1:])):
            return [f"{t // 60:02d}:{t % 60:02d}" for t in picks]
    step = (hi - lo) // (n + 1)
    return [f"{(lo + step * (k + 1)) // 60:02d}:{(lo + step * (k + 1)) % 60:02d}" for k in range(n)]


def _entries(stories: list[dict], times: list[str], day: date, tag: str, prefix_id: str, origin: str) -> list[dict]:
    return [{
        "id": f"{prefix_id}-{i}", "day": day.isoformat(), "at": t, "status": "scheduled", "origin": origin,
        "kind": s.get("kind"), "label": s["label"], "title": s["title"], "body": s.get("body", ""),
        "tag": tag, "file": s["file"], "thumb": s["thumb"], "source_url": s.get("source_url"),
        "source": s.get("source"),
    } for i, (s, t) in enumerate(zip(stories, times))]


def daily(cfg: dict, meta: dict, item: dict, now: datetime) -> list[dict]:
    """Historias del día, preparadas de madrugada junto al Reel (van en la misma release)."""
    n = int((cfg.get("stories") or {}).get("per_day", 3))
    if n <= 0:
        return []
    history = load_history()
    used = {h.get("source_url") for h in history if h.get("source_url")} | {meta.get("source_url")}
    items = news.relevant(news.recent_news(cfg["sources"], used, days=4), cfg.get("products", []))
    recent = [h.get("topic", "") for h in history]
    # La noticia de la historia se elige aparte (nunca la del Reel) y se escribe a partir del artículo completo
    pick = writer.pick_story(cfg, "noticia", items, recent + [meta.get("topic", "")]) if items else None
    article = news.fetch_article_text(pick["url"], limit=8000) if pick else ""
    plan = ["noticia" if pick else "dato", "truco", "reel" if now.toordinal() % 2 == 0 else "pregunta"]
    plan = (plan + ["dato", "truco", "pregunta"])[:n]
    stories = writer.write_stories(cfg, plan, [pick] if pick else [], reel_topic=meta.get("topic"),
                                   recent_titles=recent, article=article)
    for st in stories:
        if pick and st.get("kind") in {"noticia", "ultima_hora"}:
            st["source_url"] = pick["url"]
    rendered = render_stories(cfg, stories, reel_format=meta.get("format"))
    times = schedule(cfg, now.date(), len(rendered), earliest=now)  # si se genera tarde, nunca horas ya pasadas
    return _entries(rendered, times, now.date(), item["tag"], item["id"], "nightly")


def next_slot_day(cfg: dict, now: datetime, needed_minutes: int = 90) -> tuple[date, datetime | None]:
    """Hoy si queda ventana suficiente; si no, mañana desde el principio de la ventana."""
    end = minutes((cfg.get("stories") or {}).get("window", ["09:00", "21:00"])[1])
    if now.hour * 60 + now.minute + needed_minutes <= end:
        return now.date(), now
    return now.date() + timedelta(days=1), None


DEMO = [
    {"kind": "noticia", "product": "Excel", "title": "Copilot ya limpia los datos de tus tablas en Excel", "highlight": "limpia",
     "body": "La actualización de octubre añade a Copilot una función que revisa la tabla y corrige espacios y formatos que no cuadran.",
     "points": ["Detecta espacios de más y formatos mezclados", "En Excel para Windows, Mac y web", "Llega con la actualización de octubre"],
     "source": "Microsoft · Blog de Excel, octubre", "cta": "¿Lo probarías en tu equipo?"},
    {"kind": "pregunta", "product": "Teams", "title": "¿Cuántas reuniones tienes hoy?", "highlight": "reuniones",
     "body": "Cuéntanos por mensaje cómo organizas la semana en Teams.", "cta": "Respóndenos por mensaje"},
]


if __name__ == "__main__":
    # Prueba de render sin Claude: python -m agent.stories
    from .common import load_config
    for s in render_stories(load_config(), DEMO, reel_format="truco", prefix="demo"):
        print(s["file"], s["thumb"])
