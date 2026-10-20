'use strict';
// Geräusche und Musik, komplett per Web Audio erzeugt (keine Audiodateien)
const SFX = (() => {
  const KEY = 'sanctuary-sound', last = {};
  let ac = null, out = null, noiseBuf = null, on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch { /* privater Modus */ }

  // Rauschstoß durch einen Filter: Schläge, Zischen, Splittern
  function noise(dur, freq, q, vol, type = 'bandpass', f2 = 0, delay = 0) {
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  function tone(dur, f1, f2, vol, type = 'sine', delay = 0, dest = out) {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur);
  }

  const SOUNDS = {
    phys: () => noise(0.18, 600, 0.8, 0.3, 'bandpass', 2400),
    hit: () => { noise(0.12, 900, 1.2, 0.5); tone(0.1, 140, 60, 0.35, 'triangle'); },
    hurt: () => { tone(0.18, 210, 110, 0.22, 'sawtooth'); noise(0.1, 500, 1, 0.3); },
    die: () => { tone(0.5, 170, 45, 0.3, 'sawtooth'); noise(0.35, 400, 0.7, 0.3, 'lowpass', 150); },
    fire: () => noise(0.5, 300, 0.6, 0.55, 'lowpass', 1800),
    cold: () => { for (let i = 0; i < 4; i++) tone(0.25, 2000 + i * 600, 1800 + i * 500, 0.07, 'sine', i * 0.04); noise(0.3, 5000, 1, 0.15, 'highpass'); },
    light: () => { noise(0.35, 3000, 0.5, 0.55, 'highpass', 800); tone(0.2, 900, 120, 0.15, 'square'); },
    pois: () => noise(0.6, 700, 4, 0.35, 'bandpass', 300),
    mag: () => { tone(0.4, 400, 900, 0.14, 'triangle'); tone(0.4, 600, 1300, 0.09); },
    gold: () => { for (let i = 0; i < 3; i++) tone(0.12, 2600 + Math.random() * 900, 2400, 0.07, 'triangle', i * 0.05); },
    potion: () => { for (let i = 0; i < 3; i++) tone(0.12, 300, 520, 0.14, 'sine', i * 0.11); },
    item: () => { tone(0.15, 220, 90, 0.3, 'triangle'); noise(0.08, 2000, 2, 0.15); },
    level: () => [523, 659, 784, 1046].forEach((f, i) => tone(0.7, f, f, 0.11, 'triangle', i * 0.12)),
    smash: () => { noise(0.3, 500, 0.6, 0.6, 'lowpass', 120); for (let i = 0; i < 4; i++) noise(0.06, 1400 + i * 500, 3, 0.25, 'bandpass', 0, i * 0.03); },
    chest: () => { tone(0.45, 110, 170, 0.15, 'sawtooth'); noise(0.4, 300, 6, 0.2, 'bandpass', 600); noise(0.1, 200, 1, 0.4, 'lowpass', 0, 0.4); },
    shrine: () => [392, 494, 587, 784].forEach((f, i) => tone(1.4, f, f * 1.01, 0.07, 'sine', i * 0.08)),
    portal: () => { tone(0.9, 120, 480, 0.15, 'sine'); noise(0.9, 400, 2, 0.2, 'bandpass', 2000); },
    // Highway der Toten
    boom: () => { noise(1.3, 900, 0.5, 0.9, 'lowpass', 60); tone(1, 95, 28, 0.6, 'sine'); noise(0.3, 2600, 0.8, 0.45, 'bandpass', 500); },
    alarm: () => { tone(0.42, 640, 1250, 0.09, 'square'); tone(0.42, 1250, 640, 0.09, 'square', 0.44); },
    // k: Anteil der nahen Horde (0–1): mehr Stimmen und lauteres Schlurfen
    horde: (k = 0.5) => {
      noise(0.9, 240, 1.4, 0.08 + 0.18 * k, 'bandpass', 160);
      for (let i = 0; i < 1 + Math.round(k * 3); i++) { const f = 80 + Math.random() * 70; tone(1.3 + Math.random(), f, f * 0.72, 0.03 + 0.05 * k, 'sawtooth', Math.random() * 0.8); }
    },
    mouth: () => { tone(1.3, 950, 380, 0.16, 'sawtooth'); tone(1.3, 1420, 560, 0.1, 'square', 0.02); noise(1.1, 2300, 1.5, 0.28, 'bandpass', 900); },
    jumper: () => { tone(0.55, 260, 720, 0.18, 'sawtooth'); tone(0.45, 720, 230, 0.15, 'sawtooth', 0.5); noise(0.8, 700, 1, 0.22, 'bandpass', 300); },
    bombie: () => { noise(1.5, 4200, 0.7, 0.24, 'highpass', 2400); tone(1.1, 70, 48, 0.12, 'sine'); },
    spit: () => { noise(0.28, 1300, 2, 0.35, 'bandpass', 380); tone(0.16, 320, 110, 0.12, 'triangle'); },
    charge: () => { tone(0.8, 130, 55, 0.26, 'sawtooth'); noise(0.6, 320, 0.8, 0.42, 'lowpass', 90); },
    shot: () => { noise(0.14, 3200, 0.6, 0.7, 'highpass', 700); tone(0.09, 230, 55, 0.4, 'square'); },
    boss: () => { tone(1.7, 82, 44, 0.34, 'sawtooth'); tone(1.7, 123, 58, 0.2, 'square', 0.05); noise(1.5, 420, 0.7, 0.36, 'lowpass', 110); },
    flare: () => noise(0.9, 5200, 0.8, 0.22, 'highpass', 2800),
  };

  // Musik: dunkler Bordun und vereinzelte Zupftöne mit Echo
  function music() {
    const g = ac.createGain(); g.gain.value = 0.1; g.connect(out);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.connect(g);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.04; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    for (const f of [55, 55.35, 82.4]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    const echo = ac.createDelay(1), fb = ac.createGain(), eg = ac.createGain();
    echo.delayTime.value = 0.42; fb.gain.value = 0.5; eg.gain.value = 0.6;
    echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(g);
    const notes = [110, 130.8, 146.8, 164.8, 196, 220, 261.6];
    const pluck = () => {
      if (on && ac.state === 'running') { const f = notes[Math.floor(Math.random() * notes.length)]; tone(1.6, f, f * 0.995, 0.5, 'triangle', 0, echo); tone(1.6, f * 2, f * 2, 0.12, 'sine', 0, echo); }
      setTimeout(pluck, 2500 + Math.random() * 4500);
    };
    setTimeout(pluck, 3000);
  }

  return {
    // erst nach einer Nutzeraktion erlaubt der Browser Ton
    init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC(); out = ac.createGain(); out.gain.value = on ? 0.5 : 0;
      const comp = ac.createDynamicsCompressor(); out.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      music();
    },
    // gap: Mindestabstand in ms, damit viele gleichzeitige Treffer nicht übersteuern; a geht an das Geräusch (etwa Lautstärke)
    play(name, gap = 60, ...a) {
      if (!ac || !on || !SOUNDS[name]) return;
      const t = performance.now();
      if (t - (last[name] || 0) < gap) return;
      last[name] = t; SOUNDS[name](...a);
    },
    get on() { return on; },
    toggle() {
      on = !on;
      if (out) out.gain.value = on ? 0.5 : 0;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* privater Modus */ }
    },
  };
})();
addEventListener('pointerdown', () => SFX.init());
addEventListener('keydown', () => SFX.init());
