'use strict';
const $ = s => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
const light = mkCanvas(1), lctx = light.getContext('2d');
let W = 0, H = 0;
function resize() { W = cv.width = light.width = innerWidth; H = cv.height = light.height = innerHeight; }
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
const isoT = () => ctx.setTransform(Z, Z / 2, -Z, Z / 2, cam.x, cam.y);
const scrT = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
const figH = e => e.r * 4 * Z * (e.look.hm || 1);
const world = () => unproj(mouse.x, mouse.y);
function updateCam() { const p = G.player; cam.x = W / 2 - (p.x - p.y) * Z; cam.y = H * 0.45 - (p.x + p.y) * Z / 2; }

// ---------- Charakter ----------
function newChar(cid, name) {
  const c = CL[cid], off = id => ['proj', 'melee'].includes(SK[id].t);
  const [a, b] = off(c.start[0]) ? c.start : [c.start[1], c.start[0]];
  const wpn = c.ranged ? 'Kurzbogen' : 'Kurzschwert', basic = c.ranged ? 'shoot' : 'attack';
  P = {
    cls: cid, name: name || 'Namenloser Held', lvl: 1, xp: 0, str: c.str, dex: c.dex, vit: c.vit, ene: c.ene, statPts: 0, skillPts: 3,
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

function genLevel() {
  const map = new Uint8Array(MW * MH), rooms = [], dd = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
  for (let i = 0; i < 400 && rooms.length < 14; i++) {
    const w = rint(6, 12), h = rint(6, 11), x = rint(2, MW - w - 3), y = rint(2, MH - h - 3);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) map[y * MW + x] = 1;
  const carve = (x, y) => { map[y * MW + x] = map[y * MW + x + 1] = map[(y + 1) * MW + x] = map[(y + 1) * MW + x + 1] = 1; };
  const link = (a, b) => {
    for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) carve(x, a.cy);
    for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) carve(b.cx, y);
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = rooms[0];
    for (let j = 0; j < i; j++) if (dd(rooms[j], rooms[i]) < dd(best, rooms[i])) best = rooms[j];
    link(best, rooms[i]);
  }
  if (rooms.length > 3) link(rooms[rooms.length - 1], rooms[1]);
  const start = rooms[0], end = rooms.reduce((a, r) => dd(r, start) > dd(a, start) ? r : a);

  const old = G, keep = old ? old.ents.filter(e => e.minion && !e.dead && !e.conv) : [];
  G = {
    map, seen: new Uint8Array(MW * MH), edge: new Uint8Array(MW * MH), depth: P.depth, area: AREAS[(P.depth - 1) % AREAS.length],
    ents: [], projs: [], fx: [], areas: [], parts: [], texts: [], loot: [], corpses: [], labels: [], torches: [], buffs: old?.buffs || {}, cds: {},
    shield: old?.shield || 0, t: 0, flowT: 0, flow: new Int16Array(MW * MH), saveT: 15, dead: 0, hover: null,
    stairs: { x: (end.cx + 0.5) * T, y: (end.cy + 0.5) * T }, boss: null,
  };
  for (let i = 0; i < MW * MH; i++) if (!map[i]) {
    const x = i % MW, y = (i / MW) | 0;
    if (DIRS8.some(([dx, dy]) => x + dx >= 0 && x + dx < MW && map[(y + dy) * MW + x + dx])) G.edge[i] = 1;
  }
  G.floor = bakeFloor();
  const p = old?.player || { r: 14, team: 'p', player: true, hp: 1, mp: 1, atkT: 0, face: 0.8, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0, look: LOOKS[P.cls] };
  Object.assign(p, { x: (start.cx + 0.5) * T, y: (start.cy + 0.5) * T, dash: null, dead: false, order: null, path: null, pathT: -1 });
  G.player = p; G.ents.push(p);
  keep.forEach(m => { m.x = p.x + rnd(-30, 30); m.y = p.y + rnd(-30, 30); G.ents.push(m); });
  S = calc();
  if (!old) { p.hp = S.maxhp; p.mp = S.maxmp; }

  const pool = MONSTERS.filter(m => m.from <= P.depth);
  for (const r of rooms) {
    if (r === start) continue;
    for (let i = rint(1, P.depth > 4 ? 3 : 2); i > 0; i--) {
      const t = pick(pool), roll = Math.random(), kind = roll < 0.05 ? 'unique' : roll < 0.15 ? 'champ' : null;
      const cx = (rint(r.x + 1, r.x + r.w - 2) + 0.5) * T, cy = (rint(r.y + 1, r.y + r.h - 2) + 0.5) * T;
      const n = kind === 'unique' ? 4 : rint(3, 5);
      for (let j = 0; j < n; j++) spawnMon(t, cx + rnd(-30, 30), cy + rnd(-30, 30), kind === 'unique' ? (j ? 'minion' : 'unique') : kind);
    }
  }
  if (P.depth % 5 === 0) G.boss = spawnMon(BOSSES[(P.depth / 5 - 1) % BOSSES.length], G.stairs.x, G.stairs.y - 60, 'boss');
  msg(`${G.area[0]} – Ebene ${P.depth}${G.boss ? ` · ${G.boss.nm} erwartet dich` : ''}`, '#c7b377');
}

