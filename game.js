'use strict';
const $ = s => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
const light = mkCanvas(1), lctx = light.getContext('2d');
let W = 0, H = 0;
// VS: Bildmaßstab der Spielwelt (kleiner als 1 zeigt mehr Karte mit kleineren Figuren)
// PX: Auflösung der Spielfläche; im Pixel-Look etwa 900 Bildpunkte breit und grob hochskaliert wie das Original
const VS = 0.7, PIXEL = 'sanctuary-pixel';
let PX = 1, LH = 8; // LH: halbe Höhe der Bodenbeschriftungen
const pixelOn = () => { try { return localStorage.getItem(PIXEL) !== '0'; } catch { return true; } };
function resize() {
  PX = pixelOn() ? Math.max(0.5, Math.min(1, 900 / innerWidth)) : 1;
  cv.width = Math.round(innerWidth * PX); cv.height = Math.round(innerHeight * PX);
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; cv.style.imageRendering = PX < 1 ? 'pixelated' : 'auto';
  W = light.width = Math.ceil(innerWidth / VS); H = light.height = Math.ceil(innerHeight / VS);
  LH = Math.round(7.5 / (VS * PX));
}
addEventListener('resize', resize); resize();

const T = 40, MW = 70, MH = 70, SAVE = 'sanctuary-champions-v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const adiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const esc = s => String(s).replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`);
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
const SK = Object.fromEntries(SKILLS.map(s => [s.id, s]));
const CL = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const AFF = Object.fromEntries(AFFIXES.map(a => [a[0], a]));
AFF.allSkills = ['allSkills', '', '+{v} auf alle Fähigkeiten', 1, 1, 1];
const ELS = Object.keys(EL);
const RAR = [['Normal', '#e0e0e0'], ['Magisch', '#6969ff'], ['Selten', '#ffff64'], ['Einzigartig', '#c7b377']];
const TYPES = { melee: 'Nahkampf', proj: 'Geschoss', nova: 'Nova', area: 'Flächenzauber', chain: 'Kettenzauber', summon: 'Beschwörung', buff: 'Verstärkung', shield: 'Schutzschild', teleport: 'Teleport', dash: 'Ansturm', heal: 'Heilung', convert: 'Bekehrung', passive: 'Passiv' };
const MODN = { crit: 'Krit. Chance', dodge: 'Ausweichen', dmgPct: 'Schaden', armor: 'Verteidigung', lifePct: 'Leben', manaPct: 'Mana', speed: 'Laufgeschw.', atkSpd: 'Angriffstempo', res: 'Widerstand', mregen: 'Manaregeneration', regen: 'Leben/Sek.', thorns: 'Dornenschaden', leech: 'Lebensraub', minionPct: 'Diener-Schaden', pierce: 'Durchschlag', fire: 'Feuerschaden', cold: 'Kälteschaden', light: 'Blitzschaden', size: 'Größe' };
const FLAT = ['armor', 'regen', 'thorns', 'pierce', 'size'];
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const xpNext = l => Math.round(120 * l * 1.1 ** (l - 1));
const clsName = id => CL[id]?.nm || GROUPS[id];
const potCost = () => 10 + P.depth * 2;

let P = null, G = null, S = null, panel = null, popup = null, filter = 'all', search = '', chosen = null, mapOn = false;
const keys = {}, mouse = { x: 0, y: 0, l: false, r: false, mode: null, target: null };
const cam = { x: 0, y: 0 };
const PAT = {};

// ---------- Projektion ----------
const proj = (x, y) => [(x - y) * Z + cam.x, (x + y) * Z / 2 + cam.y];
const unproj = (sx, sy) => { const a = (sx - cam.x) / Z, b = (sy - cam.y) * 2 / Z; return { x: (a + b) / 2, y: (b - a) / 2 }; };
const tf = (a, b, c, d, e, f) => { const k = VS * PX; ctx.setTransform(a * k, b * k, c * k, d * k, e * k, f * k); };
const isoT = () => tf(Z, Z / 2, -Z, Z / 2, cam.x, cam.y);
const scrT = () => tf(1, 0, 0, 1, 0, 0);
const figH = e => e.r * 4 * Z * (e.look.hm || 1);
const world = () => unproj(mouse.x, mouse.y);
function updateCam() { const p = G.player; cam.x = W / 2 - (p.x - p.y) * Z; cam.y = H * 0.45 - (p.x + p.y) * Z / 2; }

// ---------- Charakter ----------
function newChar(cid, name) {
  const c = CL[cid], off = id => ['proj', 'melee'].includes(SK[id].t);
  const [a, b] = off(c.start[0]) ? c.start : [c.start[1], c.start[0]];
  const wpn = c.ranged ? 'Kurzbogen' : 'Kurzschwert', basic = c.ranged ? 'shoot' : 'attack';
  P = {
    cls: cid, name: name || 'Namenloser Held', lvl: 1, xp: 0, str: c.str, dex: c.dex, vit: c.vit, ene: c.ene, statPts: 0, skillPts: 30,
    ranks: { [a]: 1, [b]: 1 }, slots: [a, b], hot: [a, b, basic, null, null, null, null, null],
    gold: 0, pots: { hp: 3, mp: 3 }, bag: [], depth: 1,
    eq: { weapon: { slot: 'weapon', base: wpn, nm: wpn, rar: 0, min: 2, max: 5, mods: {}, val: 5 } },
  };
}

const rank = id => SK[id].c === 'base' ? 1 : (P.ranks[id] || 0) && P.ranks[id] + (S?.allSkills || 0);

function calc() {
  const c = CL[P.cls];
  const s = { str: P.str, dex: P.dex, vit: P.vit, ene: P.ene, maxhp: 0, maxmp: 0, dmgPct: 0, spellPct: 0, crit: 0.05, dodge: 0, leech: 0, res: 0, speed: 0, atkSpd: 0, armor: 0, regen: 0, mregen: 0, thorns: 0, minionPct: 0, pierce: 0, lifePct: 0, manaPct: 0, allSkills: 0, size: 0, ae: [] };
  ELS.forEach(e => s[e] = 0);
  const add = (k, v) => k === 'ae' ? s.ae.push(v) : (s[k] = (s[k] || 0) + v);
  for (const it of Object.values(P.eq)) if (it) { s.armor += it.def || 0; for (const k in it.mods) add(k, it.mods[k] / AFF[k][5]); }
  for (const id in P.ranks) { const sk = SK[id]; if (sk.t === 'passive') for (const k in sk.mods) add(k, sk.mods[k] * (P.ranks[id] + s.allSkills)); }
  for (const b of Object.values(G.buffs)) for (const k in b.s.mods || {}) {
    const v = b.s.mods[k], m = 1 + 0.15 * (b.r - 1);
    add(k, k === 'ae' ? [v[0], v[1] * m] : k === 'size' ? v : v * m);
  }
  s.maxhp = (30 + s.vit * 3 + P.lvl * 5 + s.maxhp) * (1 + s.lifePct);
  s.maxmp = (10 + s.ene * 2 + P.lvl * 2 + s.maxmp) * (1 + s.manaPct);
  s.wmin = P.eq.weapon?.min || 1; s.wmax = P.eq.weapon?.max || 3;
  s.dmgPct += (c.ranged ? s.dex : s.str) / 100;
  s.spellPct += s.ene / 200;
  s.crit = Math.min(0.6, s.crit + s.dex / 500);
  s.dodge = Math.min(0.5, s.dodge);
  s.res = Math.min(0.75, s.res);
  s.dr = clamp(s.armor / (Math.max(0, s.armor) + 40 + 8 * P.depth), 0, 0.7);
  s.lvlMult = 1 + 0.08 * (P.lvl - 1);
  s.regen += s.maxhp * 0.004;
  s.mregenTot = s.maxmp * 0.025 * (1 + s.mregen);
  s.spd = 170 * (1 + s.speed);
  s.atkIv = 0.42 / (1 + s.atkSpd + s.dex / 400);
  return s;
}

function skillDmg(s, r) {
  let v = 0;
  if (s.wm) v += rnd(S.wmin, S.wmax) * s.wm * (1 + 0.12 * (r - 1)) * (1 + S.dmgPct);
  if (s.d) v += s.d * (1 + 0.3 * (r - 1)) * (1 + S.spellPct);
  return v * S.lvlMult * (1 + S[s.el || 'phys']) * (s.c === P.cls ? 1.25 : 1);
}

// ---------- Karte ----------
const walk = (x, y) => x >= 0 && y >= 0 && G.map[((y / T) | 0) * MW + ((x / T) | 0)] === 1;
const free = (x, y, r) => { r *= 0.8; return walk(x - r, y - r) && walk(x + r, y - r) && walk(x - r, y + r) && walk(x + r, y + r); };
const tileOf = e => ((e.y / T) | 0) * MW + ((e.x / T) | 0);
const tileC = n => ({ x: (n % MW + 0.5) * T, y: (((n / MW) | 0) + 0.5) * T });
function move(e, dx, dy) {
  const ox = e.x, oy = e.y;
  if (free(e.x + dx, e.y, e.r)) e.x += dx;
  if (free(e.x, e.y + dy, e.r)) e.y += dy;
  const d = Math.hypot(e.x - ox, e.y - oy);
  if (d > 0.01) { e.walk = (e.walk || 0) + d; e.movT = 0.12; }
  return d > 0.01;
}

// ---------- Arena (Chaos-Sanktuarium) ----------
// Kreuzförmige Halle mit Pentagramm und vier Säulen; Gegner kommen aus den Enden der vier Arme
const AC = MW >> 1, ARMS = [[AC, 7], [AC, MH - 8], [7, AC], [MW - 8, AC]];
function genArena() {
  const map = new Uint8Array(MW * MH), fill = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map[y * MW + x] = v; };
  fill(AC - 12, AC - 12, AC + 12, AC + 12, 1);
  fill(AC - 4, 5, AC + 4, MH - 6, 1); fill(5, AC - 4, MW - 6, AC + 4, 1);
  for (const [sx, sy] of [[-8, -8], [7, -8], [-8, 7], [7, 7]]) fill(AC + sx, AC + sy, AC + sx + 1, AC + sy + 1, 0);
  return map;
}

// Baut die Arena neu auf; danach ist Pause vor Runde P.depth
function genLevel() {
  const map = genArena(), old = G, keep = old ? old.ents.filter(e => e.minion && !e.dead && !e.conv) : [];
  G = {
    map, seen: new Uint8Array(MW * MH).fill(1), edge: new Uint8Array(MW * MH), area: ARENA, props: [],
    ents: [], projs: [], fx: [], areas: [], parts: [], texts: [], loot: [], corpses: [], labels: [], torches: [], buffs: old?.buffs || {}, cds: {},
    shield: old?.shield || 0, shieldVis: old?.shieldVis, t: 0, flowT: 0, flow: new Int16Array(MW * MH), saveT: 15, dead: 0, hover: null,
    boss: null, phase: 'pause', queue: [], waveT: 0, wares: [],
  };
  for (let i = 0; i < MW * MH; i++) if (!map[i]) {
    const x = i % MW, y = (i / MW) | 0;
    if (DIRS8.some(([dx, dy]) => x + dx >= 0 && x + dx < MW && map[(y + dy) * MW + x + dx])) G.edge[i] = 1;
  }
  G.floor = bakeFloor();
  const p = old?.player || { r: 14, team: 'p', player: true, hp: 1, mp: 1, atkT: 0, face: 0.8, seed: 0, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0, look: LOOKS[P.cls] };
  Object.assign(p, { x: (AC + 0.5) * T, y: (AC + 4.5) * T, dash: null, dead: false, order: null, path: null, pathT: -1 });
  G.player = p; G.ents.push(p);
  keep.forEach(m => { m.x = p.x + rnd(-30, 30); m.y = p.y + rnd(-30, 30); G.ents.push(m); });
  S = calc();
  if (!old) { p.hp = S.maxhp; p.mp = S.maxmp; }
  placeProps();
  pause();
}

// ---------- Runden ----------
function pause() {
  G.phase = 'pause'; G.boss = null;
  G.wares = Array.from({ length: 8 }, () => genItem(P.depth + 1, Math.random() < 0.3));
}
function startRound() {
  if (G.phase !== 'pause') return;
  closePanel();
  const pool = MONSTERS.filter(m => m.from <= P.depth), d = P.depth;
  G.queue = [];
  for (let i = Math.min(12, 2 + Math.ceil(d * 0.7)); i > 0; i--) {
    const roll = Math.random(), kind = roll < 0.04 + d * 0.005 ? 'unique' : roll < 0.15 + d * 0.01 ? 'champ' : null;
    G.queue.push({ t: pick(pool), kind, n: kind === 'unique' ? 4 : rint(3, 5) });
  }
  const c = d % 20, boss = c === 0 ? BOSSES.find(b => b.nm === 'Diablo') : c % 5 === 0 ? SEAL_BOSSES[c / 5 - 1] : null;
  if (boss) G.queue.push({ t: boss, kind: 'boss', n: 1 });
  if (boss && c && d > 20) G.queue.push({ t: pick(BOSSES.filter(b => b.nm !== 'Diablo')), kind: 'boss', n: 1 });
  G.phase = 'fight'; G.waveT = 1;
  msg(`Runde ${d}${boss ? ` · ${boss.nm} erscheint` : ''}`, '#c7b377');
}
// eine Gruppe tritt am Ende eines zufälligen Arms aus einem Höllenriss
function spawnGroup({ t, kind, n }) {
  const [tx, ty] = pick(ARMS), x = (tx + 0.5) * T, y = (ty + 0.5) * T;
  fx({ k: 'ring', x, y, r0: 10, r1: 90, col: '#ff3010', life: 0.8 });
  emit(x, y, 10, 'fire', 30, 30, { vz: rnd(60, 160) });
  SFX.play('portal', 300);
  for (let j = 0; j < n; j++) {
    const e = spawnMon(t, x + rnd(-40, 40), y + rnd(-40, 40), kind === 'unique' && j ? 'minion' : kind);
    e.awake = true;
    if (kind === 'boss') G.boss = e;
  }
}
const RECORD = 'sanctuary-champions-record';
const record = () => { try { return JSON.parse(localStorage.getItem(RECORD)); } catch { return null; } };
const enemiesLeft = () => G.ents.filter(e => e.team === 'e' && !e.dead).length + G.queue.reduce((a, q) => a + q.n, 0);
function rounds(dt) {
  if (G.phase !== 'fight') return;
  if (G.queue.length && (G.waveT -= dt) <= 0) { G.waveT = 3; spawnGroup(G.queue.shift()); }
  if (!G.queue.length && !G.ents.some(e => e.team === 'e' && !e.dead)) {
    const gold = Math.round(15 * P.depth * (1 + P.depth * 0.1));
    P.gold += gold;
    msg(`Runde ${P.depth} überstanden · +${gold} Gold`, '#c7b377'); SFX.play('level');
    P.depth++;
    P.best = Math.max(P.best || 0, P.depth - 1);
    if (P.best > (record()?.round || 0)) {
      try { localStorage.setItem(RECORD, JSON.stringify({ round: P.best, name: P.name, cls: P.cls })); } catch { /* privater Modus */ }
      note(`Neuer Rekord: Runde ${P.best}`);
    }
    placeProps(); pause(); save();
  }
}

