'use strict';
// Highway der Toten, Etappe 3: Endbosse nach dem Muster des Big Mouth aus Dead Nation: Road of Devastation.
// Daten, Ablauf und Verhalten über die Erweiterungspunkte HWH aus highway.js.

// Riesenformen der Spezial-Zombies. c: Lage im 20er-Zyklus (Runde 5, 10, 15, 20 als Abschluss) · gf: Gefolge [Art, Anzahl],
// kommt mit dem Endboss · Werte für Gegnerstufe 1, gewachsen wird wie bei allen Gegnern in spawnMon.
// Rufen, freie Plätze und Säure teilen sie mit den Zombie-Arten (zCall, zFree, zRing, zSpit in zombies.js)
const HW_BOSSES = [
  { nm: 'Big Jumper', hp: 340, d: 14, v: 72, r: 32, col: '#b89a64', xp: 420, undead: 1, c: 5, gf: [['Jumper', 2], ['Runner', 6]] },
  { nm: 'Big Leech', hp: 440, d: 11, v: 46, r: 34, col: '#7a2a30', xp: 560, undead: 1, c: 10, rng: { el: 'pois', v: 300 }, gf: [['Leech', 6], ['Schutzanzug', 6]] },
  { nm: 'Big Cutter', hp: 520, d: 20, v: 80, r: 36, col: '#2a2628', xp: 700, undead: 1, c: 15, gf: [['Soldat', 5], ['Polizist', 5]] },
  { nm: 'Big Mouth', hp: 880, d: 24, v: 66, r: 40, col: '#5a1838', xp: 1100, undead: 1, c: 0, gf: [['Häutling', 12], ['Feuerwehrmann', 4]] },
];

