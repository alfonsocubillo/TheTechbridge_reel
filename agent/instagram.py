"""Publicación de Reels con la API de Instagram (Instagram Login, sin página de Facebook)."""
from __future__ import annotations

import time

import requests

from .common import env, log


def _base() -> str:
    return f"https://graph.instagram.com/{env('IG_API_VERSION', 'v25.0')}"


def _check(r: requests.Response) -> dict:
    if r.status_code >= 400:
        raise RuntimeError(f"Instagram API {r.status_code}: {r.text[:600]}")
    return r.json()


def account(token: str) -> dict:
    return _check(requests.get(f"{_base()}/me", params={"fields": "user_id,username", "access_token": token}, timeout=30))


def publish_reel(video_url: str, caption: str, cover_url: str | None = None, thumb_offset_ms: int = 1500) -> str:
    token = env("IG_ACCESS_TOKEN", required=True)
    me = account(token)
    uid = me["user_id"]
    log.info("Publicando en @%s", me.get("username"))

    data = {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": caption,
        "share_to_feed": "true",
        "thumb_offset": str(thumb_offset_ms),
        "access_token": token,
    }
    if cover_url:
        data["cover_url"] = cover_url  # portada propia (si no, Instagram usa el fotograma de thumb_offset)
    container = _check(requests.post(f"{_base()}/{uid}/media", data=data, timeout=60))["id"]

    # Instagram descarga y procesa el vídeo; esperamos a que termine
    for _ in range(60):
        st = _check(requests.get(f"{_base()}/{container}",
                                 params={"fields": "status_code,status", "access_token": token}, timeout=30))
        code = st.get("status_code")
        log.info("Estado del contenedor: %s", code)
        if code == "FINISHED":
            break
        if code in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram rechazó el vídeo: {st}")
        time.sleep(10)
    else:
        raise RuntimeError("Instagram tardó demasiado en procesar el vídeo")

    media_id = _check(requests.post(f"{_base()}/{uid}/media_publish",
                                    data={"creation_id": container, "access_token": token}, timeout=60))["id"]
    # El enlace del post a veces tarda unos segundos en estar disponible
    link = ""
    for _ in range(6):
        link = _check(requests.get(f"{_base()}/{media_id}",
                                   params={"fields": "permalink", "access_token": token}, timeout=30)).get("permalink", "")
        if link:
            break
        time.sleep(5)
    if not link:
        link = f"https://www.instagram.com/{me.get('username', '')}/"
        log.warning("Instagram no devolvió el enlace del post; uso el del perfil: %s", link)
    log.info("Publicado: %s", link)
    return link


def refresh_token(token: str) -> str:
    """Renueva el token de larga duración (dura 60 días; el workflow lo renueva cada mes)."""
    data = _check(requests.get("https://graph.instagram.com/refresh_access_token",
                               params={"grant_type": "ig_refresh_token", "access_token": token}, timeout=30))
    return data["access_token"]
