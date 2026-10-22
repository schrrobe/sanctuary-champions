'use strict';
// Ferne Oase: dritte Karte nach dem gleichnamigen Gebiet aus Akt 2 von Diablo II: Lord of Destruction. Eine weite Wüste im hellen
// Mittagslicht mit Oasen, Ruinenfeldern, Rastplätzen, Tafelbergen und Dünen, ringsum Felswände. Jeder Held bekommt seine eigene
// Karte (Startwert P.oaSeed), nur die Startoase liegt immer in der Mitte. Der Boden wird wie auf dem Highway der Toten in Kacheln
// gebacken, Hindernisse werden feldweise oder als Bild gezeichnet und mit den Figuren nach Tiefe sortiert (hwBox, hwOff aus highway.js).

const OA_N = 443, OA_C = OA_N >> 1, OA_CAP = 80; // Kantenlänge und Mitte in Feldern, Gegner gleichzeitig samt Brut
const OASE = ['Ferne Oase', 'sand', 'rock', 0.02]; // wie ARENA und HIGHWAY: [Name, Boden, Wände, Dunkelheit]
const OG = { sand: 0, grit: 1, grass: 2, wet: 3, water: 4, flag: 5, hole: 6, pit: 7 }, OGN = Object.keys(OG); // Bodenarten
const OA_SPR = ['palm', 'boulder', 'pillar', 'skel', 'wagon', 'gate']; // als Bild gezeichnet, einmal am letzten Feld
const OA_SC = 8, OA_SN = Math.ceil(OA_N / OA_SC); // Automap: aufgedeckt wird je Zelle aus 8 × 8 Feldern
let OA_MAP = null, OAT = null, OAP = null, oaMask = null, oaPM = null;
const OA_CHUNKS = new Map(), OA_CROWN = []; // gebackene Bodenkacheln der aktuellen Karte, vorgezeichnete Palmenkronen
const oaSeedNew = () => 1 + Date.now() % 2147483646; // Startwert für einen neuen Helden: ganze Zahl ab 1, ohne Math.random

// ---------- Erweiterungspunkte ----------
// Gegnerarten (oase-gegner.js), Endbosse (oase-bosse.js) sowie Objekte, Wegpunkte und Geräusche (oase-objekte.js) hängen sich hier
// ein. Bedeutung genau wie bei HWH in highway.js; aufgerufen werden sie nur auf der Fernen Oase (G.oase), an denselben Stellen.
const OAH = { target: [], act: [], hit: [], kill: [], spawn: [], round: [], props: [], update: [], under: [], sort: [], over: [], light: [], tint: [], pause: [] };
const oaEach = (k, ...a) => { for (const f of OAH[k]) f(...a); };
const oaAny = (k, ...a) => OAH[k].some(f => f(...a));
const oaFirst = (k, ...a) => { for (const f of OAH[k]) { const v = f(...a); if (v !== undefined) return v; } };
const oaChain = (k, v, ...a) => { for (const f of OAH[k]) v = f(v, ...a) ?? v; return v; };
// Feld begehbar und frei von Hindernissen, Teichen und dem Schlund (für Objekte); abgeschlossene Taschen sperrt schon der Kartenbau
const oaFieldFree = (tx, ty) => tx >= 0 && ty >= 0 && tx < OA_N && ty < OA_N && G.map[ty * OA_N + tx] === 1;