// Boden einmal pro Ebene in eine Textur backen (inkl. Schatten an Wänden, Blut, Knochen, Geröll)
function bakeFloor() {
  const [, fl, wl] = G.area, m = G.map, c = mkCanvas(MW * T), g = c.getContext('2d');
  g.fillStyle = g.createPattern(TEX.floor[fl], 'repeat');
  for (let i = 0; i < MW * MH; i++) if (m[i]) g.fillRect((i % MW) * T, ((i / MW) | 0) * T, T, T);
  const torchy = ['brick', 'sandstone', 'hell'].includes(wl);
  for (let i = 0; i < MW * MH; i++) {
    const tx = i % MW, ty = (i / MW) | 0, x = tx * T, y = ty * T, h = hash(tx, ty);
    if (!m[i]) {
      if (torchy && G.edge[i] && h % 11 === 0) {
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
    else if (r < 16 && fl === 'grass') { g.strokeStyle = '#1a200f'; g.lineWidth = 1.4; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(cx + k * 2 - 6, cy); g.lineTo(cx + k * 2 - 7 + rnd(-2, 2), cy - rnd(5, 10)); g.stroke(); } }
  }
  return c;
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
  const m = MINIONS[s.m], hm = (1 + 0.15 * (r - 1)) * (1 + 0.1 * (P.lvl - 1));
  const dm = (1 + 0.2 * (r - 1)) * S.lvlMult * (1 + S.minionPct) * (s.c === P.cls ? 1.25 : 1);
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
  if (el === 'pois' && !o.direct) { t.pois = Math.max(t.pois, dmg / 2); t.poisT = 2; t.poisSrc = src; return; }
  if (dmg > 0 && (el === 'phys' || Math.random() < 0.4)) blood(t, 4);
  t.hp -= dmg;
  if (t.hp <= 0) kill(t);
}

function kill(e) {
  if (e.dead) return;
  e.dead = true;
  blood(e, 14);
  if (e.player) { G.dead = 3; P.gold = Math.floor(P.gold * 0.9); save(); return; }
  if (e.team !== 'e') return;
  if (!['wisp', 'hammer', 'trap'].includes(e.look.rig)) G.corpses.push({ x: e.x, y: e.y, r: e.r, look: e.look, face: e.face, h: figH(e), t: 40 });
  gainXp(e.xp); drop(e);
  if (e === G.boss) { G.boss = null; msg(`${e.nm} wurde besiegt! Das Portal ist offen.`, '#c7b377'); }
}

function gainXp(v) {
  P.xp += v;
  while (P.xp >= xpNext(P.lvl)) {
    P.xp -= xpNext(P.lvl); P.lvl++; P.statPts += 5; P.skillPts++;
    S = calc(); G.player.hp = S.maxhp; G.player.mp = S.maxmp;
    emit(G.player.x, G.player.y, 0, 'phys', 40, 30, { vz: rnd(60, 160), col: '#ffd860', life: 1.2 });
    msg(`Stufe ${P.lvl} erreicht`, '#c7b377');
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
      if (s.aoe) foes(p).forEach(e => e !== tg && dist(e, tg) < s.aoe + e.r && hit(p, e, dmg() * 0.7, el, { kb: s.kb }));
      if (s.self) p.hp = Math.max(1, p.hp - S.maxhp * s.self);
      return;
    }
    case 'proj': {
      const k = s.k || 1;
      for (let i = 0; i < k; i++) shoot(p, a + (k > 1 ? (i / (k - 1) - 0.5) * s.sp : 0), {
        dmg: dmg(), el, v: s.v || 500, pr: (s.pr || 0) + (s.wm ? S.pierce : 0), ex: s.ex, hm: s.hm, kb: s.kb, st: s.st,
        life: s.life, sz: s.sz, spiral: s.spiral, shards: s.shards, leech: s.leech, ae: s.wm ? S.ae : null, arrow: s.wm ? 1 : 0,
      });
      return;
    }
    case 'nova': {
      fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.r, col: EL[el][1], life: 0.4 });
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
      G.areas.push({ x, y, r: s.r, el, dmg: s.d ? dmg() : 0, deb: s.deb, t: s.delay || 0, delay: s.delay || 0, ticks: s.ticks || 1, iv: s.iv || 0, burn: s.burn, src: p, meteor: s.id === 'meteor' });
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
      G.shield = s.amt * (1 + 0.3 * (r - 1)) * S.lvlMult;
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
  const swing = e => { hit(p, e, skillDmg(s, d.r), s.el || 'phys', { st: s.st, kb: s.spin ? 0 : 40 }); S.ae.forEach(([ae, v]) => hit(p, e, v * S.lvlMult, ae)); };
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
const burst = q => { for (let i = 0; i < 10; i++) shoot({ x: q.x, y: q.y, r: 0, team: q.team }, i * Math.PI / 5, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45, sz: 3 }); };

