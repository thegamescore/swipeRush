// Synth sound effects. Web Audio only, no files to load.
const KEY = "swipeRush.muted";
let ac = null,
  out = null,
  noiseBuf = null,
  muted = false;
try {
  muted = localStorage.getItem(KEY) === "1";
} catch {}

// Lazy context. First call must come from user gesture or browser keeps it suspended.
function ctx() {
  if (muted) return null;
  if (!ac) {
    const A = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!A) return null;
    try {
      ac = new A();
      const comp = ac.createDynamicsCompressor();
      comp.connect(ac.destination);
      out = ac.createGain();
      out.gain.value = 0.55;
      out.connect(comp);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      ac = null;
      return null;
    }
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function env(g, t, vol, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone({
  freq,
  to = freq,
  dur = 0.15,
  type = "sine",
  vol = 0.2,
  delay = 0,
  attack = 0.005,
}) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, vol, attack, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise({
  dur = 0.2,
  filter = "bandpass",
  freq = 1000,
  to = freq,
  q = 1,
  vol = 0.2,
  delay = 0,
  attack = 0.005,
}) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay,
    src = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  src.buffer = noiseBuf;
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, vol, attack, dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.02);
}
const semi = (base, n) => base * 2 ** (n / 12);

export const sfx = {
  isMuted: () => muted,
  setMuted(next) {
    muted = next;
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    // Cut ringing tails right away.
    if (ac && next) ac.suspend();
  },
  // Gesture unlock. Call from click handlers.
  unlock() {
    ctx();
  },
  swipe(speed) {
    noise({
      dur: 0.17,
      freq: 500,
      to: 2800,
      q: 1.3,
      vol: Math.min(0.22, 0.08 + speed * 0.0015),
      attack: 0.02,
    });
  },
  // Pitch climbs with each hit in one stroke.
  slice(n) {
    const base = semi(520, Math.min(n - 1, 10) * 2);
    noise({ dur: 0.09, filter: "highpass", freq: 3000, to: 7000, vol: 0.16 });
    tone({ freq: base, to: base * 2, dur: 0.12, type: "triangle", vol: 0.15 });
    tone({ freq: 220, to: 80, dur: 0.1, vol: 0.14 });
  },
  bomb() {
    tone({ freq: 150, to: 36, dur: 0.6, vol: 0.55 });
    noise({
      dur: 0.5,
      filter: "lowpass",
      freq: 2200,
      to: 120,
      vol: 0.5,
      attack: 0.002,
    });
    tone({ freq: 95, to: 40, dur: 0.28, type: "square", vol: 0.08 });
  },
  combo(n) {
    [0, 4, 7, 12, 16, 19].slice(0, Math.min(n + 1, 6)).forEach((s, i) =>
      tone({
        freq: semi(660, s),
        dur: 0.18,
        type: "triangle",
        vol: 0.13,
        delay: 0.05 + i * 0.055,
      }),
    );
  },
  start() {
    tone({ freq: 440, dur: 0.1, type: "triangle", vol: 0.14 });
    tone({
      freq: 660,
      to: 880,
      dur: 0.18,
      type: "triangle",
      vol: 0.14,
      delay: 0.09,
    });
  },
  tick() {
    tone({ freq: 1250, dur: 0.05, type: "square", vol: 0.05 });
  },
  end() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({
        freq: f,
        dur: i === 3 ? 0.45 : 0.2,
        type: "triangle",
        vol: 0.14,
        delay: i * 0.1,
      }),
    );
  },
  click() {
    tone({ freq: 880, to: 1320, dur: 0.07, vol: 0.1 });
  },
};
