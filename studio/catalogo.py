"""Catálogo completo: TODAS las variantes visuales que puede producir el sistema, más lo ya generado.

  python -m studio catalogo

Crea TheTechBridge_Instagram/Catalogo_Completo/ con:
  Actual/      copia plana de todas las imágenes y vídeos de la biblioteca
  Variantes/   lo que puede salir y aún no ha salido: cada familia de portada en cada composición y formato,
               cada modelo de carrusel en cada color, cada paleta y tipo de elemento de Pulso, cada tipo y
               objeto 3D del modelo Actual, cada tipo de escena de los Reels
y un único archivo Catalogo.html para verlo todo junto. Las variantes no cuentan como contenido (no van a la memoria).
"""
from __future__ import annotations

import html
import shutil
from pathlib import Path
from urllib.parse import quote

from agent.common import load_config

from . import library, render, sound
from .catalog import FAMILIES, MODELS

FAM_TEXT = {
    "noticia": ("NOTICIA · OPENAI", "ChatGPT ya trabaja con tus archivos", "tus archivos", "Qué cambia y qué no deberías compartir.", None),
    "tutorial": ("GUÍA RÁPIDA · EXCEL", "5 funciones que deberías dominar ya", "dominar ya", "Sustituyen a BUSCARV y a los filtros manuales.", "5"),
    "comparativa": ("COMPARATIVA · SEGURIDAD", "Contraseñas vs passkeys: ¿ha llegado el relevo?", "el relevo", "Qué cambia y cuándo pasarte.", None),
    "analisis": ("ANÁLISIS · CIBERSEGURIDAD", "Un portátil, 20 minutos y 6.360 millones", "6.360 millones", "Lo que enseña a cualquier empresa.", None),
    "prompting": ("PROMPTING · NIVEL 2", "Deja de pedir «hazme un informe»", "«hazme un informe»", "Las 4 piezas que cambian la respuesta.", "4"),
    "curiosidad": ("EXPLICADO FÁCIL", "¿Qué es una API y por qué está en todas partes?", "en todas partes", "Sin tecnicismos.", None),
}

# Una diapositiva representativa de cada modelo de carrusel (para verla en los 6 colores)
CAROUSEL_SAMPLE = {
    "CR01": ({"kind": "item", "n": 3, "tag": "WORD", "title": "Escribe más claro", "card": "Reescribe este texto con un tono claro y directo, frases cortas y sin perder la información clave.", "tip": "Pide después una versión más formal o más breve."}, {}),
    "CR02": ({"kind": "flujo", "title": "Qué pasa al iniciar sesión", "nodes": [{"label": "Contraseña", "sub": "algo que sabes"}, {"label": "Segundo factor", "sub": "algo que tienes"}, {"label": "Acceso", "sub": "solo si las dos cuadran"}], "caption": "Sin tu móvil, no entran."}, {}),
    "CR03": ({"kind": "criterio", "criterion": "Phishing", "a": "Si la escribes en una web falsa, se la llevan.", "b": "Va ligada a la web real: en una falsa no funciona.", "a_score": 2, "b_score": 10, "verdict": "La passkey gana con claridad."},
             {"a": {"name": "Contraseña"}, "b": {"name": "Passkey"}}),
    "CR04": ({"kind": "cifras", "title": "Las cifras", "stats": [{"value": "6.360 M$", "label": "robados en un solo ataque"}, {"value": "20 min", "label": "para mover la mayor parte"}, {"value": "2.700 M$", "label": "congelados después"}]}, {}),
}
EXTRA_SLIDES = [("CR01", {"kind": "text", "kicker": "ANTES DE EMPEZAR", "title": "Un buen prompt tiene cuatro piezas", "highlight": "cuatro piezas", "body": "Rol, contexto, tarea y formato. Si falta una, la respuesta se queda corta. En las siguientes diapositivas tienes un ejemplo de cada una."})]

