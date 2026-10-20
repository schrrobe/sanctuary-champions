'use strict';
// Highway der Toten, Etappe 4: Alarm-Autos, Benzinfässer, Tanklaster, Kofferräume, Beutekiste, Medikit, Leuchtfackeln,
// Pfeile zu den letzten Zombies und Blut. Über die Erweiterungspunkte HWH aus highway.js.

// Fässer, Alarm-Autos und der Tanklaster sind Figuren ohne Team (team 'n'): so treffen sie alle Fähigkeiten, Flächen und
// Explosionen von selbst. Sie denken nicht, bewegen sich nicht und zählen nicht zu den Gegnern der Runde. Ihre Treffer regelt
// allein der hit-Handler unten (Leben, Blut und Erfahrung des Kerns gelten für sie nicht)
const HW_FUEL_R = 110, HW_FLARE_R = 900, HW_ALARM_R = 700; // Explosionsradius eines Fasses, Lockweite von Leuchtfackel und Autoalarm

// was explodiert ist, steht erst zwei Runden später wieder: Runde der Explosion je Fass und Tanklaster, im Spielstand des Helden
const hwGone = () => P.gone ||= {};

function hwThing(k, x, y, r, hm, o = {}) {
  const e = { ...baseEnt(), x, y, r, v: 0, d: 0, team: 'n', k, hp: 1, maxhp: 1, look: { rig: 'wisp', hm }, paint: () => {}, ...o };
  G.ents.push(e);
  return e;
}
// Rauch, Brandflecken und Feuer: kurzlebige Listen auf G, beim Neuaufbau der Karte leer
const hwSmoke = (x, y, z, col, s, life) => { if (G.smoke.length < 160) G.smoke.push({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), z, vx: rnd(-10, 10), vy: rnd(-10, 10), vz: rnd(18, 34), t: 0, life, s, col }); };
const hwStain = (x, y, r, k) => { G.stains.push({ x, y, r, k, t: k === 'blood' ? 30 : 45, seed: rnd(0, 6) }); if (G.stains.length > 160) G.stains.shift(); };

// ---------- Objekte zur Pause ----------
HWH.props.push(() => {
  const L = G.L, gone = hwGone(), d = P.depth, p = G.player, add = (x, y, k) => G.props.push({ x, y, k, seed: rnd(0, 100), open: false });
  G.smoke ||= []; G.stains ||= []; G.fires ||= []; G.pools ||= []; G.flares ||= [];
  G.ents = G.ents.filter(e => e.team !== 'n');
  for (const k in gone) if (d >= gone[k] + 2) delete gone[k];
  // Benzinfässer
  for (const i of L.fuel) if (!gone['f' + i]) {
    const { x, y } = tileC(i);
    hwThing('fuel', x, y, 12, 0.39, { i, nm: 'Benzinfass', paint: e => { const [sx, sy] = proj(e.x, e.y); drawFuel(ctx, sx, sy, G.t, e.fuse); } });
  }
  // Tanklaster: drei Trefferflächen entlang des Aufliegers mit gemeinsamem Zustand
  const tk = L.obs.find(o => o?.k === 'tanker'); // obs[0] ist frei: Feld ohne Hindernis
  tk.col0 ??= tk.col; tk.cab0 ??= tk.cab;
  tk.col = gone.tank ? '#3a3430' : tk.col0; tk.cab = gone.tank ? '#2a2420' : tk.cab0;
  G.tank = null;
  if (!gone.tank) {
    const y = (tk.y0 + 1) * T, k = G.tank = { o: tk, hits: 0, hitT: -1, x: (tk.x0 + 4) * T, y, parts: [] };
    for (const u of [1.5, 4, 6.5]) k.parts.push(hwThing('tank', (tk.x0 + u) * T, y, 42, 0.28, { nm: 'Tanklaster', hp: 5, maxhp: 5, tk: k }));
  }
  // Alarm-Autos: ein paar unversehrte Wracks je Gegend, zu jeder Runde wieder scharf
  L.alarm ||= L.cars.filter(o => !o.burnt && o.st !== 'tractor' && uhash(o.x0 * 7, o.y0 * 3) % 7 === 0);
  for (const o of L.alarm) {
    o.col0 ??= o.col; o.col = o.col0; o.burnt = false;
    hwThing('alarm', (o.x0 + o.x1 + 1) / 2 * T, (o.y0 + o.y1 + 1) / 2 * T, 36, 0.23, { o, nm: 'Alarm-Auto', hp: 10, maxhp: 10, dz: (o.x1 + o.y1 + 2) * T + 1, lure: true });
  }
  // Kofferräume an rund 40 anderen Wracks: am Ende, das zum Betrachter zeigt, falls dort frei
  L.trunks ||= L.cars.filter(o => !L.alarm.includes(o) && o.st !== 'tractor' && uhash(o.x0 * 5, o.y0 * 11) % 7 < 2).map(o => {
    const ax = o.along === 'x', i = ax ? o.y0 * MW + o.x1 + 1 : (o.y1 + 1) * MW + o.x0;
    return L.map[i] && (ax ? { x: (o.x1 + 1) * T + 4, y: (o.y0 + 0.5) * T } : { x: (o.x0 + 0.5) * T, y: (o.y1 + 1) * T + 4 });
  }).filter(Boolean);
  for (const t of L.trunks) add(t.x, t.y, 'trunk');
  // Beutekiste ab Runde 2 neben dem Helden, jede dritte Runde ein Medikit daneben
  const spot = (dx, dy) => { for (let s = 1; s < 4; s++) { const x = p.x + dx * s, y = p.y + dy * s; if (free(x, y, 16)) return [x, y]; } return null; };
  const c = d > 1 && (spot(46, 22) || spot(-46, 22) || spot(22, -46));
  if (c) add(c[0], c[1], 'crate');
  const m = d % 3 === 0 && (spot(-30, 44) || spot(44, -30) || spot(-44, -30));
  if (m) add(m[0], m[1], 'medkit');
});