// Boden einmal backen (inkl. Schatten an Wänden, Blut, Knochen, Geröll und dem Pentagramm)
function bakeFloor() {
  const [, fl, wl] = G.area, m = G.map, c = mkCanvas(MW * T), g = c.getContext('2d');
  g.fillStyle = g.createPattern(TEX.floor[fl], 'repeat');
  for (let i = 0; i < MW * MH; i++) if (m[i]) g.fillRect((i % MW) * T, ((i / MW) | 0) * T, T, T);
  const torchy = ['brick', 'sandstone', 'hell'].includes(wl);
  for (let i = 0; i < MW * MH; i++) {
    const tx = i % MW, ty = (i / MW) | 0, x = tx * T, y = ty * T, h = hash(tx, ty);
    if (!m[i]) {
      if (torchy && G.edge[i] && h % 7 === 0) {
        if (m[i + MW]) G.torches.push({ x: x + T / 2, y: y + T, tx, ty });
        else if (m[i + 1]) G.torches.push({ x: x + T, y: y + T / 2, tx, ty });
      }
      continue;
    }
    for (const [dx, dy] of DIRS4) if (!m[i + dy * MW + dx]) for (let k = 0; k < 4; k++) {
      g.fillStyle = `rgba(0,0,0,${0.26 - k * 0.06})`;
      if (dx === 1) g.fillRect(x + T - (k + 1) * 4, y, 4, T); else if (dx === -1) g.fillRect(x + k * 4, y, 4, T);
      else if (dy === 1) g.fillRect(x, y + T - (k + 1) * 4, T, 4); else g.fillRect(x, y + k * 4, T, 4);
    }
    const r = h % 100, cx = x + 8 + (h % 24), cy = y + 8 + ((h >> 5) % 24);
    if (r < 3) for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${90 + k * 8},8,6,.45)`; g.beginPath(); g.ellipse(cx + rnd(-8, 8), cy + rnd(-5, 5), rnd(2, 7), rnd(1.5, 4), rnd(0, 3), 0, 7); g.fill(); }
    else if (r < 6) { g.strokeStyle = '#cfc6ae'; g.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const a = rnd(0, 7); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); g.stroke(); } disc(g, cx + 4, cy - 3, 3, '#d8d0b8'); }
    else if (r < 11) for (let k = 0; k < 4; k++) disc(g, cx + rnd(-8, 8), cy + rnd(-6, 6), rnd(1.5, 3.5), pick(['#5a544c', '#3a3530', '#6a6258']));
  }
  const pc = (AC + 0.5) * T, pr = 7 * T, star = [0, 2, 4, 1, 3, 0].map(k => [pc + Math.cos(k * 1.2566 - 1.5708) * pr, pc + Math.sin(k * 1.2566 - 1.5708) * pr]);
  for (const [w, col] of [[16, 'rgba(90,8,4,.5)'], [5, '#a01808'], [1.6, '#ff8030']]) {
    g.strokeStyle = col; g.lineWidth = w;
    for (const rr of [pr, pr + 24]) { g.beginPath(); g.arc(pc, pc, rr, 0, 7); g.stroke(); }
    g.beginPath(); star.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  }
  return c;
}

// ---------- Objekte: Fässer, Urnen, Truhen, Schreine ----------
const PROP_NM = { barrel: 'Fass', urn: 'Urne', chest: 'Truhe', shrine: 'Erneuerungsschrein' };
// Urnen in den Hallenecken, ab Runde 2 eine Belohnungstruhe auf dem Pentagramm, jede dritte Runde ein Schrein
function placeProps() {
  const c = (AC + 0.5) * T, add = (x, y, k) => G.props.push({ x, y, k, seed: rnd(0, 100), open: false });
  G.props = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = rint(1, 3); i > 0; i--) add(c + sx * 11 * T + rnd(-24, 24), c + sy * 11 * T + rnd(-24, 24), 'urn');
  if (P.depth > 1) add(c, c - 2 * T, 'chest');
  if (P.depth % 3 === 0) add(c, c + 7 * T, 'shrine');
  const broken = [0, 2, 4, 5][Math.floor(((P.depth - 1) % 20) / 5)];
  for (let k = 0; k < 5; k++) G.props.push({ x: c + Math.cos(k * 1.2566 - 1.5708) * 7.6 * T, y: c + Math.sin(k * 1.2566 - 1.5708) * 7.6 * T, k: 'seal', seed: k, open: k < broken });
}
function useProp(pr) {
  if (pr.open) return;
  pr.open = true;
  const p = G.player, put = l => G.loot.push({ x: pr.x + rnd(-22, 22), y: pr.y + rnd(-22, 22), ...l });
  if (pr.k === 'shrine') {
    p.hp = S.maxhp; p.mp = S.maxmp; SFX.play('shrine');
    emit(pr.x, pr.y, 30, 'cold', 40, 16, { vz: rnd(80, 200), life: 1.2 });
    return msg('Erneuerungsschrein: Leben und Mana aufgefüllt', '#7fd4ff');
  }
  if (pr.k === 'chest') {
    SFX.play('chest');
    put({ k: 'gold', n: Math.round(rnd(4, 14) * P.depth) });
    if (Math.random() < 0.6) put({ k: 'item', it: genItem(P.depth, Math.random() < 0.25) });
    if (Math.random() < 0.3) put({ k: pick(['hp', 'mp']) });
    return;
  }
  SFX.play('smash');
  const col = pr.k === 'urn' ? ['#a0603a', '#7a4428', '#c08050'] : ['#6a4a2a', '#4a3018', '#8a6a3a'];
  for (let i = 0; i < 16; i++) G.parts.push({ x: pr.x, y: pr.y, z: rnd(6, 24), vx: rnd(-90, 90), vy: rnd(-90, 90), vz: rnd(80, 200), g: 420, life: rnd(0.4, 0.7), t: 0, col: pick(col), s: rnd(2, 4) });
  const r = Math.random();
  if (r < 0.3) put({ k: 'gold', n: Math.round(rnd(1, 5) * P.depth) });
  else if (r < 0.42) put({ k: pick(['hp', 'mp']) });
  else if (r < 0.46) put({ k: 'item', it: genItem(P.depth, false) });
}
function hoverProp() {
  for (const pr of G.props) {
    if (pr.open || pr.k === 'seal') continue;
    const [sx, sy] = proj(pr.x, pr.y);
    if (Math.abs(mouse.x - sx) < 20 && mouse.y < sy + 8 && mouse.y > sy - (pr.k === 'shrine' ? 64 : 38)) return pr;
  }
  return null;
}

const uniqueName = () => `${pick(['Knochen', 'Seuchen', 'Grimm', 'Blut', 'Aschen', 'Schatten'])}${pick(['fang', 'klaue', 'herz', 'brut', 'schlund'])} der ${pick(['Verfluchte', 'Schlächter', 'Hungrige', 'Unheilige', 'Gierige'])}`;
const baseEnt = () => ({ atkT: 0, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0, face: rnd(0, 6), walk: 0, movT: 0, atkA: 0, seed: rnd(0, 10) });

function spawnMon(t, x, y, kind) {
  const d = P.depth, hm = 1.14 ** (d - 1), dm = 1.11 ** (d - 1);
  const k = { champ: [3, 1.5, 3, 1.15], unique: [5, 1.8, 6, 1.3], minion: [1.5, 1.2, 1.5, 1] }[kind] || [1, 1, 1, 1];
  const e = {
    ...baseEnt(), x, y, r: t.r * k[3], team: 'e', kind, col: t.col, rng: t.rng, el: t.el || 'phys', undead: t.undead, nova: t.nova, novaT: 3,
    look: MON_LOOKS[t.nm] || { skin: t.col, body: t.col, head: 'bald' },
    nm: kind === 'champ' ? `${t.nm} (Champion)` : kind === 'unique' ? uniqueName() : t.nm,
    hp: t.hp * hm * k[0], d: t.d * dm * k[1], xp: Math.round(t.xp * 1.12 ** (d - 1) * k[2]), v: t.v * (kind === 'champ' ? 1.2 : 1), awake: false,
  };
  e.maxhp = e.hp; G.ents.push(e); return e;
}

function spawnMinion(s, r, x, y) {
  // pw: Stärke der Beschwörung je Fähigkeit (Balance), wirkt auf Leben und Schaden
  const m = MINIONS[s.m], pw = s.pw || 1, hm = (1 + 0.15 * (r - 1)) * (1 + 0.1 * (P.lvl - 1)) * pw;
  const dm = (1 + 0.2 * (r - 1)) * S.lvlMult * (1 + S.minionPct) * (s.c === P.cls ? 1.25 : 1) * pw;
  G.ents.push({
    ...baseEnt(), x, y, r: m.r, team: 'p', nm: m.nm, col: m.col, look: MIN_LOOKS[s.m], hp: m.hp * hm, maxhp: m.hp * hm, d: m.d * dm, v: m.v,
    el: m.el || 'phys', rng: m.rng ? { el: m.el, v: 420 } : null, minion: true, sid: s.id, life: s.dur, noTarget: m.v === 0,
  });
  emit(x, y, 10, 'mag', 12, 40);
}

// Flussfeld vom Spieler aus, damit Gegner um Wände herum laufen
function updateFlow() {
  const f = G.flow, s = tileOf(G.player), q = [s];
  f.fill(-1); f[s] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cd = f[c];
    if (cd > 40) continue;
    for (const [dx, dy] of DIRS4) { const n = c + dy * MW + dx; if (G.map[n] && f[n] < 0) { f[n] = cd + 1; q.push(n); } }
  }
}

function seek(e, tg, spd, dt) {
  let tx = tg.x, ty = tg.y;
  if (tg === G.player && dist(e, tg) > T * 1.5) {
    const c = tileOf(e); let best = G.flow[c], n0 = -1;
    for (const [dx, dy] of DIRS8) {
      const n = c + dy * MW + dx, v = G.flow[n];
      if (v >= 0 && (best < 0 || v < best) && G.map[c + dx] && G.map[c + dy * MW]) { best = v; n0 = n; }
    }
    if (n0 >= 0) ({ x: tx, y: ty } = tileC(n0));
  }
  const a = Math.atan2(ty - e.y, tx - e.x);
  e.face = a;
  move(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
}

// Wegsuche für Klick-zum-Laufen (Breitensuche, 8 Richtungen)
function findPath(a, b) {
  if (!G.map[b] || a === b) return [];
  const prev = new Int32Array(MW * MH).fill(-1), q = [a];
  prev[a] = a;
  for (let i = 0; i < q.length && prev[b] < 0; i++) {
    const c = q[i];
    for (const [dx, dy] of DIRS8) {
      const n = c + dy * MW + dx;
      if (G.map[n] && prev[n] < 0 && G.map[c + dx] && G.map[c + dy * MW]) { prev[n] = c; q.push(n); }
    }
  }
  if (prev[b] < 0) return [];
  const path = [];
  for (let n = b; n !== a; n = prev[n]) path.unshift(n);
  return path;
}
function clearLine(a, b, r) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 10);
  for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, r)) return false;
  return true;
}
function walkDir(p, dx, dy, dt) {
  p.face = Math.atan2(dy, dx);
  const v = S.spd * (p.slow > 0 ? 0.6 : 1) * dt;
  return move(p, dx * v, dy * v);
}
function pathMove(p, x, y, dt) {
  const t = ((y / T) | 0) * MW + ((x / T) | 0);
  if (p.pathT !== t) { p.pathT = t; p.path = findPath(tileOf(p), t); }
  while (p.path.length > 1 && clearLine(p, tileC(p.path[1]), p.r)) p.path.shift();
  if (p.path.length === 1 && clearLine(p, { x, y }, p.r)) p.path.shift();
  const n = p.path.length ? tileC(p.path[0]) : { x, y }, d = Math.hypot(n.x - p.x, n.y - p.y);
  if (p.path.length && d < 8) { p.path.shift(); return false; }
  if (!p.path.length && d < 5) return true;
  return !walkDir(p, (n.x - p.x) / d, (n.y - p.y) / d, dt) && !p.path.length;
}

// ---------- Partikel ----------
const FIRE = ['#ffb040', '#ff6a10', '#ffd080', '#ff3a00'];
function emit(x, y, z, el, n, spread = 20, o = {}) {
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x: x + rnd(-spread, spread) * 0.3, y: y + rnd(-spread, spread) * 0.3, z, vx: rnd(-spread, spread), vy: rnd(-spread, spread),
      vz: el === 'fire' ? rnd(30, 90) : el === 'cold' ? rnd(-30, 30) : rnd(-10, 50), life: rnd(0.3, 0.7), t: 0,
      col: el === 'fire' ? pick(FIRE) : el === 'cold' ? pick(['#c0f0ff', '#7fd4ff', '#ffffff']) : EL[el][1], s: rnd(1.5, 3.5), add: true, ...o,
    });
  }
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
}
function blood(e, n) {
  const L = e.look;
  if (L.rig === 'wisp' || L.rig === 'hammer' || L.rig === 'trap' || L.ghost) return;
  const col = L.bones ? ['#d8d0c0', '#a8a090'] : ['#7a0808', '#5a0404', '#9a1010'];
  emit(e.x, e.y, figH(e) * 0.45, 'phys', n, 50, { vz: rnd(40, 140), g: 420, life: 0.6, add: false, col: pick(col), s: rnd(1.5, 2.8) });
}

// ---------- Kampf ----------
const foes = e => G.ents.filter(o => o.team !== e.team && !o.dead && !o.noTarget);
const nearest = (e, list) => list.reduce((b, o) => !b || dist(e, o) < dist(e, b) ? o : b, null);

function wake(e) {
  if (e.awake) return;
  e.awake = true;
  for (const o of G.ents) if (o.team === 'e' && dist(o, e) < 220) o.awake = true;
}

function hit(src, t, dmg, el = 'phys', o = {}) {
  if (t.dead || t.noTarget) return;
  if (t.player) {
    if (Math.random() < S.dodge) return;
    dmg *= el === 'phys' ? 1 - S.dr : 1 - S.res;
    if (G.shield > 0) { const a = Math.min(G.shield, dmg); G.shield -= a; dmg -= a; }
    if (o.melee && S.thorns && src && !src.dead) hit(t, src, S.thorns * S.lvlMult);
  } else {
    if (src?.player && Math.random() < S.crit) dmg *= 2;
    dmg *= t.amp;
    if (t.team === 'e') wake(t);
  }
  const boss = t.kind === 'boss';
  if (o.st) t.st = Math.max(t.st, o.st * (boss ? 0.3 : 1));
  if (o.kb && !boss && src) { const a = Math.atan2(t.y - src.y, t.x - src.x); for (let i = 0; i < o.kb; i += 10) move(t, Math.cos(a) * 10, Math.sin(a) * 10); }
  if (el === 'cold') t.slow = Math.max(t.slow, 2);
  if (src?.player) { const h = dmg * (S.leech + (o.leech || 0)); if (h) src.hp = Math.min(S.maxhp, src.hp + h); }
  // Gift addiert sich: Restgift plus neuer Schaden, verteilt über 2 Sekunden
  if (el === 'pois' && !o.direct) { t.pois = ((t.poisT > 0 ? t.pois * t.poisT : 0) + dmg) / 2; t.poisT = 2; t.poisSrc = src; return; }
  if (dmg > 0 && (el === 'phys' || Math.random() < 0.4)) blood(t, 4);
  if (dmg > 0) { t.flash = 0.1; t.player ? SFX.play('hurt', 300) : el === 'phys' && SFX.play('hit'); }
  t.hp -= dmg;
  if (t.hp <= 0) kill(t);
}

function kill(e) {
  if (e.dead) return;
  e.dead = true;
  blood(e, 14);
  if (e.player) { G.dead = 3; P.gold = Math.floor(P.gold * 0.9); save(); return; }
  if (e.team !== 'e') return;
  SFX.play('die', 50);
  if (!['wisp', 'hammer', 'trap'].includes(e.look.rig)) G.corpses.push({ x: e.x, y: e.y, r: e.r, look: e.look, face: e.face, h: figH(e), t: 40 });
  gainXp(e.xp); drop(e);
  if (e === G.boss) { G.boss = null; msg(`${e.nm} wurde besiegt!`, '#c7b377'); }
}

function gainXp(v) {
  P.xp += v;
  while (P.xp >= xpNext(P.lvl)) {
    P.xp -= xpNext(P.lvl); P.lvl++; P.statPts += 5; P.skillPts++;
    S = calc(); G.player.hp = S.maxhp; G.player.mp = S.maxmp;
    emit(G.player.x, G.player.y, 0, 'phys', 40, 30, { vz: rnd(60, 160), col: '#ffd860', life: 1.2 });
    msg(`Stufe ${P.lvl} erreicht`, '#c7b377'); SFX.play('level');
    save();
  }
}

function drop(e) {
  const b = e.kind === 'boss', u = e.kind === 'unique', c = e.kind === 'champ';
  const put = l => G.loot.push({ x: e.x + rnd(-24, 24), y: e.y + rnd(-24, 24), ...l });
  if (b || Math.random() < 0.35) put({ k: 'gold', n: Math.round(rnd(2, 9) * P.depth * (b ? 12 : u ? 4 : 1)) });
  if (Math.random() < 0.07) put({ k: 'hp' });
  if (Math.random() < 0.06) put({ k: 'mp' });
  const n = b ? 3 : u ? 2 : Math.random() < (c ? 0.5 : 0.08) ? 1 : 0;
  for (let i = 0; i < n; i++) put({ k: 'item', it: genItem(P.depth, b || u) });
}

function genItem(ilvl, good) {
  const slot = pick(Object.keys(BASES)), b = pick(BASES[slot]), sc = 1 + 0.12 * (ilvl - 1);
  const roll = Math.random() - (good ? 0.3 : 0);
  let rar = roll < 0.03 ? 3 : roll < 0.13 ? 2 : roll < 0.45 ? 1 : 0;
  if (!b[1] && !rar) rar = 1; // Ringe und Amulette sind immer magisch
  const it = { slot, base: b[0], rar, mods: {} };
  if (slot === 'weapon') { it.min = Math.round(b[1] * sc); it.max = Math.round(b[2] * sc); } else if (b[1]) it.def = Math.round(b[1] * sc);
  const affs = [...AFFIXES].sort(() => Math.random() - 0.5).slice(0, [0, rint(1, 2), rint(3, 4), rint(4, 5)][rar]);
  for (const a of affs) it.mods[a[0]] = Math.max(1, Math.round(rnd(a[3], a[4]) * (a[5] === 1 ? sc : 1 + 0.03 * (ilvl - 1))));
  if (rar === 3) { it.mods.allSkills = 1; it.nm = pick(UNIQUE_NAMES); }
  else it.nm = rar === 2 ? pick(RARE_A) + pick(RARE_B) : rar === 1 ? `${affs[0][1]} ${b[0]}` : b[0];
  it.val = Math.round((4 + affs.length * 6 + (it.max || it.def || 0)) * sc * (1 + rar));
  return it;
}

function shoot(src, ang, o) {
  const q = { x: src.x + Math.cos(ang) * src.r, y: src.y + Math.sin(ang) * src.r, ang, team: src.team, src, hitSet: new Set(), life: 1.5, pr: 0, sz: 5 };
  for (const k in o) if (o[k] != null) q[k] = o[k];
  q.vx = Math.cos(ang) * (q.v || 0); q.vy = Math.sin(ang) * (q.v || 0);
  if (q.spiral) { q.ox = src.x; q.oy = src.y; q.rad = 10; }
  G.projs.push(q);
}

function useSkill(s, r, tx, ty) {
  const p = G.player, a = Math.atan2(ty - p.y, tx - p.x), el = s.el || 'phys', dmg = () => skillDmg(s, r);
  const extras = e => S.ae.forEach(([ae, d]) => hit(p, e, d * S.lvlMult, ae));
  switch (s.t) {
    case 'melee': {
      const reach = p.r + 46;
      const tg = foes(p).filter(e => dist(p, e) < reach + e.r && adiff(Math.atan2(e.y - p.y, e.x - p.x), a) < 1.1).sort((x, y) => dist(p, x) - dist(p, y))[0];
      if (!tg) return 'miss';
      for (let i = 0; i < (s.hits || 1); i++) { hit(p, tg, dmg(), el, { st: s.st, kb: s.kb, melee: 1 }); extras(tg); }
      if (el !== 'phys') emit(tg.x, tg.y, figH(tg) * 0.5, el, 10, 30);
      fx({ k: 'hit', x: tg.x, y: tg.y, z: figH(tg) * 0.55, kind: HIT_VIS[s.id] || 'slash', col: EL[el][1], life: 0.28 });
      if (s.aoe) foes(p).forEach(e => e !== tg && dist(e, tg) < s.aoe + e.r && hit(p, e, dmg() * 0.7, el, { kb: s.kb }));
      if (s.self) p.hp = Math.max(1, p.hp - S.maxhp * s.self);
      return;
    }
    case 'proj': {
      // Zielhilfe: zielt man auf einen Gegner, wird seine Bewegung während der Flugzeit vorgehalten
      const k = s.k || 1, tg = nearest({ x: tx, y: ty }, foes(p).filter(e => Math.hypot(e.x - tx, e.y - ty) < e.r + 24));
      let aim = a;
      if (tg && !s.spiral) { const ft = dist(p, tg) / (s.v || 500); aim = Math.atan2(tg.y + (tg.vy || 0) * ft - p.y, tg.x + (tg.vx || 0) * ft - p.x); }
      for (let i = 0; i < k; i++) shoot(p, aim + (k > 1 ? (i / (k - 1) - 0.5) * s.sp : 0), {
        dmg: dmg(), el, v: s.v || 500, pr: (s.pr || 0) + (s.wm ? S.pierce : 0), ex: s.ex, hm: s.hm, kb: s.kb, st: s.st,
        life: s.life, sz: s.sz, spiral: s.spiral, shards: s.shards, leech: s.leech, ae: s.wm ? S.ae : null, vis: PROJ_VIS[s.id], arrow: s.wm && !PROJ_VIS[s.id] ? 1 : 0,
      });
      return;
    }
    case 'nova': {
      fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.r, col: EL[el][1], life: 0.4 });
      novaFx(s, p);
      for (let i = 0; i < 48; i++) { const an = i / 48 * 6.283; G.parts.push({ x: p.x, y: p.y, z: 12, vx: Math.cos(an) * s.r * 2.2, vy: Math.sin(an) * s.r * 2.2, vz: 0, life: 0.45, t: 0, col: el === 'fire' ? pick(FIRE) : EL[el][1], s: 3, add: true }); }
      for (const e of foes(p)) if (dist(p, e) < s.r + e.r) {
        const boss = e.kind === 'boss';
        let v = s.pct ? e.hp * s.pct * (boss ? 0.5 : 1) : (s.d || s.wm) ? dmg() : 0;
        if (s.undead && e.undead) v *= s.undead;
        if (v) hit(p, e, v, el, { st: s.st, direct: !!s.pct }); else if (s.st) e.st = Math.max(e.st, s.st * (boss ? 0.3 : 1));
        if (s.fear) e.fear = s.fear * (boss ? 0.3 : 1);
      }
      return;
    }
    case 'area': {
      let x = tx, y = ty;
      if (s.corpse) {
        const c = nearest({ x: tx, y: ty }, G.corpses.filter(c => Math.hypot(c.x - tx, c.y - ty) < 160));
        if (!c) { note('Keine Leiche in der Nähe'); return false; }
        G.corpses.splice(G.corpses.indexOf(c), 1); x = c.x; y = c.y;
        emit(x, y, 10, 'phys', 30, 120, { vz: rnd(80, 220), g: 420, add: false, col: '#7a0808', life: 0.8 });
      }
      const vis = AREA_VIS[s.id];
      G.areas.push({ x, y, r: s.r, el, dmg: s.d ? dmg() : 0, deb: s.deb, t: s.delay || 0, delay: s.delay || 0, ticks: s.ticks || 1, iv: s.iv || 0, burn: s.burn, src: p, meteor: s.id === 'meteor', vis,
        cracks: vis === 'lava' || vis === 'volcano' ? Array.from({ length: 7 }, () => { const a = rnd(0, 6.283), l = rnd(0.4, 1) * s.r; return [[x, y], [x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5], [x + Math.cos(a) * l, y + Math.sin(a) * l]]; }) : null });
      return;
    }
    case 'chain': {
      let from = p, v = dmg(), tg = nearest({ x: tx, y: ty }, foes(p).filter(e => dist(p, e) < 500));
      if (!tg) return false;
      const done = new Set();
      for (let j = 0; j <= s.jumps && tg; j++) {
        fx({ k: 'bolt', a: { x: from.x, y: from.y }, b: { x: tg.x, y: tg.y }, col: EL[el][1], life: 0.25 });
        hit(p, tg, v, el); done.add(tg); from = tg; v *= 0.9;
        tg = nearest(from, foes(p).filter(e => !done.has(e) && dist(from, e) < 230));
      }
      return;
    }
    case 'summon': {
      const m = MINIONS[s.m];
      for (let i = 0; i < s.k; i++) {
        let x = p.x + rnd(-40, 40), y = p.y + rnd(-40, 40);
        if (!m.v && Math.hypot(tx - p.x, ty - p.y) < 400 && free(tx, ty, m.r)) { x = tx + rnd(-25, 25); y = ty + rnd(-25, 25); }
        if (!free(x, y, m.r)) { x = p.x; y = p.y; }
        spawnMinion(s, r, x, y);
      }
      const mine = G.ents.filter(e => e.sid === s.id && !e.dead), max = s.k + Math.floor(r / 2);
      mine.slice(0, Math.max(0, mine.length - max)).forEach(e => e.dead = true);
      return;
    }
    case 'buff':
      G.buffs[s.id] = { s, r, t: s.dur * (1 + 0.05 * (r - 1)), pt: 0 };
      emit(p.x, p.y, 0, 'phys', 30, 26, { vz: rnd(60, 140), col: '#ffd860', life: 0.8 });
      return;
    case 'shield':
      G.shield = s.amt * (1 + 0.3 * (r - 1)) * S.lvlMult; G.shieldVis = SHIELD_VIS[s.id];
      return emit(p.x, p.y, 30, 'cold', 24, 40);
    case 'heal': {
      const v = s.amt * (1 + 0.15 * (r - 1));
      p.hp = Math.min(S.maxhp, p.hp + S.maxhp * v);
      G.ents.forEach(e => e.minion && dist(e, p) < 300 && (e.hp = Math.min(e.maxhp, e.hp + e.maxhp * v)));
      return emit(p.x, p.y, 0, 'phys', 30, 30, { vz: rnd(50, 120), col: '#80ff90', life: 0.9 });
    }
    case 'teleport': {
      for (let f = Math.min(s.rng, Math.hypot(tx - p.x, ty - p.y)); f > 0; f -= 10) {
        const x = p.x + Math.cos(a) * f, y = p.y + Math.sin(a) * f;
        if (!free(x, y, p.r)) continue;
        emit(p.x, p.y, 30, 'mag', 24, 40);
        p.x = x; p.y = y; p.order = null;
        emit(x, y, 30, 'mag', 24, 40);
        return;
      }
      return false;
    }
    case 'dash':
      p.dash = { tx, ty, s, r, hit: new Set(), spinT: 0, t: s.spin ? 1.6 : 0.8 };
      return;
    case 'convert': {
      const e = nearest({ x: tx, y: ty }, foes(p).filter(e => e.kind !== 'boss' && e.kind !== 'unique' && (s.id !== 'convert_undead' || e.undead) && Math.hypot(e.x - tx, e.y - ty) < 90 + e.r));
      if (!e) { note('Kein passendes Ziel'); return false; }
      Object.assign(e, { team: 'p', minion: true, conv: true, life: s.dur * (1 + 0.1 * (r - 1)), sid: s.id, fear: 0 });
      return emit(e.x, e.y, 20, 'pois', 24, 30);
    }
  }
  return false;
}

// Führt die Fähigkeit eines Slots aus; true, wenn eine Aktion stattfand
function cast(slot, tx, ty) {
  const p = G.player, id = P.slots[slot];
  if (!id || p.atkT > 0 || p.dash) return false;
  const s = SK[id], r = rank(id);
  if (!r || s.t === 'passive' || G.cds[id] > 0) return false;
  const cost = (s.mp || 0) * (1 + 0.08 * (r - 1));
  if (p.mp < cost) { note('Nicht genug Mana'); return false; }
  p.face = Math.atan2(ty - p.y, tx - p.x);
  const res = useSkill(s, r, tx, ty);
  if (res === false) return false;
  p.atkT = S.atkIv; p.atkA = 1;
  SFX.play(s.el || 'phys', 90);
  if (res === 'miss') return true;
  p.mp -= cost;
  if (s.cd) G.cds[id] = s.cd;
  return true;
}

function pulse(b) {
  const p = G.player, pl = b.s.pulse, m = 1 + 0.2 * (b.r - 1);
  fx({ k: 'ring', x: p.x, y: p.y, r0: pl.r * 0.7, r1: pl.r, col: pl.heal ? '#80ff90' : pl.amp ? '#ff8080' : EL[pl.el][1], life: 0.4, a: 0.35 });
  if (pl.heal) for (const e of G.ents) if (e.team === 'p' && !e.noTarget && dist(e, p) < pl.r) { const mx = e.player ? S.maxhp : e.maxhp; e.hp = Math.min(mx, e.hp + mx * pl.heal * m); }
  for (const e of G.ents) if (e.team === 'e' && !e.dead && dist(e, p) < pl.r + e.r) {
    if (pl.d) { hit(p, e, pl.d * (1 + 0.3 * (b.r - 1)) * (1 + S.spellPct) * S.lvlMult * (b.s.c === P.cls ? 1.25 : 1), pl.el); emit(e.x, e.y, 20, pl.el, 3, 20); }
    if (pl.amp) { e.amp = pl.amp + 0.05 * (b.r - 1); e.ampT = pl.iv + 0.2; }
  }
}

function dashStep(p, dt) {
  const d = p.dash, s = d.s, a = Math.atan2(d.ty - p.y, d.tx - p.x), rem = Math.hypot(d.tx - p.x, d.ty - p.y);
  const step = Math.min(rem, s.v * dt), moved = move(p, Math.cos(a) * step, Math.sin(a) * step);
  p.face = a; p.atkA = Math.max(p.atkA, 0.6);
  const swing = e => { hit(p, e, skillDmg(s, d.r), s.el || 'phys', { st: s.st, kb: s.spin ? 0 : 40 }); S.ae.forEach(([ae, v]) => hit(p, e, v * S.lvlMult, ae)); fx({ k: 'hit', x: e.x, y: e.y, z: figH(e) * 0.55, kind: s.spin ? 'slash' : 'impact', col: '#e0e0e0', life: 0.25 }); };
  if ((d.gT = (d.gT || 0) - dt) <= 0) { d.gT = 0.035; fx({ k: 'ghost', x: p.x, y: p.y, face: p.face, life: 0.25 }); }
  let end = rem < 6 || (d.t -= dt) <= 0 || !moved;
  if (s.spin) {
    p.face += G.t * 20;
    if ((d.spinT -= dt) <= 0) {
      d.spinT = 0.18;
      fx({ k: 'ring', x: p.x, y: p.y, r0: 20, r1: p.r + 40, col: '#d8d0c0', life: 0.18, a: 0.5 });
      for (const e of foes(p)) if (dist(p, e) < p.r + e.r + 40) swing(e);
    }
  } else if (!s.land) {
    for (const e of foes(p)) if (!d.hit.has(e) && dist(p, e) < p.r + e.r + 8) { d.hit.add(e); swing(e); end = true; }
  }
  if (!end) return;
  if (s.land) {
    fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.land, col: '#d8d0c0', life: 0.35 });
    emit(p.x, p.y, 2, 'phys', 30, 90, { vz: rnd(30, 90), g: 300, add: false, col: '#6a5a48' });
    for (const e of foes(p)) if (dist(p, e) < s.land + e.r) swing(e);
  }
  p.dash = null;
}

function explode(q) {
  fx({ k: 'ring', x: q.x, y: q.y, r0: 5, r1: q.ex, col: EL[q.el][1], life: 0.3 });
  emit(q.x, q.y, 24, q.el === 'phys' ? 'fire' : q.el, 26, q.ex * 2.2);
  for (const e of G.ents) if (e.team !== q.team && !e.dead && !e.noTarget && dist(e, q) < q.ex + e.r) hit(q.src, e, q.dmg, q.el, { st: q.st });
}
const burst = q => { for (let i = 0; i < 10; i++) shoot({ x: q.x, y: q.y, r: 0, team: q.team }, i * Math.PI / 5, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45, sz: 3, vis: 'shard' }); };

// Abstand von e zur Strecke (x1, y1)–(x2, y2): Treffer entlang der ganzen Flugstrecke eines Schritts
function segDist(e, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? clamp(((e.x - x1) * dx + (e.y - y1) * dy) / l, 0, 1) : 0;
  return Math.hypot(e.x - x1 - dx * t, e.y - y1 - dy * t);
}
function projectiles(dt) {
  for (const q of G.projs) {
    if (q.dead) continue;
    q.life -= dt;
    const ox = q.x, oy = q.y;
    if (q.spiral) {
      q.ang += 4.5 * dt; q.rad += 75 * dt;
      q.x = q.ox + Math.cos(q.ang) * q.rad; q.y = q.oy + Math.sin(q.ang) * q.rad;
    } else {
      if (q.hm) {
        const t = nearest(q, G.ents.filter(o => o.team !== q.team && !o.dead && !o.noTarget && dist(o, q) < 350));
        if (t) {
          const cur = Math.atan2(q.vy, q.vx), sp = Math.hypot(q.vx, q.vy), want = Math.atan2(t.y - q.y, t.x - q.x);
          const na = cur + clamp(Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), -6 * dt, 6 * dt);
          q.vx = Math.cos(na) * sp; q.vy = Math.sin(na) * sp;
        }
      }
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    // Wand erst nach den Treffern prüfen, sonst gehen Schüsse auf Gegner an einer Wand verloren
    const wall = !q.spiral && !walk(q.x, q.y);
    const crash = () => { if (q.ex) explode(q); if (q.shards) burst(q); q.dead = true; };
    if ((!q.arrow || q.el !== 'phys') && !['tornado', 'twister', 'axe', 'insects', 'wind', 'bone', 'fang'].includes(q.vis)) emit(q.x, q.y, 26, q.el === 'phys' ? 'mag' : q.el, q.el === 'fire' ? 2 : 1, 8, { life: 0.35 });
    if (q.shards) {
      if (wall) { crash(); continue; }
      if ((q.sT = (q.sT || 0) - dt) <= 0) { q.sT = 0.07; q.sa = (q.sa || 0) + 2.4; shoot({ x: q.x, y: q.y, r: 0, team: q.team }, q.sa, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45, sz: 3, vis: 'shard' }); }
      if (q.life <= 0) { burst(q); q.dead = true; }
      continue;
    }
    for (const e of G.ents) {
      if (e.team === q.team || e.dead || e.noTarget || q.hitSet.has(e) || segDist(e, ox, oy, q.x, q.y) >= e.r + q.sz) continue;
      q.hitSet.add(e);
      if (q.ex) { explode(q); q.dead = true; break; }
      hit(q.src, e, q.dmg, q.el, { kb: q.kb, st: q.st, leech: q.leech });
      q.ae?.forEach(([el, d]) => hit(q.src, e, d * S.lvlMult, el));
      if (q.el !== 'phys') emit(q.x, q.y, 26, q.el, 8, 30);
      if (--q.pr < 0) { q.dead = true; break; }
    }
    if (wall && !q.dead) { crash(); continue; }
    if (q.life <= 0 && !q.dead) { if (q.ex) explode(q); q.dead = true; }
  }
}

function areas(dt) {
  const add = [];
  G.areas = G.areas.filter(a => {
    if (!a.meteor || a.t <= 0) for (let i = 0; i < a.r / 30; i++) {
      const an = rnd(0, 6.283), rr2 = Math.sqrt(Math.random()) * a.r, x = a.x + Math.cos(an) * rr2, y = a.y + Math.sin(an) * rr2;
      if (a.el === 'cold') G.parts.push({ x, y, z: rnd(120, 200), vx: -30, vy: -30, vz: -420, life: 0.45, t: 0, col: pick(['#c0f0ff', '#ffffff']), s: 2, add: true, streak: 1 });
      else if (a.el === 'fire') emit(x, y, 0, 'fire', 1, 6, { vz: rnd(60, 140), life: 0.6, s: rnd(2, 5) });
      else if (a.el === 'pois') emit(x, y, 4, 'pois', 1, 6, { vz: rnd(10, 40), life: 0.9, s: rnd(3, 6) });
      else if (a.dmg) emit(x, y, 4, a.el, 1, 6);
    }
    if (a.meteor && a.t > 0) emit(a.x - a.t * 160, a.y - a.t * 160, a.t / a.delay * 500, 'fire', 4, 20);
    if ((a.t -= dt) > 0) return true;
    for (const e of G.ents) {
      if (e.team !== 'e' || e.dead || dist(e, a) >= a.r + e.r) continue;
      if (a.dmg) hit(a.src, e, a.dmg, a.el);
      if (a.deb) {
        const d = a.deb, bm = e.kind === 'boss' ? 0.3 : 1;
        if (d.amp) { e.amp = d.amp; e.ampT = d.dur; }
        if (d.slow) e.slow = Math.max(e.slow, d.dur);
        if (d.stun) e.st = Math.max(e.st, d.stun * bm);
        if (d.fear) e.fear = d.fear * bm;
        if (a.vis === 'vines') e.root = d.dur;
        if (a.vis === 'dark') e.dark = d.dur;
      }
    }
    if (a.vis === 'sky') fx({ k: 'sky', x: a.x, y: a.y, life: 0.35 });
    if (a.vis === 'pillar') fx({ k: 'pillar', x: a.x, y: a.y, r: a.r, life: 0.7 });
    if (a.vis === 'curse') fx({ k: 'rune', x: a.x, y: a.y, r: a.r, col: '#c02020', life: 0.9 });
    if (a.vis === 'psy') for (let i = 0; i < 3; i++) fx({ k: 'ring', x: a.x, y: a.y, r0: 10, r1: a.r, col: '#c060ff', life: 0.5 + i * 0.12, delay: i * 0.12 });
    if (a.vis === 'volcano') emit(a.x, a.y, 30, 'fire', 8, 120, { vz: rnd(150, 260), g: 500, life: 0.9, s: 3.5 });
    if (a.meteor || a.delay) emit(a.x, a.y, 2, a.el, 40, a.r * 2.5);
    fx({ k: 'ring', x: a.x, y: a.y, r0: a.r * 0.5, r1: a.r, col: a.dmg ? EL[a.el][1] : '#c080ff', life: 0.35, a: 0.6 });
    if (a.burn) add.push({ x: a.x, y: a.y, r: a.r * 0.8, el: a.el, dmg: a.dmg * 0.08, t: 0.33, delay: 0, ticks: a.burn * 3, iv: 0.33, src: a.src });
    if (--a.ticks <= 0) return false;
    a.t = a.iv;
    return true;
  });
  G.areas.push(...add);
}

function status(e, dt) {
  if (e.pois > 0) {
    e.hp -= e.pois * dt;
    if ((e.poisT -= dt) <= 0) e.pois = 0;
    if (e.hp <= 0) kill(e);
  }
  e.slow -= dt; e.fear -= dt; e.st -= dt; e.movT -= dt; e.flash = (e.flash || 0) - dt; e.root = (e.root || 0) - dt; e.dark = (e.dark || 0) - dt;
  e.atkA = Math.max(0, (e.atkA || 0) - dt * 3.5);
  if ((e.ampT -= dt) <= 0) e.amp = 1;
}

function think(e, dt) {
  status(e, dt);
  if (e.dead) return;
  if (e.life !== undefined && (e.life -= dt) <= 0) {
    if (e.conv) Object.assign(e, { team: 'e', minion: false, conv: false, life: undefined, sid: null });
    else { e.dead = true; emit(e.x, e.y, 20, 'mag', 16, 30); }
    return;
  }
  if (e.st > 0) return;
  const p = G.player, spd = e.v * (e.slow > 0 ? 0.5 : 1);
  let tg;
  if (e.team === 'e') {
    if (!e.awake) { if (dist(e, p) < 380) wake(e); else return; }
    tg = nearest(e, G.ents.filter(o => o.team === 'p' && !o.dead && !o.noTarget));
  } else {
    tg = nearest(e, G.ents.filter(o => o.team === 'e' && !o.dead && dist(o, p) < 450));
    if (!tg || (spd && dist(e, p) > 500)) { if (spd && dist(e, p) > 90) seek(e, p, spd * 1.2, dt); return; }
  }
  if (!tg) return;
  if (e.fear > 0) { const a = Math.atan2(e.y - p.y, e.x - p.x); e.face = a; move(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt); return; }
  const d = dist(e, tg);
  e.atkT -= dt;
  if (e.nova && (e.novaT -= dt) <= 0 && d < e.nova.r) {
    e.novaT = e.nova.cd; e.atkA = 1;
    fx({ k: 'ring', x: e.x, y: e.y, r0: 20, r1: e.nova.r, col: EL[e.nova.el][1], life: 0.5 });
    for (let i = 0; i < 40; i++) { const an = i / 40 * 6.283; G.parts.push({ x: e.x, y: e.y, z: 14, vx: Math.cos(an) * e.nova.r * 2, vy: Math.sin(an) * e.nova.r * 2, vz: 0, life: 0.5, t: 0, col: e.nova.el === 'fire' ? pick(FIRE) : EL[e.nova.el][1], s: 3, add: true }); }
    for (const o of foes(e)) if (dist(e, o) < e.nova.r) hit(e, o, e.d * 0.8, e.nova.el);
  }
  if (e.rng) {
    if (d > 280 && spd) seek(e, tg, spd, dt);
    if (d < 420 && e.atkT <= 0) {
      e.atkT = e.team === 'e' ? rnd(1.4, 2) : 0.9; e.atkA = 1;
      e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
      shoot(e, e.face, { dmg: e.d, el: e.rng.el, v: e.rng.v, life: 1.6, arrow: e.rng.el === 'phys' ? 1 : 0 });
    }
  } else if (d > e.r + tg.r + 6) { if (spd) seek(e, tg, spd, dt); }
  else {
    e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
    if (e.atkT <= 0) { e.atkT = e.team === 'e' ? 1.1 : 0.8; e.atkA = 1; hit(e, tg, e.d, e.el, { melee: 1 }); }
  }
}

function separate() {
  const es = G.ents;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, o = a.r + b.r - d;
    if (o <= 0) continue;
    const am = a.v !== 0 ? 1 : 0, bm = b.v !== 0 ? 1 : 0, push = o / ((am + bm) || 1);
    if (am) move(a, -dx / d * push * 0.5, -dy / d * push * 0.5);
    if (bm) move(b, dx / d * push * 0.5, dy / d * push * 0.5);
  }
}

function pickup() {
  const p = G.player;
  G.loot = G.loot.filter(l => {
    if (Math.hypot(l.x - p.x, l.y - p.y) > p.r + 18) return true;
    if (l.k === 'gold') { P.gold += l.n; SFX.play('gold'); return false; }
    if (l.k === 'item') {
      if (P.bag.length >= 30) { note('Kein Platz im Inventar'); return true; }
      P.bag.push(l.it); SFX.play('item'); return false;
    }
    if (P.pots[l.k] >= 10) return true;
    P.pots[l.k]++; SFX.play('item'); return false;
  });
}

function potion(k) {
  if (!P.pots[k]) return note(k === 'hp' ? 'Keine Heiltränke' : 'Keine Manatränke');
  P.pots[k]--; SFX.play('potion');
  const p = G.player;
  if (k === 'hp') p.hp = Math.min(S.maxhp, p.hp + S.maxhp * 0.45); else p.mp = Math.min(S.maxmp, p.mp + S.maxmp * 0.5);
  emit(p.x, p.y, 10, k === 'hp' ? 'fire' : 'cold', 16, 20, { col: k === 'hp' ? '#ff4040' : '#4060ff', vz: rnd(40, 100) });
}

function hoverEnt() {
  let best = null, bd = -1e9;
  for (const e of G.ents) {
    if (e.team !== 'e' || e.dead) continue;
    const [sx, sy] = proj(e.x, e.y), h = figH(e), w = Math.max(16, h * 0.3);
    if (Math.abs(mouse.x - sx) < w && mouse.y < sy + 8 && mouse.y > sy - h) { const d = e.x + e.y; if (d > bd) { bd = d; best = e; } }
  }
  return best;
}

// Steuerung wie in Diablo II: Linksklick läuft bzw. greift an, Rechtsklick zaubert
function control(p, dt) {
  const w = world(), aim = G.hover || w;
  const sx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const sy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (sx || sy) { const wx = sx + sy, wy = sy - sx, l = Math.hypot(wx, wy); walkDir(p, wx / l, wy / l, dt); p.order = null; }
  if (mouse.l) {
    if (mouse.mode === 'attack') {
      if (mouse.target?.dead) mouse.target = G.hover;
      p.order = { slot: 0, e: mouse.target, x: aim.x, y: aim.y };
    } else if (mouse.mode === 'move') p.order = { x: w.x, y: w.y };
  }
  const o = p.order;
  if (o && !(sx || sy)) {
    if (o.slot !== undefined) {
      const tg = o.e && !o.e.dead ? o.e : null;
      if (o.e && !tg) p.order = null;
      else {
        const s = SK[P.slots[0]], tx = tg ? tg.x : o.x, ty = tg ? tg.y : o.y;
        const reach = s?.t === 'melee' ? p.r + 40 + (tg ? tg.r : 0) : Infinity;
        if (tg && dist(p, tg) > reach) pathMove(p, tg.x, tg.y, dt);
        else if (cast(0, tx, ty) && !mouse.l) p.order = null;
      }
    } else if (o.prop && dist(p, o.prop) < p.r + 30) { useProp(o.prop); p.order = null; }
    else if (pathMove(p, o.x, o.y, dt)) p.order = null;
  }
  if (mouse.r) cast(1, aim.x, aim.y);
}

function update(dt) {
  S = calc();
  const p = G.player;
  G.t += dt;
  p.r = 14 * (1 + 0.3 * S.size);
  p.hp = Math.min(S.maxhp, p.hp + S.regen * dt);
  p.mp = Math.min(S.maxmp, p.mp + S.mregenTot * dt);
  for (const id in G.buffs) {
    const b = G.buffs[id];
    if (b.s.pulse && (b.pt -= dt) <= 0) { b.pt = b.s.pulse.iv; pulse(b); }
    if ((b.t -= dt) <= 0) delete G.buffs[id];
  }
  for (const k in G.cds) G.cds[k] -= dt;
  if ((G.flowT -= dt) <= 0) { G.flowT = 0.25; updateFlow(); }
  updateCam();
  G.hover = hoverEnt(); G.hoverProp = G.hover ? null : hoverProp();

  status(p, dt);
  if (p.dead) return;
  p.atkT -= dt;
  if (p.dash) dashStep(p, dt); else control(p, dt);
  for (const e of G.ents) if (!e.player && !e.dead) think(e, dt);
  separate();
  // Geschwindigkeit jeder Figur, für die Zielhilfe
  for (const e of G.ents) { e.vx = (e.x - (e.ox ?? e.x)) / dt; e.vy = (e.y - (e.oy ?? e.y)) / dt; e.ox = e.x; e.oy = e.y; }
  projectiles(dt);
  areas(dt);
  for (const q of G.parts) {
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= (q.g || 0) * dt;
    if (q.z < 0) { q.z = 0; q.vz = 0; q.vx *= 0.3; q.vy *= 0.3; }
  }
  G.parts = G.parts.filter(q => q.t < q.life);
  G.fx = G.fx.filter(f => (f.t += dt) < f.life);
  G.texts = G.texts.filter(t => (t.t += dt) < 1.2);
  G.corpses = G.corpses.filter(c => (c.t -= dt) > 0);
  G.ents = G.ents.filter(e => !e.dead || e.player);
  G.projs = G.projs.filter(q => !q.dead);
  pickup();
  const tx = (p.x / T) | 0, ty = (p.y / T) | 0;
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
    const x = tx + dx, y = ty + dy;
    if (x >= 0 && y >= 0 && x < MW && y < MH && dx * dx + dy * dy <= 81) G.seen[y * MW + x] = 1;
  }
  rounds(dt);
  if ((G.saveT -= dt) <= 0) { G.saveT = 15; save(); }
}

function respawn() {
  genLevel();
  const p = G.player;
  p.hp = S.maxhp; p.mp = S.maxmp; p.pois = 0;
  msg(`Du bist gefallen (–10 % Gold) · Runde ${P.depth} beginnt von vorn`, '#ff6060');
}

// ---------- Darstellung ----------
function text(e, s, col) { G.texts.push({ x: e.x, y: e.y, h: figH(e), s, col, t: 0 }); }
function fx(o) {
  o.t = 0;
  if (o.k === 'bolt') {
    o.pts = [];
    for (let i = 0; i <= 8; i++) { const f = i / 8, j = i % 8 ? 14 : 0; o.pts.push([o.a.x + (o.b.x - o.a.x) * f + rnd(-j, j), o.a.y + (o.b.y - o.a.y) * f + rnd(-j, j)]); }
  }
  G.fx.push(o);
}

function initPatterns() {
  PAT.wall = Object.fromEntries(Object.entries(TEX.wall).map(([k, c]) => [k, ctx.createPattern(c, 'repeat')]));
}

function drawWall(tx, ty, fade) {
  const wl = G.area[2], h = WALL_H[wl], pat = PAT.wall[wl], x0 = tx * T, y0 = ty * T, m = G.map;
  ctx.globalAlpha = fade;
  if (m[(ty + 1) * MW + tx]) {
    const [dx, dy] = proj(x0, y0 + T);
    tf(Z, Z / 2, 0, 1, dx, dy);
    ctx.fillStyle = pat; ctx.fillRect(0, -h, T, h);
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = g; ctx.fillRect(0, -h, T, h);
  }
  if (m[ty * MW + tx + 1]) {
    const [bx, by] = proj(x0 + T, y0);
    tf(-Z, Z / 2, 0, 1, bx, by);
    ctx.fillStyle = pat; ctx.fillRect(0, -h, T, h);
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = g; ctx.fillRect(0, -h, T, h);
  }
  tf(Z, Z / 2, -Z, Z / 2, cam.x, cam.y - h);
  ctx.fillStyle = pat; ctx.fillRect(x0, y0, T, T);
  ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(x0, y0, T, T);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1 / Z; ctx.strokeRect(x0, y0, T, T);
  scrT();
  for (const t of G.torches) if (t.tx === tx && t.ty === ty) {
    const [sx, sy] = proj(t.x, t.y), fl = Math.sin(G.t * 17 + tx) * 2 + Math.sin(G.t * 23 + ty);
    ctx.fillStyle = '#2a2018'; ctx.fillRect(sx - 3, sy - 62, 6, 12);
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, sx, sy - 70, 22 + fl, '#ff9a30');
    ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.ellipse(sx, sy - 70 - fl * 0.5, 3.5, 8 + fl, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.15) { const w = unproj(sx, sy); G.parts.push({ x: w.x, y: w.y, z: 74, vx: rnd(-8, 8), vy: rnd(-8, 8), vz: rnd(30, 70), life: 0.8, t: 0, col: pick(FIRE), s: 1.5, add: true }); }
  }
  ctx.globalAlpha = 1;
}

const onScr = (sx, sy) => sx > -120 && sx < W + 120 && sy > -60 && sy < H + 260;
function drawEnt(e) {
  const [sx, sy] = proj(e.x, e.y), fx2 = Math.cos(e.face) - Math.sin(e.face), fy = (Math.cos(e.face) + Math.sin(e.face)) / 2, h = figH(e);
  if (e.kind === 'unique' || e.kind === 'boss') { ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, sx, sy - h * 0.5, h * 0.7, e.kind === 'boss' ? '#5a1408' : '#3a3010'); ctx.globalCompositeOperation = 'source-over'; }
  const B = e.player ? G.buffs : {}, fxs = fx2 >= 0 ? 1 : -1;
  if (e.root > 0) { ctx.strokeStyle = '#3a6a20'; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 16, sy + Math.sin(a) * 6); ctx.quadraticCurveTo(sx + Math.cos(a) * 4, sy - h * 0.2, sx + Math.cos(a + 1) * 9, sy - h * (0.25 + (i % 2) * 0.15)); ctx.stroke(); } }
  if (B.burst_of_speed && e.movT > 0) for (let i = 1; i <= 2; i++) drawFigure(ctx, sx - fxs * i * 10, sy, e.look, { h, fx: fxs, walk: e.walk - i * 8, moving: true, atk: 0, t: G.t, alpha: 0.25 / i });
  drawFigure(ctx, sx, sy, e.look, { h, fx: fxs, back: fy < 0 && Math.abs(fy) > Math.abs(fx2) * 0.3, turn: Math.abs(fy) / (Math.hypot(fx2, fy) || 1), flash: e.flash > 0, walk: e.walk, moving: e.movT > 0, atk: e.atkA || 0, t: G.t + e.seed, alpha: e.conv ? 0.85 : B.fade ? 0.5 : 1 });
  if (e.player) bodyFx(e, sx, sy, h, fxs);
  ctx.globalCompositeOperation = 'lighter';
  if (e.slow > 0) glowDot(ctx, sx, sy - h * 0.5, h * 0.45, '#2a5a90');
  if (e.pois > 0) glowDot(ctx, sx, sy - h * 0.5, h * 0.4, '#2a6a10');
  if (e.conv) glowDot(ctx, sx, sy - h * 0.5, h * 0.4, '#105a10');
  ctx.globalCompositeOperation = 'source-over';
  if (e.player && G.shield > 0) drawShield(ctx, G.shieldVis || 'bubble', sx, sy, h, G.t);
  if (e.amp > 1) { const cy = sy - h - 10; ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, sx, cy, 12, '#a01010'); ctx.globalCompositeOperation = 'source-over'; disc(ctx, sx, cy, 5, '#e04030'); ctx.fillRect(sx - 3, cy + 2, 6, 4); disc(ctx, sx - 2, cy - 0.5, 1.3, '#200'); disc(ctx, sx + 2, cy - 0.5, 1.3, '#200'); }
  if (e.dark > 0) for (let i = 0; i < 4; i++) disc(ctx, sx + Math.cos(G.t * 2 + i * 1.6) * 10, sy - h - 2 + Math.sin(G.t * 3 + i) * 3, 9, 'rgba(10,0,20,.55)');
  if (e.st > 0) for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * 2.1; disc(ctx, sx + Math.cos(a) * 10, sy - h - 4 + Math.sin(a) * 3, 2.2, '#ffe040'); }
}

function draw() {
  const p = G.player, amb = G.area[3];
  updateCam();
  scrT(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  isoT(); ctx.drawImage(G.floor, 0, 0);
  // Bodeneffekte
  ctx.globalCompositeOperation = 'lighter';
  for (const a of G.areas) {
    const c = EL[a.el][1], g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
    g.addColorStop(0, a.dmg ? c + '40' : '#c080ff30'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
    if (a.t > 0 && a.delay) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (a.t / a.delay) + 4, 0, 7); ctx.stroke(); }
  }
  for (const id in G.buffs) {
    const c = AURA_COL[id];
    if (c) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40); g.addColorStop(0, c + '50'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = G.t * 1.2 + i * 0.785; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 27, p.y + Math.sin(a) * 27); ctx.lineTo(p.x + Math.cos(a + 0.2) * 33, p.y + Math.sin(a + 0.2) * 33); ctx.stroke(); }
      for (let i = 0; i < 3; i++) { const a = -G.t * 0.8 + i * 2.094; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 25, p.y + Math.sin(a) * 25); ctx.lineTo(p.x + Math.cos(a + 2.094) * 25, p.y + Math.sin(a + 2.094) * 25); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (Math.random() < 0.3) G.parts.push({ x: p.x + rnd(-24, 24), y: p.y + rnd(-24, 24), z: 0, vx: 0, vy: 0, vz: rnd(40, 80), life: 0.9, t: 0, col: c, s: 2, add: true });
    }
    if (id === 'hurricane') {
      ctx.strokeStyle = '#c8e0f0'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) { const r = 60 + i * 24, a = G.t * (3 - i * 0.3) + i; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, r, a, a + 1.4); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const a = rnd(0, 6.283), r = rnd(40, 200); G.parts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: rnd(10, 60), vx: -Math.sin(a) * 260, vy: Math.cos(a) * 260, vz: 0, life: 0.4, t: 0, col: '#d8f0ff', s: 2, add: true }); }
    }
    if (id === 'disease_trail' && p.movT > 0 && Math.random() < 0.5) emit(p.x, p.y, 4, 'pois', 1, 8, { vz: rnd(5, 20), life: 1.4, s: rnd(5, 9) });
  }
  for (const f of G.fx) if (f.k === 'rune' || f.k === 'crack') {
    const k = f.t / f.life;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col || '#ff7a20'; ctx.lineWidth = 2.5; ctx.globalCompositeOperation = f.k === 'crack' ? 'source-over' : 'lighter';
    if (f.k === 'rune') { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); for (let i = 0; i < 5; i++) { const a = i * 2.513 + f.t; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r); ctx.lineTo(f.x + Math.cos(a + 2.513) * f.r, f.y + Math.sin(a + 2.513) * f.r); ctx.stroke(); } }
    else for (const c of f.cracks) { ctx.beginPath(); c.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  for (const a of G.areas) if (a.cracks) {
    ctx.strokeStyle = '#ff6a10'; ctx.lineWidth = 3 + Math.sin(G.t * 12);
    for (const c of a.cracks) { ctx.beginPath(); c.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    if (Math.random() < 0.6) { const c = pick(a.cracks)[2]; emit(c[0], c[1], 0, 'fire', 1, 4, { vz: rnd(60, 160), life: 0.6, s: 3 }); }
  }
  for (const f of G.fx) if (f.k === 'ring' && f.t >= (f.delay || 0)) {
    const k = (f.t - (f.delay || 0)) / (f.life - (f.delay || 0));
    ctx.globalAlpha = (1 - k) * (f.a || 1); ctx.strokeStyle = f.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0, f.r0 + (f.r1 - f.r0) * k), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Schlagschatten fallen vom Licht des Helden weg, dazu ein dunkler Fleck direkt unter den Füßen
  for (const e of G.ents) if (!e.dead && !['wisp', 'hammer', 'bird'].includes(e.look.rig)) {
    const dx = e.x - p.x, dy = e.y - p.y, l = Math.hypot(dx, dy), k = e.player || l < 1 ? 1 : clamp(l / 160, 0.6, 2.4);
    const an = e.player || l < 1 ? 0.35 : Math.atan2(dy, dx);
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(e.x + Math.cos(an) * e.r * k * 0.9, e.y + Math.sin(an) * e.r * k * 0.9, e.r * (1 + k * 0.6), e.r * 0.7, an, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.75, 0, 7); ctx.fill();
  }
  scrT();
  // Pentagramm glüht, während Gegner kommen
  const [pcx, pcy] = proj((AC + 0.5) * T, (AC + 0.5) * T);
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, pcx, pcy, 260, G.phase === 'fight' ? `rgba(160,20,0,${0.25 + Math.sin(G.t * 3) * 0.08})` : 'rgba(90,10,0,.18)');
  ctx.globalCompositeOperation = 'source-over';
  // Leichen und Beute
  for (const c of G.corpses) { const [sx, sy] = proj(c.x, c.y), f = clamp((40 - c.t) / 0.4, 0, 1); if (onScr(sx, sy)) drawFigure(ctx, sx, sy, c.look, { h: c.h, fx: Math.cos(c.face) - Math.sin(c.face) >= 0 ? 1 : -1, walk: 0, atk: 0, t: 0, lying: Math.max(0.01, f * f), alpha: Math.min(1, c.t / 5) }); }
  for (const l of G.loot) {
    const [sx, sy] = proj(l.x, l.y);
    if (l.k === 'gold') for (let i = 0; i < 5; i++) disc(ctx, sx + (i % 3) * 4 - 4, sy - (i > 2 ? 3 : 0), 3, i % 2 ? '#e8c040' : '#b08820');
    else { const img = icon(l.k === 'item' ? itemIcon(l.it) : potionIcon(l.k)); if (img.complete) ctx.drawImage(img, sx - 12, sy - 18, 24, 24); }
  }
  // Wände und Figuren nach Tiefe sortiert
  const cs = [unproj(-120, -220), unproj(W + 120, -220), unproj(-120, H + 160), unproj(W + 120, H + 160)];
  const tx0 = Math.max(0, Math.floor(Math.min(...cs.map(c => c.x)) / T)), tx1 = Math.min(MW - 1, Math.ceil(Math.max(...cs.map(c => c.x)) / T));
  const ty0 = Math.max(0, Math.floor(Math.min(...cs.map(c => c.y)) / T)), ty1 = Math.min(MH - 1, Math.ceil(Math.max(...cs.map(c => c.y)) / T));
  const list = [], [ppx, ppy] = proj(p.x, p.y), pd = p.x + p.y;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (G.edge[ty * MW + tx]) list.push({ d: (tx + ty + 1) * T, tx, ty });
  for (const e of G.ents) if (!e.dead && onScr(...proj(e.x, e.y))) list.push({ d: e.x + e.y, e });
  for (const pr of G.props) if (onScr(...proj(pr.x, pr.y))) list.push({ d: pr.x + pr.y, pr });
  list.sort((a, b) => a.d - b.d);
  for (const it of list) {
    if (it.e) { drawEnt(it.e); continue; }
    if (it.pr) { const [sx, sy] = proj(it.pr.x, it.pr.y); drawProp(ctx, it.pr, sx, sy, G.t, it.pr === G.hoverProp); continue; }
    const [wx, wy] = proj((it.tx + 0.5) * T, (it.ty + 0.5) * T);
    drawWall(it.tx, it.ty, it.d > pd + 10 ? clamp(0.2 + (Math.hypot((wx - ppx) / 190, (wy - ppy - 70) / 150) - 0.55) * 2, 0.2, 1) : 1);
  }
  // Geschosse, Partikel, Blitze
  ctx.globalCompositeOperation = 'lighter';
  for (const q of G.projs) {
    const [sx, sy0] = proj(q.x, q.y), sy = sy0 - 26, c = EL[q.el][1];
    if (q.vis) { const [tx, ty] = proj(q.x - (q.vx || 0) * 0.08, q.y - (q.vy || 0) * 0.08), an = Math.atan2(sy0 - ty, sx - tx); ctx.globalCompositeOperation = 'source-over'; drawProjVis(ctx, q.vis, sx, sy0, an, G.t + (q.ang || 0), c, [tx, ty]); ctx.globalCompositeOperation = 'lighter'; }
    else if (q.arrow) {
      const [ex, ey] = proj(q.x - q.vx * 0.035, q.y - q.vy * 0.035);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey - 26); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      if (q.el !== 'phys') glowDot(ctx, sx, sy, 14, c);
    } else {
      glowDot(ctx, sx, sy, q.sz * Z * 3.2, c);
      disc(ctx, sx, sy, q.sz * Z * 0.7, '#ffffff');
    }
  }
  for (const q of G.parts) {
    const [sx, sy] = proj(q.x, q.y), a = 1 - q.t / q.life;
    ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
    ctx.globalAlpha = q.add ? a : Math.min(1, a * 2);
    if (q.streak) { ctx.strokeStyle = q.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy - q.z); ctx.lineTo(sx + 3, sy - q.z - 14); ctx.stroke(); }
    else { ctx.fillStyle = q.col; ctx.fillRect(sx - q.s / 2, sy - q.z - q.s / 2, q.s, q.s); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  for (const f of G.fx) {
    const k = f.t / f.life, [sx, sy] = proj(f.x ?? 0, f.y ?? 0);
    if (f.k === 'hit') drawHit(ctx, f.kind, sx, sy - f.z, k, f.col);
    else if (f.k === 'sky') {
      ctx.globalAlpha = 1 - k;
      const pts = [[sx, sy]]; for (let i = 1; i < 8; i++) pts.push([sx + rnd(-18, 18), sy - i * 70]);
      for (const [w, c] of [[10, '#fff27a55'], [4, '#fff27a'], [1.5, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      glowDot(ctx, sx, sy, 90, '#fff8c0');
    } else if (f.k === 'pillar') {
      ctx.globalAlpha = Math.sin(k * Math.PI); const w = f.r * Z * 0.8, g = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
      g.addColorStop(0, 'transparent'); g.addColorStop(0.5, '#fff0b0'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(sx - w, sy - 700, w * 2, 700);
      glowDot(ctx, sx, sy, f.r * Z * 1.4, '#ffd860');
    } else if (f.k === 'darkring') {
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = '#05000a';
      ctx.beginPath(); ctx.ellipse(sx, sy, f.r * Z * k * 1.4, f.r * Z * k * 0.7, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter';
    } else if (f.k === 'ghost') {
      ctx.globalCompositeOperation = 'source-over';
      drawFigure(ctx, sx, sy, G.player.look, { h: figH(G.player), fx: Math.cos(f.face) - Math.sin(f.face) >= 0 ? 1 : -1, walk: 0, atk: 0.5, t: G.t, alpha: 0.35 * (1 - k) });
      ctx.globalCompositeOperation = 'lighter';
    } else if (f.k === 'whirl') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { const a = f.t * 25 + i * 1.57; ctx.beginPath(); ctx.ellipse(sx, sy - 30, f.r * Z, f.r * Z * 0.5, 0, a, a + 0.9); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  for (const f of G.fx) if (f.k === 'bolt') {
    ctx.globalAlpha = 1 - f.t / f.life;
    for (const [w, c] of [[6, f.col], [2, '#ffffff']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      f.pts.forEach(([x, y], i) => { const [sx, sy] = proj(x, y); i ? ctx.lineTo(sx, sy - 30) : ctx.moveTo(sx, sy - 30); });
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // Licht
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = `rgba(0,0,0,${amb})`; lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  const lamp = (x, y, r, a) => {
    if (x < -r || y < -r || x > W + r || y > H + r) return;
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.4, `rgba(0,0,0,${a * 0.92})`); g.addColorStop(0.75, `rgba(0,0,0,${a * 0.35})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  lamp(ppx, ppy - 30, 420, 1);
  for (const t of G.torches) { const [sx, sy] = proj(t.x, t.y); lamp(sx, sy - 60, 210 + Math.sin(G.t * 13 + t.tx) * 12, 0.85); }
  for (const q of G.projs) { const [sx, sy] = proj(q.x, q.y); if (!q.arrow) lamp(sx, sy - 26, q.el === 'fire' ? 150 : 90, 0.7); }
  for (const a of G.areas) if (a.dmg && a.el !== 'pois') { const [sx, sy] = proj(a.x, a.y); lamp(sx, sy, a.r * Z * 1.6, 0.6); }
  for (const f of G.fx) if (f.k === 'bolt') { const [sx, sy] = proj(f.b.x, f.b.y); lamp(sx, sy - 30, 220, 0.8 * (1 - f.t / f.life)); }
  lamp(pcx, pcy, 420, 0.55);
  if (G.phase === 'fight') for (const [tx, ty] of ARMS) { const [sx, sy] = proj((tx + 0.5) * T, (ty + 0.5) * T); lamp(sx, sy, 200, 0.5); }
  for (const pr of G.props) if ((pr.k === 'shrine' || pr.k === 'seal') && !pr.open) { const [sx, sy] = proj(pr.x, pr.y); lamp(sx, sy - 50, 130, 0.6); }
  // Vignette: Bildränder bleiben auch im Licht dunkel
  lctx.globalCompositeOperation = 'source-over';
  const vg = lctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  lctx.fillStyle = vg; lctx.fillRect(0, 0, W, H);
  ctx.drawImage(light, 0, 0);
  // farbiges Licht: Fackeln orange, Pentagramm rot, Zauber in ihrer Elementfarbe
  const tint = (x, y, r, c) => { if (x > -r && y > -r && x < W + r && y < H + r) glowDot(ctx, x, y, r, c); };
  for (const t of G.torches) { const [sx, sy] = proj(t.x, t.y); tint(sx, sy - 60, 170, 'rgba(255,120,30,.16)'); }
  tint(pcx, pcy, 380, G.phase === 'fight' ? 'rgba(255,30,0,.14)' : 'rgba(200,30,0,.07)');
  for (const q of G.projs) if (!q.arrow) { const [sx, sy] = proj(q.x, q.y); tint(sx, sy - 26, 110, EL[q.el][1] + '30'); }
  for (const a of G.areas) if (a.dmg) { const [sx, sy] = proj(a.x, a.y); tint(sx, sy, a.r * Z * 1.4, EL[a.el][1] + '28'); }

  // Bodenbeschriftungen wie mit gedrückter Alt-Taste
  ctx.font = `600 ${Math.round(13 / (VS * PX))}px "Crimson Text", Georgia, serif`; ctx.textAlign = 'center';
  G.labels = [];
  for (const l of [...G.loot].sort((a, b) => (a.x + a.y) - (b.x + b.y))) {
    const s = l.k === 'gold' ? `${l.n} Gold` : l.k === 'item' ? l.it.nm : l.k === 'hp' ? 'Heiltrank' : 'Manatrank';
    const [sx, sy] = proj(l.x, l.y), w = ctx.measureText(s).width + 10;
    let y = sy - 34;
    while (G.labels.some(r => Math.abs(r.x - sx) < (r.w + w) / 2 && Math.abs(r.y - y) < LH * 2 + 1)) y -= LH * 2 + 1;
    G.labels.push({ x: sx, y, w, l });
    const hov = Math.abs(mouse.x - sx) < w / 2 && Math.abs(mouse.y - y) < LH;
    ctx.fillStyle = hov ? 'rgba(40,40,90,.85)' : 'rgba(0,0,0,.7)'; ctx.fillRect(sx - w / 2, y - LH, w, LH * 2);
    ctx.fillStyle = l.k === 'gold' ? '#e0e0e0' : l.k === 'item' ? RAR[l.it.rar][1] : '#e0e0e0'; ctx.fillText(s, sx, y + LH * 0.6);
  }
  if (G.hoverProp) { const [sx, sy] = proj(G.hoverProp.x, G.hoverProp.y); ctx.fillStyle = '#e0e0e0'; ctx.fillText(PROP_NM[G.hoverProp.k], sx, sy - (G.hoverProp.k === 'shrine' ? 74 : 46)); }
  for (const t of G.texts) { const [sx, sy] = proj(t.x, t.y); ctx.globalAlpha = 1 - t.t / 1.2; ctx.fillStyle = t.col; ctx.fillText(t.s, sx, sy - t.h - 10 - t.t * 20); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  if (mapOn) automap();
  if (G.dead > 0) {
    ctx.fillStyle = 'rgba(60,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c02020'; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(Math.min(44, cv.height * 0.07) / (VS * PX))}px Cinzel, serif`;
    ctx.fillText('Du bist gestorben', W / 2, H * 0.4); ctx.textAlign = 'left';
  }
}

const IMG = {};
function icon(src) { if (!IMG[src]) { IMG[src] = new Image(); IMG[src].src = src; } return IMG[src]; }

function automap() {
  const p = G.player, zm = 0.32, ox = W / 2 - (p.x - p.y) * zm, oy = H * 0.45 - (p.x + p.y) * zm / 2;
  tf(zm, zm / 2, -zm, zm / 2, ox, oy);
  ctx.strokeStyle = 'rgba(210,190,150,.75)'; ctx.lineWidth = 1.6 / zm; ctx.beginPath();
  for (let i = 0; i < MW * MH; i++) {
    if (!G.seen[i] || !G.map[i]) continue;
    const x = (i % MW) * T, y = ((i / MW) | 0) * T;
    if (!G.map[i - 1]) { ctx.moveTo(x, y); ctx.lineTo(x, y + T); }
    if (!G.map[i + 1]) { ctx.moveTo(x + T, y); ctx.lineTo(x + T, y + T); }
    if (!G.map[i - MW]) { ctx.moveTo(x, y); ctx.lineTo(x + T, y); }
    if (!G.map[i + MW]) { ctx.moveTo(x, y + T); ctx.lineTo(x + T, y + T); }
  }
  ctx.stroke();
  for (const e of G.ents) if (e.minion) { ctx.fillStyle = '#40d040'; ctx.fillRect(e.x - 8, e.y - 8, 16, 16); }
  ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 6 / zm; ctx.beginPath();
  ctx.moveTo(p.x - 40, p.y); ctx.lineTo(p.x + 40, p.y); ctx.moveTo(p.x, p.y - 40); ctx.lineTo(p.x, p.y + 40); ctx.stroke();
  scrT();
}

// ---------- HUD ----------
const el = {
  lifeLiq: $('.life .liq'), lifeTxt: $('.life span'), manaLiq: $('.mana .liq'), manaTxt: $('.mana span'), xp: $('#xp i'),
  skL: $('#skL'), skR: $('#skR'), hot: $('#hot'), belt: $('#belt'), area: $('#area'), pause: $('#pause'), pauseTxt: $('#pauseTxt'), target: $('#target'), msg: $('#msg'), note: $('#note'),
  states: $('#states'), newStats: $('#newStats'), newSkill: $('#newSkill'), popup: $('#popup'), tip: $('#tip'),
};
let hudKey = '', noteT = 0;
function msg(t, col = '#e0e0e0') { el.msg.textContent = t; el.msg.style.color = col; el.msg.classList.remove('show'); void el.msg.offsetWidth; el.msg.classList.add('show'); }
function note(t) {
  if (el.note.textContent === t && performance.now() - noteT < 1200) return;
  noteT = performance.now(); el.note.textContent = t;
  el.note.classList.remove('show'); void el.note.offsetWidth; el.note.classList.add('show');
}
const setHTML = (node, s) => { if (node.innerHTML !== s) node.innerHTML = s; };
const costOf = id => (SK[id].mp || 0) * (1 + 0.08 * (rank(id) - 1));

function hud() {
  const p = G.player;
  el.lifeLiq.style.transform = `scaleY(${clamp(p.hp / S.maxhp, 0, 1)})`;
  el.manaLiq.style.transform = `scaleY(${clamp(p.mp / S.maxmp, 0, 1)})`;
  setHTML(el.lifeTxt, `Leben: ${Math.max(0, Math.round(p.hp))} / ${Math.round(S.maxhp)}`);
  setHTML(el.manaTxt, `Mana: ${Math.round(p.mp)} / ${Math.round(S.maxmp)}`);
  el.xp.style.transform = `scaleX(${P.xp / xpNext(P.lvl)})`;
  const k = [...P.slots, ...P.hot, P.pots.hp, P.pots.mp].join();
  if (k !== hudKey) {
    hudKey = k;
    [el.skL, el.skR].forEach((b, i) => { const id = P.slots[i]; b.style.backgroundImage = id ? `url(${skillIcon(SK[id])})` : 'none'; b.dataset.skill = id || ''; });
    el.hot.innerHTML = P.hot.map((id, i) => `<div class="hk ${id && id === P.slots[1] ? 'on' : ''}" data-hk="${i}" ${id ? `data-skill="${id}" style="background-image:url(${skillIcon(SK[id])})"` : ''}><em>F${i + 1}</em></div>`).join('');
    el.belt.innerHTML = [['hp', 1], ['hp', 2], ['mp', 1], ['mp', 2]].map(([t, n], i) => `<div class="bs" data-tip="${t === 'hp' ? 'Heiltrank' : 'Manatrank'} (${P.pots[t]})">${P.pots[t] >= n ? `<img src="${potionIcon(t)}" alt="">` : ''}${n === 1 && P.pots[t] ? `<b>${P.pots[t]}</b>` : ''}<em>${i + 1}</em></div>`).join('');
  }
  el.skL.classList.toggle('oom', !!P.slots[0] && p.mp < costOf(P.slots[0]));
  el.skR.classList.toggle('oom', !!P.slots[1] && p.mp < costOf(P.slots[1]));
  const st = Object.values(G.buffs).map(b => `<div class="state" style="background-image:url(${skillIcon(b.s)})"><em>${Math.ceil(b.t)}</em></div>`).join('') + (G.shield > 0 ? `<div class="state sh"><em>${Math.round(G.shield)}</em></div>` : '');
  setHTML(el.states, st);
  setHTML(el.area, `${G.area[0]}<small>Runde ${P.depth} · ${G.phase === 'fight' ? `noch ${enemiesLeft()} Gegner` : 'Pause'}</small><small>Rekord: Runde ${P.best || 0}</small>`);
  el.pause.hidden = G.phase !== 'pause' || !!panel;
  setHTML(el.pauseTxt, `Runde ${P.depth} bereit`);
  el.newStats.hidden = !P.statPts; el.newSkill.hidden = !P.skillPts;
  const h = G.hover || (G.boss && dist(G.boss, p) < 450 ? G.boss : null);
  el.target.hidden = !h;
  if (h) {
    setHTML(el.target.firstChild, esc(h.nm) + (h.kind === 'champ' ? '<small>Champion</small>' : h.kind === 'unique' ? '<small>Einzigartig · Extrastark</small>' : h.undead ? '<small>Untot</small>' : ''));
    el.target.firstChild.style.color = h.kind === 'champ' ? '#6969ff' : h.kind === 'unique' || h.kind === 'boss' ? '#c7b377' : '#e0e0e0';
    el.target.lastChild.firstChild.style.transform = `scaleX(${Math.max(0, h.hp / h.maxhp)})`;
  }
}

// ---------- Tooltips ----------
function modTxt(k, v) {
  if (k === 'ae') return `+${Math.round(v[1])} ${EL[v[0]][0]}schaden auf Waffenangriffe`;
  return `${v > 0 ? '+' : ''}${FLAT.includes(k) ? Math.round(v * 10) / 10 : Math.round(v * 100) + '%'} ${MODN[k]}`;
}
function desc(s, r) {
  const R = Math.max(1, r), eln = EL[s.el || 'phys'][0], o = [];
  if (s.wm) o.push(`${Math.round(s.wm * (1 + 0.12 * (R - 1)) * 100)}% Waffenschaden`);
  if (s.d) o.push(`${Math.round(s.d * (1 + 0.3 * (R - 1)))} Schaden (${eln})`);
  if (s.pct) o.push(`${s.pct * 100}% des aktuellen Lebens als Schaden (${eln})`);
  if (s.k > 1 && s.t !== 'summon') o.push(`${s.k} Geschosse`);
  if (s.hits > 1) o.push(`${s.hits} Treffer`);
  [['ex', 'explodiert'], ['pr', 'durchschlagend'], ['hm', 'zielsuchend'], ['spiral', 'kreist spiralförmig'], ['shards', 'versprüht Eissplitter'], ['kb', 'Rückstoß'],
    ['aoe', 'Flächenschaden'], ['land', 'Landungsschaden'], ['spin', 'Wirbelangriff'], ['delay', 'verzögerter Einschlag'], ['corpse', 'benötigt eine Leiche']].forEach(([k, t]) => s[k] && o.push(t));
  if (s.st) o.push(`betäubt ${s.st} s`);
  if (s.fear) o.push(`Furcht ${s.fear} s`);
  if (s.leech) o.push(`${s.leech * 100}% Lebensentzug`);
  if (s.self) o.push(`kostet ${s.self * 100}% Leben`);
  if (s.ticks) o.push(`${s.ticks} Wellen`);
  if (s.undead) o.push(`×${s.undead} gegen Untote`);
  if (s.deb) {
    const d = s.deb;
    if (d.amp) o.push(`Ziele erleiden +${Math.round((d.amp - 1) * 100)}% Schaden`);
    if (d.slow) o.push('verlangsamt');
    if (d.stun) o.push(`hält ${d.stun} s fest`);
    if (d.fear) o.push(`Furcht ${d.fear} s`);
  }
  if (s.t === 'summon') o.push(`${MINIONS[s.m].nm}, max. ${s.k + Math.floor(R / 2)}${s.dur ? `, ${s.dur} s` : ''}`);
  if (s.mods) o.push(...Object.entries(s.mods).map(([k, v]) => modTxt(k, k === 'ae' ? [v[0], v[1] * (1 + 0.15 * (R - 1))] : s.t === 'passive' ? v * R : k === 'size' ? v : v * (1 + 0.15 * (R - 1)))));
  if (s.pulse) {
    const p = s.pulse;
    o.push(p.heal ? `heilt alle ${p.iv} s ${Math.round(p.heal * 100 * (1 + 0.2 * (R - 1)))}% Leben` : p.amp ? 'Gegner in der Nähe erleiden mehr Schaden' : `${Math.round(p.d * (1 + 0.3 * (R - 1)))} Schaden (${EL[p.el][0]}) pro Puls`);
  }
  if (s.dur && s.t === 'buff') o.push(`Dauer ${s.dur} s`);
  if (s.amt) o.push(s.t === 'heal' ? `heilt ${Math.round(s.amt * (1 + 0.15 * (R - 1)) * 100)}% Leben` : `absorbiert ${Math.round(s.amt * (1 + 0.3 * (R - 1)))} Schaden`);
  if (s.rng) o.push(`Reichweite ${s.rng}`);
  if (s.t === 'convert') o.push(s.id === 'convert_undead' ? 'macht einen Untoten zum Verbündeten' : 'macht einen Gegner zum Verbündeten');
  if (s.cd) o.push(`Abklingzeit ${s.cd} s`);
  return o;
}
function skillTip(id) {
  const s = SK[id], r = rank(id), own = s.c === P.cls;
  return `<b class="w">${s.nm}</b><div class="g">${s.g === 'D2' ? 'Diablo II' : s.g === 'CRtA' ? 'Champions' : 'Basis'} · ${clsName(s.c)}${own ? ' · Klassenbonus +25 %' : ''}</div>
    <div>${TYPES[s.t]}</div>
    ${r ? `<div class="w">Aktueller Rang: ${r}</div>${desc(s, r).map(x => `<div>${x}</div>`).join('')}` : ''}
    ${s.c !== 'base' && (P.ranks[s.id] || 0) < (s.max || 20) ? `<div class="w">${r ? 'Nächster Rang' : 'Rang 1'}</div>${desc(s, r + 1).map(x => `<div>${x}</div>`).join('')}` : ''}
    ${s.mp ? `<div class="b">Manakosten: ${Math.round((s.mp) * (1 + 0.08 * (Math.max(1, r) - 1)))}</div>` : ''}
    ${s.t !== 'passive' && r ? '<div class="g">F1–F8 drücken, um die Fähigkeit auf eine Schnelltaste zu legen</div>' : ''}`;
}
function itemTip(it, worn, shop) {
  const lines = [it.rar ? it.base : '', it.min ? `Schaden: ${it.min} bis ${it.max}` : '', it.def ? `Verteidigung: ${it.def}` : ''].filter(Boolean);
  return `<b style="color:${RAR[it.rar][1]}">${esc(it.nm)}</b>${lines.map(l => `<div class="w">${l}</div>`).join('')}${Object.entries(it.mods).map(([k, v]) => `<div class="b">${AFF[k][2].replace('{v}', v)}</div>`).join('')}
    ${shop ? '' : `<div class="g">${worn ? 'Klick: ablegen' : `Klick: anlegen · Rechtsklick: verkaufen (${it.val} Gold)`}</div>`}`;
}
document.addEventListener('mousemove', e => {
  const n = e.target.closest?.('[data-skill],[data-bag],[data-eqslot],[data-ware],[data-tip]');
  let h = '';
  if (n && G) {
    if (n.dataset.skill) h = skillTip(n.dataset.skill);
    else if (n.dataset.bag) h = itemTip(P.bag[+n.dataset.bag]);
    else if (n.dataset.eqslot && P.eq[n.dataset.eqslot]) h = itemTip(P.eq[n.dataset.eqslot], 1);
    else if (n.dataset.ware && G.wares[+n.dataset.ware]) { const it = G.wares[+n.dataset.ware], on = P.eq[it.slot]; h = itemTip(it, 0, true) + `<div class="w">Preis: ${wareCost(it)} Gold</div>` + (on ? `<hr>Angelegt:<br>${itemTip(on, 0, true)}` : ''); }
    else if (n.dataset.tip) h = n.dataset.tip;
  }
  el.tip.hidden = !h;
  if (!h) return;
  el.tip.innerHTML = h;
  const r = el.tip.getBoundingClientRect();
  el.tip.style.left = clamp(e.clientX - r.width / 2, 4, innerWidth - r.width - 4) + 'px';
  el.tip.style.top = (e.clientY - r.height - 18 < 4 ? e.clientY + 22 : e.clientY - r.height - 18) + 'px';
});

// ---------- Panels ----------
function renderSkills() {
  const tabs = [['all', 'Alle'], ['learned', 'Gelernt'], ['D2', 'Diablo II'], ['CRtA', 'Champions'], ...CLASSES.map(c => [c.id, c.nm]), ['crta', GROUPS.crta], ['base', GROUPS.base]];
  const q = search.toLowerCase();
  const list = SKILLS.filter(s => (filter === 'all' || s.g === filter || s.c === filter || (filter === 'learned' && rank(s.id) > 0)) && (!q || s.nm.toLowerCase().includes(q)));
  const hk = id => P.hot.indexOf(id);
  return `<header><h2>${G.phase === 'pause' && P.depth === 1 ? 'Fähigkeiten wählen' : 'Fähigkeiten'}</h2><div class="pts">Verbleibende Fähigkeitspunkte <b>${P.skillPts}</b></div><button data-act="respec">Alle zurücksetzen</button>${G.phase === 'pause' ? `<button data-act="next">Runde ${P.depth} starten</button>` : ''}<button class="x" data-act="close">✕</button></header>
    <div class="tree"><div class="skgrid">${list.map(s => {
      const r = rank(s.id), i = hk(s.id);
      return `<div class="sk ${r ? 'on' : ''} ${s.c === P.cls ? 'own' : ''}" data-skill="${s.id}" data-up="${s.id}">
        <img src="${skillIcon(s)}" alt=""><b class="rk">${r || ''}</b>${i >= 0 ? `<em>F${i + 1}</em>` : ''}<span>${s.nm}</span></div>`;
    }).join('') || '<p class="hint">Keine Fähigkeit gefunden.</p>'}</div>
    <div class="tabs"><input id="sksearch" placeholder="Suchen…" value="${esc(search)}">${tabs.map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div></div>
    <p class="hint">Klick: Rang erhöhen · Rechtsklick: Punkt zurück · Maus über eine gelernte Fähigkeit + F1–F8: Schnelltaste · Links-/Rechtsklick-Fähigkeit wählst du über die Felder neben den Kugeln.</p>`;
}

function renderChar() {
  const c = CL[P.cls], pct = v => Math.round(v * 100) + '%';
  const stat = (k, n) => `<div class="st"><label>${n}</label><b>${Math.round(S[k])}</b>${P.statPts ? `<button class="plus" data-stat="${k}">+</button>` : '<i></i>'}</div>`;
  const val = (n, v) => `<div class="st"><label>${n}</label><b>${v}</b></div>`;
  return `<header><h2>${esc(P.name)}</h2><div class="pts">${c.nm}</div><button class="x" data-act="close">✕</button></header>
    <div class="cgrid">
      ${val('Stufe', P.lvl)}${val('Erfahrung', Math.floor(P.xp))}${val('Nächste Stufe', xpNext(P.lvl))}
      ${stat('str', 'Stärke')}${val('Schaden', `${Math.round(S.wmin * (1 + S.dmgPct) * S.lvlMult)}–${Math.round(S.wmax * (1 + S.dmgPct) * S.lvlMult)}`)}${val('Krit. Treffer', pct(S.crit))}
      ${stat('dex', 'Geschick')}${val('Angriffe/s', (1 / S.atkIv).toFixed(2))}${val('Ausweichen', pct(S.dodge))}
      ${stat('vit', 'Vitalität')}${val('Leben', `${Math.round(G.player.hp)}/${Math.round(S.maxhp)}`)}${val('Verteidigung', Math.round(S.armor))}
      ${stat('ene', 'Energie')}${val('Mana', `${Math.round(G.player.mp)}/${Math.round(S.maxmp)}`)}${val('Zauberschaden', '+' + pct(S.spellPct + S.lvlMult - 1))}
    </div>
    <div class="res">${['Feuer', 'Kälte', 'Blitz', 'Gift'].map((n, i) => `<div class="st"><label style="color:${['#ff7a2a', '#7fd4ff', '#fff27a', '#7dff5a'][i]}">${n}-Widerstand</label><b>${pct(S.res)}</b></div>`).join('')}</div>
    ${P.statPts ? `<p class="pts center">Verbleibende Attributpunkte <b>${P.statPts}</b></p>` : ''}
    <p class="hint">Stärke: Nahkampf- und Wurfschaden · Geschick: Fernkampf, Krit, Tempo · Vitalität: Leben · Energie: Mana, Zauberschaden</p>`;
}

function renderInv() {
  const box = (k, n, cls) => `<div class="eqs ${cls}" data-eqslot="${k}">${P.eq[k] ? `<img src="${itemIcon(P.eq[k])}" alt="">` : `<span>${n}</span>`}</div>`;
  const cells = Array.from({ length: 30 }, (_, i) => P.bag[i] ? `<div class="cell r${P.bag[i].rar}" data-bag="${i}"><img src="${itemIcon(P.bag[i])}" alt=""></div>` : '<div class="cell"></div>').join('');
  return `<header><h2>Inventar</h2><div class="pts">${P.gold} Gold</div><button class="x" data-act="close">✕</button></header>
    <div class="doll">${box('helm', 'Helm', 'h')}${box('amulet', 'Amulett', 'a')}${box('weapon', 'Waffe', 'w')}${box('armor', 'Rüstung', 'b')}${box('ring', 'Ring', 'r')}</div>
    <div class="bag">${cells}</div>
    <div class="row"><button data-buy="hp">Heiltrank (${potCost()} Gold)</button><button data-buy="mp">Manatrank (${potCost()} Gold)</button><button data-act="sellall">Normale Gegenstände verkaufen</button></div>
    <p class="hint">Klick: anlegen · Rechtsklick: verkaufen · Tränke: ${P.pots.hp}/10 Heil, ${P.pots.mp}/10 Mana</p>`;
}

function renderMenu() {
  return `<header><h2>Menü</h2><button class="x" data-act="close">✕</button></header>
    <div class="menu"><button data-act="close">Spiel fortsetzen</button><button data-act="sound">Ton: ${SFX.on ? 'an' : 'aus'}</button><button data-act="pixel">Pixel-Look: ${PX < 1 ? 'an' : 'aus'}</button><button data-act="menu">Speichern und zum Hauptmenü</button></div>
    <table class="keys">${[['Linksklick', 'Laufen / mit linker Fähigkeit angreifen'], ['Umschalt + Linksklick', 'Angreifen ohne zu laufen'], ['Rechtsklick', 'Rechte Fähigkeit'], ['F1–F8 / Mausrad', 'Rechte Fähigkeit wechseln'], ['1–4 (Q/E)', 'Tränke aus dem Gürtel'], ['WASD', 'Alternativ laufen'], ['C · I · T', 'Charakter · Inventar · Fähigkeiten'], ['Tab', 'Automap']].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
}

const wareCost = it => it.val * 4, gambleCost = () => 60 + P.depth * 30, rerollCost = () => 15 + P.depth * 10;
function renderShop() {
  const cells = Array.from({ length: 10 }, (_, i) => G.wares[i] ? `<div class="cell r${G.wares[i].rar}" data-ware="${i}"><img src="${itemIcon(G.wares[i])}" alt=""></div>` : '<div class="cell"></div>').join('');
  return `<header><h2>Händler</h2><div class="pts">${P.gold} Gold</div><button class="x" data-act="close">✕</button></header>
    <div class="bag">${cells}</div>
    <div class="row"><button data-buy="hp">Heiltrank (${potCost()} Gold)</button><button data-buy="mp">Manatrank (${potCost()} Gold)</button><button data-act="heal">Heilen (kostenlos)</button></div>
    <div class="row"><button data-act="gamble">Glücksspiel (${gambleCost()} Gold)</button><button data-act="reroll">Neues Angebot (${rerollCost()} Gold)</button></div>
    <div class="row"><button data-act="next">Runde ${P.depth} starten</button></div>
    <p class="hint">Glücksspiel: zufälliger Gegenstand, oft magisch oder selten · Klick: kaufen · Verkaufen im Inventar (I) per Rechtsklick · Tränke: ${P.pots.hp}/10 Heil, ${P.pots.mp}/10 Mana</p>`;
}
const PANELS = { skills: renderSkills, char: renderChar, inv: renderInv, menu: renderMenu, shop: renderShop };
const renderPanel = () => { const n = $('#panel'); n.className = 'pn-' + panel; n.innerHTML = PANELS[panel](); };
function openPanel(n) { closePopup(); panel = n; mouse.l = mouse.r = false; $('#panel').hidden = false; S = calc(); renderPanel(); }
function closePanel() { panel = null; $('#panel').hidden = true; el.tip.hidden = true; save(); }
const toggle = n => panel === n ? closePanel() : openPanel(n);

function respec() {
  for (const id in P.ranks) if (SK[id].c !== 'base') P.skillPts += P.ranks[id];
  P.ranks = {};
  const basic = CL[P.cls].ranged ? 'shoot' : 'attack';
  P.slots = [basic, null]; P.hot = [basic, null, null, null, null, null, null, null];
}
function unlearn(id) {
  if (!P.ranks[id] || SK[id].c === 'base') return;
  P.ranks[id]--; P.skillPts++;
  if (P.ranks[id]) return;
  delete P.ranks[id];
  P.hot = P.hot.map(h => h === id ? null : h); P.slots = P.slots.map(h => h === id ? null : h);
}
function learn(id) {
  const s = SK[id];
  if (P.skillPts <= 0 || (P.ranks[id] || 0) >= (s.max || 20) || s.c === 'base') return;
  const first = !P.ranks[id];
  P.ranks[id] = (P.ranks[id] || 0) + 1; P.skillPts--;
  if (first && s.t !== 'passive') { const i = P.hot.indexOf(null); if (i >= 0) P.hot[i] = id; }
}

function openPopup(side) {
  popup = side;
  const list = SKILLS.filter(s => rank(s.id) > 0 && s.t !== 'passive');
  el.popup.className = side ? 'right' : 'left';
  el.popup.innerHTML = `<div class="ph">${side ? 'Rechte' : 'Linke'} Fähigkeit wählen</div><div class="pl">${list.map(s => {
    const i = P.hot.indexOf(s.id);
    return `<div class="pi ${P.slots[side] === s.id ? 'on' : ''}" data-skill="${s.id}" data-pick="${s.id}" style="background-image:url(${skillIcon(s)})">${i >= 0 ? `<em>F${i + 1}</em>` : ''}</div>`;
  }).join('')}</div><div class="ph g">Maus darüber + F1–F8: Schnelltaste</div>`;
  el.popup.hidden = false;
}
function closePopup() { popup = null; el.popup.hidden = true; }
function bindHot(n) {
  const h = document.querySelector('#popup [data-skill]:hover, #panel [data-skill]:hover');
  if (h) {
    const id = h.dataset.skill;
    if (!rank(id) || SK[id].t === 'passive') return;
    P.hot = P.hot.map(x => x === id ? null : x); P.hot[n] = id;
    if (popup !== null) openPopup(popup); else if (panel) renderPanel();
    return;
  }
  if (P.hot[n]) { P.slots[1] = P.hot[n]; note(SK[P.hot[n]].nm); }
}

$('#panel').addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-filter],[data-up],[data-stat],[data-bag],[data-eqslot],[data-buy],[data-ware]');
  if (!b) return;
  const d = b.dataset;
  if (d.act === 'close') return closePanel();
  if (d.act === 'menu') { save(); return showSelect(); }
  if (d.act === 'sound') { SFX.toggle(); return renderPanel(); }
  if (d.act === 'pixel') { try { localStorage.setItem(PIXEL, pixelOn() ? '0' : '1'); } catch { /* privater Modus */ } resize(); return renderPanel(); }
  if (d.act === 'next') return startRound();
  if (d.act === 'respec') respec();
  if (d.act === 'gamble' && P.gold >= gambleCost() && P.bag.length < 30) { P.gold -= gambleCost(); P.bag.push(genItem(P.depth + 2, Math.random() < 0.5)); SFX.play('item'); }
  if (d.act === 'reroll' && P.gold >= rerollCost()) { P.gold -= rerollCost(); pause(); SFX.play('gold'); }
  if (d.act === 'heal') { G.player.hp = S.maxhp; G.player.mp = S.maxmp; G.player.pois = 0; SFX.play('shrine'); }
  if (d.ware) { const it = G.wares[+d.ware]; if (it && P.gold >= wareCost(it) && P.bag.length < 30) { P.gold -= wareCost(it); P.bag.push(it); G.wares.splice(+d.ware, 1); el.tip.hidden = true; SFX.play('gold'); } }
  if (d.act === 'sellall') P.bag = P.bag.filter(it => it.rar || !(P.gold += it.val));
  else if (d.filter) filter = d.filter;
  else if (d.up) learn(d.up);
  else if (d.stat && P.statPts > 0) { P[d.stat]++; P.statPts--; }
  else if (d.bag) { const it = P.bag.splice(+d.bag, 1)[0], old = P.eq[it.slot]; P.eq[it.slot] = it; if (old) P.bag.push(old); }
  else if (d.eqslot && P.eq[d.eqslot] && P.bag.length < 30) { P.bag.push(P.eq[d.eqslot]); delete P.eq[d.eqslot]; }
  else if (d.buy && P.gold >= potCost() && P.pots[d.buy] < 10) { P.gold -= potCost(); P.pots[d.buy]++; }
  S = calc(); renderPanel();
});
$('#panel').addEventListener('contextmenu', e => {
  e.preventDefault();
  const u = e.target.closest('[data-up]');
  if (u) { unlearn(u.dataset.up); return renderPanel(); }
  const b = e.target.closest('[data-bag]');
  if (!b) return;
  P.gold += P.bag[+b.dataset.bag].val; P.bag.splice(+b.dataset.bag, 1);
  el.tip.hidden = true; renderPanel();
});
$('#panel').addEventListener('input', e => {
  if (e.target.id !== 'sksearch') return;
  search = e.target.value; renderPanel();
  const i = $('#sksearch'); i.focus(); i.setSelectionRange(search.length, search.length);
});
el.popup.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { P.slots[popup] = b.dataset.pick; closePopup(); } });
el.skL.addEventListener('click', () => popup === 0 ? closePopup() : openPopup(0));
el.skR.addEventListener('click', () => popup === 1 ? closePopup() : openPopup(1));
el.hot.addEventListener('click', e => { const b = e.target.closest('[data-hk]'); if (b && P.hot[+b.dataset.hk]) P.slots[1] = P.hot[+b.dataset.hk]; });
el.newStats.addEventListener('click', () => openPanel('char'));
el.newSkill.addEventListener('click', () => openPanel('skills'));
$('#nextRound').addEventListener('click', () => startRound());
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { const n = b.dataset.open; if (n === 'map') mapOn = !mapOn; else toggle(n); }));

