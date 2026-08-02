from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 24_000
BPM = 68
BEAT = 60.0 / BPM
BAR = BEAT * 4
BARS = 32
OVERLAP_BARS = 1
OUTPUT = Path(__file__).with_name("yunyue-shop-deng-wei-mian-v1.wav")
RNG = np.random.default_rng(8000)


NOTE = {
    "A2": 110.00,
    "Bb2": 116.54,
    "C3": 130.81,
    "D3": 146.83,
    "F3": 174.61,
    "G3": 196.00,
    "A3": 220.00,
    "C4": 261.63,
    "D4": 293.66,
    "F4": 349.23,
    "G4": 392.00,
    "A4": 440.00,
    "C5": 523.25,
    "D5": 587.33,
    "F5": 698.46,
}


def stereo(signal: np.ndarray, pan: float) -> np.ndarray:
    angle = (pan + 1.0) * math.pi / 4.0
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle)))


def add_clip(track: np.ndarray, clip: np.ndarray, start_seconds: float) -> None:
    start = int(start_seconds * SAMPLE_RATE)
    end = min(start + len(clip), len(track))
    if end > start:
        track[start:end] += clip[: end - start]


def soft_envelope(length: int, attack: float, release: float) -> np.ndarray:
    env = np.ones(length, dtype=np.float64)
    attack_samples = min(length, max(1, int(attack * SAMPLE_RATE)))
    release_samples = min(length, max(1, int(release * SAMPLE_RATE)))
    env[:attack_samples] *= np.sin(np.linspace(0, math.pi / 2, attack_samples)) ** 2
    env[-release_samples:] *= np.cos(np.linspace(0, math.pi / 2, release_samples)) ** 2
    return env


def xiao(freq: float, duration: float, amplitude: float, pan: float) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    vibrato = 0.014 * np.sin(2 * math.pi * 5.1 * t) * (1 - np.exp(-3.0 * t))
    phase = 2 * math.pi * freq * t + vibrato
    tone = (
        np.sin(phase)
        + 0.20 * np.sin(2 * phase + 0.22)
        + 0.07 * np.sin(3 * phase + 0.48)
    )
    breath = RNG.normal(0, 1, n) * (0.035 + 0.018 * np.sin(2 * math.pi * 0.7 * t))
    envelope = soft_envelope(n, min(0.24, duration * 0.2), min(0.42, duration * 0.28))
    return stereo((tone * 0.78 + breath) * envelope * amplitude, pan)


def guqin(freq: float, duration: float, amplitude: float, pan: float) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    signal = np.zeros(n, dtype=np.float64)
    for harmonic in range(1, 9):
        phase = RNG.uniform(-0.12, 0.12)
        decay = np.exp(-t * (1.22 + harmonic * 0.48))
        signal += (1 / harmonic ** 1.32) * np.sin(2 * math.pi * freq * harmonic * t + phase) * decay
    touch = RNG.normal(0, 1, n) * np.exp(-t * 34) * 0.13
    envelope = soft_envelope(n, 0.008, min(0.18, duration * 0.2))
    return stereo((signal * 0.60 + touch) * envelope * amplitude, pan)


def warm_pad(freq: float, duration: float, amplitude: float, pan: float) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    slow = 0.96 + 0.04 * np.sin(2 * math.pi * 0.11 * t)
    signal = (
        np.sin(2 * math.pi * freq * t)
        + 0.36 * np.sin(2 * math.pi * freq * 2 * t + 0.4)
        + 0.15 * np.sin(2 * math.pi * freq * 3 * t + 0.8)
    )
    return stereo(signal * slow * soft_envelope(n, 0.75, 0.9) * amplitude, pan)


def wood_click(amplitude: float, pan: float) -> np.ndarray:
    duration = 0.17
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    signal = (
        np.sin(2 * math.pi * 790 * t)
        + 0.55 * np.sin(2 * math.pi * 1185 * t)
        + RNG.normal(0, 0.13, n)
    ) * np.exp(-t * 31)
    return stereo(signal * amplitude, pan)


def add_reverb(track: np.ndarray) -> np.ndarray:
    wet = track.copy()
    for seconds, gain, cross in ((0.19, 0.11, False), (0.31, 0.075, True), (0.47, 0.045, False)):
        delay = int(seconds * SAMPLE_RATE)
        source = track[:-delay, ::-1] if cross else track[:-delay]
        wet[delay:] += source * gain
    return wet


