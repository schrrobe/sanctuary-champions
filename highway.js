'use strict';
// Highway der Toten: zweite Karte nach Dead Nation (PS3, Housemarque 2010), eine moderne Wüste bei Tag mit Highway,
// Landstraße, Tankstelle, Diner, Motel, Autowracks, Wohnwagenpark, Farm, Quarantänelager und verlassenem Dorf.
// Die Karte ist immer dieselbe (eigener Zufall mit festem Startwert). Der Boden wird in Kacheln gebacken, Hindernisse
// werden feldweise als Quader gezeichnet und wie die Wände des Sanktuariums mit den Figuren nach Tiefe sortiert.

const HW_N = 313, HW_C = HW_N >> 1, HW_CAP = 330, HW_CH = 16; // Kantenlänge und Mitte in Feldern, Zombies gleichzeitig, Kachel in Feldern
const HG = { sand: 0, road: 1, conc: 2, mud: 3, field: 4, gravel: 5, dirt: 6 }, HGN = Object.keys(HG);
const SUN = [0.75, -0.66]; // Schattenrichtung: das Licht der 3D-Figuren fällt von links vorn ein, Schatten fallen nach rechts
const HW_SPR = ['cactus', 'boulder', 'pump', 'sign', 'board', 'tent', 'tower', 'well']; // als Bild gezeichnet, verdecken keine Seitenflächen
let HW_MAP = null, HWT = null, HWP = null;
const uhash = (x, y) => hash(x, y) >>> 1; // 31 Bit ohne Vorzeichen: Reste und Verschiebungen mit >> bleiben positiv
const HW_CHUNKS = new Map(); // gebackene Bodenkacheln, bleiben über Tod und Rundenwechsel erhalten

// ---------- Erweiterungspunkte ----------
// Zombie-Arten (zombies.js), Endbosse (bosses.js) und Umgebung (umgebung.js) hängen sich hier ein, damit sie den Kern
// nicht ändern müssen. Alle werden nur auf dem Highway der Toten aufgerufen (G.hw), das Chaos-Sanktuarium bleibt unberührt.
// target(tg, e): Ziel eines Zombies ersetzen (Rückgabe: neues Ziel, sonst bleibt es) · act(e, tg, dt, spd): eigenes Verhalten,
// true übernimmt den Zug (vor Fernkampf und Nahkampf, nach Betäubung und Furcht) · hit(src, t, dmg, el, o): neuer Schaden,
// false hebt den Treffer auf · kill(e): direkt nach dem Tod (e.noCorpse verhindert die Leiche) · spawn(e): neuer Gegner ·
// round(d): Rundenstart, G.queue ist gefüllt · props(): Objekte zur Pause · update(dt) · under(): Bodenschicht, ctx in
// Weltkoordinaten (isoT) · sort(list): Einträge { d: x + y, draw() } für die Tiefensortierung · over(): über allem, Bildschirm ·
// light(lamp) und tint(tint): Licht und Farbschein, Bildschirmkoordinaten · pause(): Zusatztext der Pausenleiste
const HWH = { target: [], act: [], hit: [], kill: [], spawn: [], round: [], props: [], update: [], under: [], sort: [], over: [], light: [], tint: [], pause: [] };
const hwEach = (k, ...a) => { for (const f of HWH[k]) f(...a); };
const hwAny = (k, ...a) => HWH[k].some(f => f(...a));
const hwFirst = (k, ...a) => { for (const f of HWH[k]) { const v = f(...a); if (v !== undefined) return v; } };
const hwChain = (k, v, ...a) => { for (const f of HWH[k]) v = f(v, ...a) ?? v; return v; };

