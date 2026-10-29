"""Flujo diario con aprobación por email.

  02:00  se genera el vídeo del día (si la directora pidió uno concreto, se hace sobre eso)
  10:00  se le envía por email con botones "Sí, publícalo" / "No, quiero otro" / "Pedir el vídeo de mañana"
  ---    si aprueba → se publica a la hora `publish_after` (o al momento si ya ha pasado)
  ---    si pide otro → a las 17:00 se genera uno nuevo con sus indicaciones y se le envía otra vez
  ---    en cualquier momento puede pedir el vídeo de mañana, con archivos o enlaces como fuente

Lo que escribe la directora se guarda cifrado (el repo es público) y sus archivos nunca se suben:
se quedan en el correo y se descargan solo en el momento de generar.

  python -m agent.scheduler tick [--force generate|regenerate|email|publish]
  python -m agent.scheduler generate --mode generate|regenerate
  python -m agent.scheduler publish --video-url URL [--cover-url URL]

Mientras la variable INSTAGRAM_PUBLISH no valga "true", nada se sube a Instagram: al aprobar un vídeo
se da por terminado y llega un correo con el vídeo, la portada y el texto para publicarlo a mano.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from . import instagram, mailer, materials
from .common import OUT_DIR, ROOT, env, load_config, log, media_duration, seal, unseal

STATE_PATH = ROOT / "data" / "state.json"
META_KEYS = ("date", "format", "format_label", "topic", "source_url", "source_name", "caption", "cover_title", "stock_ids", "voice")


# ───────────────────────── Estado ─────────────────────────

def load_state() -> dict:
    return json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else {}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def instagram_on() -> bool:
    return (env("INSTAGRAM_PUBLISH") or "").strip().lower() in {"1", "true", "si", "sí", "yes"}


def private(item: dict | None) -> dict:
    return (unseal(item.get("private")) if item else None) or {}


def next_requests(state: dict) -> list[dict]:
    return unseal(state.get("next")) or []


def now_local(cfg: dict) -> datetime:
    override = os.environ.get("FAKE_NOW")  # solo para pruebas: "2026-10-30T10:05"
    tz = ZoneInfo(cfg["review"]["timezone"])
    return datetime.fromisoformat(override).replace(tzinfo=tz) if override else datetime.now(tz)


def at_hour(day: datetime, hour: int) -> datetime:
    return day.replace(hour=hour, minute=0, second=0, microsecond=0)


def publish_time(cfg: dict, day: datetime) -> datetime:
    h, m = map(int, str(cfg["review"]["publish_after"]).split(":"))
    return day.replace(hour=h, minute=m, second=0, microsecond=0)


def hhmm(d: datetime) -> str:
    return d.strftime("%H:%M")


# ───────────────────────── Releases de GitHub (almacén de vídeos) ─────────────────────────

def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def repo() -> str:
    return env("GITHUB_REPOSITORY", required=True)


def asset_url(tag: str, name: str) -> str:
    return f"https://github.com/{repo()}/releases/download/{tag}/{name}"


def download(tag: str, *names: str) -> None:
    OUT_DIR.mkdir(exist_ok=True)
    args = ["release", "download", tag, "--repo", repo(), "--dir", str(OUT_DIR), "--clobber"]
    for n in names:
        args += ["--pattern", n]
    gh(*args)


# ───────────────────────── Vista previa para el correo ─────────────────────────

def make_review_assets() -> None:
    video = OUT_DIR / "reel.mp4"
    dur = media_duration(video)
    frames = []
    for i, t in enumerate((1.6, dur * 0.45, dur * 0.75)):
        f = OUT_DIR / f"_f{i}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(video),
                        "-frames:v", "1", "-vf", "scale=360:640", str(f)], check=True)
        frames.append(f)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *sum([["-i", str(f)] for f in frames], []),
                    "-filter_complex", "[0][1][2]hstack=inputs=3", "-q:v", "3", str(OUT_DIR / "thumb.jpg")], check=True)
    for f in frames:
        f.unlink()
    # Versión ligera para adjuntar al correo (cabe de sobra en el límite de 25 MB)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-vf", "scale=720:-2",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart", str(OUT_DIR / "preview.mp4")], check=True)


# ───────────────────────── Correos ─────────────────────────

def next_generation(cfg: dict, now: datetime) -> datetime:
    gen = at_hour(now, cfg["review"]["generate_hour"])
    return gen if now < gen else gen + timedelta(days=1)


def send_review(cfg: dict, state: dict, item: dict) -> None:
    now = now_local(cfg)
    pt = publish_time(cfg, now)
    publish_note = f"se publica hoy a las {hhmm(pt)}." if now < pt else "se publica en unos minutos."
    regen = at_hour(now, cfg["review"]["regenerate_hour"])
    regen_note = (f"a las {hhmm(regen)} te llega una versión nueva." if now < regen
                  else f"mañana a las {hhmm(regen)} te llega una versión nueva.")
    priv = private(item)
    pending_next = " · ".join(r["text"] or "(material adjunto)" for r in next_requests(state))
    subject, html_body, text = mailer.review_email(
        item, item, asset_url(item["tag"], "preview.mp4"), publish_note, regen_note,
        asked=priv.get("asked", ""), files=priv.get("files", []), next_note=pending_next,
        has_cover=(OUT_DIR / "cover.jpg").exists())
    mailer.send(subject, html_body, text, attachments=[OUT_DIR / "preview.mp4"],
                inline={"thumb": OUT_DIR / "thumb.jpg", "cover": OUT_DIR / "cover.jpg"})
    item["status"] = "emailed"
    item["emailed_at"] = now.isoformat(timespec="minutes")


# ───────────────────────── Interpretar respuestas ─────────────────────────

YES = re.compile(r"\b(s[ií]|vale|ok|okay|perfecto|adelante|publ[ií]calo|me gusta|aprobado|genial|dale)\b", re.I)
NO = re.compile(r"\b(no|cambia|otro|otra|rehaz|no me gusta|no me convence)\b", re.I)
TOMORROW = re.compile(r"\bma[ñn]ana\b", re.I)


def classify(reply: dict, pending: bool) -> tuple[str, str]:
    """Devuelve ('approve'|'change'|'next'|'unclear', indicaciones)."""
    subject, body = reply["subject"].upper(), reply["body"]
    if mailer.NEXT in subject or "MANANA" in subject:
        return "next", body
    if mailer.APPROVE in subject:
        return "approve", ""
    if mailer.CHANGE in subject:
        return "change", body
    from .writer import _json, claude, claude_ready
    if claude_ready():
        try:
            r = _json(claude(
                "Clasificas correos de una directora al sistema que prepara sus vídeos de Instagram. Solo JSON.",
                f"¿Hay un vídeo esperando su aprobación ahora mismo? {'Sí' if pending else 'No'}.\n"
                f"Adjuntos: {reply.get('files') or 'ninguno'}\n"
                f'Asunto: {reply["subject"]}\nCorreo:\n"""{body[:2000]}"""\n\n'
                'Devuelve {"decision": "approve" | "change" | "next" | "unclear", "feedback": "..."}\n'
                '- approve: quiere publicar el vídeo pendiente.\n'
                '- change: no le gusta el pendiente y quiere otro (feedback = qué quiere, con sus palabras).\n'
                '- next: pide un vídeo concreto para mañana o manda material/ideas para próximos vídeos '
                '(feedback = qué quiere).\n'
                '- unclear: no se entiende.'))
            if r.get("decision") in {"approve", "change", "next", "unclear"}:
                return r["decision"], r.get("feedback", "")
        except Exception as e:
            log.warning("No se pudo clasificar con Claude: %s", e)
    if TOMORROW.search(body) or (reply.get("files") and not pending):
        return "next", body
    if NO.search(body):
        return "change", body
    if YES.search(body):
        return "approve", ""
    return "unclear", ""


def _files_line(files: list[str]) -> str:
    return f"<br>Archivos recibidos: {', '.join(files)}" if files else ""


def process_inbox(cfg: dict, state: dict) -> None:
    item = state.get("item")
    for reply in mailer.fetch_replies():
        reply["body"] = mailer.clean_reply(reply["body"])
        pending = bool(item and item["status"] == "emailed")
        decision, feedback = classify(reply, pending)
        feedback = feedback.strip()
        now = now_local(cfg)
        log.info("Correo de la directora → %s", decision)

        if decision == "next":
            reqs = next_requests(state)
            reqs.append({"text": feedback, "message_id": reply["message_id"], "files": reply["files"],
                         "at": now.isoformat(timespec="minutes")})
            state["next"] = seal(reqs)
            gen = next_generation(cfg, now)
            email_at = at_hour(gen, cfg["review"]["email_hour"])
            day = "hoy" if email_at.date() == now.date() else "mañana"
            asked = f"<br><br>Lo que pides: <i>“{feedback}”</i>" if feedback else ""
            mailer.notify("📌 Apuntado para el próximo vídeo",
                          f"Perfecto. {day.capitalize()} a las {hhmm(email_at)} te llega el vídeo preparado con esto."
                          f"{asked}{_files_line(reply['files'])}")
            continue

        m = re.search(r"\[REEL ([\w-]+)\]", reply["subject"])
        if not pending or (m and m.group(1) != item["id"]):
            if item and m and m.group(1) == item["id"] and item["status"] in {"approved", "published"}:
                continue  # respuesta repetida a un vídeo ya aprobado
            mailer.notify("Ese vídeo ya no está pendiente",
                          "Tu respuesta se refiere a un vídeo que ya no está activo. Responde siempre al correo "
                          "más reciente. Si querías pedir un vídeo para mañana, usa el botón "
                          "<b>“Pedir el vídeo de mañana”</b> o escribe un correo con el asunto <b>MAÑANA</b>.")
            continue

        if decision == "approve":
            item.update(status="approved", decided_at=now.isoformat(timespec="minutes"))
            pt = publish_time(cfg, now)
            when = f"hoy a las {hhmm(pt)}" if now < pt else "en unos minutos"
            if instagram_on():
                mailer.notify("👍 Aprobado", f"Perfecto. El vídeo <b>“{item['topic']}”</b> se publicará {when}. "
                                             "Te aviso cuando esté en Instagram.")
            else:
                mailer.notify("👍 Aprobado", f"Perfecto. El vídeo <b>“{item['topic']}”</b> queda aprobado. "
                                             f"Instagram está desactivado: {when} te llegan el vídeo, la portada "
                                             "y el texto para publicarlo a mano.")
        elif decision == "change":
            regen = at_hour(now, cfg["review"]["regenerate_hour"])
            if now >= regen:
                regen += timedelta(days=1)
            priv = private(item)
            priv["change"] = {"text": feedback, "message_id": reply["message_id"], "files": reply["files"]}
            item.update(status="regen_requested", private=seal(priv), regen_due=regen.isoformat(timespec="minutes"),
                        decided_at=now.isoformat(timespec="minutes"))
            day = "hoy" if regen.date() == now.date() else "mañana"
            asked = f"<br><br>Lo que pides: <i>“{feedback}”</i>" if feedback else ""
            mailer.notify("✏️ Recibido, preparo otro",
                          f"Entendido. {day.capitalize()} a las {hhmm(regen)} te llega una versión nueva."
                          f"{asked}{_files_line(reply['files'])}")
        else:
            mailer.notify("No te he entendido",
                          "Para publicar el vídeo pulsa <b>“Sí, publícalo”</b> en el correo anterior. "
                          "Si quieres otro, pulsa <b>“No, quiero otro”</b> y escribe qué te gustaría. "
                          "Para pedir el de mañana, pulsa <b>“Pedir el vídeo de mañana”</b>.")


# ───────────────────────── Decisión de cada tick ─────────────────────────

def decide(cfg: dict, state: dict) -> str:
    r = cfg["review"]
    now = now_local(cfg)
    today = now.date().isoformat()
    item = state.get("item")
    status = item["status"] if item else None

    # Aprobado → se publica a la hora fijada del día en que se aprobó (o al momento si ya pasó)
    if status == "approved" and now >= publish_time(cfg, datetime.fromisoformat(item["decided_at"])):
        return "publish"
    if status == "regen_requested" and now >= datetime.fromisoformat(item["regen_due"]):
        return "regenerate"
    if status == "generated" and item["day"] == today and now.hour >= r["email_hour"]:
        return "email"
    nightly_window = r["generate_hour"] <= now.hour < r["email_hour"]
    already_today = item and item["day"] == today and item.get("kind") == "nightly"
    if nightly_window and not already_today and status not in {"regen_requested", "approved"}:
        return "generate"
    return "none"


def cmd_tick(args) -> None:
    cfg = load_config()
    state = load_state()
    if env("MAIL_USER") and env("MAIL_APP_PASSWORD"):
        process_inbox(cfg, state)
    action = args.force or decide(cfg, state)
    log.info("Acción: %s", action)

    if action == "publish" and not instagram_on():
        finish_without_instagram(cfg, state)
        action = "none"
    if action == "email":
        item = state["item"]
        download(item["tag"], "preview.mp4", "thumb.jpg", "cover.jpg")
        send_review(cfg, state, item)
        action = "none"  # el envío ya está hecho en este paso

    save_state(state)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as fh:
            fh.write(f"action={action}\n")
    print(action)


# ───────────────────────── Generar / publicar ─────────────────────────

def gather(requests: list[dict]) -> tuple[str, str, list[dict], list[str]]:
    """Junta peticiones de la directora: (texto, material, imágenes, nombres de archivo)."""
    texts, files, urls = [], [], []
    for i, req in enumerate(requests):
        if req.get("text"):
            texts.append(req["text"])
        urls += materials.urls_in(req.get("text", ""))
        if req.get("files") and req.get("message_id"):
            _body, paths = mailer.fetch_message(req["message_id"], OUT_DIR / "materials" / str(i))
            files += paths
    text, images = materials.extract(files, urls) if (files or urls) else ("", [])
    return " / ".join(texts), text, images, [f.name for f in files]


def cmd_generate(args) -> None:
    from .main import produce
    cfg = load_config()
    state = load_state()
    prev = state.get("item")
    regen = args.mode == "regenerate"

    if regen:
        change = private(prev).get("change") or {}
        requests = [change]
        feedback = change.get("text", "")
    else:
        if prev and prev["status"] in {"generated", "emailed"}:
            log.info("El vídeo %s no se aprobó a tiempo; queda descartado", prev["id"])
        requests = next_requests(state)
        feedback = None
    asked, mat_text, images, file_names = gather(requests) if any(requests) else ("", "", [], [])
    if not regen and requests:
        feedback = asked or None  # petición concreta para hoy
        log.info("Vídeo por encargo de la directora (%d archivos)", len(file_names))

    meta = produce(feedback=feedback, do_render=not args.no_render, materials=mat_text, images=images)
    now = now_local(cfg)
    item_id = now.strftime("%m%d-%H%M")
    item = {k: meta.get(k) for k in META_KEYS} | {
        "id": item_id,
        "tag": f"reel-{now:%Y}{item_id}",
        "day": now.date().isoformat(),
        "kind": "regen" if regen else "nightly",
        "attempt": (prev.get("attempt", 1) + 1) if regen and prev else 1,
        "status": "generated",
        "private": seal({"asked": asked, "files": file_names}) if (asked or file_names) else None,
    }
    if not args.no_render:
        make_review_assets()
        files = [str(OUT_DIR / n) for n in ("reel.mp4", "preview.mp4", "thumb.jpg", "cover.jpg") if (OUT_DIR / n).exists()]
        gh("release", "create", item["tag"], *files, "--repo", repo(), "--title", f"Reel {item_id}",
           "--notes", "Vídeo pendiente de revisión.", "--prerelease")
    state["item"] = item
    if not regen:
        state.pop("next", None)  # la petición para hoy ya está usada
    if regen and not args.no_render:
        send_review(cfg, state, item)  # la versión nueva se manda en cuanto está lista
    save_state(state)


def cmd_publish(args) -> None:
    from .main import record_published
    cfg = load_config()
    state = load_state()
    item = state["item"]
    if item["status"] != "approved":
        raise SystemExit(f"El vídeo {item['id']} no está aprobado (estado: {item['status']})")
    link = instagram.publish_reel(args.video_url, item["caption"], cover_url=args.cover_url)
    record_published(item, link)
    item.update(status="published", permalink=link, published_at=now_local(cfg).isoformat(timespec="minutes"))
    save_state(state)
    mailer.notify("✅ Publicado en Instagram", f'Ya está publicado: <a href="{link}">{link}</a>')


def finish_without_instagram(cfg: dict, state: dict) -> None:
    """Instagram desactivado: el vídeo aprobado se da por terminado sin subirlo y se avisa con los enlaces."""
    from .main import record_published
    item = state.get("item")
    if not item or item["status"] != "approved":
        log.warning("No hay ningún vídeo aprobado que cerrar")
        return
    log.info("Instagram desactivado (INSTAGRAM_PUBLISH): el vídeo %s no se sube", item["id"])
    record_published(item, None)  # cuenta en el historial para que los temas y formatos sigan rotando
    item.update(status="published", permalink=None, instagram=False,
                published_at=now_local(cfg).isoformat(timespec="minutes"))
    e = html.escape
    mailer.notify(
        "🧪 Aprobado (Instagram desactivado)",
        f"El vídeo <b>“{e(item.get('topic') or '')}”</b> está aprobado, pero la publicación en Instagram está "
        f"desactivada, así que no se ha subido.<br><br>"
        f'<a href="{asset_url(item["tag"], "reel.mp4")}">Descargar el vídeo</a> · '
        f'<a href="{asset_url(item["tag"], "cover.jpg")}">Descargar la portada</a><br><br>'
        f"<b>Texto del post:</b><br>{e(item.get('caption') or '').replace(chr(10), '<br>')}")


def cmd_status(_args) -> None:
    state = load_state()
    item = state.get("item")
    print(json.dumps({"item": {k: v for k, v in (item or {}).items() if k != "private"},
                      "private": private(item), "next": next_requests(state)}, ensure_ascii=False, indent=2))


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("tick")
    t.add_argument("--force", choices=["generate", "regenerate", "email", "publish", "none"])
    t.set_defaults(func=cmd_tick)
    g = sub.add_parser("generate")
    g.add_argument("--mode", choices=["generate", "regenerate"], default="generate")
    g.add_argument("--no-render", action="store_true")
    g.set_defaults(func=cmd_generate)
    pub = sub.add_parser("publish")
    pub.add_argument("--video-url", required=True)
    pub.add_argument("--cover-url")
    pub.set_defaults(func=cmd_publish)
    sub.add_parser("status").set_defaults(func=cmd_status)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