// ---------- Treffer ----------
HWH.hit.push((src, t, dmg, el, o) => {
  if (t.flare) return false; // eine Leuchtfackel hat kein Leben
  if (t.team === 'n') { hwTouch(t, src, o); return false; }
  if (o.boom === 2 && t.team === 'e') {
    t.gibT = G.t; // stirbt er an dieser Explosion, zerreißt es ihn
    if (el === 'fire' && !t.tpl?.fireproof && t.kind !== 'boss') t.burnT = rnd(2.5, 4);
  }
});
// Schläge und Schüsse der Zombies zünden nichts; Explosionen (boom 2) auch dann, wenn ein Zombie sie auslöst (Bombie),
// und Endbosse, die durch Wracks und Fässer stürmen, ebenfalls
function hwTouch(t, src, o) {
  const z = src?.team === 'e' && src.kind !== 'boss' && o.boom !== 2;
  if (t.k === 'fuel') { if (!z) t.fuse ??= o.boom ? 0.15 : 0.04; return; }
  if (t.k === 'tank') {
    const k = t.tk;
    if (z || G.t - k.hitT < 0.12) return; // eine Salve zählt als ein Treffer
    k.hitT = G.t; k.hits++;
    for (const q of k.parts) q.hp = 5 - k.hits;
    emit(t.x, t.y, 50, 'fire', 10, 30, { vz: rnd(60, 160) }); SFX.play('hit');
    if (k.hits >= 5) k.fuse ??= 0.05;
    return;
  }
  if (o.boom === 2) { t.fuse ??= 0.1; return; } // Alarm-Auto: eine Explosion jagt es hoch
  if (!t.on) { if (!z) { t.on = true; t.onT = G.t; note('Autoalarm! Die Zombies stürmen zum Wagen'); } return; }
  if (z && --t.hp <= 0) t.fuse ??= 0.05;
}
function hwBlow(e) {
  e.dead = true;
  if (e.k === 'fuel') {
    hwBoom(e.x, e.y, HW_FUEL_R, 30);
    hwGone()['f' + e.i] = P.depth;
    hwStain(e.x, e.y, 44, 'scorch');
    return;
  }
  // Alarm-Auto: brennt aus, bis es zur nächsten Runde wieder scharf ist
  hwBoom(e.x, e.y, 170, 45);
  e.o.burnt = true; e.o.col = '#3a2e26';
  hwStain(e.x, e.y, 70, 'scorch');
  G.fires.push({ x: e.x, y: e.y, r: 34, n: 4, t: 7, seed: rnd(0, 9) });
}
function hwBlowTank() {
  const k = G.tank;
  G.tank = null;
  for (const q of k.parts) q.dead = true;
  hwBoom(k.x, k.y, HW_FUEL_R * 3, 60);
  k.o.col = '#3a3430'; k.o.cab = '#2a2420';
  hwGone().tank = P.depth;
  hwStain(k.x, k.y + 40, 150, 'scorch');
  G.pools.push({ x: k.x, y: k.y + 50, r: 150, t: 8, tick: 0, seed: rnd(0, 9) }); // brennende Benzinlache
  G.fires.push({ x: k.x, y: k.y, r: 120, n: 9, t: 9, seed: rnd(0, 9) });
}