// ---------- Kartenaufbau ----------
function hwGen() {
  const N = HW_N, C = HW_C, A = N * N;
  const map = new Uint8Array(A).fill(1), ob = new Uint16Array(A), gr = new Uint8Array(A), hgt = new Uint16Array(A), lot = new Uint8Array(A), draw = new Uint8Array(A);
  const obs = [null], marks = [], decals = [], holes = [];
  let sd = 31337;
  const r = () => (sd = sd * 16807 % 2147483647) / 2147483647, ri = (a, b) => Math.floor(a + r() * (b - a + 1)), rp = a => a[Math.floor(r() * a.length)];
  const I = (x, y) => y * N + x, inMap = (x, y) => x > 0 && y > 0 && x < N - 1 && y < N - 1;
  const each = (x0, y0, x1, y1, f) => { for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) f(I(x, y), x, y); };
  const ground = (x0, y0, x1, y1, g) => each(x0, y0, x1, y1, i => { gr[i] = g; lot[i] = 1; }); // bebaute Flächen bleiben frei von Felsen und Kakteen
  const fits = (x0, y0, w, d, free) => { for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) if (!inMap(x, y) || !map[I(x, y)] || (free && lot[I(x, y)])) return false; return true; };
  // Hindernis über w × d Felder; z: Höhe in Bildpunkten, je Feld über hz(u, v) abwandelbar
  function put(k, x0, y0, w, d, o = {}) {
    if (!fits(x0, y0, w, d, o.free)) return null;
    // d: Zeichentiefe großer Bildobjekte (Mitte statt hinterster Ecke, sonst verdecken Zelte Figuren davor)
    const b = { k, x0, y0, x1: x0 + w - 1, y1: y0 + d - 1, z: 100, seed: ri(0, 9999), spr: HW_SPR.includes(k), d: (x0 + w / 2 + y0 + d / 2) * T, ...o }, id = obs.push(b) - 1;
    each(x0, y0, b.x1, b.y1, (i, x, y) => { map[i] = 0; ob[i] = id; hgt[i] = b.spr ? 0 : b.hz ? b.hz(x - x0, y - y0) : b.z; draw[i] = b.spr ? +(x === b.x1 && y === b.y1) : 1; });
    return b;
  }
  // Fels über beliebige Felder (Felswände am Rand, Tafelberge): Höhe je Feld leicht unruhig
  function rock(st, z, test, [x0, y0, x1, y1] = [0, 0, N - 1, N - 1]) {
    const b = { k: 'rock', st, z, seed: ri(0, 9999) }, id = obs.push(b) - 1;
    each(x0, y0, x1, y1, (i, x, y) => {
      if (!map[i] || !test(x, y, i)) return;
      map[i] = 0; ob[i] = id; draw[i] = 1; hgt[i] = Math.round(z * (0.82 + 0.36 * (uhash(x, y * 3 + id) % 1000) / 1000));
    });
  }
  const line = (x0, y0, x1, y1, c, w, dash) => marks.push({ x0, y0, x1, y1, c, w, dash });
  const CARS = ['#8a2a22', '#2a4a7a', '#d8d4c8', '#c8b48a', '#1e1e20', '#6a3a1a', '#2a7a72', '#c8a020', '#5a5e62', '#7a1e30'], cars = [];

  // Felswände am Rand, mit Schluchten für Highway und Landstraße
  const ph = [r() * 6, r() * 6, r() * 6];
  rock('cliff', 180, (x, y) => {
    const d = Math.min(x, y, N - 1 - x, N - 1 - y), road = (y >= C - 5 && y <= C + 4 && (x < 24 || x > N - 25)) || (x >= C - 4 && x <= C + 3 && (y < 24 || y > N - 25));
    return d === 0 || (!road && d < 8 + 2.5 * Math.sin(x * 0.13 + ph[0]) + 2.5 * Math.sin(y * 0.11 + ph[1]) + 1.5 * Math.sin((x + y) * 0.07 + ph[2]));
  });

  // Highway von West nach Ost (8 Felder, zwei Spuren je Richtung) und Landstraße von Nord nach Süd (6 Felder), Seitenstreifen aus Kies
  const E0 = 6, E1 = N - 7;
  ground(E0, C - 5, E1, C - 5, HG.gravel); ground(E0, C + 4, E1, C + 4, HG.gravel);
  ground(C - 4, E0, C - 4, E1, HG.gravel); ground(C + 3, E0, C + 3, E1, HG.gravel);
  ground(E0, C - 4, E1, C + 3, HG.road); ground(C - 3, E0, C + 2, E1, HG.road);
  for (const [a, b] of [[E0 * T, (C - 3) * T], [(C + 3) * T, (E1 + 1) * T]]) {
    line(a, (C - 4) * T + 5, b, (C - 4) * T + 5, '#e8e4d8', 3); line(a, (C + 4) * T - 5, b, (C + 4) * T - 5, '#e8e4d8', 3);
    line(a, C * T - 4, b, C * T - 4, '#e0b030', 2.5); line(a, C * T + 4, b, C * T + 4, '#e0b030', 2.5);
    for (const y of [(C - 2) * T, (C + 2) * T]) line(a, y, b, y, '#e8e4d8', 2.5, [44, 56]);
  }
  for (const [a, b] of [[E0 * T, (C - 4) * T], [(C + 4) * T, (E1 + 1) * T]]) {
    line((C - 3) * T + 5, a, (C - 3) * T + 5, b, '#e8e4d8', 3); line((C + 3) * T - 5, a, (C + 3) * T - 5, b, '#e8e4d8', 3);
    line(C * T, a, C * T, b, '#e0b030', 2.5, [36, 44]);
  }
  // Haltelinien vor der Kreuzung (Rechtsverkehr)
  line((C - 3) * T + 5, (C - 4) * T - 8, C * T - 4, (C - 4) * T - 8, '#e8e4d8', 6); line(C * T + 4, (C + 4) * T + 8, (C + 3) * T - 5, (C + 4) * T + 8, '#e8e4d8', 6);
  line((C - 3) * T - 8, C * T + 4, (C - 3) * T - 8, (C + 4) * T - 5, '#e8e4d8', 6); line((C + 3) * T + 8, (C - 4) * T + 5, (C + 3) * T + 8, C * T - 4, '#e8e4d8', 6);
  // Gullys auf den Fahrbahnen: Austrittspunkte der Horden
  for (let k = E0 + 14; k < E1 - 8; k += 23) if (Math.abs(k - C) > 10) { holes.push(I(k, C + ((k / 23) & 1 ? 1 : -2)), I(C + ((k / 23) & 1 ? 1 : -2), k)); }
  // Sperren an den Straßenenden vor den Felswänden
  for (let y = C - 5; y <= C + 4; y++) { put('jersey', E0 + 1, y, 1, 1, { z: 50 }); put('jersey', E1 - 1, y, 1, 1, { z: 50 }); }
  for (let x = C - 4; x <= C + 3; x++) { put('jersey', x, E0 + 1, 1, 1, { z: 50 }); put('jersey', x, E1 - 1, 1, 1, { z: 50 }); }

  // ---------- Kreuzung: Tankstelle, Diner, Motel ----------
  ground(C - 27, C - 25, C - 5, C - 6, HG.conc);
  put('bld', C - 24, C - 22, 10, 7, { st: 'shop', z: 118, col: '#e2dccd', roof: '#8c867a', band: '#b82a20', text: 'GAS · FOOD', door: 6 });
  for (const y of [C - 13, C - 9]) { decals.push({ k: 'island', x: (C - 22) * T, y: y * T + 6, w: 11 * T, h: T - 12 }); for (const x of [C - 21, C - 17, C - 13]) put('pump', x, y, 1, 1, { z: 52 }); }
  put('sign', C - 7, C - 7, 1, 1, { z: 230, text: 'GAS', col: '#c8281e' });
  ground(C + 4, C - 25, C + 28, C - 6, HG.conc);
  put('bld', C + 9, C - 21, 16, 8, { st: 'diner', z: 108, col: '#ece2c8', roof: '#6e6e6c', band: '#2aa39a', text: 'DINER', door: 3 });
  put('sign', C + 6, C - 7, 1, 1, { z: 240, text: 'DINER', col: '#2aa39a' });
  ground(C - 42, C + 5, C - 5, C + 32, HG.conc);
  put('bld', C - 40, C + 17, 27, 6, { st: 'motel', z: 128, col: '#e6d6b4', roof: '#7a5a48', band: '#c0502a', text: 'MOTEL' });
  put('bld', C - 11, C + 9, 6, 6, { st: 'office', z: 112, col: '#e6d6b4', roof: '#7a5a48', band: '#c0502a', text: 'OFFICE', door: 2 });
  put('sign', C - 7, C + 6, 1, 1, { z: 250, text: 'MOTEL', col: '#d03030' });
  for (let x = C - 39; x < C - 14; x += 3) decals.push({ k: 'park', x: x * T, y: (C + 24) * T, h: 4 * T });
  put('board', C + 16, C + 11, 1, 3, { z: 210, text: 'LAST GAS 80 MI' });
  // umgestürzter Tanklaster quer über der Gegenfahrbahn, Gefangenenbus im Graben der Landstraße
  put('tanker', C + 40, C - 3, 8, 2, { along: 'x', dir: 1, z: 76, col: '#d6d6d0', cab: '#a8241c', hz: u => u > 5 ? 84 : 76 });
  decals.push({ k: 'spill', x: (C + 44) * T, y: (C - 1) * T, r: 4 * T });
  put('bus', C + 3, C - 64, 1, 5, { along: 'y', dir: -1, z: 104, col: '#e4e2da', band: '#28407a', text: 'CORRECTIONS' });
  // Autowracks; der Platz um die Kreuzung, auf dem der Held beginnt, bleibt frei
  // Autos 2 × 1 Felder (etwa 4,7 × 2,3 m)
  function car(x0, y0, along, o = {}) {
    const w = along === 'x' ? 2 : 1, d = along === 'x' ? 1 : 2;
    if (x0 + w > C - 8 && x0 < C + 9 && y0 + d > C - 8 && y0 < C + 9) return null;
    const burnt = r() < 0.22, b = put('car', x0, y0, w, d, { along, dir: r() < 0.5 ? 1 : -1, col: burnt ? '#3a2e26' : rp(CARS), burnt, z: 66, ...o });
    if (b) cars.push(b);
    return b;
  }
  for (const [x, y, a] of [[C + 11, C - 12, 'y'], [C + 14, C - 12, 'y'], [C + 17, C - 11, 'y'], [C + 21, C - 12, 'y'], [C - 19, C - 23, 'x'], [C - 37, C + 26, 'y'], [C - 33, C + 27, 'y'], [C - 28, C + 26, 'y'], [C - 22, C + 26, 'y'], [C - 16, C + 27, 'y'], [C - 30, C + 8, 'x']]) car(x, y, a);

  // ---------- Quarantänelager mit Zaun, Zelten und Militärlastern ----------
  const QX = 204, QY = 182, QW = 56, QD = 44, gate = QX + 26;
  ground(QX, QY, QX + QW - 1, QY + QD - 1, HG.gravel);
  ground(gate, C + 5, gate + 5, QY + 4, HG.dirt);
  for (let x = QX; x < QX + QW; x++) { if (x < gate || x > gate + 5) put('fence', x, QY, 1, 1, { z: 116 }); put('fence', x, QY + QD - 1, 1, 1, { z: 116 }); }
  for (let y = QY + 1; y < QY + QD - 1; y++) { put('fence', QX, y, 1, 1, { z: 116 }); put('fence', QX + QW - 1, y, 1, 1, { z: 116 }); }
  for (let i = 0; i < 8; i++) put('tent', QX + 4 + (i % 4) * 12 + (i % 4 > 1 ? 4 : 0), QY + 7 + Math.floor(i / 4) * 15, 5, 4, { z: 104, col: i % 3 ? '#dcdad0' : '#6a6e4a', cross: i % 3 !== 0 });
  for (const [x, y] of [[QX + 6, QY + 36], [QX + 11, QY + 35], [QX + 44, QY + 34]]) put('truck', x, y, 1, 3, { along: 'y', dir: -1, z: 96, col: '#5c6240', cover: '#727852' });
  const bags = (x, y, w, d) => each(x, y, x + w - 1, y + d - 1, (i, xx, yy) => put('bag', xx, yy, 1, 1, { z: 44 }));
  bags(gate - 4, QY + 4, 4, 1); bags(gate + 6, QY + 4, 4, 1); bags(gate - 4, QY + 5, 1, 3); bags(gate + 9, QY + 5, 1, 3);
  // Straßensperren aus Sandsäcken und Betonblöcken auf Highway und Landstraße
  for (let y = C - 5; y <= C + 4; y++) if (y < C - 1 || y > C) put('bag', gate - 12, y, 1, 1, { z: 44 });
  for (const y of [C - 4, C - 3, C + 2, C + 3]) put('jersey', gate - 17, y, 1, 1, { z: 50 });
  put('truck', gate - 14, C + 6, 3, 1, { along: 'x', dir: -1, z: 96, col: '#5c6240', cover: '#727852' });
  for (let x = C - 4; x <= C + 3; x++) if (x < C - 1 || x > C) put('bag', x, C + 80, 1, 1, { z: 44 });
  for (const x of [C - 3, C + 2]) put('jersey', x, C + 75, 1, 1, { z: 50 });

  // ---------- Wohnwagenpark ----------
  const TX = 40, TY = 190;
  ground(TX, TY, TX + 62, TY + 52, HG.gravel);
  ground(TX + 30, C + 5, TX + 33, TY, HG.dirt);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    const x = TX + 3 + i * 15, y = TY + 6 + row * 16;
    put('bld', x, y, 9, 3, { st: 'trailer', z: 96, col: rp(['#e8e4d8', '#d8ccb0', '#a8c8c0', '#e0d0a0']), roof: '#b4b0a4', band: rp(['#2a6a8a', '#8a3a2a', '#4a7a3a', '#a07a2a']), door: 6 });
    if (r() < 0.6) car(x + ri(0, 6), y + 4, 'x');
  }

  // ---------- Farm mit Scheune, Wasserturm und Acker ----------
  const FX = 204, FY = 44;
  ground(FX, FY, FX + 50, FY + 30, HG.dirt);
  ground(FX, FY + 32, FX + 50, FY + 56, HG.field);
  ground(C + 4, FY + 18, FX, FY + 21, HG.dirt);
  put('bld', FX + 4, FY + 4, 9, 8, { st: 'house', z: 128, col: '#d8d0bc', roof: '#5a4a40', door: 4 });
  put('bld', FX + 22, FY + 2, 13, 11, { st: 'barn', z: 190, col: '#9a2a1e', roof: '#5c4c46', door: 6 });
  put('tower', FX + 40, FY + 10, 3, 3, { z: 330 });
  put('car', FX + 14, FY + 22, 2, 1, { st: 'tractor', along: 'x', dir: 1, col: '#3a7a2a', z: 92 });

  // ---------- Verlassenes Dorf um einen Platz mit Brunnen ----------
  const VX = 76, VY = 74;
  ground(VX - 13, VY - 11, VX + 13, VY + 11, HG.dirt);
  ground(VX + 13, VY - 2, C - 5, VY + 1, HG.dirt);
  put('well', VX - 1, VY - 1, 2, 2, { z: 64 });
  put('bld', VX - 4, VY - 26, 9, 13, { st: 'church', z: 150, col: '#e8e0d0', roof: '#8a5a3a', door: 4, hz: (u, v) => v >= 10 && u >= 3 && u <= 5 ? 270 : 150 });
  const ADOBE = ['#c9a27a', '#d4b08a', '#b88e66', '#e0c8a8'];
  [[-27, -14, 7, 6], [-27, -4, 6, 6], [-27, 6, 7, 6], [-15, 15, 6, 6], [-4, 15, 8, 6], [9, 15, 6, 7], [17, -16, 7, 6], [17, 4, 6, 6], [-17, -25, 6, 6], [9, -26, 7, 6], [26, -12, 6, 6]].forEach(([dx, dy, w, d], k) => {
    const ruin = k % 4 === 3;
    put('bld', VX + dx, VY + dy, w, d, { st: 'adobe', z: 116, col: ADOBE[k % 4], roof: '#a07a58', ruin, door: w >> 1, hz: ruin ? (u, v) => 50 + uhash(u + dx, v + dy) % 70 : null });
  });

  // ---------- Ausgetrocknete Flussbetten ----------
  for (const [x0, y0, ang] of [[18, 112, 0.35], [120, 300, -1.2]]) {
    let x = x0, y = y0, a = ang;
    for (let s = 0; s < 360; s++) {
      a += (r() - 0.5) * 0.35; x += Math.cos(a) * 1.4; y += Math.sin(a) * 1.4;
      const w = 2.2 + 1.6 * Math.sin(s * 0.05);
      each(Math.floor(x - w), Math.floor(y - w), Math.ceil(x + w), Math.ceil(y + w), (i, xx, yy) => { if (!lot[i] && (xx - x) ** 2 + (yy - y) ** 2 <= w * w) { gr[i] = HG.mud; lot[i] = 2; } });
      if (x < 8 || y < 8 || x > N - 8 || y > N - 8) break;
    }
  }

  // ---------- Autowracks auf Highway und Landstraße, teils als Massenkarambolage ----------
  for (let n = 0, tries = 0; n < 70 && tries < 1200; tries++) {
    const x = ri(E0 + 4, E1 - 6);
    if (car(x, ri(C - 4, C + 3), r() < 0.12 ? 'y' : 'x')) n++;
    if (r() < 0.25) for (let k = ri(2, 5); k > 0; k--) car(x + ri(-5, 5), ri(C - 5, C + 4), r() < 0.3 ? 'y' : 'x'); // Massenkarambolage
  }
  for (let n = 0, tries = 0; n < 40 && tries < 800; tries++) if (car(ri(C - 3, C + 2), ri(E0 + 4, E1 - 6), r() < 0.12 ? 'x' : 'y')) n++;

  // ---------- Tafelberge, Felsen und Kakteen auf freiem Sand ----------
  for (let n = 0, tries = 0; n < 10 && tries < 400; tries++) {
    const cx = ri(26, N - 27), cy = ri(26, N - 27), R = ri(7, 14), p1 = r() * 6, p2 = r() * 6;
    let clear = true;
    each(cx - R - 5, cy - R - 5, cx + R + 5, cy + R + 5, i => { if (lot[i] || !map[i]) clear = false; });
    if (!clear) continue;
    rock('mesa', ri(150, 220), (x, y) => { const a = Math.atan2(y - cy, x - cx), d = Math.hypot(x - cx, y - cy); return d <= R * (1 + 0.22 * Math.sin(3 * a + p1) + 0.12 * Math.sin(5 * a + p2)); }, [cx - R * 2, cy - R * 2, cx + R * 2, cy + R * 2]);
    n++;
  }
  for (let n = 0, tries = 0; n < 45 && tries < 900; tries++) { const w = ri(2, 3), d = ri(2, 3); if (put('rock', ri(10, N - 12), ri(10, N - 12), w, d, { st: 'stones', z: ri(52, 86), free: true, hz: (u, v) => 40 + uhash(u * 7 + n, v * 5) % 50 })) n++; }
  for (let n = 0, tries = 0; n < 170 && tries < 2000; tries++) if (put('boulder', ri(8, N - 9), ri(8, N - 9), 1, 1, { z: ri(24, 44), free: true })) n++;
  for (let n = 0, tries = 0; n < 300 && tries < 3000; tries++) if (put('cactus', ri(8, N - 9), ri(8, N - 9), 1, 1, { z: ri(72, 128), free: true })) n++;

  // Benzinfässer an Tankstelle, Farm, Straßensperren und im Quarantänelager; feste Felder ohne Zufall, damit die Karte gleich bleibt
  const fuel = [];
  for (const [x, y] of [
    [C - 14, C - 21], [C - 14, C - 20], [C - 13, C - 21], [C - 25, C - 19], [C - 25, C - 18], [C - 24, C - 12], [C - 24, C - 10],
    [FX + 21, FY + 5], [FX + 21, FY + 6], [FX + 20, FY + 5], [FX + 39, FY + 13], [FX + 43, FY + 13], [FX + 17, FY + 23],
    [gate - 11, C - 5], [gate - 11, C - 4], [gate - 11, C + 3], [gate - 11, C + 4], [C - 5, C + 79], [C - 5, C + 80], [C + 4, C + 79], [C + 4, C + 80],
    [QX + 8, QY + 37], [QX + 8, QY + 38], [QX + 13, QY + 36], [gate - 3, QY + 6], [gate + 8, QY + 6], [QX + 46, QY + 32], [QX + 47, QY + 32],
  ]) { const i = I(x, y); if (map[i] && !fuel.includes(i)) fuel.push(i); }

  // Austrittspunkte: freie Felder an Gebäuden, Bussen, Lastern, Zelten und Wohnwagen, dazu die Gullys
  const exits = [...holes];
  for (let i = 0; i < A; i++) {
    if (!map[i]) continue;
    for (const d of [1, -1, N, -N]) { const o = obs[ob[i + d]]; if (!map[i + d] && o && ['bld', 'bus', 'truck', 'tent', 'tanker'].includes(o.k)) { exits.push(i); break; } }
  }
  // Umrisse für die Automap: Gebäude, Fahrzeuge, Felsen und Zäune, ohne Kakteen und kleine Steine
  const auto = new Uint8Array(A);
  for (let i = 0; i < A; i++) if (!map[i] && !['cactus', 'boulder', 'pump', 'sign', 'board'].includes(obs[ob[i]]?.k)) auto[i] = 1;
  return { map, ob, obs, gr, hgt, draw, auto, marks, decals, holes, exits, cars, fuel, start: { x: (C + 0.5) * T, y: (C + 0.5) * T } };
}

