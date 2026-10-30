"""Correo: envío del vídeo para revisión y lectura de las respuestas de la directora."""
from __future__ import annotations

import email
import html
import imaplib
import re
import smtplib
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import make_msgid, parseaddr
from pathlib import Path
from urllib.parse import quote

from .common import env, log

APPROVE, CHANGE, NEXT = "APROBAR", "CAMBIAR", "MAÑANA"
STORIES, NO_STORIES = "HISTORIAS", "SIN HISTORIAS"  # ojo: SIN HISTORIAS se comprueba antes que HISTORIAS
STORIES_PROMPT = ("Cuéntame de qué quieres las historias. Puedes adjuntar documentos, PDFs, presentaciones, fotos "
                  "o pegar enlaces y mensajes: se usarán como fuente:")
CHANGE_PROMPT = "Escribe aquí qué vídeo quieres (tema, tono, estilo...). Puedes adjuntar archivos o pegar enlaces:"
NEXT_PROMPT = ("Describe el vídeo que quieres para mañana. Puedes adjuntar documentos, PDFs, presentaciones, "
               "fotos o pegar enlaces: se usarán como fuente:")


def _bot() -> str:
    return env("MAIL_USER", required=True)


def bosses() -> list[str]:
    return [b.strip().lower() for b in env("BOSS_EMAIL", required=True).split(",") if b.strip()]


def send(subject: str, html_body: str, text_body: str, attachments: list[Path] = (),
         inline: dict[str, Path] | None = None) -> None:
    """`inline` = imágenes dentro del correo: {"thumb": ruta} se muestra donde el HTML pone cid:thumb."""
    msg = EmailMessage()
    msg["From"] = f"Reels TechBridge <{_bot()}>"
    msg["To"] = ", ".join(bosses())
    msg["Subject"] = subject
    msg.set_content(text_body)
    images = {name: p for name, p in (inline or {}).items() if p and p.exists()}
    cids = {name: make_msgid() for name in images}
    for name, cid in cids.items():
        html_body = html_body.replace(f"cid:{name}", f"cid:{cid[1:-1]}")
    msg.add_alternative(html_body, subtype="html")
    for name, p in images.items():
        msg.get_payload()[1].add_related(p.read_bytes(), "image", "jpeg", cid=cids[name])
    for a in attachments:
        if a.exists():
            msg.add_attachment(a.read_bytes(), maintype="video", subtype="mp4", filename=a.name)
    with smtplib.SMTP_SSL(env("MAIL_SMTP_HOST", "smtp.gmail.com"), int(env("MAIL_SMTP_PORT", "465"))) as s:
        s.login(_bot(), env("MAIL_APP_PASSWORD", required=True))
        s.send_message(msg)
    log.info("Correo enviado: %s", subject)


def _mailto(subject: str, body: str = "") -> str:
    return f"mailto:{_bot()}?subject={quote(subject)}&body={quote(body)}"