// ---------- Hauptmenü & Spielstand ----------
function save() { if (P) try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch { /* privater Modus */ } }
function loadSave() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE));
    if (!p || !CL[p.cls]) return null;
    if (!p.hot) { p.hot = [...p.slots.slice(2), null, null].slice(0, 8); p.slots = p.slots.slice(0, 2); }
    for (const id in p.ranks) if (!SK[id]) delete p.ranks[id];
    p.slots = p.slots.map(id => SK[id] ? id : null);
    p.hot = p.hot.map(id => SK[id] ? id : null);
    return p;
  } catch { return null; }
}

function preview(cnv, id, t, moving) {
  const g = cnv.getContext('2d');
  g.clearRect(0, 0, cnv.width, cnv.height);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(cnv.width / 2, cnv.height - 12, 22, 8, 0, 0, 7); g.fill();
  drawFigure(g, cnv.width / 2, cnv.height - 12, LOOKS[id], { h: 96 * (LOOKS[id].hm || 1), fx: 1, walk: t * 120, moving, atk: 0, t });
}

function showSelect() {
  G = null; panel = null; chosen = null;
  closePopup();
  $('#hud').hidden = true; $('#panel').hidden = true; el.tip.hidden = true;
  const saved = loadSave(), sel = $('#select');
  sel.hidden = false;
  sel.innerHTML = `<h1>Sanctuary <span>&amp;</span> Norrath</h1>
    <p class="sub">Im Geiste von Diablo II: Lord of Destruction und Champions: Return to Arms</p>
    ${record() ? `<p class="sub">Rekord: Runde ${record().round} · ${esc(record().name)} (${CL[record().cls]?.nm || ''})</p>` : ''}
    ${saved ? `<button class="big" data-act="continue">Fortsetzen · ${esc(saved.name)}, Stufe ${saved.lvl} ${CL[saved.cls].nm} · Runde ${saved.depth}</button>` : ''}
    ${['D2', 'CRtA'].map(g => `<h3>${g === 'D2' ? 'Diablo II: Lord of Destruction' : 'Champions: Return to Arms'}</h3>
      <div class="classes">${CLASSES.filter(c => c.g === g).map(c => `<button class="cls" data-cls="${c.id}"><canvas width="110" height="130"></canvas><b>${c.nm}</b></button>`).join('')}</div>`).join('')}
    <div class="info" id="clsinfo">Wähle eine Klasse</div>
    <div class="row"><input id="cname" maxlength="16" placeholder="Name des Helden"><button class="big" data-act="start" disabled>Abenteuer beginnen</button></div>
    <p class="hint">Jede Klasse kann jede der ${SKILLS.length - 2} Fähigkeiten aus beiden Spielen lernen. Fähigkeiten der eigenen Klasse wirken 25 % stärker.</p>`;
  sel.querySelectorAll('.cls').forEach(b => preview(b.querySelector('canvas'), b.dataset.cls, 0, false));
}

