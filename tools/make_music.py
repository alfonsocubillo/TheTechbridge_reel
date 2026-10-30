"""Compone por código pistas de música propias (CC0) en estilos que faltan en la biblioteca.

Cada pista tiene estructura (intro, subida, parte principal, respiro y cierre), compresión por sidechain del
bombo y reverberación, para que se pueda usar de fondo en Reels e historias sin repetir siempre lo mismo.

Uso: python tools/make_music.py [carpeta_salida]   (por defecto assets/music)
"""
from __future__ import annotations

import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, fftconvolve, lfilter

SR = 44100
FF = imageio_ffmpeg.get_ffmpeg_exe()
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(note: str) -> float:
    """'A3' → 220 Hz."""
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def chord(root: str, kind: str = "m", octave: int = 3) -> list[float]:
    steps = {"m": [0, 3, 7, 10], "M": [0, 4, 7, 11], "m9": [0, 3, 7, 10, 14], "M9": [0, 4, 7, 11, 14], "sus": [0, 5, 7, 10]}[kind]
    base = hz(f"{root}{octave}")
    return [base * 2 ** (s / 12) for s in steps]


# ───────────────────────── Osciladores y filtros ─────────────────────────

def t_axis(n: int) -> np.ndarray:
    return np.arange(n) / SR


def saw(f: float, n: int, detune: float = 0.0, phase: float = 0.0) -> np.ndarray:
    x = (t_axis(n) * f * (1 + detune) + phase) % 1.0
    return 2 * x - 1


def env_adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    e = np.full(n, float(s))
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na, nd = min(na, n), min(nd, max(0, n - na))
    e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    e[na:na + nd] = np.linspace(1, s, nd, endpoint=False) if nd else e[na:na + nd]
    if nr and n > nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, min(fc, SR * 0.45) / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, fc / (SR / 2), "high")
    return lfilter(b, a, x)


def bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def sweep_lp(x: np.ndarray, start: float, end: float, block: int = 1024) -> np.ndarray:
    """Filtro paso bajo cuya frecuencia sube o baja a lo largo del fragmento (aperturas de filtro)."""
    out = np.empty_like(x)
    zi = None
    n_blocks = max(1, len(x) // block + 1)
    for k in range(n_blocks):
        seg = x[k * block:(k + 1) * block]
        if not len(seg):
            break
        fc = start * (end / start) ** (k / n_blocks)
        b, a = butter(2, min(fc, SR * 0.45) / (SR / 2), "low")
        if zi is None:
            zi = np.zeros(max(len(a), len(b)) - 1)
        y, zi = lfilter(b, a, seg, zi=zi)
        out[k * block:k * block + len(seg)] = y
    return out


def reverb(x: np.ndarray, seconds: float = 2.2, mix: float = 0.25, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(x, ir)[:len(x)]
    return x * (1 - mix) + wet * mix


def delay(x: np.ndarray, seconds: float, feedback: float = 0.35, mix: float = 0.3) -> np.ndarray:
    d = int(seconds * SR)
    y = x.copy()
    for k in range(1, 5):
        if d * k >= len(x):
            break
        y[d * k:] += x[:-d * k] * (feedback ** k)
    return x * (1 - mix) + y * mix


# ───────────────────────── Instrumentos ─────────────────────────

def kick(punch: float = 1.0) -> np.ndarray:
    n = int(0.45 * SR)
    t = t_axis(n)
    f = 46 + 110 * np.exp(-t * 32) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) + 0.15 * np.exp(-t * 250) * np.random.default_rng(3).standard_normal(n)


def snare(tone: float = 190) -> np.ndarray:
    n = int(0.3 * SR)
    t = t_axis(n)
    noise = bp(np.random.default_rng(4).standard_normal(n), 1200, 8000) * np.exp(-t * 16)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 28)
    return noise * 0.8 + body * 0.5


