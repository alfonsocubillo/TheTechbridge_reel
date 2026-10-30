"""Galería de revisión (Galeria.html), simulación del perfil (Portadas/Vista_Perfil.jpg) y servidor local para
aprobar o descartar piezas con un clic.
"""
from __future__ import annotations

import html
import json
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from PIL import Image

from . import library
from .catalog import HISTORIA, MODELS

PORT = 8765


def profile_grid(max_items: int = 12) -> Path | None:
    """Simula la cuadrícula del perfil (3 columnas, recorte 3:4) con las portadas más recientes."""
    base = library.base_dir()
    feed = [f for f in library.all_fichas() if f.get("canal") != HISTORIA and f.get("estado") != "descartado"]
    feed.sort(key=lambda f: f["fecha"], reverse=True)
    covers = []
    for f in feed[:max_items]:
        name = "portada.jpg" if f["tipo"] == "reel" else "01.jpg"
        p = base / f["carpeta"] / name
        if p.exists():
            covers.append(p)
    if not covers:
        return None
    w, h, gap = 360, 480, 4
    rows = (len(covers) + 2) // 3
    sheet = Image.new("RGB", (w * 3 + gap * 2, h * rows + gap * (rows - 1)), "white")
    for i, p in enumerate(covers):
        im = Image.open(p).convert("RGB")
        # Recorte central a 3:4, como hace Instagram en la cuadrícula
        tw = min(im.width, int(im.height * 3 / 4))
        th = int(tw * 4 / 3)
        left, top = (im.width - tw) // 2, (im.height - th) // 2
        im = im.crop((left, top, left + tw, top + th)).resize((w, h), Image.LANCZOS)
        sheet.paste(im, ((i % 3) * (w + gap), (i // 3) * (h + gap)))
    out = base / "Portadas" / "Vista_Perfil.jpg"
    sheet.save(out, quality=90)
    return out


def _media(f: dict) -> str:
    folder = quote(f["carpeta"])
    files = f.get("archivos") or []
    if f["tipo"] == "carrusel":
        imgs = "".join(f'<img loading="lazy" src="{folder}/{quote(x)}" alt="Diapositiva {i + 1}">' for i, x in enumerate(files))
        return f'<div class="strip">{imgs}</div>'
    if files and files[0].endswith(".mp4"):
        poster = next((x for x in files if x.endswith(".jpg")), "")
        return f'<video controls preload="none" poster="{folder}/{quote(poster)}" src="{folder}/{quote(files[0])}"></video>'
    return f'<img loading="lazy" src="{folder}/{quote(files[0])}" alt="">' if files else ""


def build() -> Path:
    base = library.ensure_tree()
    fichas = sorted(library.all_fichas(), key=lambda f: (f["canal"], f["modelo"], f["fecha"]))
    grid = profile_grid()
    (base / "Revisiones" / "informe_variedad.md").write_text(library.variety_report(), encoding="utf-8")
    cards = []
    for f in fichas:
        e = html.escape
        music = f'<div class="meta">🎵 {e(f["musica"])} · {e(f.get("musica_estilo") or "")}</div>' if f.get("musica") else ""
        sfx = f'<div class="meta">🔊 {e(", ".join(f.get("efectos") or []))}</div>' if f.get("efectos") else ""
        caption = f'<details><summary>Texto del post</summary><pre>{e(f["texto_publicacion"])}</pre></details>' if f.get("texto_publicacion") else ""
        fam = f'<span class="chip fam-{e(f["familia"])}">{e(f["familia"])}</span>' if f.get("familia") else ""
        cards.append(f"""
<article class="card {e(f['tipo'])}" data-canal="{e(f['canal'])}" data-modelo="{e(f['modelo'])}" data-estado="{e(f['estado'])}" data-id="{e(f['id'])}">
  {_media(f)}
  <div class="body">
    <div class="chips"><span class="chip">{'Historia' if f['canal'] == HISTORIA else 'Publicación'}</span><span class="chip">{e(f['tipo'])}</span>
      <span class="chip strong">{e(f['modelo_nombre'])} · {e(f['modelo'])}</span>{fam}<span class="chip state">{e(f['estado'])}</span></div>
    <h3>{e(f['tema'])}</h3>
    <div class="meta">{e(f.get('categoria') or '')} · {e(f['fecha'].replace('T', ' '))} · {e(f.get('origen') or '')}</div>
    <div class="meta">Estructura: {e(f.get('estructura') or '')}</div>
    {music}{sfx}{caption}
    <div class="meta"><a href="{quote(f['carpeta'])}/ficha.json">ficha.json</a> · carpeta: {e(f['carpeta'])}</div>
    <div class="actions"><button data-s="aprobado">✅ Aprobar</button><button data-s="descartado">🗑️ Descartar</button><button data-s="pendiente">↩︎ Pendiente</button></div>
  </div>
</article>""")
    models = "".join(f'<option value="{k}">{k} · {html.escape(m["name"])}</option>' for k, m in MODELS.items())
    grid_html = f'<section class="profile"><h2>Vista del perfil</h2><p>Así se verían las últimas portadas en la cuadrícula (recorte 3:4).</p><img src="Portadas/Vista_Perfil.jpg?{len(fichas)}" alt="Simulación de la cuadrícula del perfil"></section>' if grid else ""
    page = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biblioteca Instagram · TechBridge</title>
<style>
:root{{--bg:#0b1020;--card:#141b31;--line:#25304f;--text:#eef2ff;--muted:#93a0c0;--acc:#7dd3fc}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,Segoe UI,sans-serif}}
header{{position:sticky;top:0;z-index:2;background:#0b1020ee;backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}}
h1{{font-size:18px;margin:0 16px 0 0}} select,input{{background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 10px}}
main{{padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}}
.card.carrusel{{grid-column:span 2}} @media(max-width:700px){{.card.carrusel{{grid-column:span 1}}}}
.card video,.card>img{{width:100%;aspect-ratio:9/16;object-fit:cover;background:#000;display:block;max-height:560px}}
.strip{{display:flex;gap:6px;overflow-x:auto;padding:6px;background:#000}} .strip img{{height:380px;aspect-ratio:4/5;flex:none;border-radius:6px}}
.body{{padding:12px 14px 14px}} h3{{margin:8px 0 6px;font-size:16px}} .meta{{color:var(--muted);font-size:13px;margin-top:4px}} .meta a{{color:var(--acc)}}
.chips{{display:flex;gap:6px;flex-wrap:wrap}} .chip{{font-size:12px;padding:2px 8px;border-radius:99px;border:1px solid var(--line);color:var(--muted)}} .chip.strong{{color:var(--text);border-color:#3b4a75}}
.chip.state{{color:#fde68a}} [data-estado=aprobado] .chip.state{{color:#86efac}} [data-estado=descartado]{{opacity:.55}}
.fam-noticia{{color:#ff8a75}} .fam-tutorial{{color:#7dd3fc}} .fam-comparativa{{color:#fcd34d}} .fam-analisis{{color:#c4b5fd}} .fam-prompting{{color:#6ee7b7}} .fam-curiosidad{{color:#f9a8d4}}
details{{margin-top:8px}} pre{{white-space:pre-wrap;background:#0b1020;padding:10px;border-radius:8px;font:13px/1.4 system-ui}}
.actions{{display:flex;gap:6px;margin-top:10px}} button{{flex:1;background:#1d2747;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px;cursor:pointer}} button:hover{{border-color:var(--acc)}}
.profile{{padding:0 20px 30px}} .profile img{{max-width:min(100%,560px);border-radius:10px}} #msg{{color:var(--acc);font-size:13px}}
</style></head><body>
<header><h1>Biblioteca de contenido · {len(fichas)} piezas</h1>
<select id="canal"><option value="">Historias y publicaciones</option><option value="historia">Historias</option><option value="publicacion">Publicaciones</option></select>
<select id="modelo"><option value="">Todos los modelos</option>{models}</select>
<select id="estado"><option value="">Todos los estados</option><option>pendiente</option><option>aprobado</option><option>descartado</option></select>
<span id="msg"></span></header>
<main>{''.join(cards)}</main>
{grid_html}
<script>
const f={{canal:document.getElementById('canal'),modelo:document.getElementById('modelo'),estado:document.getElementById('estado')}};
function apply(){{document.querySelectorAll('.card').forEach(c=>{{c.style.display=Object.entries(f).every(([k,s])=>!s.value||c.dataset[k]===s.value)?'':'none'}})}}
Object.values(f).forEach(s=>s.addEventListener('change',apply));
const msg=document.getElementById('msg');
document.querySelectorAll('.actions button').forEach(b=>b.addEventListener('click',async()=>{{
  const card=b.closest('.card'),id=card.dataset.id,s=b.dataset.s;
  try{{const r=await fetch('/api/estado',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{id,estado:s}})}});
    if(!r.ok)throw 0; card.dataset.estado=s; card.querySelector('.chip.state').textContent=s; msg.textContent='Guardado: '+id+' → '+s;}}
  catch(e){{msg.textContent='Abre la galería con «python -m studio revisar» para guardar, o ejecuta: python -m studio estado '+id+' '+s;}}
}}));
</script></body></html>"""
    out = base / "Galeria.html"
    out.write_text(page, encoding="utf-8")
    return out


class _Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(library.base_dir()), **kw)

    def log_message(self, *_a) -> None:
        pass

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/estado":
            self.send_error(404)
            return
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        try:
            library.set_state(body["id"], body["estado"])
        except (SystemExit, KeyError) as e:
            self.send_error(400, str(e))
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


def serve(open_browser: bool = True) -> None:
    build()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), _Handler)
    url = f"http://127.0.0.1:{PORT}/Galeria.html"
    print(f"Galería en {url}  (Ctrl+C para cerrar)")
    if open_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        build()  # deja la galería estática al día con los cambios de estado