def review_email(item: dict, meta: dict, video_link: str, publish_note: str, regen_note: str,
                 asked: str = "", files: list[str] = (), next_note: str = "",
                 has_cover: bool = False, stories: list[dict] = ()) -> tuple[str, str, str]:
    """Devuelve (asunto, html, texto) del correo de revisión."""
    tag = f"[REEL {item['id']}]"
    approve = _mailto(f"{tag} {APPROVE}", "Publícalo.")
    change = _mailto(f"{tag} {CHANGE}", f"{CHANGE_PROMPT}\n\n")
    tomorrow = _mailto(f"{tag} {NEXT}", f"{NEXT_PROMPT}\n\n")
    stories_html = stories_block(stories, tag)
    e = html.escape
    regen = item.get("attempt", 1) > 1
    version = "Nueva versión según lo que pediste" if regen else "Vídeo de hoy"
    asked_html = ""
    if asked or files:
        label = "Pediste" if regen else "Lo que pediste para hoy"
        used = (f'<br><span style="font-size:13px">Material usado: {e(", ".join(files))}</span>' if files else "")
        asked_html = (f'<p style="margin:0 0 18px;color:#5b6478;font-size:14px;background:#f5f7fb;border-left:4px solid #22D3EE;'
                      f'padding:10px 14px;border-radius:6px">{label}: <i>“{e(asked or "(solo material adjunto)")}”</i>{used}</p>')
    next_html = (f'<p style="margin:10px 0 0;font-size:13px;color:#16a34a"><b>Ya tienes pedido el vídeo de mañana:</b> '
                 f'<i>“{e(next_note)}”</i>. Si mandas otra petición, se suma a esta.</p>' if next_note else "")
    source = (f'<p style="margin:14px 0 0;font-size:13px;color:#5b6478">Fuente: '
              f'<a href="{e(meta["source_url"])}" style="color:#2563eb">{e(meta.get("source_name") or meta["source_url"])}</a></p>'
              if meta.get("source_url") else "")
    caption = e(meta["caption"]).replace("\n", "<br>")
    cover_html = ('<div style="font-size:13px;letter-spacing:2px;color:#5b6478;font-weight:700;margin-bottom:8px">PORTADA</div>'
                  '<img src="cid:cover" width="220" style="width:220px;max-width:60%;border-radius:12px;display:block;'
                  'margin-bottom:22px" alt="Portada del vídeo">' if has_cover else "")
    btn = ("display:inline-block;padding:16px 26px;border-radius:12px;font-weight:700;font-size:16px;"
           "text-decoration:none;margin:6px 6px 6px 0;")

    html_body = f"""<!doctype html><html><body style="margin:0;background:#eef1f7;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#070B18;padding:26px 30px;color:#fff">
  <div style="font-size:12px;letter-spacing:3px;color:#22D3EE;font-weight:700">{e(meta.get("format_label", ""))}</div>
  <div style="font-size:24px;font-weight:700;margin-top:6px">{version}</div>
  <div style="font-size:15px;color:#9AA4C7;margin-top:4px">{e(meta.get("topic") or "")}</div>
</td></tr>
<tr><td style="padding:26px 30px 6px">
  {asked_html}
  <a href="{e(video_link)}"><img src="cid:thumb" width="540" style="width:100%;max-width:540px;border-radius:12px;display:block" alt="Vista previa del vídeo"></a>
  <p style="margin:12px 0 0;font-size:14px;color:#5b6478">▶ El vídeo va adjunto. También puedes <a href="{e(video_link)}" style="color:#2563eb">verlo aquí</a>.</p>
</td></tr>
<tr><td style="padding:18px 30px 4px">
  <div style="font-size:17px;font-weight:700;color:#0b1020;margin-bottom:8px">¿Lo publicamos?</div>
  <a href="{approve}" style="{btn}background:#16a34a;color:#ffffff">✅ Sí, publícalo</a>
  <a href="{change}" style="{btn}background:#ffffff;color:#0b1020;border:2px solid #0b1020">✏️ No, quiero otro</a>
  <p style="margin:12px 0 0;font-size:13px;color:#5b6478;line-height:1.5">
    Al pulsar un botón se abre un correo ya preparado: solo tienes que darle a <b>Enviar</b>.<br>
    • <b>Sí:</b> {e(publish_note)}<br>
    • <b>No:</b> escribe en una frase qué quieres y {e(regen_note)}<br>
    • También vale responder a este correo con tus palabras ("vale", "no me gusta, haz uno sobre…").<br>
    • Si no respondes, no se publica nada.
  </p>
</td></tr>
<tr><td style="padding:18px 30px 4px">
  <div style="border-top:1px solid #e5e8ef;padding-top:20px">
  <div style="font-size:17px;font-weight:700;color:#0b1020;margin-bottom:6px">📌 ¿Quieres un vídeo concreto para mañana?</div>
  <p style="margin:0 0 10px;font-size:14px;color:#5b6478;line-height:1.5">
    Cuéntalo en una frase y, si quieres, <b>adjunta archivos</b> (PDF, Word, PowerPoint, Excel, fotos) o pega enlaces.
    Se usarán como fuente y mañana a las 10:00 te llega el vídeo sobre eso.</p>
  <a href="{tomorrow}" style="{btn}background:#0b1020;color:#ffffff">📌 Pedir el vídeo de mañana</a>
  {next_html}
  </div>
</td></tr>
{stories_html}
<tr><td style="padding:22px 30px 28px">
  {cover_html}
  <div style="font-size:13px;letter-spacing:2px;color:#5b6478;font-weight:700;margin-bottom:8px">TEXTO QUE SE PUBLICARÁ</div>
  <div style="background:#f5f7fb;border-radius:12px;padding:16px 18px;font-size:14px;line-height:1.55;color:#1f2937">{caption}</div>
  {source}
</td></tr>
</table></td></tr></table></body></html>"""

    text_body = (f"{version}: {meta.get('topic')}\n\nVer el vídeo: {video_link}\n\n"
                 f"Para publicarlo, responde con: {APPROVE}\n"
                 f"Para pedir otro, responde con: {CHANGE} y describe qué quieres.\n"
                 f"Para pedir el vídeo de mañana, escribe con el asunto: {NEXT} (puedes adjuntar archivos).\n\n"
                 f"Texto que se publicará:\n{meta['caption']}")
    return f"{tag} {version}: {meta.get('topic')}", html_body, text_body


