"""Guionista: elige el tema y escribe el storyboard del vídeo con Claude."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from .common import claude_allowed, env, log

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


class ClaudeQuietHours(RuntimeError):
    """Se intentó usar Claude dentro de la franja protegida del usuario."""


def claude(system: str, user: str, images: list[dict] | None = None, fast: bool = False) -> str:
    """Hace una pregunta a Claude (sin herramientas) y devuelve el texto de la respuesta.
    fast=True usa un modelo más ligero para tareas pequeñas (elegir noticia, clasificar un correo);
    si ese modelo falla, se repite con el principal para no perder el vídeo del día."""
    if fast:
        try:
            return _claude_once(system, user, images, env("CLAUDE_FAST_MODEL", "claude-sonnet-5-5"))
        except ClaudeQuietHours:
            raise
        except RuntimeError as e:
            log.warning("El modelo ligero falló (%s); repito con el principal", str(e)[:200])
    return _claude_once(system, user, images, env("CLAUDE_MODEL", "claude-opus-5-5"))


def _claude_once(system: str, user: str, images: list[dict] | None, model: str) -> str:
    if not claude_allowed():
        raise ClaudeQuietHours("Franja protegida: el agente no usa Claude entre quiet_from y quiet_to (config/brand.yaml)")
    binary = _claude_bin()
    if not binary:
        raise RuntimeError("No encuentro Claude Code: instálalo o pon la ruta del ejecutable en CLAUDE_BIN")
    message = {"type": "user", "message": {"role": "user",
                                           "content": [*(images or []), {"type": "text", "text": user}]}}
    cmd = [binary, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
           "--model", model, "--system-prompt", system,
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


def products_text(cfg: dict) -> str:
    return ", ".join(p["name"] for p in cfg.get("products", []))


def positioning(cfg: dict) -> str:
    return f"""Productos con los que trabaja la marca (y sobre los que forma a equipos): {products_text(cfg)}.
Todo el contenido gira alrededor de estos productos. El objetivo NO es vender, pero quien lo vea tiene que
pensar "esto mi equipo debería saber usarlo" y quedarse con que esta cuenta sabe de verdad de esto."""


def pick_story(cfg: dict, fmt_key: str, news: list[dict], recent_titles: list[str]) -> dict | None:
    """Elige una noticia que trate directamente de los productos de la marca. None si ninguna sirve."""
    if not news:
        return None
    fmt = cfg["formats"][fmt_key]
    listing = "\n".join(
        f"[{i}] {n['title']} — {n['summary'][:300]} ({n['source']})" for i, n in enumerate(news[:25])
    )
    system = "Eres el editor de una cuenta de Instagram profesional. Respondes solo con JSON."
    user = f"""Empresa: {cfg['brand']['about']}
{positioning(cfg)}
Audiencia: {cfg['audience']}
Formato de hoy: {fmt_key} — {fmt['brief']}
Temas publicados recientemente (no repetir): {recent_titles[-15:]}

Noticias candidatas:
{listing}

