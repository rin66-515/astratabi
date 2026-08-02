from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 24_000
BPM = 104
BEAT = 60.0 / BPM
BAR = BEAT * 4
BARS = 48
OUTPUT = Path(__file__).with_name("yunyue-shop-shui-jia-shao-nian-bu-nian-shao-v2.wav")
RNG = np.random.default_rng(5158000)


NOTE = {
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "G3": 196.00, "A3": 220.00,
    "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.00,
    "A4": 440.00, "B4": 493.88, "D5": 587.33, "E5": 659.25, "G5": 783.99,
    "A5": 880.00, "B5": 987.77,
}


def stereo(signal: np.ndarray, pan: float) -> np.ndarray:
    angle = (pan + 1) * math.pi / 4
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle)))


def add(track: np.ndarray, clip: np.ndarray, seconds: float) -> None:
    start = int(seconds * SAMPLE_RATE)
    end = min(len(track), start + len(clip))
    if end > start:
        track[start:end] += clip[: end - start]


def envelope(length: int, attack: float, release: float) -> np.ndarray:
    env = np.ones(length)
    a = min(length, max(1, int(attack * SAMPLE_RATE)))
    r = min(length, max(1, int(release * SAMPLE_RATE)))
    env[:a] *= np.sin(np.linspace(0, math.pi / 2, a)) ** 2
    env[-r:] *= np.cos(np.linspace(0, math.pi / 2, r)) ** 2
    return env


def dizi(freq: float, duration: float, amp: float, pan: float, lift: bool = False) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    vibrato = 0.012 * np.sin(2 * math.pi * 5.7 * t) * (1 - np.exp(-5 * t))
    if lift:
        vibrato += 0.020 * np.sin(math.pi * np.minimum(t / 0.12, 1))
    phase = 2 * math.pi * freq * t + vibrato
    tone = (
        np.sin(phase)
        + 0.29 * np.sin(2 * phase + 0.18)
        + 0.13 * np.sin(3 * phase + 0.43)
        + 0.045 * np.sin(5 * phase + 0.70)
    )
    breath = RNG.normal(0, 1, n) * 0.026
    flutter = 0.97 + 0.03 * np.sin(2 * math.pi * 8.3 * t)
    sig = (tone * flutter + breath) * envelope(n, min(0.055, duration * 0.16), min(0.16, duration * 0.24))
    return stereo(sig * amp, pan)


def ruan(freq: float, duration: float, amp: float, pan: float) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    sig = np.zeros(n)
    for h in range(1, 8):
        sig += (1 / h ** 1.18) * np.sin(2 * math.pi * freq * h * t + RNG.uniform(-0.08, 0.08)) * np.exp(-t * (2.5 + h * 0.56))
    sig += RNG.normal(0, 0.055, n) * np.exp(-t * 42)
    return stereo(sig * envelope(n, 0.004, 0.09) * amp, pan)


def bright_pad(freq: float, duration: float, amp: float, pan: float) -> np.ndarray:
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    sig = (
        np.sin(2 * math.pi * freq * t)
        + 0.27 * np.sin(2 * math.pi * freq * 2 * t + 0.27)
        + 0.10 * np.sin(2 * math.pi * freq * 3 * t + 0.62)
    )
    sig *= 0.95 + 0.05 * np.sin(2 * math.pi * 0.17 * t)
    return stereo(sig * envelope(n, 0.35, 0.46) * amp, pan)


def low_drum(amp: float, pan: float = 0) -> np.ndarray:
    duration = 0.30
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    phase = 2 * math.pi * (82 * t - 28 * t * t)
    sig = np.sin(phase) * np.exp(-t * 19) + RNG.normal(0, 0.11, n) * np.exp(-t * 34)
    return stereo(sig * amp, pan)


def wood(amp: float, pan: float) -> np.ndarray:
    duration = 0.12
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    sig = (np.sin(2 * math.pi * 1060 * t) + 0.42 * np.sin(2 * math.pi * 1590 * t)) * np.exp(-t * 38)
    sig += RNG.normal(0, 0.18, n) * np.exp(-t * 50)
    return stereo(sig * amp, pan)