// ---------- Kartenaufbau ----------
// welliger Rand eines Teichs oder Schlunds o = { x, y, R, p1, p2 } in Richtung a, in Feldern; derselbe Rand im Bild des Bodens
const oaWob = (o, a) => o.R * (1 + 0.14 * Math.sin(3 * a + o.p1) + 0.09 * Math.sin(5 * a + o.p2));
// Karte zum Startwert. Eigener Zufall, damit das Math.random des Spiels unberührt bleibt. Lagen in Feldern, Feldmitte bei +0,5
function oaGen(seed) {
  const N = OA_N, C = OA_C, A = N * N;
  const map = new Uint8Array(A).fill(1), ob = new Uint16Array(A), gr = new Uint8Array(A), hgt = new Uint16Array(A), lot = new Uint8Array(A), draw = new Uint8Array(A);
  const obs = [null], sites = [], holes = [], doors = [], ponds = [], pits = [], dunes = [], decals = [];
  let sd = hash(seed, 7919) % 2147483646 + 1;
  const r = () => (sd = sd * 16807 % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + r() * (b - a + 1)), rf = (a, b) => a + r() * (b - a);
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const I = (x, y) => y * N + x, inMap = (x, y) => x > 0 && y > 0 && x < N - 1 && y < N - 1;
  const each = (x0, y0, x1, y1, f) => { for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) f(I(x, y), x, y); };
  const disk = (cx, cy, R, f) => each(Math.floor(cx - R), Math.floor(cy - R), Math.floor(cx + R), Math.floor(cy + R), (i, x, y) => { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= R) f(i, x, y, d); });
  const fits = (x0, y0, w, d, free) => { for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) if (!inMap(x, y) || !map[I(x, y)] || (free && lot[I(x, y)])) return false; return true; };
  // Hindernis über w × d Felder wie in highway.js; z: Höhe in Bildpunkten, je Feld über hz(u, v) abwandelbar; free: nicht auf Orten
  function put(k, x0, y0, w, d, o = {}) {
    if (!fits(x0, y0, w, d, o.free)) return null;
    const b = { k, x0, y0, x1: x0 + w - 1, y1: y0 + d - 1, z: 100, seed: ri(0, 9999), spr: OA_SPR.includes(k), d: (x0 + w / 2 + y0 + d / 2) * T, ...o }, id = obs.push(b) - 1;
    each(x0, y0, b.x1, b.y1, (i, x, y) => { map[i] = 0; ob[i] = id; hgt[i] = b.spr ? 0 : b.hz ? b.hz(x - x0, y - y0) : b.z; draw[i] = b.spr ? +(x === b.x1 && y === b.y1) : 1; });
    return b;
  }
  // Fels über beliebige Felder (Felswände, Tafelberge): Höhe in weichen Wellen, je Feld nur wenig unruhig
  function rock(st, z, test, [x0, y0, x1, y1] = [0, 0, N - 1, N - 1]) {
    const id = obs.push({ k: 'rock', st, z, seed: ri(0, 9999) }) - 1;
    each(x0, y0, x1, y1, (i, x, y) => { if (map[i] && test(x, y)) { map[i] = 0; ob[i] = id; draw[i] = 1; hgt[i] = Math.round(z * (0.86 + 0.16 * Math.sin(x * 0.23 + id) * Math.sin(y * 0.19 + id * 1.7) + 0.1 * (uhash(x, y * 3 + id) % 1000) / 1000)); } });
  }

  // ---------- Felswände ringsum, 3 bis 21 Felder dick, mit Felsspalten ----------
  const ph = [rf(0, 6), rf(0, 6), rf(0, 6), rf(0, 6)];
  rock('cliff', 220, (x, y) => { const d = Math.min(x, y, N - 1 - x, N - 1 - y); return d < 22 && (d === 0 || d < 12 + 3 * Math.sin(x * 0.07 + ph[0]) + 3 * Math.sin(y * 0.06 + ph[1]) + 2 * Math.sin((x + y) * 0.13 + ph[2]) + Math.sin((x - y) * 0.21 + ph[3])); });
  // Felsspalte: zwei Felder breite, drei Felder tiefe Kerbe; aus ihrer Tiefe kommen Gegner
  for (let s = 0; s < 4; s++) for (let k = 0; k < 6; k++) {
    const t = Math.round(40 + (k + rf(0.25, 0.75)) * (N - 80) / 6), at = j => s === 0 ? [t, j] : s === 1 ? [t, N - 1 - j] : s === 2 ? [j, t] : [N - 1 - j, t];
    let j = 1;
    while (j < 30 && !map[I(...at(j))]) j++;
    if (j < 5 || j >= 30) continue;
    for (let q = 1; q <= 3; q++) for (let w = 0; w < 2; w++) { const [x, y] = at(j - q), i = s < 2 ? I(x + w, y) : I(x, y + w); map[i] = 1; ob[i] = hgt[i] = draw[i] = 0; gr[i] = OG.grit; }
    const [x, y] = at(j - 3);
    doors.push(I(x, y)); decals.push({ k: 'cleft', x: x + (s < 2 ? 1 : 0.5), y: y + (s < 2 ? 0.5 : 1) });
  }

  // ---------- Orte ----------
  // Oase: Teich hinter dem Platz (zum oberen Bildrand), nasses Ufer, Gras und Palmen ringsum; der Platz (x, y) selbst bleibt frei
  function oasis(k, x, y, n, wp, pr = [0, 2.4, 3.4, 4.6][n]) {
    const R = Math.round(pr * 2 + 5), off = (pr + 2.4) / Math.SQRT2, P = { x: x + 0.5 - off, y: y + 0.5 - off, R: pr, p1: rf(0, 6), p2: rf(0, 6) }, gp = rf(0, 6);
    ponds.push(P);
    disk(x + 0.5, y + 0.5, R + 2, i => { lot[i] = 1; });
    disk(P.x, P.y, pr * 1.25 + 5.5, (i, xx, yy, d) => {
      const a = Math.atan2(yy + 0.5 - P.y, xx + 0.5 - P.x), w = oaWob(P, a);
      if (d < w) { map[i] = 0; gr[i] = OG.water; } else if (d < w + 1.2) gr[i] = OG.wet; else if (d < w + 3 + 1.2 * Math.sin(a * 7 + gp)) gr[i] = OG.grass;
    });
    for (let j = 0, t = 0, np = [0, 5, 8, 11][n] + (k === 'start' ? 5 : 0); j < np && t < np * 10; t++) {
      const a = rf(0, 6.283), d = oaWob(P, a) + rf(1.4, 4.4), px = Math.floor(P.x + Math.cos(a) * d), py = Math.floor(P.y + Math.sin(a) * d);
      if (Math.hypot(px - x, py - y) >= 3 && put('palm', px, py, 1, 1, { z: ri(190, 250) })) j++;
    }
    sites.push({ k, x, y, r: R, n, wp });
  }
  // Ruinenfeld: Pflaster, Mauerreste eines Tempels mit Lücken (vorn immer eine), zwei Säulenreihen, ein bis zwei Abgänge in die Tiefe
  function ruin(x, y) {
    const w = ri(11, 15), d = ri(9, 11), x0 = x - (w >> 1), y0 = y - (d >> 1), x1 = x0 + w - 1, y1 = y0 + d - 1, R = Math.ceil(Math.hypot(w, d) / 2) + 2, pe = rf(0, 6);
    disk(x + 0.5, y + 0.5, R + 1, (i, xx, yy, dd) => { lot[i] = 1; if (dd < R - 0.5 + 1.2 * Math.sin(Math.atan2(yy - y, xx - x) * 5 + pe)) gr[i] = OG.flag; });
    // Abgang in der Rückwand mit der Öffnung zum Betrachter, manchmal ein zweiter in der linken Wand; davor die Austrittspunkte
    const gx = ri(x0 + 2, x1 - 3);
    put('gate', gx, y0, 2, 1, { z: 96, face: 'y' }); doors.push(I(gx, y0 + 1), I(gx + 1, y0 + 1));
    if (r() < 0.5) { const gy = ri(y0 + 2, y1 - 3); put('gate', x0, gy, 1, 2, { z: 96, face: 'x' }); doors.push(I(x0 + 1, gy), I(x0 + 1, gy + 1)); }
    const gap = ri(x0 + 2, x1 - 2);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      if ((xx > x0 && xx < x1 && yy > y0 && yy < y1) || (yy === y1 && Math.abs(xx - gap) <= 1) || r() < 0.2) continue;
      put('wall', xx, yy, 1, 1, { z: ri(36, 128) });
    }
    for (let xx = x0 + 2; xx <= x1 - 2; xx += 3) for (const yy of [y0 + 2, y1 - 2]) if (r() < 0.85) put('pillar', xx, yy, 1, 1, { z: r() < 0.3 ? ri(54, 96) : ri(160, 200) });
    for (let k = ri(2, 4); k > 0; k--) decals.push({ k: 'drum', x: rf(x0 - 1, x1 + 2), y: rf(y0 - 1, y1 + 2), a: rf(0, 6) });
    sites.push({ k: 'ruin', x, y, r: R, n: 0, wp: false });
  }
  // Rastplatz: Riesenskelett oder Wagenwrack, davor Platz für zwei Tote Wächter
  function camp(x, y) {
    disk(x + 0.5, y + 0.5, 6, i => { lot[i] = 1; });
    if (r() < 0.5) put('skel', x - 2, y - 4, 4, 2, { z: 84, dir: r() < 0.5 ? 1 : -1 });
    else { put('wagon', x - 1, y - 3, 2, 1, { z: 44 }); put('boulder', x + 2, y - 2, 1, 1, { z: 30 }); }
    for (let k = 0; k < 7; k++) decals.push({ k: 'bone', x: x + rf(-4, 5), y: y + rf(-3, 5), a: rf(0, 6) });
    sites.push({ k: 'camp', x, y, r: 5, n: 0, wp: false });
  }
  // Eingang zur Wurmgruft: dunkler Schlund im Sand, dahinter Felsen und zwei Felsnadeln. Hinein kommt man nicht, heraus kommen Gegner
  function lair(x, y) {
    const P = { x: x + 0.5 - 2.4, y: y + 0.5 - 2.4, R: 2.6, p1: rf(0, 6), p2: rf(0, 6) };
    pits.push(P);
    disk(x + 0.5, y + 0.5, 9, i => { lot[i] = 1; });
    disk(P.x, P.y, P.R * 1.25 + 1.6, (i, xx, yy, d) => {
      const w = oaWob(P, Math.atan2(yy + 0.5 - P.y, xx + 0.5 - P.x));
      if (d < w) { map[i] = 0; gr[i] = OG.pit; } else if (d < w + 1.5 && xx + yy + 1 >= P.x + P.y) doors.push(i);
    });
    for (let k = 0; k < 9; k++) { const a = -2.36 + (k - 4) * 0.36, d = P.R * 1.25 + 2; put('rock', Math.floor(P.x + Math.cos(a) * d), Math.floor(P.y + Math.sin(a) * d), ri(1, 2), ri(1, 2), { st: 'stones', hz: (u, v) => 60 + uhash(u * 5 + k, v * 3) % 70 }); }
    put('rock', Math.floor(P.x - 5.5), Math.floor(P.y + 0.5), 1, 1, { st: 'spire', z: 300 }); put('rock', Math.floor(P.x + 0.5), Math.floor(P.y - 5.5), 1, 1, { st: 'spire', z: 260 });
    sites.push({ k: 'lair', x, y, r: 8, n: 0, wp: false });
  }
  // freier Platz für einen Ort mit Radius R: Abstand gap zu den übrigen Orten, notfalls nach und nach weniger
  const spot = (R, gap, ok = () => true) => {
    for (let t = 0; t < 1500; t++) {
      const x = ri(40 + R, N - 41 - R), y = ri(40 + R, N - 41 - R), g = gap - Math.floor(t / 300) * 6;
      if (ok(x, y) && sites.every(s => Math.hypot(s.x - x, s.y - y) >= s.r + R + g)) return [x, y];
    }
    return [ri(40 + R, N - 41 - R), ri(40 + R, N - 41 - R)];
  };
  // Startoase in der Mitte, acht Oasen in acht Richtungen abwechselnd auf einem nahen und einem fernen Ring; die fernen haben Wegpunkte
  oasis('start', C, C, 3, true, 5.4);
  const size = shuf([1, 1, 1, 2, 2, 2, 3, 3]), off = ri(0, 1);
  for (let s = 0; s < 8; s++) {
    const far = (s + off) % 2, a = (s + 0.5) * Math.PI / 4 + rf(-0.2, 0.2), d = far ? rf(142, 176) : rf(92, 126);
    oasis('oasis', Math.round(C + Math.cos(a) * d), Math.round(C + Math.sin(a) * d), size[s], !!far);
  }
  lair(...spot(8, 20, (x, y) => Math.hypot(x - C, y - C) > 140));
  for (let k = 0; k < 6; k++) ruin(...spot(11, 16));
  for (let k = 0; k < 8; k++) camp(...spot(5, 12));

  // ---------- Dazwischen: Tafelberge, Felsbrocken, Palmen, Dünen ----------
  for (let n = 0, t = 0; n < 16 && t < 900; t++) {
    const cx = ri(30, N - 31), cy = ri(30, N - 31), R = ri(6, 12), p1 = rf(0, 6), p2 = rf(0, 6);
    let clear = true;
    each(cx - R - 5, cy - R - 5, cx + R + 5, cy + R + 5, i => { if (lot[i] || !map[i]) clear = false; });
    if (!clear) continue;
    rock('mesa', ri(150, 230), (x, y) => { const a = Math.atan2(y - cy, x - cx); return Math.hypot(x - cx, y - cy) <= R * (1 + 0.22 * Math.sin(3 * a + p1) + 0.12 * Math.sin(5 * a + p2)); }, [cx - R * 2, cy - R * 2, cx + R * 2, cy + R * 2]);
    n++;
  }
  for (let n = 0, t = 0; n < 90 && t < 1800; t++) { const w = ri(2, 3), d = ri(2, 3); if (put('rock', ri(14, N - 16), ri(14, N - 16), w, d, { st: 'stones', free: true, hz: (u, v) => 40 + uhash(u * 7 + n, v * 5) % 56 })) n++; }
  for (let n = 0, t = 0; n < 260 && t < 3000; t++) if (put('boulder', ri(12, N - 13), ri(12, N - 13), 1, 1, { z: ri(22, 46), free: true })) n++;
  for (let n = 0, t = 0; n < 28 && t < 600; t++) {
    const x = ri(30, N - 31), y = ri(30, N - 31);
    let k = 0;
    for (let j = ri(1, 3); j > 0; j--) if (put('palm', x + ri(-2, 2), y + ri(-2, 2), 1, 1, { z: ri(180, 240), free: true })) k++;
    if (k) n++;
  }
  // Dünen sind nur Bild und begehbar: lang gezogen quer zum Wind, nicht an den Orten
  for (let n = 0, t = 0; n < 80 && t < 800; t++) {
    const x = rf(30, N - 30), y = rf(30, N - 30), l = rf(7, 18);
    if (sites.some(s => Math.hypot(s.x - x, s.y - y) < s.r + l + 2)) continue;
    dunes.push({ x, y, l, w: l * rf(0.28, 0.45), a: 0.7 + rf(-0.3, 0.3) }); n++;
  }
  // dunkles Geröll am Fuß von Felswänden, Tafelbergen und Felsbrocken
  for (let i = N; i < A - N; i++) if (ob[i] && obs[ob[i]].k === 'rock' && (map[i - 1] || map[i + 1] || map[i - N] || map[i + N])) {
    const x = i % N, y = (i / N) | 0;
    disk(x + 0.5, y + 0.5, 1.5 + (uhash(x, y) % 3) * 0.7, j => { if (gr[j] === OG.sand) gr[j] = OG.grit; });
  }
  // Sandlöcher: Austrittspunkte im offenen Sand, nie dicht beieinander
  for (let t = 0; holes.length < 340 && t < 8000; t++) {
    const x = ri(16, N - 17), y = ri(16, N - 17), i = I(x, y);
    if (lot[i] || gr[i] !== OG.sand || holes.some(j => Math.abs(j % N - x) < 13 && Math.abs(((j / N) | 0) - y) < 13)) continue;
    let ok = true;
    each(x - 1, y - 1, x + 1, y + 1, j => { if (!map[j]) ok = false; });
    if (ok) { gr[i] = OG.hole; holes.push(i); }
  }

  // ---------- Alles von der Startoase aus erreichbar ----------
  const reach = () => { const s = new Uint8Array(A), q = [I(C, C)]; s[q[0]] = 1; for (let k = 0; k < q.length; k++) for (const d of [1, -1, N, -N]) { const n = q[k] + d; if (map[n] && !s[n]) { s[n] = 1; q.push(n); } } return s; };
  let seen = reach(), carved = 0;
  // Notweg vom eingeschlossenen Ort zur Mitte: Hindernisse darauf ganz weg, Felswand und Tafelberg feldweise; Wasser bleibt
  for (const s of sites) if (!seen[I(s.x, s.y)]) {
    for (let t = 0, n = Math.hypot(s.x - C, s.y - C); t <= n; t++) {
      const x = Math.round(s.x + (C - s.x) * t / n), y = Math.round(s.y + (C - s.y) * t / n);
      each(x - 1, y - 1, x + 1, y + 1, i => { const o = obs[ob[i]]; if (!o) return; if (o.x0 !== undefined) each(o.x0, o.y0, o.x1, o.y1, j => { map[j] = 1; ob[j] = hgt[j] = draw[j] = 0; }); else { map[i] = 1; ob[i] = hgt[i] = draw[i] = 0; } });
    }
    seen = reach(); carved++;
  }
  for (let i = 0; i < A; i++) if (map[i] && !seen[i]) map[i] = 0; // abgeschlossene Taschen sperren
  const hs = holes.filter(i => map[i]), ds = doors.filter(i => map[i]);
  return { seed, map, ob, obs, gr, hgt, draw, sites, holes: hs, doors: ds, exits: [...hs, ...ds], ponds, pits, dunes, decals, carved, start: { x: (C + 0.5) * T, y: (C + 0.5) * T } };
}
// Karte des Helden: neu gebaut, sobald sich der Startwert ändert (anderer Held); die Bodenkacheln gelten nur für diese Karte
function oaMap() {
  if (OA_MAP?.seed !== P.oaSeed) { OA_MAP = oaGen(P.oaSeed); OA_CHUNKS.clear(); }
  return OA_MAP;
}

