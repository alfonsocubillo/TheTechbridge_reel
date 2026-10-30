"""Descarga pistas CC0 de HoliznaCC0 desde archive.org, se queda con sus 2 mejores minutos e iguala el volumen.

Solo pistas de HoliznaCC0 (todo su catálogo es CC0, dominio público). La recopilación de archive.org mezcla
otros artistas sin licencia clara: esos no se tocan.

Uso: python tools/fetch_music.py [carpeta_salida]   (por defecto assets/music)
"""
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

import imageio_ffmpeg
import requests

ITEM = "06-holizna-cc-0-break-from-reality-lo-fi-peaceful-.mp-3"
TRACKS = [
    "05 HoliznaCC0 - Rising Hero.mp3",
    "06 HoliznaCC0 - Level 2.mp3",
    "11 HoliznaCC0 - Level 1.mp3",
    "13 HoliznaCC0 - NPC Theme.mp3",
    "20 HoliznaCC0 - Static.mp3",
    "23 HoliznaCC0 - Clouds.mp3",
    "01 HoliznaCC0 - Fractured.mp3",
    "04 HoliznaCC0 - ICE temple.mp3",
    "08 HoliznaCC0 - Red Skies.mp3",
    "08 HoliznaCC0 - Morning Coffee.mp3",
    "09 HoliznaCC0 - Dance Till You Die.mp3",
    "03 HoliznaCC0 - Sense Of Purpose.mp3",
    "02 HoliznaCC0 - Keeping Cool.mp3",
    "15 HoliznaCC0 - Into The Mist ( Lofi , Calm , Relaxed ).mp3",
    "03 HoliznaCC0 - Something In the Air.mp3",
    "26 HoliznaCC0 - Mixed Signals.mp3",
]
FF = imageio_ffmpeg.get_ffmpeg_exe()


def slug(name: str) -> str:
    title = re.sub(r"^\d+\s+HoliznaCC0 - ", "", name).split("(")[0].replace(".mp3", "")
    return "holizna-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/music")
    out.mkdir(parents=True, exist_ok=True)
    tmp = out / "_tmp.mp3"
    for name in TRACKS:
        dest = out / f"{slug(name)}.mp3"
        if dest.exists():
            print("ya está", dest.name)
            continue
        url = f"https://archive.org/download/{ITEM}/{urllib.parse.quote(name)}"
        r = requests.get(url, timeout=120)
        if r.status_code != 200:
            print("falló", name, r.status_code)
            continue
        tmp.write_bytes(r.content)
        # Se salta la intro (suele estar vacía), 120 s con fundidos y volumen igualado a -16 LUFS
        subprocess.run([FF, "-y", "-loglevel", "error", "-ss", "8", "-i", str(tmp), "-t", "120",
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.5,afade=t=out:st=118:d=2",
                        "-ar", "44100", "-b:a", "160k", str(dest)], check=True)
        print("ok", dest.name)
    tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