def clap() -> np.ndarray:
    n = int(0.35 * SR)
    t = t_axis(n)
    noise = bp(np.random.default_rng(5).standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        k = int(off * SR)
        e[k:] += np.exp(-(t[:n - k]) * 60)
    e += 0.6 * np.exp(-t * 12)
    return noise * e


def hat(open_: bool = False, seed: int = 6) -> np.ndarray:
    n = int((0.25 if open_ else 0.06) * SR)
    t = t_axis(n)
    return hp(np.random.default_rng(seed).standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70))


def tick() -> np.ndarray:
    n = int(0.03 * SR)
    t = t_axis(n)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 220)


def pad(freqs: list[float], n: int, bright: float = 1800, attack: float = 0.6) -> np.ndarray:
    x = np.zeros(n)
    for i, f in enumerate(freqs):
        for det in (-0.006, 0.0, 0.007):
            x += saw(f, n, det, phase=(i * 0.13 + det * 10) % 1)
    x = lp(x / (len(freqs) * 3), bright)
    return x * env_adsr(n, attack, 0.3, 0.85, min(0.8, n / SR * 0.4))


def pluck(f: float, n: int, bright: float = 3500, decay: float = 9.0) -> np.ndarray:
    t = t_axis(n)
    x = saw(f, n) * 0.6 + saw(f * 2, n, 0.003) * 0.25
    return lp(x, bright) * np.exp(-t * decay)


def bell(f: float, n: int) -> np.ndarray:
    t = t_axis(n)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.4)


def bass(f: float, n: int, cutoff: float = 600, sub: float = 0.6) -> np.ndarray:
    t = t_axis(n)
    x = lp(saw(f, n), cutoff) * 0.7 + np.sin(2 * np.pi * f * t) * sub
    return x * env_adsr(n, 0.004, 0.08, 0.7, 0.03)


def piano(f: float, n: int) -> np.ndarray:
    t = t_axis(n)
    x = sum(np.sin(2 * np.pi * f * h * t) * a * np.exp(-t * (2.0 + h * 1.4)) for h, a in ((1, 1), (2, 0.45), (3, 0.22), (4, 0.12)))
    return x * env_adsr(n, 0.003, 0.1, 1, 0.08)


def riser(n: int) -> np.ndarray:
    noise = np.random.default_rng(8).standard_normal(n)
    return sweep_lp(noise, 300, 9000) * np.linspace(0, 1, n) ** 2


# ───────────────────────── Secuenciador ─────────────────────────

class Track:
    def __init__(self, bpm: float, bars: int):
        self.bpm = bpm
        self.beat = 60 / bpm
        self.n = int(bars * 4 * self.beat * SR) + SR * 3
        self.bus = {k: np.zeros(self.n) for k in ("drums", "bass", "music", "fx")}
        self.kicks: list[int] = []

    def at(self, bar: float, beat: float = 0) -> int:
        return int(((bar * 4) + beat) * self.beat * SR)

    def put(self, bus: str, x: np.ndarray, start: int, gain: float = 1.0) -> None:
        if start >= self.n:
            return
        end = min(self.n, start + len(x))
        self.bus[bus][start:end] += x[:end - start] * gain

    def kick_at(self, pos: int, gain: float = 1.0) -> None:
        self.kicks.append(pos)
        self.put("drums", kick(), pos, gain)

    def sidechain(self, depth: float = 0.6) -> np.ndarray:
        g = np.ones(self.n)
        rel = int(self.beat * 0.6 * SR)
        shape = 1 - depth * np.exp(-np.linspace(0, 5, rel))
        for k in self.kicks:
            end = min(self.n, k + rel)
            g[k:end] = np.minimum(g[k:end], shape[:end - k])
        return g

    def mix(self, levels: dict[str, float], sc_depth: float = 0.55, verb: float = 0.22, seed: int = 1) -> np.ndarray:
        sc = self.sidechain(sc_depth) if self.kicks else 1.0
        music = reverb(self.bus["music"] * sc, mix=verb, seed=seed)
        mono = (self.bus["drums"] * levels.get("drums", 1) + self.bus["bass"] * sc * levels.get("bass", 1)
                + music * levels.get("music", 1) + reverb(self.bus["fx"], 3.0, 0.4, seed) * levels.get("fx", 1))
        # Estéreo: la música se abre con un pequeño retardo entre canales; bombo y bajo quedan en el centro
        wide = np.roll(music * levels.get("music", 1), int(0.012 * SR)) * 0.35
        left, right = mono + wide, mono - wide
        st = np.stack([left, right])
        st = np.tanh(st / (np.max(np.abs(st)) + 1e-9) * 1.6)  # saturación suave tipo cinta
        fade = int(2.5 * SR)
        st[:, -fade:] *= np.linspace(1, 0, fade)
        return st