// ---------- Automap ----------
// aufgedeckte Gegenden: je Zelle ein Bit, im Spielstand P.oaSeen als Hex-Text mit vier Zellen je Zeichen
function oaSeen() {
  if (G.oaSeen) return G.oaSeen;
  const s = new Uint8Array(OA_SN * OA_SN), h = P.oaSeen || '';
  for (let i = 0; i < s.length; i++) s[i] = parseInt(h[i >> 2] || '0', 16) >> (i & 3) & 1;
  return G.oaSeen = s;
}
// wie in D2 deckt sich auf, wo der Held war, etwa so weit, wie das Bild reicht
function oaReveal() {
  const p = G.player, s = oaSeen(), cx = p.x / (T * OA_SC), cy = p.y / (T * OA_SC), R = 2;
  let n = 0;
  for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(OA_SN - 1, Math.floor(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(OA_SN - 1, Math.floor(cx + R)); x++) {
    const i = y * OA_SN + x;
    if (!s[i] && (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= R * R) { s[i] = 1; n++; }
  }
  if (!n) return;
  let h = '';
  for (let i = 0; i < s.length; i += 4) h += (s[i] | s[i + 1] << 1 | s[i + 2] << 2 | s[i + 3] << 3).toString(16);
  P.oaSeen = h; G.oaMiniOk = false;
}
// ganze Karte als Bild, ein Bildpunkt je Feld: auf dunkel durchscheinendem Grund helle Felsen und Mauern, Wasser, Gras und Palmen
function oaMiniBase() {
  const L = G.L, N = OA_N, c = mkCanvas(N), g = c.getContext('2d'), d = g.createImageData(N, N), a = d.data;
  const GR = { [OG.sand]: [24, 16, 8, 120], [OG.grit]: [54, 44, 32, 140], [OG.grass]: [96, 140, 56, 190], [OG.wet]: [90, 110, 70, 200], [OG.water]: [70, 190, 200, 240], [OG.flag]: [120, 110, 90, 170], [OG.hole]: [120, 90, 50, 220], [OG.pit]: [0, 0, 0, 250] };
  const OB = { rock: [214, 196, 160, 235], wall: [245, 238, 215, 245], pillar: [245, 238, 215, 245], gate: [255, 250, 230, 250], palm: [110, 190, 80, 230], skel: [235, 228, 205, 230], wagon: [200, 150, 90, 230], boulder: [170, 156, 130, 200] };
  for (let i = 0; i < N * N; i++) { const o = L.obs[L.ob[i]], v = o ? OB[o.k] : GR[L.gr[i]]; if (v) a.set(v, i * 4); }
  g.putImageData(d, 0, 0);
  return c;
}
// Automap der Oase in Weltkoordinaten: nur die aufgedeckten Gegenden mit weichem Rand, dazu Oasen und Objekte mit Farbe mm
function oaAutomap() {
  const L = G.L, s = oaSeen();
  if (!G.oaMiniOk) {
    const m = mkCanvas(OA_SN), mg = m.getContext('2d'), c = G.oaMini ||= mkCanvas(OA_N), g = c.getContext('2d');
    mg.fillStyle = '#fff';
    for (let i = 0; i < s.length; i++) if (s[i]) mg.fillRect(i % OA_SN, (i / OA_SN) | 0, 1, 1);
    g.globalCompositeOperation = 'copy'; g.drawImage(L.mini ||= oaMiniBase(), 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true; g.drawImage(m, 0, 0, OA_SN * OA_SC, OA_SN * OA_SC);
    g.globalCompositeOperation = 'source-over'; G.oaMiniOk = true;
  }
  ctx.globalAlpha = 0.85; ctx.imageSmoothingEnabled = false; ctx.drawImage(G.oaMini, 0, 0, MW * T, MH * T); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  const vis = (x, y) => s[((y / (T * OA_SC)) | 0) * OA_SN + ((x / (T * OA_SC)) | 0)];
  for (const st of L.sites) if ((st.k === 'start' || st.k === 'oasis') && vis((st.x + 0.5) * T, (st.y + 0.5) * T)) {
    ctx.strokeStyle = '#6ae0d0'; ctx.lineWidth = 36; ctx.beginPath(); ctx.arc((st.x + 0.5) * T, (st.y + 0.5) * T, 130, 0, 7); ctx.stroke();
  }
  for (const pr of G.props) if (pr.mm && vis(pr.x, pr.y)) { ctx.fillStyle = pr.mm; ctx.fillRect(pr.x - 50, pr.y - 50, 100, 100); }
}

// ---------- Texturen ----------
// Geröll: rundliche Brocken mit Licht links oben, nahtlos gekachelt; sand: Sandflecken dazwischen
function oaRubble(base, [hi, mid, lo], sand) {
  return tex(128, base, (g, s) => {
    for (let i = 0; i < 80; i++) {
      const x = rr(0, s), y = rr(0, s), r = rr(5, 15), q = rr(0.6, 0.9), a = rr(0, 3);
      wrap(s, x, y, (x, y) => { const gg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gg.addColorStop(0, hi); gg.addColorStop(0.6, mid); gg.addColorStop(1, lo); g.fillStyle = gg; g.beginPath(); g.ellipse(x, y, r, r * q, a, 0, 7); g.fill(); });
    }
    if (sand) blobs(g, s, 24, sand, 3, 9, 0.5);
    grain(g, s, 16);
  });
}
function oaTex() {
  if (OAT) return OAT;
  return OAT = {
    // blasser, goldbeiger Sand wie in Akt 2
    sand: tex(256, '#c8a872', (g, s) => { blobs(g, s, 44, ['#bf9f68', '#d0b27e', '#c4a46e', '#b89860'], 14, 56, 0.4); strokes(g, s, 170, ['rgba(130,98,56,.4)', 'rgba(246,228,188,.45)'], 26, 1.2, 0.25, 0.3); blobs(g, s, 340, ['#a88a56', '#e4cc98', '#9c7e4c'], 0.6, 2, 0.6); grain(g, s, 12); }),
    grit: tex(256, '#9c8564', (g, s) => { blobs(g, s, 40, ['#917a5a', '#a89070', '#86704f'], 10, 36, 0.5); blobs(g, s, 1300, ['#76644e', '#b6a080', '#665440', '#c4ae8c'], 0.7, 2.6, 0.85); grain(g, s, 16); }),
    grass: tex(256, '#7a7a42', (g, s) => { blobs(g, s, 50, ['#6c7038', '#8a8648', '#74703c', '#5c6830'], 8, 30, 0.55); strokes(g, s, 900, ['#98a050', '#566228', '#b0a862', '#465820'], 7, 1.3, 0.85, -1.5); grain(g, s, 14); }),
    wet: tex(256, '#8c7a52', (g, s) => { blobs(g, s, 40, ['#806e48', '#98865c', '#76663f'], 10, 40, 0.5); blobs(g, s, 300, ['#6a5a3a', '#a8966a'], 0.6, 2, 0.6); grain(g, s, 12); }),
    water: tex(256, '#3c6a52', (g, s) => { blobs(g, s, 30, ['#3a664e', '#42725a', '#34604a'], 20, 60, 0.35); strokes(g, s, 50, ['rgba(170,215,185,.22)', 'rgba(24,48,34,.25)'], 12, 1.2, 0.5, 0.46); grain(g, s, 6); }),
    flag: tex(128, '#706450', (g, s) => { stones(g, s, 21, 18, 36, '#b2a284', 0.06, '#706450', 2); blobs(g, s, 30, ['rgba(210,182,130,.55)'], 4, 14, 0.4); grain(g, s, 14); }),
    // dunkle, graubraune Felsen wie in Akt 2: aufgetürmte, rundliche Brocken, oben im Licht, unten im Schatten
    rock: oaRubble('#3e362e', ['#8a7c68', '#5e5446', '#2a241e']),
    top: oaRubble('#6e624f', ['#a8987c', '#7a6c58', '#4e463a'], ['#c0a476', '#b09468']),
    wall: tex(128, '#6a5e4a', (g, s) => { stones(g, s, 16, 20, 42, '#a8966f', 0.07, '#6a5e4a', 2); cracks(g, s, 6, '#4a4032', 0.5, 1); grain(g, s, 16); }),
    plank: tex(128, '#6a4a2c', (g, s) => { for (let y = 0; y < s; y += 12) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, s, 2); g.fillStyle = 'rgba(255,220,170,.1)'; g.fillRect(0, y + 2, s, 1); } strokes(g, s, 80, ['rgba(40,24,12,.4)'], 30, 1, 0.5, 0); grain(g, s, 18); }),
  };
}
function oaPat() {
  if (OAP) return OAP;
  const X = oaTex();
  return OAP = Object.fromEntries(['rock', 'top', 'wall', 'plank'].map(k => [k, ctx.createPattern(X[k], 'repeat')]));
}

// ---------- Boden in Kacheln ----------
// trockener Busch: Gewirr aus dünnen Zweigen, flach auf dem Boden gesehen
function oaBush(g, x, y, h) {
  g.strokeStyle = (h >> 3) % 2 ? '#6a5434' : '#7e6640'; g.lineWidth = 1.3;
  for (let j = 0; j < 11; j++) { const a = j * 0.57 + (h >> j) % 5 * 0.2, l = 6 + (h >> (j + 2)) % 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 1.3, y + Math.sin(a) * l * 0.8); g.stroke(); }
}
function oaBake(cx, cy) {
  const L = G.L, N = OA_N, S = HW_CH * T, ox = cx * S, oy = cy * S, X = oaTex(), c = mkCanvas(S), g = c.getContext('2d');
  const tx0 = cx * HW_CH, ty0 = cy * HW_CH, tx1 = tx0 + HW_CH - 1, ty1 = ty0 + HW_CH - 1;
  // Flächen je Feld: Ufer und Teich liegen auf Gras, der Schlund auf Geröll, Sandlöcher im Sand; darüber eigene, runde Bilder
  const G0 = (x, y) => { const k = x < 0 || y < 0 || x >= N || y >= N ? OG.grit : L.gr[y * N + x]; return k === OG.wet || k === OG.water ? OG.grass : k === OG.pit ? OG.grit : k === OG.hole ? OG.sand : k; };
  const pat = k => g.createPattern(X[k], 'repeat'), near = (x, y, r) => x > ox - r && x < ox + S + r && y > oy - r && y < oy + S + r;
  g.translate(-ox, -oy);
  g.fillStyle = pat('sand'); g.fillRect(ox, oy, S, S);
  // große helle und dunkle Flecken im Sand wie in D2, über die Kachelgrenzen hinweg
  for (let y = ty0 - 6; y <= ty1 + 6; y++) for (let x = tx0 - 6; x <= tx1 + 6; x++) {
    const h = uhash(x * 5 + 3, y * 7 + 1);
    if (h % 17) continue;
    const px = (x + 0.5) * T, py = (y + 0.5) * T, rr = (2.5 + (h >> 6) % 4) * T, lite = h & 32, col = lite ? '238,218,168' : '128,98,58', gg = g.createRadialGradient(px, py, 0, px, py, rr);
    gg.addColorStop(0, `rgba(${col},${lite ? 0.3 : 0.16})`); gg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gg; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
  }
  for (const k of [OG.grit, OG.grass, OG.flag]) {
    g.beginPath(); let any = false;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (G0(x, y) === k) { g.rect(x * T, y * T, T, T); any = true; }
    if (any) { g.fillStyle = pat(OGN[k]); g.fill(); }
  }
  // weiche Übergänge: Sand weht über Geröll und Pflaster, Gras wächst in den Sand
  const sandP = pat('sand'), grassP = pat('grass');
  for (let y = ty0 - 1; y <= ty1 + 1; y++) for (let x = tx0 - 1; x <= tx1 + 1; x++) {
    const k = G0(x, y);
    for (const [dx, dy] of DIRS4) {
      const n = G0(x + dx, y + dy);
      if (n === k || (k !== OG.sand && n !== OG.sand)) continue;
      const h = uhash(x * 3 + dx, y * 5 + dy), ex = (x + 0.5 + dx * 0.5) * T, ey = (y + 0.5 + dy * 0.5) * T;
      g.fillStyle = k === OG.grass || n === OG.grass ? grassP : sandP;
      for (let j = 0; j < 3; j++) { const a = (h >> (j * 4)) % 16 / 16, rr = 5 + (h >> (j * 3 + 2)) % 9; g.beginPath(); g.ellipse(ex + (dy ? (a - 0.5) * T : 0), ey + (dx ? (a - 0.5) * T : 0), rr * (dx ? 0.7 : 1.4), rr * (dy ? 0.7 : 1.4), 0, 0, 7); g.fill(); }
    }
  }
  // Dünen: heller Rücken, Schatten auf der Leeseite, Rippeln längs des Kamms
  for (const d of L.dunes) {
    const x = d.x * T, y = d.y * T, l = d.l * T, w = d.w * T;
    if (!near(x, y, l)) continue;
    g.save(); g.translate(x, y); g.rotate(d.a); g.scale(1, w / l);
    let gg = g.createRadialGradient(0, -l * 0.2, 0, 0, 0, l); gg.addColorStop(0, 'rgba(246,230,190,.5)'); gg.addColorStop(0.6, 'rgba(236,216,170,.26)'); gg.addColorStop(1, 'rgba(236,216,170,0)');
    g.fillStyle = gg; g.beginPath(); g.arc(0, 0, l, 0, 7); g.fill();
    gg = g.createRadialGradient(0, l * 0.4, 0, 0, l * 0.4, l * 0.65); gg.addColorStop(0, 'rgba(120,88,48,.2)'); gg.addColorStop(1, 'rgba(120,88,48,0)');
    g.fillStyle = gg; g.beginPath(); g.arc(0, l * 0.4, l * 0.65, 0, 7); g.fill();
    g.restore(); g.save(); g.translate(x, y); g.rotate(d.a);
    g.strokeStyle = 'rgba(140,106,62,.22)'; g.lineWidth = 1.5;
    for (let k = -3; k <= 3; k++) { const yy = k * w * 0.24, xx = l * Math.sqrt(Math.max(0, 1 - (yy / w) ** 2)) * 0.75; g.beginPath(); g.moveTo(-xx, yy); g.quadraticCurveTo(0, yy - w * 0.12, xx, yy); g.stroke(); }
    g.restore();
  }
  // Teiche: nasses Ufer, grünes Wasser mit dunklem Rand, tieferer Mitte und Glanzlichtern; der Schlund der Wurmgruft fast schwarz
  const shape = (o, k) => { g.beginPath(); for (let j = 0; j < 48; j++) { const a = j / 48 * 6.283, rr = (oaWob(o, a) + k) * T; g.lineTo(o.x * T + Math.cos(a) * rr, o.y * T + Math.sin(a) * rr); } g.closePath(); };
  for (const o of L.ponds) if (near(o.x * T, o.y * T, (o.R * 1.25 + 2) * T)) {
    shape(o, 1.1); g.fillStyle = pat('wet'); g.fill();
    shape(o, 0.15); g.fillStyle = pat('water'); g.fill(); g.strokeStyle = 'rgba(52,44,26,.55)'; g.lineWidth = 5; g.stroke();
    const gg = g.createRadialGradient(o.x * T, o.y * T, 0, o.x * T, o.y * T, o.R * T); gg.addColorStop(0, 'rgba(16,44,34,.4)'); gg.addColorStop(1, 'rgba(16,44,34,0)'); g.fillStyle = gg; g.fill();
  }
  for (const o of L.pits) if (near(o.x * T, o.y * T, (o.R * 1.25 + 2) * T)) {
    shape(o, 1); g.fillStyle = 'rgba(60,46,30,.55)'; g.fill();
    shape(o, 0); const gg = g.createRadialGradient(o.x * T, o.y * T, 0, o.x * T, o.y * T, o.R * 1.2 * T); gg.addColorStop(0, '#050302'); gg.addColorStop(0.6, '#1a120a'); gg.addColorStop(1, '#3e2e1c'); g.fillStyle = gg; g.fill();
  }
  // Sandlöcher: Trichter mit hellem Wall und dunklem Grund
  for (let y = ty0 - 1; y <= ty1 + 1; y++) for (let x = tx0 - 1; x <= tx1 + 1; x++) if (x >= 0 && y >= 0 && x < N && y < N && L.gr[y * N + x] === OG.hole) {
    const px = (x + 0.5) * T, py = (y + 0.5) * T;
    let gg = g.createRadialGradient(px, py, 6, px, py, 24); gg.addColorStop(0, 'rgba(110,80,44,.75)'); gg.addColorStop(0.55, 'rgba(176,140,92,.5)'); gg.addColorStop(0.8, 'rgba(242,224,178,.55)'); gg.addColorStop(1, 'rgba(242,224,178,0)');
    g.fillStyle = gg; g.beginPath(); g.arc(px, py, 24, 0, 7); g.fill();
    gg = g.createRadialGradient(px, py, 0, px, py, 10); gg.addColorStop(0, '#1c1208'); gg.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gg; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill();
  }
  // Kleinkram je Feld: trockene Büsche und Steinchen im Sand, Halme im Gras, Steine im Geröll, Risse im Pflaster
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    const i = y * N + x, k = L.gr[i], h = uhash(x * 3 + 1, y * 5 + 2), q = h % 100, px = x * T + 6 + h % 28, py = y * T + 6 + (h >> 6) % 28;
    if (!L.map[i]) continue;
    if (k === OG.sand) { if (q < 4) oaBush(g, px, py, h); else if (q < 13) for (let j = 0; j < 3; j++) disc(g, px + ((h >> j * 3) % 13) - 6, py + ((h >> j * 2) % 9) - 4, 1.2 + (h >> j) % 3 * 0.6, j % 2 ? '#8a7050' : '#e6d0a4'); }
    else if (k === OG.grass || k === OG.wet) { if (q < 45) { g.strokeStyle = q % 3 ? '#5a6a2a' : '#a89a50'; g.lineWidth = 1.4; for (let j = 0; j < 6; j++) { const a = j * 1.05 + h; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * (5 + (h >> j) % 6), py + Math.sin(a) * (4 + (h >> j) % 4)); g.stroke(); } } }
    else if (k === OG.grit) { if (q < 40) for (let j = 0; j < 4; j++) disc(g, px + ((h >> j * 3) % 15) - 7, py + ((h >> j * 2) % 11) - 5, 1.6 + (h >> j) % 3 * 0.8, j % 2 ? '#5e5040' : '#a8967a'); }
    else if (k === OG.flag && q < 14) { g.fillStyle = 'rgba(60,48,30,.35)'; g.fillRect(x * T + (h % 3) * 12, y * T + ((h >> 3) % 3) * 12, 14, 10); }
  }
  // Knochen an den Rastplätzen, umgestürzte Säulentrommeln an den Ruinen, dunkler Grund der Felsspalten
  for (const d of L.decals) {
    const x = d.x * T, y = d.y * T;
    if (!near(x, y, 60)) continue;
    g.save(); g.translate(x, y); g.rotate(d.a || 0);
    if (d.k === 'bone') { g.fillStyle = '#ded2b6'; g.fillRect(-9, -1.6, 18, 3.2); for (const [bx, by] of [[-9, -2], [-9, 2], [9, -2], [9, 2]]) disc(g, bx, by, 2.4, '#ded2b6'); }
    else if (d.k === 'drum') { g.fillStyle = 'rgba(40,30,18,.3)'; g.fillRect(-16, 4, 34, 10); g.fillStyle = '#c2ae8a'; g.fillRect(-16, -11, 32, 22); g.fillStyle = '#d8c6a2'; g.beginPath(); g.ellipse(16, 0, 6, 11, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(90,72,48,.4)'; g.fillRect(-16, 4, 32, 7); }
    else { const gg = g.createRadialGradient(0, 0, 0, 0, 0, 46); gg.addColorStop(0, 'rgba(14,10,6,.75)'); gg.addColorStop(1, 'rgba(14,10,6,0)'); g.fillStyle = gg; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); }
    g.restore();
  }
  // kurze, harte Mittagsschatten der Hindernisse, Palmen mit gefiedertem Kronenschatten; dazu Schatten am Fuß der Felsen
  oaMask ||= mkCanvas(S);
  const m = oaMask.getContext('2d'), sv = 0.22;
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, S, S); m.translate(-ox, -oy); m.fillStyle = m.strokeStyle = '#000';
  for (let y = ty0 - 2; y <= ty1 + 6; y++) for (let x = tx0 - 6; x <= tx1 + 2; x++) {
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const i = y * N + x, o = L.obs[L.ob[i]];
    if (!o) continue;
    let z = L.hgt[i], x0 = x * T, y0 = y * T, x1 = x0 + T, y1 = y0 + T;
    if (o.spr) {
      if (!L.draw[i]) continue;
      if (o.k === 'palm') {
        const qx = x0 + T / 2 + SUN[0] * o.z * sv, qy = y0 + T / 2 + SUN[1] * o.z * sv;
        m.lineWidth = 11; m.beginPath(); m.moveTo(x0 + T / 2, y0 + T / 2); m.lineTo(qx, qy); m.stroke();
        for (let j = 0; j < 13; j++) { const a = j * 0.483 + o.seed, l = 30 + (o.seed >> j) % 12; m.beginPath(); m.ellipse(qx + Math.cos(a) * l, qy + Math.sin(a) * l, l, 5, a, 0, 7); m.fill(); }
        continue;
      }
      if (o.k === 'skel') { // Rippen werfen schmale Streifen, kein Block
        for (let k = 0; k < 7; k++) { const rx = o.x0 * T + 30 + k * ((o.x1 - o.x0 + 1) * T - 60) / 6; m.fillRect(rx + 14, o.y0 * T - 6, 5, (o.y1 - o.y0 + 1) * T); }
        continue;
      }
      z = o.z * 0.8;
      const w = { boulder: 13, pillar: 12 }[o.k];
      if (w) { const cx2 = x0 + T / 2, cy2 = y0 + T / 2; x0 = cx2 - w; x1 = cx2 + w; y0 = cy2 - w; y1 = cy2 + w; } else { x0 = o.x0 * T + 6; y0 = o.y0 * T + 6; x1 = (o.x1 + 1) * T - 6; y1 = (o.y1 + 1) * T - 6; }
    }
    const vx = SUN[0] * z * sv, vy = SUN[1] * z * sv;
    m.beginPath(); m.moveTo(x0, y1); m.lineTo(x0, y0); m.lineTo(x0 + vx, y0 + vy); m.lineTo(x1 + vx, y0 + vy); m.lineTo(x1 + vx, y1 + vy); m.lineTo(x1, y1); m.closePath(); m.fill();
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.4; g.drawImage(oaMask, 0, 0); g.globalAlpha = 1; g.translate(-ox, -oy);
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (!L.map[y * N + x]) continue;
    for (const [dx, dy] of DIRS4) if (L.hgt[(y + dy) * N + x + dx] > 0) for (let k = 0; k < 3; k++) {
      g.fillStyle = `rgba(36,26,14,${0.2 - k * 0.055})`;
      if (dx === 1) g.fillRect(x * T + T - (k + 1) * 4, y * T, 4, T); else if (dx === -1) g.fillRect(x * T + k * 4, y * T, 4, T);
      else if (dy === 1) g.fillRect(x * T, y * T + T - (k + 1) * 4, T, 4); else g.fillRect(x * T, y * T + k * 4, T, 4);
    }
  }
  return c;
}
// sichtbare Kacheln zeichnen wie hwFloor; fehlende entstehen nach und nach (eine je Bild, beim Kartenstart alle sichtbaren)
function oaFloor() {
  const S = HW_CH * T, n = Math.ceil(OA_N / HW_CH), p = G.player;
  let budget = G.floorWarm ? 1 : 99;
  G.floorWarm = true;
  const pcx = (p.x / S) | 0, pcy = (p.y / S) | 0;
  for (let cy = Math.max(0, pcy - 4); cy <= Math.min(n - 1, pcy + 4); cy++) for (let cx = Math.max(0, pcx - 4); cx <= Math.min(n - 1, pcx + 4); cx++) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of [cx * S, (cx + 1) * S]) for (const y of [cy * S, (cy + 1) * S]) { const [sx, sy] = proj(x, y); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    if (x1 < -40 || x0 > W + 40 || y1 < -40 || y0 > H + 260) continue;
    const k = cy * n + cx;
    let c = OA_CHUNKS.get(k);
    if (!c && budget-- > 0) { c = oaBake(cx, cy); OA_CHUNKS.set(k, c); }
    if (c) { c.used = G.t; ctx.drawImage(c, cx * S - 1, cy * S - 1, S + 2, S + 2); } // überlappend, sonst scheinen die Kachelkanten dunkel durch
    else { ctx.fillStyle = '#c6a670'; ctx.fillRect(cx * S, cy * S, S, S); }
  }
  // höchstens 40 Kacheln behalten, zuerst die am längsten unbenutzten
  if (OA_CHUNKS.size > 40) { let old = null; for (const [k, c] of OA_CHUNKS) if (!old || c.used < old[1].used) old = [k, c]; OA_CHUNKS.delete(old[0]); }
}

