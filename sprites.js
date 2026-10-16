'use strict';
// Grafik: prozedurale Texturen, Figuren, Fähigkeits- und Gegenstandssymbole (keine Originalgrafiken)
const Z = 1.6; // Zoom der isometrischen Projektion
const WALL_H = { brick: 104, rock: 78, tree: 40, sandstone: 96, hell: 104 };

const mkCanvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rr = (a, b) => a + Math.random() * (b - a);
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
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
    tree: tex(128, '#1b2412', (g, s) => { blobs(g, s, 340, ['#2e3b1e', '#3a4a24', '#16200e', '#24301a'], 3, 9, 0.9); grain(g, s, 16); }),
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
  ama: { skin: '#d8a878', body: '#7a5a38', legs: '#5a4028', head: 'hair', hair: '#d8b860', weapon: 'bow', belt: '#3a2a1a' },
  asn: { skin: '#c89878', body: '#2a2030', legs: '#1a1420', head: 'mask', hair: '#202020', weapon: 'claw', cape: '#3a2050' },
  bar: { skin: '#c8946a', body: '#c8946a', legs: '#6a5038', head: 'horns', helm: '#8a8478', horn: '#d8d0c0', weapon: 'axe', belt: '#5a3a20', hm: 1.08 },
  dru: { skin: '#c8a080', body: '#4a5a30', legs: '#3a3020', head: 'pelt', hood: '#6a6258', weapon: 'staff', orb: '#90e070', cape: '#5a4a30' },
  nec: { skin: '#d8d0c8', body: '#1e1e22', robe: 1, trim: '#c8c0b0', head: 'hair', hair: '#101010', weapon: 'dagger' },
  pal: { skin: '#d8b090', body: '#a8a8b2', tabard: '#e8e0d0', legs: '#8a8a98', head: 'helm', helm: '#b0b0b8', weapon: 'sword', shield: '#c8b060' },
  sor: { skin: '#e0b898', body: '#5a2a6a', robe: 1, trim: '#c8a040', head: 'hair', hair: '#8a2020', weapon: 'staff', orb: '#80c0ff' },
  // Champions: Return to Arms
  bw: { skin: '#d8a080', body: '#7a3020', legs: '#5a3a28', head: 'hair', hair: '#c05020', weapon: 'axe', belt: '#3a2010', hm: 1.08 },
  ew: { skin: '#5a3a28', body: '#22348a', robe: 1, trim: '#c8b060', head: 'bald', weapon: 'staff', orb: '#a0c0ff' },
  wr: { skin: '#e0c0a0', body: '#3a5a28', legs: '#4a3a20', head: 'elf', hair: '#e0d080', weapon: 'bow', cape: '#2a4020' },
  hc: { skin: '#f0d8c0', body: '#d8d0b8', tabard: '#c8a040', legs: '#b8b0a0', head: 'helm', helm: '#d8c070', weapon: 'mace', shield: '#e0d0a0' },
  sk: { skin: '#4a4a7a', body: '#24242c', legs: '#1a1a22', head: 'helm', helm: '#30303a', weapon: 'sword', cape: '#4a0010', eyes: '#ff3020', shield: '#3a1018' },
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
  'Ork-Plünderer': { skin: '#4f6a30', body: '#5a5048', legs: '#3a3228', head: 'tusks', weapon: 'axe', shield: '#4a3a28', eyes: '#ff3010', hm: 1.05 },
  'Ziegenmensch': { skin: '#7a5a3a', body: '#6a4a2e', legs: '#5a3a22', head: 'goat', horn: '#c8b898', weapon: 'spear', hunch: 0.15, eyes: '#ff4020' },
  'Gloam': { rig: 'wisp', col: '#a0d0ff' },
  'Dunkelelfen-Magier': { skin: '#3a3a6a', body: '#4a2a6a', robe: 1, trim: '#a080c0', head: 'hair', hair: '#e8e8f0', weapon: 'staff', orb: '#ff8040', eyes: '#ff4040' },
  'Vampir': { skin: '#c8c0c8', body: '#5a1020', robe: 1, trim: '#a08040', head: 'hair', hair: '#101010', weapon: 'staff', orb: '#ff5020', cape: '#200008', eyes: '#ff2020' },
  'Frostriese': { skin: '#a8c8e0', body: '#506070', legs: '#405060', head: 'hair', hair: '#e8f0ff', weapon: 'club', eyes: '#60c0ff' },
  'Dämonenfürst': { skin: '#902818', body: '#5a1408', legs: '#4a1006', head: 'horns', helm: '#902818', horn: '#2a1a14', weapon: 'sword', wings: '#3a0c06', eyes: '#ffd040' },
  'Andariel': { skin: '#d080a0', body: '#6a2040', robe: 1, trim: '#d8a0c0', head: 'horns', helm: '#d080a0', horn: '#3a1020', weapon: 'claw', eyes: '#ffe040', spikes: '#e0a0c0' },
  'Duriel': { rig: 'quad', col: '#a89870', spikes: '#e8d8b0', bulk: 1, eyes: '#ff6020' },
  'Mephisto': { skin: '#8090c0', body: '#304070', robe: 1, trim: '#90a0e0', head: 'skull', weapon: 'none', float: 1, glow: '#6080ff', eyes: '#c0e0ff' },
  'Innoruuk': { skin: '#503060', body: '#200a30', robe: 1, trim: '#8040a0', head: 'horns', helm: '#503060', horn: '#d0b0e0', weapon: 'staff', orb: '#c040ff', cape: '#100018', eyes: '#ff40ff' },
  'Diablo': { skin: '#a02010', body: '#701808', legs: '#601406', head: 'horns', helm: '#a02010', horn: '#e0c090', weapon: 'claw', hunch: 0.2, spikes: '#e0c090', eyes: '#ffe040' },
  'Baal': { skin: '#9080c0', body: '#403060', robe: 1, trim: '#c0b0f0', head: 'horns', helm: '#9080c0', horn: '#302040', weapon: 'staff', orb: '#80c0ff', eyes: '#ffffff' },
};
const MIN_LOOKS = {
  skel: MON_LOOKS['Skelett'],
  smage: { skin: '#ddd6c0', bones: 1, head: 'skull', weapon: 'staff', orb: '#80c0ff', eyes: '#80c0ff' },
  golem: { skin: '#8a7050', body: '#8a7050', legs: '#7a6040', head: 'bald', hm: 1.05, eyes: '#ffc060' },
  bgolem: { skin: '#902020', body: '#801818', legs: '#701010', head: 'bald', eyes: '#ffe080' },
  raven: { rig: 'bird', col: '#1a1a22' },
  wolf: { rig: 'quad', col: '#c0d0f0', ghost: 0.75, eyes: '#80c0ff' },
  bear: { rig: 'quad', col: '#5a3a20', bulk: 1, eyes: '#201008' },
  valk: { skin: '#e8d0b0', body: '#d8c070', legs: '#b8a060', head: 'helm', helm: '#e0d080', weapon: 'spear', shield: '#d8c070', ghost: 0.85, glow: '#fff0a0' },
  hydra: { rig: 'hydra', col: '#7a3010' },
  sentry: { rig: 'trap', col: '#fff27a' },
  ancestor: { ...LOOKS.bar, ghost: 0.55, glow: '#ffd090' },
  badger: { rig: 'quad', col: '#7a6a5a', ghost: 0.8 },
  hammer: { rig: 'hammer', col: '#fff8e0' },
  shadow: { ...LOOKS.asn, ghost: 0.5 },
};