function projectiles(dt) {
  for (const q of G.projs) {
    if (q.dead) continue;
    q.life -= dt;
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
      if (!walk(q.x, q.y)) { if (q.ex) explode(q); if (q.shards) burst(q); q.dead = true; continue; }
    }
    if (!q.arrow || q.el !== 'phys') emit(q.x, q.y, 26, q.el === 'phys' ? 'mag' : q.el, q.el === 'fire' ? 2 : 1, 8, { life: 0.35 });
    if (q.shards) {
      if ((q.sT = (q.sT || 0) - dt) <= 0) { q.sT = 0.07; q.sa = (q.sa || 0) + 2.4; shoot({ x: q.x, y: q.y, r: 0, team: q.team }, q.sa, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45, sz: 3 }); }
      if (q.life <= 0) { burst(q); q.dead = true; }
      continue;
    }
    for (const e of G.ents) {
      if (e.team === q.team || e.dead || e.noTarget || q.hitSet.has(e) || dist(e, q) >= e.r + q.sz) continue;
      q.hitSet.add(e);
      if (q.ex) { explode(q); q.dead = true; break; }
      hit(q.src, e, q.dmg, q.el, { kb: q.kb, st: q.st, leech: q.leech });
      q.ae?.forEach(([el, d]) => hit(q.src, e, d * S.lvlMult, el));
      if (q.el !== 'phys') emit(q.x, q.y, 26, q.el, 8, 30);
      if (--q.pr < 0) { q.dead = true; break; }
    }
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
      }
    }
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
  e.slow -= dt; e.fear -= dt; e.st -= dt; e.movT -= dt;
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
    if (l.k === 'gold') { P.gold += l.n; return false; }
    if (l.k === 'item') {
      if (P.bag.length >= 30) { note('Kein Platz im Inventar'); return true; }
      P.bag.push(l.it); return false;
    }
    if (P.pots[l.k] >= 10) return true;
    P.pots[l.k]++; return false;
  });
}

function potion(k) {
  if (!P.pots[k]) return note(k === 'hp' ? 'Keine Heiltränke' : 'Keine Manatränke');
  P.pots[k]--;
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
    } else if (pathMove(p, o.x, o.y, dt)) p.order = null;
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
  G.hover = hoverEnt();

  status(p, dt);
  if (p.dead) return;
  p.atkT -= dt;
  if (p.dash) dashStep(p, dt); else control(p, dt);
  for (const e of G.ents) if (!e.player && !e.dead) think(e, dt);
  separate();
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
  if (dist(p, G.stairs) < 28) {
    if (G.boss) note(`${G.boss.nm} versiegelt das Portal`);
    else { P.depth++; genLevel(); save(); }
  }
  if ((G.saveT -= dt) <= 0) { G.saveT = 15; save(); }
}

