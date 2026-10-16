'use strict';
const $ = s => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
addEventListener('resize', resize); resize();

const T = 40, MW = 70, MH = 70, SAVE = 'sanctuary-champions-v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const adiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const esc = s => String(s).replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`);
const SK = Object.fromEntries(SKILLS.map(s => [s.id, s]));
const CL = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const AFF = Object.fromEntries(AFFIXES.map(a => [a[0], a]));
AFF.allSkills = ['allSkills', '', '+{v} auf alle Fähigkeiten', 1, 1, 1];
const ELS = Object.keys(EL);
const RAR = [['Normal', '#e8e8e8'], ['Magisch', '#7c7cff'], ['Selten', '#f0e060'], ['Einzigartig', '#c8a060']];
const SLOT_KEYS = ['LMT', 'RMT', '1', '2', '3', '4', '5', '6'];
const TYPES = { melee: 'Nahkampf', proj: 'Geschoss', nova: 'Nova', area: 'Flächenzauber', chain: 'Kettenzauber', summon: 'Beschwörung', buff: 'Verstärkung', shield: 'Schutzschild', teleport: 'Teleport', dash: 'Ansturm', heal: 'Heilung', convert: 'Bekehrung', passive: 'Passiv' };
const MODN = { crit: 'Krit. Chance', dodge: 'Ausweichen', dmgPct: 'Schaden', armor: 'Verteidigung', lifePct: 'Leben', manaPct: 'Mana', speed: 'Laufgeschw.', atkSpd: 'Angriffstempo', res: 'Widerstand', mregen: 'Manaregeneration', regen: 'Leben/Sek.', thorns: 'Dornenschaden', leech: 'Lebensraub', minionPct: 'Diener-Schaden', pierce: 'Durchschlag', fire: 'Feuerschaden', cold: 'Kälteschaden', light: 'Blitzschaden', size: 'Größe' };
const FLAT = ['armor', 'regen', 'thorns', 'pierce', 'size'];
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const xpNext = l => Math.round(120 * l * 1.1 ** (l - 1));
const clsName = id => CL[id]?.nm || GROUPS[id];
const potCost = () => 10 + P.depth * 2;

let P = null, G = null, S = null, panel = null, selSlot = 0, filter = 'all', search = '', chosen = null;
const keys = {}, mouse = { x: 0, y: 0, l: false, r: false };