def bell(amp: float, pan: float) -> np.ndarray:
    duration = 1.0
    n = int(duration * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    sig = sum(
        weight * np.sin(2 * math.pi * freq * t) * np.exp(-t * decay)
        for freq, weight, decay in ((1320, 1.0, 3.3), (1984, 0.38, 4.1), (2510, 0.18, 4.8))
    )
    return stereo(sig * amp, pan)


def reverb(track: np.ndarray) -> np.ndarray:
    wet = track.copy()
    for seconds, gain, swap in ((0.13, 0.075, True), (0.23, 0.058, False), (0.37, 0.032, True)):
        delay = int(seconds * SAMPLE_RATE)
        source = track[:-delay, ::-1] if swap else track[:-delay]
        wet[delay:] += source * gain
    return wet


def render_melody(track: np.ndarray, bar_index: int, notes: list[tuple[str, float]], amp: float) -> None:
    cursor = bar_index * BAR
    for index, (name, beats) in enumerate(notes):
        length = beats * BEAT
        add(track, dizi(NOTE[name], length * 0.94, amp, 0.10, lift=index == 0), cursor)
        cursor += length


def build() -> np.ndarray:
    total_bars = BARS + 1
    total_samples = int(total_bars * BAR * SAMPLE_RATE)
    music = np.zeros((total_samples, 2))

    # G - D - Em - C, voiced as open fifths so the pentatonic melody stays spacious.
    roots = ["G3", "D3", "E3", "C3"]
    fifths = ["D4", "A3", "B3", "G3"]
    arpeggios = [
        ["G3", "D4", "G4", "D4", "B3", "D4", "G4", "D4"],
        ["D3", "A3", "D4", "A3", "D4", "A3", "D4", "A3"],
        ["E3", "B3", "E4", "B3", "G3", "B3", "E4", "B3"],
        ["C3", "G3", "C4", "G3", "E3", "G3", "C4", "G3"],
    ]

    for rendered_bar in range(total_bars):
        source_bar = rendered_bar % BARS
        chord = source_bar % 4
        start = rendered_bar * BAR
        intro = source_bar < 4 or source_bar >= 44
        energy = 0.54 if intro else (0.82 if source_bar < 12 else 1.0)

        add(music, bright_pad(NOTE[roots[chord]] / 2, BAR + 0.08, 0.013 * energy, -0.18), start)
        add(music, bright_pad(NOTE[fifths[chord]] / 2, BAR + 0.08, 0.008 * energy, 0.22), start)

        # Eight-note running strings: the constant forward step gives the young traveller his road.
        for step, note_name in enumerate(arpeggios[chord]):
            accent = 1.0 if step in (0, 4) else 0.72
            add(music, ruan(NOTE[note_name], BEAT * 0.78, 0.047 * energy * accent, -0.34 if step % 2 == 0 else 0.32), start + step * BEAT / 2)

        if not intro:
            add(music, low_drum(0.062 * energy), start)
            add(music, low_drum(0.042 * energy, -0.08), start + 2 * BEAT)
            for position, pan in ((0.75, 0.27), (1.5, -0.23), (2.75, 0.25), (3.5, -0.18)):
                add(music, wood(0.022 * energy, pan), start + position * BEAT)
        elif source_bar in (0, 44):
            add(music, bell(0.030, 0.30), start + 0.2)

    theme_a = [
        [("G4", 1), ("A4", .5), ("B4", .5), ("D5", 1), ("B4", 1)],
        [("A4", .5), ("B4", .5), ("D5", 1), ("E5", 1), ("D5", 1)],
        [("B4", .5), ("D5", .5), ("E5", 1), ("G5", 1), ("E5", .5), ("D5", .5)],
        [("B4", 1), ("A4", .5), ("G4", .5), ("D5", 2)],
        [("G4", .5), ("A4", .5), ("B4", 1), ("D5", .5), ("E5", .5), ("G5", 1)],
        [("E5", 1), ("D5", .5), ("B4", .5), ("A4", 1), ("B4", 1)],
        [("D5", .5), ("E5", .5), ("G5", 1), ("E5", .5), ("D5", .5), ("B4", 1)],
        [("A4", .5), ("B4", .5), ("A4", .5), ("G4", .5), ("G4", 2)],
    ]
    theme_b = [
        [("D5", .5), ("E5", .5), ("G5", 1), ("A5", 1), ("G5", 1)],
        [("E5", 1), ("D5", .5), ("E5", .5), ("B5", 1), ("A5", 1)],
        [("G5", .5), ("A5", .5), ("B5", 1), ("A5", .5), ("G5", .5), ("E5", 1)],
        [("D5", 1), ("B4", 1), ("D5", 2)],
        [("E5", .5), ("G5", .5), ("A5", 1), ("G5", .5), ("E5", .5), ("D5", 1)],
        [("B4", .5), ("D5", .5), ("E5", 1), ("G5", 1), ("E5", 1)],
        [("D5", 1), ("B4", .5), ("A4", .5), ("B4", 1), ("D5", 1)],
        [("A4", .5), ("B4", .5), ("D5", .5), ("B4", .5), ("G4", 2)],
    ]

    for start_bar, theme, amp in ((4, theme_a, 0.068), (12, theme_a, 0.073), (20, theme_b, 0.078), (28, theme_a, 0.075), (36, theme_b, 0.080)):
        for offset, bar_notes in enumerate(theme):
            render_melody(music, start_bar + offset, bar_notes, amp)

    # Two short calls at the threshold and at the road beyond the last lantern.
    render_melody(music, 2, [("G4", 1), ("B4", 1), ("D5", 2)], 0.043)
    render_melody(music, 44, [("D5", .5), ("E5", .5), ("G5", 1), ("D5", 2)], 0.047)
    render_melody(music, 46, [("B4", .5), ("A4", .5), ("G4", 3)], 0.040)

    # A much lighter wind than v1; it opens the landscape without slowing the rhythm.
    noise = RNG.normal(0, 1, total_samples)
    spectrum = np.fft.rfft(noise)
    hz = np.fft.rfftfreq(total_samples, 1 / SAMPLE_RATE)
    spectrum *= np.exp(-((hz / 1450) ** 2))
    wind = np.fft.irfft(spectrum, n=total_samples)
    wind /= max(np.max(np.abs(wind)), 1e-9)
    seconds = np.arange(total_samples) / SAMPLE_RATE
    wind *= 0.0022 * (0.72 + 0.28 * np.sin(2 * math.pi * seconds / (BAR * 8)) ** 2)
    music += stereo(wind, 0.06)

    music = reverb(music)

    loop_samples = int(BARS * BAR * SAMPLE_RATE)
    overlap_samples = int(BAR * SAMPLE_RATE)
    result = music[:loop_samples].copy()
    fade = np.linspace(0, 1, overlap_samples)[:, None]
    result[:overlap_samples] = music[loop_samples:loop_samples + overlap_samples] * (1 - fade) + result[:overlap_samples] * fade

    result = np.tanh(result * 1.18)
    result *= 0.78 / max(np.max(np.abs(result)), 1e-9)
    return result


def write(audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(OUTPUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


if __name__ == "__main__":
    write(build())
    print(OUTPUT)