// ---------- Hindernisse ----------
function oaObst(tx, ty, fade) {
  const L = G.L, i = ty * MW + tx, o = L.obs[L.ob[i]];
  if (!o) return;
  ctx.globalAlpha = fade;
  if (o.spr) oaSprite(o); else oaBlock(o, tx, ty, i);
  ctx.globalAlpha = 1;
  scrT();
}
// Felsen (Felswände, Tafelberge, Felsbrocken, Felsnadeln) und Mauerreste feldweise; Seitenflächen nur zu niedrigeren Nachbarn
function oaBlock(o, tx, ty, i) {
  const L = G.L, z = L.hgt[i], P = oaPat(), x0 = tx * T, y0 = ty * T, wall = o.k === 'wall', pat = wall ? P.wall : P.rock;
  const face = k => (len, h) => {
    const m = oaPM ||= new DOMMatrix(); m.e = k ? (ty + 1) * T : -tx * T; pat.setTransform(m); // das Muster läuft über die Felder weiter
    ctx.fillStyle = pat; ctx.fillRect(0, -h, len, h);
    ctx.fillStyle = k ? 'rgba(16,10,6,.42)' : 'rgba(255,236,200,.06)'; ctx.fillRect(0, -h, len, h);
    ctx.fillStyle = 'rgba(24,18,10,.3)'; ctx.fillRect(0, -12, len, 12);
  };
  hwBox(x0, y0, x0 + T, y0 + T, 0, z, hwOpen(i, MW, z) && face(0), hwOpen(i, 1, z) && face(1), (x, y, w, h) => {
    ctx.fillStyle = wall ? '#b4a27c' : P.top; ctx.fillRect(x, y, w, h);
    if (wall) { ctx.fillStyle = 'rgba(80,64,40,.3)'; ctx.fillRect(x + 4 + uhash(tx, ty) % 18, y + 5, 12, 8); }
    // Kanten im Licht nur an echten Stufen, sonst zeigt sich das Feldraster
    ctx.fillStyle = 'rgba(255,236,196,.16)';
    if (L.hgt[i + MW] < z - 20) ctx.fillRect(x, y + h - 3, w, 3);
    if (L.hgt[i + 1] < z - 20) ctx.fillRect(x + w - 3, y, 3, h);
    if (L.hgt[i - MW] < z - 20) ctx.fillRect(x, y, w, 2);
    if (L.hgt[i - 1] < z - 20) ctx.fillRect(x, y, 2, h);
  });
}
// Palmenkrone, einmal je Spielart vorgezeichnet (eigener Zufall): gefiederte Wedel, hinten dunkler, dazu ein paar vertrocknete
function oaCrown(v) {
  if (OA_CROWN[v]) return OA_CROWN[v];
  const K = 1.5, c = mkCanvas(330, 300), g = c.getContext('2d'), cx = 165, cy = 90;
  let s = v * 7919 + 17;
  const q = () => (s = s * 16807 % 2147483647) / 2147483647;
  const fr = Array.from({ length: 14 }, (_, k) => ({ a: k / 14 * 6.283 + q() * 0.4, l: (56 + q() * 30) * K, dry: k % 6 === 4 })).sort((a, b) => Math.sin(a.a) - Math.sin(b.a));
  g.lineCap = 'round';
  for (const f of fr) {
    const dx = Math.cos(f.a) * f.l, dy = Math.sin(f.a) * f.l * 0.5, sag = (f.dry ? 70 : 20 + q() * 22) * K, P1 = [cx + dx * 0.5, cy + dy * 0.5 - 18 * K], P2 = [cx + dx, cy + dy + sag];
    const pt = t => [(1 - t) ** 2 * cx + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * cy + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
    const col = f.dry ? '#8c7446' : shade('#40602a', Math.sin(f.a) * 0.07 + (q() - 0.5) * 0.06);
    g.strokeStyle = col; g.lineWidth = 2.6;
    for (let t = 0.12; t < 0.98; t += 0.045) {
      const [x, y] = pt(t), [x2, y2] = pt(t + 0.01), tl = Math.hypot(x2 - x, y2 - y) || 1, nx = -(y2 - y) / tl, ny = (x2 - x) / tl, l = 16 * K * (1 - t * 0.55);
      g.beginPath(); g.moveTo(x + nx * l, y + ny * l + 7); g.lineTo(x, y); g.lineTo(x - nx * l, y - ny * l + 7); g.stroke();
    }
    g.strokeStyle = shade(col, -0.08); g.lineWidth = 3.2; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]); g.stroke();
  }
  disc(g, cx, cy + 5, 10, '#5a3c1c'); disc(g, cx - 7, cy + 10, 6, '#6e4a22'); disc(g, cx + 7, cy + 10, 6, '#4e3418');
  return OA_CROWN[v] = c;
}
// Bildobjekte: Palmen, Felsbrocken, Säulen, Riesenskelette, Wagenwracks, Abgänge in die Tiefe
function oaSprite(o) {
  const cx = (o.x0 + o.x1 + 1) / 2 * T, cy = (o.y0 + o.y1 + 1) / 2 * T, [sx, sy] = proj(cx, cy), h = o.seed, P = oaPat();
  const P3 = (x, y, z) => { const [a, b] = proj(x, y); return [a, b - z]; }, flat = c => (l, hh) => { ctx.fillStyle = c; ctx.fillRect(0, -hh, l, hh); };
  ctx.lineCap = 'round';
  if (o.k === 'palm') { // leicht gebogener Stamm mit Ringen, Krone als Bild; verdeckt sie den Helden, wird sie durchsichtig
    const z = o.z, lean = (h % 9 - 4) * 4, tx = sx + lean, ty = sy - z, p = G.player, [hx, hy] = proj(p.x, p.y);
    if (o.d > p.x + p.y && Math.abs(hx - tx) < 120 && hy - 50 > ty - 100 && hy - 50 < ty + 110) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.35);
    const at = t => [(1 - t) ** 2 * sx + 2 * (1 - t) * t * (sx + lean * 0.1) + t * t * tx, (1 - t) ** 2 * sy + 2 * (1 - t) * t * (sy - z * 0.55) + t * t * ty];
    for (const [w, c, d] of [[16, '#4a3624', 0], [10, '#7a5c3c', -2], [3, 'rgba(220,190,140,.35)', -4]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx + d, sy); ctx.quadraticCurveTo(sx + lean * 0.1 + d, sy - z * 0.55, tx + d, ty); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,26,14,.55)';
    for (let k = 1; k < 12; k++) { const [bx, by] = at(k / 12); ctx.fillRect(bx - 8, by, 16, 2); }
    const cr = oaCrown(h % 6);
    ctx.drawImage(cr, tx - cr.width / 2, ty - 90);
    return;
  }
  if (o.k === 'boulder') { // grau-brauner Felsbrocken, links oben im Licht
    const z = o.z, rx = 13 + h % 8, pts = Array.from({ length: 7 }, (_, k) => { const a = k / 7 * 6.283, rr = 0.75 + ((h >> k) % 5) * 0.07; return [sx + Math.cos(a) * rx * rr, sy - z * 0.45 + Math.sin(a) * z * 0.55 * rr]; });
    const gg = ctx.createLinearGradient(sx - rx, sy - z, sx + rx, sy); gg.addColorStop(0, '#9a8c76'); gg.addColorStop(1, '#4a4034');
    ctx.fillStyle = gg; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,16,.5)'; ctx.lineWidth = 1; ctx.stroke();
    return;
  }
  if (o.k === 'pillar') { // Säule aus hellem Sandstein auf einem Sockel, mit Kapitell; abgebrochene enden zackig
    const z = o.z, broken = z < 120, w = 10, top = sy - (broken ? z : z - 14);
    hwBox(cx - 15, cy - 15, cx + 15, cy + 15, 0, 14, flat('#c2ae8a'), flat('#8e7c60'), (x, y, ww, hh) => { ctx.fillStyle = '#d8c6a2'; ctx.fillRect(x, y, ww, hh); });
    const gg = ctx.createLinearGradient(sx - w, 0, sx + w, 0); gg.addColorStop(0, '#e6d6b4'); gg.addColorStop(0.4, '#cdb995'); gg.addColorStop(1, '#7c6a50');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(sx - w, sy - 12);
    if (broken) for (let k = 0; k <= 4; k++) ctx.lineTo(sx - w + k * w / 2, top + ((h >> k) % 3) * 6 - (k % 2) * 8); else { ctx.lineTo(sx - w, top); ctx.lineTo(sx + w, top); }
    ctx.lineTo(sx + w, sy - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(70,56,40,.25)';
    for (const k of [-4, 1, 6]) ctx.fillRect(sx + k, top + 8, 1.5, sy - 20 - top);
    if (!broken) hwBox(cx - 16, cy - 16, cx + 16, cy + 16, z - 16, z, flat('#cbb894'), flat('#8a7a5e'), (x, y, ww, hh) => { ctx.fillStyle = '#ddcca8'; ctx.fillRect(x, y, ww, hh); });
    return;
  }
  if (o.k === 'skel') { // Riesenskelett: Wirbelsäule längs, Rippenbögen hinten und vorn, Schädel mit Hörnern
    const head = o.dir > 0 ? (o.x1 + 1) * T - 18 : o.x0 * T + 18, tail = o.dir > 0 ? o.x0 * T + 14 : (o.x1 + 1) * T - 14, my = cy;
    const bone = (a, b, c, w) => { for (const [lw, col] of [[w + 3, 'rgba(70,58,40,.75)'], [w, '#dcd0b2']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...b, ...c); ctx.stroke(); } };
    const ribs = side => { for (let k = 0; k < 7; k++) { const x = tail + (head - tail) * (0.16 + k * 0.1), z = o.z * (0.5 + 0.5 * Math.sin(Math.PI * (k + 1) / 8)); bone(P3(x, my, 6), P3(x + (head - tail) * 0.04, my + side * 30, z * 1.3), P3(x + (head - tail) * 0.06, my + side * 46, 3), 4.5); } };
    ribs(-1);
    bone(P3(tail, my, 3), P3((tail + head) / 2, my, 12), P3(head, my, 10), 6);
    ribs(1);
    const [kx, ky] = P3(head + Math.sign(head - tail) * 12, my, 16);
    ctx.fillStyle = '#d6caac'; ctx.strokeStyle = 'rgba(70,58,40,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(kx, ky, 22, 15, 0, 0, 7); ctx.fill(); ctx.stroke();
    disc(ctx, kx - 8, ky - 3, 4.5, '#2a2016'); disc(ctx, kx + 7, ky - 3, 4.5, '#2a2016');
    for (const s of [-1, 1]) bone([kx + s * 14, ky - 8], [kx + s * 30, ky - 24], [kx + s * 20, ky - 40], 4);
    return;
  }
  if (o.k === 'wagon') { // Wagenwrack: Ladefläche aus Brettern, ein Rad am Wagen, eines liegt daneben, die Deichsel im Sand
    const x0 = o.x0 * T + 4, y0 = o.y0 * T + 8, x1 = (o.x1 + 1) * T - 4, y1 = (o.y1 + 1) * T - 8;
    const face = k => (l, hh) => { ctx.fillStyle = P.plank; ctx.fillRect(0, -hh, l, hh); ctx.fillStyle = k ? 'rgba(20,10,4,.4)' : 'rgba(0,0,0,.08)'; ctx.fillRect(0, -hh, l, hh); };
    hwBox(x0, y0, x1, y1, 14, o.z, face(0), face(1), (x, y, w, hh) => { ctx.fillStyle = P.plank; ctx.fillRect(x, y, w, hh); ctx.fillStyle = 'rgba(30,16,6,.4)'; ctx.fillRect(x + w * 0.55, y, 9, hh); });
    const wheel = ([x, y], rx, ry) => { ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = k * 0.785; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * rx, y - Math.sin(a) * ry); ctx.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry); ctx.stroke(); } };
    wheel(P3(x0 + 18, y1 + 1, 16), 12, 15);
    wheel(P3(x1 + 22, y1 + 18, 0), 15, 6);
    ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...P3(x1, (y0 + y1) / 2, 18)); ctx.lineTo(...P3(x1 + 46, (y0 + y1) / 2 - 6, 0)); ctx.stroke();
    return;
  }
  if (o.k === 'gate') { // Abgang in die Tiefe: Mauerwerk mit dunkler Bogenöffnung und Stufen zum Betrachter
    const ax = o.face === 'x';
    const wallF = k => (l, hh) => { ctx.fillStyle = P.wall; ctx.fillRect(0, -hh, l, hh); ctx.fillStyle = k ? 'rgba(40,28,14,.38)' : 'rgba(255,240,210,.08)'; ctx.fillRect(0, -hh, l, hh); };
    const door = k => (l, hh) => {
      wallF(k)(l, hh);
      const w = l * 0.5, x = l * 0.25, top = -hh * 0.74;
      ctx.fillStyle = '#0e0a06'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, top + w / 2); ctx.arc(x + w / 2, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,140,110,.35)'; for (let s = 1; s < 4; s++) ctx.fillRect(x + 3, -s * 7, w - 6, 2);
    };
    hwBox(o.x0 * T, o.y0 * T, (o.x1 + 1) * T, (o.y1 + 1) * T, 0, o.z, ax ? wallF(0) : door(0), ax ? door(1) : wallF(1), (x, y, w, hh) => { ctx.fillStyle = '#b4a27c'; ctx.fillRect(x, y, w, hh); });
  }
}