// ---------- Charakter ----------
function newChar(cid, name) {
  const c = CL[cid], off = id => ['proj', 'melee'].includes(SK[id].t);
  const [a, b] = off(c.start[0]) ? c.start : [c.start[1], c.start[0]];
  const wpn = c.ranged ? 'Kurzbogen' : 'Kurzschwert';
  P = {
    cls: cid, name: name || 'Namenloser Held', lvl: 1, xp: 0, str: c.str, dex: c.dex, vit: c.vit, ene: c.ene, statPts: 0, skillPts: 3,
    ranks: { [a]: 1, [b]: 1 }, slots: [a, b, c.ranged ? 'shoot' : 'attack', null, null, null, null, null],
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
function move(e, dx, dy) {
  let m = false;
  if (free(e.x + dx, e.y, e.r)) { e.x += dx; m = true; }
  if (free(e.x, e.y + dy, e.r)) { e.y += dy; m = true; }
  return m;
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
    map, seen: new Uint8Array(MW * MH), depth: P.depth, area: AREAS[(P.depth - 1) % AREAS.length],
    ents: [], projs: [], fx: [], areas: [], texts: [], loot: [], corpses: [], buffs: old?.buffs || {}, cds: {},
    shield: old?.shield || 0, t: 0, flowT: 0, flow: new Int16Array(MW * MH), saveT: 15, dead: 0,
    stairs: { x: (end.cx + 0.5) * T, y: (end.cy + 0.5) * T }, boss: null,
  };
  const p = old?.player || { r: 14, team: 'p', player: true, hp: 1, mp: 1, atkT: 0, face: 0, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0 };
  Object.assign(p, { x: (start.cx + 0.5) * T, y: (start.cy + 0.5) * T, dash: null, dead: false });
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
  msg(`${G.area[0]} – Ebene ${P.depth}${G.boss ? ` · ${G.boss.nm} erwartet dich!` : ''}`, '#c8a060');
}

const uniqueName = () => `${pick(['Knochen', 'Seuchen', 'Grimm', 'Blut', 'Aschen', 'Schatten'])}${pick(['fang', 'klaue', 'herz', 'brut', 'schlund'])} der ${pick(['Verfluchte', 'Schlächter', 'Hungrige', 'Unheilige', 'Gierige'])}`;

function spawnMon(t, x, y, kind) {
  const d = P.depth, hm = 1.14 ** (d - 1), dm = 1.11 ** (d - 1);
  const k = { champ: [3, 1.5, 3, 1.15], unique: [5, 1.8, 6, 1.3], minion: [1.5, 1.2, 1.5, 1] }[kind] || [1, 1, 1, 1];
  const e = {
    x, y, r: t.r * k[3], team: 'e', kind, col: t.col, rng: t.rng, el: t.el || 'phys', undead: t.undead, nova: t.nova, novaT: 3,
    nm: kind === 'champ' ? `${t.nm} (Champion)` : kind === 'unique' ? uniqueName() : t.nm,
    hp: t.hp * hm * k[0], d: t.d * dm * k[1], xp: Math.round(t.xp * 1.12 ** (d - 1) * k[2]), v: t.v * (kind === 'champ' ? 1.2 : 1),
    atkT: rnd(0.3, 1.2), awake: false, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0, face: 0,
  };
  e.maxhp = e.hp; G.ents.push(e); return e;
}

function spawnMinion(s, r, x, y) {
  const m = MINIONS[s.m], hm = (1 + 0.15 * (r - 1)) * (1 + 0.1 * (P.lvl - 1));
  const dm = (1 + 0.2 * (r - 1)) * S.lvlMult * (1 + S.minionPct) * (s.c === P.cls ? 1.25 : 1);
  G.ents.push({
    x, y, r: m.r, team: 'p', nm: m.nm, col: m.col, hp: m.hp * hm, maxhp: m.hp * hm, d: m.d * dm, v: m.v, el: m.el || 'phys',
    rng: m.rng ? { el: m.el, v: 420 } : null, minion: true, sid: s.id, life: s.dur, noTarget: m.v === 0,
    atkT: 0, st: 0, slow: 0, fear: 0, amp: 1, ampT: 0, pois: 0, poisT: 0, face: 0,
  });
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
    if (n0 >= 0) { tx = (n0 % MW + 0.5) * T; ty = (((n0 / MW) | 0) + 0.5) * T; }
  }
  const a = Math.atan2(ty - e.y, tx - e.x);
  e.face = a;
  move(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
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
  let crit = false;
  if (t.player) {
    if (Math.random() < S.dodge) return text(t, 'Ausgewichen', '#aaa');
    dmg *= el === 'phys' ? 1 - S.dr : 1 - S.res;
    if (G.shield > 0) { const a = Math.min(G.shield, dmg); G.shield -= a; dmg -= a; }
    if (o.melee && S.thorns && src && !src.dead) hit(t, src, S.thorns * S.lvlMult);
  } else {
    if (src?.player && Math.random() < S.crit) { dmg *= 2; crit = true; }
    dmg *= t.amp;
    if (t.team === 'e') wake(t);
  }
  const boss = t.kind === 'boss';
  if (o.st) t.st = Math.max(t.st, o.st * (boss ? 0.3 : 1));
  if (o.kb && !boss && src) { const a = Math.atan2(t.y - src.y, t.x - src.x); for (let i = 0; i < o.kb; i += 10) move(t, Math.cos(a) * 10, Math.sin(a) * 10); }
  if (el === 'cold') t.slow = Math.max(t.slow, 2);
  if (src?.player) { const h = dmg * (S.leech + (o.leech || 0)); if (h) src.hp = Math.min(S.maxhp, src.hp + h); }
  if (el === 'pois' && !o.direct) {
    t.pois = Math.max(t.pois, dmg / 2); t.poisT = 2; t.poisSrc = src;
    return text(t, Math.round(dmg), t.player ? '#ff5050' : EL.pois[1]);
  }
  t.hp -= dmg;
  text(t, Math.round(dmg) + (crit ? '!' : ''), t.player ? '#ff5050' : crit ? '#ffd040' : EL[el][1], crit);
  if (t.hp <= 0) kill(t, src);
}

function kill(e) {
  if (e.dead) return;
  e.dead = true;
  if (e.player) { G.dead = 3; P.gold = Math.floor(P.gold * 0.9); save(); return; }
  if (e.team !== 'e') return;
  G.corpses.push({ x: e.x, y: e.y, r: e.r, t: 40 });
  gainXp(e.xp); drop(e);
  if (e === G.boss) { G.boss = null; msg(`${e.nm} wurde besiegt! Der Weg nach unten ist frei.`, '#c8a060'); }
}

function gainXp(v) {
  P.xp += v;
  while (P.xp >= xpNext(P.lvl)) {
    P.xp -= xpNext(P.lvl); P.lvl++; P.statPts += 5; P.skillPts++;
    S = calc(); G.player.hp = S.maxhp; G.player.mp = S.maxmp;
    fx({ k: 'ring', x: G.player.x, y: G.player.y, r0: 10, r1: 120, col: '#ffd040', life: 0.8 });
    msg(`Stufe ${P.lvl} erreicht! +5 Attributpunkte, +1 Fähigkeitspunkt`, '#ffd040');
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
  q.vx = Math.cos(ang) * q.v; q.vy = Math.sin(ang) * q.v;
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
      fx({ k: 'swing', x: p.x, y: p.y, a, r: reach, col: EL[el][1], life: 0.18 });
      if (!tg) return 'miss';
      for (let i = 0; i < (s.hits || 1); i++) { hit(p, tg, dmg(), el, { st: s.st, kb: s.kb, melee: 1 }); extras(tg); }
      if (s.aoe) foes(p).forEach(e => e !== tg && dist(e, tg) < s.aoe + e.r && hit(p, e, dmg() * 0.7, el, { kb: s.kb }));
      if (s.self) p.hp = Math.max(1, p.hp - S.maxhp * s.self);
      return;
    }
    case 'proj': {
      const k = s.k || 1;
      for (let i = 0; i < k; i++) shoot(p, a + (k > 1 ? (i / (k - 1) - 0.5) * s.sp : 0), {
        dmg: dmg(), el, v: s.v || 500, pr: (s.pr || 0) + (s.wm ? S.pierce : 0), ex: s.ex, hm: s.hm, kb: s.kb, st: s.st,
        life: s.life, sz: s.sz, spiral: s.spiral, shards: s.shards, leech: s.leech, ae: s.wm ? S.ae : null,
      });
      return;
    }
    case 'nova': {
      fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.r, col: EL[el][1], life: 0.4 });
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
      }
      G.areas.push({ x, y, r: s.r, el, dmg: s.d ? dmg() : 0, deb: s.deb, t: s.delay || 0, delay: s.delay || 0, ticks: s.ticks || 1, iv: s.iv || 0, burn: s.burn, src: p });
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
      fx({ k: 'ring', x: p.x, y: p.y, r0: 40, r1: 10, col: '#ffd040', life: 0.4 });
      return note(s.nm);
    case 'shield':
      G.shield = s.amt * (1 + 0.3 * (r - 1)) * S.lvlMult;
      return fx({ k: 'ring', x: p.x, y: p.y, r0: 50, r1: 20, col: '#80c8ff', life: 0.4 });
    case 'heal': {
      const v = s.amt * (1 + 0.15 * (r - 1));
      p.hp = Math.min(S.maxhp, p.hp + S.maxhp * v);
      G.ents.forEach(e => e.minion && dist(e, p) < 300 && (e.hp = Math.min(e.maxhp, e.hp + e.maxhp * v)));
      return fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: 90, col: '#80ff90', life: 0.5 });
    }
    case 'teleport': {
      for (let f = Math.min(s.rng, Math.hypot(tx - p.x, ty - p.y)); f > 0; f -= 10) {
        const x = p.x + Math.cos(a) * f, y = p.y + Math.sin(a) * f;
        if (!free(x, y, p.r)) continue;
        fx({ k: 'ring', x: p.x, y: p.y, r0: 30, r1: 0, col: '#b090ff', life: 0.3 });
        p.x = x; p.y = y;
        return fx({ k: 'ring', x, y, r0: 0, r1: 40, col: '#b090ff', life: 0.3 });
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
      text(e, 'Bekehrt!', '#80ff90');
      return fx({ k: 'ring', x: e.x, y: e.y, r0: 40, r1: 10, col: '#80ff90', life: 0.4 });
    }
  }
  return false;
}

function cast(i) {
  const p = G.player, id = P.slots[i];
  if (!id || p.atkT > 0) return;
  const s = SK[id], r = rank(id);
  if (!r || s.t === 'passive' || G.cds[id] > 0) return;
  const cost = (s.mp || 0) * (1 + 0.08 * (r - 1));
  if (p.mp < cost) return note('Nicht genug Mana');
  const w = world(), res = useSkill(s, r, w.x, w.y);
  p.atkT = S.atkIv;
  if (res === false || res === 'miss') return;
  p.mp -= cost;
  if (s.cd) G.cds[id] = s.cd;
}

