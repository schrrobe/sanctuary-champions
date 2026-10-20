'use strict';
// Highway der Toten, Etappe 2: übrige Zombie-Arten nach Dead Nation (uniformierte Zombies und Spezial-Zombies).
// Verhalten über die Erweiterungspunkte HWH aus highway.js. Zustand je Zombie in e.zs; Spucke, Säurepfützen und die
// Zahl der übrigen Zombies in G.zs, damit beim Neuaufbau der Karte nichts liegen bleibt.

const zst = () => G.zs ||= { pools: [], spits: [], left: 0 };
const zt = nm => ZOMBIES.find(z => z.nm === nm);
const zAim = (e, tg) => { e.face = Math.atan2(tg.y - e.y, tg.x - e.x); };
// freier, vom Helden aus erreichbarer Platz nahe (x, y), spiralförmig gesucht, sonst null
function zFree(x, y, r) {
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, d = i * 14, qx = x + Math.cos(a) * d, qy = y + Math.sin(a) * d;
    if (free(qx, qy, r) && G.flow[((qy / T) | 0) * MW + ((qx / T) | 0)] >= 0) return { x: qx, y: qy };
  }
  return null;
}
// n Punkte im Ring zwischen r0 und r1 um (x, y)
const zRing = (x, y, n, r0, r1) => Array.from({ length: n }, (_, i) => { const a = i / n * 6.283 + rnd(-0.2, 0.2), d = rnd(r0, r1); return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }; });
// gerufene Zombies (Mouth, Endbosse und ihr Gefolge) kommen zur Runde dazu, aber nie über die Obergrenze; rise: steigen aus dem Boden
function zCall(t, pts, kind = null, rise = true) {
  let room = HW_CAP - G.ents.filter(o => o.team === 'e' && !o.dead).length; // G.te kennt die in diesem Bild Erschienenen noch nicht
  for (const q of pts) {
    if (room <= 0) return;
    const at = zFree(q.x, q.y, t.r);
    if (!at) continue;
    const m = spawnMon(t, at.x, at.y, kind);
    m.awake = true; room--;
    if (rise) { m.rise = RISE; emit(at.x, at.y, 2, 'phys', 8, 30, { vz: rnd(40, 110), g: 300, add: false, col: pick(['#a8865a', '#8a6a44', '#6a0a06']), life: 0.6 }); }
  }
}
// Sprung über Hindernisse hinweg; die Höhe e.z hebt nur das Bild an
const zLeap = (e, at, dur, h, land) => { e.zs.j = { t: 0, x0: e.x, y0: e.y, x1: at.x, y1: at.y, dur, h, land }; };
// Säurepfütze: schadet Held und Beschwörungen, solange sie darin stehen, und verdunstet nach einigen Sekunden
const zPool = (x, y, r, dmg, life) => zst().pools.push({ x, y, r, dmg, t: life, life, tick: 0, seed: rnd(0, 6) });
// Säure im Bogen von e nach (x, y): verätzt beim Aufschlag Held und Beschwörungen und hinterlässt eine Pfütze.
// o: h (Bogenhöhe), r (Pfütze), life, s (Größe im Bild), k (Schaden relativ zu e.d); Leech-Werte als Vorgabe
const zSpit = (e, x, y, o = {}) => zst().spits.push({ x: e.x, y: e.y, x0: e.x, y0: e.y, x1: x, y1: y, z: 0, t: 0, dur: clamp(Math.hypot(x - e.x, y - e.y) / 320, 0.45, 1.1),
  h: o.h || 70, r: o.r || 34, life: o.life || 6, s: o.s || 1, dmg: e.d * (o.k || 1), src: e });

// Runner lauert an einer Wand oder einem Wrack knapp außerhalb des Bildes, bis der Held nahe kommt
function zHide(e) {
  const p = G.player, L = G.L, ptx = (p.x / T) | 0, pty = (p.y / T) | 0, spots = [];
  for (let ty = Math.max(2, pty - 24); ty <= Math.min(MH - 3, pty + 24); ty++) for (let tx = Math.max(2, ptx - 24); tx <= Math.min(MW - 3, ptx + 24); tx++) {
    const i = ty * MW + tx;
    if (!G.map[i] || G.flow[i] < 0) continue;
    const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => L.hgt[i + dy * MW + dx] > 0);
    if (!wall) continue;
    const [sx, sy] = proj((tx + 0.5) * T, (ty + 0.5) * T);
    if (sx > -80 && sx < W + 80 && sy > -40 && sy < H + 160) continue; // im Bild
    spots.push([i, wall]);
  }
  if (!spots.length) return;
  const [i, wall] = pick(spots), c = tileC(i);
  e.x = c.x + wall[0] * 8; e.y = c.y + wall[1] * 8; // an die Wand gedrückt
  e.zs.lurk = 20;
}

