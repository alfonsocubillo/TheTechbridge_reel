"""Catálogo de modelos visuales. Historias y publicaciones NUNCA comparten modelo.

Cada modelo dice en qué canal vive, en qué carpeta se guarda, qué composición de Remotion lo pinta, para qué
contenidos encaja y qué datos necesita (`schema`, que también se le enseña a Claude al planificar).
"""
from __future__ import annotations

HISTORIA, PUBLICACION = "historia", "publicacion"

MODELS: dict[str, dict] = {
    # ───────── Historias · vídeo ─────────
    "HVACTUAL": {
        "channel": HISTORIA, "kind": "video", "name": "Actual 3D", "folder": "Historias/Videos/Modelo_Actual",
        "composition": "Story",
        "about": "El formato de siempre: objeto 3D del producto, insignia del formato y titular. Noticias en dos partes.",
        "fits": ["noticia_rapida", "truco", "dato"],
        "schema": '{"kind": "noticia|truco|dato|pregunta", "product": "Excel|Outlook|Teams|...", "title": "...", '
                  '"highlight": "palabra", "body": "1-2 frases", "points": ["solo noticias, 2-3"], "source": "solo noticias", "cta": "..."}',
    },
    "HVPULSO": {
        "channel": HISTORIA, "kind": "video", "name": "Pulso", "folder": "Historias/Videos/Modelo_Nuevo",
        "composition": "StudioStoryVideo",
        "about": "Tipografía cinética a ritmo de la música, barridos de color y un elemento central (teclas, cifra o palabra).",
        "fits": ["atajo", "dato", "curiosidad", "truco"],
        "schema": '{"hook": "3-7 palabras", "visual": {"type": "keys", "keys": ["Ctrl","Shift","V"], "label": "..."} | '
                  '{"type": "number", "value": "71%", "label": "..."} | {"type": "word", "word": "...", "label": "..."}, '
                  '"payoff": "1 frase", "cta": "2-3 palabras"}',
    },
    "HVTERMINAL": {
        "channel": HISTORIA, "kind": "video", "name": "Terminal", "folder": "Historias/Videos/Otros_Modelos/Terminal",
        "composition": "StudioStoryVideo",
        "about": "Comandos tecleados en una terminal y su salida. Programación, ciberseguridad, automatización, sistemas.",
        "fits": ["comando", "programacion", "ciberseguridad", "automatizacion"],
        "schema": '{"tag": "GIT|POWERSHELL|PYTHON|...", "shell": "PowerShell|bash|Python", "title": "...", '
                  '"lines": [{"cmd": "comando real", "out": ["salida real, 0-3 líneas"]}], "explain": "qué hace", "cta": "..."}',
    },
    "HVQUIZ": {
        "channel": HISTORIA, "kind": "video", "name": "Quiz", "folder": "Historias/Videos/Otros_Modelos/Quiz",
        "composition": "StudioStoryVideo",
        "about": "Pregunta con tres opciones, cuenta atrás y respuesta explicada. Para que la gente participe.",
        "fits": ["curiosidad", "ciberseguridad", "historia_tech", "dato"],
        "schema": '{"question": "...", "options": ["A", "B", "C"], "answer": 0, "explain": "por qué"}',
    },
    # ───────── Historias · foto ─────────
    "HF01": {"channel": HISTORIA, "kind": "foto", "name": "Titular", "folder": "Historias/Fotos/Modelo_01_Titular",
             "composition": "StudioStoryStill", "about": "Noticia rápida con cinta de NOVEDAD y fuente.",
             "fits": ["noticia_rapida", "lanzamiento"],
             "schema": '{"kicker": "NOVEDAD|ÚLTIMA HORA", "title": "...", "highlight": "...", "body": "1-2 frases", "source": "Medio, fecha"}'},
    "HF02": {"channel": HISTORIA, "kind": "foto", "name": "¿Sabías que?", "folder": "Historias/Fotos/Modelo_02_SabiasQue",
             "composition": "StudioStoryStill", "about": "Curiosidad con una cifra o palabra gigante en papel cálido.",
             "fits": ["curiosidad", "dato", "historia_tech"],
             "schema": '{"big": "1947", "fact": "...", "detail": "...", "source": "..."}'},
    "HF03": {"channel": HISTORIA, "kind": "foto", "name": "Atajo", "folder": "Historias/Fotos/Modelo_03_Atajo",
             "composition": "StudioStoryStill", "about": "Teclas en 3D sobre suelo de rejilla.",
             "fits": ["atajo"],
             "schema": '{"app_name": "Windows|Excel|Chrome", "keys": ["Win", "V"], "title": "...", "what": "...", "os": ["Windows 11"]}'},
    "HF04": {"channel": HISTORIA, "kind": "foto", "name": "Prompt exprés", "folder": "Historias/Fotos/Otros_Modelos/Prompt_Expres",
             "composition": "StudioStoryStill", "about": "Prompt corto en burbuja de chat con lo que devuelve.",
             "fits": ["prompt_corto"],
             "schema": '{"app_name": "Copilot · ChatGPT", "prompt": "...", "result": ["2-4 líneas"], "tip": "..."}'},
    "HF05": {"channel": HISTORIA, "kind": "foto", "name": "Mito o realidad", "folder": "Historias/Fotos/Otros_Modelos/Mito_Realidad",
             "composition": "StudioStoryStill", "about": "Mito tachado arriba, realidad abajo.",
             "fits": ["mito", "ciberseguridad"],
             "schema": '{"myth": "...", "reality": "...", "note": "matiz o fuente"}'},
    "HF06": {"channel": HISTORIA, "kind": "foto", "name": "Herramienta", "folder": "Historias/Fotos/Otros_Modelos/Herramienta",
             "composition": "StudioStoryStill", "about": "Ficha de una herramienta útil: qué hace, 3 ventajas, precio.",
             "fits": ["herramienta"],
             "schema": '{"name": "...", "category": "...", "what": "...", "features": ["3"], "price": "Gratis|De pago|Freemium", "where": "Web|Windows|..."}'},
    # ───────── Publicaciones · Reels ─────────
    "RL01": {"channel": PUBLICACION, "kind": "reel", "name": "Cinemático 3D", "folder": "Publicaciones/Reels/Modelo_01_Cinematico",
             "composition": "StudioReel", "about": "Plató 3D con movimientos de cámara por capítulo y bandas de cine.",
             "fits": ["tutorial", "prompting_avanzado", "tendencia", "caso_uso"],
             "schema": '{"hero": "ia|excel|correo|reuniones|datos|documentos|presentaciones|automatizacion", "scenes": ['
                       '{"type": "hook", "kicker": "...", "text": "...", "highlight": "..."}, {"type": "chapter", "label": "...", "title": "...", "body": "..."}, '
                       '{"type": "stat", "value": "...", "label": "...", "source": "..."}, {"type": "points", "title": "...", "items": []}, '
                       '{"type": "insight", "text": "..."}, {"type": "end", "title": "...", "highlight": "...", "text": "..."}]}'},
    "RL02": {"channel": PUBLICACION, "kind": "reel", "name": "Documental claro", "folder": "Publicaciones/Reels/Modelo_02_Documental",
             "composition": "StudioReel", "about": "Fondo claro, baldosas 3D, NOTICIA en rojo, capítulos y fecha. Para noticias con análisis.",
             "fits": ["noticia_importante", "lanzamiento", "analisis"],
             "schema": '{"scenes": [{"type": "hook", "tag": "NOTICIA", "kicker": "MEDIO · FECHA", "text": "...", "highlight": "..."}, '
                       '{"type": "chapter", "label": "QUÉ HACE", "title": "...", "body": "..."}, {"type": "date", "label": "DISPONIBILIDAD", "title": "...", "text": "...", "source": "..."}, '
                       '{"type": "points", ...}, {"type": "end", ...}]}'},
    "RL03": {"channel": PUBLICACION, "kind": "reel", "name": "Versus", "folder": "Publicaciones/Reels/Otros_Modelos/Versus",
             "composition": "StudioReel", "about": "Pantalla partida A/B con rondas y marcador. Conclusión honesta.",
             "fits": ["comparativa"],
             "schema": '{"a": {"name": "...", "tagline": "..."}, "b": {...}, "scenes": [{"type": "hook", ...}, {"type": "duel"}, '
                       '{"type": "round", "criterion": "...", "a": "...", "b": "...", "a_score": 0-10, "b_score": 0-10, "verdict": "..."}, '
                       '{"type": "choose", "a_if": [], "b_if": []}, {"type": "end", ...}]}'},
    # ───────── Publicaciones · Carruseles ─────────
    "CR01": {"channel": PUBLICACION, "kind": "carrusel", "name": "Guía numerada", "folder": "Publicaciones/Carruseles/Modelo_01_Guia",
             "composition": "StudioCarousel", "about": "La referencia de la marca: números de contorno, etiqueta y tarjeta para copiar.",
             "fits": ["tutorial", "prompting_avanzado", "lista"],
             "schema": '{"slides": [{"kind": "item", "n": 1, "tag": "OUTLOOK", "title": "...", "card_label": "PROMPT · COPIA Y PEGA", "card": "...", "tip": "..."}, '
                       '{"kind": "text", "kicker": "...", "title": "...", "body": "..."}, {"kind": "closing", "kicker": "PARA LLEVAR", "title": "...", "highlight": "...", "text": "..."}]}'},
    "CR02": {"channel": PUBLICACION, "kind": "carrusel", "name": "Explicador", "folder": "Publicaciones/Carruseles/Modelo_02_Explicador",
             "composition": "StudioCarousel", "about": "Plano técnico claro con diagramas: definición, flujo, pasos, antes/después.",
             "fits": ["concepto", "tutorial", "como_funciona"],
             "schema": '{"slides": [{"kind": "definicion", "kicker": "...", "term": "...", "definition": "...", "analogy": "..."}, '
                       '{"kind": "flujo", "title": "...", "nodes": [{"label": "...", "sub": "..."}], "caption": "..."}, '
                       '{"kind": "pasos", "title": "...", "steps": [{"title": "...", "text": "..."}]}, '
                       '{"kind": "ejemplo", "title": "...", "before": {"label": "...", "text": "..."}, "after": {...}}, '
                       '{"kind": "resumen", "title": "...", "points": []}, {"kind": "closing", "title": "...", "highlight": "...", "text": "..."}]}'},
    "CR03": {"channel": PUBLICACION, "kind": "carrusel", "name": "Comparativa", "folder": "Publicaciones/Carruseles/Otros_Modelos/Comparativa",
             "composition": "StudioCarousel", "about": "Dos columnas de color, criterios con marcador, tabla y cuándo elegir cada uno.",
             "fits": ["comparativa"],
             "schema": '{"a": {"name": "...", "tagline": "..."}, "b": {...}, "slides": [{"kind": "duelo", "title": "..."}, '
                       '{"kind": "criterio", "criterion": "...", "a": "...", "b": "...", "a_score": 0-10, "b_score": 0-10, "verdict": "..."}, '
                       '{"kind": "tabla", "title": "...", "rows": [{"criterion": "...", "a": "✓|–|texto", "b": "..."}]}, '
                       '{"kind": "eleccion", "title": "...", "a_if": [], "b_if": []}, {"kind": "closing", ...}]}'},
    "CR04": {"channel": PUBLICACION, "kind": "carrusel", "name": "Análisis", "folder": "Publicaciones/Carruseles/Otros_Modelos/Analisis",
             "composition": "StudioCarousel", "about": "Revista: papel, serifa, capitular, cifras y cita. Noticias importantes con contexto.",
             "fits": ["noticia_importante", "analisis", "tendencia"],
             "schema": '{"slides": [{"kind": "lead", "kicker": "QUÉ HA PASADO", "title": "...", "text": "..."}, '
                       '{"kind": "cifras", "title": "...", "stats": [{"value": "...", "label": "..."}]}, {"kind": "cita", "quote": "...", "author": "..."}, '
                       '{"kind": "claves", "title": "...", "points": []}, {"kind": "accion", "title": "...", "steps": []}, {"kind": "closing", "title": "...", "text": "..."}]}'},
}

# Familias de portada del feed (mismo lenguaje, color propio). Ver video/src/studio/kit.tsx → FAMILIES.
FAMILIES = ["noticia", "tutorial", "comparativa", "analisis", "prompting", "curiosidad"]

# Categorías temáticas y el peso que se busca en el conjunto (la variedad se mide contra esto).
CATEGORIES = {
    "ia_generativa": 0.18, "microsoft_365": 0.16, "productividad": 0.12, "ciberseguridad": 0.12,
    "programacion": 0.1, "automatizacion": 0.08, "software_herramientas": 0.08, "hardware_innovacion": 0.06,
    "empresa_tecnologia": 0.05, "curiosidades_historia": 0.05,
}


def models_for(channel: str, kind: str | None = None) -> list[str]:
    return [k for k, m in MODELS.items() if m["channel"] == channel and (kind is None or m["kind"] == kind)]
