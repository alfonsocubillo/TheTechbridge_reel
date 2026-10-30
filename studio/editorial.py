"""Equipo editorial automático: investiga, elige qué merece historia y qué merece publicación, asigna el modelo
visual y escribe el contenido. Usa Claude con la suscripción (agent.writer.claude) y respeta la franja protegida.

Dos pasos:
  1. Selección (modelo ligero): con las noticias frescas, la memoria y el equilibrio de categorías, propone
     los temas del día para cada canal, sin solapes.
  2. Redacción (modelo principal): con el texto completo de las noticias elegidas, escribe cada pieza en el
     formato exacto del modelo. Nada de cifras inventadas: solo lo que está en la fuente o es conocimiento estable.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime

from agent import news
from agent.common import load_config, log
from agent.writer import _json, claude

from . import library
from .catalog import CATEGORIES, FAMILIES, HISTORIA, MODELS, PUBLICACION, models_for

SEPARATION = """Separación de canales (obligatoria):
- HISTORIAS: descubrimiento rápido. Noticias breves, curiosidades, trucos, atajos, prompts cortos, herramientas,
  comandos, mitos, quiz. Se consumen en segundos y provocan «no sabía esto» o «voy a probarlo».
- PUBLICACIONES (Reels y carruseles): profundidad y contenido de referencia que se guarda y se comparte.
  Grandes novedades con análisis, tutoriales completos, prompting avanzado, comparativas, conceptos explicados,
  casos de uso reales, tendencias.
- Un mismo tema NO puede ir en los dos canales salvo enfoque claramente distinto y complementario (y entonces
  explícalo en "enfoque"). Las historias nunca son versiones recortadas de un Reel."""


def _brief(cfg: dict) -> str:
    b = cfg["brand"]
    return (f"Marca: {b['name']} ({b['handle']}). {b['about'].strip()}\nAudiencia: {cfg['audience'].strip()}\n"
            f"Tono: {cfg['tone'].strip()}\nObjetivo: ser una cuenta de referencia en tecnología e innovación, no vender. "
            "Solo de vez en cuando, y si encaja con naturalidad, una mención a la formación de la empresa.")


def _memory_summary(mem: list[dict]) -> str:
    recent = mem[-60:]
    lines = [f"- [{e.get('channel')}] {e.get('fecha', '')[:10]} {e.get('model')} · {e.get('categoria')} · {e.get('topic')}" for e in recent]
    cats = Counter(e.get("categoria") for e in recent)
    total = max(len(recent), 1)
    balance = ", ".join(f"{c}: {cats.get(c, 0) / total:.0%} (objetivo {t:.0%})" for c, t in CATEGORIES.items())
    return ("Ya generado (no repetir temas):\n" + ("\n".join(lines) or "(nada todavía)") + f"\n\nEquilibrio de categorías: {balance}")


def _catalog(channel: str, mem: list[dict]) -> str:
    recent = Counter(e["model"] for e in mem[-30:] if e.get("channel") == channel)
    rows = []
    for k in models_for(channel):
        m = MODELS[k]
        rows.append(f"- {k} · {m['name']} ({m['kind']}): {m['about']} Encaja con: {', '.join(m['fits'])}. "
                    f"Usado {recent.get(k, 0)} veces últimamente.\n  Datos: {m['schema']}")
    return "\n".join(rows)


def research(cfg: dict, mem: list[dict]) -> list[dict]:
    st = cfg.get("studio") or {}
    used = {e.get("fuente") for e in library.all_fichas() if e.get("fuente")}
    items = news.recent_news(cfg["sources"] + st.get("extra_sources", []), used, days=int(st.get("news_days", 3)))
    return items[:60]


def select(cfg: dict, items: list[dict], mem: list[dict], n_stories: int, n_posts: int) -> dict:
    news_list = "\n".join(f"{i}. [{x['source'].split('/')[2]}] {x['title']} — {x['summary'][:220]}" for i, x in enumerate(items))
    prompt = f"""{_brief(cfg)}

{SEPARATION}

Noticias de los últimos días (índice. [fuente] título — resumen):
{news_list or '(no hay noticias nuevas)'}

{_memory_summary(mem)}

Modelos de HISTORIAS:
{_catalog(HISTORIA, mem)}

Modelos de PUBLICACIONES:
{_catalog(PUBLICACION, mem)}
Familias de portada del feed: {', '.join(FAMILIES)}.

Elige {n_stories} historias y {n_posts} publicaciones para hoy, como un equipo editorial y de marketing:
- Variedad temática enorme: IA, Microsoft 365, productividad, ciberseguridad, programación, automatización,
  software, hardware e innovación, tecnología en la empresa, curiosidades e historia de la informática.
  Corrige el equilibrio de categorías hacia el objetivo. No todo puede ser IA o prompting.
- Nada de despidos, resultados financieros, demandas ni polémicas corporativas: no interesan a esta audiencia.
- Todo tiene que ser de tecnología. Descarta noticias que no lo sean (historia general, política, sucesos,
  ofertas, motor, cine), aunque vengan de una fuente tecnológica.
- Prioriza utilidad, actualidad, originalidad y que se pueda contar visualmente. Descarta lo superficial, el
  cotilleo corporativo y lo que no aporte nada a profesionales de 35 a 60 años.