function startGame() {
  $('#select').hidden = true; $('#hud').hidden = false;
  G = null; hudKey = '';
  genLevel();
  if (P.skillPts) openPanel('skills');
  note(`Verteile deine Fähigkeitspunkte, dann Runde ${P.depth} starten (N)`);
}

$('#select').addEventListener('click', e => {
  const b = e.target.closest('[data-cls],[data-act]');
  if (!b) return;
  if (b.dataset.cls) {
    chosen = b.dataset.cls;
    const c = CL[chosen];
    document.querySelectorAll('.cls').forEach(n => { n.classList.toggle('on', n === b); preview(n.querySelector('canvas'), n.dataset.cls, 0, false); });
    $('#clsinfo').innerHTML = `<b>${c.nm}</b> · Stärke ${c.str} · Geschick ${c.dex} · Vitalität ${c.vit} · Energie ${c.ene}${c.ranged ? ' · Fernkampf' : ''}<br>Startfähigkeiten: ${c.start.map(id => SK[id].nm).join(', ')}`;
    $('[data-act="start"]').disabled = false;
  } else if (b.dataset.act === 'start' && chosen) { newChar(chosen, $('#cname').value.trim()); save(); startGame(); }
  else if (b.dataset.act === 'continue') { P = loadSave(); startGame(); }
});