// ---------- Leuchtfackeln ----------
// L wirft eine Fackel zum Mauszeiger (höchstens 10 Felder weit); landet sie in einem Hindernis, fällt sie davor zu Boden
function throwFlare() {
  if (!G.hw) return note('Leuchtfackeln wirken nur auf dem Highway der Toten');
  if (!P.flares) return note('Keine Leuchtfackeln: Der Händler verkauft sie');
  if (G.phase !== 'fight') return note('Leuchtfackeln erst werfen, wenn die Zombies kommen');
  const p = G.player, w = world(), a = Math.atan2(w.y - p.y, w.x - p.x);
  let l = Math.min(10 * T, Math.hypot(w.x - p.x, w.y - p.y)), x, y;
  do { x = p.x + Math.cos(a) * l; y = p.y + Math.sin(a) * l; l -= 10; } while (l > 0 && !walk(x, y));
  P.flares--; SFX.play('flare');
  G.flares.push({ x0: p.x, y0: p.y, x1: x, y1: y, x: p.x, y: p.y, z: 30, t: 0, fly: 0.55, burn: 8, a: rnd(0, 6.283), lure: true, flare: true, lit: false, dead: false });
}
// Zombies laufen zur nächsten brennenden Fackel oder zum heulenden Alarm-Auto, Endbosse nicht; wer direkt vor dem Helden
// oder einer Beschwörung steht, bleibt bei seinem Ziel
HWH.target.push((tg, e) => {
  if (!G.lures?.length || e.kind === 'boss' || (tg && dist(e, tg) < 70)) return;
  let best, bd = 1e9;
  for (const l of G.lures) { const d = dist(e, l); if (d < (l.flare ? HW_FLARE_R : HW_ALARM_R) && d < bd) { bd = d; best = l; } }
  return best;
});
// zum heulenden Alarm-Auto stürmen sie schneller als sonst; am Wagen schlagen sie wie üblich zu
HWH.act.push((e, tg, dt, spd) => {
  if (tg?.k !== 'alarm' || dist(e, tg) < e.r + tg.r + 30) return;
  seek(e, tg, spd * 1.4, dt);
  return true;
});
// an der Fackel schlurfen sie umher und starren ins Licht, statt sie anzugreifen
HWH.act.push((e, tg, dt, spd) => {
  if (!tg?.flare) return;
  if (dist(e, tg) > 55) { seek(e, tg, spd, dt); return true; }
  if ((e.millT = (e.millT || 0) - dt) <= 0) { e.millT = rnd(0.6, 1.4); e.millA = rnd(0, 6.283); }
  move(e, Math.cos(e.millA) * spd * 0.25 * dt, Math.sin(e.millA) * spd * 0.25 * dt);
  e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
  return true;
});
// brennende Zombies taumeln umher und verbrennen; vor allen anderen Verhaltensweisen, nur nicht mitten im Sprung
HWH.act.unshift((e, tg, dt, spd) => {
  if (!(e.burnT > 0) || e.team !== 'e' || e.z > 0) return;
  e.burnT -= dt;
  if ((e.burnA === undefined) || (e.burnS = (e.burnS || 0) - dt) <= 0) { e.burnS = rnd(0.25, 0.6); e.burnA = (e.burnA ?? e.face) + rnd(-1.6, 1.6); }
  move(e, Math.cos(e.burnA) * spd * 0.9 * dt, Math.sin(e.burnA) * spd * 0.9 * dt);
  e.face = e.burnA;
  if (Math.random() < 0.6) G.parts.push({ x: e.x + rnd(-6, 6), y: e.y + rnd(-6, 6), z: rnd(8, figH(e) * 0.8), vx: 0, vy: 0, vz: rnd(20, 50), life: rnd(0.4, 0.7), t: 0, col: pick(FIRE), s: rnd(3, 5), add: true, flame: 1 });
  if ((e.burnD = (e.burnD || 0) - dt) <= 0) { e.burnD = 0.5; hit(null, e, e.maxhp * 0.08, 'fire'); }
  return true;
});

