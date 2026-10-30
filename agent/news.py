"""Lee fuentes RSS/Atom reales y devuelve noticias recientes que aún no se han usado."""
from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import requests

from .common import log

UA = {"User-Agent": "Mozilla/5.0 (TechBridgeReels/1.0; +https://thetechbridgesolution.com)"}
ATOM = "{http://www.w3.org/2005/Atom}"


def _text(el) -> str:
    if el is None:
        return ""
    raw = "".join(el.itertext()) if len(el) else (el.text or "")
    raw = re.sub(r"<[^>]+>", " ", html.unescape(raw))
    return re.sub(r"\s+", " ", raw).strip()


def _date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        d = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def parse_feed(xml_text: str, source: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    items = []
    for it in root.iter("item"):  # RSS 2.0
        items.append({
            "title": _text(it.find("title")),
            "url": _text(it.find("link")),
            "summary": _text(it.find("description"))[:1200],
            "date": _date(_text(it.find("pubDate"))),
            "source": source,
        })
    for it in root.iter(f"{ATOM}entry"):  # Atom
        link = it.find(f"{ATOM}link")
        items.append({
            "title": _text(it.find(f"{ATOM}title")),
            "url": link.get("href") if link is not None else "",
            "summary": (_text(it.find(f"{ATOM}summary")) or _text(it.find(f"{ATOM}content")))[:1200],
            "date": _date(_text(it.find(f"{ATOM}updated")) or _text(it.find(f"{ATOM}published"))),
            "source": source,
        })
    return [i for i in items if i["title"] and i["url"]]


def fetch_article_text(url: str, limit: int = 6000) -> str:
    """Texto plano del artículo, para que el guion se apoye en hechos reales."""
    try:
        r = requests.get(url, headers=UA, timeout=20)
        r.raise_for_status()
    except requests.RequestException as e:
        log.warning("No se pudo leer el artículo %s: %s", url, e)
        return ""
    body = re.sub(r"(?is)<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", " ", r.text)
    paragraphs = re.findall(r"(?is)<p[^>]*>(.*?)</p>", body)
    text = " ".join(re.sub(r"<[^>]+>", " ", html.unescape(p)) for p in paragraphs)
    return re.sub(r"\s+", " ", text).strip()[:limit]


def recent_news(sources: list[str], used_urls: set[str], days: int = 10) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    found: list[dict] = []
    for src in sources:
        try:
            r = requests.get(src, headers=UA, timeout=20)
            r.raise_for_status()
            items = parse_feed(r.content.decode(r.encoding or "utf-8", errors="replace"), src)
        except Exception as e:  # una fuente caída no debe parar el vídeo del día
            log.warning("Fuente ignorada %s: %s", src, e)
            continue
        fresh = [i for i in items if i["url"] not in used_urls and (i["date"] is None or i["date"] >= cutoff)]
        log.info("%s → %d noticias nuevas", src, len(fresh))
        found.extend(fresh[:8])
    found.sort(key=lambda i: i["date"] or cutoff, reverse=True)
    return found


def relevant(items: list[dict], products: list[dict]) -> list[dict]:
    """Solo las noticias que mencionan alguno de los productos de la marca (config → products)."""
    pats = [re.compile(r"(?<![\w-])" + re.escape(k.lower()), re.I) for p in products for k in p.get("keywords", [])]
    keep = [i for i in items if any(p.search(f"{i['title']} {i['summary']}") for p in pats)]
    log.info("Noticias sobre los productos: %d de %d", len(keep), len(items))
    return keep