// Automap: ein Bildpunkt je Feld, Straßen grau, Plätze hell, Hindernisse als Umriss
function hwMini() {
  const L = G.L, N = HW_N, c = mkCanvas(N), g = c.getContext('2d'), d = g.createImageData(N, N), a = d.data;
  const COL = { [HG.road]: [150, 150, 150, 200], [HG.conc]: [190, 185, 170, 160], [HG.gravel]: [170, 160, 140, 110], [HG.dirt]: [170, 140, 100, 90], [HG.field]: [150, 120, 80, 90], [HG.mud]: [140, 110, 80, 80] };
  for (let i = 0; i < N * N; i++) {
    let v = COL[L.gr[i]];
    if (L.auto[i]) v = [L.obs[L.ob[i]].k === 'rock' ? 150 : 225, L.obs[L.ob[i]].k === 'rock' ? 100 : 205, L.obs[L.ob[i]].k === 'rock' ? 70 : 160, 230];
    if (!v) continue;
    a.set(v, i * 4);
  }
  g.putImageData(d, 0, 0);
  return c;
}

// ---------- Texturen ----------
function hwTex() {
  if (HWT) return HWT;
  const sandy = (base, cols) => tex(256, base, (g, s) => { blobs(g, s, 40, cols, 14, 50, 0.45); strokes(g, s, 220, ['rgba(110,80,45,.55)', 'rgba(245,222,180,.55)'], 30, 1.3, 0.3, 0.2); blobs(g, s, 300, ['#a8865a', '#e2c79a', '#8a6a44'], 0.6, 2, 0.7); grain(g, s, 12); });
  HWT = {
    sand: sandy('#c2a57c', ['#b89c72', '#ccb18a', '#bea07a']),
    road: tex(256, '#4f4d49', (g, s) => { blobs(g, s, 30, ['#484642', '#58554f', '#42403c'], 12, 40, 0.5); blobs(g, s, 1100, ['#625f59', '#3a3835', '#6e6a63'], 0.5, 1.4, 0.8); cracks(g, s, 6, '#2c2a27', 0.5, 1); grain(g, s, 16); }),
    conc: tex(256, '#aca89e', (g, s) => { blobs(g, s, 26, ['#a19d93', '#b6b2a8', '#99958b'], 14, 48, 0.45); blobs(g, s, 420, ['#8f8b81', '#c2beb4'], 0.6, 1.6, 0.6); cracks(g, s, 4, '#6e6b64', 0.5, 0.9); g.fillStyle = 'rgba(70,66,58,.4)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s); g.fillRect(0, s / 2, s, 1); g.fillRect(s / 2, 0, 1, s); grain(g, s, 10); }),
    mud: tex(256, '#a88664', (g, s) => { blobs(g, s, 30, ['#9d7b59', '#b3916d'], 12, 40, 0.5); cracks(g, s, 70, '#5a4230', 0.7, 1.6); cracks(g, s, 40, '#c8a882', 0.35, 0.8); grain(g, s, 14); }),
    field: tex(256, '#8e6e4c', (g, s) => { blobs(g, s, 40, ['#816343', '#9b7a51'], 10, 36, 0.5); for (let y = 4; y < s; y += 10) { g.fillStyle = 'rgba(60,40,22,.45)'; g.fillRect(0, y, s, 3); g.fillStyle = 'rgba(190,160,110,.35)'; g.fillRect(0, y + 3, s, 1); } strokes(g, s, 500, ['#c8a85a', '#a88a40', '#e0c878'], 6, 1.2, 0.8, -1.4); grain(g, s, 14); }),
    gravel: tex(256, '#a2967f', (g, s) => { blobs(g, s, 1500, ['#8a7e6a', '#b8ac96', '#766a58', '#cabea8'], 0.8, 2.6, 0.85); grain(g, s, 16); }),
    dirt: tex(256, '#a5845b', (g, s) => { blobs(g, s, 40, ['#997852', '#af8e64', '#8e6e4a'], 12, 44, 0.5); blobs(g, s, 320, ['#7a5c3c', '#bea072'], 0.6, 2, 0.6); grain(g, s, 14); }),
    // Wandflächen: roter Sandstein in Schichten, Putz, Lehm, Bretter, Sandsäcke
    rock: tex(128, '#a8653f', (g, s) => { for (let y = 0; y < s; y += 4 + (y % 9)) { g.fillStyle = `rgba(${y % 3 ? '70,30,12' : '230,170,120'},${0.12 + (y % 5) * 0.03})`; g.fillRect(0, y, s, 2 + (y % 3)); } blobs(g, s, 60, ['#96583a', '#bc7a4e', '#8a4e30'], 3, 12, 0.5); cracks(g, s, 10, '#5a2e18', 0.6, 1.2); grain(g, s, 22); }),
    top: tex(128, '#b88a5a', (g, s) => { blobs(g, s, 50, ['#a87a4c', '#c89a68', '#9a6e44'], 4, 16, 0.6); blobs(g, s, 40, ['#6a6a38', '#58602e'], 1.5, 4, 0.7); grain(g, s, 18); }),
    stucco: tex(128, '#d8d0be', (g, s) => { blobs(g, s, 60, ['#cfc6b2', '#e2dac8'], 4, 18, 0.5); grain(g, s, 12); }),
    plank: tex(128, '#ffffff', (g, s) => { for (let y = 0; y < s; y += 10) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, s, 1.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + 1.5, s, 1); } grain(g, s, 18); }),
    roof: tex(128, '#808080', (g, s) => { blobs(g, s, 900, ['#5a5a5a', '#a8a8a8', '#707070', '#949494'], 0.5, 1.8, 0.8); blobs(g, s, 14, ['rgba(40,40,40,.5)', 'rgba(200,200,200,.35)'], 8, 24, 0.3); grain(g, s, 18); }),
    mesh: (() => { const c = mkCanvas(14), g = c.getContext('2d'); g.strokeStyle = 'rgba(200,205,205,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(14, 14); g.moveTo(14, 0); g.lineTo(0, 14); g.stroke(); return c; })(),
    bag: tex(64, '#6e5c3e', (g, s) => { for (let y = 0; y < s; y += 11) for (let x = (y / 11 % 2) * 11; x < s + 11; x += 22) { g.fillStyle = shade('#b8a074', ((x * 7 + y) % 5 - 2) * 0.03); g.beginPath(); g.roundRect(x - 11, y + 1, 21, 9.5, 4.5); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - 8, y + 2, 15, 2); } grain(g, s, 14); }),
  };
  return HWT;
}
function hwPat() {
  if (HWP) return HWP;
  const X = hwTex();
  return HWP = Object.fromEntries(['rock', 'top', 'stucco', 'plank', 'bag', 'mesh', 'roof'].map(k => [k, ctx.createPattern(X[k], 'repeat')]));
}

// ---------- Boden in Kacheln ----------
let hwMask = null;
function hwBake(cx, cy) {
  const L = G.L, S = HW_CH * T, ox = cx * S, oy = cy * S, X = hwTex(), c = mkCanvas(S), g = c.getContext('2d'), N = HW_N;
  const tx0 = cx * HW_CH, ty0 = cy * HW_CH, tx1 = tx0 + HW_CH - 1, ty1 = ty0 + HW_CH - 1;
  const G0 = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? 0 : L.gr[y * N + x];
  const pat = k => g.createPattern(X[k], 'repeat'); // in Weltkoordinaten gefüllt: Muster laufen über die Kachelgrenzen weiter
  g.translate(-ox, -oy);
  g.fillStyle = pat('sand'); g.fillRect(ox, oy, S, S);
  for (let k = 1; k < HGN.length; k++) {
    g.beginPath(); let any = false;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) if (G0(x, y) === k) { g.rect(x * T, y * T, T, T); any = true; }
    if (any) { g.fillStyle = pat(HGN[k]); g.fill(); }
  }
  // weiche Übergänge: Sandverwehungen über Straßen- und Platzkanten, dunkler Rand an Flussbetten
  const sandP = pat('sand');
  for (let y = ty0 - 1; y <= ty1 + 1; y++) for (let x = tx0 - 1; x <= tx1 + 1; x++) {
    const k = G0(x, y);
    for (const [dx, dy] of DIRS4) {
      const n = G0(x + dx, y + dy);
      if (n === k || (k !== HG.sand && n !== HG.sand)) continue;
      const h = uhash(x * 3 + dx, y * 5 + dy), ex = (x + 0.5 + dx * 0.5) * T, ey = (y + 0.5 + dy * 0.5) * T;
      if (k === HG.mud || n === HG.mud) { g.fillStyle = 'rgba(90,62,40,.22)'; g.fillRect(ex - (dy ? T / 2 : 3), ey - (dx ? T / 2 : 3), dy ? T : 6, dx ? T : 6); }
      g.fillStyle = sandP;
      for (let j = 0; j < 3; j++) { const a = (h >> (j * 4)) % 16 / 16, rr = 5 + (h >> (j * 3 + 2)) % 9; g.beginPath(); g.ellipse(ex + (dy ? (a - 0.5) * T : 0), ey + (dx ? (a - 0.5) * T : 0), rr * (dx ? 0.7 : 1.4), rr * (dy ? 0.7 : 1.4), 0, 0, 7); g.fill(); }
    }
  }
  // Fahrbahnmarkierungen, leicht verblasst
  g.globalAlpha = 0.82; g.lineCap = 'butt';
  for (const m of L.marks) {
    if (Math.max(m.x0, m.x1) < ox - 10 || Math.min(m.x0, m.x1) > ox + S + 10 || Math.max(m.y0, m.y1) < oy - 10 || Math.min(m.y0, m.y1) > oy + S + 10) continue;
    g.strokeStyle = m.c; g.lineWidth = m.w; g.setLineDash(m.dash || []); g.beginPath(); g.moveTo(m.x0, m.y0); g.lineTo(m.x1, m.y1); g.stroke();
  }
  g.setLineDash([]); g.globalAlpha = 1;
  // Kleinkram je Feld: Büsche, Steppenläufer, Steine, Ölflecken, Risse, Furchen
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    const k = G0(x, y), h = uhash(x, y), q = h % 100, px = x * T + 6 + h % 28, py = y * T + 6 + (h >> 6) % 28;
    if (k === HG.sand && L.map[y * N + x]) {
      if (q < 7) { g.strokeStyle = q < 4 ? '#6a5a32' : '#7a6a3a'; g.lineWidth = 1.4; for (let j = 0; j < 9; j++) { const a = j * 0.7 + h; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * (6 + (h >> j) % 7), py + Math.sin(a) * (4 + (h >> j) % 5) - 2); g.stroke(); } }
      else if (q < 9) { g.strokeStyle = 'rgba(120,90,50,.85)'; g.lineWidth = 1; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(px, py, 7 - j, 5 - j * 0.6, j, 0, 6); g.stroke(); } }
      else if (q < 16) for (let j = 0; j < 4; j++) disc(g, px + ((h >> j * 3) % 13) - 6, py + ((h >> j * 2) % 9) - 4, 1.2 + (h >> j) % 3 * 0.6, j % 2 ? '#8a7454' : '#e0caa0');
    } else if (k === HG.road) {
      if (q < 4) { g.fillStyle = 'rgba(20,18,16,.28)'; g.beginPath(); g.ellipse(px, py, 10 + q * 3, 6 + q, h % 3, 0, 7); g.fill(); }
      else if (q < 7) { g.strokeStyle = 'rgba(30,28,26,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 12, py); g.quadraticCurveTo(px, py - 8 + q * 2, px + 14, py + 4); g.stroke(); }
    } else if (k === HG.conc && q < 5) { g.fillStyle = 'rgba(40,36,30,.18)'; g.beginPath(); g.ellipse(px, py, 9 + q * 2, 6, h % 3, 0, 7); g.fill(); }
  }
  for (const d of L.decals) {
    const R = d.r || Math.max(d.w || 0, d.h || 0);
    if (d.x + R < ox || d.x - R > ox + S || d.y + R < oy || d.y - R > oy + S) continue;
    if (d.k === 'spill') { const gg = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); gg.addColorStop(0, 'rgba(24,20,16,.62)'); gg.addColorStop(0.7, 'rgba(40,32,24,.35)'); gg.addColorStop(1, 'rgba(40,32,24,0)'); g.fillStyle = gg; g.beginPath(); g.ellipse(d.x, d.y, d.r * 1.4, d.r * 0.8, 0.2, 0, 7); g.fill(); }
    else if (d.k === 'island') { g.fillStyle = '#bcb8ae'; g.fillRect(d.x, d.y, d.w, d.h); g.strokeStyle = '#d8b020'; g.lineWidth = 3; g.strokeRect(d.x, d.y, d.w, d.h); }
    else if (d.k === 'park') { g.strokeStyle = 'rgba(235,230,215,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x, d.y + d.h); g.stroke(); }
  }
  for (const i of L.holes) {
    const x = (i % N + 0.5) * T, y = ((i / N | 0) + 0.5) * T;
    if (x < ox - T || x > ox + S + T || y < oy - T || y > oy + S + T) continue;
    disc(g, x, y, 13, '#2c2a28'); g.strokeStyle = '#5a5650'; g.lineWidth = 1.5;
    for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x - 10, y + j * 4); g.lineTo(x + 10, y + j * 4); g.stroke(); }
  }
  // Schatten am Fuß der Hindernisse und lange Schatten der Nachmittagssonne
  hwMask ||= mkCanvas(S);
  const m = hwMask.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, S, S); m.translate(-ox, -oy); m.fillStyle = '#000';
  for (let y = ty0 - 2; y <= ty1 + 8; y++) for (let x = tx0 - 8; x <= tx1 + 2; x++) {
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const i = y * N + x, o = L.obs[L.ob[i]];
    if (!o || o.k === 'fence') continue;
    let z = L.hgt[i], x0 = x * T, y0 = y * T, x1 = x0 + T, y1 = y0 + T;
    if (o.spr) { if (!L.draw[i]) continue; z = o.z * (o.k === 'tower' ? 0.8 : 0.7); const w = { cactus: 5, sign: 3, pump: 9, boulder: 13, board: 4 }[o.k]; if (w) { const cx2 = x0 + T / 2, cy2 = y0 + T / 2; x0 = cx2 - w; x1 = cx2 + w; y0 = cy2 - w; y1 = cy2 + w; } else { x0 = o.x0 * T + 6; y0 = o.y0 * T + 6; x1 = (o.x1 + 1) * T - 6; y1 = (o.y1 + 1) * T - 6; } }
    const vx = SUN[0] * z * 0.42, vy = SUN[1] * z * 0.42;
    m.beginPath(); m.moveTo(x0, y1); m.lineTo(x0, y0); m.lineTo(x0 + vx, y0 + vy); m.lineTo(x1 + vx, y0 + vy); m.lineTo(x1 + vx, y1 + vy); m.lineTo(x1, y1); m.closePath(); m.fill();
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.3; g.drawImage(hwMask, 0, 0); g.globalAlpha = 1; g.translate(-ox, -oy);
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (!L.map[y * N + x]) continue;
    for (const [dx, dy] of DIRS4) if (L.hgt[(y + dy) * N + x + dx] > 0) for (let k = 0; k < 3; k++) {
      g.fillStyle = `rgba(30,18,8,${0.18 - k * 0.05})`;
      if (dx === 1) g.fillRect(x * T + T - (k + 1) * 4, y * T, 4, T); else if (dx === -1) g.fillRect(x * T + k * 4, y * T, 4, T);
      else if (dy === 1) g.fillRect(x * T, y * T + T - (k + 1) * 4, T, 4); else g.fillRect(x * T, y * T + k * 4, T, 4);
    }
  }
  return c;
}
// sichtbare Kacheln zeichnen; fehlende entstehen nach und nach (eine je Bild, beim Kartenstart alle sichtbaren auf einmal)
function hwFloor() {
  const S = HW_CH * T, n = Math.ceil(HW_N / HW_CH), p = G.player;
  let budget = G.floorWarm ? 1 : 99;
  G.floorWarm = true;
  const pcx = (p.x / S) | 0, pcy = (p.y / S) | 0;
  for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
    if (Math.abs(cx - pcx) > 4 || Math.abs(cy - pcy) > 4) continue;
    const xs = [cx * S, (cx + 1) * S], ys = [cy * S, (cy + 1) * S];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of xs) for (const y of ys) { const [sx, sy] = proj(x, y); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    if (x1 < -40 || x0 > W + 40 || y1 < -40 || y0 > H + 260) continue;
    const k = cy * n + cx;
    let c = HW_CHUNKS.get(k);
    if (!c && budget-- > 0) { c = hwBake(cx, cy); HW_CHUNKS.set(k, c); }
    if (c) { c.used = G.t; ctx.drawImage(c, cx * S, cy * S); }
    else { ctx.fillStyle = '#c4a06a'; ctx.fillRect(cx * S, cy * S, S, S); }
  }
  // höchstens 40 Kacheln behalten (je 0,4 Mio. Bildpunkte), zuerst die am längsten unbenutzten
  if (HW_CHUNKS.size > 40) { let old = null; for (const [k, c] of HW_CHUNKS) if (!old || c.used < old[1].used) old = [k, c]; HW_CHUNKS.delete(old[0]); }
}