function drawFigure(g, x, y, L, st) {
  g.save();
  g.translate(x, y);
  if (st.lying) { g.filter = 'brightness(.45) saturate(.6)'; g.scale(1, 0.55); g.rotate(-Math.PI / 2 * st.fx); }
  const u = st.h / 56;
  g.scale(st.fx * u, u);
  g.globalAlpha = (L.ghost || 1) * (st.alpha ?? 1);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (L.glow) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, -28, 2, 0, -28, 30); gr.addColorStop(0, L.glow); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.globalAlpha *= 0.35; g.fillRect(-30, -58, 60, 60); g.globalAlpha = (L.ghost || 1) * (st.alpha ?? 1); g.globalCompositeOperation = 'source-over'; }
  ({ quad, bird, wisp, hammer: hammerRig, trap, hydra }[L.rig] || humanoid)(g, L, st);
  g.restore();
}

const limb = (g, x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
// Gliedmaße mit dunkler Kontur, damit Figuren auf dem Boden lesbar bleiben
const limbO = (g, x1, y1, x2, y2, w, c) => { limb(g, x1, y1, x2, y2, w + 1.6, 'rgba(0,0,0,.6)'); limb(g, x1, y1, x2, y2, w, c); };
function volume(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(255,240,210,.14)'); gr.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.9; g.stroke();
}
const disc = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
function glowDot(g, x, y, r, c) {
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
    disc(g, 3, hy - 0.5, 0.95, ec); disc(g, 5.4, hy - 0.5, 0.85, ec);
    if (L.eyes) glowDot(g, 4.2, hy - 0.5, 4, L.eyes);
  }
}