def _story_status(card: dict) -> str:
    return {"scheduled": f"a las {card['at']}", "published": "publicada", "published_test": "hecha (Instagram apagado)",
            "missed": "no salió", "cancelled": "cancelada"}.get(card.get("status", ""), card.get("at", ""))


def story_grid(cards: list[dict]) -> str:
    e = html.escape
    cells = []
    for c in cards[:6]:
        link = (f'<div style="font-size:12px;margin-top:4px"><a href="{e(c["source_url"])}" style="color:#2563eb">'
                f'🔗 Noticia original</a></div>' if c.get("source_url") else "")
        cells.append(
            f'<td width="33%" valign="top" style="padding:4px 6px 4px 0">'
            f'<img src="cid:{c["cid"]}" width="160" style="width:100%;max-width:160px;border-radius:10px;display:block" alt="Historia">'
            f'<div style="font-size:12px;font-weight:700;color:#2563eb;margin-top:6px">{e(c["label"])} · {e(_story_status(c))}</div>'
            f'<div style="font-size:13px;color:#1f2937;line-height:1.35">{e(c["title"])}</div>{link}</td>')
    note = ('<p style="margin:10px 0 0;font-size:12px;color:#5b6478;line-height:1.5">🔗 Si la publicas a mano, añade el '
            'enlace de la noticia con el sticker de enlace de Instagram.</p>' if any(c.get("source_url") for c in cards) else "")
    return f'<table cellpadding="0" cellspacing="0" width="100%"><tr>{"".join(cells)}</tr></table>{note}'


def stories_block(cards: list[dict], tag: str) -> str:
    btn = ("display:inline-block;padding:14px 22px;border-radius:12px;font-weight:700;font-size:15px;"
           "text-decoration:none;margin:10px 6px 4px 0;")
    ask = _mailto(f"{tag} {STORIES}", f"{STORIES_PROMPT}\n\n")
    stop = _mailto(f"{tag} {NO_STORIES}", "No publiques más historias hoy.")
    intro = ("Se publican solas a estas horas. Si alguna no te convence, puedes cancelar las que quedan."
             if cards else "Hoy no hay historias programadas.")
    return f"""<tr><td style="padding:18px 30px 4px">
  <div style="border-top:1px solid #e5e8ef;padding-top:20px">
  <div style="font-size:17px;font-weight:700;color:#0b1020;margin-bottom:6px">📲 Historias de hoy</div>
  <p style="margin:0 0 10px;font-size:14px;color:#5b6478;line-height:1.5">{intro}</p>
  {story_grid(cards) if cards else ""}
  <a href="{ask}" style="{btn}background:#0b1020;color:#ffffff">📲 Historias con esto</a>
  <a href="{stop}" style="{btn}background:#ffffff;color:#0b1020;border:2px solid #0b1020">🚫 Sin historias hoy</a>
  <p style="margin:8px 0 0;font-size:13px;color:#5b6478;line-height:1.5">
    Con <b>“Historias con esto”</b> cuentas en una frase de qué las quieres y, si quieres, adjuntas documentos
    o pegas enlaces y mensajes. Te llegan listas con la hora a la que sale cada una.</p>
  </div>
</td></tr>"""


def stories_email(cards: list[dict], origin: str, day: str) -> tuple[str, str, str]:
    """Aviso de historias nuevas (pedidas por la directora o de última hora) con sus miniaturas y horas."""
    title = "📰 Historia de última hora" if origin == "news" else "📲 Tus historias están listas"
    lead = ("Ha salido algo importante sobre los productos y he preparado una historia para esta tarde."
            if origin == "news" else "Aquí tienes las historias que pediste.")
    stop = _mailto(NO_STORIES, "No publiques más historias hoy.")
    body = f"""<!doctype html><html><body style="margin:0;background:#eef1f7;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#070B18;padding:24px 30px;color:#fff;font-size:22px;font-weight:700">{title}</td></tr>
<tr><td style="padding:22px 30px 28px">
  <p style="margin:0 0 14px;font-size:15px;color:#1f2937;line-height:1.5">{lead} Se publican solas a la hora indicada{' (' + day + ')' if day else ''}.</p>
  {story_grid(cards)}
  <p style="margin:16px 0 0;font-size:13px;color:#5b6478">Si no quieres que salgan, <a href="{stop}" style="color:#2563eb">cancela las historias de hoy</a>.</p>
</td></tr></table></td></tr></table></body></html>"""
    text = f"{title}\n\n" + "\n".join(f"- {c['label']} · {_story_status(c)}: {c['title']}" for c in cards)
    return title, body, text