// ---------- Hindernisse ----------
// Quader von (x0, y0) bis (x1, y1) zwischen den Höhen zb und zt: zum Betrachter zeigen die Fläche bei y1 (links unten)
// und die bei x1 (rechts unten), darüber die Oberseite. Flächen: lokales x längs der Kante (links nach rechts), y nach oben negativ
function hwBox(x0, y0, x1, y1, zb, zt, fy, fx, ft) {
  if (fy) { const [sx, sy] = proj(x0, y1); tf(Z, Z / 2, 0, 1, sx, sy - zb); fy(x1 - x0, zt - zb); }
  if (fx) { const [sx, sy] = proj(x1, y1); tf(Z, -Z / 2, 0, 1, sx, sy - zb); fx(y1 - y0, zt - zb); }
  if (ft) { tf(Z, Z / 2, -Z, Z / 2, cam.x, cam.y - zt); ft(x0, y0, x1 - x0, y1 - y0); }
  scrT();
}
const hwLit = (col, k) => k ? shade(col, -0.24) : shade(col, -0.08); // linke Flächen im Licht, rechte im Schatten
function hwObst(tx, ty, fade) {
  const L = G.L, i = ty * MW + tx, o = L.obs[L.ob[i]];
  if (!o) return;
  ctx.globalAlpha = fade;
  if (o.spr) hwSprite(o); else (HW_BLOCK[o.k] || HW_BLOCK.rock)(o, tx, ty, i);
  ctx.globalAlpha = 1;
  scrT();
}
// Seitenflächen nur dort, wo das Nachbarfeld niedriger ist
const hwOpen = (i, d, z) => G.L.hgt[i + d] < z;
function hwWindow(x, y, w, h, frame) {
  ctx.fillStyle = frame; ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  ctx.fillStyle = '#26303a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(200,220,235,.22)'; ctx.beginPath(); ctx.moveTo(x, y + h * 0.7); ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x + w * 0.75, y); ctx.lineTo(x, y + h); ctx.fill();
}
// Schrift über mehrere Felder einer Fassade: jedes Feld zeichnet seinen Ausschnitt
function hwText(s, k, n, y, size, col) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, T, size * 1.4); ctx.clip();
  ctx.font = `700 ${size}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = col;
  ctx.fillText(s, n * T / 2 - k * T, y); ctx.restore();
}
const HW_BLOCK = {
  rock(o, tx, ty, i) {
    const z = G.L.hgt[i], P = hwPat(), x0 = tx * T, y0 = ty * T;
    const face = k => (len, h) => { ctx.fillStyle = P.rock; ctx.fillRect(0, -h, len, h); ctx.fillStyle = k ? 'rgba(50,18,6,.42)' : 'rgba(80,30,10,.1)'; ctx.fillRect(0, -h, len, h); ctx.fillStyle = 'rgba(30,12,4,.22)'; ctx.fillRect(0, -10, len, 10); };
    hwBox(x0, y0, x0 + T, y0 + T, 0, z, hwOpen(i, MW, z) && face(0), hwOpen(i, 1, z) && face(1), (x, y, w, h) => {
      ctx.fillStyle = P.top; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,225,180,.28)';
      if (hwOpen(i, MW, z)) ctx.fillRect(x, y + h - 3, w, 3);
      if (hwOpen(i, 1, z)) ctx.fillRect(x + w - 3, y, 3, h);
      if (G.L.hgt[i - MW] < z - 20) ctx.fillRect(x, y, w, 2);
      if (G.L.hgt[i - 1] < z - 20) ctx.fillRect(x, y, 2, h);
    });
  },
  bld(o, tx, ty, i) {
    const z = G.L.hgt[i], P = hwPat(), x0 = tx * T, y0 = ty * T, st = o.st, n = { y: o.x1 - o.x0 + 1, x: o.y1 - o.y0 + 1 };
    const tex = st === 'barn' || st === 'house' ? P.plank : P.stucco;
    const face = (k, side) => (len, h) => {
      const idx = side === 'y' ? tx - o.x0 : o.y1 - ty, cnt = n[side], hs = uhash(tx * 3 + (side === 'y' ? 1 : 2), ty);
      ctx.fillStyle = hwLit(o.col, k); ctx.fillRect(0, -h, len, h);
      ctx.globalAlpha *= 0.55; ctx.fillStyle = tex; ctx.fillRect(0, -h, len, h); ctx.globalAlpha /= 0.55;
      if (o.ruin) { ctx.fillStyle = 'rgba(40,24,12,.35)'; ctx.fillRect(0, -h, len, 6); return; }
      if (o.band) { ctx.fillStyle = hwLit(o.band, k); ctx.fillRect(0, -h + 4, len, 22); }
      if (o.text && side === 'y') hwText(o.text, idx, cnt, -h + 22, 17, '#fff8e8');
      const door = idx === (o.door ?? -1) || (st === 'motel' && idx % 3 === 1);
      if (st === 'diner' && side === 'y' && !door) hwWindow(3, -h + 36, len - 6, h - 58, '#c8c8c8');
      else if (door) { ctx.fillStyle = st === 'motel' ? (idx % 2 ? '#2a7a8a' : '#a8402a') : st === 'barn' ? '#7a1e14' : '#5a3a24'; ctx.fillRect(9, -64, len - 18, 64); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(9, -64, 3, 64); if (st === 'barn') { ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 3; ctx.strokeRect(9, -64, len - 18, 64); ctx.beginPath(); ctx.moveTo(9, -64); ctx.lineTo(len - 9, 0); ctx.moveTo(len - 9, -64); ctx.lineTo(9, 0); ctx.stroke(); } }
      else if (st === 'shop' && side === 'y') hwWindow(4, -h + 40, len - 8, h - 62, '#d8d8d8');
      else if (hs % 3 !== 0) { const w = st === 'trailer' ? 16 : st === 'church' ? 10 : 18, wh = st === 'church' ? 40 : st === 'trailer' ? 18 : 26; hwWindow((len - w) / 2, st === 'trailer' ? -h + 34 : -h * 0.68, w, wh, st === 'adobe' ? '#6a4a2a' : '#e8e4d8'); }
      if (st === 'adobe') { ctx.fillStyle = '#5a3a1e'; for (let j = 0; j < 2; j++) ctx.fillRect(8 + j * 18, -h + 10, 5, 5); } // Balkenköpfe
      if (st === 'trailer') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, -14, len, 14); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, -6, len, 6);
    };
    hwBox(x0, y0, x0 + T, y0 + T, 0, z, hwOpen(i, MW, z) && face(0, 'y'), hwOpen(i, 1, z) && face(1, 'x'), (x, y, w, h) => {
      if (o.ruin) { ctx.fillStyle = shade(o.col, -0.15); ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(60,40,24,.4)'; ctx.fillRect(x + 6, y + 6, w - 12, h - 12); return; }
      const gable = st === 'barn' || st === 'church' || st === 'house';
      ctx.fillStyle = gable && (tx - o.x0) * 2 >= o.x1 - o.x0 + 1 ? shade(o.roof, -0.12) : o.roof; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha *= 0.5; ctx.fillStyle = P.roof; ctx.fillRect(x, y, w, h); ctx.globalAlpha /= 0.5; // Dachpappe, Kies, Bretter
      ctx.fillStyle = shade(o.col, 0.06);
      if (tx === o.x1 || G.L.hgt[i + 1] < z) ctx.fillRect(x + w - 4, y, 4, h);
      if (ty === o.y1 || G.L.hgt[i + MW] < z) ctx.fillRect(x, y + h - 4, w, 4);
      if (tx === o.x0) ctx.fillRect(x, y, 3, h);
      if (ty === o.y0) ctx.fillRect(x, y, w, 3);
      if (st === 'church' && z > 200 && tx === o.x0 + 4 && ty === o.y0 + 11) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 16, y + 10, 8, 20); }
    });
    if (st === 'church' && z > 200 && tx === o.x0 + 4 && ty === o.y0 + 11) { const [sx, sy] = proj(x0 + T / 2, y0 + T / 2); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(sx - 2.5, sy - z - 46, 5, 46); ctx.fillRect(sx - 12, sy - z - 34, 24, 5); }
  },
  // Fahrzeuge feldweise: jedes Feld zeichnet seinen Teil (Karosserie, Kabine, Räder), so stimmt die Tiefe zu den Figuren.
  // u: Feld längs der Fahrzeugachse ab dem Ende mit kleinerer Koordinate; das zum Betrachter zeigende Ende liegt bei +x bzw. +y
  car(o, tx, ty, i) {
    const ax = o.along === 'x', u = ax ? tx - o.x0 : ty - o.y0, x0 = tx * T, y0 = ty * T, tractor = o.st === 'tractor';
    const body = o.col, glass = o.burnt ? '#141210' : '#2b3644', zb = tractor ? 30 : 34, zc = tractor ? 88 : 64;
    // Rechteck quer zur Achse um q eingerückt, längs von a bis b (Anteil des Feldes, 0 = Ende mit kleinerer Koordinate)
    const box = (q, a, b) => ax ? [x0 + a * T, y0 + q, x0 + b * T, y0 + T - q] : [x0 + q, y0 + a * T, x0 + T - q, y0 + b * T];
    const wheel = (l, h, at) => { disc(ctx, at, -9, 8.5, '#151515'); disc(ctx, at, -9, 3.6, o.burnt ? '#3a3632' : '#8a8a8a'); };
    const lights = (l, h, front) => { ctx.fillStyle = o.burnt ? '#2a2420' : front ? '#f2ecc0' : '#c42018'; ctx.fillRect(2, -h + 7, 6, 5); ctx.fillRect(l - 8, -h + 7, 6, 5); if (front) { ctx.fillStyle = '#1c1c1c'; ctx.fillRect(10, -h + 8, l - 20, 6); } };
    const shadeFace = k => (l, h) => { ctx.fillStyle = hwLit(body, k); ctx.fillRect(0, -h, l, h); ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(0, -7, l, 7); };
    const atEnd = ax ? u === o.x1 - o.x0 : u === o.y1 - o.y0, front = o.dir > 0;
    // Karosserie: Seite mit Rad, sichtbares Ende mit Lichtern; die Fuge zum Nachbarfeld bleibt verdeckt
    const [bx0, by0, bx1, by1] = box(4, u === 0 ? 0.08 : 0, atEnd ? 0.92 : 1);
    const wpos = u === 0 ? 0.42 * T - 0.08 * T : 0.58 * T; // Radmitte im Feld, von der Seitenfläche aus gemessen
    const sideF = k => (l, h) => { shadeFace(k)(l, h); if (o.burnt) { ctx.fillStyle = 'rgba(120,60,20,.4)'; ctx.fillRect(l * 0.2, -h + 4, l * 0.5, h * 0.5); } wheel(l, h, ax ? wpos : l - wpos); };
    const endF = k => (l, h) => { shadeFace(k)(l, h); lights(l, h, front); };
    hwBox(bx0, by0, bx1, by1, 0, zb, ax ? sideF(0) : atEnd && endF(0), ax ? atEnd && endF(1) : sideF(1), (x, y, w, h) => { ctx.fillStyle = shade(body, o.burnt ? -0.05 : 0.08); ctx.fillRect(x, y, w, h); });
    // Kabine in der Fahrzeugmitte mit Scheiben ringsum; beim Traktor nur hinten
    const [ca, cb] = tractor ? (front ? [u === 0 ? 0.2 : 2, 1] : [0, u === 1 ? 0.8 : 0]) : [u === 0 ? 0.48 : 0, u === 0 ? 1 : 0.52];
    if (cb <= ca) return;
    const [cx0, cy0, cx1, cy1] = box(8, ca, cb), cabEnd = ca === 0 && cb < 1;
    const glassF = (k, isEnd) => (l, h) => { ctx.fillStyle = hwLit(body, k); ctx.fillRect(0, -h, l, h); ctx.fillStyle = glass; ctx.fillRect(isEnd ? 3 : 0, -h + 4, isEnd ? l - 6 : l, h - 8); if (!o.burnt) { ctx.fillStyle = 'rgba(210,225,240,.18)'; ctx.fillRect(isEnd ? 3 : 0, -h + 4, l * 0.4, (h - 8) * 0.5); } };
    hwBox(cx0, cy0, cx1, cy1, zb, zc, ax ? glassF(0, false) : cabEnd && glassF(0, true), ax ? cabEnd && glassF(1, true) : glassF(1, false), (x, y, w, h) => { ctx.fillStyle = shade(body, 0.14); ctx.fillRect(x, y, w, h); });
  },
  bus(o, tx, ty, i) {
    const z = G.L.hgt[i], x0 = tx * T, y0 = ty * T, v = ty - o.y0, len = o.y1 - o.y0 + 1, n = o.y1 - ty;
    const side = (l, h) => {
      ctx.fillStyle = hwLit(o.col, 1); ctx.fillRect(0, -h, l, h);
      ctx.fillStyle = o.band; ctx.fillRect(0, -h + 50, l, 9);
      if (v > 0) { ctx.fillStyle = '#22282e'; ctx.fillRect(3, -h + 10, l - 6, 34); ctx.strokeStyle = '#b8b8b0'; ctx.lineWidth = 1.5; for (let j = 8; j < l; j += 8) { ctx.beginPath(); ctx.moveTo(j, -h + 10); ctx.lineTo(j, -h + 44); ctx.stroke(); } } // vergitterte Fenster
      hwText(o.text, n, len, -h + 59, 9, '#ffffff');
      if (v === 0 || v === len - 1) { disc(ctx, l / 2, -10, 11, '#141414'); disc(ctx, l / 2, -10, 4.5, '#6a6a6a'); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, -6, l, 6);
    };
    const end = (l, h) => { ctx.fillStyle = hwLit(o.col, 0); ctx.fillRect(0, -h, l, h); ctx.fillStyle = '#22282e'; ctx.fillRect(4, -h + 10, l - 8, 30); ctx.fillStyle = o.band; ctx.fillRect(0, -h + 50, l, 9); };
    hwBox(x0 + 3, y0, x0 + T - 3, y0 + T, 0, z, ty === o.y1 && end, side, (x, y, w, h) => { ctx.fillStyle = '#c8c6be'; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + w / 2 - 2, y, 4, h); });
  },
  truck(o, tx, ty, i) {
    const z = G.L.hgt[i], x0 = tx * T, y0 = ty * T, ax = o.along === 'x', u = ax ? tx - o.x0 : ty - o.y0, len = ax ? o.x1 - o.x0 + 1 : o.y1 - o.y0 + 1;
    const cab = o.dir > 0 ? u === len - 1 : u === 0, col = cab ? o.col : o.cover, last = u === len - 1, zz = cab ? 72 : z;
    const face = (k, isEnd) => (l, h) => {
      ctx.fillStyle = hwLit(col, k); ctx.fillRect(0, -h, l, h);
      if (cab) { ctx.fillStyle = '#20262a'; ctx.fillRect(isEnd ? 5 : 4, -h + 6, l - (isEnd ? 10 : 18), 22); }
      else { ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(isEnd ? l / 2 : 0, -h); ctx.lineTo(isEnd ? l / 2 : 0, -24); ctx.stroke(); } // Plane mit Spriegeln
      if (!isEnd) { disc(ctx, l / 2, -11, 11, '#141414'); disc(ctx, l / 2, -11, 4.5, '#5a5a4a'); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, -24, l, 3);
    };
    const [a0, a1] = [u === 0 ? 2 : 0, last ? T - 2 : T], q = 3;
    const [bx0, by0, bx1, by1] = ax ? [x0 + a0, y0 + q, x0 + a1, y0 + T - q] : [x0 + q, y0 + a0, x0 + T - q, y0 + a1];
    hwBox(bx0, by0, bx1, by1, 0, zz, ax ? face(0, false) : last && face(0, true), ax ? last && face(1, true) : face(1, false), (x, y, w, h) => { ctx.fillStyle = shade(col, 0.08); ctx.fillRect(x, y, w, h); });
  },
  tanker(o, tx, ty, i) {
    const z = G.L.hgt[i], x0 = tx * T, y0 = ty * T, u = tx - o.x0, v = ty - o.y0, cab = u > 5;
    const col = cab ? o.cab : o.col;
    const face = k => (l, h) => {
      const gg = ctx.createLinearGradient(0, -h, 0, 0); gg.addColorStop(0, shade(col, 0.12)); gg.addColorStop(0.5, hwLit(col, k)); gg.addColorStop(1, shade(col, -0.45));
      ctx.fillStyle = gg; ctx.fillRect(0, -h, l, h);
      if (!cab && u % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(l - 3, -h, 3, h); }
      if (cab && k) { ctx.fillStyle = '#20262a'; ctx.fillRect(6, -h + 12, l - 12, 24); }
      if (!k && (u === 1 || u === 4 || u === 7)) { disc(ctx, l / 2, -h + 13, 11, '#141414'); disc(ctx, l / 2, -h + 13, 4.5, '#5a5a5a'); } // Räder zeigen nach oben: umgestürzt
    };
    hwBox(x0, y0 + (v === 0 ? 4 : 0), x0 + T, y0 + T - (v === 1 ? 4 : 0), 0, z, v === 1 && face(0), u === 7 && face(1), (x, y, w, h) => {
      ctx.fillStyle = shade(col, v === 0 ? 0.16 : -0.02); ctx.fillRect(x, y, w, h);
      if (!cab && v === 0) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y + h - 6, w, 5); }
      if (!cab && u === 2 && v === 1) { ctx.fillStyle = '#c82020'; ctx.fillRect(x + 6, y + 6, w - 12, h - 14); ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - 2, y + 9, 4, h - 20); }
    });
  },
  fence(o, tx, ty, i) {
    const z = o.z, x0 = tx * T, y0 = ty * T;
    const face = (l, h) => {
      ctx.fillStyle = hwPat().mesh; ctx.fillRect(0, -h, l, h); // Maschendraht, durchsichtig
      ctx.fillStyle = '#6a6e6e'; ctx.fillRect(0, -h - 6, 3, h + 6); ctx.fillRect(0, -h, l, 3);
      ctx.strokeStyle = '#8a8e8e'; ctx.lineWidth = 1; ctx.beginPath(); for (let j = 0; j < l; j += 5) ctx.lineTo(j, -h - 4 - (j % 10 ? 3 : 0)); ctx.stroke(); // Stacheldraht
    };
    hwBox(x0, y0, x0 + T, y0 + T, 0, z, hwOpen(i, MW, z) && face, hwOpen(i, 1, z) && face, null);
  },
  bag(o, tx, ty, i) {
    const z = o.z, P = hwPat(), x0 = tx * T, y0 = ty * T;
    const face = k => (l, h) => { ctx.fillStyle = P.bag; ctx.fillRect(0, -h, l, h); if (k) { ctx.fillStyle = 'rgba(40,24,8,.35)'; ctx.fillRect(0, -h, l, h); } };
    hwBox(x0 + 3, y0 + 3, x0 + T - 3, y0 + T - 3, 0, z, hwOpen(i, MW, z) && face(0), hwOpen(i, 1, z) && face(1), (x, y, w, h) => { ctx.fillStyle = P.bag; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(255,240,200,.15)'; ctx.fillRect(x, y, w, h); });
  },
  jersey(o, tx, ty, i) {
    const z = o.z, x0 = tx * T, y0 = ty * T;
    const face = k => (l, h) => { ctx.fillStyle = k ? '#7e7a72' : '#a6a29a'; ctx.fillRect(0, -h, l, h); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, -h * 0.35, l, 3); ctx.fillStyle = '#c8a020'; if (k === 0) ctx.fillRect(4, -h + 6, l - 8, 5); };
    hwBox(x0 + 4, y0 + 4, x0 + T - 4, y0 + T - 4, 0, z, hwOpen(i, MW, z) && face(0), hwOpen(i, 1, z) && face(1), (x, y, w, h) => { ctx.fillStyle = '#bab6ae'; ctx.fillRect(x, y, w, h); });
  },
};

// Bildobjekte: Kakteen, Felsbrocken, Zapfsäulen, Schilder, Plakatwand, Zelte, Wasserturm, Brunnen
function hwSprite(o) {
  const cx = (o.x0 + o.x1 + 1) / 2 * T, cy = (o.y0 + o.y1 + 1) / 2 * T, [sx, sy] = proj(cx, cy), h = o.seed;
  ctx.lineCap = 'round';
  if (o.k === 'cactus') { // Saguaro: dicker gerippter Stamm, ein bis zwei Arme, die nach oben abknicken
    const z = o.z, w = 8 + (h % 3), col = '#5f8a3e', dark = '#3a5a28';
    const seg = (pts, ww) => {
      for (const [lw, c] of [[ww * 2 + 2.5, dark], [ww * 2, col], [ww * 0.55, 'rgba(210,235,160,.35)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
        pts.forEach(([x, y], k) => { const dx = lw === ww * 0.55 ? -ww * 0.4 : 0; k ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y); }); ctx.stroke();
      }
    };
    seg([[sx, sy - 2], [sx, sy - z]], w);
    for (let a = 0; a <= h % 2; a++) {
      const s = (a ? 1 : -1) * ((h >> 3) % 2 ? 1 : -1), ay = sy - z * (0.38 + 0.12 * ((h >> (a + 4)) % 3)), ax = sx + s * (w + 10);
      seg([[sx, ay], [ax, ay], [ax, ay - z * (0.22 + 0.06 * ((h >> (a + 6)) % 3))]], w * 0.72);
    }
    return;
  }
  if (o.k === 'boulder') {
    const z = o.z, rx = 14 + h % 8, pts = Array.from({ length: 7 }, (_, k) => { const a = k / 7 * 6.283, rr = 0.75 + ((h >> k) % 5) * 0.07; return [sx + Math.cos(a) * rx * rr, sy - z * 0.45 + Math.sin(a) * (z * 0.55) * rr]; });
    const gg = ctx.createLinearGradient(sx - rx, sy - z, sx + rx, sy); gg.addColorStop(0, '#c48a5e'); gg.addColorStop(1, '#6a3e24');
    ctx.fillStyle = gg; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,14,.5)'; ctx.lineWidth = 1; ctx.stroke();
    return;
  }
  if (o.k === 'pump') {
    hwBox(cx - 9, cy - 6, cx + 9, cy + 6, 0, o.z, (l, hh) => { ctx.fillStyle = '#d8d4cc'; ctx.fillRect(0, -hh, l, hh); ctx.fillStyle = '#c8281e'; ctx.fillRect(0, -hh, l, 12); ctx.fillStyle = '#20262a'; ctx.fillRect(4, -hh + 16, l - 8, 10); }, (l, hh) => { ctx.fillStyle = '#a8a49c'; ctx.fillRect(0, -hh, l, hh); ctx.fillStyle = '#9a2018'; ctx.fillRect(0, -hh, l, 12); }, (x, y, w, hh) => { ctx.fillStyle = '#b02218'; ctx.fillRect(x, y, w, hh); });
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 10, sy - o.z * 0.6); ctx.quadraticCurveTo(sx + 22, sy - 10, sx + 14, sy - 4); ctx.stroke();
    return;
  }
  if (o.k === 'sign' || o.k === 'board') {
    const big = o.k === 'board', z = o.z, bw = big ? 190 : 82, bh = big ? 62 : 40, by = sy - z;
    ctx.fillStyle = '#3a3836';
    if (big) { const [ax, ay] = proj(cx, cy - T), [bx, bby] = proj(cx, cy + T); ctx.fillRect(ax - 3, ay - z + bh / 2, 6, z - bh / 2); ctx.fillRect(bx - 3, bby - z + bh / 2, 6, z - bh / 2); }
    else ctx.fillRect(sx - 3, by + bh / 2, 6, z - bh / 2);
    ctx.fillStyle = big ? '#e8dcc0' : o.col; ctx.fillRect(sx - bw / 2, by - bh / 2, bw, bh);
    ctx.strokeStyle = big ? '#8a7a5a' : '#f0e8d8'; ctx.lineWidth = 3; ctx.strokeRect(sx - bw / 2 + 3, by - bh / 2 + 3, bw - 6, bh - 6);
    ctx.fillStyle = big ? '#a82a1a' : '#fff8e8'; ctx.font = `700 ${big ? 22 : 18}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(o.text, sx, by + (big ? 8 : 7));
    if (!big) { ctx.fillStyle = 'rgba(255,240,200,.55)'; for (let k = 0; k < 8; k++) disc(ctx, sx - bw / 2 + 6 + k * (bw - 12) / 7, by - bh / 2 - 4, 2.2, '#ffe8a0'); } // Glühlampen
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx - bw / 2, by + bh / 2 - 6, bw, 6);
    return;
  }
  if (o.k === 'tent') {
    const x0 = o.x0 * T + 4, y0 = o.y0 * T + 4, x1 = (o.x1 + 1) * T - 4, y1 = (o.y1 + 1) * T - 4, ym = (y0 + y1) / 2, z = o.z, ze = z * 0.3;
    const P2 = (x, y, zz) => { const [a, b] = proj(x, y); return [a, b - zz]; }, poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
    poly([P2(x0, y0, ze), P2(x1, y0, ze), P2(x1, ym, z), P2(x0, ym, z)], shade(o.col, -0.12)); // hintere Dachfläche
    poly([P2(x0, y1, 0), P2(x1, y1, 0), P2(x1, y1, ze), P2(x0, y1, ze)], shade(o.col, -0.2));  // Seitenwand vorn
    poly([P2(x0, ym, z), P2(x1, ym, z), P2(x1, y1, ze), P2(x0, y1, ze)], shade(o.col, 0.06));  // vordere Dachfläche im Licht
    poly([P2(x1, y0, 0), P2(x1, y1, 0), P2(x1, y1, ze), P2(x1, ym, z), P2(x1, y0, ze)], shade(o.col, -0.3)); // Giebel
    const [dx, dy] = P2(x1, ym, z * 0.42); ctx.fillStyle = '#2a2a24'; ctx.fillRect(dx - 2, dy - 6, 14, 26);
    if (o.cross) { const [qx, qy] = P2((x0 + x1) / 2, (ym + y1) / 2, (z + ze) / 2); ctx.fillStyle = '#c82020'; ctx.fillRect(qx - 12, qy - 4, 24, 8); ctx.fillRect(qx - 4, qy - 12, 8, 24); }
    return;
  }
  if (o.k === 'tower') {
    const z0 = o.z * 0.72, z1 = o.z * 0.94, R = 40, k = R * Z * Math.SQRT2;
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 5;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [lx, ly] = proj(cx + dx * 34, cy + dy * 34); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(sx + (lx - sx) * 0.55, sy - z0); ctx.stroke(); }
    ctx.lineWidth = 2; for (const f of [0.35, 0.65]) { ctx.beginPath(); ctx.moveTo(sx - k * (1 - f * 0.45), sy - z0 * f); ctx.lineTo(sx + k * (1 - f * 0.45), sy - z0 * f); ctx.stroke(); }
    const gg = ctx.createLinearGradient(sx - k, 0, sx + k, 0); gg.addColorStop(0, '#9aa0a2'); gg.addColorStop(0.35, '#d8dcdc'); gg.addColorStop(1, '#5a6062');
    ctx.fillStyle = gg; ctx.fillRect(sx - k, sy - z1, k * 2, z1 - z0);
    ctx.beginPath(); ctx.ellipse(sx, sy - z0, k, k / 2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#6a6e70'; ctx.beginPath(); ctx.moveTo(sx - k - 4, sy - z1); ctx.lineTo(sx, sy - o.z); ctx.lineTo(sx + k + 4, sy - z1); ctx.ellipse(sx, sy - z1, k + 4, (k + 4) / 2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#3a4a6a'; ctx.font = '700 15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FARM', sx, sy - (z0 + z1) / 2 + 5);
    return;
  }
  if (o.k === 'well') {
    const k = 30 * Z * Math.SQRT2;
    ctx.fillStyle = '#8a7a64'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, k, k / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a5a46'; ctx.fillRect(sx - k, sy - 30, k * 2, 24); ctx.beginPath(); ctx.ellipse(sx, sy - 6, k, k / 2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#1a1612'; ctx.beginPath(); ctx.ellipse(sx, sy - 30, k * 0.8, k * 0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx - k * 0.8, sy - o.z - 10, 5, o.z - 20); ctx.fillRect(sx + k * 0.8 - 5, sy - o.z - 10, 5, o.z - 20); ctx.fillRect(sx - k * 0.8, sy - o.z - 12, k * 1.6, 6);
  }
}