function respawn() {
  genLevel();
  const p = G.player;
  p.hp = S.maxhp; p.mp = S.maxmp; p.pois = 0;
  msg('Du bist wiederauferstanden (–10 % Gold)', '#ff6060');
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
    ctx.setTransform(Z, Z / 2, 0, 1, dx, dy);
    ctx.fillStyle = pat; ctx.fillRect(0, -h, T, h);
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = g; ctx.fillRect(0, -h, T, h);
  }
  if (m[ty * MW + tx + 1]) {
    const [bx, by] = proj(x0 + T, y0);
    ctx.setTransform(-Z, Z / 2, 0, 1, bx, by);
    ctx.fillStyle = pat; ctx.fillRect(0, -h, T, h);
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
    ctx.fillStyle = g; ctx.fillRect(0, -h, T, h);
  }
  ctx.setTransform(Z, Z / 2, -Z, Z / 2, cam.x, cam.y - h);
  ctx.fillStyle = pat; ctx.fillRect(x0, y0, T, T);
  ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(x0, y0, T, T);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1 / Z; ctx.strokeRect(x0, y0, T, T);
  scrT();
  if (wl === 'tree' && hash(tx, ty) % 3 === 0) {
    const [sx, sy] = proj(x0 + T / 2, y0 + T / 2), k = 1 + (hash(tx, ty) % 5) * 0.08;
    ctx.fillStyle = '#2a1c10'; ctx.fillRect(sx - 4, sy - 70 * k, 8, 70 * k);
    for (const [ox, oy, r, c] of [[0, -96, 40, '#18200f'], [-20, -84, 28, '#202a14'], [22, -86, 30, '#1c2612'], [-6, -112, 26, '#26321a'], [8, -102, 20, '#2e3c1e']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + ox * k, sy + oy * k, r * k, 0, 7); ctx.fill();
    }
  }
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