// ---------- Runden ----------
// Gruppen bis zur Rundengröße (22 + 11 je Runde, ein Viertel des Highways) aus OASE_MONSTERS (oase-gegner.js): Arten ab ihrer Runde
// nach Anteil w, Größe n. Champions und Unique-Gegner so oft wie im Sanktuarium, nie aus Brut und Nestern (nochamp)
function oaQueue(d) {
  const pool = OASE_MONSTERS.filter(t => t.w > 0 && t.from <= d), elite = pool.filter(t => !t.nochamp), total = 12 + 6 * d, q = [];
  const kind0 = list => { let w = Math.random() * list.reduce((a, t) => a + t.w, 0); for (const t of list) if ((w -= t.w) < 0) return t; return list[0]; };
  let n = 0;
  for (let i = Math.min(12, 2 + Math.ceil(d * 0.7)); i > 0; i--) {
    const roll = Math.random(), kind = roll < 0.04 + d * 0.005 ? 'unique' : roll < 0.15 + d * 0.01 ? 'champ' : null;
    if (kind) { const k = kind === 'unique' ? 4 : rint(3, 5); q.push({ t: kind0(elite), kind, n: k }); n += k; }
  }
  while (n < total) { const t = kind0(pool), k = Math.min(total - n, rint(t.n[0], t.n[1])); q.push({ t, kind: null, n: k }); n += k; }
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } // Champions mischen sich unter die Gruppen
  return q;
}
// Sandfontäne, wo sich Gegner aus dem Sand graben
function oaDig(x, y) {
  fx({ k: 'ring', x, y, r0: 8, r1: 56, col: '#d8bc84', life: 0.6 });
  for (let i = 0; i < 24; i++) G.parts.push({ x: x + rnd(-12, 12), y: y + rnd(-12, 12), z: 4, vx: rnd(-50, 50), vy: rnd(-50, 50), vz: rnd(170, 340), g: 520, life: rnd(0.7, 1.2), t: 0, col: pick(['#dcc08a', '#c6a670', '#a8885a', '#eedcac']), s: rnd(2, 4.5) });
}
// Gruppe knapp außerhalb des Bildes wie hwSpawn: am nächsten Austrittspunkt (Sandloch, Ruineneingang, Felsspalte, Wurmgruft),
// sonst aus dem Sand; jede vierte im Rücken. Aus Sandlöchern und dem Sand graben sie sich mit einer Sandfontäne heraus
function oaSpawn({ t, kind, n }) {
  const p = G.player, L = G.L, back = Math.random() < 0.25;
  for (let k = 0; k < 24; k++) {
    const a = back && k < 8 ? p.face + Math.PI + rnd(-0.7, 0.7) : rnd(0, 6.283), R = hwOff(a) + rnd(30, 200);
    const tx = ((p.x + Math.cos(a) * R) / T) | 0, ty = ((p.y + Math.sin(a) * R) / T) | 0;
    if (tx < 1 || ty < 1 || tx >= MW - 1 || ty >= MH - 1) continue;
    let best = -1, bd = 36;
    for (const i of L.exits) { const dx = i % MW - tx, dy = ((i / MW) | 0) - ty, dd = dx * dx + dy * dy; if (dd < bd && G.flow[i] >= 0) { bd = dd; best = i; } }
    if (best < 0) best = G.map[ty * MW + tx] && G.flow[ty * MW + tx] >= 0 ? ty * MW + tx : -1;
    if (best < 0) continue;
    const { x, y } = tileC(best), [sx, sy] = proj(x, y);
    if (sx > -100 && sx < W + 100 && sy > -40 && sy < H + 150) continue; // im Bild: anderer Ort
    if (!L.doors.includes(best)) oaDig(x, y);
    for (let j = 0; j < n; j++) {
      let ex = x, ey = y;
      for (let tries = 0; tries < 6; tries++) { const qx = x + rnd(-44, 44), qy = y + rnd(-44, 44); if (free(qx, qy, t.r)) { ex = qx; ey = qy; break; } }
      spawnMon(t, ex, ey, kind === 'unique' && j ? 'minion' : kind).awake = true;
    }
    return true;
  }
  return false;
}
// Nachschub: alle 2 s eine Gruppe, bei weniger als 15 lebenden Gegnern jede Sekunde; höchstens OA_CAP leben gleichzeitig, Brut eingeschlossen
function oaRounds(dt) {
  if (!G.queue.length || (G.waveT -= dt) > 0) return;
  const alive = G.te.length;
  if (alive + G.queue[0].n > OA_CAP) return;
  if (oaSpawn(G.queue[0])) { G.queue.shift(); G.waveT = alive < 15 ? 1 : 2; } else G.waveT = 0.5;
}