- Cada pieza con el modelo que mejor encaje; prefiere los modelos menos usados. Alterna Reels y carruseles.
- Puedes basarte en una noticia (indica su índice) o en conocimiento estable y verificable (news: null).
- Si se te ocurre una categoría o formato nuevo que valdría la pena, apúntalo en "ideas".

Devuelve solo JSON:
{{"historias": [{{"modelo": "...", "categoria": "...", "contenido": "tipo (de 'encaja con')", "tema": "...", "enfoque": "...", "news": null}}],
 "publicaciones": [{{"modelo": "...", "familia": "...", "categoria": "...", "contenido": "...", "tema": "...", "enfoque": "...", "news": 3}}],
 "ideas": ["..."]}}"""
    return _json(claude("Eres el director editorial de una cuenta de Instagram de tecnología. Respondes solo JSON.", prompt, fast=True))


def write_piece(cfg: dict, pick: dict, channel: str, item: dict | None) -> dict:
    m = MODELS[pick["modelo"]]
    article = news.fetch_article_text(item["url"], limit=7000) if item else ""
    source = f"\nNoticia: {item['title']} ({item['source']}, {item['date']:%d/%m/%Y})\nURL: {item['url']}\nTexto:\n{article or item['summary']}" if item else ""
    feed = channel == PUBLICACION
    extra = ('"portada": {"kicker": "ANTETÍTULO EN MAYÚSCULAS", "title": "titular de portada (máx. 8 palabras)", "highlight": "parte clave literal del título", '
             '"subtitle": "1 frase", "glyph": "número o símbolo opcional", "layout": "a|b|c"},\n "texto_publicacion": "texto del post: gancho, valor, '
             'llamada a guardar o compartir, pregunta y 4-5 hashtags empezando por #TheTechBridgeSolution",') if feed else ""
    prompt = f"""{_brief(cfg)}

Escribe una pieza de {'PUBLICACIÓN' if feed else 'HISTORIA'} con el modelo {pick['modelo']} · {m['name']}: {m['about']}
Tema: {pick['tema']}
Enfoque: {pick.get('enfoque', '')}{source}

Reglas:
- Español de España, frases cortas, concretas y útiles. Nada de relleno ni venta.
- Hechos y cifras: solo los que están en la noticia o son conocimiento estable y comprobable. Si dudas de un dato, quítalo.
- Atajos, comandos y fórmulas: tienen que ser reales y funcionar tal cual.
- Límites (se lee en un móvil): títulos y titulares máx. 8 palabras; textos de apoyo (body, explain, payoff,
  definition, tip…) máx. 28 palabras; cta máx. 4 palabras; listas de 3-4 elementos de máx. 10 palabras.
  En historias, menos es más: una idea por pieza.
- "glyph" de portada: 1-3 caracteres (un número o un símbolo), o nada.
- En "highlight" pon palabras literales del título.

Devuelve solo JSON:
{{"data": {m['schema']},
 {extra}
 "fuente": "URL o null"}}"""
    r = _json(claude("Eres guionista y diseñador de contenido de una cuenta de tecnología. Respondes solo JSON válido.", prompt))
    piece = {"canal": channel, "modelo": pick["modelo"], "categoria": pick.get("categoria"), "contenido": pick.get("contenido"),
             "tema": pick["tema"], "enfoque": pick.get("enfoque", ""), "data": r["data"], "fuente": r.get("fuente") or (item or {}).get("url")}
    if feed:
        piece.update(familia=pick.get("familia") if pick.get("familia") in FAMILIES else "tutorial",
                     portada=_clean_cover(r.get("portada") or {"kicker": pick.get("categoria", "").upper(), "title": pick["tema"]}),
                     texto_publicacion=r.get("texto_publicacion", ""))
    return piece


def _clean_cover(c: dict) -> dict:
    if len(str(c.get("glyph") or "")) > 3:
        c.pop("glyph")
    if c.get("layout") not in {"a", "b", "c"}:
        c["layout"] = "a"
    return c


def plan_day(n_stories: int, n_posts: int) -> list[dict]:
    cfg = load_config()
    mem = library.load_memory()
    items = research(cfg, mem)
    sel = select(cfg, items, mem, n_stories, n_posts)
    if sel.get("ideas"):
        ideas = library.base_dir() / "_sistema" / "ideas.md"
        with open(ideas, "a", encoding="utf-8") as fh:
            fh.write(f"\n## {datetime.now():%d/%m/%Y}\n" + "\n".join(f"- {i}" for i in sel["ideas"]) + "\n")
    pieces, taken = [], []
    for channel, key in ((HISTORIA, "historias"), (PUBLICACION, "publicaciones")):
        for pick in sel.get(key, []):
            if pick.get("modelo") not in MODELS or MODELS[pick["modelo"]]["channel"] != channel:
                pick["modelo"] = library.pick_model(channel, models_for(channel), mem)
            clash = library.overlaps(pick["tema"], mem + taken)
            if clash and not pick.get("enfoque"):
                log.info("Descarto «%s»: se solapa con «%s»", pick["tema"], clash.get("topic"))
                continue
            item = items[pick["news"]] if isinstance(pick.get("news"), int) and 0 <= pick["news"] < len(items) else None
            try:
                piece = write_piece(cfg, pick, channel, item)
            except Exception as e:  # una pieza mala no tumba el día
                log.warning("No se pudo escribir «%s»: %s", pick.get("tema"), e)
                continue
            pieces.append(piece)
            taken.append({"channel": channel, "topic": pick["tema"]})
    return pieces