def simple_html(title: str, body: str) -> str:
    return (f'<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;font-size:15px;'
            f'line-height:1.55;color:#1f2937"><h2 style="color:#0b1020;font-size:20px">{html.escape(title)}</h2>'
            f'<p>{body}</p></div>')


def notify(subject: str, body_html: str) -> None:
    send(subject, simple_html(subject, body_html), re.sub(r"<[^>]+>", "", body_html))


# ───────────────────────── Lectura de respuestas ─────────────────────────

def _decode(value: str | None) -> str:
    return str(make_header(decode_header(value or "")))


def _plain_body(msg) -> str:
    part = None
    if msg.is_multipart():
        for p in msg.walk():
            if p.get_content_type() == "text/plain" and "attachment" not in str(p.get("Content-Disposition", "")):
                part = p
                break
        if part is None:
            for p in msg.walk():
                if p.get_content_type() == "text/html":
                    part = p
                    break
    else:
        part = msg
    if part is None:
        return ""
    raw = part.get_payload(decode=True) or b""
    text = raw.decode(part.get_content_charset() or "utf-8", errors="replace")
    if part.get_content_type() == "text/html":
        text = re.sub(r"(?s)<(style|script).*?</\1>", " ", text)
        text = html.unescape(re.sub(r"<br\s*/?>|</p>|</div>", "\n", text))
        text = re.sub(r"<[^>]+>", "", text)
    return clean_reply(text)


def _attachment_names(msg) -> list[str]:
    return [_decode(p.get_filename()) for p in msg.walk() if p.get_filename()]


def clean_reply(text: str) -> str:
    """Quita la parte citada del correo original y la línea de instrucciones."""
    lines = []
    for line in text.splitlines():
        if line.strip().startswith(">"):
            continue
        if re.match(r"^\s*(El .+ escribió:|On .+ wrote:|-----Original Message-----|De: |From: |Enviado desde)", line):
            break
        lines.append(line)
    out = "\n".join(lines).replace(CHANGE_PROMPT, "").replace(NEXT_PROMPT, "")
    return re.sub(r"\n{3,}", "\n\n", out).strip()


def fetch_replies() -> list[dict]:
    """Respuestas no leídas de la directora: [{subject, body, from}]."""
    replies = []
    box = imaplib.IMAP4_SSL(env("MAIL_IMAP_HOST", "imap.gmail.com"))
    try:
        box.login(_bot(), env("MAIL_APP_PASSWORD", required=True))
        box.select("INBOX")
        _, data = box.search(None, "UNSEEN")
        for num in data[0].split():
            _, msg_data = box.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            sender = parseaddr(msg.get("From"))[1].lower()
            subject = _decode(msg.get("Subject"))
            box.store(num, "+FLAGS", "\\Seen")
            if sender not in bosses():
                log.info("Ignoro correo de %s", sender)
                continue
            replies.append({"subject": subject, "body": _plain_body(msg), "from": sender,
                            "message_id": msg.get("Message-ID", "").strip(), "files": _attachment_names(msg)})
    finally:
        try:
            box.logout()
        except Exception:
            pass
    return replies


def fetch_message(message_id: str, dest: Path) -> tuple[str, list[Path]]:
    """Vuelve a leer un correo por su Message-ID y guarda sus adjuntos en `dest`.
    Los archivos nunca se suben al repositorio: viven en el correo y se leen solo al generar."""
    dest.mkdir(parents=True, exist_ok=True)
    box = imaplib.IMAP4_SSL(env("MAIL_IMAP_HOST", "imap.gmail.com"))
    try:
        box.login(_bot(), env("MAIL_APP_PASSWORD", required=True))
        folders = ["INBOX"]
        _, listing = box.list()
        for line in listing or []:  # carpeta "Todos" de Gmail (por si lo han archivado)
            text = line.decode(errors="replace")
            if "\\All" in text:
                folders.append(text.split(' "/" ')[-1])
        for folder in folders:
            box.select(folder, readonly=True)
            _, data = box.search(None, "HEADER", "Message-ID", message_id)
            if data and data[0]:
                _, msg_data = box.fetch(data[0].split()[-1], "(RFC822)")
                msg = email.message_from_bytes(msg_data[0][1])
                files = []
                for part in msg.walk():
                    name = part.get_filename()
                    if not name:
                        continue
                    safe = re.sub(r"[^\w.\- ]", "_", _decode(name))[:120]
                    path = dest / safe
                    path.write_bytes(part.get_payload(decode=True) or b"")
                    files.append(path)
                return _plain_body(msg), files
    finally:
        try:
            box.logout()
        except Exception:
            pass
    log.warning("No encuentro el correo %s", message_id)
    return "", []