function humanoid(g, L, st) {
  const ph = st.walk * 0.16, sw = st.moving ? Math.sin(ph) * 0.55 : 0;
  const bob = st.moving ? Math.abs(Math.cos(ph)) * 1.4 : Math.sin(st.t * 2.2) * 0.5;
  const body = L.body || L.skin, legs = L.legs || shade(body, -0.1), bones = L.bones, bw = bones ? 2.4 : 5.6;
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
  if (L.cape && !st.back) cape();
  if (L.tail) { g.strokeStyle = L.tail; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, -24); g.quadraticCurveTo(-18, -20 + sw * 6, -20, -32 + sw * 4); g.stroke(); }
  // Beine
  const leg = (dx, a, c) => {
    const fx = dx + Math.sin(a) * 22, fy = -24 + Math.cos(a) * 24;
    limbO(g, dx, -24, fx, fy, bw, c);
    if (!bones) limbO(g, fx, fy, fx + 3.5, fy, 3.4, shade(c, -0.2));
  };
  if (!L.robe) { leg(-1.5, -sw, shade(legs, -0.12)); leg(1.5, sw, legs); }
  else if (!L.float) { limb(g, -2, -3, 1, 0, 3, '#1a1410'); limb(g, 3, -3, 6, 0, 3, '#1a1410'); }
  g.save();
  g.translate(0, -bob);
  if (L.hunch) { g.translate(0, -24); g.rotate(L.hunch); g.translate(0, 24); }
  // hinterer Arm
  const sh = [0, -41];
  const ab = L.arms ? 1.3 : -sw * 0.8 + 0.1, hb = [sh[0] + Math.sin(ab) * 13, sh[1] + Math.cos(ab) * 13];
  limbO(g, sh[0] - 1, sh[1], hb[0] - 1, hb[1], bones ? 2.2 : 4.4, bones ? L.skin : shade(body, -0.18));
  disc(g, hb[0] - 1, hb[1], 2, shade(L.skin, -0.1));
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
    g.fillStyle = body; g.beginPath(); g.moveTo(-6, -24); g.lineTo(6, -24); g.lineTo(8, -40); g.quadraticCurveTo(8, -43, 5, -43); g.lineTo(-5, -43); g.quadraticCurveTo(-8, -43, -8, -40); g.closePath(); g.fill();
    volume(g, -8, 0, 16, 0);
    if (L.tabard && !st.back) { g.fillStyle = L.tabard; g.fillRect(-1, -40, 6, 20); }
    if (L.belt) limb(g, -6, -26, 6.5, -26, 2.2, L.belt);
    if (L.trim) limb(g, -7, -41.5, 7, -41.5, 1.6, L.trim);
  }
  if (L.spikes && L.rig !== 'quad') { g.fillStyle = L.spikes; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-7, -42 + i * 5); g.lineTo(-13, -45 + i * 5); g.lineTo(-7, -39 + i * 5); g.fill(); } }
  limb(g, 0, -42, 0, -44, 3, L.skin);
  head(g, L, st);
  if (L.cape && st.back) cape();
  if (L.shield && !st.back) {
    g.fillStyle = L.shield; g.beginPath(); g.moveTo(1, -40); g.lineTo(11, -40); g.lineTo(11, -30); g.quadraticCurveTo(11, -24, 6, -21); g.quadraticCurveTo(1, -24, 1, -30); g.closePath(); g.fill();
    g.strokeStyle = shade(L.shield, -0.25); g.lineWidth = 1.2; g.stroke();
    limb(g, 6, -38, 6, -25, 1, 'rgba(255,255,255,.35)');
  }
  // vorderer Arm mit Waffe
  const k = 1 - st.atk, ranged = L.weapon === 'bow';
  let af = L.arms ? 1.4 : sw * 0.8 + 0.35;
  if (st.atk > 0) af = ranged ? 1.45 : L.weapon === 'staff' || L.weapon === 'none' ? 0.4 - st.atk * 1.2 : -2.0 + 3.3 * (1 - (1 - k) * (1 - k));
  const hf = [sh[0] + Math.sin(af) * 13, sh[1] + Math.cos(af) * 13];
  limbO(g, sh[0] + 1, sh[1], hf[0], hf[1], bones ? 2.2 : 4.4, bones ? L.skin : shade(body, 0.04));
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
  const leg = (x, a, col) => limb(g, x, -14, x + Math.sin(a) * 12, -14 + Math.cos(a) * 14, 3.4 * bk, col);
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

