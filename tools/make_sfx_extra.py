"""Amplía el kit de efectos con sonidos de interfaz y tecnología, generados por código (propios, CC0).

Uso: python tools/make_sfx_extra.py [carpeta_salida]   (por defecto assets/sfx)
"""
from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter

SR = 44100
rng = np.random.default_rng(11)


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def filt(x, kind, fc, order=2):
    b, a = butter(order, np.array(fc) / (SR / 2), kind)
    return lfilter(b, a, x)


def room(x: np.ndarray, sec: float = 0.5, mix: float = 0.25) -> np.ndarray:
    n = int(sec * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 8, n))
    wet = fftconvolve(x, ir / np.sqrt(np.sum(ir ** 2)))
    out = np.zeros(len(wet))
    out[:len(x)] += x * (1 - mix)
    return out + wet * mix


def save(path: Path, x: np.ndarray, width: float = 0.0, peak_db: float = -3.0) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    d = int(0.0007 * SR * width)
    left, right = x, np.roll(x, d) if d else x
    pcm = (np.clip(np.stack([left, right]), -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.T.reshape(-1).tobytes())
    print(f"{path.name:16s} {len(x) / SR:.2f}s")


def glitch():
    t = t_axis(0.42)
    x = np.zeros(len(t))
    for k in range(9):
        s = int(rng.uniform(0, 0.36) * SR)
        n = int(rng.uniform(0.01, 0.05) * SR)
        f = rng.choice([180, 420, 880, 1760, 3300])
        seg = np.sign(np.sin(2 * np.pi * f * t[:n])) * 0.6 + rng.standard_normal(n) * 0.4
        x[s:s + n] += seg[:len(x[s:s + n])] * rng.uniform(0.4, 1)
    return np.round(x * 6) / 6  # bitcrush


def beep():
    t = t_axis(0.18)
    return np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 18) * (t < 0.16)


def notif():
    out = []
    for f in (988, 1480):
        t = t_axis(0.16)
        out.append(np.sin(2 * np.pi * f * t) * np.exp(-t * 14) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 25))
    return room(np.concatenate(out), 0.6, 0.3)


def scan():
    t = t_axis(0.9)
    f = 300 + 2600 * t / t[-1]
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + filt(rng.standard_normal(len(t)), "band", [2000, 6000]) * 0.3
    return x * np.sin(np.pi * t / t[-1]) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 22 * t)))


def boom():
    t = t_axis(1.6)
    f = 32 + 70 * np.exp(-t * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    return room(x + filt(rng.standard_normal(len(t)), "low", 400) * np.exp(-t * 6) * 0.4, 1.2, 0.3)


def click():
    t = t_axis(0.05)
    return filt(rng.standard_normal(len(t)), "band", [1500, 7000]) * np.exp(-t * 160) + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300)


def keyclack():
    t = t_axis(0.09)
    thock = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 70)
    tick = filt(rng.standard_normal(len(t)), "band", [2500, 9000]) * np.exp(-t * 220)
    return thock * 0.7 + tick


def shutter():
    a = keyclack()
    gap = np.zeros(int(0.07 * SR))
    return room(np.concatenate([a, gap, a * 0.7]), 0.3, 0.2)


def reverse_swell():
    t = t_axis(1.1)
    x = filt(rng.standard_normal(len(t)), "low", 3000) * 0.5 + np.sin(2 * np.pi * 220 * t) * 0.3
    return room(x * (t / t[-1]) ** 3, 0.8, 0.4)


def chime():
    x = np.zeros(int(1.4 * SR))
    for i, f in enumerate((1047, 1319, 1568, 2093)):
        s = int(i * 0.07 * SR)
        t = np.arange(len(x) - s) / SR
        x[s:] += np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4)) * np.exp(-t * 3.2)
    return room(x, 1.0, 0.35)


def data():
    t = t_axis(0.55)
    steps = (np.floor(t * 40) % 7)
    f = 800 + steps * 260
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3
    return filt(x, "low", 5000) * np.exp(-t * 3) * (np.floor(t * 40) % 2 == 0)


def swoosh_up():
    t = t_axis(0.6)
    x = rng.standard_normal(len(t))
    out = np.zeros_like(x)
    for k in range(12):
        lo = 300 + k * 600
        seg = slice(int(k * len(t) / 12), int((k + 1) * len(t) / 12))
        out[seg] = filt(x, "band", [lo, lo * 2.2])[seg]
    return out * np.sin(np.pi * t / t[-1]) ** 2


def thud():
    t = t_axis(0.35)
    return np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 14) + filt(rng.standard_normal(len(t)), "low", 900) * np.exp(-t * 40) * 0.5


def error():
    t = t_axis(0.38)
    x = np.sign(np.sin(2 * np.pi * 220 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 233 * t)) * 0.5
    return filt(x, "low", 2500) * ((t < 0.15) | ((t > 0.2) & (t < 0.35)))


def success():
    x = np.zeros(int(0.7 * SR))
    for i, f in enumerate((784, 988, 1175)):
        s = int(i * 0.08 * SR)
        t = np.arange(len(x) - s) / SR
        x[s:] += np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    return room(x, 0.6, 0.3)


def countdown():
    t = t_axis(0.12)
    return np.sin(2 * np.pi * 880 * t) * np.exp(-t * 30)


def riser_long():
    t = t_axis(2.2)
    f = 120 * 2 ** (4 * t / t[-1])
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35 + filt(rng.standard_normal(len(t)), "band", [800, 7000]) * 0.4
    return room(x * (t / t[-1]) ** 2, 0.8, 0.3)


SOUNDS = {
    "glitch": (glitch, 0.4), "beep": (beep, 0.0), "notif": (notif, 0.5), "scan": (scan, 1.0), "boom": (boom, 0.3),
    "click": (click, 0.2), "keyclack": (keyclack, 0.2), "shutter": (shutter, 0.4), "reverse": (reverse_swell, 0.8),
    "chime": (chime, 0.8), "data": (data, 0.5), "swoosh_up": (swoosh_up, 1.0), "thud": (thud, 0.0),
    "error": (error, 0.2), "success": (success, 0.6), "countdown": (countdown, 0.0), "riser_long": (riser_long, 0.8),
}


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/sfx")
    out.mkdir(parents=True, exist_ok=True)
    for name, (fn, width) in SOUNDS.items():
        save(out / f"{name}.wav", fn(), width)


if __name__ == "__main__":
    main()
