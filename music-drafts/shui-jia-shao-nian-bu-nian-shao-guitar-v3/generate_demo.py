from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np


SR = 24_000
BPM = 104
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 48
OUT = Path(__file__).with_name("shui-jia-shao-nian-bu-nian-shao-guitar-v3.wav")
RNG = np.random.default_rng(51566)


def hz(midi: int) -> float:
    return 440 * 2 ** ((midi - 69) / 12)


def stereo(signal: np.ndarray, pan: float) -> np.ndarray:
    angle = (pan + 1) * math.pi / 4
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle)))


def add(track: np.ndarray, clip: np.ndarray, seconds: float) -> None:
    start = int(seconds * SR)
    clip_start = 0
    if start < 0:
        clip_start = -start
        start = 0
    end = min(len(track), start + len(clip) - clip_start)
    if end > start:
        track[start:end] += clip[clip_start:clip_start + end - start]


def guitar_note(midi: int, duration: float, amp: float, pan: float, soft: bool = False) -> np.ndarray:
    n = int(duration * SR)
    t = np.arange(n) / SR
    frequency = hz(midi)
    signal = np.zeros(n)
    brightness = 1.44 if soft else 1.20
    for harmonic in range(1, 13):
        decay = np.exp(-t * (1.45 + harmonic * 0.31) * (frequency / 196) ** 0.12)
        phase = RNG.uniform(-0.10, 0.10)
        signal += np.sin(2 * math.pi * frequency * harmonic * t + phase) * decay / harmonic ** brightness

    pick = RNG.normal(0, 1, n) * np.exp(-t * (72 if soft else 54))
    body = (
        np.sin(2 * math.pi * 96 * t) * np.exp(-t * 7.2)
        + 0.38 * np.sin(2 * math.pi * 188 * t) * np.exp(-t * 8.8)
    )
    signal = signal * 0.50 + pick * (0.035 if soft else 0.055) + body * 0.055
    attack = max(1, int(0.003 * SR))
    release = min(n, max(1, int(0.12 * SR)))
    envelope = np.ones(n)
    envelope[:attack] *= np.linspace(0, 1, attack)
    envelope[-release:] *= np.linspace(1, 0, release)
    return stereo(signal * envelope * amp, pan)


def body_tap(amp: float, pan: float) -> np.ndarray:
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    signal = np.sin(2 * math.pi * (118 - 34 * t) * t) * np.exp(-t * 25)
    signal += RNG.normal(0, 0.18, n) * np.exp(-t * 42)
    return stereo(signal * amp, pan)


def room(track: np.ndarray) -> np.ndarray:
    wet = track.copy()
    for seconds, gain, swap in ((0.075, 0.06, True), (0.16, 0.047, False), (0.29, 0.027, True)):
        delay = int(seconds * SR)
        source = track[:-delay, ::-1] if swap else track[:-delay]
        wet[delay:] += source * gain
    return wet


CHORDS = {
    "G": [43, 50, 55, 59, 62, 67],
    "D/F#": [42, 45, 50, 57, 62, 66],
    "Em7": [40, 47, 52, 55, 59, 64],
    "Cadd9": [48, 55, 60, 62, 64, 67],
    "D": [50, 57, 62, 66, 69],
    "Am7": [45, 52, 55, 60, 64],
    "Bm7": [47, 54, 57, 62, 66],
}


VERSE = ["G", "D/F#", "Em7", "Cadd9", "G", "D", "Cadd9", "D"]
PRE = ["Am7", "Bm7", "Cadd9", "D"]
CHORUS = ["G", "D", "Em7", "Cadd9", "G", "Am7", "Cadd9", "D"]


def fingerpick(track: np.ndarray, chord_name: str, bar: int, energy: float = 1) -> None:
    chord = CHORDS[chord_name]
    pattern = [0, 2, 3, 4, 1, 3, 4, 3]
    for step, string_index in enumerate(pattern):
        human = RNG.uniform(-0.008, 0.008)
        amp = (0.050 if step in (0, 4) else 0.038) * energy * RNG.uniform(0.94, 1.05)
        pan = -0.24 + string_index * 0.085
        add(track, guitar_note(chord[string_index], BEAT * 1.15, amp, pan, soft=True), bar * BAR + step * BEAT / 2 + human)


