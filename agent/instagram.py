"""Publicación de Reels e historias con la API de Instagram.

Vale cualquiera de los dos tipos de token que da Meta:
  · Instagram Login (empieza por "IGAA"): no necesita página de Facebook. Dura 60 días y se renueva solo.
  · Facebook Login (empieza por "EAA"): la cuenta de Instagram tiene que estar vinculada a una página de Facebook.
    Lo mejor es guardar el token de esa PÁGINA, que no caduca. La cuenta de Instagram se busca sola,
    o se fija con el secreto IG_USER_ID.
"""
from __future__ import annotations

import time

import requests

from .common import env, log


def is_facebook(token: str) -> bool:
    return token.startswith("EAA")


def _base(token: str) -> str:
    host = "graph.facebook.com" if is_facebook(token) else "graph.instagram.com"
    return f"https://{host}/{env('IG_API_VERSION', 'v25.0')}"


def _check(r: requests.Response) -> dict:
    if r.status_code >= 400:
        raise RuntimeError(f"Instagram API {r.status_code}: {r.text[:600]}")
    return r.json()


def _get(token: str, path: str, **params) -> dict:
    return _check(requests.get(f"{_base(token)}/{path}", params={**params, "access_token": token}, timeout=30))


def _post(token: str, path: str, **data) -> dict:
    return _check(requests.post(f"{_base(token)}/{path}", data={**data, "access_token": token}, timeout=60))


def _facebook_ig_user(token: str) -> str:
    """Id de la cuenta de Instagram a la que llega un token de Facebook (de página o de usuario)."""
    uid = (env("IG_USER_ID") or "").strip()
    if uid:
        return uid
    # Token de página: la propia página dice qué Instagram tiene vinculado
    r = requests.get(f"{_base(token)}/me", params={"fields": "instagram_business_account", "access_token": token}, timeout=30)
    if r.ok and r.json().get("instagram_business_account"):
        return r.json()["instagram_business_account"]["id"]
    # Token de usuario: la primera de sus páginas que tenga Instagram vinculado
    pages = _get(token, "me/accounts", fields="instagram_business_account").get("data", [])
    for p in pages:
        if p.get("instagram_business_account"):
            return p["instagram_business_account"]["id"]
    raise RuntimeError(
        "El token de Facebook no llega a ninguna cuenta de Instagram. Vincula la cuenta de Instagram a una página "
        "de Facebook y elige esa página al generar el token (o usa un token de Instagram Login, que empieza por IGAA)."
    )


def account(token: str) -> dict:
    """{'user_id', 'username'} de la cuenta de Instagram del token."""
    if not is_facebook(token):
        return _get(token, "me", fields="user_id,username")
    uid = _facebook_ig_user(token)
    return {"user_id": uid, "username": _get(token, uid, fields="username").get("username")}


def _wait(token: str, container: str, what: str) -> None:
    """Instagram descarga y procesa el vídeo; esperamos a que termine."""
    for _ in range(60):
        st = _get(token, container, fields="status_code,status")
        code = st.get("status_code")
        log.info("Estado del contenedor: %s", code)
        if code == "FINISHED":
            return
        if code in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram rechazó {what}: {st}")
        time.sleep(10)
    raise RuntimeError(f"Instagram tardó demasiado en procesar {what}")


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
    }
    if cover_url:
        data["cover_url"] = cover_url  # portada propia (si no, Instagram usa el fotograma de thumb_offset)
    container = _post(token, f"{uid}/media", **data)["id"]
    _wait(token, container, "el vídeo")

    media_id = _post(token, f"{uid}/media_publish", creation_id=container)["id"]
    # El enlace del post a veces tarda unos segundos en estar disponible
    link = ""
    for _ in range(6):
        link = _get(token, media_id, fields="permalink").get("permalink", "")
        if link:
            break
        time.sleep(5)
    if not link:
        link = f"https://www.instagram.com/{me.get('username', '')}/"
        log.warning("Instagram no devolvió el enlace del post; uso el del perfil: %s", link)
    log.info("Publicado: %s", link)
    return link


def publish_story(video_url: str) -> str:
    """Publica una historia de vídeo (9:16). Devuelve el id de la publicación."""
    token = env("IG_ACCESS_TOKEN", required=True)
    uid = account(token)["user_id"]
    container = _post(token, f"{uid}/media", media_type="STORIES", video_url=video_url)["id"]
    _wait(token, container, "la historia")
    media_id = _post(token, f"{uid}/media_publish", creation_id=container)["id"]
    log.info("Historia publicada: %s", media_id)
    return media_id


def refresh_token(token: str) -> str:
    """Renueva el token de Instagram Login (dura 60 días; el workflow lo renueva cada mes).
    Un token de página de Facebook no caduca: se devuelve tal cual."""
    if is_facebook(token):
        log.info("Token de Facebook: no hace falta renovarlo")
        return token
    data = _check(requests.get("https://graph.instagram.com/refresh_access_token",
                               params={"grant_type": "ig_refresh_token", "access_token": token}, timeout=30))
    return data["access_token"]