function pulse(b) {
  const p = G.player, pl = b.s.pulse, m = 1 + 0.2 * (b.r - 1);
  fx({ k: 'ring', x: p.x, y: p.y, r0: pl.r * 0.7, r1: pl.r, col: pl.heal ? '#80ff90' : pl.amp ? '#ff8080' : EL[pl.el][1], life: 0.4, a: 0.35 });
  if (pl.heal) for (const e of G.ents) if (e.team === 'p' && !e.noTarget && dist(e, p) < pl.r) { const mx = e.player ? S.maxhp : e.maxhp; e.hp = Math.min(mx, e.hp + mx * pl.heal * m); }
  for (const e of G.ents) if (e.team === 'e' && !e.dead && dist(e, p) < pl.r + e.r) {
    if (pl.d) hit(p, e, pl.d * (1 + 0.3 * (b.r - 1)) * (1 + S.spellPct) * S.lvlMult * (b.s.c === P.cls ? 1.25 : 1), pl.el);
    if (pl.amp) { e.amp = pl.amp + 0.05 * (b.r - 1); e.ampT = pl.iv + 0.2; }
  }
}

function dashStep(p, dt) {
  const d = p.dash, s = d.s, a = Math.atan2(d.ty - p.y, d.tx - p.x), rem = Math.hypot(d.tx - p.x, d.ty - p.y);
  const step = Math.min(rem, s.v * dt), moved = move(p, Math.cos(a) * step, Math.sin(a) * step);
  const swing = e => { hit(p, e, skillDmg(s, d.r), s.el || 'phys', { st: s.st, kb: s.spin ? 0 : 40 }); S.ae.forEach(([ae, v]) => hit(p, e, v * S.lvlMult, ae)); };
  let end = rem < 6 || (d.t -= dt) <= 0 || !moved;
  if (s.spin) {
    if ((d.spinT -= dt) <= 0) {
      d.spinT = 0.18;
      fx({ k: 'ring', x: p.x, y: p.y, r0: 20, r1: p.r + 40, col: '#d8d0c0', life: 0.18 });
      for (const e of foes(p)) if (dist(p, e) < p.r + e.r + 40) swing(e);
    }
  } else if (!s.land) {
    for (const e of foes(p)) if (!d.hit.has(e) && dist(p, e) < p.r + e.r + 8) { d.hit.add(e); swing(e); end = true; }
  }
  if (!end) return;
  if (s.land) {
    fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: s.land, col: '#d8d0c0', life: 0.35 });
    for (const e of foes(p)) if (dist(p, e) < s.land + e.r) swing(e);
  }
  p.dash = null;
}

function explode(q) {
  fx({ k: 'ring', x: q.x, y: q.y, r0: 5, r1: q.ex, col: EL[q.el][1], life: 0.3 });
  for (const e of G.ents) if (e.team !== q.team && !e.dead && !e.noTarget && dist(e, q) < q.ex + e.r) hit(q.src, e, q.dmg, q.el, { st: q.st });
}
const burst = q => { for (let i = 0; i < 10; i++) shoot({ x: q.x, y: q.y, r: 0, team: q.team }, i * Math.PI / 5, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45 }); };

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
    if (q.shards) {
      if ((q.sT = (q.sT || 0) - dt) <= 0) { q.sT = 0.07; q.sa = (q.sa || 0) + 2.4; shoot({ x: q.x, y: q.y, r: 0, team: q.team }, q.sa, { src: q.src, dmg: q.dmg, el: q.el, v: 420, life: 0.45 }); }
      if (q.life <= 0) { burst(q); q.dead = true; }
      continue;
    }
    for (const e of G.ents) {
      if (e.team === q.team || e.dead || e.noTarget || q.hitSet.has(e) || dist(e, q) >= e.r + q.sz) continue;
      q.hitSet.add(e);
      if (q.ex) { explode(q); q.dead = true; break; }
      hit(q.src, e, q.dmg, q.el, { kb: q.kb, st: q.st, leech: q.leech });
      q.ae?.forEach(([el, d]) => hit(q.src, e, d * S.lvlMult, el));
      if (--q.pr < 0) { q.dead = true; break; }
    }
    if (q.life <= 0 && !q.dead) { if (q.ex) explode(q); q.dead = true; }
  }
}