def strum(track: np.ndarray, chord_name: str, bar: int, energy: float = 1) -> None:
    chord = CHORDS[chord_name]
    strokes = [(0, True, 1.0), (1, True, .68), (1.5, False, .58), (2.5, False, .62), (3, True, .82), (3.5, False, .58)]
    for beat_pos, down, strength in strokes:
        notes = chord if down else list(reversed(chord[1:]))
        for index, midi in enumerate(notes):
            delay = index * (0.014 if down else 0.011)
            pan = -0.32 + index * 0.12
            add(track, guitar_note(midi, BEAT * 1.15, 0.031 * strength * energy, pan), bar * BAR + beat_pos * BEAT + delay)
    add(track, body_tap(0.020 * energy, -0.06), bar * BAR + 2 * BEAT)


def lead(track: np.ndarray, bar: int, notes: list[tuple[int, float]], amp: float = 0.055) -> None:
    cursor = bar * BAR
    for midi, beats in notes:
        length = beats * BEAT
        add(track, guitar_note(midi, length * 1.12, amp, 0.30, soft=True), cursor)
        cursor += length


THEME_A = [
    [(67, 1), (69, .5), (71, .5), (74, 1), (71, 1)],
    [(69, .5), (71, .5), (74, 1), (76, 1), (74, 1)],
    [(71, .5), (74, .5), (76, 1), (79, 1), (76, .5), (74, .5)],
    [(71, 1), (69, .5), (67, .5), (74, 2)],
    [(67, .5), (69, .5), (71, 1), (74, .5), (76, .5), (79, 1)],
    [(76, 1), (74, .5), (71, .5), (69, 1), (71, 1)],
    [(74, .5), (76, .5), (79, 1), (76, .5), (74, .5), (71, 1)],
    [(69, .5), (71, .5), (69, .5), (67, .5), (67, 2)],
]


THEME_B = [
    [(71, .5), (74, .5), (76, 1), (79, 1), (81, 1)],
    [(79, 1), (76, .5), (74, .5), (71, 1), (74, 1)],
    [(76, .5), (79, .5), (81, 1), (79, .5), (76, .5), (74, 1)],
    [(71, 1), (69, .5), (67, .5), (74, 2)],
    [(67, .5), (69, .5), (71, 1), (74, 1), (76, 1)],
    [(79, 1), (76, .5), (74, .5), (71, 1), (69, 1)],
    [(71, .5), (74, .5), (76, 1), (74, .5), (71, .5), (69, 1)],
    [(67, 1), (69, .5), (67, .5), (67, 2)],
]


def build() -> np.ndarray:
    samples = int((BARS + 1) * BAR * SR)
    track = np.zeros((samples, 2))

    # 4-bar intro, 8-bar verse, 4-bar lift, 8-bar chorus, 4-bar interlude,
    # 8-bar second verse, 8-bar final chorus, 4-bar outro.
    sections = [
        (0, ["G", "D/F#", "Em7", "Cadd9"], "finger", .70),
        (4, VERSE, "finger", .82),
        (12, PRE, "finger", .94),
        (16, CHORUS, "strum", .94),
        (24, ["G", "D", "Em7", "Cadd9"], "finger", .78),
        (28, VERSE, "finger", .90),
        (36, CHORUS, "strum", 1.00),
    ]
    for start, progression, style, energy in sections:
        for offset, chord in enumerate(progression):
            (fingerpick if style == "finger" else strum)(track, chord, start + offset, energy)

    # The final four bars relax into the first chord and are also used for the circular overlap.
    for offset, chord in enumerate(["G", "D/F#", "Cadd9", "G"]):
        fingerpick(track, chord, 44 + offset, .58)
    fingerpick(track, "G", 48, .58)

    for start, theme, amp in ((0, THEME_A[:4], .044), (16, THEME_A, .054), (24, THEME_A[:4], .047), (36, THEME_B, .058), (44, THEME_A[:4], .038)):
        for offset, notes in enumerate(theme):
            lead(track, start + offset, notes, amp)

    track = room(track)
    loop_samples = int(BARS * BAR * SR)
    overlap = int(BAR * SR)
    result = track[:loop_samples].copy()
    fade = np.linspace(0, 1, overlap)[:, None]
    result[:overlap] = track[loop_samples:loop_samples + overlap] * (1 - fade) + result[:overlap] * fade
    result = np.tanh(result * 1.25)
    result *= 0.76 / max(np.max(np.abs(result)), 1e-9)
    return result


def write(audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(OUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(pcm.tobytes())


if __name__ == "__main__":
    write(build())
    print(OUT)