PULSO_VISUALS = [
    ("teclas", {"type": "keys", "keys": ["Ctrl", "Shift", "V"], "label": "Pega solo el texto, sin formato"}),
    ("cifra", {"type": "number", "value": "25", "label": "elementos que recuerda el portapapeles"}),
    ("palabra", {"type": "word", "word": "Passkeys", "label": "el relevo de las contraseñas"}),
]
ACTUAL_KINDS = {
    "dato": {"kind": "dato", "product": "Excel", "title": "Excel tiene más de 1 millón de filas", "highlight": "1 millón", "body": "Exactamente 1.048.576 filas y 16.384 columnas por hoja.", "cta": "¿Lo sabías?"},
    "pregunta": {"kind": "pregunta", "product": "Teams", "title": "¿Cuántas reuniones tienes hoy?", "highlight": "reuniones", "body": "Cuéntanos cómo organizas la semana en Teams.", "cta": "Respóndenos"},
    "ultima_hora": {"kind": "ultima_hora", "product": "Microsoft 365 Copilot", "title": "Gemini ya edita documentos en el chat", "highlight": "edita", "body": "Docs, Sheets, PDF y presentaciones sin salir de la conversación.", "points": ["PDF en web y móvil", "El resto, de momento solo en web", "Para todos los usuarios"], "source": "The Verge, 29 oct 2026", "cta": "¿Lo probarías?"},
    "reel": {"kind": "reel", "product": "Microsoft 365 Copilot", "title": "Nuevo Reel: deja de pedir «hazme un informe»", "highlight": "Reel", "body": "Las 4 piezas de un buen prompt. Ya en el perfil.", "cta": "Míralo en el perfil"},
}
HERO_PRODUCTS = {"ia": "Microsoft 365 Copilot", "excel": "Excel", "correo": "Outlook", "reuniones": "Teams", "datos": "Power BI",
                 "documentos": "Word", "presentaciones": "PowerPoint", "automatizacion": "Power Automate, Power Apps y Copilot Studio"}

RL_SHOWCASE = [
    {"type": "hook", "kicker": "MUESTRARIO", "tag": "NOTICIA", "text": "Todas las escenas de este modelo", "highlight": "Todas"},
    {"type": "chapter", "label": "CAPÍTULO", "title": "Un capítulo con su explicación", "body": "Cada capítulo cambia el plano y el objeto 3D."},
    {"type": "stat", "value": "6.360", "label": "millones: una cifra que cuenta", "source": "TRM Labs"},
    {"type": "points", "title": "Una lista de puntos", "items": ["Primer punto", "Segundo punto", "Tercer punto"]},
    {"type": "date", "label": "DISPONIBILIDAD", "title": "Noviembre 2026", "text": "Fecha y disponibilidad (solo Documental).", "source": "Fuente oficial"},
    {"type": "insight", "text": "Una idea fuerza que se queda en la cabeza", "highlight": "idea fuerza"},
    {"type": "end", "title": "Guárdalo y compártelo", "highlight": "compártelo", "text": "Cierre con llamada a la acción."},
]