HWH.spawn.push(e => { e.zs = e.tpl?.nm === 'Soldat' ? { helm: 1 } : {}; });

HWH.round.push(d => {
  // Spezial-Zombies kommen auch als Champions oder Unique nur in kleinen Gruppen (vier Cutter auf einmal wären kaum zu
  // überleben); die übrigen Plätze füllt eine gewöhnliche Gruppe, damit die Rundengröße stimmt
  const fill = G.queue.find(q => !q.kind);
  for (const q of G.queue) if (q.kind && q.kind !== 'boss' && q.t.special && q.n > q.t.n[1] + 1) { if (fill) fill.n += q.n - q.t.n[1] - 1; q.n = q.t.n[1] + 1; }
  // Helmlose Soldaten vorab rendern, sonst entsteht das Bild erst beim ersten abgerissenen Helm
  const t = zt('Soldat');
  if (d >= t.from) SPR.warm(MON_LOOKS['Soldat ohne Helm'], t.r * 4.8 * Z * VS * PX);
});

HWH.act.push((e, tg, dt) => {
  if (e.team !== 'e' || !e.zs) return false;
  const z = e.zs, nm = e.tpl?.nm, d = dist(e, tg), prey = tg.hp > 0 && !tg.lure;
  if (z.j) { // im Sprung
    const J = z.j, k = Math.min(1, (J.t += dt) / J.dur);
    e.x = J.x0 + (J.x1 - J.x0) * k; e.y = J.y0 + (J.y1 - J.y0) * k; e.z = Math.sin(Math.PI * k) * J.h; e.movT = 0.12;
    if (k >= 1) { e.z = 0; z.j = null; J.land?.(); }
    return true;
  }
  if (nm === 'Runner') {
    if (z.lurk === undefined) { z.lurk = 0; if (Math.random() < 0.6) zHide(e); }
    if (z.lurk > 0) {
      z.lurk -= dt;
      if (z.lurk > 0 && !tg.lure && e.hp >= e.maxhp && zst().left > 5 && dist(e, G.player) > 240) { zAim(e, tg); return true; }
      z.lurk = 0; // springt hervor
      const at = d > 60 && zFree(e.x + (tg.x - e.x) * Math.min(1, 130 / d), e.y + (tg.y - e.y) * Math.min(1, 130 / d), e.r);
      if (at) { zAim(e, tg); e.atkA = 1; zLeap(e, at, 0.35, 45); return true; }
    }
    return false;
  }
  if (nm === 'Bombie') {
    // Gas quillt aus dem Mund, schon beim Näherkommen, dann platzt er
    if (d < 260 && Math.random() < dt * (z.fuse > 0 ? 40 : 6)) emit(e.x + Math.cos(e.face) * 6, e.y + Math.sin(e.face) * 6, figH(e) * 0.85, 'pois', 1, 6, { vz: rnd(15, 45), life: 1, s: rnd(3, 6), add: false, col: pick(['#a8c040', '#c8d860', '#88a030']) });
    if (z.fuse === undefined && prey && d < e.r + tg.r + 40) { z.fuse = 0.9; SFX.play('bombie', 200); }
    if (z.fuse === undefined) return false;
    if ((z.fuse -= dt) <= 0) { e.xp = 0; kill(e); } // explodiert im kill-Handler
    e.atkA = 1; e.atkCast = true;
    return true;
  }
  if (nm === 'Mouth') {
    // schreit beim ersten Sichtkontakt und dann immer wieder; jeder Schrei ruft einen Schwarm Häutlinge
    if (z.yell > 0) { z.yell -= dt; zAim(e, tg); e.atkA = 1; e.atkCast = true; return true; }
    if ((z.scr = (z.scr ?? 0) - dt) <= 0 && prey && onScr(...proj(e.x, e.y))) {
      z.scr = rnd(6, 8); z.yell = 0.8;
      SFX.play('mouth', 300);
      for (let i = 0; i < 3; i++) fx({ k: 'ring', x: e.x, y: e.y, r0: 20, r1: 220, col: '#c02030', life: 0.5 + i * 0.15, delay: i * 0.15, a: 0.7 });
      emit(e.x, e.y, figH(e) * 0.8, 'phys', 16, 30, { vz: rnd(20, 80), add: false, col: pick(['#9a1418', '#c83030']), life: 0.7 });
      zCall(zt('Häutling'), zRing(e.x, e.y, rint(6, 9), 70, 170)); // ein Schwarm steigt rings um ihn aus dem Boden
      return true;
    }
    return false;
  }
  if (nm === 'Jumper') {
    // Warnschrei, dann weiter Sprung auf das Ziel; die Landung ist eine Schockwelle, die auch Zombies trifft
    if (z.warn > 0) {
      zAim(e, tg); e.atkA = 1; e.atkCast = true;
      if ((z.warn -= dt) > 0) return true;
      const at = zFree(tg.x, tg.y, e.r);
      if (!at) { z.jcd = 1; return true; }
      zLeap(e, at, 0.75, 150, () => {
        z.jcd = rnd(3.5, 5.5);
        hwBoom(e.x, e.y, 110, 12, { src: e, vis: false, el: 'phys', kb: 70 });
        emit(e.x, e.y, 2, 'phys', 30, 110, { vz: rnd(30, 110), g: 300, add: false, col: pick(['#a8865a', '#8a6a44']), life: 0.7 });
      });
      return true;
    }
    if ((z.jcd = (z.jcd ?? rnd(1, 3)) - dt) <= 0 && prey && d > 150 && d < 520) { z.warn = 0.6; SFX.play('jumper', 250); return true; }
    return false;
  }
  if (nm === 'Cutter') {
    // holt aus, stürmt geradeaus und reißt alles im Weg um; prallt er gegen ein Hindernis, taumelt er kurz
    const C = z.c;
    if (C?.ph === 'wind') { if ((C.t += dt) < 0.55) { zAim(e, tg); C.a = e.face; return true; } C.ph = 'run'; C.t = 0; SFX.play('charge', 200); }
    if (C) {
      const moved = move(e, Math.cos(C.a) * 560 * dt, Math.sin(C.a) * 560 * dt);
      for (const o of G.ents) if (o !== e && !o.dead && !o.noTarget && !C.hit.has(o) && dist(o, e) < e.r + o.r + 8) {
        C.hit.add(o);
        hit(e, o, o.team === 'e' && o.kind !== 'boss' ? o.hp + 1 : e.d * 2, 'phys', { kb: 70 });
      }
      if (!moved || (C.t += dt) > 0.9) { z.c = null; z.ccd = rnd(4, 6); if (!moved) e.st = 0.6; }
      return true;
    }
    if ((z.ccd = (z.ccd ?? rnd(2, 4)) - dt) <= 0 && prey && d > 170 && d < 480) { z.c = { ph: 'wind', t: 0, a: e.face, hit: new Set() }; e.atkA = 1; return true; }
    return false;
  }
  if (nm === 'Leech') {
    // spuckt Säure aus der Entfernung und hält dafür Abstand; nah dran beißt er
    if ((z.sp = (z.sp ?? rnd(0.5, 2)) - dt) <= 0 && prey && d < 340) {
      z.sp = rnd(2.2, 3.2); zAim(e, tg); e.atkA = 1; e.atkCast = true;
      zSpit(e, tg.x + (tg.vx || 0) * 0.3, tg.y + (tg.vy || 0) * 0.3);
      SFX.play('spit', 120);
    }
    if (d > e.r + tg.r + 30 && d < 150 && prey) { zAim(e, tg); return true; }
    return false;
  }
  return false;
});