Elige SOLO una noticia que trate directamente de alguno de esos productos y que le sirva a alguien que trabaja
con ellos: una función nueva, un cambio que le afecta, una forma nueva de usarlos o un dato real de adopción.
Descarta: noticias corporativas (despidos, resultados, bolsa, demandas, fichajes), política, modelos o
benchmarks para desarrolladores, rondas de inversión y cualquier cosa que no se pueda contar como
"esto cambia cómo trabajas con <producto>".
Si ninguna cumple, responde {{"index": null}}.
Responde: {{"index": <número o null>, "product": "<producto>", "why": "<una frase>"}}"""
    choice = _json(claude(system, user, fast=True))
    idx = choice.get("index")
    if not isinstance(idx, int) or not 0 <= idx < len(news):
        log.info("Ninguna noticia trata de los productos de la marca")
        return None
    log.info("Noticia elegida [%d]: %s — %s", idx, news[idx]["title"], choice.get("why"))
    return news[idx]


STORYBOARD_SPEC = """
Devuelve SOLO un JSON con esta forma:
{
  "topic": "tema en 5-8 palabras",
  "product": "el producto principal del vídeo, escrito exactamente como en la lista de productos",
  "cover": {"title": "título de la portada (ver reglas)", "highlight": "la palabra clave del título"},
  "scenes": [ ... 5 o 6 escenas ... ],
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
- Duración total al leerse: 20-30 segundos (5 o 6 escenas). Mejor corto y completo que largo.
- "broll": 2-4 palabras en inglés, visual y cinematográfico (ej: "city night timelapse", "hands typing laptop dark",
  "office team meeting glass", "data center lights"). Evita caras en primer plano y logotipos.

Reglas para que funcione en Instagram (público de 35 a 60 años que trabaja en empresas):
- El gancho nombra el producto o una situación de oficina reconocible en las primeras palabras
  (ej: "Si usas Excel a diario...", "Tu bandeja de Outlook no tiene por qué..."). Nada de preguntas vagas.
- Promete un beneficio concreto y creíble (tiempo, errores, tranquilidad), sin exageraciones ni sensacionalismo.
- Una sola idea por vídeo. Frases cortas que se lean de un vistazo, como si las leyera alguien con prisa.
- Enseña el "cómo": un paso, un prompt o un antes/después concreto que se pueda probar hoy mismo.
- El cierre ("outro") invita a guardar o compartir el vídeo, nunca a comprar ni a contactar.

Reglas de contenido (MUY IMPORTANTES):
- Los hechos, cifras, fechas y nombres de productos deben salir de la fuente proporcionada o ser conocimiento
  verificable y estable. NUNCA inventes cifras ni novedades. Si no hay un número real, no uses "stat".
- No vendas: no menciones cursos, servicios ni "contáctanos". El valor es el contenido en sí.
- Nada de clichés de IA ("en el mundo actual", "revolucionario", "descubre", "sumérgete", emojis en exceso).
- Habla a alguien que dirige o trabaja en una empresa, con ejemplos concretos de oficina.
- El vídeo trata SIEMPRE de uno de los productos de la lista y de cómo usarlo mejor en el trabajo.

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
    user = f"""{positioning(cfg)}

La directora pide esto para el próximo vídeo:
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
    plan = _json(claude(system, user, fast=True))
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
        "Escribes en español de España, con ritmo, criterio y precisión. Sabes qué hace que un vídeo se guarde "
        "y se comparta. Respondes solo con JSON válido."
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
{positioning(cfg)}
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


# ───────────────────────── Historias de Instagram ─────────────────────────

STORY_KINDS = ("noticia", "truco", "dato", "pregunta", "reel", "ultima_hora")

STORY_SPEC = """
Devuelve SOLO un JSON: {"stories": [ ... ]}
Cada historia:
{"kind": "noticia | truco | dato | pregunta | reel | ultima_hora",
 "product": "producto de la lista, escrito igual",
 "title": "frase principal, máx 8 palabras",
 "highlight": "una palabra del título, escrita igual",
 "body": "el detalle útil en 1-2 frases, máx 24 palabras",
 "cta": "remate corto, máx 6 palabras"}

Reglas:
- Se ven 7-10 segundos en el móvil: el título se entiende solo y el cuerpo añade el dato o el paso concreto.
- Todo trata de los productos de la lista y de cómo usarlos mejor en el trabajo.
- "noticia" y "ultima_hora": solo con una noticia real de las proporcionadas; cuenta qué cambia para quien usa el producto.
- "truco": un truco real y comprobable (atajo, función, prompt corto).
- "dato": un dato real con su fuente en el cuerpo ("según Microsoft..."). Nunca inventes cifras.
- "pregunta": una pregunta fácil de responder por mensaje sobre cómo trabajan (ej: "¿Usas ya Copilot en Teams?").
  El cta invita a responder por mensaje.
- "reel": anuncia el Reel de hoy con curiosidad, sin destriparlo. El cta remite al perfil ("Lo tienes en el perfil").
- No vendas ni menciones cursos o servicios. Nada de clichés de IA ni emojis.
"""


def validate_stories(data: dict, expected: int | None = None) -> list[dict]:
    stories = data.get("stories")
    if not isinstance(stories, list) or not stories:
        raise ValueError("falta la lista 'stories'")
    if expected and len(stories) != expected:
        raise ValueError(f"se pedían {expected} historias y llegaron {len(stories)}")
    for s in stories:
        if s.get("kind") not in STORY_KINDS:
            raise ValueError(f"tipo de historia desconocido: {s.get('kind')}")
        if not s.get("title") or len(str(s["title"]).split()) > 10:
            raise ValueError("cada historia necesita un título de máximo 8 palabras")
        if len(str(s.get("body", "")).split()) > 34:
            raise ValueError("el cuerpo de una historia pasa de 24 palabras")
    return stories


def write_stories(cfg: dict, plan: list[str] | None, news: list[dict], reel_topic: str | None = None,
                  recent_titles: list[str] = (), materials: str = "", images: list[dict] | None = None,
                  feedback: str | None = None) -> list[dict]:
    """plan = tipos de historia en orden (p. ej. ["noticia", "truco", "reel"]). Sin plan (petición con material)
    el guionista decide entre 1 y 3 historias a partir de lo que ha mandado la directora."""
    listing = "\n".join(f"[{i}] {n['title']} — {n['summary'][:300]} ({n['source']}, {n['url']})"
                        for i, n in enumerate(news[:10])) or "(ninguna)"
    if plan:
        ask = (f"Escribe {len(plan)} historias, en este orden de tipos: {', '.join(plan)}. "
               "Si un tipo 'noticia' o 'ultima_hora' no tiene una noticia que encaje de verdad, cámbialo por 'dato' o 'truco'.")
    else:
        ask = ("Escribe entre 1 y 3 historias a partir del material y la petición de la directora "
               "(tipos: truco, dato, pregunta, o noticia si el material es una novedad).")
    mat = f"\nMATERIAL APORTADO POR LA DIRECTORA (fuente principal):\n{materials[:6000]}\n" if materials else ""
    user = f"""Marca: {cfg['brand']['name']} — {cfg['brand']['about']}
{positioning(cfg)}
Audiencia: {cfg['audience']}
Tono: {cfg['tone']}
Reel de hoy: {reel_topic or '(no hay)'}
Temas recientes (no repetir): {list(recent_titles)[-15:]}

Noticias reales disponibles:
{listing}
{mat}{feedback_block(feedback)}
{ask}
{STORY_SPEC}"""
    system = ("Eres el editor de historias de Instagram de una marca profesional. Escribes en español de España, "
              "frases cortas y útiles. Respondes solo con JSON válido.")
    last_error = None
    for attempt in range(3):
        prompt = user if not last_error else f"{user}\n\nTu respuesta anterior falló la validación: {last_error}. Corrígelo."
        try:
            return validate_stories(_json(claude(system, prompt, images=images)), len(plan) if plan else None)
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            last_error = str(e)
            log.warning("Historias inválidas (intento %d): %s", attempt + 1, e)
    raise RuntimeError(f"No se pudieron escribir las historias: {last_error}")
