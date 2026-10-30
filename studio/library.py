"""Biblioteca local: carpetas, fichas de cada pieza, estados de revisión y memoria editorial y creativa.

Cada pieza vive en la carpeta de su modelo (p. ej. Publicaciones/Carruseles/Modelo_01_Guia/2026-10-30_prompts)
con sus archivos y una `ficha.json`. La memoria (_sistema/memoria.json) guarda todo lo generado para que el
sistema sepa qué temas, modelos, familias y músicas ha usado y busque alternativas.
"""
from __future__ import annotations

import json
import re
import shutil
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path

from agent.common import ROOT, load_config

from .catalog import CATEGORIES, HISTORIA, MODELS, PUBLICACION

STATES = {"pendiente": "Pendientes", "aprobado": "Aprobados", "descartado": "Descartados"}

STRUCTURE = [
    "Historias/Videos/Modelo_Actual", "Historias/Videos/Modelo_Nuevo", "Historias/Videos/Otros_Modelos",
    "Historias/Fotos/Modelo_01_Titular", "Historias/Fotos/Modelo_02_SabiasQue", "Historias/Fotos/Modelo_03_Atajo",
    "Historias/Fotos/Otros_Modelos",
    "Publicaciones/Reels/Modelo_01_Cinematico", "Publicaciones/Reels/Modelo_02_Documental", "Publicaciones/Reels/Otros_Modelos",
    "Publicaciones/Carruseles/Modelo_01_Guia", "Publicaciones/Carruseles/Modelo_02_Explicador", "Publicaciones/Carruseles/Otros_Modelos",
    "Portadas/Reels", "Portadas/Carruseles",
    "Recursos/Musica", "Recursos/Efectos_Sonido", "Recursos/Imagenes", "Recursos/Recursos_Visuales",
    "Revisiones/Pendientes", "Revisiones/Aprobados", "Revisiones/Descartados", "_sistema",
]


def base_dir() -> Path:
    cfg = load_config().get("studio") or {}
    p = Path(cfg.get("output_dir", "TheTechBridge_Instagram"))
    return p if p.is_absolute() else ROOT / p


def ensure_tree() -> Path:
    base = base_dir()
    for d in STRUCTURE:
        (base / d).mkdir(parents=True, exist_ok=True)
    return base


def slug(text: str, n: int = 40) -> str:
    t = unicodedata.normalize("NFD", text.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:n].strip("-") or "pieza"


# ───────────────────────── Memoria ─────────────────────────

def memory_path() -> Path:
    return base_dir() / "_sistema" / "memoria.json"


def load_memory() -> list[dict]:
    p = memory_path()
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def save_memory(mem: list[dict]) -> None:
    memory_path().parent.mkdir(parents=True, exist_ok=True)
    memory_path().write_text(json.dumps(mem, ensure_ascii=False, indent=2), encoding="utf-8")


STOP = set("el la los las un una unos unas de del al a en y o que con por para tu tus su sus es se lo como mas más "
           "sin ya hoy este esta esto eso cada muy sobre nuevo nueva the and for".split())


def keywords(text: str) -> set[str]:
    t = slug(text, 400).split("-")
    return {w for w in t if len(w) > 2 and w not in STOP}


def overlaps(topic: str, mem: list[dict], channel: str | None = None, threshold: float = 0.34) -> dict | None:
    """Pieza anterior que trata (casi) lo mismo. Con `channel`, solo busca en el OTRO canal."""
    k = keywords(topic)
    for e in reversed(mem):
        if channel and e.get("channel") == channel:
            continue
        o = keywords(e.get("topic", ""))
        if k and o and len(k & o) / len(k | o) >= threshold:
            return e
    return None


def pick_model(channel: str, candidates: list[str], mem: list[dict], window: int = 24) -> str:
    """El modelo menos usado últimamente entre los candidatos (sin repetir el último de ese canal)."""
    recent = [e["model"] for e in mem if e.get("channel") == channel][-window:]
    last = recent[-1] if recent else None
    uses = Counter(recent)
    options = [c for c in candidates if c != last] or candidates
    return min(options, key=lambda c: (uses[c], candidates.index(c)))


# ───────────────────────── Piezas ─────────────────────────

def new_piece_dir(model: str, topic: str, when: datetime | None = None) -> Path:
    when = when or datetime.now()
    m = MODELS[model]
    folder = ensure_tree() / m["folder"]
    d = folder / f"{when:%Y-%m-%d}_{slug(topic)}"
    k = 2
    while d.exists():
        d = folder / f"{when:%Y-%m-%d}_{slug(topic)}-{k}"
        k += 1
    d.mkdir(parents=True)
    return d


def register(piece_dir: Path, ficha: dict) -> dict:
    """Guarda la ficha, la apunta en la memoria y crea su acceso en Revisiones/Pendientes."""
    ficha = {"estado": "pendiente", **ficha, "carpeta": str(piece_dir.relative_to(base_dir())).replace("\\", "/")}
    (piece_dir / "ficha.json").write_text(json.dumps(ficha, ensure_ascii=False, indent=2), encoding="utf-8")
    if ficha.get("texto_publicacion"):
        (piece_dir / "texto_publicacion.txt").write_text(ficha["texto_publicacion"], encoding="utf-8")
    mem = [e for e in load_memory() if e.get("id") != ficha["id"]]
    mem.append({k: ficha.get(k) for k in ("id", "fecha", "canal", "modelo", "familia", "categoria", "tema", "enfoque",
                                          "musica", "efectos", "estructura", "estado", "carpeta", "origen")}
               | {"channel": ficha.get("canal"), "model": ficha.get("modelo"), "topic": ficha.get("tema", "")})
    save_memory(mem)
    shortcut(ficha)
    return ficha