def _variant_jobs(dest: Path) -> list[tuple[str, dict]]:
    """(sección, trabajo de render) de todas las variantes."""
    out: list[tuple[str, dict]] = []

    def still(section: str, comp: str, props: dict, name: str, **kw) -> None:
        out.append((section, {"composition": comp, "props": props, "kind": "still", "out": str(dest / section / name), **kw}))

    def video(section: str, comp: str, props: dict, name: str) -> None:
        out.append((section, {"composition": comp, "props": props, "kind": "video", "out": str(dest / section / name), "crf": 20}))

    # Portadas: 6 familias × 3 composiciones × 2 formatos
    for fam in FAMILIES:
        kicker, title, hl, sub, glyph = FAM_TEXT[fam]
        for layout in "abc":
            cover = {"family": fam, "kicker": kicker, "title": title, "highlight": hl, "subtitle": sub, "glyph": glyph, "layout": layout, "cta": None, "total": None}
            still("Portadas_Reel", "StudioCoverReel", cover, f"portada-reel_{fam}_{layout}.jpg")
            still("Portadas_Carrusel", "StudioCarousel", {"model": "CR01", "family": fam, "cover": cover, "slides": [{"kind": "closing", "title": "x"}], "index": 0, "extra": {}},
                  f"portada-carrusel_{fam}_{layout}.jpg")
    # Carruseles: cada modelo en los 6 colores + tipos de diapositiva que aún no han salido
    for model, (slide, extra) in CAROUSEL_SAMPLE.items():
        for fam in FAMILIES:
            still("Carruseles_Colores", "StudioCarousel", {"model": model, "family": fam, "cover": {"family": fam, "kicker": "x", "title": "x"}, "slides": [slide, slide],
                                                           "index": 1, "extra": extra}, f"{model}_{MODELS[model]['name'].replace(' ', '-')}_{fam}.jpg")
    for model, slide in EXTRA_SLIDES:
        still("Carruseles_Colores", "StudioCarousel", {"model": model, "family": "prompting", "cover": {"family": "prompting", "kicker": "x", "title": "x"},
                                                       "slides": [slide], "index": 1, "extra": {}}, f"{model}_diapositiva-texto.jpg")
    # Pulso: 4 paletas × 3 tipos de elemento central (vídeo con música)
    tracks = ["tb-synthwave-drive.mp3", "tb-tech-pulse.mp3", "holizna-make-funk.mp3", "tb-uplift-corporate.mp3"]
    for pal in range(4):
        for name, visual in PULSO_VISUALS:
            data = {"hook": "Esto te va a ahorrar tiempo", "visual": visual, "payoff": "Una frase que remata la idea y se lee de un vistazo.", "cta": "Pruébalo"}
            video("Historias_Pulso", "StudioStoryVideo", {"model": "HVPULSO", "data": data, "music": f"lib/music/{tracks[pal]}", "musicStart": 10, "bpm": 116, "palette": pal},
                  f"pulso_paleta{pal + 1}_{name}.mp4")
    # Modelo actual: tipos que aún no han salido (vídeo) y los 8 objetos 3D (imagen)
    cfg = load_config()
    music = {"file": "tb-news-ticker.mp3", "start": 5, "style": ""}
    for kind, d in ACTUAL_KINDS.items():
        props, _dur, _poster = render._story_actual_props(cfg, d, music)
        video("Historias_Actual", "Story", props, f"actual_{kind}.mp4")
    for hero, product in HERO_PRODUCTS.items():
        d = {"kind": "truco", "product": product, "title": f"Objeto 3D: {hero}", "highlight": hero, "body": f"El que sale cuando el tema es {product}.", "cta": "Ejemplo"}
        props, _dur, _poster = render._story_actual_props(cfg, d, music)
        still("Historias_Actual", "Story", props, f"actual_objeto3d_{hero}.jpg", frame=110)
    # Reels: muestrario con todos los tipos de escena + Cinemático en los 6 colores y 8 objetos 3D
    for model, scenes in (("RL01", [s for s in RL_SHOWCASE if s["type"] != "date"]), ("RL02", RL_SHOWCASE)):
        video("Reels_Escenas", "StudioReel", {"model": model, "family": "tutorial", "hero": "datos", "scenes": scenes, "extra": {},
                                              "music": "lib/music/tb-cinematic-rise.mp3", "musicStart": 0, "musicVolume": 0.45}, f"{model}_{MODELS[model]['name'].replace(' ', '-')}_muestrario.mp4")
    heroes = list(HERO_PRODUCTS)
    for i, fam in enumerate(FAMILIES):
        scenes = [{"type": "chapter", "label": fam.upper(), "title": f"Color de la familia {fam}", "body": "Mismo modelo, otro color y otro objeto 3D."}]
        still("Reels_Colores", "StudioReel", {"model": "RL01", "family": fam, "hero": heroes[i], "scenes": scenes, "extra": {}, "music": None},
              f"RL01_{fam}_{heroes[i]}.jpg", frame=60)
    for hero in heroes[6:]:
        scenes = [{"type": "chapter", "label": "OBJETO 3D", "title": f"Objeto {hero}", "body": "Objeto 3D disponible para los Reels."}]
        still("Reels_Colores", "StudioReel", {"model": "RL01", "family": "tutorial", "hero": hero, "scenes": scenes, "extra": {}, "music": None},
              f"RL01_tutorial_{hero}.jpg", frame=60)
    return out


