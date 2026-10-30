"""Genera el kit de efectos de sonido propio (CC0) y convierte los de Kenney a WAV.

Uso: python make_sfx.py <carpeta_kenney> <carpeta_salida>
"""
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 44100
rng = np.random.default_rng(7)
FF = imageio_ffmpeg.get_ffmpeg_exe()


def save(path: Path, stereo: np.ndarray, peak_db: float = -2.0) -> None:
    x = stereo / (np.max(np.abs(stereo)) + 1e-9) * (10 ** (peak_db / 20))
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.T.reshape(-1).tobytes() if pcm.shape[0] == 2 else pcm.tobytes())
    print(f"{path.name:14s} {stereo.shape[1] / SR:.2f}s")


def svf_bandpass(x: np.ndarray, fc: np.ndarray, q: float) -> np.ndarray:
    """Filtro de estado variable con frecuencia de corte que cambia en el tiempo."""
    low = band = 0.0
    out = np.empty_like(x)
    damp = 1.0 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        high = x[i] - low - damp * band
        band += f * high
        low += f * band
        out[i] = band
    return out


def lowpass(x: np.ndarray, fc: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def pan(mono: np.ndarray, pos: np.ndarray) -> np.ndarray:
    """pos de -1 (izquierda) a 1 (derecha), ley de potencia constante."""
    ang = (pos + 1) * np.pi / 4
    return np.vstack([mono * np.cos(ang), mono * np.sin(ang)])


def reverb(st: np.ndarray, secs: float = 1.2, mix: float = 0.25) -> np.ndarray:
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 5.5)
        ir = lowpass(ir, 5000)
        wet = np.pad(np.convolve(st[ch], ir), (0, 1))[: st.shape[1] + n]
        wet /= np.max(np.abs(wet)) + 1e-9
        dry = np.concatenate([st[ch], np.zeros(n)])
        out.append(dry * (1 - mix) + wet * mix * np.max(np.abs(st[ch])))
    return np.vstack(out)


def whoosh(dur: float, f0: float, f1: float, peak_at: float, direction: int) -> np.ndarray:
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    fc = f0 * (f1 / f0) ** (np.sin(np.pi * np.clip(t / peak_at / 2, 0, 1)) if peak_at < 1 else t)
    body = svf_bandpass(noise, fc, 1.6) + 0.35 * svf_bandpass(noise, fc * 2.1, 2.5)
    env = np.where(t < peak_at, (t / peak_at) ** 2.2, np.exp(-(t - peak_at) / (1 - peak_at) * 4.5))
    st = pan(body * env, np.linspace(-0.8, 0.8, n) * direction)
    return reverb(st, 0.6, 0.18)


def impact() -> np.ndarray:
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    freq = 38 + 70 * np.exp(-t * 14)
    sub = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 3.2)
    click = rng.standard_normal(n) * np.exp(-t * 180) * 0.6
    thump = lowpass(rng.standard_normal(n), 400) * np.exp(-t * 16) * 2.5
    mono = np.tanh((sub * 1.3 + click + thump) * 1.4)
    return reverb(pan(mono, np.zeros(n)), 1.4, 0.22)


def riser() -> np.ndarray:
    n = int(1.0 * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    air = svf_bandpass(noise, 300 * (20 ** t), 1.2)
    tone = np.sin(2 * np.pi * np.cumsum(180 * (4.5 ** t)) / SR) * 0.35
    tone += np.sin(2 * np.pi * np.cumsum(270 * (4.5 ** t)) / SR) * 0.2
    env = t ** 2.4
    st = np.vstack([(air + tone) * env, (air * 0.9 + tone) * env])
    return st


def shimmer() -> np.ndarray:
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    partials = [2093.0, 2637.0, 3136.0, 4186.0, 5274.0]
    left = np.zeros(n)
    right = np.zeros(n)
    for k, f in enumerate(partials):
        vib = 1 + 0.003 * np.sin(2 * np.pi * (5 + k) * t)
        trem = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + 2 * k) * t + k)
        s = np.sin(2 * np.pi * f * np.cumsum(vib) / SR + rng.uniform(0, 6)) * trem * np.exp(-t * (2.2 + k * 0.5))
        s *= np.minimum(1, t / (0.02 + 0.03 * k))
        g = 1 / (1 + k * 0.6)
        left += s * g * (0.6 + 0.1 * k)
        right += s * g * (1.0 - 0.1 * k)
    sparkle = svf_bandpass(rng.standard_normal(n), np.full(n, 7000.0), 3) * np.exp(-t * 6) * 0.15
    return reverb(np.vstack([left + sparkle, right + sparkle]), 1.2, 0.3)


def main() -> None:
    kenney, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    save(out / "whoosh1.wav", whoosh(0.55, 250, 3200, 0.55, 1))
    save(out / "whoosh2.wav", whoosh(0.7, 180, 2600, 0.6, -1))
    save(out / "whoosh3.wav", whoosh(0.5, 400, 4200, 0.5, 1))
    save(out / "swipe.wav", whoosh(0.32, 900, 6000, 0.45, -1), -4)
    save(out / "impact.wav", impact(), -1)
    save(out / "riser.wav", riser(), -3)
    save(out / "shimmer.wav", shimmer(), -4)
    for src, name in [("drop_002", "pop"), ("confirmation_002", "ding"), ("click_003", "type"), ("click_001", "tick")]:
        subprocess.run([FF, "-v", "error", "-y", "-i", str(kenney / f"{src}.ogg"), "-ac", "2", "-ar", str(SR), str(out / f"{name}.wav")], check=True)
        print(f"{name + '.wav':14s} (Kenney {src}, CC0)")


if __name__ == "__main__":
    main()