// ---------- Eingabe ----------
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (/^f[1-8]$/.test(k)) { e.preventDefault(); if (G) bindHot(+k.slice(1) - 1); return; }
  if (k === 'escape') { if (popup !== null) closePopup(); else if (panel) closePanel(); else if (G) openPanel('menu'); return; }
  if (e.target.tagName === 'INPUT' || !G) return;
  if (k === 'tab') { e.preventDefault(); mapOn = !mapOn; return; }
  keys[k] = true;
  if (e.repeat) return;
  if (k === 't' || k === 'k') toggle('skills');
  else if (k === 'c') toggle('char');
  else if (k === 'h' && G.phase === 'pause') toggle('shop');
  else if (k === 'n') startRound();
  else if (k === 'i' || k === 'b') toggle('inv');
  else if (!panel && (k === '1' || k === '2' || k === 'q')) potion('hp');
  else if (!panel && (k === '3' || k === '4' || k === 'e')) potion('mp');
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
cv.addEventListener('mousedown', e => {
  if (!G || panel) return;
  closePopup();
  if (e.button === 2) { mouse.r = true; return; }
  if (e.button !== 0) return;
  mouse.l = true;
  const lab = G.labels.find(r => Math.abs(mouse.x - r.x) < r.w / 2 && Math.abs(mouse.y - r.y) < LH);
  if (lab) { mouse.mode = null; G.player.order = { x: lab.l.x, y: lab.l.y }; }
  else if (G.hoverProp && !e.shiftKey) { mouse.mode = null; G.player.order = { x: G.hoverProp.x, y: G.hoverProp.y, prop: G.hoverProp }; }
  else if (G.hover || e.shiftKey) { mouse.mode = 'attack'; mouse.target = G.hover; }
  else mouse.mode = 'move';
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('mousemove', e => { mouse.x = e.clientX / VS; mouse.y = e.clientY / VS; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  if (!G) return;
  const hot = P.hot.filter(Boolean);
  if (!hot.length) return;
  const i = hot.indexOf(P.slots[1]);
  P.slots[1] = hot[(i + (e.deltaY > 0 ? 1 : -1) + hot.length) % hot.length];
}, { passive: true });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G) {
    if (G.dead > 0) { if ((G.dead -= dt) <= 0) respawn(); }
    else if (!panel) update(dt);
    if (G) { draw(); hud(); }
  } else if (chosen) {
    const b = document.querySelector(`.cls[data-cls="${chosen}"] canvas`);
    if (b) preview(b, chosen, now / 1000, true);
  }
  requestAnimationFrame(frame);
}
genTextures();
initPatterns();
document.documentElement.style.setProperty('--stone', `url(${TEX.stone.toDataURL()})`);
document.documentElement.style.setProperty('--red', `url(${TEX.red.toDataURL()})`);
document.documentElement.style.setProperty('--blue-liq', `url(${TEX.blue.toDataURL()})`);
showSelect();
requestAnimationFrame(frame);