// ---------- Symbole ----------
const ICONS = {};
function glyph(g, s) {
  const tp = s.t, beast = ['wolf', 'bear', 'badger', 'raven'].includes(s.m);
  g.beginPath();
  if (tp === 'melee') { g.moveTo(14, 42); g.lineTo(40, 16); g.moveTo(15, 30); g.lineTo(26, 41); g.moveTo(40, 16); g.lineTo(44, 12); g.stroke(); }
  else if (tp === 'proj' && s.wm) { g.moveTo(12, 44); g.lineTo(42, 14); g.moveTo(42, 14); g.lineTo(32, 16); g.moveTo(42, 14); g.lineTo(40, 24); g.moveTo(12, 44); g.lineTo(12, 36); g.moveTo(12, 44); g.lineTo(20, 44); g.stroke(); }
  else if (tp === 'proj') { g.arc(33, 23, 8, 0, 7); g.fill(); g.beginPath(); g.moveTo(26, 30); g.lineTo(12, 44); g.moveTo(30, 33); g.lineTo(20, 44); g.moveTo(23, 27); g.lineTo(12, 36); g.stroke(); }
  else if (tp === 'nova') { for (let i = 0; i < 10; i++) { const a = i * 0.628; g.moveTo(28 + Math.cos(a) * 9, 28 + Math.sin(a) * 9); g.lineTo(28 + Math.cos(a) * 20, 28 + Math.sin(a) * 20); } g.stroke(); g.beginPath(); g.arc(28, 28, 5, 0, 7); g.fill(); }
  else if (tp === 'area') { g.ellipse(28, 42, 16, 6, 0, 0, 7); g.stroke(); g.beginPath(); for (const x of [18, 28, 38]) { g.moveTo(x + 6, 8 + (x % 3) * 3); g.lineTo(x, 32); } g.stroke(); }
  else if (tp === 'chain') { g.moveTo(10, 14); g.lineTo(24, 26); g.lineTo(18, 30); g.lineTo(34, 42); g.lineTo(30, 30); g.lineTo(46, 34); g.stroke(); }
  else if (tp === 'summon' && beast) { g.arc(28, 34, 8, 0, 7); g.fill(); for (const [x, y] of [[16, 22], [24, 16], [33, 16], [41, 22]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
  else if (tp === 'summon') { g.arc(28, 24, 12, 0, 7); g.fill(); g.fillRect(21, 32, 14, 9); g.fillStyle = '#000'; g.beginPath(); g.arc(23, 24, 3.5, 0, 7); g.arc(33, 24, 3.5, 0, 7); g.fill(); g.fillRect(24, 36, 2, 5); g.fillRect(30, 36, 2, 5); }
  else if (tp === 'buff') { g.moveTo(14, 30); g.lineTo(28, 16); g.lineTo(42, 30); g.moveTo(14, 42); g.lineTo(28, 28); g.lineTo(42, 42); g.stroke(); }
  else if (tp === 'shield') { g.moveTo(16, 12); g.lineTo(40, 12); g.lineTo(40, 28); g.quadraticCurveTo(40, 40, 28, 46); g.quadraticCurveTo(16, 40, 16, 28); g.closePath(); g.stroke(); }
  else if (tp === 'teleport') { for (let a = 0; a < 14; a += 0.2) { const r = a * 1.4; g.lineTo(28 + Math.cos(a) * r, 28 + Math.sin(a) * r); } g.stroke(); }
  else if (tp === 'dash') { g.moveTo(18, 28); g.lineTo(44, 28); g.lineTo(36, 20); g.moveTo(44, 28); g.lineTo(36, 36); g.moveTo(10, 20); g.lineTo(20, 20); g.moveTo(8, 36); g.lineTo(18, 36); g.stroke(); }
  else if (tp === 'heal') { g.fillRect(23, 12, 10, 32); g.fillRect(12, 23, 32, 10); }
  else if (tp === 'convert') { g.ellipse(28, 28, 17, 9, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(28, 28, 5, 0, 7); g.fill(); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 17; g.lineTo(28 + Math.cos(a) * r, 29 + Math.sin(a) * r); } g.closePath(); g.fill(); }
}
function skillIcon(s) {
  if (ICONS[s.id]) return ICONS[s.id];
  const c = mkCanvas(56), g = c.getContext('2d'), col = EL[s.el || s.pulse?.el || 'phys'][1];
  const bg = g.createRadialGradient(28, 24, 4, 28, 28, 42);
  bg.addColorStop(0, mix(col.length === 7 ? col : '#888888', '#000000', 0.62)); bg.addColorStop(1, '#090705');
  g.fillStyle = bg; g.fillRect(0, 0, 56, 56);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = col; g.shadowBlur = 8;
  glyph(g, s);
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