// ---------- Verhalten ----------
// start beginnt einen Angriff, tick führt ihn in jedem Bild weiter (auch betäubt: einmal begonnen, läuft er durch)
const BOSS_AI = {
  // springt in Serien von drei Sätzen dorthin, wo der Held beim Absprung stand; jede Landung eine große Schockwelle,
  // die auch Zombies trifft. Der Zielkreis am Boden zeigt die Landung an
  'Big Jumper': {
    start(e, b) { SFX.play('jumper'); b.n = 3; aim(e, b, 0.75, 'crouch'); },
    tick(e, b, dt) {
      if (b.a !== 'air') {
        e.atkA = 1; e.atkCast = true;
        if ((b.t -= dt) > 0) return;
        Object.assign(b, { a: 'air', k: 0, x0: e.x, y0: e.y, dur: clamp(Math.hypot(b.tx - e.x, b.ty - e.y) / 620, 0.55, 0.95) });
        e.face = Math.atan2(b.ty - e.y, b.tx - e.x);
      }
      const k = b.k = Math.min(1, b.k + dt / b.dur), l = Math.hypot(b.tx - b.x0, b.ty - b.y0);
      e.x = b.x0 + (b.tx - b.x0) * k; e.y = b.y0 + (b.ty - b.y0) * k; e.z = 4 * (110 + l * 0.3) * k * (1 - k); e.movT = 0.12;
      if (k < 1) return;
      e.z = 0; e.atkA = 1; e.atkCast = undefined;
      hwBoom(e.x, e.y, 170, e.tpl.d * 1.5, { src: e, el: 'phys', vis: false, kb: 90 });
      emit(e.x, e.y, 4, 'phys', 40, 170, { vz: rnd(40, 140), g: 260, add: false, col: pick(['#c8a878', '#a8865a', '#e0caa0']), life: 0.9, s: rnd(3, 6) });
      SFX.play('smash');
      if (--b.n > 0) aim(e, b, 0.45, 'pause'); else { b.a = null; b.cd = rnd(3.5, 5); }
    },
  },
  // abwechselnd eine Salve aus sieben Säurebällen rund um den Held (große Pfützen) und Brut: speit Leeches aus.
  // Dazwischen spuckt er als Fernkämpfer einzelne Säurebälle (rng)
  'Big Leech': {
    start(e, b) { b.alt = !b.alt; Object.assign(b, { a: b.alt ? 'salvo' : 'brood', t: b.alt ? 1 : 0.9, n: 0, st: 0 }); SFX.play('spit'); },
    tick(e, b, dt) {
      const p = G.player;
      e.atkA = 1; e.atkCast = true; e.face = Math.atan2(p.y - e.y, p.x - e.x);
      b.t -= dt;
      if (b.a === 'salvo' && (b.st -= dt) <= 0 && b.n < 7) {
        b.st = 0.12; b.n++;
        const a = rnd(0, 6.283), d = b.n === 1 ? 0 : rnd(40, 150);
        zSpit(e, p.x + Math.cos(a) * d + p.vx * 0.5, p.y + Math.sin(a) * d + p.vy * 0.5, { h: 130, r: rnd(64, 80), life: 7, s: 2.2, k: 0.9 }); // große Pfützen
        if (b.n % 3 === 1) SFX.play('spit');
      }
      if (b.t > 0) return;
      if (b.a === 'brood') {
        const fx2 = Math.cos(e.face), fy = Math.sin(e.face);
        emit(e.x + fx2 * e.r, e.y + fy * e.r, figH(e) * 0.4, 'pois', 24, 60, { vz: rnd(30, 120), g: 240, life: 0.8 });
        zCall(zt('Leech'), zRing(e.x + fx2 * (e.r + 40), e.y + fy * (e.r + 40), Math.min(5, 3 + Math.floor(gs() / 10)), 10, 50), null, false);
      }
      b.a = null; b.cd = rnd(2.8, 3.8);
    },
  },
  // aus der Ferne ein Ansturm in gerader Linie, mitten durch Autowracks und Zombies (die er dabei niedermäht);
  // nah am Helden wirbelt er mit den Klingen und trifft Held, Beschwörungen und Fässer ringsum
  'Big Cutter': {
    start(e, b) {
      const p = G.player;
      if (dist(e, p) < 170 && b.last !== 'spin') { Object.assign(b, { a: 'spin', last: 'spin', t: 1.3, st: 0 }); return; } // sonst kurzer Ansturm mitten durch den Helden
      b.last = 'charge';
      Object.assign(b, { a: 'wind', t: 0.65, ang: Math.atan2(p.y - e.y, p.x - e.x), len: Math.min(720, dist(e, p) + 220), hits: new Set() });
      SFX.play('charge');
    },
    tick(e, b, dt) {
      if (b.a === 'wind') {
        e.atkA = 1; e.atkCast = true; e.face = b.ang;
        if ((b.t -= dt) <= 0) Object.assign(b, { a: 'charge', run: 0, sx: e.x, sy: e.y, safe: [e.x, e.y] });
        return;
      }
      if (b.a === 'charge') {
        const step = 700 * dt, ca = Math.cos(b.ang), sa = Math.sin(b.ang);
        b.run += step; e.x += ca * step; e.y += sa * step; e.movT = 0.12; e.walk = (e.walk || 0) + step; e.face = b.ang;
        const tx = (e.x / T) | 0, ty = (e.y / T) | 0, inside = tx > 0 && ty > 0 && tx < MW - 1 && ty < MH - 1;
        if (inside && free(e.x, e.y, e.r) && G.flow[ty * MW + tx] >= 0) b.safe = [e.x, e.y];
        else if (inside && Math.random() < 0.5) emit(e.x + ca * e.r, e.y + sa * e.r, 30, 'light', 3, 40, { vz: rnd(60, 180), g: 400, life: 0.5, col: pick(['#ffe080', '#c8c8c8', '#8a8a8a']), add: Math.random() < 0.5 }); // Blech und Funken
        if (Math.random() < 0.6) emit(e.x, e.y, 3, 'phys', 2, 20, { vz: rnd(10, 40), add: false, col: '#c8a878', life: 0.7, s: rnd(4, 7) });
        for (const o of G.ents) {
          if (o === e || o.dead || o.noTarget || b.hits.has(o) || Math.hypot(o.x - e.x, o.y - e.y) > e.r + o.r + 8) continue;
          b.hits.add(o);
          if (o.team === 'e' && o.kind !== 'boss') hit(e, o, o.maxhp * 3); // mäht Zombies im Weg nieder
          else if (o.team === 'p') hit(e, o, e.d * 2, 'phys', { kb: 140 });
          else hit(e, o, e.d, 'phys'); // andere Endbosse, Fässer und Alarm-Autos
        }
        if (b.run < b.len && inside) return;
        [e.x, e.y] = b.safe; // nie in einem Wrack oder außerhalb der Karte stehen bleiben
        SFX.play('smash'); b.a = 'rest'; b.t = 0.7;
        return;
      }
      if (b.a === 'spin') {
        const p = G.player;
        e.face += dt * 16; e.atkA = 1; e.atkCast = undefined;
        const a = Math.atan2(p.y - e.y, p.x - e.x); move(e, Math.cos(a) * e.v * 0.5 * dt, Math.sin(a) * e.v * 0.5 * dt);
        if ((b.st -= dt) <= 0) {
          b.st = 0.2; fx({ k: 'whirl', x: e.x, y: e.y, r: 135, life: 0.25 });
          for (const o of G.ents) if (o.team !== 'e' && !o.dead && !o.noTarget && Math.hypot(o.x - e.x, o.y - e.y) < 135 + o.r) hit(e, o, e.d * 0.25, 'phys'); // sein Gefolge verschont er
        }
      }
      if ((b.t -= dt) <= 0) { b.a = null; b.cd = rnd(2.5, 4); }
    },
  },
  // Schrei, der sich nicht unterbrechen lässt: Betäubung, Frost und Furcht wirken währenddessen nicht. Zum Ende
  // wölbt sich rund um den Helden der Boden, dann steigt dort ein Ring aus Häutlingen auf
  'Big Mouth': {
    start(e, b) { Object.assign(b, { a: 'scream', t: 1.8, st: 0, ring: null }); SFX.play('mouth'); },
    tick(e, b, dt) {
      const p = G.player;
      e.st = 0; e.frz = 0; e.fear = 0; e.atkA = 1; e.atkCast = true; e.face = Math.atan2(p.y - e.y, p.x - e.x);
      if ((b.st -= dt) <= 0) {
        b.st = 0.3; fx({ k: 'ring', x: e.x, y: e.y, r0: 30, r1: 300, col: '#c02848', life: 0.7, a: 0.8 });
        emit(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, figH(e) * 0.75, 'phys', 10, 40, { col: pick(['#a01830', '#d04060']), vz: rnd(20, 80), life: 0.7, s: rnd(3, 6) });
      }
      if (b.t <= 0.7 && !b.ring) b.ring = zRing(p.x, p.y, Math.min(18, 10 + Math.floor(gs() / 4)), 165, 185);
      if ((b.t -= dt) > 0) return;
      zCall(zt('Häutling'), b.ring);
      b.a = null; b.cd = rnd(6, 8);
    },
  },
};
// Ziel des nächsten Sprungs: dort, wo der Held jetzt steht (frei und erreichbar), angezeigt bis zur Landung
function aim(e, b, t, a) {
  const p = G.player, s = zFree(p.x + rnd(-30, 30), p.y + rnd(-30, 30), e.r) || e;
  Object.assign(b, { a, t, tx: s.x, ty: s.y });
}