function drawEnt(e) {
  const [sx, sy] = proj(e.x, e.y), fx2 = Math.cos(e.face) - Math.sin(e.face), fy = (Math.cos(e.face) + Math.sin(e.face)) / 2, h = figH(e);
  if (e.kind === 'unique' || e.kind === 'boss') { ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, sx, sy - h * 0.5, h * 0.7, e.kind === 'boss' ? '#5a1408' : '#3a3010'); ctx.globalCompositeOperation = 'source-over'; }
  drawFigure(ctx, sx, sy, e.look, { h, fx: fx2 >= 0 ? 1 : -1, back: fy < 0 && Math.abs(fy) > Math.abs(fx2) * 0.3, walk: e.walk, moving: e.movT > 0, atk: e.atkA || 0, t: G.t + e.seed, alpha: e.conv ? 0.85 : 1 });
  ctx.globalCompositeOperation = 'lighter';
  if (e.slow > 0) glowDot(ctx, sx, sy - h * 0.5, h * 0.45, '#2a5a90');
  if (e.pois > 0) glowDot(ctx, sx, sy - h * 0.5, h * 0.4, '#2a6a10');
  if (e.amp > 1) glowDot(ctx, sx, sy - h - 6, 9, '#c02020');
  if (e.conv) glowDot(ctx, sx, sy - h * 0.5, h * 0.4, '#105a10');
  if (e.player && G.shield > 0) { ctx.strokeStyle = 'rgba(120,180,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy - h * 0.5, h * 0.42, h * 0.6, 0, 0, 7); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
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
  for (const b of Object.values(G.buffs)) if (b.s.pulse || /Aura/.test(b.s.nm)) {
    const c = b.s.pulse?.heal ? '#60a0ff' : b.s.pulse?.amp ? '#c040c0' : b.s.pulse ? EL[b.s.pulse.el][1] : '#ff5030';
    ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = G.t * 1.5 + i * 1.047; ctx.beginPath(); ctx.arc(p.x, p.y, 34, a, a + 0.6); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  for (const f of G.fx) if (f.k === 'ring') {
    const k = f.t / f.life;
    ctx.globalAlpha = (1 - k) * (f.a || 1); ctx.strokeStyle = f.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0, f.r0 + (f.r1 - f.r0) * k), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const e of G.ents) if (!e.dead && !['wisp', 'hammer', 'bird'].includes(e.look.rig)) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.05, 0, 7); ctx.fill(); }
  scrT();
  // Portal zur nächsten Ebene
  const [px0, py0] = proj(G.stairs.x, G.stairs.y), open = !G.boss;
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, px0, py0 - 40, 60, open ? '#2050c0' : '#601010');
  ctx.strokeStyle = open ? '#80b0ff' : '#a03030'; ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + i * 0.15; ctx.beginPath(); ctx.ellipse(px0, py0 - 40, 18 - i * 4, 40 - i * 9, 0, G.t * (2 + i), G.t * (2 + i) + 5); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // Leichen und Beute
  for (const c of G.corpses) { const [sx, sy] = proj(c.x, c.y); drawFigure(ctx, sx, sy, c.look, { h: c.h, fx: Math.cos(c.face) - Math.sin(c.face) >= 0 ? 1 : -1, walk: 0, atk: 0, t: 0, lying: 1, alpha: Math.min(1, c.t / 5) }); }
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
  for (const e of G.ents) if (!e.dead) list.push({ d: e.x + e.y, e });
  list.sort((a, b) => a.d - b.d);
  for (const it of list) {
    if (it.e) { drawEnt(it.e); continue; }
    const [wx, wy] = proj((it.tx + 0.5) * T, (it.ty + 0.5) * T);
    drawWall(it.tx, it.ty, it.d > pd + 10 && Math.abs(wx - ppx) < 150 && wy > ppy - 50 && wy < ppy + 170 ? 0.3 : 1);
  }
  // Geschosse, Partikel, Blitze
  ctx.globalCompositeOperation = 'lighter';
  for (const q of G.projs) {
    const [sx, sy0] = proj(q.x, q.y), sy = sy0 - 26, c = EL[q.el][1];
    if (q.arrow) {
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
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  lamp(ppx, ppy - 30, 420, 1);
  for (const t of G.torches) { const [sx, sy] = proj(t.x, t.y); lamp(sx, sy - 60, 210 + Math.sin(G.t * 13 + t.tx) * 12, 0.85); }
  for (const q of G.projs) { const [sx, sy] = proj(q.x, q.y); if (!q.arrow) lamp(sx, sy - 26, q.el === 'fire' ? 150 : 90, 0.7); }
  for (const a of G.areas) if (a.dmg && a.el !== 'pois') { const [sx, sy] = proj(a.x, a.y); lamp(sx, sy, a.r * Z * 1.6, 0.6); }
  for (const f of G.fx) if (f.k === 'bolt') { const [sx, sy] = proj(f.b.x, f.b.y); lamp(sx, sy - 30, 220, 0.8 * (1 - f.t / f.life)); }
  lamp(px0, py0 - 40, 160, open ? 0.7 : 0.4);
  ctx.drawImage(light, 0, 0);

  // Bodenbeschriftungen wie mit gedrückter Alt-Taste
  ctx.font = '600 14px "Crimson Text", Georgia, serif'; ctx.textAlign = 'center';
  G.labels = [];
  for (const l of [...G.loot].sort((a, b) => (a.x + a.y) - (b.x + b.y))) {
    const s = l.k === 'gold' ? `${l.n} Gold` : l.k === 'item' ? l.it.nm : l.k === 'hp' ? 'Heiltrank' : 'Manatrank';
    const [sx, sy] = proj(l.x, l.y), w = ctx.measureText(s).width + 10;
    let y = sy - 34;
    while (G.labels.some(r => Math.abs(r.x - sx) < (r.w + w) / 2 && Math.abs(r.y - y) < 17)) y -= 17;
    G.labels.push({ x: sx, y, w, l });
    const hov = Math.abs(mouse.x - sx) < w / 2 && Math.abs(mouse.y - y) < 8;
    ctx.fillStyle = hov ? 'rgba(40,40,90,.85)' : 'rgba(0,0,0,.7)'; ctx.fillRect(sx - w / 2, y - 8, w, 16);
    ctx.fillStyle = l.k === 'gold' ? '#e0e0e0' : l.k === 'item' ? RAR[l.it.rar][1] : '#e0e0e0'; ctx.fillText(s, sx, y + 5);
  }
  for (const t of G.texts) { const [sx, sy] = proj(t.x, t.y); ctx.globalAlpha = 1 - t.t / 1.2; ctx.fillStyle = t.col; ctx.fillText(t.s, sx, sy - t.h - 10 - t.t * 20); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  if (mapOn) automap();
  if (G.dead > 0) {
    ctx.fillStyle = 'rgba(60,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c02020'; ctx.textAlign = 'center'; ctx.font = '700 44px Cinzel, serif';
    ctx.fillText('Du bist gestorben', W / 2, H * 0.4); ctx.textAlign = 'left';
  }
}

const IMG = {};
function icon(src) { if (!IMG[src]) { IMG[src] = new Image(); IMG[src].src = src; } return IMG[src]; }

function automap() {
  const p = G.player, zm = 0.32, ox = W / 2 - (p.x - p.y) * zm, oy = H * 0.45 - (p.x + p.y) * zm / 2;
  ctx.setTransform(zm, zm / 2, -zm, zm / 2, ox, oy);
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
  if (G.seen[tileOf(G.stairs)]) { ctx.fillStyle = '#4080ff'; ctx.fillRect(G.stairs.x - 20, G.stairs.y - 20, 40, 40); }
  for (const e of G.ents) if (e.minion) { ctx.fillStyle = '#40d040'; ctx.fillRect(e.x - 8, e.y - 8, 16, 16); }
  ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 6 / zm; ctx.beginPath();
  ctx.moveTo(p.x - 40, p.y); ctx.lineTo(p.x + 40, p.y); ctx.moveTo(p.x, p.y - 40); ctx.lineTo(p.x, p.y + 40); ctx.stroke();
  scrT();
}

// ---------- HUD ----------
const el = {
  lifeLiq: $('.life .liq'), lifeTxt: $('.life span'), manaLiq: $('.mana .liq'), manaTxt: $('.mana span'), xp: $('#xp i'),
  skL: $('#skL'), skR: $('#skR'), hot: $('#hot'), belt: $('#belt'), area: $('#area'), target: $('#target'), msg: $('#msg'), note: $('#note'),
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
  setHTML(el.area, `${G.area[0]}<small>Ebene ${G.depth}</small>`);
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
    <div>${TYPES[s.t]} · benötigt Stufe ${s.q}</div>
    ${r ? `<div class="w">Aktueller Rang: ${r}</div>${desc(s, r).map(x => `<div>${x}</div>`).join('')}` : ''}
    ${s.c !== 'base' && (P.ranks[s.id] || 0) < (s.max || 20) ? `<div class="w">${r ? 'Nächster Rang' : 'Rang 1'}</div>${desc(s, r + 1).map(x => `<div>${x}</div>`).join('')}` : ''}
    ${s.mp ? `<div class="b">Manakosten: ${Math.round((s.mp) * (1 + 0.08 * (Math.max(1, r) - 1)))}</div>` : ''}
    ${s.t !== 'passive' && r ? '<div class="g">F1–F8 drücken, um die Fähigkeit auf eine Schnelltaste zu legen</div>' : ''}`;
}
function itemTip(it, worn) {
  const lines = [it.rar ? it.base : '', it.min ? `Schaden: ${it.min} bis ${it.max}` : '', it.def ? `Verteidigung: ${it.def}` : ''].filter(Boolean);
  return `<b style="color:${RAR[it.rar][1]}">${esc(it.nm)}</b>${lines.map(l => `<div class="w">${l}</div>`).join('')}${Object.entries(it.mods).map(([k, v]) => `<div class="b">${AFF[k][2].replace('{v}', v)}</div>`).join('')}
    <div class="g">${worn ? 'Klick: ablegen' : `Klick: anlegen · Rechtsklick: verkaufen (${it.val} Gold)`}</div>`;
}
document.addEventListener('mousemove', e => {
  const n = e.target.closest?.('[data-skill],[data-bag],[data-eqslot],[data-tip]');
  let h = '';
  if (n && G) {
    if (n.dataset.skill) h = skillTip(n.dataset.skill);
    else if (n.dataset.bag) h = itemTip(P.bag[+n.dataset.bag]);
    else if (n.dataset.eqslot && P.eq[n.dataset.eqslot]) h = itemTip(P.eq[n.dataset.eqslot], 1);
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
  return `<header><h2>Fähigkeiten</h2><div class="pts">Verbleibende Fähigkeitspunkte <b>${P.skillPts}</b></div><button class="x" data-act="close">✕</button></header>
    <div class="tree"><div class="skgrid">${list.map(s => {
      const r = rank(s.id), lock = P.lvl < s.q, i = hk(s.id);
      return `<div class="sk ${r ? 'on' : ''} ${lock ? 'lock' : ''} ${s.c === P.cls ? 'own' : ''}" data-skill="${s.id}" data-up="${s.id}">
        <img src="${skillIcon(s)}" alt=""><b class="rk">${r || ''}</b>${i >= 0 ? `<em>F${i + 1}</em>` : ''}<span>${s.nm}</span></div>`;
    }).join('') || '<p class="hint">Keine Fähigkeit gefunden.</p>'}</div>
    <div class="tabs"><input id="sksearch" placeholder="Suchen…" value="${esc(search)}">${tabs.map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}</div></div>
    <p class="hint">Klick: Rang erhöhen · Maus über eine gelernte Fähigkeit + F1–F8: Schnelltaste · Links-/Rechtsklick-Fähigkeit wählst du über die Felder neben den Kugeln.</p>`;
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
    <div class="menu"><button data-act="close">Spiel fortsetzen</button><button data-act="menu">Speichern und zum Hauptmenü</button></div>
    <table class="keys">${[['Linksklick', 'Laufen / mit linker Fähigkeit angreifen'], ['Umschalt + Linksklick', 'Angreifen ohne zu laufen'], ['Rechtsklick', 'Rechte Fähigkeit'], ['F1–F8 / Mausrad', 'Rechte Fähigkeit wechseln'], ['1–4 (Q/E)', 'Tränke aus dem Gürtel'], ['WASD', 'Alternativ laufen'], ['C · I · T', 'Charakter · Inventar · Fähigkeiten'], ['Tab', 'Automap']].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
}

const PANELS = { skills: renderSkills, char: renderChar, inv: renderInv, menu: renderMenu };
const renderPanel = () => { const n = $('#panel'); n.className = 'pn-' + panel; n.innerHTML = PANELS[panel](); };
function openPanel(n) { closePopup(); panel = n; mouse.l = mouse.r = false; $('#panel').hidden = false; S = calc(); renderPanel(); }
function closePanel() { panel = null; $('#panel').hidden = true; el.tip.hidden = true; save(); }
const toggle = n => panel === n ? closePanel() : openPanel(n);

function learn(id) {
  const s = SK[id];
  if (P.skillPts <= 0 || P.lvl < s.q || (P.ranks[id] || 0) >= (s.max || 20) || s.c === 'base') return;
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
  const b = e.target.closest('[data-act],[data-filter],[data-up],[data-stat],[data-bag],[data-eqslot],[data-buy]');
  if (!b) return;
  const d = b.dataset;
  if (d.act === 'close') return closePanel();
  if (d.act === 'menu') { save(); return showSelect(); }
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
    ${saved ? `<button class="big" data-act="continue">Fortsetzen · ${esc(saved.name)}, Stufe ${saved.lvl} ${CL[saved.cls].nm} · Ebene ${saved.depth}</button>` : ''}
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
  if (P.skillPts) setTimeout(() => note(`${P.skillPts} Fähigkeitspunkte verfügbar (T)`), 1500);
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
  const lab = G.labels.find(r => Math.abs(mouse.x - r.x) < r.w / 2 && Math.abs(mouse.y - r.y) < 8);
  if (lab) { mouse.mode = null; G.player.order = { x: lab.l.x, y: lab.l.y }; }
  else if (G.hover || e.shiftKey) { mouse.mode = 'attack'; mouse.target = G.hover; }
  else mouse.mode = 'move';
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
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