// Zusatzeffekte für Novas
function novaFx(s, p) {
  const id = s.id;
  if (id === 'static_field') for (let i = 0; i < 10; i++) { const a = i * 0.628 + rnd(0, 0.3); fx({ k: 'bolt', a: { x: p.x, y: p.y }, b: { x: p.x + Math.cos(a) * s.r, y: p.y + Math.sin(a) * s.r }, col: '#fff27a', life: 0.25 }); }
  if (['howl', 'roar', 'war_cry', 'turn_undead'].includes(id)) for (let i = 1; i < 4; i++) fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.r, col: id === 'turn_undead' ? '#ffd860' : '#e0d8c0', life: 0.45 + i * 0.12, delay: i * 0.12, a: 0.6 });
  if (id === 'ground_pound') { fx({ k: 'crack', x: p.x, y: p.y, life: 1.2, col: '#3a2a1a', cracks: Array.from({ length: 8 }, () => { const a = rnd(0, 6.283), l = rnd(0.5, 1) * s.r; return [[p.x, p.y], [p.x + Math.cos(a + 0.3) * l * 0.5, p.y + Math.sin(a + 0.3) * l * 0.5], [p.x + Math.cos(a) * l, p.y + Math.sin(a) * l]]; }) }); emit(p.x, p.y, 2, 'phys', 40, s.r * 2, { vz: rnd(30, 90), g: 300, add: false, col: '#6a5a48' }); }
  if (id === 'cloak_of_shadows') fx({ k: 'darkring', x: p.x, y: p.y, r: s.r, life: 0.6 });
  if (id === 'cyclone') fx({ k: 'whirl', x: p.x, y: p.y, r: s.r, life: 0.4 });
  if (id === 'wave_of_flame') for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; G.parts.push({ x: p.x, y: p.y, z: 0, vx: Math.cos(a) * s.r * 2, vy: Math.sin(a) * s.r * 2, vz: rnd(40, 90), life: 0.5, t: 0, col: pick(FIRE), s: 6, add: true }); }
  if (id === 'poison_nova') for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283; G.parts.push({ x: p.x, y: p.y, z: 6, vx: Math.cos(a) * s.r * 1.6, vy: Math.sin(a) * s.r * 1.6, vz: 10, life: 0.8, t: 0, col: '#5adf30', s: 8, add: true }); }
  if (id === 'frost_nova') for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283; G.parts.push({ x: p.x, y: p.y, z: 10, vx: Math.cos(a) * s.r * 2.2, vy: Math.sin(a) * s.r * 2.2, vz: 0, life: 0.45, t: 0, col: '#e8f8ff', s: 5, add: true }); }
}

