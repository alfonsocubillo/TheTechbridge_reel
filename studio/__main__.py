"""Estudio local de contenido de Instagram. Nada de lo que hace se publica: todo queda en la carpeta local.

  python -m studio ejemplos [--solo HF01,RL02]   renderiza la colección de ejemplos de todos los modelos
  python -m studio generar [--historias 3] [--publicaciones 1]   el equipo editorial (Claude) prepara el día
  python -m studio revisar                        abre la galería con botones para aprobar o descartar
  python -m studio estado <id> aprobado|descartado|pendiente [--nota "..."]
  python -m studio galeria                        regenera Galeria.html, la vista del perfil y el informe
  python -m studio informe                        informe de variedad (qué se repite y qué falta)
  python -m studio musica                         actualiza el catálogo musical y lo copia a Recursos/
  python -m studio programar [--hora 22:30] [--quitar]   tarea diaria de Windows para `generar`
"""
from __future__ import annotations

import argparse
import subprocess
import sys

from agent.common import ROOT, claude_allowed, load_config, log

from . import gallery, library, render, sound

TASK = "TechBridge Instagram (local)"


def cmd_ejemplos(a) -> None:
    from .ejemplos import all_examples
    pieces = all_examples()
    if a.solo:
        keep = set(a.solo.split(","))
        pieces = [p for p in pieces if p["modelo"] in keep]
    library.ensure_tree()
    library.copy_resources()
    fichas = render.produce(pieces, origin="ejemplo")
    out = gallery.build()
    print(f"\n{len(fichas)} piezas listas en {library.base_dir()}\nGalería: {out}")


def cmd_generar(a) -> None:
    cfg = load_config()
    if not claude_allowed(cfg=cfg):
        q = cfg.get("claude") or {}
        log.info("Franja protegida (%s-%s): no se usa Claude ahora. Vuelve a intentarlo después.", q.get("quiet_from"), q.get("quiet_to"))
        return
    from .editorial import plan_day
    st = cfg.get("studio") or {}
    pieces = plan_day(a.historias or int(st.get("stories_per_day", 3)), a.publicaciones or int(st.get("posts_per_day", 1)))
    if not pieces:
        log.warning("El equipo editorial no ha propuesto nada utilizable hoy")
        return
    fichas = render.produce(pieces, origin="automatico")
    gallery.build()
    print(f"{len(fichas)} piezas nuevas en Revisiones/Pendientes. Revisa con: python -m studio revisar")


def cmd_revisar(_a) -> None:
    gallery.serve()


def cmd_estado(a) -> None:
    f = library.set_state(a.id, a.estado, a.nota or "")
    gallery.build()
    print(f"{f['id']} → {f['estado']}")


def cmd_galeria(_a) -> None:
    print(gallery.build())


def cmd_informe(_a) -> None:
    print(library.variety_report())


def cmd_musica(_a) -> None:
    sound.build_catalog(force=True)
    library.copy_resources()
    print(sound.catalog_markdown())


def cmd_catalogo(a) -> None:
    from . import catalogo
    print(catalogo.build(render_variants=not a.sin_variantes))


def cmd_programar(a) -> None:
    if a.quitar:
        subprocess.run(["schtasks", "/Delete", "/TN", TASK, "/F"], check=False)
        return
    log_file = library.ensure_tree() / "_sistema" / "generar.log"
    action = f'cmd /c "cd /d "{ROOT}" && "{sys.executable}" -m studio generar >> "{log_file}" 2>&1"'
    subprocess.run(["schtasks", "/Create", "/SC", "DAILY", "/TN", TASK, "/TR", action, "/ST", a.hora, "/F"], check=True)
    print(f"Tarea «{TASK}» programada cada día a las {a.hora}. Quitar: python -m studio programar --quitar")


def main() -> None:
    p = argparse.ArgumentParser(prog="python -m studio", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("ejemplos")
    e.add_argument("--solo", help="Lista de modelos separados por comas (p. ej. HF01,CR02)")
    e.set_defaults(func=cmd_ejemplos)
    g = sub.add_parser("generar")
    g.add_argument("--historias", type=int)
    g.add_argument("--publicaciones", type=int)
    g.set_defaults(func=cmd_generar)
    sub.add_parser("revisar").set_defaults(func=cmd_revisar)
    s = sub.add_parser("estado")
    s.add_argument("id")
    s.add_argument("estado", choices=list(library.STATES))
    s.add_argument("--nota")
    s.set_defaults(func=cmd_estado)
    sub.add_parser("galeria").set_defaults(func=cmd_galeria)
    sub.add_parser("informe").set_defaults(func=cmd_informe)
    sub.add_parser("musica").set_defaults(func=cmd_musica)
    c = sub.add_parser("catalogo")
    c.add_argument("--sin-variantes", action="store_true", help="Solo copia lo ya generado y rehace Catalogo.html")
    c.set_defaults(func=cmd_catalogo)
    pr = sub.add_parser("programar")
    pr.add_argument("--hora", default="22:30")
    pr.add_argument("--quitar", action="store_true")
    pr.set_defaults(func=cmd_programar)
    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