def build() -> np.ndarray:
    total_bars = BARS + OVERLAP_BARS
    total_samples = int(total_bars * BAR * SAMPLE_RATE)
    music = np.zeros((total_samples, 2), dtype=np.float64)

    roots = ["D3", "C3", "Bb2", "A2"]
    fifths = ["A3", "G3", "F3", "A3"]
    for bar_index in range(total_bars):
        source_bar = bar_index % BARS
        progression = source_bar % 4
        start = bar_index * BAR
        section_gain = 0.55 if source_bar < 4 or source_bar >= 28 else 1.0
        add_clip(music, warm_pad(NOTE[roots[progression]], BAR + 0.2, 0.020 * section_gain, -0.25), start)
        add_clip(music, warm_pad(NOTE[fifths[progression]] / 2, BAR + 0.2, 0.012 * section_gain, 0.28), start)
        add_clip(music, guqin(NOTE[roots[progression]], BEAT * 1.65, 0.105 * section_gain, -0.36), start)
        add_clip(music, guqin(NOTE[fifths[progression]], BEAT * 1.35, 0.070 * section_gain, 0.34), start + 2 * BEAT)

        if 4 <= source_bar < 28 and source_bar % 2 == 1:
            add_clip(music, wood_click(0.024, 0.15), start + 2 * BEAT)

    # Each tuple is (note, length in beats). The melody uses only an original D-minor pentatonic palette.
    melody = [
        [("D4", 2), ("F4", 1), ("G4", 1)],
        [("A4", 2), ("G4", 1), ("F4", 1)],
        [("D4", 1), ("F4", 1), ("A4", 2)],
        [("C5", 1), ("A4", 1), ("G4", 2)],
        [("F4", 2), ("G4", 1), ("A4", 1)],
        [("D5", 2), ("C5", 1), ("A4", 1)],
        [("G4", 1), ("A4", 1), ("F4", 2)],
        [("D4", 4)],
        [("A4", 1), ("C5", 1), ("D5", 2)],
        [("F5", 2), ("D5", 1), ("C5", 1)],
        [("A4", 1), ("C5", 1), ("D5", 1), ("F5", 1)],
        [("D5", 2), ("C5", 2)],
        [("G4", 1), ("A4", 1), ("C5", 2)],
        [("D5", 1), ("C5", 1), ("A4", 2)],
        [("G4", 2), ("F4", 1), ("D4", 1)],
        [("A4", 1), ("G4", 1), ("D4", 2)],
        [("D4", 1), ("F4", 1), ("G4", 2)],
        [("A4", 1), ("C5", 1), ("A4", 2)],
        [("G4", 1), ("F4", 1), ("D4", 2)],
        [("F4", 1), ("G4", 1), ("A4", 2)],
        [("D5", 2), ("C5", 1), ("A4", 1)],
        [("G4", 2), ("F4", 2)],
        [("D4", 1), ("A4", 1), ("G4", 1), ("F4", 1)],
        [("D4", 4)],
    ]

    # Bars 1-4 are a sparse threshold; bars 5-28 carry the melody; bars 29-32 return to the lamp and wind.
    for rendered_bar in range(total_bars):
        source_bar = rendered_bar % BARS
        if 4 <= source_bar < 28:
            notes = melody[source_bar - 4]
            cursor = rendered_bar * BAR
            for note_name, beats in notes:
                duration = beats * BEAT
                add_clip(music, xiao(NOTE[note_name], duration * 0.96, 0.082, 0.10), cursor)
                cursor += duration
        elif source_bar in (1, 29):
            add_clip(music, xiao(NOTE["D4"], BEAT * 2.8, 0.042, 0.06), rendered_bar * BAR + BEAT * 0.6)
        elif source_bar in (3, 31):
            add_clip(music, xiao(NOTE["A4"], BEAT * 1.7, 0.034, 0.12), rendered_bar * BAR + BEAT * 1.2)

    # A very low, filtered wind bed keeps the loop boundary natural without becoming a sound effect.
    noise = RNG.normal(0, 1, total_samples)
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(total_samples, 1 / SAMPLE_RATE)
    spectrum *= np.exp(-((frequencies / 920.0) ** 2))
    wind = np.fft.irfft(spectrum, n=total_samples)
    wind /= max(np.max(np.abs(wind)), 1e-9)
    t = np.arange(total_samples) / SAMPLE_RATE
    wind *= 0.0045 * (0.74 + 0.26 * np.sin(2 * math.pi * t / (BAR * 4)) ** 2)
    music += stereo(wind, -0.05)

    music = add_reverb(music)

    # Circular overlap: the extra first bar is blended into the beginning so repeat playback has no hard seam.
    loop_samples = int(BARS * BAR * SAMPLE_RATE)
    overlap_samples = int(OVERLAP_BARS * BAR * SAMPLE_RATE)
    result = music[:loop_samples].copy()
    fade_to_opening = np.linspace(0, 1, overlap_samples, dtype=np.float64)[:, None]
    result[:overlap_samples] = (
        music[loop_samples:loop_samples + overlap_samples] * (1 - fade_to_opening)
        + result[:overlap_samples] * fade_to_opening
    )

    result = np.tanh(result * 1.35)
    peak = max(np.max(np.abs(result)), 1e-9)
    return result * (0.82 / peak)


def write_wave(audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(OUTPUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


if __name__ == "__main__":
    write_wave(build())
    print(OUTPUT)