function areas(dt) {
  const add = [];
  G.areas = G.areas.filter(a => {
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
    fx({ k: 'ring', x: a.x, y: a.y, r0: a.r * 0.5, r1: a.r, col: a.dmg ? EL[a.el][1] : '#c080ff', life: 0.35 });
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
    if (e.hp <= 0) kill(e, e.poisSrc);
  }
  e.slow -= dt; e.fear -= dt; e.st -= dt;
  if ((e.ampT -= dt) <= 0) e.amp = 1;
}

function think(e, dt) {
  status(e, dt);
  if (e.dead) return;
  if (e.life !== undefined && (e.life -= dt) <= 0) {
    if (e.conv) Object.assign(e, { team: 'e', minion: false, conv: false, life: undefined, sid: null });
    else e.dead = true;
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
  if (e.fear > 0) { const a = Math.atan2(e.y - p.y, e.x - p.x); move(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt); return; }
  const d = dist(e, tg);
  e.atkT -= dt;
  if (e.nova && (e.novaT -= dt) <= 0 && d < e.nova.r) {
    e.novaT = e.nova.cd;
    fx({ k: 'ring', x: e.x, y: e.y, r0: 20, r1: e.nova.r, col: EL[e.nova.el][1], life: 0.5 });
    for (const o of foes(e)) if (dist(e, o) < e.nova.r) hit(e, o, e.d * 0.8, e.nova.el);
  }
  if (e.rng) {
    if (d > 280 && spd) seek(e, tg, spd, dt);
    if (d < 420 && e.atkT <= 0) {
      e.atkT = e.team === 'e' ? rnd(1.4, 2) : 0.9;
      e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
      shoot(e, e.face, { dmg: e.d, el: e.rng.el, v: e.rng.v, life: 1.6 });
    }
  } else if (d > e.r + tg.r + 6) { if (spd) seek(e, tg, spd, dt); }
  else if (e.atkT <= 0) {
    e.atkT = e.team === 'e' ? 1.1 : 0.8;
    e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
    fx({ k: 'swing', x: e.x, y: e.y, a: e.face, r: e.r + 16, col: '#c0b8a8', life: 0.15 });
    hit(e, tg, e.d, e.el, { melee: 1 });
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
    if (l.k === 'gold') { P.gold += l.n; text(p, `+${l.n} Gold`, '#e8c860'); return false; }
    if (l.k === 'item') {
      if (P.bag.length >= 30) { note('Rucksack voll (I)'); return true; }
      P.bag.push(l.it); text(p, l.it.nm, RAR[l.it.rar][1]); return false;
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
  fx({ k: 'ring', x: p.x, y: p.y, r0: 30, r1: 5, col: k === 'hp' ? '#ff4040' : '#4060ff', life: 0.35 });
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

  status(p, dt);
  if (p.dead) return;
  if (p.dash) dashStep(p, dt);
  else {
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0), l = Math.hypot(mx, my);
    if (l) { const v = S.spd * (p.slow > 0 ? 0.6 : 1) * dt / l; move(p, mx * v, my * v); }
  }
  const w = world();
  p.face = Math.atan2(w.y - p.y, w.x - p.x);
  p.atkT -= dt;
  if (!p.dash) {
    if (mouse.l) cast(0);
    if (mouse.r) cast(1);
    for (let i = 1; i <= 6; i++) if (keys[i]) cast(i + 1);
  }
  for (const e of G.ents) if (!e.player && !e.dead) think(e, dt);
  separate();
  projectiles(dt);
  areas(dt);
  G.fx = G.fx.filter(f => (f.t += dt) < f.life);
  G.texts = G.texts.filter(t => (t.t += dt) < 0.9);
  G.corpses = G.corpses.filter(c => (c.t -= dt) > 0);
  G.ents = G.ents.filter(e => !e.dead || e.player);
  G.projs = G.projs.filter(q => !q.dead);
  pickup();
  const tx = (p.x / T) | 0, ty = (p.y / T) | 0;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = tx + dx, y = ty + dy;
    if (x >= 0 && y >= 0 && x < MW && y < MH && dx * dx + dy * dy <= 64) G.seen[y * MW + x] = 1;
  }
  if (dist(p, G.stairs) < 28) {
    if (G.boss) note(`${G.boss.nm} versperrt den Abstieg!`);
    else { P.depth++; genLevel(); save(); }
  }
  if ((G.saveT -= dt) <= 0) { G.saveT = 15; save(); }
}

function respawn() {
  genLevel();
  const p = G.player;
  p.hp = S.maxhp; p.mp = S.maxmp; p.pois = 0;
  msg('Du bist wiederauferstanden (–10% Gold).', '#ff8080');
}

// ---------- Darstellung ----------
const world = () => ({ x: mouse.x + Math.round(G.player.x - W / 2), y: mouse.y + Math.round(G.player.y - H / 2) });
function circle(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function text(e, s, col, big) { G.texts.push({ x: e.x + rnd(-8, 8), y: e.y - e.r - 10, s, col, big, t: 0 }); if (G.texts.length > 120) G.texts.shift(); }
function fx(o) {
  o.t = 0;
  if (o.k === 'bolt') {
    o.pts = [];
    for (let i = 0; i <= 7; i++) { const f = i / 7, j = i % 7 ? 12 : 0; o.pts.push([o.a.x + (o.b.x - o.a.x) * f + rnd(-j, j), o.a.y + (o.b.y - o.a.y) * f + rnd(-j, j)]); }
  }
  G.fx.push(o);
}
const nearFloor = (x, y) => DIRS8.some(([dx, dy]) => G.map[(y + dy) * MW + x + dx] === 1 && x + dx >= 0 && x + dx < MW);

function drawEnt(e) {
  const r = e.r, y = e.y - 4;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  if (e.kind === 'boss') circle(e.x, y, r * 1.7, 'rgba(220,40,20,.13)');
  if (e.noTarget) { ctx.globalAlpha = 0.6 + Math.sin(G.t * 8) * 0.3; }
  circle(e.x, y, r, e.player ? CL[P.cls].col : e.col);
  ctx.globalAlpha = 1;
  circle(e.x - r * 0.2, y - r * 0.25, r * 0.45, 'rgba(255,255,255,.12)');
  ctx.lineWidth = e.kind === 'boss' || e.kind === 'unique' ? 3 : 2;
  ctx.strokeStyle = e.player ? '#fff' : e.kind === 'champ' ? '#6a8cff' : e.kind === 'unique' || e.kind === 'boss' ? '#e0b050' : e.team === 'p' ? '#60e060' : '#1a0505';
  ctx.beginPath(); ctx.arc(e.x, y, r, 0, Math.PI * 2); ctx.stroke();
  const f = e.player ? e.face : e.face || 0;
  if (e.player || e.minion) {
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(e.x + Math.cos(f) * r * 0.6, y + Math.sin(f) * r * 0.6); ctx.lineTo(e.x + Math.cos(f) * (r + 12), y + Math.sin(f) * (r + 12)); ctx.stroke();
  }
  for (const s of [-0.45, 0.45]) circle(e.x + Math.cos(f + s) * r * 0.55, y + Math.sin(f + s) * r * 0.55, Math.max(1.5, r * 0.13), e.team === 'e' ? '#ff3020' : '#111');
  if (e.pois > 0) circle(e.x, y, r * 0.5, 'rgba(110,255,80,.35)');
  if (e.slow > 0) { ctx.strokeStyle = 'rgba(130,200,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
  if (e.st > 0) for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * 2.1; circle(e.x + Math.cos(a) * r * 0.8, y - r - 4 + Math.sin(a) * 3, 2.5, '#ffe040'); }
  if (e.fear > 0) { ctx.fillStyle = '#c080ff'; ctx.font = 'bold 14px serif'; ctx.fillText('!', e.x - 2, y - r - 6); }
  if (e.amp > 1) { ctx.strokeStyle = 'rgba(255,60,60,.7)'; ctx.lineWidth = 1; ctx.strokeRect(e.x - r, y - r, r * 2, r * 2); }
  if (e.player && G.shield > 0) { ctx.strokeStyle = 'rgba(120,190,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, y, r + 7, 0, Math.PI * 2); ctx.stroke(); }
  if (!e.player && !e.noTarget && e.hp < e.maxhp) {
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, y - r - 9, r * 2, 4);
    ctx.fillStyle = e.team === 'p' ? '#40c040' : '#c02020'; ctx.fillRect(e.x - r, y - r - 9, r * 2 * Math.max(0, e.hp / e.maxhp), 4);
  }
}

function draw() {
  const p = G.player, ox = Math.round(p.x - W / 2), oy = Math.round(p.y - H / 2), hue = G.area[1];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-ox, -oy);
  const x0 = Math.max(0, ((ox / T) | 0) - 1), y0 = Math.max(0, ((oy / T) | 0) - 1);
  const x1 = Math.min(MW - 1, (((ox + W) / T) | 0) + 1), y1 = Math.min(MH - 1, (((oy + H) / T) | 0) + 1);
  ctx.lineWidth = 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0, px = x * T, py = y * T;
    if (G.map[y * MW + x]) {
      ctx.fillStyle = `hsl(${hue},16%,${10 + (h % 4)}%)`; ctx.fillRect(px, py, T, T);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      if (h % 9 === 0) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + (h % 23), py + (h % 19), 6, 3); }
    } else if (nearFloor(x, y)) {
      ctx.fillStyle = `hsl(${hue},12%,${17 + (h % 3)}%)`; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = `hsl(${hue},14%,27%)`; ctx.fillRect(px, py, T, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
    }
  }
  const st = G.stairs;
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `hsl(${hue},10%,${18 - i * 4}%)`; ctx.fillRect(st.x - 22 + i * 5, st.y - 22 + i * 6, 44 - i * 10, 44 - i * 8); }
  ctx.strokeStyle = G.boss ? '#a03030' : `rgba(220,180,100,${0.5 + Math.sin(G.t * 3) * 0.3})`; ctx.lineWidth = 2; ctx.strokeRect(st.x - 22, st.y - 22, 44, 44);
  for (const c of G.corpses) { ctx.fillStyle = `rgba(60,8,8,${Math.min(0.7, c.t / 10)})`; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 1.2, c.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const l of G.loot) {
    if (l.k === 'gold') circle(l.x, l.y, 5, '#e8c040');
    else if (l.k === 'item') { ctx.fillStyle = RAR[l.it.rar][1]; ctx.fillRect(l.x - 6, l.y - 6, 12, 12); }
    else { circle(l.x, l.y + 2, 5, l.k === 'hp' ? '#d02020' : '#2040d0'); ctx.fillStyle = '#aaa'; ctx.fillRect(l.x - 2, l.y - 7, 4, 5); }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const a of G.areas) {
    const c = EL[a.el][1];
    ctx.globalAlpha = 0.12; circle(a.x, a.y, a.r, c);
    if (a.t > 0 && a.delay) { ctx.globalAlpha = 0.8; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (a.t / a.delay) + 4, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const es = G.ents.filter(e => !e.dead && e.x > ox - 60 && e.x < ox + W + 60 && e.y > oy - 60 && e.y < oy + H + 60).sort((a, b) => a.y - b.y);
  for (const e of es) drawEnt(e);
  ctx.globalCompositeOperation = 'lighter';
  for (const q of G.projs) {
    const c = EL[q.el][1];
    ctx.globalAlpha = 0.25; circle(q.x, q.y, q.sz * 2.4, c);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = c; ctx.lineWidth = q.sz; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - (q.vx || 0) * 0.03, q.y - (q.vy || 0) * 0.03); ctx.stroke();
    ctx.globalAlpha = 1; circle(q.x, q.y, q.sz, c);
  }
  for (const f of G.fx) {
    const k = f.t / f.life;
    ctx.globalAlpha = (1 - k) * (f.a || 1); ctx.strokeStyle = f.col; ctx.lineWidth = 3;
    ctx.beginPath();
    if (f.k === 'ring') ctx.arc(f.x, f.y, Math.max(0, f.r0 + (f.r1 - f.r0) * k), 0, Math.PI * 2);
    else if (f.k === 'swing') ctx.arc(f.x, f.y, f.r, f.a - 0.9, f.a - 0.9 + 1.8 * Math.min(1, k * 2));
    else if (f.k === 'bolt') f.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Licht: Dunkelheit um den Helden
  const g = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, Math.max(W, H) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.save(); ctx.translate(-ox, -oy);
  ctx.textAlign = 'center';
  ctx.font = '600 13px "Crimson Text", Georgia, serif';
  for (const l of G.loot) {
    const s = l.k === 'gold' ? `${l.n} Gold` : l.k === 'item' ? l.it.nm : l.k === 'hp' ? 'Heiltrank' : 'Manatrank';
    const w = ctx.measureText(s).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(l.x - w / 2, l.y - 26, w, 16);
    ctx.fillStyle = l.k === 'gold' ? '#e8c860' : l.k === 'item' ? RAR[l.it.rar][1] : '#e8e8e8'; ctx.fillText(s, l.x, l.y - 14);
  }
  for (const t of G.texts) {
    ctx.globalAlpha = 1 - t.t / 0.9;
    ctx.font = `700 ${t.big ? 18 : 14}px "Crimson Text", Georgia, serif`;
    ctx.fillStyle = '#000'; ctx.fillText(t.s, t.x + 1, t.y - t.t * 40 + 1);
    ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y - t.t * 40);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.textAlign = 'left';

  // Automap
  const s = 2.4, mw = MW * s, mx = W - mw - 14, my = 14;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(mx - 4, my - 4, mw + 8, MH * s + 8);
  ctx.fillStyle = 'rgba(200,180,140,.45)';
  for (let i = 0; i < MW * MH; i++) if (G.seen[i] && G.map[i]) ctx.fillRect(mx + (i % MW) * s, my + ((i / MW) | 0) * s, s, s);
  if (G.seen[tileOf(st)]) { ctx.fillStyle = '#e0b050'; ctx.fillRect(mx + st.x / T * s - 3, my + st.y / T * s - 3, 6, 6); }
  circle(mx + p.x / T * s, my + p.y / T * s, 3, '#ff4040');

  if (G.dead > 0) {
    ctx.fillStyle = 'rgba(80,0,0,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e03030'; ctx.textAlign = 'center'; ctx.font = '700 48px Cinzel, serif';
    ctx.fillText('Du bist gestorben', W / 2, H / 2); ctx.textAlign = 'left';
  }
}

// ---------- HUD ----------
const el = {
  lifeLiq: $('.life .liq'), lifeTxt: $('.life span'), manaLiq: $('.mana .liq'), manaTxt: $('.mana span'),
  xp: $('#xp i'), slots: $('#slots'), sub: $('#sub'), info: $('#info'), target: $('#target'), msg: $('#msg'), note: $('#note'),
};
let slotKey = '', noteT = 0;
function msg(t, col = '#e8e0c8') { el.msg.textContent = t; el.msg.style.color = col; el.msg.classList.remove('show'); void el.msg.offsetWidth; el.msg.classList.add('show'); }
function note(t) {
  if (el.note.textContent === t && performance.now() - noteT < 1200) return;
  noteT = performance.now(); el.note.textContent = t;
  el.note.classList.remove('show'); void el.note.offsetWidth; el.note.classList.add('show');
}
const setText = (node, s) => { if (node.innerHTML !== s) node.innerHTML = s; };

function hud() {
  const p = G.player;
  el.lifeLiq.style.transform = `scaleY(${clamp(p.hp / S.maxhp, 0, 1)})`;
  el.manaLiq.style.transform = `scaleY(${clamp(p.mp / S.maxmp, 0, 1)})`;
  setText(el.lifeTxt, `${Math.max(0, Math.round(p.hp))}/${Math.round(S.maxhp)}`);
  setText(el.manaTxt, `${Math.round(p.mp)}/${Math.round(S.maxmp)}`);
  el.xp.style.width = P.xp / xpNext(P.lvl) * 100 + '%';
  const k = P.slots.join();
  if (k !== slotKey) {
    slotKey = k;
    el.slots.innerHTML = P.slots.map((id, i) => {
      const s = SK[id];
      return `<div class="slot" data-slot="${i}" style="--c:${s ? EL[s.el || 'phys'][1] : '#444'}"><i></i><span>${s ? s.nm : '—'}</span><em>${SLOT_KEYS[i]}</em></div>`;
    }).join('');
  }
  [...el.slots.children].forEach((n, i) => {
    const id = P.slots[i], s = SK[id];
    n.firstChild.style.height = s?.cd && G.cds[id] > 0 ? G.cds[id] / s.cd * 100 + '%' : '0';
    n.classList.toggle('oom', !!s && p.mp < (s.mp || 0) * (1 + 0.08 * (rank(id) - 1)));
  });
  const buffs = Object.values(G.buffs).map(b => `<b>${b.s.nm} ${Math.ceil(b.t)}s</b>`).join('') + (G.shield > 0 ? `<b>Schild ${Math.round(G.shield)}</b>` : '');
  setText(el.info, `<b>${G.area[0]}</b> · Ebene ${G.depth}<br>${esc(P.name)} · Stufe ${P.lvl} ${CL[P.cls].nm}<br><span class="gold">${P.gold} Gold</span><div class="buffs">${buffs}</div>`);
  setText(el.sub, `Q Heiltrank ×${P.pots.hp} · E Manatrank ×${P.pots.mp} · <span class="${P.skillPts ? 'hot' : ''}">K Fähigkeiten${P.skillPts ? ` (${P.skillPts})` : ''}</span> · <span class="${P.statPts ? 'hot' : ''}">C Charakter${P.statPts ? ` (${P.statPts})` : ''}</span> · I Inventar`);
  const w = world(), h = G.ents.find(e => e.team === 'e' && !e.dead && Math.hypot(e.x - w.x, e.y - w.y) < e.r + 8) || (G.boss && dist(G.boss, p) < 500 ? G.boss : null);
  el.target.hidden = !h;
  if (h) {
    setText(el.target.firstChild, esc(h.nm));
    el.target.firstChild.style.color = h.kind === 'champ' ? '#8aa8ff' : h.kind === 'unique' || h.kind === 'boss' ? '#e0b050' : '#e8e0c8';
    el.target.lastChild.firstChild.style.width = Math.max(0, h.hp / h.maxhp) * 100 + '%';
  }
}

// ---------- Panels ----------
function modTxt(k, v) {
  if (k === 'ae') return `+${Math.round(v[1])} ${EL[v[0]][0]}schaden auf Waffenangriffe`;
  return `${v > 0 ? '+' : ''}${FLAT.includes(k) ? Math.round(v * 10) / 10 : Math.round(v * 100) + '%'} ${MODN[k]}`;
}
function desc(s, r) {
  const R = Math.max(1, r), eln = EL[s.el || 'phys'][0], o = [TYPES[s.t]];
  if (s.wm) o.push(`${Math.round(s.wm * (1 + 0.12 * (R - 1)) * 100)}% Waffenschaden`);
  if (s.d) o.push(`${Math.round(s.d * (1 + 0.3 * (R - 1)))} Schaden (${eln})`);
  if (s.pct) o.push(`${s.pct * 100}% des aktuellen Lebens als Schaden (${eln})`);
  if (s.k > 1 && s.t !== 'summon') o.push(`${s.k} Geschosse`);
  if (s.hits > 1) o.push(`${s.hits} Treffer`);
  [['ex', 'explodiert'], ['pr', 'durchschlagend'], ['hm', 'zielsuchend'], ['spiral', 'kreist spiralförmig'], ['shards', 'versprüht Eissplitter'], ['kb', 'Rückstoß'],
    ['aoe', 'Flächenschaden'], ['land', 'Landungsschaden'], ['spin', 'Wirbelangriff'], ['delay', 'verzögerter Einschlag'], ['corpse', 'benötigt eine Leiche']].forEach(([k, t]) => s[k] && o.push(t));
  if (s.st) o.push(`betäubt ${s.st}s`);
  if (s.fear) o.push(`Furcht ${s.fear}s`);
  if (s.leech) o.push(`${s.leech * 100}% Lebensentzug`);
  if (s.self) o.push(`kostet ${s.self * 100}% Leben`);
  if (s.ticks) o.push(`${s.ticks} Wellen`);
  if (s.undead) o.push(`×${s.undead} gegen Untote`);
  if (s.deb) {
    const d = s.deb;
    if (d.amp) o.push(`Ziele erleiden +${Math.round((d.amp - 1) * 100)}% Schaden`);
    if (d.slow) o.push('verlangsamt');
    if (d.stun) o.push(`hält ${d.stun}s fest`);
    if (d.fear) o.push(`Furcht ${d.fear}s`);
  }
  if (s.t === 'summon') o.push(`${MINIONS[s.m].nm}, max. ${s.k + Math.floor(R / 2)}${s.dur ? `, ${s.dur}s` : ''}`);
  if (s.mods) o.push(...Object.entries(s.mods).map(([k, v]) => modTxt(k, k === 'ae' ? [v[0], v[1] * (1 + 0.15 * (R - 1))] : s.t === 'passive' ? v * R : k === 'size' ? v : v * (1 + 0.15 * (R - 1)))));
  if (s.pulse) {
    const p = s.pulse;
    o.push(p.heal ? `heilt alle ${p.iv}s ${Math.round(p.heal * 100 * (1 + 0.2 * (R - 1)))}% Leben` : p.amp ? 'Gegner in der Nähe erleiden mehr Schaden' : `${Math.round(p.d * (1 + 0.3 * (R - 1)))} Schaden (${EL[p.el][0]}) pro Puls`);
  }
  if (s.dur && s.t === 'buff') o.push(`${s.dur}s`);
  if (s.amt) o.push(s.t === 'heal' ? `heilt ${Math.round(s.amt * (1 + 0.15 * (R - 1)) * 100)}% Leben` : `absorbiert ${Math.round(s.amt * (1 + 0.3 * (R - 1)))} Schaden`);
  if (s.rng) o.push(`Reichweite ${s.rng}`);
  if (s.t === 'convert') o.push(s.id === 'convert_undead' ? 'macht einen Untoten zum Verbündeten' : 'macht einen Gegner zum Verbündeten');
  if (s.cd) o.push(`Abklingzeit ${s.cd}s`);
  return o.join(' · ');
}

function itemHtml(it) {
  const base = [it.rar ? it.base : '', it.min ? `Schaden: ${it.min}–${it.max}` : '', it.def ? `Verteidigung: ${it.def}` : ''].filter(Boolean);
  const mods = Object.entries(it.mods).map(([k, v]) => AFF[k][2].replace('{v}', v));
  return `<b style="color:${RAR[it.rar][1]}">${esc(it.nm)}</b>${base.map(l => `<div>${l}</div>`).join('')}${mods.map(l => `<div class="mod">${l}</div>`).join('')}`;
}

function skillCards() {
  const q = search.toLowerCase();
  return SKILLS.filter(s => (filter === 'all' || s.g === filter || s.c === filter || (filter === 'learned' && rank(s.id) > 0)) && (!q || s.nm.toLowerCase().includes(q))).map(s => {
    const r = rank(s.id), base = P.ranks[s.id] || 0, own = s.c === P.cls, lock = P.lvl < s.q, max = s.max || 20;
    const canUp = P.skillPts > 0 && !lock && base < max && s.c !== 'base';
    return `<div class="card ${r ? 'learned' : ''} ${lock ? 'locked' : ''} ${own ? 'own' : ''}" data-skill="${s.id}" style="--c:${EL[s.el || 'phys'][1]}">
      <div class="ct"><b>${s.nm}</b>${canUp ? `<button class="up" data-up="${s.id}" title="Rang erhöhen">+</button>` : ''}</div>
      <small class="tag">${s.g === 'D2' ? 'Diablo II · ' : s.g === 'CRtA' ? 'Champions · ' : ''}${clsName(s.c)}${own ? ' · <em>Klassenbonus</em>' : ''}</small>
      <p>${desc(s, r)}</p>
      <small>Rang <b>${r}</b>${s.c === 'base' ? '' : '/' + max} · ab Stufe ${s.q}${s.mp ? ` · ${s.mp} Mana` : ''}</small></div>`;
  }).join('') || '<p class="hint">Keine Fähigkeit gefunden.</p>';
}

function renderSkills() {
  const chips = [['all', 'Alle'], ['learned', 'Gelernt'], ['D2', 'Diablo II'], ['CRtA', 'Champions'], ...CLASSES.map(c => [c.id, c.nm]), ['crta', GROUPS.crta], ['base', GROUPS.base]];
  return `<header><h2>Fähigkeiten</h2><div class="pts">Fähigkeitspunkte: <b>${P.skillPts}</b></div><button data-act="close">✕</button></header>
    <p class="hint">Taste wählen, dann eine gelernte Fähigkeit anklicken, um sie zu belegen. <b>+</b> lernt bzw. erhöht den Rang. Fähigkeiten deiner Klasse wirken 25 % stärker.</p>
    <div class="slotbar">${P.slots.map((id, i) => `<button class="sb ${i === selSlot ? 'sel' : ''}" data-sel="${i}"><em>${SLOT_KEYS[i]}</em>${id ? SK[id].nm : '—'}</button>`).join('')}</div>
    <div class="chips">${chips.map(([k, n]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}">${n}</button>`).join('')}<input id="sksearch" placeholder="Suchen…" value="${esc(search)}"></div>
    <div id="skgrid" class="grid">${skillCards()}</div>`;
}

function renderChar() {
  const st = [['str', 'Stärke', 'Nahkampf- und Wurfschaden'], ['dex', 'Geschick', 'Fernkampf, Krit, Tempo'], ['vit', 'Vitalität', 'Leben'], ['ene', 'Energie', 'Mana und Zauberschaden']];
  const pct = v => Math.round(v * 100) + '%', c = CL[P.cls];
  const rows = [
    ['Leben', Math.round(S.maxhp)], ['Mana', Math.round(S.maxmp)],
    ['Waffenschaden', `${Math.round(S.wmin * (1 + S.dmgPct) * S.lvlMult)}–${Math.round(S.wmax * (1 + S.dmgPct) * S.lvlMult)}`],
    ['Zauberschaden', '+' + pct(S.spellPct + S.lvlMult - 1)], ['Kritische Treffer', pct(S.crit)], ['Ausweichen', pct(S.dodge)],
    ['Verteidigung', `${Math.round(S.armor)} (–${pct(S.dr)} phys.)`], ['Widerstand (alle)', pct(S.res)], ['Lebensraub', pct(S.leech)],
    ['Lebensregeneration', S.regen.toFixed(1) + '/s'], ['Laufgeschwindigkeit', Math.round(S.spd)], ['Angriffe pro Sekunde', (1 / S.atkIv).toFixed(2)],
  ];
  return `<header><h2>${esc(P.name)} – ${c.nm}</h2><button data-act="close">✕</button></header>
    <div class="cols"><div>
      <p>Stufe <b>${P.lvl}</b> · Erfahrung ${Math.floor(P.xp)} / ${xpNext(P.lvl)}</p>
      <p>Verfügbare Attributpunkte: <b>${P.statPts}</b></p>
      ${st.map(([k, n, h]) => `<div class="stat"><span>${n}</span><b>${P[k]}</b>${Math.round(S[k]) !== P[k] ? `<i>(${Math.round(S[k])})</i>` : ''}${P.statPts ? `<button data-stat="${k}">+</button>` : ''}<small>${h}</small></div>`).join('')}
      <p class="hint">Ursprung: ${c.g === 'D2' ? 'Diablo II: Lord of Destruction' : 'Champions: Return to Arms'}</p>
      <button data-act="menu">Speichern & Hauptmenü</button>
    </div><table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table></div>`;
}

function renderInv() {
  const slots = [['weapon', 'Waffe'], ['helm', 'Helm'], ['armor', 'Rüstung'], ['amulet', 'Amulett'], ['ring', 'Ring']];
  return `<header><h2>Inventar</h2><div class="pts"><span class="gold">${P.gold} Gold</span></div><button data-act="close">✕</button></header>
    <div class="eq">${slots.map(([k, n]) => `<div class="item"><small>${n}</small>${P.eq[k] ? itemHtml(P.eq[k]) + `<button data-un="${k}">Ablegen</button>` : '<i>leer</i>'}</div>`).join('')}</div>
    <div class="row"><button data-buy="hp">Heiltrank kaufen (${potCost()} Gold)</button><button data-buy="mp">Manatrank kaufen (${potCost()} Gold)</button>
      <span>Heiltränke ${P.pots.hp}/10 · Manatränke ${P.pots.mp}/10</span><button data-act="sellall">Alle normalen Gegenstände verkaufen</button></div>
    <h3>Rucksack (${P.bag.length}/30)</h3>
    <div class="grid">${P.bag.map((it, i) => `<div class="item">${itemHtml(it)}<div class="row"><button data-eq="${i}">Anlegen</button><button data-sell="${i}">Verkaufen (${it.val})</button></div></div>`).join('') || '<p class="hint">Leer. Besiege Monster, um Beute zu finden.</p>'}</div>`;
}

const PANELS = { skills: renderSkills, char: renderChar, inv: renderInv };
const renderPanel = () => { $('#panel').innerHTML = PANELS[panel](); };
function openPanel(n) { panel = n; mouse.l = mouse.r = false; $('#panel').hidden = false; S = calc(); renderPanel(); }
function closePanel() { panel = null; $('#panel').hidden = true; save(); }
const toggle = n => panel === n ? closePanel() : openPanel(n);

function learn(id) {
  const s = SK[id];
  if (P.skillPts <= 0 || P.lvl < s.q || (P.ranks[id] || 0) >= (s.max || 20) || s.c === 'base') return;
  const first = !P.ranks[id];
  P.ranks[id] = (P.ranks[id] || 0) + 1; P.skillPts--;
  if (first && s.t !== 'passive') { const i = P.slots.indexOf(null); if (i >= 0) P.slots[i] = id; }
}
function assign(id) {
  if (!rank(id) || SK[id].t === 'passive') return;
  P.slots = P.slots.map(x => x === id ? null : x);
  P.slots[selSlot] = id;
}

$('#panel').addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-sel],[data-filter],[data-up],[data-skill],[data-stat],[data-eq],[data-sell],[data-un],[data-buy]');
  if (!b) return;
  const d = b.dataset;
  if (d.act === 'close') return closePanel();
  if (d.act === 'menu') { save(); return showSelect(); }
  if (d.act === 'sellall') { P.bag = P.bag.filter(it => it.rar || !(P.gold += it.val)); }
  else if (d.sel) selSlot = +d.sel;
  else if (d.filter) filter = d.filter;
  else if (d.up) learn(d.up);
  else if (d.skill) assign(d.skill);
  else if (d.stat && P.statPts > 0) { P[d.stat]++; P.statPts--; }
  else if (d.eq) { const it = P.bag.splice(+d.eq, 1)[0], old = P.eq[it.slot]; P.eq[it.slot] = it; if (old) P.bag.push(old); }
  else if (d.sell) { P.gold += P.bag[+d.sell].val; P.bag.splice(+d.sell, 1); }
  else if (d.un && P.bag.length < 30) { P.bag.push(P.eq[d.un]); delete P.eq[d.un]; }
  else if (d.buy && P.gold >= potCost() && P.pots[d.buy] < 10) { P.gold -= potCost(); P.pots[d.buy]++; }
  S = calc(); renderPanel();
});
$('#panel').addEventListener('input', e => { if (e.target.id === 'sksearch') { search = e.target.value; $('#skgrid').innerHTML = skillCards(); } });
el.slots.addEventListener('click', e => { const s = e.target.closest('[data-slot]'); if (s) { selSlot = +s.dataset.slot; openPanel('skills'); } });

// ---------- Hauptmenü & Spielstand ----------
function save() { if (P) try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch { /* privater Modus */ } }
function loadSave() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE));
    if (!p || !CL[p.cls]) return null;
    for (const id in p.ranks) if (!SK[id]) delete p.ranks[id];
    p.slots = p.slots.map(id => SK[id] ? id : null);
    return p;
  } catch { return null; }
}

function showSelect() {
  G = null; panel = null; chosen = null;
  $('#hud').hidden = true; $('#panel').hidden = true;
  const saved = loadSave(), sel = $('#select');
  sel.hidden = false;
  sel.innerHTML = `<h1>Sanctuary <span>&amp;</span> Norrath</h1>
    <p class="sub">Ein Action-RPG im Geiste von <i>Diablo II: Lord of Destruction</i> und <i>Champions: Return to Arms</i></p>
    ${saved ? `<button class="big" data-act="continue">Fortsetzen: ${esc(saved.name)} – Stufe ${saved.lvl} ${CL[saved.cls].nm} (Ebene ${saved.depth})</button>` : ''}
    <h2>Neuen Helden erschaffen</h2>
    ${['D2', 'CRtA'].map(g => `<h3>${g === 'D2' ? 'Diablo II: Lord of Destruction' : 'Champions: Return to Arms'}</h3>
      <div class="classes">${CLASSES.filter(c => c.g === g).map(c => `<button class="cls" data-cls="${c.id}" style="--c:${c.col}">
        <b>${c.nm}</b><small>STR ${c.str} · GES ${c.dex} · VIT ${c.vit} · ENE ${c.ene}${c.ranged ? ' · Fernkampf' : ''}</small>
        <small>Start: ${c.start.map(id => SK[id].nm).join(', ')}</small></button>`).join('')}</div>`).join('')}
    <div class="row"><input id="cname" maxlength="16" placeholder="Name des Helden"><button class="big" data-act="start" disabled>Abenteuer beginnen</button></div>
    <p class="hint">Jede Klasse kann <b>jede</b> der ${SKILLS.length - 2} Fähigkeiten aus beiden Spielen lernen – stell dir deinen Helden selbst zusammen.
      WASD bewegen · Maus zielen · LMT/RMT und 1–6 Fähigkeiten · Q/E Tränke · K Fähigkeiten · C Charakter · I Inventar</p>`;
}

function startGame() {
  $('#select').hidden = true; $('#hud').hidden = false;
  G = null; slotKey = '';
  genLevel();
  if (P.skillPts) setTimeout(() => note(`Du hast ${P.skillPts} Fähigkeitspunkte – drücke K`), 1500);
}

$('#select').addEventListener('click', e => {
  const b = e.target.closest('[data-cls],[data-act]');
  if (!b) return;
  if (b.dataset.cls) {
    chosen = b.dataset.cls;
    document.querySelectorAll('.cls').forEach(n => n.classList.toggle('on', n === b));
    $('[data-act="start"]').disabled = false;
  } else if (b.dataset.act === 'start' && chosen) { newChar(chosen, $('#cname').value.trim()); save(); startGame(); }
  else if (b.dataset.act === 'continue') { P = loadSave(); startGame(); }
});

// ---------- Eingabe ----------
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'escape' && panel) return closePanel();
  if (e.target.tagName === 'INPUT' || !G) return;
  keys[k] = true;
  if (k === 'k') toggle('skills');
  else if (k === 'c') toggle('char');
  else if (k === 'i') toggle('inv');
  else if (!panel && k === 'q') potion('hp');
  else if (!panel && k === 'e') potion('mp');
  if (k === ' ' || k === 'tab') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
cv.addEventListener('mousedown', e => { if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('contextmenu', e => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G) {
    if (G.dead > 0) { if ((G.dead -= dt) <= 0) respawn(); }
    else if (!panel) update(dt);
    if (G) { draw(); hud(); }
  }
  requestAnimationFrame(frame);
}
showSelect();
requestAnimationFrame(frame);
