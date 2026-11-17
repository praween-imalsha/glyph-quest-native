import math, struct, wave, os, random
SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sfx")
GAIN = 7.0  # original WebAudio volumes are tiny (0.03); scale for phone speakers

def osc(kind, phase):
    p = phase % 1.0
    if kind == "square": return 1.0 if p < 0.5 else -1.0
    if kind == "sawtooth": return 2.0 * p - 1.0
    if kind == "triangle": return 4.0 * abs(p - 0.5) - 1.0
    return math.sin(2 * math.pi * p)

def tone(buf, freq, dur, delay=0.0, kind="square", volume=0.035, slide=1.0):
    start = int(delay * SR)
    n = int((dur + 0.02) * SR)
    phase = 0.0
    f0 = max(30.0, freq)
    f1 = max(30.0, freq * slide)
    for i in range(n):
        t = i / SR
        if slide != 1.0 and t < dur:
            f = f0 * (f1 / f0) ** (t / dur)
        elif slide != 1.0:
            f = f1
        else:
            f = f0
        phase += f / SR
        # envelope: 0.0001 -> volume in 8ms (exp), then -> 0.0001 at dur (exp)
        if t < 0.008:
            env = 0.0001 * (volume / 0.0001) ** (t / 0.008)
        elif t < dur:
            env = volume * (0.0001 / volume) ** ((t - 0.008) / max(1e-6, dur - 0.008))
        else:
            env = 0.0
        idx = start + i
        while idx >= len(buf):
            buf.extend([0.0] * SR)
        buf[idx] += osc(kind, phase) * env * GAIN

def arp(buf, freqs, step=0.075, **kw):
    for i, f in enumerate(freqs):
        tone(buf, f, step * 1.7, i * step, **kw)

def save(name, buf):
    # trim trailing silence, soft-clip
    last = max((i for i, v in enumerate(buf) if abs(v) > 1e-4), default=0) + 200
    data = buf[:last]
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(max(-1, min(1, math.tanh(v))) * 32000)) for v in data)
        w.writeframes(frames)
    print(name, round(len(data) / SR, 2), "s", os.path.getsize(path), "bytes")

def mk(fn):
    b = []
    fn(b)
    return b

S = {}
S["menu"]    = lambda b: tone(b, 440, 0.05, 0, volume=0.025)
S["select"]  = lambda b: arp(b, [523, 784], 0.05, volume=0.03)
S["start"]   = lambda b: arp(b, [392, 523, 659, 784], 0.075, volume=0.032)
S["glyph"]   = lambda b: arp(b, [1046, 1318, 1568], 0.055, volume=0.032)
S["door"]    = lambda b: arp(b, [523, 659, 784, 1046, 1318], 0.08, volume=0.034)
def clear(b):
    arp(b, [523, 659, 784, 1046, 988, 1318], 0.1, volume=0.036)
    tone(b, 1568, 0.24, 0.6, volume=0.028)
S["clear"] = clear
def hurt(b):
    tone(b, 180, 0.18, 0, slide=0.4, volume=0.055, kind="sawtooth")
    tone(b, 90, 0.2, 0.07, slide=0.5, volume=0.045, kind="square")
S["hurt"] = hurt
S["dead"]    = lambda b: arp(b, [392, 330, 262, 196, 131], 0.15, volume=0.045, kind="triangle")
S["dash"]    = lambda b: tone(b, 320, 0.09, 0, slide=2.4, volume=0.026, kind="square")
S["hint"]    = lambda b: arp(b, [880, 1175], 0.07, volume=0.025, kind="triangle")
S["pause"]   = lambda b: arp(b, [523, 392], 0.06, volume=0.028)
def victory(b):
    arp(b, [523, 659, 784, 1046, 1318, 1568, 2093], 0.12, volume=0.04)
    tone(b, 1046, 0.5, 0.9, volume=0.03, kind="triangle")
    tone(b, 1318, 0.6, 0.95, volume=0.025, kind="triangle")
S["victory"] = victory

for name, fn in S.items():
    save(name, mk(fn))