SECTIONS = {
    "Actual": "Lo ya generado (todos los ejemplos)",
    "Portadas_Reel": "Portadas de Reel · 6 familias × 3 composiciones",
    "Portadas_Carrusel": "Portadas de carrusel · 6 familias × 3 composiciones",
    "Carruseles_Colores": "Cada modelo de carrusel en los 6 colores de familia",
    "Historias_Pulso": "Historia Pulso · 4 paletas × 3 elementos (teclas, cifra, palabra)",
    "Historias_Actual": "Historia Actual 3D · tipos que faltaban y los 8 objetos 3D",
    "Reels_Escenas": "Reels · muestrario con todos los tipos de escena",
    "Reels_Colores": "Reel Cinemático · colores de familia y objetos 3D",
}


def build_html(dest: Path) -> Path:
    parts = []
    for sec, title in SECTIONS.items():
        files = sorted(p for p in (dest / sec).rglob("*") if p.suffix in {".jpg", ".mp4"})
        if not files:
            continue
        cells = []
        for f in files:
            rel = quote(f.relative_to(dest).as_posix())
            label = html.escape(f.stem.replace("_", " · "))
            media = (f'<video controls preload="metadata" src="{rel}"></video>' if f.suffix == ".mp4"
                     else f'<a href="{rel}" target="_blank"><img loading="lazy" src="{rel}" alt="{label}"></a>')
            cells.append(f'<figure>{media}<figcaption>{label}</figcaption></figure>')
        parts.append(f'<section><h2>{html.escape(title)} <span>{len(files)}</span></h2><div class="grid">{"".join(cells)}</div></section>')
    total = sum(1 for p in dest.rglob("*") if p.suffix in {".jpg", ".mp4"})
    page = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catálogo completo</title><style>
body{{margin:0;background:#0b1020;color:#eef2ff;font:15px/1.4 system-ui,Segoe UI,sans-serif}} header{{padding:22px 24px;border-bottom:1px solid #25304f}}
h1{{margin:0;font-size:22px}} header p{{color:#93a0c0;margin:6px 0 0}} section{{padding:10px 24px 24px}} h2{{font-size:17px}} h2 span{{color:#7dd3fc;font-weight:500}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}} figure{{margin:0;background:#141b31;border:1px solid #25304f;border-radius:10px;overflow:hidden}}
figure img,figure video{{width:100%;display:block;background:#000;max-height:420px;object-fit:contain}} figcaption{{padding:7px 9px;font-size:12px;color:#93a0c0;word-break:break-word}}
</style></head><body><header><h1>Catálogo completo · {total} imágenes y vídeos</h1>
<p>Todo lo generado hasta ahora y todas las variantes visuales que pueden salir. Clic en una imagen para verla a tamaño real.</p></header>{''.join(parts)}</body></html>"""
    out = dest / "Catalogo.html"
    out.write_text(page, encoding="utf-8")
    return out


def build(render_variants: bool = True) -> Path:
    dest = library.ensure_tree() / "Catalogo_Completo"
    actual = dest / "Actual"
    if actual.exists():
        shutil.rmtree(actual)
    actual.mkdir(parents=True)
    for f in library.all_fichas():
        folder = library.base_dir() / f["carpeta"]
        for name in f.get("archivos") or []:
            src = folder / name
            if src.exists():
                tag = "Historia" if f["canal"] == "historia" else "Publicacion"
                shutil.copy2(src, actual / f"{tag}_{f['modelo']}_{library.slug(f['tema'], 30)}_{name}")
    if render_variants:
        jobs = [j for _sec, j in _variant_jobs(dest)]
        sound.sync_public()
        render.run_jobs(jobs)
    return build_html(dest)