// Verstärkungen am Körper des Helden
function bodyFx(e, sx, sy, h, fxs) {
  const B = G.buffs;
  ctx.globalCompositeOperation = 'lighter';
  if (B.frozen_armor || B.frost_armor) for (let i = 0; i < 5; i++) { const a = G.t * 2 + i * 1.257, x = sx + Math.cos(a) * h * 0.32, y = sy - h * 0.5 + Math.sin(a) * h * 0.25; ctx.fillStyle = '#c8ecff'; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 2, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 2, y); ctx.fill(); }
  if (B.berserker_rage || B.might) glowDot(ctx, sx, sy - h * 0.5, h * 0.55, '#601008');
  if (B.giant_growth) glowDot(ctx, sx, sy - h * 0.5, h * 0.6, '#204a10');
  if (B.battle_mage) glowDot(ctx, sx, sy - h * 0.5, h * 0.5, '#301860');
  if (B.oak_sage) { glowDot(ctx, sx - 30, sy - 20, 20, '#40a030'); }
  const hand = [sx + fxs * h * 0.2, sy - h * 0.55];
  for (const [el] of S.ae) { glowDot(ctx, hand[0], hand[1], 16, EL[el][1]); if (Math.random() < 0.3) emit(e.x, e.y, h * 0.55, el, 1, 6, { life: 0.4 }); }
  ctx.globalCompositeOperation = 'source-over';
}