// ---------- Blut ----------
// Explosionen zerreißen Zombies: Fleischbrocken fliegen, Blut spritzt, eine Leiche bleibt nicht
HWH.kill.push(e => {
  if (e.team !== 'e' || e.gibT !== G.t || e.kind === 'boss') return;
  e.noCorpse = true;
  const h = figH(e), cols = [e.look.skin || '#8a3020', e.look.body || '#5a1010', '#6a0808', '#4a0404'];
  for (let i = 0; i < 8; i++) G.parts.push({ x: e.x, y: e.y, z: h * rnd(0.2, 0.7), vx: rnd(-170, 170), vy: rnd(-170, 170), vz: rnd(120, 320), g: 700, life: rnd(2.5, 4), t: 0, col: pick(cols), s: rnd(4, 8), add: false });
  blood(e, 26);
  for (let i = 0; i < 3; i++) hwStain(e.x + rnd(-30, 30), e.y + rnd(-30, 30), rnd(10, 22), 'blood');
});

// ---------- Ablauf je Bild ----------
HWH.update.push(dt => {
  const p = G.player;
  G.lures = G.flares.filter(f => f.lit); // Köder für das nächste Bild: brennende Fackeln und heulende Alarm-Autos
  // Zündschnüre: alles geht kurz nach dem Treffer hoch, so laufen Kettenreaktionen sichtbar ab
  for (const e of G.ents) {
    if (e.team !== 'n' || e.dead) continue;
    if (e.fuse !== undefined && (e.fuse -= dt) <= 0) { hwBlow(e); continue; }
    if (e.on && G.t - e.onT > 20) e.on = false; // kommt niemand, verstummt der Alarm und lässt sich neu auslösen
    if (e.on) { G.lures.push(e); SFX.play('alarm', 880); }
  }
  if (G.tank) {
    if (G.tank.fuse !== undefined && (G.tank.fuse -= dt) <= 0) hwBlowTank();
    else if (G.tank.hits >= 2 && Math.random() < dt * G.tank.hits * 2) hwSmoke(G.tank.x + rnd(-80, 80), G.tank.y, 70, 'rgba(40,36,32,.5)', rnd(8, 14), 2.4);
  }
  // Leuchtfackeln: Wurfbogen, dann 8 s rotes Licht und Rauch
  for (const f of G.flares) {
    f.t += dt;
    if (!f.lit) {
      const k = Math.min(1, f.t / f.fly);
      f.x = f.x0 + (f.x1 - f.x0) * k; f.y = f.y0 + (f.y1 - f.y0) * k; f.z = 30 * (1 - k) + Math.sin(k * Math.PI) * 90;
      if (k >= 1) { f.lit = true; f.z = 0; f.t = 0; SFX.play('flare'); }
    } else {
      if (Math.random() < dt * 16) hwSmoke(f.x, f.y, 12, 'rgba(232,58,48,.45)', rnd(10, 16), 3);
      if (f.t > f.burn) f.dead = true;
    }
  }
  G.flares = G.flares.filter(f => !f.dead);
  // brennende Benzinlache trifft alle darin, Zombies fangen Feuer
  for (const b of G.pools) {
    b.t -= dt;
    if ((b.tick -= dt) <= 0) {
      b.tick = 0.4;
      for (const e of G.ents) if (!e.dead && e.team !== 'n' && Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) {
        hit(null, e, 6 * (e.team === 'e' ? 1.14 : 1.11) ** (gs() - 1), 'fire');
        if (e.team === 'e' && !e.tpl?.fireproof && e.kind !== 'boss') e.burnT = Math.max(e.burnT || 0, 2.5);
      }
    }
    if (Math.random() < dt * 8) hwSmoke(b.x + rnd(-b.r, b.r) * 0.6, b.y + rnd(-b.r, b.r) * 0.6, 30, 'rgba(30,26,22,.45)', rnd(10, 16), 2.6);
  }
  G.pools = G.pools.filter(b => b.t > 0);
  for (const f of G.fires) { f.t -= dt; if (Math.random() < dt * 5) hwSmoke(f.x + rnd(-f.r, f.r), f.y + rnd(-f.r, f.r) * 0.5, 50, 'rgba(36,32,28,.45)', rnd(9, 15), 2.6); }
  G.fires = G.fires.filter(f => f.t > 0);
  // roter Rauch über der Beutekiste
  for (const pr of G.props) if (pr.k === 'crate' && !pr.open && Math.random() < dt * 7) hwSmoke(pr.x, pr.y, 20, 'rgba(210,50,40,.34)', rnd(6, 10), 2.4);
  for (const s of G.smoke) { s.t += dt; s.x += s.vx * dt + 6 * dt; s.y += s.vy * dt - 4 * dt; s.z += s.vz * dt; s.s += dt * 5; }
  G.smoke = G.smoke.filter(s => s.t < s.life);
  for (const s of G.stains) s.t -= dt;
  G.stains = G.stains.filter(s => s.t > 0);
  // Stöhnen und Schlurfen der Horde, lauter je mehr Zombies nah sind
  if ((G.hordeT = (G.hordeT || 0) - dt) <= 0) {
    G.hordeT = rnd(1.2, 2.6);
    let n = 0;
    for (const e of G.te) if (Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 520) n++;
    if (n) SFX.play('horde', 0, Math.min(1, n / 25));
  }
});

