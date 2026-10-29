"""Guionista: elige el tema y escribe el storyboard del vídeo con Claude."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from .common import env, log

SCENE_TYPES = {"hook", "stat", "broll", "list", "compare", "quote", "prompt", "outro"}

# Claude se usa a través de Claude Code con tu suscripción (Pro o Max), no con la API de pago.
# En GitHub Actions se autentica con CLAUDE_CODE_OAUTH_TOKEN, que sale de `claude setup-token`.
# En local usa la sesión que ya tengas iniciada en Claude Code.
LOCAL_BIN = Path.home() / ".local" / "bin" / ("claude.exe" if os.name == "nt" else "claude")


def _claude_bin(install: bool = True) -> str | None:
    found = env("CLAUDE_BIN") or shutil.which("claude")
    if found:
        return found
    if LOCAL_BIN.exists():
        return str(LOCAL_BIN)
    if install and env("GITHUB_ACTIONS"):
        log.info("Instalando Claude Code...")
        subprocess.run("curl -fsSL https://claude.ai/install.sh | bash", shell=True, check=True)
        if LOCAL_BIN.exists():
            return str(LOCAL_BIN)
    return None


def claude_ready() -> bool:
    """Hay forma de llamar a Claude: token de la suscripción (CI) o Claude Code instalado (local)."""
    return bool(env("CLAUDE_CODE_OAUTH_TOKEN") or _claude_bin(install=False))


def _claude_env() -> dict:
    """Entorno para Claude Code sin claves de API, para que nunca cobre nada aparte de la suscripción,
    y sin las variables de la sesión de Claude Code que pueda haberlo lanzado."""
    return {k: v for k, v in os.environ.items()
            if k not in {"ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"}
            and (not k.startswith("CLAUDE") or k == "CLAUDE_CODE_OAUTH_TOKEN")}


def claude(system: str, user: str, images: list[dict] | None = None) -> str:
    """Hace una pregunta a Claude (sin herramientas) y devuelve el texto de la respuesta."""
    binary = _claude_bin()
    if not binary:
        raise RuntimeError("No encuentro Claude Code: instálalo o pon la ruta del ejecutable en CLAUDE_BIN")
    message = {"type": "user", "message": {"role": "user",
                                           "content": [*(images or []), {"type": "text", "text": user}]}}
    cmd = [binary, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
           "--model", env("CLAUDE_MODEL", "claude-opus-5-5"), "--system-prompt", system,
           "--tools", "", "--strict-mcp-config", "--no-session-persistence"]
    with tempfile.TemporaryDirectory() as cwd:  # carpeta vacía para que no lea nada del proyecto
        p = subprocess.run(cmd, input=json.dumps(message, ensure_ascii=False) + "\n", capture_output=True,
                           text=True, encoding="utf-8", cwd=cwd, env=_claude_env(), timeout=900)
    result = None
    for line in p.stdout.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "result":
            result = event
    if not result or result.get("is_error") or result.get("subtype") != "success":
        detail = (result or {}).get("result") or p.stderr.strip() or p.stdout.strip()
        raise RuntimeError(f"Claude Code falló (código {p.returncode}): {str(detail)[:500]}")
    return result.get("result") or ""


def _json(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("La respuesta no contiene JSON")
    return json.loads(m.group(0))


def pick_story(cfg: dict, fmt_key: str, news: list[dict], recent_titles: list[str]) -> dict:
    """Elige la noticia que mejor encaja con la marca y el formato del día."""
    fmt = cfg["formats"][fmt_key]
    listing = "\n".join(
        f"[{i}] {n['title']} — {n['summary'][:300]} ({n['source']})" for i, n in enumerate(news[:25])
    )
    system = "Eres el editor de una cuenta de Instagram profesional. Respondes solo con JSON."
    user = f"""Empresa: {cfg['brand']['about']}
Audiencia: {cfg['audience']}
Formato de hoy: {fmt_key} — {fmt['brief']}
Temas publicados recientemente (no repetir): {recent_titles[-15:]}

Noticias candidatas:
{listing}

Elige la noticia con más potencial para enganchar a esta audiencia y que tenga relación con IA,
productividad, Microsoft 365, herramientas de trabajo o transformación de empresas.
Evita noticias demasiado técnicas, de nicho para desarrolladores o polémicas políticas.
Responde: {{"index": <número>, "why": "<una frase>"}}"""
    choice = _json(claude(system, user))
    idx = int(choice["index"])
    log.info("Noticia elegida [%d]: %s — %s", idx, news[idx]["title"], choice.get("why"))
    return news[idx]


STORYBOARD_SPEC = """
Devuelve SOLO un JSON con esta forma:
{
  "topic": "tema en 5-8 palabras",
  "cover": {"title": "título de la portada (ver reglas)", "highlight": "la palabra clave del título"},
  "scenes": [ ... 5 a 7 escenas ... ],
  "caption": "descripción del post (ver reglas)",
  "hashtags": ["#...", "#...", "#...", "#..."]   // exactamente 4 (ver reglas)
}