// ---------- Explosionen ----------
// Trifft alle Figuren im Umkreis r (Zombies, Held, Beschwörungen) mit Abfall zum Rand auf 40 % und stößt sie weg (Held und
// Endbosse nicht). dmg gilt für Gegnerstufe 1 und wächst wie das Leben (Zombies) bzw. der Schaden (Held, Beschwörungen) der Zombies.
// o: src (Verursacher, wird nicht getroffen), el (Element, Standard Feuer), vis (false: ohne Feuerball, etwa für Schockwellen), kb (Wegstoßen in px)
function hwBoom(x, y, r, dmg, o = {}) {
  const d = gs(), el = o.el || 'fire';
  if (o.vis !== false) {
    boom(x, y, 20, el, r * 0.6, 0.5);
    emit(x, y, 10, el, Math.min(60, r / 3), r * 0.5, { vz: rnd(80, 220) });
    SFX.play('boom', 80);
  }
  fx({ k: 'ring', x, y, r0: 10, r1: r, col: o.vis === false ? '#d8c8a0' : '#ffb040', life: 0.35 });
  for (const e of G.ents) {
    if (e.dead || e.noTarget || e === o.src) continue;
    const l = Math.hypot(e.x - x, e.y - y);
    if (l > r + e.r) continue;
    const k = 1 - 0.6 * clamp(l / r, 0, 1), kb = (o.kb ?? 50) * k;
    if (kb > 0 && e.kind !== 'boss' && !e.player && e.team !== 'n') { const a = Math.atan2(e.y - y, e.x - x); for (let s = 0; s < kb; s += 10) move(e, Math.cos(a) * 10, Math.sin(a) * 10); }
    // boom 2: Explosion (zerreißt Zombies, setzt sie in Brand, zündet Fässer), boom 1: Schockwelle
    hit(o.src || null, e, dmg * k * (e.team === 'e' ? 1.14 : 1.11) ** (d - 1), el, { boom: o.vis === false ? 1 : 2 });
  }
}