HWH.hit.push((src, t, dmg, el, o) => {
  if (t.team !== 'e' || !t.zs) return;
  const nm = t.tpl?.nm, z = t.zs;
  if (t.tpl.fireproof && el === 'fire') { t.slow = Math.max(t.slow, 1.2); return 0; } // Feuerwehr: Feuer verlangsamt nur
  if (nm === 'Soldat' && z.helm && dmg >= t.maxhp * 0.18) { // der erste starke Treffer reißt den Helm weg
    z.helm = 0; t.look = MON_LOOKS['Soldat ohne Helm'];
    G.parts.push({ x: t.x, y: t.y, z: figH(t) * 0.9, vx: rnd(-80, 80), vy: rnd(-80, 80), vz: 180, g: 420, life: 0.9, t: 0, col: '#4a4e30', s: 7, add: false });
    return dmg * 0.25;
  }
  if (nm === 'Polizist' && dmg > 0 && (z.shot || 0) <= G.t && Math.random() < 0.3) { // getroffen löst sich ein Schuss, der jeden treffen kann
    z.shot = G.t + 0.6;
    shoot(t, rnd(0, 6.283), { dmg: t.d * 2, el: 'phys', v: 700, life: 0.7, arrow: 1, sz: 3, team: 'x' });
    boom(t.x, t.y, 30, 'fire', 8, 0.12); SFX.play('shot', 80);
  }
  if (nm === 'Mouth' && o.melee && src?.team === 'p') t.st = Math.max(t.st, 0.35); // Nahkampf betäubt ihn kurz
  if (nm === 'Cutter' && src?.team === 'p' && dmg > 0) { // schnelle Treffer betäuben ihn kurz und brechen den Ansturm ab
    z.hits = (z.hits || []).filter(s => G.t - s < 0.8); z.hits.push(G.t);
    if (z.hits.length >= 4) { z.hits.length = 0; t.st = Math.max(t.st, 0.4); z.c = null; }
  }
});

