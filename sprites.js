'use strict';
// Grafik: prozedurale Texturen, Figuren, Fähigkeits- und Gegenstandssymbole (keine Originalgrafiken)
const Z = 1.6; // Zoom der isometrischen Projektion
const WALL_H = { brick: 104, rock: 78, sandstone: 96, hell: 104 };

const mkCanvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rr = (a, b) => a + Math.random() * (b - a);
const hexRgb = h => { if (h[0] !== '#') return h.match(/[\d.]+/g).slice(0, 3).map(Number); const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const shade = (h, l) => `rgb(${hexRgb(h).map(v => Math.max(0, Math.min(255, Math.round(v + l * 255)))).join()})`;
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join()})`; };

// ---------- Texturen ----------
function wrap(size, x, y, fn) { for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) fn(x + dx, y + dy); }
function grain(g, size, amt) {
  const d = g.getImageData(0, 0, size, size), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const n = (Math.random() - 0.5) * amt; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function blobs(g, size, n, cols, r0, r1, alpha = 1) {
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    const x = Math.random() * size, y = Math.random() * size, rx = rr(r0, r1), ry = rx * rr(0.5, 1), rot = Math.random() * 3;
    wrap(size, x, y, (x, y) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); });
  }
  g.globalAlpha = 1;
}
function strokes(g, size, n, cols, len, w, alpha, ang = null) {
  g.globalAlpha = alpha; g.lineWidth = w; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    g.strokeStyle = cols[i % cols.length];
    const x = Math.random() * size, y = Math.random() * size, a = ang ?? Math.random() * 7, l = rr(len * 0.5, len);
    wrap(size, x, y, (x, y) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + rr(-0.4, 0.4)) * l, y + Math.sin(a + rr(-0.4, 0.4)) * l); g.stroke(); });
  }
  g.globalAlpha = 1;
}
function cracks(g, size, n, col, alpha, w = 1.2) {
  g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = w;
  for (let i = 0; i < n; i++) {
    let x = Math.random() * size, y = Math.random() * size, a = Math.random() * 7;
    const pts = [[x, y]];
    for (let j = 0; j < 5; j++) { a += rr(-0.9, 0.9); x += Math.cos(a) * rr(5, 14); y += Math.sin(a) * rr(5, 14); pts.push([x, y]); }
    wrap(size, 0, 0, (dx, dy) => { g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)); g.stroke(); });
  }
  g.globalAlpha = 1;
}
function stones(g, size, rowH, w0, w1, base, vary, mortar, round = 3) {
  g.fillStyle = mortar; g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += rowH) {
    let x = Math.random() * size;
    const end = x + size;
    while (x < end - 1) {
      const w = Math.min(end - x, rr(w0, w1)), col = shade(base, rr(-vary, vary));
      wrap(size, x, y, (xx, yy) => {
        g.fillStyle = col; g.beginPath(); g.roundRect(xx + 1.5, yy + 1.5, w - 3, rowH - 3, round); g.fill();
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(xx + 2, yy + 2, w - 4, 2);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(xx + 2, yy + rowH - 5, w - 4, 3);
      });
      x += w;
    }
  }
}
function tex(size, base, fn) { const c = mkCanvas(size), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size); fn(g, size); return c; }

const TEX = {};
function genTextures() {
  TEX.floor = {
    grass: tex(256, '#2a2f1f', (g, s) => {
      blobs(g, s, 18, ['#3a3123', '#2f2a1c'], 18, 46, 0.55);
      blobs(g, s, 60, ['#33391f', '#232817', '#3b4226'], 6, 18, 0.5);
      strokes(g, s, 1400, ['#3d4727', '#222914', '#4a5430', '#1a2010'], 7, 1.3, 0.75, -1.57);
      blobs(g, s, 40, ['#4a4236', '#2a241b'], 1, 3, 0.8);
      grain(g, s, 20);
    }),
    dirt: tex(256, '#382d22', (g, s) => {
      blobs(g, s, 50, ['#2d241b', '#433629', '#30271e'], 10, 36, 0.5);
      blobs(g, s, 220, ['#544a40', '#26201a', '#6a5e50'], 1, 3.5, 0.8);
      cracks(g, s, 10, '#1a140f', 0.5);
      grain(g, s, 24);
    }),
    stone: tex(256, '#1d1b18', (g, s) => {
      stones(g, s, 32, 30, 74, '#46423b', 0.05, '#1c1a17');
      blobs(g, s, 22, ['#1e1c18', '#3a3022'], 8, 30, 0.22);
      cracks(g, s, 14, '#141210', 0.6);
      grain(g, s, 22);
    }),
    sand: tex(256, '#76623f', (g, s) => {
      blobs(g, s, 50, ['#685737', '#85704b', '#5f4f33'], 12, 40, 0.45);
      strokes(g, s, 160, ['#5a4a30', '#8a7650'], 26, 1.5, 0.3, 0.15);
      blobs(g, s, 120, ['#4e4230', '#9a8660'], 1, 2.5, 0.7);
      grain(g, s, 16);
    }),
    marble: tex(256, '#120a09', (g, s) => {
      stones(g, s, 64, 64, 64, '#3a2420', 0.05, '#120a09', 1);
      cracks(g, s, 18, '#6a4238', 0.45, 1);
      blobs(g, s, 14, ['#0a0505', '#4a2a24'], 10, 30, 0.2);
      grain(g, s, 14);
    }),
    hell: tex(256, '#0e0706', (g, s) => {
      stones(g, s, 48, 40, 90, '#2c1a15', 0.04, '#0e0706', 6);
      g.globalCompositeOperation = 'lighter';
      cracks(g, s, 12, '#ff5a10', 0.5, 1.6);
      cracks(g, s, 8, '#ffb040', 0.35, 0.8);
      g.globalCompositeOperation = 'source-over';
      grain(g, s, 16);
    }),
  };
  TEX.wall = {
    brick: tex(128, '#211d18', (g, s) => { stones(g, s, 16, 28, 36, '#4c4438', 0.06, '#211d18', 1); cracks(g, s, 6, '#15120f', 0.5); grain(g, s, 20); }),
    rock: tex(128, '#4a4440', (g, s) => { blobs(g, s, 80, ['#3a3532', '#5a544c', '#433d38'], 5, 18, 0.7); cracks(g, s, 14, '#1e1b18', 0.7, 1.5); grain(g, s, 30); }),
    sandstone: tex(128, '#4a3c28', (g, s) => { stones(g, s, 24, 40, 70, '#8a7450', 0.06, '#4a3c28', 2); grain(g, s, 16); }),
    hell: tex(128, '#120806', (g, s) => {
      stones(g, s, 20, 30, 60, '#3a1a14', 0.05, '#120806', 2);
      g.globalCompositeOperation = 'lighter'; cracks(g, s, 6, '#ff4a10', 0.45, 1.4); g.globalCompositeOperation = 'source-over';
      grain(g, s, 16);
    }),
  };
  TEX.stone = tex(128, '#24211d', (g, s) => { blobs(g, s, 90, ['#2c2823', '#1c1a17', '#302b25'], 4, 16, 0.6); cracks(g, s, 8, '#121110', 0.5); grain(g, s, 26); });
  TEX.red = tex(128, '#8a0c0c', (g, s) => { blobs(g, s, 60, ['#b01818', '#600606', '#d03020'], 6, 22, 0.55); grain(g, s, 30); });
  TEX.blue = tex(128, '#10208a', (g, s) => { blobs(g, s, 60, ['#2040c0', '#081060', '#3050e0'], 6, 22, 0.55); grain(g, s, 30); });
}

// ---------- Figuren ----------
const LOOKS = {
  // Diablo II
  ama: { skin: '#d8a878', body: '#7a5a38', legs: '#d8a878', head: 'hair', hair: '#d8b860', weapon: 'bow', belt: '#3a2a1a', pony: 1, top: '#7a5a38', boots: '#4a3020' },
  asn: { skin: '#c89878', body: '#2a2030', legs: '#1a1420', head: 'mask', hair: '#202020', weapon: 'claw', cape: '#3a2050', sleeves: 1 },
  bar: { skin: '#c8946a', body: '#c8946a', legs: '#6a5038', head: 'horns', helm: '#8a8478', horn: '#d8d0c0', weapon: 'axe', belt: '#5a3a20', hm: 1.08, build: 'big', boots: '#5a4632' },
  dru: { skin: '#c8a080', body: '#4a5a30', legs: '#3a3020', head: 'pelt', hood: '#6a6258', weapon: 'staff', orb: '#90e070', cape: '#5a4a30', beard: '#6a5040' },
  nec: { skin: '#d8d0c8', body: '#1e1e22', robe: 1, trim: '#c8c0b0', head: 'hair', hair: '#101010', weapon: 'dagger', pauldron: '#d8d0c0', spiky: 1 },
  pal: { skin: '#d8b090', body: '#a8a8b2', tabard: '#e8e0d0', legs: '#8a8a98', head: 'helm', helm: '#b0b0b8', weapon: 'sword', shield: '#c8b060', armor: 1, emblem: '#a01810' },
  sor: { skin: '#e0b898', body: '#5a2a6a', robe: 1, trim: '#c8a040', head: 'hair', hair: '#8a2020', weapon: 'staff', orb: '#80c0ff', long: 1 },
  // Champions: Return to Arms
  bw: { skin: '#d8a080', body: '#7a3020', legs: '#5a3a28', head: 'hair', hair: '#c05020', weapon: 'axe', belt: '#3a2010', hm: 1.08, build: 'big', long: 1, beard: '#c05020', boots: '#5a4632' },
  ew: { skin: '#5a3a28', body: '#22348a', robe: 1, trim: '#c8b060', head: 'bald', weapon: 'staff', orb: '#a0c0ff', build: 'tall' },
  wr: { skin: '#e0c0a0', body: '#3a5a28', legs: '#4a3a20', head: 'elf', hair: '#e0d080', weapon: 'bow', cape: '#2a4020' },
  hc: { skin: '#f0d8c0', body: '#d8d0b8', tabard: '#c8a040', legs: '#b8b0a0', head: 'helm', helm: '#d8c070', weapon: 'mace', shield: '#e0d0a0', armor: 1, build: 'slim' },
  sk: { skin: '#4a4a7a', body: '#24242c', legs: '#1a1a22', head: 'helm', helm: '#30303a', weapon: 'sword', cape: '#4a0010', eyes: '#ff3020', shield: '#3a1018', armor: 1, spiky: 1, build: 'slim' },
  vb: { skin: '#d89040', body: '#6a4020', legs: '#d89040', head: 'cat', tail: '#d89040', weapon: 'axe', belt: '#3a2010' },
  is: { skin: '#5a8a50', body: '#6a4a20', robe: 1, trim: '#a0a060', head: 'lizard', tail: '#5a8a50', weapon: 'staff', orb: '#a0ff60' },
};
const MON_LOOKS = {
  'Gefallener': { skin: '#a83228', body: '#7a2018', legs: '#5a1810', head: 'horns', helm: '#a83228', horn: '#d8c8a0', weapon: 'sword', hunch: 0.3, eyes: '#ffd040' },
  'Zombie': { skin: '#6e7d5e', body: '#4a3e30', legs: '#3a3228', head: 'bald', hunch: 0.45, arms: 1, eyes: '#c0d040' },
  'Stachelratte': { rig: 'quad', col: '#6a5038', spikes: '#c8b898', eyes: '#ff4020' },
  'Goblin': { skin: '#5a7a30', body: '#5a4028', legs: '#3a2a1a', head: 'goblin', weapon: 'dagger', hunch: 0.2, eyes: '#ffe040' },
  'Skelett': { skin: '#ddd6c0', bones: 1, head: 'skull', weapon: 'sword', shield: '#5a4a30', eyes: '#80a0ff' },
  'Skelett-Bogenschütze': { skin: '#ddd6c0', bones: 1, head: 'skull', weapon: 'bow', eyes: '#80a0ff' },
  'Gnoll': { skin: '#8a6a40', body: '#4a3a28', legs: '#3a2a1a', head: 'snout', weapon: 'axe', hunch: 0.2, eyes: '#ff8020' },
  'Ork-Plünderer': { skin: '#4f6a30', body: '#5a5048', legs: '#3a3228', head: 'tusks', weapon: 'axe', shield: '#4a3a28', eyes: '#ff3010', hm: 1.05, build: 'big' },
  'Ziegenmensch': { skin: '#7a5a3a', body: '#6a4a2e', legs: '#5a3a22', head: 'goat', horn: '#c8b898', weapon: 'spear', hunch: 0.15, eyes: '#ff4020' },
  'Gloam': { rig: 'wisp', col: '#a0d0ff' },
  'Dunkelelfen-Magier': { skin: '#3a3a6a', body: '#4a2a6a', robe: 1, trim: '#a080c0', head: 'hair', hair: '#e8e8f0', weapon: 'staff', orb: '#ff8040', eyes: '#ff4040' },
  'Vampir': { skin: '#c8c0c8', body: '#5a1020', robe: 1, trim: '#a08040', head: 'hair', hair: '#101010', weapon: 'staff', orb: '#ff5020', cape: '#200008', eyes: '#ff2020' },
  'Frostriese': { skin: '#a8c8e0', body: '#506070', legs: '#405060', head: 'hair', hair: '#e8f0ff', weapon: 'club', eyes: '#60c0ff', build: 'big', long: 1 },
  'Dämonenfürst': { skin: '#902818', body: '#5a1408', legs: '#4a1006', head: 'horns', helm: '#902818', horn: '#2a1a14', weapon: 'sword', wings: '#3a0c06', eyes: '#ffd040' },
  'Andariel': { skin: '#d080a0', body: '#6a2040', robe: 1, trim: '#d8a0c0', head: 'horns', helm: '#d080a0', horn: '#3a1020', weapon: 'claw', eyes: '#ffe040', spiderLegs: '#e0b0c8' },
  'Duriel': { rig: 'grub', col: '#a89870', spikes: '#e8d8b0', eyes: '#ff6020' },
  'Mephisto': { skin: '#8090c0', body: '#5a6890', head: 'skull', weapon: 'none', float: 1, ribs: 1, spread: 1, tentacles: '#3a4468', glow: '#6080ff', eyes: '#c0e0ff' },
  'Innoruuk': { skin: '#503060', body: '#200a30', robe: 1, trim: '#8040a0', head: 'horns', helm: '#503060', horn: '#d0b0e0', weapon: 'staff', orb: '#c040ff', cape: '#100018', eyes: '#ff40ff' },
  'Diablo': { rig: 'demon', col: '#a02010', horn: '#e0c090', spikes: '#e0c090', eyes: '#ffe040' },
  'Verdammnisritter': { skin: '#9a9088', body: '#3a3440', legs: '#2a2630', head: 'horns', helm: '#4a4450', horn: '#c8b898', weapon: 'sword', shield: '#2a2430', eyes: '#ff3010', armor: 1, spiky: 1 },
  'Venomfürst': { rig: 'demon', col: '#b03018', horn: '#d0b080', spikes: '#e0a070', eyes: '#ffe040' },
  'Vergessensritter': { skin: '#c8c0b0', body: '#4a3a60', robe: 1, trim: '#a080c0', head: 'skull', weapon: 'staff', orb: '#c060ff', eyes: '#c060ff' },
  'Großwesir des Chaos': { skin: '#a04030', body: '#501010', robe: 1, trim: '#e0a040', head: 'horns', helm: '#702018', horn: '#e0c090', weapon: 'staff', orb: '#ff6020', cape: '#200404', eyes: '#ffd040', hm: 1.1 },
  'Lord De Seis': { skin: '#8a8078', body: '#2e2a34', legs: '#222028', head: 'horns', helm: '#3a3440', horn: '#e8d8b0', weapon: 'axe', shield: '#4a2018', cape: '#300a0a', eyes: '#ff2010', hm: 1.15, armor: 1, spiky: 1, build: 'big' },
  'Seelenverseucher': { rig: 'demon', col: '#802050', horn: '#e0c0d0', spikes: '#f0b0d0', eyes: '#80ff40' },
  'Baal': { skin: '#9080c0', body: '#403060', robe: 1, trim: '#c0b0f0', head: 'horns', helm: '#9080c0', horn: '#302040', weapon: 'staff', orb: '#80c0ff', backTents: '#6a5a90', eyes: '#ffffff' },
};
const MIN_LOOKS = {
  skel: MON_LOOKS['Skelett'],
  smage: { skin: '#ddd6c0', bones: 1, head: 'skull', weapon: 'staff', orb: '#80c0ff', eyes: '#80c0ff' },
  golem: { skin: '#8a7050', body: '#8a7050', legs: '#7a6040', head: 'bald', hm: 1.05, eyes: '#ffc060', build: 'big' },
  bgolem: { skin: '#902020', body: '#801818', legs: '#701010', head: 'bald', eyes: '#ffe080', build: 'big' },
  raven: { rig: 'bird', col: '#1a1a22' },
  wolf: { rig: 'quad', col: '#c0d0f0', ghost: 0.75, eyes: '#80c0ff' },
  bear: { rig: 'quad', col: '#5a3a20', bulk: 1, eyes: '#201008' },
  valk: { skin: '#e8d0b0', body: '#d8c070', legs: '#b8a060', head: 'helm', helm: '#e0d080', weapon: 'spear', shield: '#d8c070', ghost: 0.85, glow: '#fff0a0', armor: 1 },
  hydra: { rig: 'hydra', col: '#7a3010' },
  sentry: { rig: 'trap', col: '#fff27a' },
  ancestor: { ...LOOKS.bar, ghost: 0.55, glow: '#ffd090' },
  badger: { rig: 'quad', col: '#7a6a5a', ghost: 0.8 },
  hammer: { rig: 'hammer', col: '#fff8e0' },
  shadow: { ...LOOKS.asn, ghost: 0.5 },
};

// Figuren werden einzeln auf eine Hilfsfläche gezeichnet, dort von oben beleuchtet und
// unten abgedunkelt, und bekommen eine dunkle Pixelkontur wie vorgerenderte D2-Sprites
const FIG = mkCanvas(64), SIL = mkCanvas(64), fg = FIG.getContext('2d'), sg = SIL.getContext('2d'), FIG_GLOW = [];
function drawFigure(g, x, y, L, st) {
  if (typeof SPR !== 'undefined' && SPR.draw(g, x, y, L, st)) return;
  const m = g.getTransform(), k = Math.hypot(m.a, m.b), n = Math.ceil(st.h * k * 2.8) + 4;
  if (FIG.width < n) { FIG.width = FIG.height = SIL.width = SIL.height = n; }
  const ox = n / 2, oy = Math.round(n * 0.72);
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, n, n); FIG_GLOW.length = 0;
  fg.setTransform(k, 0, 0, k, ox, oy);
  if (st.lying) { const f = st.lying; fg.scale(1, 1 - 0.45 * f); fg.rotate(-Math.PI / 2 * st.fx * f); }
  const u = st.h / 56;
  fg.scale(st.fx * u, u);
  fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
  fg.lineCap = 'round'; fg.lineJoin = 'round';
  if (L.glow) { fg.globalAlpha = 0.35; glowDot(fg, 0, -28, 30, L.glow); fg.globalAlpha = 1; }
  ({ quad, grub, demon, bird, wisp, hammer: hammerRig, trap, hydra }[L.rig] || humanoid)(fg, L, st);
  // Licht von oben, Füße im Schatten
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-atop';
  const top = oy - st.h * k * 1.05, lg = fg.createLinearGradient(0, top, 0, oy);
  lg.addColorStop(0, 'rgba(255,236,200,.16)'); lg.addColorStop(0.45, 'rgba(0,0,0,0)'); lg.addColorStop(0.85, 'rgba(0,0,0,.22)'); lg.addColorStop(1, 'rgba(0,0,0,.5)');
  fg.fillStyle = lg; fg.fillRect(0, 0, n, n);
  fg.globalCompositeOperation = 'source-over';
  // Kontur: schwarze Silhouette um ein Pixel versetzt darunter
  sg.globalCompositeOperation = 'copy'; sg.drawImage(FIG, 0, 0);
  sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#000'; sg.fillRect(0, 0, n, n);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const dx = Math.round(m.a * x + m.c * y + m.e - ox), dy = Math.round(m.b * x + m.d * y + m.f - oy);
  g.globalAlpha *= (L.ghost || 1) * (st.alpha ?? 1);
  if (!L.ghost) { const a = g.globalAlpha; g.globalAlpha = a * 0.85; for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(SIL, 0, 0, n, n, dx + ax, dy + ay, n, n); g.globalAlpha = a; }
  if (st.flash) g.filter = 'brightness(2.4) saturate(.5)';
  else if (st.lying) g.filter = `brightness(${1 - 0.55 * st.lying}) saturate(${1 - 0.4 * st.lying})`;
  g.drawImage(FIG, 0, 0, n, n, dx, dy, n, n);
  g.filter = 'none';
  const a = g.globalAlpha;
  for (const [gx, gy, r, c, ga] of FIG_GLOW) { g.globalAlpha = a * ga; glowDot(g, dx + gx, dy + gy, r, c); }
  g.restore();
}

const limb = (g, x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
// Gliedmaße mit dunkler Kontur, damit Figuren auf dem Boden lesbar bleiben
const limbO = (g, x1, y1, x2, y2, w, c) => { limb(g, x1, y1, x2, y2, w + 1.6, 'rgba(0,0,0,.6)'); limb(g, x1, y1, x2, y2, w, c); };
// wie limbO, dazu ein Glanzstreifen auf der Lichtseite, damit Glieder rund wirken
// rundes, sich verjüngendes Glied mit Zylinderschattierung (Licht von links oben)
function limbS(g, x1, y1, x2, y2, w, c, w2 = w * 0.86) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 0.01, nx = -dy / l, ny = dx / l, a = Math.atan2(dy, dx);
  const r1 = w / 2, r2 = w2 / 2;
  g.beginPath();
  g.arc(x1, y1, r1, a + Math.PI / 2, a - Math.PI / 2);
  g.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2);
  g.closePath();
  const s = nx < 0 || (nx === 0 && ny > 0) ? -1 : 1, gr = g.createLinearGradient(x1 - nx * r1 * s, y1 - ny * r1 * s, x1 + nx * r1 * s, y1 + ny * r1 * s);
  gr.addColorStop(0, shade(c, 0.16)); gr.addColorStop(0.35, c); gr.addColorStop(0.75, shade(c, -0.22)); gr.addColorStop(1, shade(c, -0.42));
  g.fillStyle = gr; g.fill();
}
// wogender, sich verjüngender Tentakel von (x, y) um (dx, dy)
function tentacle(g, x, y, dx, dy, w, c, t) {
  let px = x, py = y;
  for (let i = 1; i <= 5; i++) { const f = i / 5, nx = x + dx * f + Math.sin(t * 3 + i * 0.9) * 3 * f, ny = y + dy * f + Math.cos(t * 2.4 + i) * 1.5 * f; limbO(g, px, py, nx, ny, w * (1 - f * 0.7), c); px = nx; py = ny; }
}
// zweigliedriges Glied: Gelenkpunkt aus Winkel a (oberes Stück) und b (unteres Stück)
function joint(g, x, y, a, b, l1, l2, w1, w2, c) {
  const kx = x + Math.sin(a) * l1, ky = y + Math.cos(a) * l1, ex = kx + Math.sin(b) * l2, ey = ky + Math.cos(b) * l2;
  limbS(g, x, y, kx, ky, w1, c, w1 * 0.82); disc(g, kx, ky, w1 * 0.41, shade(c, -0.08)); limbS(g, kx, ky, ex, ey, w2 * 1.05, c, w2 * 0.8);
  return [ex, ey];
}
function volume(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(255,240,210,.14)'); gr.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.9; g.stroke();
}
const disc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
function glowDot(g, x, y, r, c) {
  // auf der Figurenfläche gesammelt und erst danach additiv in die Szene gemalt
  if (g === fg) { const m = g.getTransform(); return FIG_GLOW.push([m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, r * Math.hypot(m.a, m.b), c, g.globalAlpha]); }
  const a = g.globalAlpha, op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'transparent');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = op; g.globalAlpha = a;
}

function weapon(g, type, L, st) {
  const metal = '#c4c4cc', wood = '#6a4a2a';
  switch (type) {
    case 'sword': limb(g, 0, 4, 0, 0, 2.5, '#4a3020'); limb(g, -4, 0, 4, 0, 2, '#8a7040'); limb(g, 0, -1, 0, -22, 2.6, metal); limb(g, 0.6, -2, 0.6, -20, 0.8, '#ffffff'); break;
    case 'axe':
      limb(g, 0, 5, 0, -18, 2.4, wood);
      g.fillStyle = metal; g.beginPath(); g.moveTo(0, -19); g.quadraticCurveTo(9, -20, 9, -11); g.quadraticCurveTo(5, -13, 0, -12); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.8; g.stroke(); break;
    case 'mace': limb(g, 0, 4, 0, -13, 2.2, wood); disc(g, 0, -16, 4, '#8a8a92'); for (let i = 0; i < 6; i++) { const a = i * 1.05; limb(g, Math.cos(a) * 3, -16 + Math.sin(a) * 3, Math.cos(a) * 6, -16 + Math.sin(a) * 6, 1.2, '#b0b0b8'); } break;
    case 'club': limb(g, 0, 4, 0, -10, 3, '#5a4028'); limb(g, 0, -10, 0, -20, 5, '#6a4a30'); break;
    case 'spear': limb(g, 0, 12, 0, -30, 2, wood); g.fillStyle = metal; g.beginPath(); g.moveTo(0, -36); g.lineTo(-2.5, -28); g.lineTo(2.5, -28); g.fill(); break;
    case 'dagger': limb(g, -3, 0, 3, 0, 1.6, '#8a7040'); limb(g, 0, -1, 0, -11, 2, metal); break;
    case 'claw': for (const dx of [-3, 0, 3]) limb(g, dx * 0.4, 0, dx, -11, 1.4, metal); break;
    case 'staff':
      limb(g, 0, 16, 0, -26, 2.6, '#5a3a20');
      if (L.orb) { disc(g, 0, -29, 3.5, L.orb); glowDot(g, 0, -29, 10 + Math.sin(st.t * 6) * 2, L.orb); }
      break;
  }
}

function head(g, L, st) {
  const s = L.skin, hy = -49;
  const hornPair = (col, back) => {
    g.strokeStyle = col; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(1, hy - 4); g.quadraticCurveTo(back ? -8 : 7, hy - 9, back ? -9 : 4, hy - 15); g.stroke();
    g.beginPath(); g.moveTo(-3, hy - 4); g.quadraticCurveTo(back ? -11 : -8, hy - 8, back ? -13 : -7, hy - 14); g.stroke();
  };
  if (L.head === 'hair' || L.head === 'elf') disc(g, -2, hy - 1, 7, L.hair);
  if (L.head === 'pelt') { disc(g, -1, hy - 1, 8, L.hood); disc(g, 3, hy - 7, 2.5, L.hood); disc(g, -4, hy - 7, 2.5, L.hood); }
  if (L.head === 'lizard') { for (let i = 0; i < 4; i++) limb(g, -4 - i, hy - 5 + i * 3, -9 - i, hy - 7 + i * 3, 1.6, shade(s, -0.12)); }
  if (L.head === 'skull') {
    disc(g, 0, hy, 6, s); g.fillStyle = shade(s, -0.1); g.fillRect(-1, hy + 3, 7, 4);
    disc(g, 2.5, hy - 1, 1.6, '#0a0a0a'); disc(g, 5, hy - 1, 1.4, '#0a0a0a');
  } else {
    disc(g, 0, hy, 6, s);
    const hg = g.createRadialGradient(2, hy - 2, 1, 0, hy, 7); hg.addColorStop(0, 'rgba(255,240,220,.18)'); hg.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = hg; g.beginPath(); g.arc(0, hy, 6, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 0.8; g.stroke();
    if (L.head === 'snout' || L.head === 'goat') { g.fillStyle = s; g.beginPath(); g.ellipse(6, hy + 2, 5, 3, 0.2, 0, 7); g.fill(); }
    if (L.head === 'lizard') { g.fillStyle = s; g.beginPath(); g.ellipse(6, hy + 1.5, 5.5, 3, 0.1, 0, 7); g.fill(); }
    if (L.head === 'cat') { g.fillStyle = s; for (const dx of [-3, 3]) { g.beginPath(); g.moveTo(dx - 2.5, hy - 4); g.lineTo(dx, hy - 11); g.lineTo(dx + 2.5, hy - 4); g.fill(); } g.fillStyle = shade(s, 0.12); g.beginPath(); g.ellipse(4, hy + 2, 3.5, 2.5, 0, 0, 7); g.fill(); }
  }
  if (L.head === 'hair') { g.fillStyle = L.hair; g.beginPath(); g.arc(0, hy - 0.5, 6.4, Math.PI * 0.95, Math.PI * 2.05); g.fill(); }
  if (L.head === 'elf') { g.fillStyle = L.hair; g.beginPath(); g.arc(0, hy - 0.5, 6.4, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.fillStyle = s; g.beginPath(); g.moveTo(-1, hy); g.lineTo(-7, hy - 7); g.lineTo(-2, hy + 2); g.fill(); }
  if (L.head === 'goblin') { g.fillStyle = s; g.beginPath(); g.moveTo(-1, hy); g.lineTo(-11, hy - 6); g.lineTo(-2, hy + 3); g.fill(); }
  if (L.head === 'snout') { g.fillStyle = shade(s, -0.1); g.beginPath(); g.moveTo(-3, hy - 3); g.lineTo(-5, hy - 10); g.lineTo(0, hy - 5); g.fill(); }
  if (L.head === 'tusks') { limb(g, 4, hy + 4, 5, hy + 1, 1.3, '#f0e8d0'); }
  if (L.head === 'mask') { g.fillStyle = '#18141c'; g.fillRect(-1, hy + 0.5, 8, 4); disc(g, -2, hy - 1, 6.6, L.hair); g.fillStyle = s; g.fillRect(0, hy - 3, 6, 3.4); }
  if (L.head === 'pelt') { g.fillStyle = L.hood; g.beginPath(); g.arc(0, hy - 0.5, 6.6, Math.PI * 0.9, Math.PI * 2.05); g.fill(); g.beginPath(); g.ellipse(5, hy - 5, 5, 2.5, 0.3, 0, 7); g.fill(); }
  if (L.head === 'helm' || L.head === 'horns') {
    g.fillStyle = L.helm; g.beginPath(); g.arc(0, hy - 0.5, 6.8, Math.PI, Math.PI * 2); g.fill();
    g.fillRect(-6.8, hy - 1, 3, 6);
    if (L.head === 'helm') limb(g, 4.5, hy - 1, 4.5, hy + 4, 1.4, shade(L.helm, -0.15));
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(1, hy - 3, 3.5, Math.PI * 1.1, Math.PI * 1.8); g.fill();
  }
  if (L.head === 'horns') hornPair(L.horn, false);
  if (L.head === 'goat') hornPair(L.horn, true);
  if (!st.back) {
    const ec = L.eyes || '#1a1010';
    // von vorn beide Augen mittig, im Profil zur Blickseite verschoben
    const ex = 4.2 * (1 - (st.turn || 0)), ew = 1.2 + 1.3 * (st.turn || 0);
    disc(g, ex - ew, hy - 0.5, 0.95, ec); disc(g, ex + ew, hy - 0.5, 0.9, ec);
    if (L.eyes) glowDot(g, ex, hy - 0.5, 4, L.eyes);
  }
}

// turn 0..1: 0 = Profil, 1 = frontal zur Kamera bzw. von ihr weg
function humanoid(g, L, st) {
  const tn = st.turn || 0, ph = st.walk * 0.16, sw = st.moving ? Math.sin(ph) * 0.55 * (1 - 0.6 * tn) : 0, spread = 3.2 * tn;
  g.scale(1 - 0.28 * tn, 1);
  const bob = st.moving ? Math.abs(Math.cos(ph)) * 1.4 : Math.sin(st.t * 2.2) * 0.5;
  const body = L.body || L.skin, legs = L.legs || shade(body, -0.1), bones = L.bones, bw = bones ? 2.6 : 7;
  if (L.float) g.translate(0, -6 + Math.sin(st.t * 3) * 2);
  // Flügel und Umhang hinter dem Körper
  if (L.wings) {
    g.fillStyle = L.wings;
    for (const s of [1, 0.75]) { g.beginPath(); g.moveTo(-2, -40); g.lineTo(-24 * s, -60 * s + Math.sin(st.t * 4) * 3); g.lineTo(-20 * s, -30); g.lineTo(-12, -38); g.lineTo(-14 * s, -22); g.closePath(); g.fill(); }
  }
  const cape = () => {
    g.fillStyle = L.cape; g.beginPath(); g.moveTo(-6, -42); g.lineTo(5, -42);
    g.lineTo(6 - sw * 3, -12); g.lineTo(-11 - Math.abs(sw) * 4, -10); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9, -30, 4, 18);
  };
  if (L.spiderLegs) for (let i = 0; i < 4; i++) { const a = -2.65 + i * 0.22 + Math.sin(st.t * 3 + i) * 0.08; joint(g, -3, -42 + i * 2, a, a + 1.5 + i * 0.1, 18 - i, 17 - i, 2.8, 1.8, shade(L.spiderLegs, -0.08 * i)); }
  if (L.backTents) for (let i = 0; i < 4; i++) tentacle(g, -3, -40 + i * 3, -16 - i * 3, -14 + i * 9, 3.4, shade(L.backTents, -0.1 * (i % 2)), st.t + i * 1.7);
  if (L.cape && !st.back) cape();
  if (L.tail) { g.strokeStyle = L.tail; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, -24); g.quadraticCurveTo(-18, -20 + sw * 6, -20, -32 + sw * 4); g.stroke(); }
  // Beine
  // Knie beugt sich, wenn das Bein nach hinten schwingt
  const leg = (dx, a, c) => {
    const [fx, fy] = joint(g, dx, -24, a, a - Math.max(0, -a) * 1.1 - 0.06, 12, 12.2, bw + 0.9, bw - 0.5, c);
    if (!bones) limbO(g, fx - 0.5, fy, fx + 3.8, fy + 0.3, 3.2, L.boots || '#2a1e14');
  };
  if (L.tentacles) for (let i = 0; i < 6; i++) tentacle(g, -5 + i * 2, -25, (i - 2.5) * 5, 24 - Math.abs(i - 2.5) * 2, 3.6, shade(L.tentacles, -0.1 * (i % 2)), st.t + i * 1.3);
  else if (!L.robe) { leg(-1.5 - spread, -sw, shade(legs, -0.12)); leg(1.5 + spread, sw, legs); }
  else if (!L.float) { limb(g, -2, -3, 1, 0, 3, '#1a1410'); limb(g, 3, -3, 6, 0, 3, '#1a1410'); }
  g.save();
  g.translate(0, -bob);
  if (L.hunch) { g.translate(0, -24); g.rotate(L.hunch); g.translate(0, 24); }
  // hinterer Arm
  const sh = [0, -41];
  const ab = L.spread ? -2.2 + Math.sin(st.t * 2) * 0.12 : L.arms ? 1.3 : -sw * 0.8 + 0.1;
  const hb = joint(g, sh[0] - 1.5 - spread * 1.6, sh[1], ab, ab + 0.35, 7, 7, bones ? 2.4 : 6, bones ? 2.2 : 5, bones ? L.skin : shade(body, -0.18));
  disc(g, hb[0], hb[1], 2, shade(L.skin, -0.1));
  // Rumpf
  if (L.robe) {
    g.fillStyle = shade(body, -0.04); g.beginPath(); g.moveTo(-7, -30); g.lineTo(7, -30);
    g.lineTo(10 + sw * 2, -1); g.lineTo(-10 - sw * 2, -1); g.closePath(); g.fill(); volume(g, -10, 0, 20, 0);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; for (const dx of [-4, 0, 4]) { g.beginPath(); g.moveTo(dx, -26); g.lineTo(dx * 1.6, -2); g.stroke(); }
    if (L.trim) limb(g, -10 - sw * 2, -1.5, 10 + sw * 2, -1.5, 1.6, L.trim);
  }
  if (bones) {
    limb(g, 0, -24, 0, -42, 2.4, L.skin);
    for (let i = 0; i < 4; i++) { g.strokeStyle = L.skin; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, -38 + i * 3.4, 5 - i * 0.4, 1.4, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
    limb(g, -4, -24, 4, -24, 2.6, L.skin);
  } else {
    g.fillStyle = body; g.beginPath(); g.moveTo(-6, -23); g.lineTo(6.5, -23); g.quadraticCurveTo(8, -31, 10.5, -39); g.quadraticCurveTo(11, -44, 6, -44); g.lineTo(-6, -44); g.quadraticCurveTo(-11, -44, -10.5, -39); g.quadraticCurveTo(-8, -31, -6, -23); g.closePath(); g.fill();
    volume(g, -10.5, 0, 21, 0);
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-5, -35); g.quadraticCurveTo(0, -33, 6, -35); g.stroke();
    for (const dx of [-7.5, 7.5]) { disc(g, dx, -41, 4.2, shade(body, -0.06)); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.8; g.stroke(); }
    if (L.ribs) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(1, -38 + i * 3.6, 6 - i * 0.5, 1.6, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); } }
    if (L.tabard && !st.back) { g.fillStyle = L.tabard; g.fillRect(-1, -40, 6, 20); }
    if (L.belt) limb(g, -6, -26, 6.5, -26, 2.2, L.belt);
    if (L.trim) limb(g, -7, -41.5, 7, -41.5, 1.6, L.trim);
  }
  if (L.spikes && L.rig !== 'quad') { g.fillStyle = L.spikes; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-7, -42 + i * 5); g.lineTo(-13, -45 + i * 5); g.lineTo(-7, -39 + i * 5); g.fill(); } }
  limb(g, 0, -42, 0, -45, 3.2, L.skin);
  g.save(); g.translate(0, -43); g.scale(0.8, 0.8); g.translate(0, 45.5); head(g, L, st); g.restore();
  if (L.cape && st.back) cape();
  if (L.shield && !st.back) {
    g.fillStyle = L.shield; g.beginPath(); g.moveTo(1, -40); g.lineTo(11, -40); g.lineTo(11, -30); g.quadraticCurveTo(11, -24, 6, -21); g.quadraticCurveTo(1, -24, 1, -30); g.closePath(); g.fill();
    g.strokeStyle = shade(L.shield, -0.25); g.lineWidth = 1.2; g.stroke();
    limb(g, 6, -38, 6, -25, 1, 'rgba(255,255,255,.35)');
  }
  // vorderer Arm mit Waffe
  const k = 1 - st.atk, ranged = L.weapon === 'bow';
  let af = L.spread ? 2.2 + Math.sin(st.t * 2 + 1) * 0.12 : L.arms ? 1.4 : sw * 0.8 + 0.35;
  if (st.atk > 0) af = ranged ? 1.45 : L.weapon === 'staff' || L.weapon === 'none' ? (L.spread ? 2.2 + st.atk * 0.6 : 0.4 - st.atk * 1.2) : -2.0 + 3.3 * (1 - (1 - k) * (1 - k));
  const hf = joint(g, sh[0] + 1.5 + spread * 1.6, sh[1], af, af + (st.atk > 0 ? 0.1 : 0.4), 7, 7, bones ? 2.4 : 6, bones ? 2.2 : 5, bones ? L.skin : shade(body, 0.04));
  disc(g, hf[0], hf[1], 2.1, L.skin);
  g.save(); g.translate(hf[0], hf[1]);
  if (ranged) {
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.beginPath(); g.arc(-5, 0, 14, -1.1, 1.1); g.stroke();
    g.strokeStyle = '#d8d0c0'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(1.3, -12.5); g.lineTo(-4 - st.atk * 6, 0); g.lineTo(1.3, 12.5); g.stroke();
  } else if (L.weapon && L.weapon !== 'none') { g.rotate(0.9 + af); weapon(g, L.weapon, L, st); }
  g.restore();
  g.restore();
}

function quad(g, L, st) {
  const ph = st.walk * 0.22, sw = st.moving ? Math.sin(ph) * 0.5 : 0, bk = L.bulk ? 1.35 : 1, c = L.col;
  g.lineCap = 'round';
  // Vorderbeine fast gerade, Hinterbeine mit nach hinten zeigendem Sprunggelenk
  const leg = (x, a, col) => {
    const [fx, fy] = x > 0 ? joint(g, x, -15, a + 0.12, a - 0.08, 7.5, 7.5, 3.8 * bk, 2.6 * bk, col) : joint(g, x, -16, a - 0.35, a + 0.3, 8, 8.5, 4.4 * bk, 2.6 * bk, col);
    limbO(g, fx, fy, fx + 2.6, fy + 0.2, 2.6 * bk, shade(c, -0.25));
  };
  leg(-10, -sw, shade(c, -0.15)); leg(9, sw, shade(c, -0.15));
  g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(-15, -20); g.quadraticCurveTo(-24, -24, -26, -16 + sw * 4); g.stroke();
  g.fillStyle = c; g.beginPath(); g.ellipse(0, -19, 16 * bk, 8 * bk, 0, 0, 7); g.fill();
  const qg = g.createLinearGradient(0, -27 * bk, 0, -11); qg.addColorStop(0, 'rgba(255,240,210,.15)'); qg.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = qg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.9; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(2, -24, 10 * bk, 2.5, 0, 0, 7); g.fill();
  leg(-8, sw, c); leg(11, -sw, c);
  if (L.spikes) for (let i = -12; i <= 10; i += 3.5) limb(g, i, -24 * bk + 4, i - 3, -31 * bk + 4 + Math.abs(i) * 0.2, 1.4, L.spikes);
  const hx = 16 * bk, hy = -22 * bk + 2;
  disc(g, hx, hy, 6 * bk, c);
  g.fillStyle = shade(c, -0.08); g.beginPath(); g.ellipse(hx + 6 * bk, hy + 2, 5 * bk, 3 * bk, 0.2, 0, 7); g.fill();
  g.fillStyle = c; g.beginPath(); g.moveTo(hx - 3, hy - 4); g.lineTo(hx - 2, hy - 10); g.lineTo(hx + 1, hy - 5); g.fill();
  if (st.atk > 0) { g.fillStyle = '#2a0808'; g.beginPath(); g.ellipse(hx + 8 * bk, hy + 4, 3, 1.5 * st.atk + 0.5, 0.3, 0, 7); g.fill(); }
  disc(g, hx + 3, hy - 1.5, 1.1, L.eyes || '#101010');
  if (L.eyes) glowDot(g, hx + 3, hy - 1.5, 4, L.eyes);
}

// Gebückter Dämon mit Hufbeinen, Stachelrücken, Schwanz und Klauen (Diablo)
function demon(g, L, st) {
  const c = L.col, ph = st.walk * 0.16, sw = st.moving ? Math.sin(ph) * 0.5 : 0, bob = st.moving ? Math.abs(Math.cos(ph)) * 1.5 : Math.sin(st.t * 2) * 0.6;
  const leg = (x, a, col) => {
    const kx = x + Math.sin(a + 0.55) * 10, ky = -26 + Math.cos(a + 0.55) * 10, hx = kx + Math.sin(a - 0.75) * 10, hy = ky + Math.cos(a - 0.75) * 10;
    limbS(g, x, -26, kx, ky, 6.5, col); limbS(g, kx, ky, hx, hy, 4.6, col);
    const fx = hx + Math.sin(a + 0.2) * 8, fy = hy + Math.cos(a + 0.2) * 8;
    limbS(g, hx, hy, fx, fy, 3.6, col); limbO(g, fx, fy, fx + 4, fy + 0.4, 2.6, '#201008');
  };
  const claw = (sx, sy, a, col) => {
    const [ex, ey] = joint(g, sx, sy, a, a + (st.atk > 0 ? 0.2 : 0.7), 9, 9, 5.4, 4.2, col);
    for (const d of [-0.5, 0, 0.5]) limb(g, ex, ey, ex + Math.sin(a + 0.9 + d) * 6, ey + Math.cos(a + 0.9 + d) * 6, 1.3, L.horn);
  };
  leg(-3, -sw, shade(c, -0.18));
  g.save(); g.translate(0, -bob);
  claw(2, -44, -sw * 0.6 + 0.3, shade(c, -0.2));
  tentacle(g, -6, -28, -24, 22, 4.4, shade(c, -0.12), st.t * 0.6);
  g.restore();
  leg(2, sw, c);
  g.save(); g.translate(0, -bob);
  g.fillStyle = c; g.beginPath(); g.ellipse(1, -37, 11, 14, 0.3, 0, 7); g.fill();
  const tg = g.createRadialGradient(5, -42, 2, 1, -37, 15); tg.addColorStop(0, 'rgba(255,220,180,.25)'); tg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = tg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.9; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(1, -33 + i * 4); g.lineTo(8, -35 + i * 4); g.stroke(); }
  g.fillStyle = L.spikes; for (let i = 0; i < 6; i++) { const y = -50 + i * 4.2, x = -7 - Math.sin(i * 0.5) * 3; g.beginPath(); g.moveTo(x + 2, y - 1); g.lineTo(x - 7 + i * 0.4, y - 5 + i * 0.6); g.lineTo(x + 1, y + 2.5); g.fill(); }
  const hx = 9, hy = -51;
  g.fillStyle = shade(c, -0.05); g.beginPath(); g.ellipse(hx, hy, 6.5, 5.5, 0.2, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
  g.beginPath(); g.ellipse(hx + 6, hy + 2.5, 4.5, 3, 0.25, 0, 7); g.fill(); g.stroke();
  for (const [ox, k] of [[-3, 1], [0, 0.85]]) { g.strokeStyle = shade(L.horn, -0.25 * (1 - k)); g.lineWidth = 2.4 * k; g.beginPath(); g.moveTo(hx + ox, hy - 4); g.quadraticCurveTo(hx + ox - 3, hy - 11 * k, hx + ox - 10 * k, hy - 10 * k); g.stroke(); }
  if (st.atk > 0 || L.roar) { g.fillStyle = '#300804'; g.beginPath(); g.ellipse(hx + 8, hy + 4, 3, 1 + st.atk * 2, 0.3, 0, 7); g.fill(); }
  disc(g, hx + 3, hy - 1, 1.3, L.eyes); disc(g, hx + 5.6, hy - 0.6, 1.1, L.eyes); glowDot(g, hx + 4, hy - 1, 6, L.eyes);
  claw(5, -44, st.atk > 0 ? -1.8 + 3.2 * (1 - (1 - st.atk) ** 2) : sw * 0.6 + 0.5, c);
  g.restore();
}

// Aufgerichteter Madenleib mit Sichelarmen (Duriel)
function grub(g, L, st) {
  const c = L.col, wv = st.moving ? Math.sin(st.walk * 0.2) : Math.sin(st.t * 2) * 0.4;
  const seg = [[-27, -5, 6], [-20, -7, 8], [-12, -10, 9.5], [-4, -15, 11], [2, -24, 10.5], [4, -34, 9]];
  const arm = (dx, col, back) => {
    const a = st.atk > 0 ? -1.6 + 3 * (1 - (1 - st.atk) ** 2) : 0.9 + wv * 0.15 + (back ? 0.3 : 0);
    const [ex, ey] = joint(g, 5 + dx, -36, a, a + 1.3, 9, 8, 3.6, 3, col);
    g.fillStyle = back ? shade(L.spikes, -0.25) : L.spikes; g.beginPath(); g.moveTo(ex, ey);
    g.quadraticCurveTo(ex + Math.sin(a + 2.4) * 12 + 6, ey + Math.cos(a + 2.4) * 12, ex + Math.sin(a + 2.9) * 22, ey + Math.cos(a + 2.9) * 22);
    g.quadraticCurveTo(ex + Math.sin(a + 2.6) * 8, ey + Math.cos(a + 2.6) * 8, ex + 1.5, ey + 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.8; g.stroke();
  };
  arm(-2, shade(c, -0.2), true);
  seg.forEach(([x, y, r], i) => {
    const yy = y + Math.sin(st.t * 4 + i) * 0.7 + (i < 3 ? wv * (3 - i) * 0.8 : 0);
    g.fillStyle = shade(c, -0.08 + i * 0.02); g.beginPath(); g.ellipse(x, yy, r * 1.05, r, 0, 0, 7); g.fill();
    const sg = g.createRadialGradient(x + r * 0.3, yy - r * 0.4, 1, x, yy, r * 1.1); sg.addColorStop(0, 'rgba(255,240,210,.22)'); sg.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = sg; g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 0.9; g.stroke();
    if (i < 5) limb(g, x - r * 0.5, yy - r * 0.95, x - r * 0.8 - 3, yy - r * 1.35 - 2, 1.6, L.spikes);
  });
  const hx = 8, hy = -43;
  disc(g, hx, hy, 6.5, shade(c, -0.04)); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
  const m = st.atk > 0 ? 2.5 : 0.8;
  for (const s of [-1, 1]) { g.fillStyle = L.spikes; g.beginPath(); g.moveTo(hx + 4, hy + 2); g.quadraticCurveTo(hx + 12, hy + 2 + s * (2 + m), hx + 9, hy + 6 + s * m); g.lineTo(hx + 5, hy + 4); g.fill(); }
  disc(g, hx + 3, hy - 2, 1.3, L.eyes); disc(g, hx + 5.5, hy - 1.5, 1.1, L.eyes); glowDot(g, hx + 4, hy - 2, 6, L.eyes);
  arm(1, c, false);
}

function bird(g, L, st) {
  const f = Math.sin(st.t * 22) * 10, y = -36 + Math.sin(st.t * 3) * 3;
  g.fillStyle = L.col;
  g.beginPath(); g.moveTo(-2, y); g.lineTo(-10, y - 6 - f); g.lineTo(4, y - 1); g.fill();
  g.beginPath(); g.ellipse(0, y, 8, 4, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(1, y); g.lineTo(-6, y - 4 + f); g.lineTo(6, y); g.fill();
  disc(g, 7, y - 2, 3, L.col); g.fillStyle = '#c8a040'; g.beginPath(); g.moveTo(9, y - 2); g.lineTo(13, y - 1); g.lineTo(9, y); g.fill();
}

function wisp(g, L, st) {
  const y = -30 + Math.sin(st.t * 4) * 3;
  glowDot(g, 0, y, 20, L.col); disc(g, 0, y, 5, '#ffffff'); glowDot(g, 0, y, 9, L.col);
  for (let i = 0; i < 3; i++) { const a = st.t * 3 + i * 2.1; limb(g, 0, y, Math.cos(a) * 12, y + Math.sin(a) * 12, 1, L.col); }
}

function hammerRig(g, L, st) {
  g.save(); g.translate(0, -30 + Math.sin(st.t * 4) * 3); g.rotate(st.t * 9);
  glowDot(g, 0, 0, 18, '#c0a0ff');
  limb(g, 0, 10, 0, -6, 2.6, '#8a6a40'); g.fillStyle = L.col; g.fillRect(-7, -12, 14, 7);
  g.restore();
}

function trap(g, L, st) {
  g.fillStyle = '#3a3a40'; g.fillRect(-7, -9, 14, 9); g.fillStyle = '#5a5a62'; g.fillRect(-7, -11, 14, 3);
  limb(g, 0, -11, 0, -20, 1.6, '#8a8a90'); disc(g, 0, -21, 2.5, L.col);
  glowDot(g, 0, -21, 10 + Math.sin(st.t * 10) * 3, L.col);
}

function hydra(g, L, st) {
  disc(g, 0, -4, 9, shade(L.col, -0.1));
  for (const [dx, hgt, ph] of [[-8, -26, 0], [0, -34, 2], [8, -26, 4]]) {
    const sx = Math.sin(st.t * 3 + ph) * 3, hx = dx + sx, hy = hgt;
    g.strokeStyle = L.col; g.lineWidth = 4; g.beginPath(); g.moveTo(dx * 0.4, -6); g.quadraticCurveTo(dx * 1.4, hy * 0.5, hx, hy); g.stroke();
    g.fillStyle = L.col; g.beginPath(); g.ellipse(hx + 3, hy, 5, 3, 0.2, 0, 7); g.fill();
    disc(g, hx + 4, hy - 1, 1, '#ffd040'); glowDot(g, hx + 6, hy + 1, 6, '#ff6020');
  }
}

// reproduzierbarer Zufall aus einem Hash
const seeded = h => { let s = h >>> 0 || 1; return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296; };
// ---------- Fässer, Urnen, Truhen, Schreine ----------
function drawProp(g, pr, sx, sy, t, hov) {
  g.save(); g.translate(sx, sy); g.lineCap = 'round';
  if (hov) g.filter = 'brightness(1.6)';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(2, 1, pr.k === 'shrine' ? 18 : 13, 6, 0, 0, 7); g.fill();
  const cyl = (col, w) => { const lg = g.createLinearGradient(-w, 0, w, 0); lg.addColorStop(0, shade(col, -0.2)); lg.addColorStop(0.35, shade(col, 0.08)); lg.addColorStop(1, shade(col, -0.32)); return lg; };
  const r = seeded(pr.seed * 1000);
  if (pr.k === 'barrel') {
    if (pr.open) { for (let i = 0; i < 5; i++) { const a = r() * 6.283; limb(g, Math.cos(a) * 4, Math.sin(a) * 2, Math.cos(a) * 14, Math.sin(a) * 6, 3, i % 2 ? '#5a3c20' : '#6a4a2a'); } limb(g, -8, -1, 8, 2, 1.6, '#3a3a3a'); }
    else {
      g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(-12.5, -14, -9, -28); g.lineTo(9, -28); g.quadraticCurveTo(12.5, -14, 9, 0); g.closePath();
      g.fillStyle = cyl('#6a4a2a', 11); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.3)'; for (const x of [-5, 0, 5]) { g.beginPath(); g.moveTo(x, -1); g.quadraticCurveTo(x * 1.3, -14, x, -27); g.stroke(); }
      for (const y of [-6, -22]) { g.strokeStyle = '#2a2a2c'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, y, 11.6, 3.4, 0, 0, Math.PI); g.stroke(); }
      g.fillStyle = '#7a5a34'; g.beginPath(); g.ellipse(0, -28, 9, 3.4, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
    }
  } else if (pr.k === 'urn') {
    if (pr.open) for (let i = 0; i < 6; i++) { const a = r() * 6.283, d = 4 + r() * 10; g.fillStyle = i % 2 ? '#8a5030' : '#a0603a'; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.5); g.lineTo(Math.cos(a) * d + 4, Math.sin(a) * d * 0.5 - 2); g.lineTo(Math.cos(a) * d + 1, Math.sin(a) * d * 0.5 + 2); g.fill(); }
    else {
      g.beginPath(); g.moveTo(-4, -31); g.lineTo(-4, -27); g.bezierCurveTo(-14, -22, -14, -6, -6, 0); g.lineTo(6, 0); g.bezierCurveTo(14, -6, 14, -22, 4, -27); g.lineTo(4, -31); g.closePath();
      g.fillStyle = cyl('#a0603a', 12); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = 'rgba(40,16,8,.55)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, -17, 11, 2.6, 0, 0, Math.PI); g.stroke();
      g.fillStyle = '#5a2c18'; g.beginPath(); g.ellipse(0, -31, 5, 1.8, 0, 0, 7); g.fill();
    }
  } else if (pr.k === 'chest') {
    g.fillStyle = '#2e1e10'; g.beginPath(); g.moveTo(13, 0); g.lineTo(18, -4); g.lineTo(18, -16); g.lineTo(13, -12); g.fill();
    g.fillStyle = cyl('#6a4424', 14); g.fillRect(-14, -12, 27, 12); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(-14, -12, 27, 12);
    for (const x of [-10, 9]) limb(g, x, -12, x, 0, 2, '#b08a30');
    if (pr.open) {
      glowDot(g, 0, -14, 16, '#806020');
      g.fillStyle = '#1a1008'; g.beginPath(); g.moveTo(-14, -12); g.lineTo(13, -12); g.lineTo(18, -16); g.lineTo(-9, -16); g.fill();
      g.fillStyle = '#5a3a1e'; g.beginPath(); g.moveTo(-9, -16); g.lineTo(18, -16); g.lineTo(16, -32); g.lineTo(-11, -32); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
    } else {
      g.fillStyle = '#7a5030'; g.beginPath(); g.moveTo(-14, -12); g.quadraticCurveTo(-12, -22, -9, -21); g.lineTo(18, -21); g.quadraticCurveTo(19, -18, 18, -16); g.lineTo(13, -12); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
      g.fillStyle = '#d0a840'; g.fillRect(-2, -14, 4, 5);
    }
  } else if (pr.k === 'seal') {
    // Siegelstein: glüht, solange das Siegel hält, sonst gesprungen und dunkel
    g.beginPath(); g.moveTo(-10, -2); g.lineTo(-8, -15); g.lineTo(8, -15); g.lineTo(10, -2); g.closePath();
    g.fillStyle = cyl('#4a4038', 10); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#3a322c'; g.beginPath(); g.ellipse(0, -15, 8, 3, 0, 0, 7); g.fill(); g.stroke();
    if (pr.open) { g.strokeStyle = '#120c08'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-3, -15); g.lineTo(1, -9); g.lineTo(-2, -3); g.moveTo(1, -9); g.lineTo(6, -7); g.stroke(); }
    else {
      const pl = 0.7 + Math.sin(t * 4 + pr.seed) * 0.3;
      glowDot(g, 0, -24, 22 * pl, '#b01808');
      g.strokeStyle = '#ff7040'; g.lineWidth = 1.2; g.beginPath();
      [0, 2, 4, 1, 3, 0].forEach((k, i) => { const x = Math.cos(k * 1.2566 - 1.5708 + t) * 6, y = -24 + Math.sin(k * 1.2566 - 1.5708 + t) * 3; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
  } else if (pr.k === 'shrine') {
    g.fillStyle = '#3a3834'; g.beginPath(); g.ellipse(0, -2, 16, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-9, -3); g.lineTo(-6, -52); g.lineTo(0, -60); g.lineTo(6, -52); g.lineTo(9, -3); g.closePath();
    g.fillStyle = cyl('#6a665c', 10); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    const on = !pr.open, pulse = on ? 0.75 + Math.sin(t * 3) * 0.25 : 0;
    g.strokeStyle = on ? '#9fe0ff' : '#4a4844'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, -36, 5, 0, 7); g.moveTo(0, -44); g.lineTo(0, -28); g.moveTo(-5, -36); g.lineTo(5, -36); g.stroke();
    if (on) { glowDot(g, 0, -36, 18 * pulse + 6, '#3a8ac0'); glowDot(g, 0, -60, 10, '#6ac0ff'); }
  }
  g.restore();
}

// ---------- Symbole ----------
const ICONS = {};
const GL_ = {
  L(g, x1, y1, x2, y2, w) { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); },
  C(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); },
  P(g, pts, stroke) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); stroke ? g.stroke() : g.fill(); },
  dark(g, fn) { g.save(); g.fillStyle = 'rgba(0,0,0,.75)'; g.strokeStyle = 'rgba(0,0,0,.75)'; g.shadowBlur = 0; fn(); g.restore(); },
};
// Grundformen, zentriert um (0,0) mit Radius ~16
const GLYPHS = {
  sword: g => { GL_.L(g, -13, 13, 13, -13, 3.4); GL_.L(g, -16, 6, -6, 16, 3); GL_.C(g, -16, 16, 2.6); },
  axe: g => { GL_.L(g, -13, 15, 9, -9, 3); GL_.P(g, [[2, -17], [17, -12], [13, 3], [7, -4]]); },
  mace: g => { GL_.L(g, -13, 14, 5, -4, 3); GL_.C(g, 8, -8, 7); for (let i = 0; i < 6; i++) { const a = i * 1.047; GL_.L(g, 8 + Math.cos(a) * 6, -8 + Math.sin(a) * 6, 8 + Math.cos(a) * 11, -8 + Math.sin(a) * 11, 2); } },
  spear: g => { GL_.L(g, -15, 15, 11, -11, 2.6); GL_.P(g, [[17, -17], [6, -12], [12, -6]]); },
  dagger: g => { GL_.L(g, -9, 9, 10, -10, 3.4); GL_.L(g, -12, 3, -3, 12, 2.5); },
  claw: g => { for (const d of [-6, 0, 6]) GL_.L(g, -8 + d * 0.3, 10, 8 + d, -14 + Math.abs(d) * 0.5, 2.2); g.fillRect(-14, 7, 11, 9); },
  bow: g => { g.lineWidth = 3; g.beginPath(); g.arc(14, 14, 26, Math.PI * 1.02, Math.PI * 1.48); g.stroke(); GL_.L(g, -12, 12, 12, -12, 1); },
  arrow: g => { GL_.L(g, -14, 14, 14, -14, 2.6); GL_.L(g, 14, -14, 5, -13, 2.6); GL_.L(g, 14, -14, 13, -5, 2.6); GL_.L(g, -14, 14, -14, 7, 2); GL_.L(g, -14, 14, -7, 14, 2); },
  shield: g => { GL_.P(g, [[-13, -15], [13, -15], [13, 0], [0, 16], [-13, 0]]); GL_.dark(g, () => GL_.P(g, [[-8, -10], [8, -10], [8, -1], [0, 9], [-8, -1]], 1)); },
  helm: g => { g.beginPath(); g.arc(0, 2, 14, Math.PI, 0); g.fill(); g.fillRect(-14, 2, 28, 6); g.fillRect(-2, 2, 4, 12); },
  skull: g => { GL_.C(g, 0, -3, 11); g.fillRect(-7, 5, 14, 8); GL_.dark(g, () => { GL_.C(g, -4.5, -3, 3.2); GL_.C(g, 4.5, -3, 3.2); g.fillRect(-4, 9, 2, 4); g.fillRect(2, 9, 2, 4); }); },
  bone: g => { GL_.L(g, -11, 11, 11, -11, 4.5); for (const [x, y] of [[-14, 9], [-9, 14], [14, -9], [9, -14]]) GL_.C(g, x, y, 3.4); },
  fang: g => GL_.P(g, [[-5, -12], [5, -12], [0, 13]]),
  hand: g => { g.fillRect(-9, -1, 16, 14); for (let i = 0; i < 4; i++) GL_.L(g, -7 + i * 5, -1, -8 + i * 5.5, -14, 3.2); GL_.L(g, 7, 5, 13, -3, 3.2); },
  fist: g => { g.beginPath(); g.roundRect(-11, -9, 22, 19, 4); g.fill(); GL_.dark(g, () => { for (const x of [-5, 0, 5]) GL_.L(g, x, -9, x, -3, 1.4); GL_.L(g, -11, 2, 4, 2, 1.4); }); },
  foot: g => { GL_.L(g, -8, -16, -4, 6, 5.5); GL_.P(g, [[-9, 3], [12, 6], [12, 13], [-9, 13]]); },
  eye: g => { g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(0, -14, 16, 0); g.quadraticCurveTo(0, 14, -16, 0); g.stroke(); GL_.C(g, 0, 0, 5); },
  wing: g => { for (let i = 0; i < 5; i++) { g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 12); g.quadraticCurveTo(-8 + i * 2, -10 + i * 2, 14 - i, -14 + i * 7); g.stroke(); } },
  feather: g => { g.save(); g.rotate(-0.785); g.beginPath(); g.ellipse(0, -2, 6, 15, 0, 0, 7); g.fill(); g.restore(); GL_.dark(g, () => GL_.L(g, -12, 14, 10, -12, 1.4)); },
  bird: g => { GL_.P(g, [[-17, -6], [0, 4], [17, -6], [0, -1]]); GL_.C(g, 0, 4, 4.5); },
  wolf: g => { GL_.P(g, [[-12, -13], [-6, -3], [6, -3], [12, -13], [11, 3], [0, 15], [-11, 3]]); GL_.dark(g, () => { GL_.C(g, -5, 1, 2); GL_.C(g, 5, 1, 2); }); },
  bear: g => { GL_.C(g, 0, 2, 12); GL_.C(g, -10, -9, 4.5); GL_.C(g, 10, -9, 4.5); GL_.dark(g, () => { GL_.C(g, -4, 0, 1.8); GL_.C(g, 4, 0, 1.8); GL_.C(g, 0, 6, 2.6); }); },
  paw: g => { GL_.C(g, 0, 6, 8); for (const [x, y] of [[-10, -4], [-4, -10], [4, -10], [10, -4]]) GL_.C(g, x, y, 3.6); },
  leaf: g => { g.save(); g.rotate(-0.7); g.beginPath(); g.ellipse(0, 0, 7, 16, 0, 0, 7); g.fill(); g.restore(); GL_.dark(g, () => GL_.L(g, -10, 10, 10, -10, 1.4)); },
  tree: g => { g.fillRect(-2.5, 2, 5, 14); GL_.C(g, 0, -6, 10); GL_.C(g, -8, 0, 7); GL_.C(g, 8, 0, 7); },
  flame: g => { g.beginPath(); g.moveTo(0, -17); g.bezierCurveTo(10, -6, 12, 6, 0, 14); g.bezierCurveTo(-12, 6, -10, -6, -3, -10); g.bezierCurveTo(-3, -4, 1, -6, 0, -17); g.fill(); },
  fireball: g => { GL_.C(g, 5, -5, 9); GL_.L(g, -1, 1, -15, 15, 3); GL_.L(g, 3, 4, -9, 16, 2); GL_.L(g, -2, -2, -14, 8, 2); },
  comet: g => { GL_.C(g, 8, -8, 6); GL_.L(g, 4, -4, -14, 14, 4); GL_.L(g, 8, -2, -6, 14, 1.6); GL_.L(g, 2, -8, -12, 4, 1.6); },
  snowflake: g => { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a); GL_.L(g, -c * 15, -s * 15, c * 15, s * 15, 2.6); for (const d of [-9, 9]) { GL_.L(g, c * d, s * d, c * d * 1.4 - s * 4, s * d * 1.4 + c * 4, 1.6); GL_.L(g, c * d, s * d, c * d * 1.4 + s * 4, s * d * 1.4 - c * 4, 1.6); } } },
  shard: g => GL_.P(g, [[0, -17], [6, 0], [0, 17], [-6, 0]]),
  orb: g => { GL_.C(g, 0, 0, 11); g.save(); g.fillStyle = 'rgba(255,255,255,.55)'; GL_.C(g, -4, -4, 3.5); g.restore(); },
  spiral: g => { g.lineWidth = 2.6; g.beginPath(); for (let a = 0; a < 13; a += 0.2) g.lineTo(Math.cos(a) * a * 1.25, Math.sin(a) * a * 1.25); g.stroke(); },
  bolt: g => GL_.P(g, [[4, -17], [-8, 2], [0, 2], [-5, 17], [9, -3], [1, -3]]),
  chain: g => { g.lineWidth = 2.6; g.beginPath(); [[-16, -14], [-4, -4], [-9, 1], [5, 9], [1, 12], [16, 16]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); GL_.L(g, -4, -4, 8, -10, 1.6); GL_.L(g, 5, 9, 14, 2, 1.6); },
  cloud: g => { GL_.C(g, -7, 2, 8); GL_.C(g, 3, -3, 9); GL_.C(g, 10, 4, 7); g.fillRect(-12, 3, 24, 7); },
  drop: g => { g.beginPath(); g.moveTo(0, -16); g.bezierCurveTo(10, -2, 10, 12, 0, 13); g.bezierCurveTo(-10, 12, -10, -2, 0, -16); g.fill(); },
  bubbles: g => { g.lineWidth = 2.4; for (const [x, y, r] of [[-5, 4, 7], [7, -4, 5], [6, 10, 3.5], [-6, -10, 3]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); } },
  cross: g => { g.fillRect(-4, -15, 8, 30); g.fillRect(-12, -8, 24, 8); },
  heart: g => { g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-20, 0, -10, -16, 0, -6); g.bezierCurveTo(10, -16, 20, 0, 0, 14); g.fill(); },
  star: g => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 15; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); },
  burst: g => { for (let i = 0; i < 8; i++) { const a = i * 0.785; GL_.L(g, Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 16, Math.sin(a) * 16, 3); } GL_.C(g, 0, 0, 4); },
  ring: g => { g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.stroke(); },
  wave: g => { for (const r of [7, 13, 19]) { g.lineWidth = 2.6; g.beginPath(); g.arc(-12, 0, r, -0.9, 0.9); g.stroke(); } },
  tornado: g => { g.lineWidth = 2.4; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(i * 1.4 - 3, -12 + i * 6, 14 - i * 2.6, 3, 0, 0, 7); g.stroke(); } },
  wind: g => { g.lineWidth = 2.6; for (const [y, w] of [[-8, 16], [0, 12], [8, 15]]) { g.beginPath(); g.moveTo(-16, y); g.quadraticCurveTo(0, y - 6, w - 4, y); g.arc(w - 4, y + 3, 3, -1.57, 2); g.stroke(); } },
  hammer: g => { GL_.L(g, -12, 14, 6, -4, 3.2); g.save(); g.translate(8, -6); g.rotate(-0.785); g.fillRect(-10, -5, 20, 10); g.restore(); },
  chevron: g => { g.lineWidth = 3.4; for (const y of [-6, 6]) { g.beginPath(); g.moveTo(-13, y + 7); g.lineTo(0, y - 6); g.lineTo(13, y + 7); g.stroke(); } },
  horn: g => { g.beginPath(); g.moveTo(-15, 9); g.quadraticCurveTo(-4, 11, 6, -3); g.lineTo(14, -15); g.lineTo(12, -2); g.quadraticCurveTo(0, 16, -15, 16); g.closePath(); g.fill(); },
  mouth: g => {
    g.beginPath(); g.moveTo(-15, -3); g.quadraticCurveTo(0, -17, 15, -3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-13, 5); g.quadraticCurveTo(0, 17, 13, 5); g.closePath(); g.fill();
    g.save(); g.fillStyle = '#fff'; for (const x of [-8, 0, 8]) { GL_.P(g, [[x - 2, -3], [x + 2, -3], [x, 1]]); GL_.P(g, [[x - 2, 5], [x + 2, 5], [x, 1.5]]); } g.restore();
  },
  ankh: g => { g.lineWidth = 3.4; g.beginPath(); g.ellipse(0, -9, 5, 6.5, 0, 0, 7); g.stroke(); GL_.L(g, 0, -2.5, 0, 15, 3.4); GL_.L(g, -9, 2, 9, 2, 3.4); },
  rune: g => { g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.stroke(); GL_.P(g, [[0, -11], [9.5, 5.5], [-9.5, 5.5]], 1); for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.52; GL_.L(g, Math.cos(a) * 13, Math.sin(a) * 13, Math.cos(a) * 18, Math.sin(a) * 18, 2); } },
  hydra: g => { g.lineWidth = 3.2; for (const [x, y] of [[-10, -8], [0, -14], [10, -8]]) { g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(x * 1.6, 4, x, y); g.stroke(); GL_.C(g, x, y, 3.6); } },
  trap: g => { g.fillRect(-12, 4, 24, 10); GL_.L(g, 0, 4, 0, -7, 2.6); GL_.C(g, 0, -11, 4); },
  ghost: g => { g.beginPath(); g.arc(0, -3, 11, Math.PI, 0); g.lineTo(11, 14); for (let i = 0; i < 3; i++) g.quadraticCurveTo(7 - i * 7.3, 9, 3.7 - i * 7.3, 14); g.closePath(); g.fill(); GL_.dark(g, () => { GL_.C(g, -4, -3, 2.4); GL_.C(g, 4, -3, 2.4); }); },
  figure: g => { GL_.C(g, 0, -11, 5); GL_.P(g, [[-7, -4], [7, -4], [9, 9], [4, 9], [3, 16], [-3, 16], [-4, 9], [-9, 9]]); },
  golem: g => { g.fillRect(-6, -16, 12, 9); g.fillRect(-11, -6, 22, 14); g.fillRect(-10, 8, 7, 9); g.fillRect(3, 8, 7, 9); GL_.dark(g, () => { g.fillRect(-4, -13, 2, 2); g.fillRect(2, -13, 2, 2); }); },
  crown: g => GL_.P(g, [[-14, 10], [-14, -8], [-7, 0], [0, -12], [7, 0], [14, -8], [14, 10]]),
  moon: g => { g.beginPath(); g.arc(0, 0, 14, 0.7, 5.6); g.arc(7, -3, 10, 4.9, 1.4, true); g.closePath(); g.fill(); },
  beam: g => { GL_.L(g, -16, 16, 16, -16, 6); g.save(); g.strokeStyle = '#fff'; GL_.L(g, -16, 16, 16, -16, 2); g.restore(); GL_.C(g, -15, 15, 4.5); },
  cone: g => { g.save(); g.globalAlpha *= 0.85; g.beginPath(); g.moveTo(-16, 0); g.lineTo(16, -14); g.quadraticCurveTo(21, 0, 16, 14); g.closePath(); g.fill(); g.restore(); },
  rain: g => { for (let i = 0; i < 6; i++) GL_.L(g, -11 + i * 5, -15 + (i % 2) * 4, -15 + i * 5, 2 + (i % 2) * 4, 2.2); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 12, 15, 3.5, 0, 0, 7); g.stroke(); },
  crack: g => { g.lineWidth = 2.6; for (const pts of [[[0, 0], [-6, -5], [-9, -14]], [[0, 0], [7, -3], [15, -9]], [[0, 0], [3, 8], [-2, 16]], [[0, 0], [-8, 5], [-16, 6]]]) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); } },
  volcano: g => { GL_.P(g, [[-17, 16], [-5, -3], [5, -3], [17, 16]]); GL_.L(g, 0, -5, -5, -16, 2.4); GL_.L(g, 0, -5, 5, -17, 2.4); GL_.C(g, 0, -10, 2.6); },
  explode: g => { for (let i = 0; i < 10; i++) { const a = i * 0.628, r = i % 2 ? 11 : 17; GL_.L(g, 0, 0, Math.cos(a) * r, Math.sin(a) * r, 2.6); } GL_.C(g, 0, 0, 6); },
  speed: g => { GL_.L(g, -6, 0, 12, 0, 3.4); GL_.P(g, [[17, 0], [8, -7], [8, 7]]); GL_.L(g, -16, -7, -5, -7, 2); GL_.L(g, -14, 7, -3, 7, 2); },
  bug: g => { g.beginPath(); g.ellipse(0, 1, 6, 9, 0, 0, 7); g.fill(); GL_.C(g, 0, -10, 3.5); for (const y of [-3, 2, 7]) { GL_.L(g, -5, y, -12, y - 3, 1.6); GL_.L(g, 5, y, 12, y - 3, 1.6); } },
  rock: g => GL_.P(g, [[-12, -4], [-6, -13], [6, -12], [13, -3], [10, 10], [-2, 13], [-12, 7]]),
  vine: g => { g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 15); g.bezierCurveTo(-18, 0, 8, 4, 0, -6); g.bezierCurveTo(-6, -14, 12, -18, 14, -12); g.stroke(); for (const [x, y, a] of [[-11, 4, -0.6], [3, -2, 0.7], [6, -14, -0.4]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 3, 6, 0, 0, 7); g.fill(); g.restore(); } },
  cat: g => { GL_.C(g, 0, 3, 11); GL_.P(g, [[-11, -2], [-9, -15], [-2, -7]]); GL_.P(g, [[11, -2], [9, -15], [2, -7]]); GL_.dark(g, () => { g.beginPath(); g.ellipse(-4, 1, 1.4, 3.4, 0, 0, 7); g.ellipse(4, 1, 1.4, 3.4, 0, 0, 7); g.fill(); GL_.L(g, -3, 9, -14, 7, 1); GL_.L(g, 3, 9, 14, 7, 1); }); },
  hourglass: g => { GL_.P(g, [[-10, -15], [10, -15], [0, 0]]); GL_.P(g, [[-10, 15], [10, 15], [0, 0]]); },
};

// Symbol je Fähigkeit: Ebenen "form[*anzahl][:x,y,größe,drehung]"
const ICON_SPEC = {
  attack: 'sword', shoot: 'bow arrow:4,-4,.8',
  jab: 'spear*3', magic_arrow: 'arrow star:9,-9,.45', fire_arrow: 'arrow flame:9,-9,.5', cold_arrow: 'arrow snowflake:9,-9,.5', multiple_shot: 'arrow*5:0,0,.8',
  power_strike: 'spear bolt:-8,-8,.55', poison_javelin: 'spear drop:-8,-8,.55', guided_arrow: 'arrow eye:-8,-8,.5', freezing_arrow: 'arrow shard:-8,-8,.55',
  lightning_fury: 'spear chain:-6,-6,.6', valkyrie: 'wing helm:4,6,.6', critical_strike: 'burst sword:0,0,.55', d2_dodge: 'figure speed:6,6,.5',
  fire_bolt: 'comet', ice_bolt: 'shard:0,0,1,.785', charged_bolt: 'bolt*3:0,0,.6', frost_nova: 'ring snowflake:0,0,.55', static_field: 'ring bolt:0,0,.6',
  fire_ball: 'fireball', lightning: 'beam', teleport: 'spiral', chain_lightning: 'chain', frozen_armor: 'shield snowflake:0,-2,.5', energy_shield: 'orb ring:0,0,1.15',
  blizzard: 'rain snowflake:6,-8,.45', meteor: 'rock:4,4,.8 comet:-2,-6,.7', frozen_orb: 'orb shard*3:0,10,.45', hydra: 'hydra', warmth: 'flame heart:6,8,.45',
  fire_mastery: 'flame star:8,8,.45', cold_mastery: 'snowflake star:8,8,.45', lightning_mastery: 'bolt star:8,8,.45',
  teeth: 'fang*3:0,0,.8', raise_skeleton: 'skull bone:0,12,.5', amplify_damage: 'burst skull:0,0,.6', bone_armor: 'shield bone:0,0,.6', clay_golem: 'golem',
  skeletal_mage: 'skull:-3,3,.8 orb:9,-10,.4', corpse_explosion: 'explode skull:0,4,.45', skeleton_mastery: 'skull star:9,9,.45', bone_spear: 'bone:0,0,1.15',
  blood_golem: 'golem drop:9,-9,.45', decrepify: 'skull:0,0,.75 hourglass:9,9,.4', poison_nova: 'ring drop:0,0,.5', bone_spirit: 'ghost skull:0,0,.45',
  bash: 'mace burst:-8,8,.5', howl: 'mouth wave:6,0,.6', double_swing: 'axe*2', shout: 'horn', leap_attack: 'figure chevron:0,-8,.5', battle_orders: 'horn crown:6,-8,.45',
  whirlwind: 'tornado sword:0,0,.5', berserk: 'axe eye:-6,6,.45', war_cry: 'horn burst:8,-6,.5', sword_mastery: 'sword star:8,8,.45', iron_skin: 'figure shield:6,4,.5',
  increased_speed: 'speed', natural_resistance: 'leaf ring:0,0,1.1',
  sacrifice: 'sword drop:-8,-8,.5', smite: 'shield burst:8,-8,.5', might: 'rune sword:0,0,.5', prayer: 'rune cross:0,0,.5', holy_fire: 'rune flame:0,0,.5',
  holy_bolt: 'cross:-3,3,.8 comet:6,-6,.5', charge: 'shield speed:6,8,.5', holy_freeze: 'rune snowflake:0,0,.5', blessed_hammer: 'spiral hammer:0,0,.6', conversion: 'ankh',
  conviction: 'rune eye:0,0,.5', fanaticism: 'rune chevron:0,0,.45', fist_of_heavens: 'cloud:0,-8,.8 bolt:0,6,.6',
  firestorm: 'flame*3:0,0,.7', raven: 'bird', arctic_blast: 'cone snowflake:-4,0,.4', molten_boulder: 'rock flame:6,-8,.45', summon_spirit_wolf: 'wolf',
  cyclone_armor: 'shield wind:0,0,.6', fissure: 'crack flame:0,0,.4', oak_sage: 'tree', twister: 'tornado*3:0,0,.6', tornado: 'tornado', summon_grizzly: 'bear',
  hurricane: 'wind ring:0,0,1.1', volcano: 'volcano',
  tiger_strike: 'claw paw:-8,8,.4', fire_blast: 'explode flame:0,0,.45', psychic_hammer: 'hammer eye:-8,8,.4', claw_mastery: 'claw star:-8,8,.4',
  burst_of_speed: 'speed chevron:-8,-8,.4', wake_of_fire: 'wave flame:-8,0,.5', dragon_talon: 'foot', cloak_of_shadows: 'moon', shadow_warrior: 'figure ghost:8,-8,.4',
  venom: 'dagger drop:-8,-8,.45', lightning_sentry: 'trap bolt:8,-8,.45', mind_blast: 'eye wave:0,8,.4', fade: 'ghost',
  bind_wound: 'cross heart:8,8,.45', slashing: 'sword*2', blunt_weapons: 'mace star:-8,8,.4', endurance: 'heart', critical_hit: 'burst axe:0,0,.55',
  dodge: 'speed figure:-8,0,.45', riposte: 'sword sword:0,0,1,1.571', dual_wield: 'dagger*2', concentration: 'eye orb:0,0,.35', healing: 'cross', root: 'vine',
  shield_bash: 'shield fist:6,6,.45', cyclone: 'wind axe:0,0,.5',
  slam: 'mace crack:0,8,.5', bw_charge: 'fist speed:-6,8,.45', stunning_strike: 'fist star:8,-8,.45', ground_pound: 'fist crack:0,10,.5',
  strong_stance: 'foot shield:8,-8,.45', ancestral_call: 'ghost horn:8,8,.45', bw_natural_resistance: 'shield ring:0,0,1.1',
  bolt_of_shock: 'bolt orb:6,-6,.4', shock_of_fire: 'flame orb:6,-6,.4', shock_of_frost: 'shard orb:6,-6,.4', cone_of_fire: 'cone flame:-4,0,.4', cone_of_frost: 'cone shard:-4,0,.4',
  fire_flares: 'flame*2:0,0,.75', wave_of_flame: 'ring flame:0,0,.5', fire_storm: 'rain flame:6,-8,.45', frost_storm: 'rain shard:6,-8,.45', wizard_beam: 'beam star:-10,10,.4',
  frost_armor: 'helm snowflake:0,6,.45', fire_weapons: 'sword flame:8,8,.45', cold_weapons: 'sword snowflake:8,8,.45', lightning_weapons: 'sword bolt:8,8,.45', battle_mage: 'sword orb:8,8,.4',
  archery: 'bow star:8,8,.4', wr_fire_arrow: 'bow flame:6,6,.45', wr_cold_arrow: 'bow snowflake:6,6,.45', poison_arrow: 'arrow drop:9,-9,.45', explode_arrow: 'arrow explode:9,-9,.5',
  multi_fire: 'arrow*3:0,0,.85', entangle: 'vine figure:6,0,.45', penetrating_arrows: 'ring arrow:0,0,1.1', light_quiver: 'feather arrow*2:4,4,.5', regeneration: 'leaf heart:8,8,.4',
  summon_arrows: 'arrow*3:0,2,.6 chevron:0,-10,.4',
  hc_holy_bolt: 'cross orb:8,-8,.4', hc_smite: 'mace cross:-8,8,.4', summon_hammer: 'hammer wing:-6,6,.5', turn_undead: 'skull cross:8,8,.4', divine_aura: 'rune shield:0,0,.45',
  blessing: 'cross chevron:0,-10,.4', holy_light: 'cloud:0,-10,.7 burst:0,8,.6',
  disease_bolt: 'drop skull:0,4,.4', life_tap: 'heart drop:8,-8,.4', disease_blade: 'sword drop:8,8,.45', disease_shield: 'shield drop:0,0,.45', disease_trail: 'foot bubbles:6,-8,.45',
  engulfing_darkness: 'cloud moon:0,0,.4', harm_touch: 'hand skull:0,4,.4', summon_skeleton: 'skull', raise_army: 'skull*3:0,0,.6', convert_undead: 'ankh skull:8,8,.4',
  shadow_step: 'moon speed:4,6,.45',
  throwing: 'axe speed:-8,8,.4', summon_axe: 'axe*3:0,0,.7', battle_cry: 'mouth chevron:0,-10,.4', roar: 'cat wave:8,0,.5', berserker_rage: 'eye flame:0,-8,.45',
  blood_lust: 'fang drop:8,-8,.45', axe_bandolier: 'axe axe:0,0,1,1.571',
  poison_bolt: 'drop:0,0,.9 comet:-8,8,.45', drowsy: 'moon cloud:4,8,.45', summon_badger: 'paw', spirit_shield: 'shield ghost:0,0,.45', planar_wind: 'wind',
  poison_weapons: 'dagger drop:8,8,.45', tagars_insects: 'bug*3:0,0,.6', pus_storm: 'rain drop:6,-8,.45', giant_growth: 'figure:0,4,1.15 chevron:9,-9,.35',
};

function drawSpec(g, spec, col) {
  spec.split(' ').forEach((layer, li) => {
    const [head, args = ''] = layer.split(':'), [name, n = 1] = head.split('*'), [x = 0, y = 0, s = 1, r = 0] = args.split(',').map(Number);
    const c = li ? mix(col, '#ffffff', 0.45) : col;
    g.fillStyle = c; g.strokeStyle = c; g.shadowColor = c;
    for (let i = 0; i < +n; i++) {
      const o = i - (n - 1) / 2;
      g.save(); g.translate(28 + x + o * 9 * s, 28 + y); g.rotate(r + o * 0.3); g.scale(s, s);
      GLYPHS[name](g);
      g.restore();
    }
  });
}

function skillIcon(s) {
  if (ICONS[s.id]) return ICONS[s.id];
  const c = mkCanvas(56), g = c.getContext('2d'), col = EL[s.el || s.mods?.ae?.[0] || s.pulse?.el || 'phys'][1];
  const bg = g.createRadialGradient(28, 24, 4, 28, 28, 42);
  bg.addColorStop(0, mix(col, '#000000', 0.6)); bg.addColorStop(1, '#090705');
  g.fillStyle = bg; g.fillRect(0, 0, 56, 56);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowBlur = 7;
  drawSpec(g, ICON_SPEC[s.id] || 'star', col);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, 56, 2); g.fillRect(0, 0, 2, 56);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 54, 56, 2); g.fillRect(54, 0, 2, 56);
  return ICONS[s.id] = c.toDataURL();
}

function itemShape(g, base, col, trim) {
  const metal = '#b4b4bc', wood = '#7a5a38', b = base.toLowerCase();
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (/schwert|klinge/.test(b)) { limb(g, 10, 30, 28, 12, 4, metal); limb(g, 8, 24, 16, 32, 3, trim); limb(g, 6, 34, 10, 30, 3, '#4a3020'); }
  else if (/kolben/.test(b)) { limb(g, 8, 32, 24, 16, 3, wood); disc(g, 26, 14, 6, metal); }
  else if (/axt/.test(b)) { limb(g, 8, 32, 26, 12, 3, wood); g.fillStyle = metal; g.beginPath(); g.moveTo(22, 10); g.quadraticCurveTo(34, 8, 32, 22); g.quadraticCurveTo(28, 16, 22, 18); g.fill(); }
  else if (/bogen/.test(b)) { g.strokeStyle = wood; g.lineWidth = 3; g.beginPath(); g.arc(8, 32, 26, -1.45, -0.1); g.stroke(); limb(g, 10, 7, 33, 30, 1, '#ddd'); }
  else if (/stab/.test(b)) { limb(g, 8, 34, 30, 10, 3, wood); disc(g, 31, 9, 4, trim); }
  else if (/klaue/.test(b)) { g.fillStyle = '#5a4a3a'; g.fillRect(8, 24, 12, 10); for (const d of [0, 5, 10]) limb(g, 12 + d * 0.4, 24, 22 + d, 8 + d * 0.3, 2, metal); }
  else if (/rüstung|hemd|panzer/.test(b)) { g.fillStyle = col; g.beginPath(); g.moveTo(10, 8); g.lineTo(30, 8); g.lineTo(36, 16); g.lineTo(31, 19); g.lineTo(30, 34); g.lineTo(10, 34); g.lineTo(9, 19); g.lineTo(4, 16); g.closePath(); g.fill(); limb(g, 20, 10, 20, 32, 1, 'rgba(0,0,0,.4)'); limb(g, 10, 26, 30, 26, 2, trim); }
  else if (/krone/.test(b)) { g.fillStyle = '#c8a040'; g.beginPath(); g.moveTo(6, 28); g.lineTo(6, 14); g.lineTo(13, 22); g.lineTo(20, 10); g.lineTo(27, 22); g.lineTo(34, 14); g.lineTo(34, 28); g.fill(); }
  else if (/kappe|helm/.test(b)) { g.fillStyle = col; g.beginPath(); g.arc(20, 24, 13, Math.PI, 0); g.fill(); g.fillRect(7, 24, 26, 5); if (/knochen/.test(b)) { disc(g, 15, 22, 2, '#000'); disc(g, 25, 22, 2, '#000'); } }
  else if (/ring/.test(b)) { g.strokeStyle = '#c8a040'; g.lineWidth = 3.5; g.beginPath(); g.arc(20, 24, 8, 0, 7); g.stroke(); disc(g, 20, 15, 4, trim); }
  else if (/amulett/.test(b)) { g.strokeStyle = '#c8a040'; g.lineWidth = 1.5; g.beginPath(); g.arc(20, 14, 11, 0.2, Math.PI - 0.2); g.stroke(); disc(g, 20, 27, 6, trim); disc(g, 20, 27, 3, '#fff8'); }
}
function itemIcon(it) {
  const key = it.base + it.rar;
  if (ICONS[key]) return ICONS[key];
  const c = mkCanvas(40), g = c.getContext('2d'), trim = ['#8a7040', '#6969ff', '#ffff64', '#c7b377'][it.rar];
  itemShape(g, it.base, it.slot === 'armor' ? '#6a5a48' : '#7a7a82', trim);
  return ICONS[key] = c.toDataURL();
}
function potionIcon(k) {
  const key = 'pot' + k;
  if (ICONS[key]) return ICONS[key];
  const c = mkCanvas(40), g = c.getContext('2d'), col = k === 'hp' ? '#c01818' : '#2038d0';
  g.fillStyle = 'rgba(200,220,230,.35)'; g.beginPath(); g.arc(20, 25, 10, 0, 7); g.fill(); g.fillRect(16, 8, 8, 10);
  g.fillStyle = col; g.beginPath(); g.arc(20, 26, 8, 0, 7); g.fill();
  g.fillStyle = '#7a5a38'; g.fillRect(16, 6, 8, 4);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(17, 23, 2.5, 0, 7); g.fill();
  return ICONS[key] = c.toDataURL();
}

// ---------- Effekte je Fähigkeit ----------
const PROJ_VIS = {
  bone_spear: 'bone', bone_spirit: 'skull', teeth: 'fang', blessed_hammer: 'hammer', psychic_hammer: 'phammer', tornado: 'tornado', twister: 'twister',
  molten_boulder: 'boulder', throwing: 'axe', summon_axe: 'axe', poison_javelin: 'javelin', lightning_fury: 'javelin', ice_bolt: 'shard', shock_of_frost: 'shard',
  charged_bolt: 'spark', bolt_of_shock: 'spark', lightning: 'beam', wizard_beam: 'beam', holy_bolt: 'cross', hc_holy_bolt: 'cross', wake_of_fire: 'flame',
  firestorm: 'flame', arctic_blast: 'mist', cone_of_frost: 'mist', drowsy: 'mist', cone_of_fire: 'fwave', tagars_insects: 'insects', planar_wind: 'wind',
  life_tap: 'drain', disease_bolt: 'goo', poison_bolt: 'goo', fire_bolt: 'firebolt', shock_of_fire: 'firebolt', fire_flares: 'firebolt', fire_ball: 'fireball',
  fire_blast: 'bomb', frozen_orb: 'forb', magic_arrow: 'magic',
};
const HIT_VIS = {
  attack: 'slash', jab: 'thrust', power_strike: 'spark', bash: 'impact', double_swing: 'slash', berserk: 'dark', sacrifice: 'blood', smite: 'holy',
  tiger_strike: 'claw', dragon_talon: 'impact', shield_bash: 'impact', slam: 'impact', stunning_strike: 'impact', harm_touch: 'dark', hc_smite: 'holy',
};
const AREA_VIS = { fissure: 'lava', volcano: 'volcano', fist_of_heavens: 'sky', holy_light: 'pillar', amplify_damage: 'curse', decrepify: 'curse', root: 'vines', entangle: 'vines', engulfing_darkness: 'dark', mind_blast: 'psy' };
const AURA_COL = { might: '#ff4030', prayer: '#60a0ff', holy_fire: '#ff8020', holy_freeze: '#80d0ff', conviction: '#c050e0', fanaticism: '#ffd040' };
const SHIELD_VIS = { bone_armor: 'bones', energy_shield: 'bubble', cyclone_armor: 'wind', spirit_shield: 'wisps', divine_aura: 'halo' };

// Geschosse: (sx, gy) = Bodenpunkt, a = Flugrichtung am Bildschirm, tail = Bildschirmpunkt hinter dem Geschoss
function drawProjVis(g, vis, sx, gy, a, t, col, tail) {
  const y = gy - 26;
  g.save();
  switch (vis) {
    case 'bone': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 22, '#8060c0'); limbO(g, -16, 0, 12, 0, 4, '#ece4cc'); for (const [x, yy] of [[-17, -3], [-17, 3], [13, -3], [13, 3]]) disc(g, x, yy, 3, '#ece4cc'); break;
    case 'skull': g.translate(sx, y + Math.sin(t * 9) * 3); glowDot(g, 0, 0, 26, '#a060ff'); disc(g, 0, 0, 7, '#e0d8ff'); g.fillRect(-4, 4, 8, 5); disc(g, -2.6, -1, 2, '#301060'); disc(g, 2.6, -1, 2, '#301060'); break;
    case 'fang': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 12, '#9070d0'); g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(9, 0); g.lineTo(-5, -3.5); g.lineTo(-5, 3.5); g.fill(); break;
    case 'hammer': case 'phammer':
      g.translate(sx, y); g.rotate(t * (vis === 'hammer' ? 14 : 6)); if (vis === 'phammer') g.globalAlpha = 0.65;
      glowDot(g, 0, 0, 26, vis === 'hammer' ? '#80a0ff' : '#c060ff'); limb(g, 0, 12, 0, -4, 3, '#a08060'); g.fillStyle = vis === 'hammer' ? '#eef4ff' : '#e0b0ff'; g.fillRect(-9, -10, 18, 8); break;
    case 'tornado': case 'twister': {
      const n = vis === 'tornado' ? 7 : 5, s = vis === 'tornado' ? 1 : 0.65;
      g.globalAlpha = 0.6;
      for (let i = 0; i < n; i++) { g.strokeStyle = i % 2 ? '#c8c0b0' : '#8a8478'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx + Math.sin(t * 14 + i) * 4 * s, gy - i * 10 * s, (5 + i * 3.6) * s, (2 + i * 1.2) * s, 0, t * 20 + i, t * 20 + i + 4.5); g.stroke(); }
      break;
    }
    case 'boulder': g.translate(sx, gy - 13); g.rotate(t * 7); glowDot(g, 0, 0, 34, '#ff5010'); g.fillStyle = '#3a2a22'; g.beginPath(); [[-12, -4], [-6, -13], [6, -12], [13, -3], [10, 10], [-2, 13], [-12, 7]].forEach(([x, yy], i) => i ? g.lineTo(x, yy) : g.moveTo(x, yy)); g.fill();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ff8a20'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, -2); g.lineTo(0, 2); g.lineTo(6, -6); g.moveTo(0, 2); g.lineTo(2, 10); g.stroke(); break;
    case 'axe': g.translate(sx, y); g.rotate(t * 20); limbO(g, 0, 9, 0, -9, 2.4, '#6a4a2a'); g.fillStyle = '#c8c8d0'; g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(9, -11, 9, -2); g.quadraticCurveTo(5, -4, 0, -3); g.fill(); break;
    case 'javelin': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 20, col); limbO(g, -22, 0, 10, 0, 2.2, '#7a5a38'); g.fillStyle = '#d8d8e0'; g.beginPath(); g.moveTo(17, 0); g.lineTo(9, -3.5); g.lineTo(9, 3.5); g.fill(); break;
    case 'shard': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 20, '#60b0ff'); g.fillStyle = '#e8f8ff'; g.beginPath(); g.moveTo(13, 0); g.lineTo(0, -4); g.lineTo(-12, 0); g.lineTo(0, 4); g.fill(); break;
    case 'spark': g.translate(sx, y); glowDot(g, 0, 0, 22, col); g.strokeStyle = '#fffbe0'; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const b = t * 30 + i * 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(b) * 6, Math.sin(b) * 6); g.lineTo(Math.cos(b + 0.6) * 11, Math.sin(b + 0.6) * 11); g.stroke(); } break;
    case 'beam': g.globalCompositeOperation = 'lighter'; for (const [w, c] of [[12, col + '55'], [5, col], [2, '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(tail[0], tail[1] - 26); g.lineTo(sx, y); g.stroke(); } break;
    case 'cross': g.translate(sx, y); g.rotate(t * 5); glowDot(g, 0, 0, 24, '#ffd060'); g.fillStyle = '#fff6d0'; g.fillRect(-2, -8, 4, 16); g.fillRect(-6, -4, 12, 4); break;
    case 'flame': g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const h = 22 + Math.sin(t * 20 + i * 2) * 6, x = sx + (i - 1) * 6; g.fillStyle = ['#ff4a00', '#ff9a20', '#ffe080'][i]; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(x, gy - h); g.quadraticCurveTo(x + 7, gy - 6, x, gy); g.quadraticCurveTo(x - 7, gy - 6, x, gy - h); g.fill(); }
      break;
    case 'mist': case 'fwave': g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) glowDot(g, sx + Math.cos(t * 5 + i * 1.6) * 8, y + Math.sin(t * 4 + i * 2) * 5, 16, vis === 'mist' ? '#a8e0ff' : '#ff8a30'); break;
    case 'insects': for (let i = 0; i < 9; i++) { const b = t * 9 + i * 0.7, r = 6 + (i % 3) * 4; disc(g, sx + Math.cos(b * (i % 2 ? 1 : -1.3)) * r, y + Math.sin(b * 1.7) * r * 0.7, 1.6, i % 3 ? '#1a2a10' : '#8adf50'); } glowDot(g, sx, y, 14, '#4a8a20'); break;
    case 'wind': g.globalAlpha = 0.7; g.strokeStyle = '#e8e8e0'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(sx, y, 8 + i * 6, t * 12 + i * 2, t * 12 + i * 2 + 2.6); g.stroke(); } break;
    case 'drain': g.translate(sx, y); glowDot(g, 0, 0, 24, '#c02050'); disc(g, 0, 0, 5, '#ff8090'); g.strokeStyle = '#a01040'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 9, t * 10 + i * 2.1, t * 10 + i * 2.1 + 1.2); g.stroke(); } break;
    case 'goo': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 20, col); g.fillStyle = shade(col, -0.35); g.beginPath(); g.ellipse(0, 0, 9, 5.5, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(1, -1, 6, 3.5, 0, 0, 7); g.fill(); disc(g, -10, 2, 2, col); break;
    case 'firebolt': case 'fireball': {
      const s = vis === 'fireball' ? 1.5 : 1;
      g.translate(sx, y); g.rotate(a); g.globalCompositeOperation = 'lighter';
      glowDot(g, 0, 0, 26 * s, '#ff5a10');
      g.fillStyle = '#ff7a20'; g.beginPath(); g.moveTo(8 * s, 0); g.quadraticCurveTo(0, -8 * s, -22 * s, Math.sin(t * 30) * 3); g.quadraticCurveTo(0, 8 * s, 8 * s, 0); g.fill();
      disc(g, 2 * s, 0, 4.5 * s, '#ffe090'); break;
    }
    case 'bomb': g.translate(sx, y); disc(g, 0, 0, 6, '#2a2420'); disc(g, -2, -2, 2, '#5a504a'); glowDot(g, 4, -6, 10 + Math.sin(t * 40) * 3, '#ffb040'); break;
    case 'forb': g.translate(sx, y); g.rotate(t * 6); glowDot(g, 0, 0, 30, '#60b8ff'); disc(g, 0, 0, 8, '#e0f6ff'); g.fillStyle = '#b0e4ff'; for (let i = 0; i < 6; i++) { g.rotate(1.047); g.beginPath(); g.moveTo(0, -16); g.lineTo(-2.5, -7); g.lineTo(2.5, -7); g.fill(); } break;
    case 'magic': g.translate(sx, y); g.rotate(a); glowDot(g, 0, 0, 18, '#b070ff'); limb(g, -16, 0, 8, 0, 2.4, '#e0c0ff'); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(12, 0); g.lineTo(5, -3); g.lineTo(5, 3); g.fill(); break;
  }
  g.restore();
}

// Treffereffekte am Ziel (k = Fortschritt 0..1)
function drawHit(g, kind, x, y, k, col) {
  g.save(); g.translate(x, y); g.globalAlpha = 1 - k; g.lineCap = 'round';
  switch (kind) {
    case 'slash': case 'blood':
      for (const [s, c] of [[1, kind === 'blood' ? '#b01010' : '#e8e8f0'], [-1, col]]) { g.strokeStyle = c; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, 16 + k * 6, -1.2 * s - 0.6, -1.2 * s + 0.9 + k); g.stroke(); }
      break;
    case 'thrust': g.strokeStyle = '#f0f0f0'; g.lineWidth = 2; for (const d of [-6, 0, 6]) { g.beginPath(); g.moveTo(-14 + k * 10, d); g.lineTo(10 + k * 10, d * 0.4); g.stroke(); } break;
    case 'claw': g.strokeStyle = '#ff3030'; g.lineWidth = 2.4; for (const d of [-7, 0, 7]) { g.beginPath(); g.moveTo(-10 + d, -14); g.quadraticCurveTo(d, 0, 6 + d, 14 * Math.min(1, k * 3)); g.stroke(); } break;
    case 'impact': case 'holy': g.globalCompositeOperation = 'lighter'; glowDot(g, 0, 0, 30 * (1 - k * 0.5), kind === 'holy' ? '#ffd060' : col); g.strokeStyle = kind === 'holy' ? '#fff0b0' : '#ffffff'; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * (6 + k * 14), Math.sin(a) * (6 + k * 14)); g.lineTo(Math.cos(a) * (14 + k * 22), Math.sin(a) * (14 + k * 22)); g.stroke(); }
      break;
    case 'spark': g.globalCompositeOperation = 'lighter'; glowDot(g, 0, 0, 28, '#fff27a'); g.strokeStyle = '#fffbe0'; g.lineWidth = 1.8; for (let i = 0; i < 5; i++) { const a = i * 1.26 + k * 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10 + 4); g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); g.stroke(); } break;
    case 'dark': disc(g, 0, 0, 10 + k * 24, 'rgba(20,0,30,.6)'); g.globalCompositeOperation = 'lighter'; glowDot(g, 0, 0, 30, '#8020c0'); break;
  }
  g.restore();
}

// Schutzschild-Darstellung um den Helden (Bildschirmkoordinaten, h = Figurenhöhe)
function drawShield(g, vis, x, y, h, t) {
  const cy = y - h * 0.5;
  g.save();
  if (vis === 'bones') for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.094, bx = x + Math.cos(a) * h * 0.42, by = cy + Math.sin(a) * h * 0.18; g.save(); g.translate(bx, by); g.rotate(a); limbO(g, -7, 0, 7, 0, 3, '#e8e0c8'); g.restore(); }
  else if (vis === 'bubble') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(110,170,255,.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, cy, h * 0.42, h * 0.6, 0, 0, 7); g.stroke(); glowDot(g, x - h * 0.15, cy - h * 0.25, h * 0.25, '#3050a0'); for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(x, cy, h * 0.42, h * 0.6, 0, t * 2 + i * 3, t * 2 + i * 3 + 0.8); g.strokeStyle = '#c0e0ff'; g.stroke(); } }
  else if (vis === 'wind') { g.strokeStyle = 'rgba(220,220,210,.55)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x, y - h * (0.2 + i * 0.22), h * 0.45, h * 0.12, 0, t * 9 + i, t * 9 + i + 3); g.stroke(); } }
  else if (vis === 'wisps') { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const a = t * 2.5 + i * 1.57; glowDot(g, x + Math.cos(a) * h * 0.4, cy + Math.sin(a * 1.3) * h * 0.3, 9, '#d0e8ff'); } }
  else if (vis === 'halo') { g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffd860'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y - h - 4, 10, 3.5, 0, 0, 7); g.stroke(); glowDot(g, x, cy, h * 0.55, '#5a4810'); }
  g.restore();
}