Tipos de escena disponibles (usa los campos exactos):
- {"type":"hook","text":"frase gancho (máx 9 palabras)","highlight":"palabra clave del texto","broll":"búsqueda en inglés para vídeo de stock"}
- {"type":"stat","value":<número>,"prefix":"","suffix":"%","label":"qué significa el número (máx 10 palabras)","broll":"..."}
- {"type":"broll","title":"idea principal (máx 8 palabras)","subtitle":"matiz (máx 12 palabras)","broll":"..."}
- {"type":"list","title":"título corto","items":["punto 1","punto 2","punto 3"]}   // 3 puntos, máx 6 palabras cada uno
- {"type":"compare","left_title":"Antes","left":"máx 10 palabras","right_title":"Ahora","right":"máx 10 palabras"}
- {"type":"quote","text":"idea potente o frase (máx 16 palabras)","source":"quién/de dónde"}
- {"type":"prompt","app":"Copilot | ChatGPT | Asistente IA","prompt":"el prompt (máx 30 palabras)","result":["línea de respuesta 1","línea 2","línea 3"]}
- {"type":"outro","text":"cierre corto que invite a pensar o a guardar el vídeo (máx 8 palabras)"}

Cada escena lleva además "voice": la frase que se locutaría en esa escena (natural, hablada, máx 22 palabras).
Escribe "voice" siempre, aunque el vídeo luego vaya solo con música.

Reglas de estructura:
- Escena 1 SIEMPRE "hook": tiene que parar el scroll en 1 segundo (curiosidad, contraste o consecuencia).
- Última escena SIEMPRE "outro".
- Alterna tipos para que el ritmo visual cambie; no repitas el mismo tipo dos veces seguidas.
- Duración total al leerse: 25-40 segundos.
- "broll": 2-4 palabras en inglés, visual y cinematográfico (ej: "city night timelapse", "hands typing laptop dark",
  "office team meeting glass", "data center lights"). Evita caras en primer plano y logotipos.

Reglas de contenido (MUY IMPORTANTES):
- Los hechos, cifras, fechas y nombres de productos deben salir de la fuente proporcionada o ser conocimiento
  verificable y estable. NUNCA inventes cifras ni novedades. Si no hay un número real, no uses "stat".
- No vendas: no menciones cursos, servicios ni "contáctanos". El valor es el contenido en sí.
- Nada de clichés de IA ("en el mundo actual", "revolucionario", "descubre", "sumérgete", emojis en exceso).
- Habla a alguien que dirige o trabaja en una empresa, con ejemplos concretos de oficina.

Reglas de la portada ("cover"):
- Es lo que se ve en la cuadrícula del perfil: tiene que entenderse sin ver el vídeo y dar ganas de abrirlo.
- "title": 3-6 palabras, concreto, con un beneficio o una curiosidad (ej: "Copilot resume tus reuniones",
  "Excel ya escribe fórmulas solo"). Sin punto final, sin comillas y sin emojis. Distinto del gancho del vídeo.
- "highlight": la palabra más importante del título, escrita exactamente igual que en el título.

Reglas del caption (la descripción del post):
- Primera línea: gancho de máximo 120 caracteres, distinto del gancho del vídeo. Es lo único que se ve antes
  de "más", así que tiene que dar un motivo para seguir leyendo.
- Usa con naturalidad las palabras que alguien escribiría en el buscador de Instagram para este tema
  (ej: "Copilot en Outlook", "resumir reuniones con IA"): Instagram también busca por el texto.
- Después, 2-4 párrafos cortos (1-3 frases) separados por una línea en blanco: qué es, por qué le importa
  a quien trabaja en una empresa y una idea práctica que se pueda aplicar hoy.
- Si es un truco o un prompt, incluye los pasos numerados o el prompt completo para copiarlo.
- Una línea que invite a guardar el vídeo o a compartirlo con alguien concreto
  (ej: "Guárdalo para tu próxima reunión", "Compártelo con quien vive en la bandeja de entrada").
- Termina con una pregunta concreta y fácil de responder.
- Si hay noticia, añade al final "Fuente: <medio>".
- Entre 400 y 1.200 caracteres. Máximo 2 emojis. Ningún hashtag dentro del texto.
- No escribas firma ni hashtags de marca: se añaden solos al final.

Reglas de los hashtags:
- Exactamente 4, específicos del tema, en español salvo nombres de producto (ej: "#Copilot", "#Excel",
  "#productividad", "#reuniones"). Nada genérico como "#viral" o "#love".
"""


def plan_from_feedback(cfg: dict, feedback: str, news: list[dict], materials: str = "") -> tuple[str, dict | None]:
    """Traduce lo que pide la directora a un formato y, si hace falta, a una noticia real."""
    formats = "\n".join(f"- {k}: {v['brief']}" for k, v in cfg["formats"].items())
    listing = "\n".join(f"[{i}] {n['title']} ({n['source']})" for i, n in enumerate(news[:25])) or "(ninguna)"
    system = "Eres el editor de una cuenta de Instagram profesional. Respondes solo con JSON."
    mat = f"\n\nAdemás ha aportado este material (será la fuente principal):\n{materials[:3000]}" if materials else ""
    user = f"""La directora pide esto para el próximo vídeo:
\"\"\"{feedback or ('(sin indicaciones: haz el vídeo a partir del material)' if materials else '(no ha dado detalles: haz algo claramente distinto al anterior)')}\"\"\"

{mat}

Formatos disponibles:
{formats}

Noticias reales disponibles:
{listing}

Elige el formato que mejor encaje con lo que pide. Si ha aportado material, ese material cuenta como fuente
(cualquier formato vale y news_index debe ser null salvo que pida combinarlo con una noticia).
Si no hay material y pide una novedad o tema de actualidad, indica la noticia que encaje; si no encaja
ninguna, usa un formato que no necesite noticia.
Responde: {{"format": "<clave>", "news_index": <número o null>}}"""
    plan = _json(claude(system, user))
    fmt = plan.get("format") if plan.get("format") in cfg["formats"] else "truco"
    idx = plan.get("news_index")
    story = news[int(idx)] if isinstance(idx, int) and 0 <= idx < len(news) else None
    if cfg["formats"][fmt]["needs_news"] and not story and not materials:
        fmt = "truco"
    return fmt, story


def write_storyboard(cfg: dict, fmt_key: str, story: dict | None, article: str, recent_titles: list[str],
                     feedback: str | None = None, materials: str = "", images: list[dict] | None = None) -> dict:
    fmt = cfg["formats"][fmt_key]
    system = (
        "Eres guionista y director creativo de vídeos cortos verticales para una marca profesional. "
        "Escribes en español de España, con ritmo, criterio y precisión. Respondes solo con JSON válido."
    )
    if story:
        source = f"""FUENTE (base de todos los hechos):
Titular: {story['title']}
Medio: {story['source']}
URL: {story['url']}
Resumen: {story['summary']}
Texto: {article or '(no disponible; usa solo titular y resumen)'}"""
    else:
        source = ""
    if materials or images:
        source = f"""MATERIAL APORTADO POR LA DIRECTORA (fuente principal: los hechos, cifras y nombres salen de aquí;
si hay imágenes, se te muestran adjuntas y puedes describir lo que se ve en ellas):
{materials or '(solo imágenes)'}

{source}"""
    elif not story:
        source = ("Este formato no depende de una noticia. Usa solo funciones y prácticas reales y "
                  "estables de las herramientas; si dudas de que algo exista, no lo menciones.")
    user = f"""Marca: {cfg['brand']['name']} — {cfg['brand']['about']}
Audiencia: {cfg['audience']}
Tono: {cfg['tone']}
Formato: {fmt_key} ("{fmt['label']}") — {fmt['brief']}
Temas recientes (no repetir): {recent_titles[-15:]}

{source}
{feedback_block(feedback)}
{STORYBOARD_SPEC}"""

    last_error = None
    for attempt in range(3):
        prompt = user if not last_error else f"{user}\n\nTu respuesta anterior falló la validación: {last_error}. Corrígelo."
        try:
            sb = _json(claude(system, prompt, images=images))
            validate(sb)
            return sb
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            last_error = str(e)
            log.warning("Storyboard inválido (intento %d): %s", attempt + 1, e)
    raise RuntimeError(f"No se pudo generar un storyboard válido: {last_error}")


def feedback_block(feedback: str | None) -> str:
    if feedback is None:
        return ""
    return f"""
PETICIÓN DE LA DIRECTORA (prioridad máxima; síguela al pie de la letra salvo que obligue a inventar hechos):
\"\"\"{feedback or 'No le convenció el anterior. Haz algo claramente distinto en tema y enfoque.'}\"\"\"
"""


def validate(sb: dict) -> None:
    scenes = sb["scenes"]
    if not 4 <= len(scenes) <= 8:
        raise ValueError(f"número de escenas fuera de rango: {len(scenes)}")
    if scenes[0]["type"] != "hook" or scenes[-1]["type"] != "outro":
        raise ValueError("la primera escena debe ser hook y la última outro")
    for s in scenes:
        if s.get("type") not in SCENE_TYPES:
            raise ValueError(f"tipo de escena desconocido: {s.get('type')}")
        if not s.get("voice"):
            raise ValueError(f"escena {s['type']} sin 'voice'")
        if s["type"] == "stat":
            float(s["value"])
        if s["type"] == "list" and len(s.get("items", [])) < 2:
            raise ValueError("list necesita al menos 2 items")
        if s["type"] == "prompt" and not s.get("result"):
            raise ValueError("prompt necesita 'result'")
    if not sb.get("caption"):
        raise ValueError("falta caption")
    caption = sb["caption"].strip()
    if len(caption.splitlines()[0]) > 150:
        raise ValueError("la primera línea del caption pasa de 120 caracteres")
    if len(caption) > 1600:
        raise ValueError(f"el caption tiene {len(caption)} caracteres; el máximo es 1.200")
    if re.search(r"(^|\s)#\w", caption):
        raise ValueError("el caption no puede llevar hashtags dentro del texto")
    cover = sb.get("cover")
    if cover is not None:
        words = len(str(cover.get("title") or "").split())
        if not 2 <= words <= 8:
            raise ValueError(f"cover.title tiene {words} palabras; deben ser 3-6")