HWH.kill.push(e => {
  if (e.team !== 'e' || !e.zs) return;
  const nm = e.tpl?.nm, put = l => G.loot.push({ x: e.x + rnd(-24, 24), y: e.y + rnd(-24, 24), ...l });
  if (nm === 'Bombie') hwBoom(e.x, e.y, 120, 26, { src: e });
  if (nm === 'Leech') zPool(e.x, e.y, 58, e.d, 8);
  if ((nm === 'Mouth' || nm === 'Soldat') && Math.random() < 0.7) put({ k: 'hp' }); // wie das Medipack in Dead Nation
  if (nm === 'Zombie-Weihnachtsmann') for (let i = 0; i < 4; i++) put({ k: 'gold', n: Math.round(rnd(3, 6) * gs() * 5) });
});

HWH.update.push(dt => {
  const s = zst();
  s.left = G.te.length + G.queue.reduce((a, q) => a + q.n, 0);
  for (const q of s.spits) { // Säure fliegt im Bogen und platzt am Boden zu einer Pfütze
    const k = Math.min(1, (q.t += dt) / q.dur);
    q.x = q.x0 + (q.x1 - q.x0) * k; q.y = q.y0 + (q.y1 - q.y0) * k; q.z = 20 + Math.sin(Math.PI * k) * q.h;
    if (k < 1) continue;
    q.done = 1; zPool(q.x, q.y, q.r, q.dmg, q.life);
    for (const o of G.tp) if (dist(o, q) < o.r + q.r * 0.75) hit(q.src, o, q.dmg, 'pois', { direct: 1 });
    emit(q.x, q.y, 4, 'pois', 10 * q.s, 30 * q.s, { vz: rnd(30, 80), g: 300, add: false, col: pick(['#b8d040', '#90b020']), life: 0.5 });
  }
  s.spits = s.spits.filter(q => !q.done);
  for (const q of s.pools) if ((q.tick -= dt) <= 0) { q.tick = 0.4; for (const o of G.tp) if (dist(o, q) < q.r + o.r * 0.5) hit(null, o, q.dmg * 0.35, 'pois', { direct: 1 }); }
  s.pools = s.pools.filter(q => (q.t -= dt) > 0);
});

// Boden: Säurepfützen, Landepunkte der Jumper, Anlaufbahn der Cutter
HWH.under.push(() => {
  for (const q of zst().pools) {
    const a = Math.min(1, q.t / 1.5), g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
    g.addColorStop(0, `rgba(170,200,40,${0.55 * a})`); g.addColorStop(0.7, `rgba(120,150,20,${0.4 * a})`); g.addColorStop(1, 'rgba(90,110,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * 0.85, q.seed, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(220,240,120,${0.5 * a})`;
    for (let i = 0; i < 3; i++) { const b = q.seed + i * 2.1 + G.t * 0.7; ctx.beginPath(); ctx.arc(q.x + Math.cos(b) * q.r * 0.45, q.y + Math.sin(b * 1.3) * q.r * 0.45, 1.5 + (Math.sin(G.t * 5 + i) + 1) * 1.5, 0, 7); ctx.fill(); }
  }
  for (const e of G.te) {
    const J = e.zs?.j, C = e.zs?.c;
    if (J && J.h > 100) { ctx.strokeStyle = `rgba(140,20,10,${0.3 + 0.4 * J.t / J.dur})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(J.x1, J.y1, 30 + 80 * J.t / J.dur, 0, 7); ctx.stroke(); }
    if (C?.ph === 'wind') { ctx.fillStyle = 'rgba(160,20,10,.18)'; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(C.a); ctx.fillRect(0, -e.r, 480, e.r * 2); ctx.restore(); }
  }
});

// grünlicher Schein über den Pfützen
HWH.tint.push(tint => { for (const q of zst().pools) { const [sx, sy] = proj(q.x, q.y); tint(sx, sy, q.r * Z * 1.3, 'rgba(140,220,40,.1)'); } });

// Säure im Flug, nach Tiefe sortiert mit den Figuren
HWH.sort.push(list => {
  for (const q of zst().spits) list.push({ d: q.x + q.y, draw() { const [sx, sy] = proj(q.x, q.y); glowDot(ctx, sx, sy - q.z, 10 * q.s, 'rgba(180,230,60,.6)'); disc(ctx, sx, sy - q.z, 3.5 * q.s, '#d8f060'); } });
});