// ---------- Darstellung ----------
// Bodenschicht in Weltkoordinaten: Brandflecken, Blutlachen, Glut unter der Benzinlache, roter Schein unter den Fackeln
HWH.under.push(() => {
  for (const s of G.stains) {
    const [sx, sy] = proj(s.x, s.y);
    if (sx < -200 || sx > W + 200 || sy < -120 || sy > H + 120) continue;
    const a = Math.min(1, s.t / 6);
    if (s.k === 'scorch') { const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); g.addColorStop(0, `rgba(18,12,8,${0.7 * a})`); g.addColorStop(1, 'rgba(18,12,8,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = `rgba(90,6,6,${0.75 * a})`; for (let i = 0; i < 4; i++) { const b = s.seed + i * 1.9; ctx.beginPath(); ctx.ellipse(s.x + Math.cos(b) * s.r * 0.5, s.y + Math.sin(b) * s.r * 0.5, s.r * (0.35 + 0.15 * (i % 2)), s.r * 0.25, b, 0, 7); ctx.fill(); } }
  }
  for (const b of G.pools) { ctx.fillStyle = `rgba(22,16,10,${0.55 * Math.min(1, b.t)})`; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.8, 0.4, 0, 7); ctx.fill(); } // Benzin
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.pools) { const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, `rgba(255,120,30,${0.5 * Math.min(1, b.t)})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); }
  ctx.lineWidth = 6; // Autoalarm: rote Ringe laufen vom Wagen weg
  for (const c of G.ents) if (c.k === 'alarm' && c.on && !c.dead) for (let i = 0; i < 2; i++) {
    const k = ((G.t - c.onT) * 1.6 + i / 2) % 1;
    ctx.strokeStyle = `rgba(255,40,20,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(c.x, c.y, 50 + k * 260, 0, 7); ctx.stroke();
  }
  for (const f of G.flares) if (f.lit) { const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 180), k = 0.42 + 0.06 * Math.sin(G.t * 31); g.addColorStop(0, `rgba(255,40,30,${k})`); g.addColorStop(1, 'rgba(255,30,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 180, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
});
// nach Tiefe sortiert: Fackeln, Lichter der Alarm-Autos, Flammen ausgebrannter Wracks und der Lache, Rauch
HWH.sort.push(list => {
  const at = (x, y, d, f) => { const [sx, sy] = proj(x, y); if (onScr(sx, sy)) list.push({ d, draw: () => f(sx, sy) }); };
  for (const f of G.flares) at(f.x, f.y, f.x + f.y, (sx, sy) => drawFlare(ctx, sx, sy, G.t, f.z, f.lit, f.a));
  for (const c of G.ents) if (c.k === 'alarm' && !c.dead) at(c.x, c.y, c.dz, (sx, sy) => hwAlarmLight(c, sx, sy));
  for (const f of [...G.fires, ...G.pools]) for (let i = 0, n = f.n || 16; i < n; i++) {
    const b = f.seed + i * 2.4, rr = f.r * 0.9 * Math.sqrt((i + 0.5) / n), x = f.x + Math.cos(b) * rr, y = f.y + Math.sin(b) * rr * (f.n ? 0.5 : 0.8);
    at(x, y, x + y, (sx, sy) => flame(ctx, sx, sy - (f.n ? 30 : 0), (f.n ? 26 : 36) * (1 + 0.35 * Math.sin(G.t * 11 + i * 1.7)) * Math.min(1, f.t / 2), f.n ? 8 : 11, G.t * 8 + i));
  }
  for (const s of G.smoke) at(s.x, s.y, s.x + s.y + 60, (sx, sy) => {
    const a = Math.sin(Math.PI * s.t / s.life), g = ctx.createRadialGradient(sx, sy - s.z, 0, sx, sy - s.z, s.s * 2.2);
    g.addColorStop(0, s.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = g;
    ctx.fillRect(sx - s.s * 2.2, sy - s.z - s.s * 2.2, s.s * 4.4, s.s * 4.4); ctx.globalAlpha = 1;
  });
});
// scharfe Alarm-Autos blinken langsam rot, heulende blinken mit Warnlichtern an beiden Enden
function hwAlarmLight(c, sx, sy) {
  const o = c.o, ax = o.along === 'x';
  if (!c.on) { if ((G.t + c.seed) % 1.4 < 0.2) glowDot(ctx, sx, sy - 52, 14, 'rgba(255,40,30,.95)'); return; }
  const blink = (G.t * 3) % 1 < 0.5;
  for (const s of [-1, 1]) {
    const [lx, ly] = proj(c.x + (ax ? s * 36 : 0), c.y + (ax ? 0 : s * 36));
    glowDot(ctx, lx, ly - 24, blink === s > 0 ? 40 : 14, blink === s > 0 ? 'rgba(255,170,40,.95)' : 'rgba(255,60,20,.8)'); // Warnblinker
  }
  if (blink) glowDot(ctx, sx, sy - 44, 90, 'rgba(255,50,30,.45)');
}
HWH.light.push(lamp => {
  for (const f of G.flares) if (f.lit) { const [sx, sy] = proj(f.x, f.y); lamp(sx, sy - 10, 300, 0.9); }
  for (const f of [...G.fires, ...G.pools]) { const [sx, sy] = proj(f.x, f.y); lamp(sx, sy - 20, f.r * 2.6, 0.8); }
});
HWH.tint.push(tint => {
  for (const f of G.flares) if (f.lit) { const [sx, sy] = proj(f.x, f.y); tint(sx, sy - 10, 300, `rgba(255,30,20,${0.26 + 0.04 * Math.sin(G.t * 29)})`); }
  for (const f of [...G.fires, ...G.pools]) { const [sx, sy] = proj(f.x, f.y); tint(sx, sy - 20, f.r * 2.2, 'rgba(255,120,30,.22)'); }
  for (const c of G.ents) if (c.k === 'alarm' && c.on && (G.t * 3) % 1 < 0.5) { const [sx, sy] = proj(c.x, c.y); tint(sx, sy - 30, 220, 'rgba(255,40,20,.2)'); }
});
// Pfeile am Bildschirmrand zu den letzten Zombies außerhalb des Bildes
HWH.over.push(() => {
  if (G.phase !== 'fight' || enemiesLeft() > 5) return;
  const [hx, hy] = proj(G.player.x, G.player.y), m = 40, mb = 185 / VS, pl = 0.75 + 0.25 * Math.sin(G.t * 6); // unten über Leiste und Schnelltasten
  for (const e of G.te) {
    if (e.dead) continue;
    const [sx, sy] = proj(e.x, e.y);
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const dx = sx - hx, dy = sy - hy, k = Math.min(dx > 0 ? (W - m - hx) / dx : dx < 0 ? (m - hx) / dx : 1e9, dy > 0 ? (H - mb - hy) / dy : dy < 0 ? (m - hy) / dy : 1e9);
    const x = hx + dx * k, y = hy + dy * k, a = Math.atan2(dy, dx);
    glowDot(ctx, x, y, 34, `rgba(255,30,20,${0.45 * pl})`);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = pl;
    ctx.fillStyle = '#e8180e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-14, -16); ctx.lineTo(-7, 0); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
});