def section(bar: int, plan: list[tuple[int, str]]) -> str:
    cur = plan[0][1]
    for start, name in plan:
        if bar >= start:
            cur = name
    return cur


# ───────────────────────── Pistas ─────────────────────────

def tech_pulse() -> np.ndarray:
    tr = Track(122, 44)
    prog = [chord("A", "m9", 3), chord("F", "M9", 3), chord("C", "M9", 3), chord("G", "sus", 3)]
    roots = [hz("A1"), hz("F1"), hz("C2"), hz("G1")]
    plan = [(0, "intro"), (4, "build"), (8, "main"), (24, "break"), (28, "main2"), (40, "outro")]
    for bar in range(44):
        sec = section(bar, plan)
        c = prog[(bar // 2) % 4]
        r = roots[(bar // 2) % 4]
        if sec != "break" and bar % 2 == 0:
            tr.put("music", pad(c, tr.at(2), bright=900 if sec in {"intro", "outro"} else 1700), tr.at(bar), 0.5)
        if sec == "break":
            if bar % 2 == 0:
                tr.put("music", pad(c, tr.at(2), bright=2600, attack=1.2), tr.at(bar), 0.6)
            if bar == 27:
                tr.put("fx", riser(tr.at(1)), tr.at(bar), 0.5)
        for b in range(4):
            if sec in {"build", "main", "main2", "outro"} or (sec == "intro" and bar >= 2):
                if not (sec == "intro" and b % 2):
                    tr.kick_at(tr.at(bar, b), 0.9)
            if sec in {"main", "main2", "build"}:
                tr.put("drums", hat(seed=bar * 4 + b), tr.at(bar, b + 0.5), 0.35)
            if sec in {"main", "main2"} and b in (1, 3):
                tr.put("drums", clap(), tr.at(bar, b), 0.45)
        if sec in {"main", "main2"}:
            for s in range(16):
                if s % 4 != 0:
                    tr.put("bass", bass(r * (2 if s % 8 == 6 else 1), int(tr.beat / 4 * SR * 0.9), cutoff=420 + 260 * (s % 3)), tr.at(bar, s / 4), 0.55)
            if sec == "main2":
                for s in (0, 3, 6, 10, 12):
                    tr.put("music", pluck(c[s % len(c)] * 2, int(0.4 * SR)), tr.at(bar, s / 4), 0.22)
    return tr.mix({"drums": 0.9, "bass": 0.8, "music": 0.75, "fx": 0.6}, seed=2)


def synthwave_drive() -> np.ndarray:
    tr = Track(100, 36)
    prog = [chord("D", "m", 3), chord("A#", "M", 2), chord("F", "M", 3), chord("C", "M", 3)]
    roots = [hz("D2"), hz("A#1"), hz("F1"), hz("C2")]
    plan = [(0, "intro"), (4, "main"), (20, "break"), (24, "main"), (32, "outro")]
    for bar in range(36):
        sec = section(bar, plan)
        c, r = prog[bar % 4], roots[bar % 4]
        tr.put("music", pad(c, tr.at(1), bright=1400 if sec == "intro" else 2200, attack=0.3), tr.at(bar), 0.45)
        arp = [c[0] * 2, c[1] * 2, c[2] * 2, c[1] * 4]
        for s in range(16):
            if sec != "intro" or bar >= 2:
                tr.put("music", pluck(arp[s % 4], int(0.18 * SR), bright=2800 + 1800 * (sec == "main"), decay=14), tr.at(bar, s / 4), 0.22)
        if sec in {"main", "outro"}:
            for b in range(4):
                tr.kick_at(tr.at(bar, b), 0.8) if b in (0, 2) else None
                if b in (1, 3):
                    tr.put("drums", reverb(snare(180), 1.2, 0.45), tr.at(bar, b), 0.55)
                tr.put("drums", hat(seed=b + bar), tr.at(bar, b + 0.5), 0.25)
            for s in range(8):
                tr.put("bass", bass(r, int(tr.beat / 2 * SR * 0.85), cutoff=700), tr.at(bar, s / 2), 0.55)
        if bar == 23:
            tr.put("fx", riser(tr.at(1)), tr.at(bar), 0.5)
    return tr.mix({"drums": 0.85, "bass": 0.8, "music": 0.8, "fx": 0.6}, sc_depth=0.4, verb=0.3, seed=3)


def cinematic_rise() -> np.ndarray:
    tr = Track(80, 28)
    prog = [chord("C", "m", 3), chord("G#", "M", 2), chord("D#", "M", 3), chord("A#", "M", 2)]
    motif = ["G4", "D#4", "C4", "D#4", "G4", "G#4", "G4", "D#4"]
    for bar in range(28):
        c = prog[(bar // 2) % 4]
        if bar % 2 == 0:
            tr.put("music", pad(c, tr.at(2), bright=900 + 90 * bar, attack=1.4), tr.at(bar), 0.6)
            tr.put("bass", np.sin(2 * np.pi * c[0] / 2 * t_axis(tr.at(2))) * env_adsr(tr.at(2), 1.0, 0.5, 0.8, 1.0), tr.at(bar), 0.5)
        if bar >= 4:
            for i, note in enumerate(motif[:4] if bar % 2 == 0 else motif[4:]):
                tr.put("music", bell(hz(note), int(1.6 * SR)), tr.at(bar, i), 0.13)
        if bar >= 8 and bar % 2 == 0:
            boom = kick(1.6)
            tr.put("drums", reverb(np.concatenate([boom, np.zeros(SR)]), 2.5, 0.5), tr.at(bar), 0.9)
        if bar >= 16:
            for b in range(4):
                tr.put("drums", reverb(snare(120), 1.5, 0.35) * 0.6, tr.at(bar, b + 0.5), 0.25 if b % 2 else 0.12)
        if bar in (7, 15, 23):
            tr.put("fx", riser(tr.at(1)), tr.at(bar), 0.6)
    return tr.mix({"drums": 0.8, "bass": 0.9, "music": 0.9, "fx": 0.7}, verb=0.35, seed=4)


def cyber_noir() -> np.ndarray:
    tr = Track(90, 32)
    prog = [chord("E", "m", 2), chord("C", "M", 2), chord("D", "sus", 2), chord("B", "m", 2)]
    for bar in range(32):
        c = prog[(bar // 2) % 4]
        if bar % 2 == 0:
            tr.put("music", pad(c, tr.at(2), bright=700, attack=0.9), tr.at(bar), 0.55)
        tr.put("bass", bass(c[0] / 2, tr.at(1) - 200, cutoff=260, sub=0.9), tr.at(bar), 0.6)
        if bar >= 4:
            tr.kick_at(tr.at(bar, 0), 0.95)
            tr.put("drums", reverb(snare(160), 1.8, 0.5), tr.at(bar, 2), 0.6)
            for s in range(16):
                if (s * 7 + bar) % 5 < 3:
                    tr.put("drums", hat(seed=s + bar * 16) * (1.0 if s % 2 else 0.5), tr.at(bar, s / 4), 0.22)
        if bar >= 8 and bar % 4 == 0:
            for i, n in enumerate(["B4", "G4", "E4"]):
                tr.put("music", delay(bell(hz(n), int(1.2 * SR)), tr.beat * 0.75, 0.45, 0.5), tr.at(bar, i * 1.5), 0.11)
    return tr.mix({"drums": 0.85, "bass": 0.9, "music": 0.8, "fx": 0.5}, sc_depth=0.35, verb=0.3, seed=5)


def uplift_corporate() -> np.ndarray:
    tr = Track(116, 40)
    prog = [chord("C", "M", 3), chord("G", "M", 3), chord("A", "m", 3), chord("F", "M", 3)]
    roots = [hz("C2"), hz("G1"), hz("A1"), hz("F1")]
    plan = [(0, "intro"), (4, "verse"), (12, "chorus"), (24, "verse"), (28, "chorus"), (38, "outro")]
    for bar in range(40):
        sec = section(bar, plan)
        c, r = prog[bar % 4], roots[bar % 4]
        for s in range(8):
            f = c[[0, 1, 2, 1, 3, 2, 1, 2][s]] * 2
            tr.put("music", pluck(f, int(0.35 * SR), bright=4200, decay=7), tr.at(bar, s / 2), 0.2)
        if sec in {"verse", "chorus"}:
            for b in range(4):
                tr.kick_at(tr.at(bar, b), 0.75)
                tr.put("drums", hat(seed=b), tr.at(bar, b + 0.5), 0.3)
                if b in (1, 3):
                    tr.put("drums", clap(), tr.at(bar, b), 0.4)
            tr.put("bass", bass(r, int(tr.beat * 4 * SR * 0.95), cutoff=500), tr.at(bar), 0.4)
        if sec == "chorus":
            tr.put("music", sum(piano(f, tr.at(1)) for f in c[:3]) / 3, tr.at(bar), 0.5)
            tr.put("music", pad([f * 2 for f in c[:3]], tr.at(1), bright=3000, attack=0.2), tr.at(bar), 0.18)
        if bar in (11, 27):
            tr.put("fx", riser(tr.at(1)), tr.at(bar), 0.5)
    return tr.mix({"drums": 0.8, "bass": 0.75, "music": 0.85, "fx": 0.5}, sc_depth=0.3, verb=0.2, seed=6)


def ambient_focus() -> np.ndarray:
    tr = Track(70, 24)
    prog = [chord("F", "M9", 3), chord("A", "m9", 3), chord("D", "m9", 3), chord("A#", "M9", 2)]
    melody = ["C5", "A4", "G4", "F4", "E4", "G4", "A4", "C5"]
    for bar in range(24):
        c = prog[(bar // 2) % 4]
        if bar % 2 == 0:
            tr.put("music", pad(c, tr.at(2) + SR, bright=1300, attack=2.0), tr.at(bar), 0.55)
        if bar >= 2:
            note = melody[bar % len(melody)]
            tr.put("music", delay(bell(hz(note), int(2.5 * SR)), tr.beat * 1.5, 0.5, 0.45), tr.at(bar, 1), 0.1)
            tr.put("music", piano(hz(note) / 2, int(2.0 * SR)), tr.at(bar, 3), 0.12)
    return tr.mix({"music": 1.0, "fx": 0.5}, verb=0.45, seed=7)


def news_ticker() -> np.ndarray:
    tr = Track(120, 36)
    prog = [chord("G", "m", 3), chord("D#", "M", 3), chord("A#", "M", 2), chord("F", "M", 3)]
    roots = [hz("G1"), hz("D#1"), hz("A#1"), hz("F1")]
    for bar in range(36):
        c, r = prog[(bar // 2) % 4], roots[(bar // 2) % 4]
        for s in range(16):
            tr.put("drums", tick(), tr.at(bar, s / 4), 0.18 if s % 4 else 0.3)
        if bar >= 2:
            for s in (0, 1.5, 2, 3, 3.5):
                tr.put("music", pluck(c[int(s * 2) % len(c)] * 2, int(0.22 * SR), bright=2200, decay=16), tr.at(bar, s), 0.28)
        if bar >= 4:
            tr.kick_at(tr.at(bar, 0), 0.85)
            tr.kick_at(tr.at(bar, 2.5), 0.6)
            tr.put("drums", snare(200), tr.at(bar, 1), 0.3)
            tr.put("drums", snare(200), tr.at(bar, 3), 0.35)
            for s in range(8):
                tr.put("bass", bass(r, int(tr.beat / 2 * SR * 0.7), cutoff=520), tr.at(bar, s / 2), 0.5)
        if bar % 4 == 0:
            tr.put("music", pad(c, tr.at(2), bright=1100, attack=0.5), tr.at(bar), 0.3)
    return tr.mix({"drums": 0.8, "bass": 0.85, "music": 0.8, "fx": 0.5}, sc_depth=0.45, verb=0.18, seed=8)


def deep_house() -> np.ndarray:
    tr = Track(118, 40)
    prog = [chord("A", "m9", 3), chord("D", "m9", 3), chord("G", "M9", 2), chord("C", "M9", 3)]
    roots = [hz("A1"), hz("D2"), hz("G1"), hz("C2")]
    plan = [(0, "intro"), (4, "main"), (20, "break"), (24, "main"), (36, "outro")]
    for bar in range(40):
        sec = section(bar, plan)
        c, r = prog[(bar // 2) % 4], roots[(bar // 2) % 4]
        for s in (0.75, 2.25, 3.5):
            stab = sum(pluck(f, int(0.28 * SR), bright=1600 if sec != "break" else 3200, decay=11) for f in c) / len(c)
            tr.put("music", stab, tr.at(bar, s), 0.45)
        if sec in {"main", "outro"}:
            for b in range(4):
                tr.kick_at(tr.at(bar, b), 0.9)
                tr.put("drums", hat(True, seed=b), tr.at(bar, b + 0.5), 0.2)
                tr.put("drums", hat(seed=b + 7), tr.at(bar, b + 0.75), 0.12)
                if b in (1, 3):
                    tr.put("drums", clap(), tr.at(bar, b), 0.35)
            for s in (0, 0.75, 1.5, 2.5, 3.0):
                tr.put("bass", bass(r * (1.5 if s == 2.5 else 1), int(tr.beat * 0.6 * SR), cutoff=380, sub=0.8), tr.at(bar, s), 0.55)
        if sec == "break" and bar % 2 == 0:
            tr.put("music", pad(c, tr.at(2), bright=2000, attack=1.0), tr.at(bar), 0.5)
        if bar == 23:
            tr.put("fx", riser(tr.at(1)), tr.at(bar), 0.45)
    return tr.mix({"drums": 0.85, "bass": 0.85, "music": 0.75, "fx": 0.5}, sc_depth=0.55, verb=0.2, seed=9)


TRACKS = {
    "tb-tech-pulse": tech_pulse,
    "tb-synthwave-drive": synthwave_drive,
    "tb-cinematic-rise": cinematic_rise,
    "tb-cyber-noir": cyber_noir,
    "tb-uplift-corporate": uplift_corporate,
    "tb-ambient-focus": ambient_focus,
    "tb-news-ticker": news_ticker,
    "tb-deep-house": deep_house,
}


def save(path: Path, st: np.ndarray) -> None:
    wav = path.with_suffix(".wav")
    pcm = (np.clip(st * 0.89, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.T.reshape(-1).tobytes())
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "44100", "-b:a", "192k", str(path)], check=True)
    wav.unlink()
    print(f"{path.name:28s} {st.shape[1] / SR:.0f}s")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/music")
    only = set(sys.argv[2:])
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in TRACKS.items():
        if only and name not in only:
            continue
        save(out / f"{name}.mp3", fn())


if __name__ == "__main__":
    main()