// ---------- Mittagslicht, Wind, Pfeile ----------
// helles, fast weißes Mittagslicht über dem ganzen Bild
function oaGrade() {
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,240,205,.24)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}
// Automap aufdecken, Sand weht über den Boden (wie auf dem Highway)
OAH.update.push(dt => { oaReveal(); hwDust(dt); });
// Pfeile am Bildschirmrand zu den letzten Gegnern außerhalb des Bildes, wie auf dem Highway (umgebung.js)
OAH.over.push(() => {
  if (G.phase !== 'fight' || enemiesLeft() > 5) return;
  const [hx, hy] = proj(G.player.x, G.player.y), m = 40, mb = 185 / VS, pl = 0.75 + 0.25 * Math.sin(G.t * 6); // unten über Leiste und Schnelltasten
  for (const e of G.te) {
    if (e.dead) continue;
    const [sx, sy] = proj(e.x, e.y);
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const dx = sx - hx, dy = sy - hy, k = Math.min(dx > 0 ? (W - m - hx) / dx : dx < 0 ? (m - hx) / dx : 1e9, dy > 0 ? (H - mb - hy) / dy : dy < 0 ? (m - hy) / dy : 1e9);
    const x = hx + dx * k, y = hy + dy * k;
    glowDot(ctx, x, y, 34, `rgba(255,30,20,${0.45 * pl})`);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha = pl;
    ctx.fillStyle = '#e8180e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-14, -16); ctx.lineTo(-7, 0); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
});