// ---------- Runden ----------
// Gruppen bis zur Rundengröße (88 + 44 je Runde), Arten nach Anteil; Champions und Unique-Gegner so oft wie im Sanktuarium
function hwQueue(d) {
  const pool = ZOMBIES.filter(z => z.from <= d), sum = pool.reduce((a, z) => a + z.w, 0), total = Math.round(88 + 44 * d), q = [];
  const kind0 = () => { let w = Math.random() * sum; for (const z of pool) if ((w -= z.w) < 0) return z; return pool[0]; };
  let n = 0;
  for (let i = Math.min(12, 2 + Math.ceil(d * 0.7)); i > 0; i--) {
    const roll = Math.random(), kind = roll < 0.04 + d * 0.005 ? 'unique' : roll < 0.15 + d * 0.01 ? 'champ' : null;
    if (kind) { const k = kind === 'unique' ? 4 : rint(3, 5); q.push({ t: kind0(), kind, n: k }); n += k; }
  }
  while (n < total) { const t = kind0(), k = Math.min(total - n, rint(t.n[0], t.n[1])); q.push({ t, kind: null, n: k }); n += k; }
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } // Champions mischen sich unter die Horde
  return q;
}
// kürzester Abstand vom Helden in Richtung a, ab dem ein Zombie samt Kopf außerhalb des Bildes steht
function hwOff(a) {
  const c = Math.cos(a), s = Math.sin(a), m = 150, sx = Math.abs(c - s) * Z, sy = (c + s) * Z / 2;
  let R = sx > 1e-3 ? (W / 2 + m) / sx : 1e9;
  if (sy > 1e-3) R = Math.min(R, (H * 0.55 + m) / sy); else if (sy < -1e-3) R = Math.min(R, (H * 0.45 + 40) / -sy);
  return R;
}
// Gruppe knapp außerhalb des Bildes: am nächsten Austrittspunkt (Gebäude, Busse, Zelte, Gullys), sonst aus dem Sand; jede vierte im Rücken
function hwSpawn({ t, kind, n }) {
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
    for (let j = 0; j < n; j++) {
      let ex = x, ey = y;
      for (let tries = 0; tries < 6; tries++) { const qx = x + rnd(-44, 44), qy = y + rnd(-44, 44); if (free(qx, qy, t.r)) { ex = qx; ey = qy; break; } }
      const e = spawnMon(t, ex, ey, kind === 'unique' && j ? 'minion' : kind);
      e.awake = true; e.v *= rnd(0.85, 1.15); // manche sind schneller, wie in Dead Nation
    }
    return true;
  }
  return false;
}
// Nachschub: eine Gruppe, sobald Platz unter der Obergrenze ist; wenige Zombies im Bild bringen schnelleren Nachschub
function hwRounds(dt) {
  if (!G.queue.length || (G.waveT -= dt) > 0) return;
  const alive = G.te.length;
  if (alive + G.queue[0].n > HW_CAP) return;
  if (hwSpawn(G.queue[0])) { G.queue.shift(); G.waveT = alive < 60 ? 0.4 : 0.8; } else G.waveT = 0.5; // doppelte Horde, doppelt so schnell
}

// ---------- Tageslicht ----------
// warmes Nachmittagslicht über dem ganzen Bild, Staub weht über den Boden
function hwGrade() {
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,175,95,.3)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}
function hwDust(dt) {
  if (!GFX.life || Math.random() > dt * 9) return;
  const w = unproj(rnd(-80, W), rnd(0, H));
  G.parts.push({ x: w.x, y: w.y, z: rnd(2, 30), vx: rnd(60, 110), vy: rnd(-40, -10), vz: rnd(-3, 6), life: rnd(1.6, 3), t: 0, col: 'rgba(225,200,150,.28)', s: rnd(4, 9), add: false, soft: true });
}