def all_fichas() -> list[dict]:
    out = []
    for p in sorted(base_dir().glob("*/*/*/**/ficha.json")):
        try:
            out.append(json.loads(p.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return out


def find(piece_id: str) -> tuple[Path, dict] | None:
    for p in base_dir().glob("**/ficha.json"):
        f = json.loads(p.read_text(encoding="utf-8"))
        if f.get("id") == piece_id or f.get("id", "").startswith(piece_id):
            return p, f
    return None


def main_file(ficha: dict) -> str:
    files = ficha.get("archivos") or []
    return files[0] if files else "ficha.json"


def shortcut(ficha: dict) -> None:
    """Acceso directo (.url) en Revisiones/<Estado>: doble clic y se abre la pieza."""
    base = base_dir()
    for folder in STATES.values():
        (base / "Revisiones" / folder / f"{ficha['id']}.url").unlink(missing_ok=True)
    target = (base / ficha["carpeta"] / main_file(ficha)).resolve()
    name = base / "Revisiones" / STATES.get(ficha.get("estado", "pendiente"), "Pendientes") / f"{ficha['id']}.url"
    name.parent.mkdir(parents=True, exist_ok=True)
    name.write_text(f"[InternetShortcut]\nURL={target.as_uri()}\n", encoding="utf-8")


def set_state(piece_id: str, state: str, note: str = "") -> dict:
    if state not in STATES:
        raise SystemExit(f"Estado no válido: {state}. Usa: {', '.join(STATES)}")
    hit = find(piece_id)
    if not hit:
        raise SystemExit(f"No encuentro la pieza {piece_id}")
    path, ficha = hit
    ficha["estado"] = state
    ficha.setdefault("revision", []).append({"estado": state, "fecha": datetime.now().isoformat(timespec="minutes"), "nota": note})
    path.write_text(json.dumps(ficha, ensure_ascii=False, indent=2), encoding="utf-8")
    mem = load_memory()
    for e in mem:
        if e.get("id") == ficha["id"]:
            e["estado"] = state
    save_memory(mem)
    shortcut(ficha)
    return ficha


# ───────────────────────── Informe de variedad ─────────────────────────

def variety_report(window: int = 40) -> str:
    """Qué se repite demasiado y qué apenas se usa (modelos, categorías, familias y música)."""
    mem = load_memory()[-window:]
    lines = [f"# Informe de variedad · {datetime.now():%d/%m/%Y %H:%M}", "", f"Últimas {len(mem)} piezas.", ""]
    if not mem:
        return "\n".join(lines + ["Todavía no hay piezas."])
    for channel, title in ((HISTORIA, "Historias"), (PUBLICACION, "Publicaciones")):
        sub = [e for e in mem if e.get("channel") == channel]
        if not sub:
            continue
        used = Counter(e["model"] for e in sub)
        unused = [MODELS[m]["name"] for m in MODELS if MODELS[m]["channel"] == channel and m not in used]
        lines += [f"## {title} ({len(sub)})", "", "| Modelo | Veces | Cuota |", "|---|---|---|"]
        for m, c in used.most_common():
            flag = " ⚠️ se repite" if c / len(sub) > 0.4 and len(sub) >= 5 else ""
            lines.append(f"| {MODELS[m]['name']} ({m}) | {c} | {c / len(sub):.0%}{flag} |")
        if unused:
            lines += ["", f"Sin usar todavía: {', '.join(unused)}."]
        lines.append("")
    cats = Counter(e.get("categoria") for e in mem if e.get("categoria"))
    lines += ["## Categorías", "", "| Categoría | Real | Objetivo |", "|---|---|---|"]
    for c, target in CATEGORIES.items():
        real = cats.get(c, 0) / len(mem)
        flag = " ⚠️ de más" if real > target * 2 and cats.get(c, 0) >= 3 else (" · falta" if real < target / 2 else "")
        lines.append(f"| {c} | {real:.0%} | {target:.0%}{flag} |")
    music = Counter(e.get("musica") for e in mem if e.get("musica"))
    if music:
        lines += ["", "## Música más usada", ""] + [f"- {m}: {c}" for m, c in music.most_common(6)]
        rep = [m for m, c in music.items() if c >= 3]
        if rep:
            lines.append(f"\n⚠️ Se repiten demasiado: {', '.join(rep)}.")
    fams = Counter(e.get("familia") for e in mem if e.get("channel") == PUBLICACION and e.get("familia"))
    if fams:
        lines += ["", "## Familias de portada", ""] + [f"- {f}: {c}" for f, c in fams.most_common()]
    return "\n".join(lines) + "\n"


def copy_resources() -> None:
    """Copia la biblioteca de música y efectos a Recursos/ para poder escucharla y revisarla."""
    from . import sound
    base = ensure_tree()
    for src_dir, dest in ((sound.MUSIC_DIR, base / "Recursos" / "Musica"), (sound.SFX_DIR, base / "Recursos" / "Efectos_Sonido")):
        for f in src_dir.iterdir():
            if f.suffix.lower() in {".mp3", ".wav", ".m4a"} and not (dest / f.name).exists():
                shutil.copy2(f, dest / f.name)
    (base / "Recursos" / "Musica" / "CATALOGO.md").write_text(sound.catalog_markdown(), encoding="utf-8")