// ---------- Ablauf ----------
// Endboss am Ende der Horde als Abschluss der Runde; ab Runde 20 kommt in jeder Endboss-Runde zufällig ein zweiter dazu.
// Der Big Mouth bleibt dem Abschluss des Zyklus vorbehalten, wie Diablo im Sanktuarium
HWH.round.push(d => {
  const main = HW_BOSSES.find(b => b.c === d % 20);
  if (!main) return;
  G.queue.push({ t: main, kind: 'boss', n: 1 });
  if (d >= 20) G.queue.push({ t: pick(HW_BOSSES.filter(b => b.c && b !== main)), kind: 'boss', n: 1 });
});
HWH.spawn.push(e => {
  if (e.kind !== 'boss' || !BOSS_AI[e.tpl.nm]) return;
  e.bs = { a: null, t: 0, cd: rnd(1.5, 2.5) };
  G.boss ||= e;
  SFX.play('boss'); msg(`${e.nm} naht!`, '#c7b377');
  for (const [nm, n] of e.tpl.gf) zCall(zt(nm), zRing(e.x, e.y, n, 50, 130), 'minion', false);
});
// eigener Zug, sobald der Held nah genug ist; solange ein Angriff läuft, übernimmt tick
HWH.act.push((e, tg, dt) => {
  if (e.kind !== 'boss' || !e.bs) return;
  const b = e.bs;
  if (b.a) return true;
  if ((b.cd -= dt) > 0 || dist(e, G.player) > 650) return;
  BOSS_AI[e.tpl.nm].start(e, b);
  return true;
});
HWH.update.push(dt => {
  if (!G.boss || G.boss.dead) G.boss = G.ents.find(o => o.kind === 'boss' && !o.dead) || null; // zweiter Endboss übernimmt den Lebensbalken
  for (const e of G.ents) if (e.kind === 'boss' && !e.dead && e.bs?.a) BOSS_AI[e.tpl.nm].tick(e, e.bs, dt);
});
HWH.pause.push(() => ` · Nächster Endboss: Runde ${Math.ceil(P.depth / 5) * 5}`);

// ---------- Darstellung ----------
// am Boden (Weltkoordinaten): Landekreis des Big Jumper, Bahn des Big Cutter, Wölbungen vor dem Ring
HWH.under.push(() => {
  const t = G.t;
  ctx.save();
  for (const e of G.ents) {
    const b = e.bs;
    if (e.dead || !b?.a) continue;
    if (e.tpl.nm === 'Big Jumper') {
      const k = 0.5 + 0.5 * Math.sin(t * 14);
      ctx.fillStyle = `rgba(200,40,20,${0.12 + 0.08 * k})`; ctx.strokeStyle = 'rgba(255,90,40,.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.tx, b.ty, 170, 0, 7); ctx.fill(); ctx.stroke();
    } else if (e.tpl.nm === 'Big Cutter' && b.a === 'wind') {
      const w = e.r + 14;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(b.ang);
      ctx.fillStyle = `rgba(200,30,20,${0.14 + 0.1 * Math.sin(t * 18)})`; ctx.fillRect(0, -w, b.len, w * 2);
      ctx.strokeStyle = 'rgba(255,80,40,.6)'; ctx.lineWidth = 3; ctx.strokeRect(0, -w, b.len, w * 2);
      ctx.restore();
    } else if (e.tpl.nm === 'Big Mouth' && b.ring) {
      const k = 1 - b.t / 0.7;
      for (const [x, y] of b.ring) { ctx.fillStyle = `rgba(70,40,20,${0.5 * k})`; ctx.beginPath(); ctx.arc(x, y, 6 + 12 * k, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(120,10,6,${0.5 * k})`; ctx.beginPath(); ctx.arc(x, y, 3 + 5 * k, 0, 7); ctx.fill(); }
    }
  }
  ctx.restore();
});
