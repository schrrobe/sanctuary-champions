'use strict';
// Ferne Oase, Etappe 2: Gegnerarten der Fernen Oase und der Wurmgruft aus Diablo II samt Brut. Verhalten über die
// Erweiterungspunkte OAH aus oase.js, Zustand je Gegner in e.og. Brut (Sandwurm-Ei, Sandwurm-Nachwuchs, Greifer aus
// Nestern) kommt über zCall aus zombies.js zur Runde dazu und damit nie über die Obergrenze OA_CAP.
//
// Aussehen über MON_LOOKS: Gestalten (rig) in models.js, gezeichneter Ersatz in sprites.js. Die Größe im Bild ergibt sich
// wie bei allen Gegnern aus Radius und hm: Höhe in Heldenhöhen = r / 14 · hm · h, h ist die gemessene Höhe der Gestalt in Ruhe.
//   beetle  h 0,45  col Panzer · belly Bauch und Beine · horn Horn (ohne: nur Zangen) · eyes Augenleuchten
//   maggot  h 0,26  col Leib · band Ringe · legs Beine und Zangen · eyes · queen: Königin mit dickem, bestacheltem Hinterleib (h 0,44)
//   vulture h 0,41  col Gefieder · skin nackter Kopf und Hals · beak Schnabel · bones: freiliegende Rippen (untot) · eyes
//   raptor  h 0,25 bis 0,46 je nach Flügelschlag (schwebt immer)  col Gefieder · beak Schnabel · crest Haube · eyes
//   nest    h 0,31  col Zweige · bone Knochen · egg Eier          egg  h 0,15  col Schale · vein Adern
//   swarm   h 0,49  col Insekten · wing Flügelschimmer · n Zahl der Insekten; nur gezeichnet, ohne 3D-Figur, ohne Leiche
// Bewegungen: walk Laufen bzw. Flug, attack Biss, Stich oder Fänge, cast Spucken (maggot) bzw. Sturzflug (vulture, raptor),
// death liegend. Die Vögel stehen am Boden, ihre Flughöhe kommt aus e.z. Für die Endbosse (oase-bosse.js) passen, gemessen:
//   Käferkau            { rig: 'beetle', col: '#3a7a52', belly: '#1a2a1e', horn: '#e4d8ac', eyes: '#d8ff70', hm: 1.7 }   r 30, Höhe 1,6
//   Aasschwinge         { rig: 'vulture', col: '#4e463e', skin: '#d8ccb4', beak: '#e0d090', bones: '#ece4d0', eyes: '#ff3010', hm: 2.4 }   r 34, Höhe 2,4
//   Greifermutter       { rig: 'raptor', col: '#1c181c', beak: '#e0b040', crest: '#8a1010', eyes: '#ff2010', hm: 2.8 }   r 34, Höhe 1,7 bis 3,1
//   Kaltwurm der Gräber { rig: 'maggot', queen: 1, col: '#c4d4e0', band: '#5a7a96', legs: '#34465a', eyes: '#80d8ff', hm: 1.4 }   r 44, Höhe 2,0

// Werte für Gegnerstufe 1 nach docs/ferne-oase.md. oa: Schlüssel der Art (das Verhalten hängt daran) · brood: Brut, kommt
// nicht mit der Runde (w 0) · nochamp: nie Champion oder Unique · bolts: Wahrscheinlichkeit der Combo-Blitze, wenn er getroffen
// wird · res: Widerstand gegen körperlichen Schaden · sting: der Stich verlangsamt den Helden so viele Sekunden
const OASE_MONSTERS = [
  { nm: 'Todeskäfer', oa: 'kaefer', hp: 20, d: 3.5, v: 100, r: 15, col: '#2e6a5a', xp: 12, from: 1, w: 3, n: [3, 4], bolts: 0.2 },
  { nm: 'Sandwurm', oa: 'sandwurm', hp: 36, d: 4, v: 80, r: 17, col: '#c8a878', xp: 12, from: 1, w: 1.5, n: [1, 1] },
  { nm: 'Untoter Aasfresser', oa: 'aas', hp: 20, d: 3.5, v: 80, r: 16, col: '#7a7268', xp: 8, from: 1, w: 2, n: [2, 3], undead: 1 },
  { nm: 'Stichlinge', oa: 'stich', hp: 8, d: 2.5, v: 100, r: 16, col: '#5a4220', xp: 6, from: 2, w: 1.5, n: [4, 8], res: 0.6, sting: 1.5 },
  { nm: 'Schwarzer Greifer', oa: 'greifer', hp: 8, d: 1.5, v: 120, r: 11, col: '#2a2226', xp: 4, from: 3, w: 2, n: [3, 5], el: 'pois' },
  { nm: 'Schwarzer-Greifer-Nest', oa: 'nest', hp: 102, d: 0, v: 0, r: 18, col: '#5a4630', xp: 18, from: 3, w: 0.4, n: [1, 1], nochamp: 1 },
  // Wurmgruft: etwa 1,4-mal so stark
  { nm: 'Felswurm', oa: 'felswurm', hp: 49, d: 5.5, v: 80, r: 18, col: '#857868', xp: 16, from: 5, w: 1, n: [1, 1] },
  { nm: 'Skarabäus', oa: 'skarab', hp: 29, d: 5, v: 100, r: 16, col: '#4a3a66', xp: 16, from: 6, w: 2, n: [3, 5], bolts: 0.25 },
  { nm: 'Schwarze Heuschrecken', oa: 'schrecke', hp: 10, d: 3.5, v: 120, r: 17, col: '#1a1714', xp: 8, from: 7, w: 1, n: [5, 8], res: 0.7, sting: 1.5 },
  // Brut: schlüpft aus Eiern der Würmer und aus Nestern
  { nm: 'Sandwurm-Ei', oa: 'ei', hp: 20, d: 0, v: 0, r: 11, col: '#ddd0a4', xp: 5, from: 1, w: 0, n: [1, 1], brood: 1, nochamp: 1 },
  { nm: 'Sandwurm-Nachwuchs', oa: 'brut', hp: 10, d: 1.25, v: 80, r: 9, col: '#d0b890', xp: 5, from: 1, w: 0, n: [1, 1], el: 'pois', brood: 1, nochamp: 1 },
  { nm: 'Schwarzer Greifer', oa: 'greifer', hp: 8, d: 1.5, v: 120, r: 11, col: '#2a2226', xp: 4, from: 3, w: 0, n: [1, 1], el: 'pois', brood: 1 },
];

Object.assign(MON_LOOKS, {
  'Todeskäfer': { rig: 'beetle', col: '#2e6a5a', belly: '#18261f', horn: '#b4c49a', eyes: '#b8ff70' },
  'Skarabäus': { rig: 'beetle', col: '#4a3a66', belly: '#1e1828', horn: '#d0b478', eyes: '#ff7040', hm: 1.05 },
  'Sandwurm': { rig: 'maggot', col: '#d2b48c', band: '#8a6a48', legs: '#4a3626' },
  'Felswurm': { rig: 'maggot', col: '#8c8070', band: '#4a4038', legs: '#2e2822', hm: 1.05 },
  'Sandwurm-Ei': { rig: 'egg', col: '#e2d6aa', vein: '#b09060', hm: 1.2 },
  'Sandwurm-Nachwuchs': { rig: 'maggot', col: '#dcc49c', band: '#9a7a58', legs: '#5a4434' },
  'Untoter Aasfresser': { rig: 'vulture', col: '#6a6258', skin: '#cfc2a8', beak: '#d8c890', bones: '#ddd6c0', eyes: '#ff5030' },
  'Stichlinge': { rig: 'swarm', col: '#2e200c', wing: 'rgba(255,226,150,.55)', n: 34, ghost: 1 }, // ghost: kein Blut
  'Schwarze Heuschrecken': { rig: 'swarm', col: '#0c0a08', wing: 'rgba(214,214,200,.5)', n: 42, ghost: 1 },
  'Schwarzer Greifer': { rig: 'raptor', col: '#262026', beak: '#d0a030', crest: '#3e2c32', eyes: '#ff2a10', hm: 1.3 },
  'Schwarzer-Greifer-Nest': { rig: 'nest', col: '#5a4630', bone: '#d8ceb4', egg: '#c8c0a8' },
});

// ---------- Helfer ----------
const ogT = (k, brood) => OASE_MONSTERS.find(m => m.oa === k && !m.brood === !brood);
const OG_SAND = ['#dcc690', '#c8a86c', '#a88a58'], OG_HIDE = { rig: 'wisp' }; // OG_HIDE: Gestalt eines Wurms unter dem Sand (ohne Schatten)
const ogSand = (x, y, n) => emit(x, y, 2, 'phys', n, 30, { vz: rnd(60, 140), g: 320, add: false, col: pick(OG_SAND), life: 0.7 });
// Brut über zCall, also nie über die Obergrenze; gibt die neuen Gegner zurück
const ogCall = (t, pts, rise) => { const n = G.ents.length; zCall(t, pts, null, rise); return G.ents.slice(n); };
// lebende Brut einer Mutter (Eier und Nachwuchs eines Wurms, Greifer eines Nests)
const ogKids = e => G.ents.filter(o => !o.dead && o.og?.mom === e).length;
// Eier und Nester stehen fest, auch nach Rückstoß
const ogPin = (e, s) => { s.px ??= e.x; s.py ??= e.y; e.x = s.px; e.y = s.py; };
// geradewegs auf (x, y) zu, über Hindernisse hinweg (Flug, Wühlen unter dem Sand); gibt den Restweg zurück
function ogFly(e, x, y, v, dt) {
  const dx = x - e.x, dy = y - e.y, l = Math.hypot(dx, dy), k = l > 0 ? Math.min(1, v * dt / l) : 0;
  e.x = clamp(e.x + dx * k, T, (MW - 1) * T); e.y = clamp(e.y + dy * k, T, (MH - 1) * T);
  if (l > 1) e.face = Math.atan2(dy, dx);
  e.walk = (e.walk || 0) + l * k; e.movT = 0.12;
  return l * (1 - k);
}
// n Combo-Blitze von src in zufällige Richtungen; als Geschosse der Gegner treffen sie nur Held und Beschwörungen
function oaBolts(src, n, dmg) {
  for (let i = 0; i < n; i++) shoot(src, rnd(0, 6.283), { dmg, el: 'light', v: 320, life: 0.9, vis: 'spark', er: 1, sz: 4 });
  SFX.play('zap', 120);
}

// ---------- Verhalten ----------
// Sandwurm und Felswurm: spucken Giftschleim, legen alle 6 s ein Ei (höchstens 3 Nachkommen zugleich) und graben sich
// immer wieder ein, um neben oder hinter dem Helden aufzutauchen
const OG_DIG = 0.5; // Sekunden zum Eingraben und zum Auftauchen
function ogWorm(e, s, tg, dt, spd) {
  if (s.ph) return ogDig(e, s, tg, dt, spd);
  const d = dist(e, tg), prey = tg.hp > 0 && !tg.lure;
  if ((s.lay = (s.lay ?? 6) - dt) <= 0) {
    s.lay += 6;
    if (ogKids(e) < 3) for (const m of ogCall(ogT('ei', 1), [{ x: e.x - Math.cos(e.face) * e.r, y: e.y - Math.sin(e.face) * e.r }], false)) (m.og ||= {}).mom = e;
  }
  if ((s.dig = (s.dig ?? rnd(5, 9)) - dt) <= 0 && prey) { s.ph = 'down'; s.t = OG_DIG; e.paint = ogSink; ogSand(e.x, e.y, 14); SFX.play('burrow', 200); return true; }
  if ((s.sp = (s.sp ?? rnd(1, 2.5)) - dt) <= 0 && prey && d > e.r + tg.r + 40 && d < 340) {
    s.sp = rnd(2.2, 3.4); e.face = Math.atan2(tg.y - e.y, tg.x - e.x); e.atkA = 1; e.atkCast = true;
    shoot(e, e.face, { dmg: e.d, el: 'pois', v: 300, life: 1.3, sz: 6 });
    SFX.play('spit', 150);
    return true;
  }
  return false;
}
// Eingraben, Wühlen und Auftauchen; unter dem Sand ist der Wurm unsichtbar und nicht zu treffen
function ogDig(e, s, tg, dt, spd) {
  if (s.ph === 'under') {
    if ((s.puff = (s.puff || 0) - dt) <= 0) { s.puff = 0.15; emit(e.x, e.y, 2, 'phys', 2, 20, { vz: rnd(20, 60), g: 300, add: false, col: pick(OG_SAND), life: 0.5 }); }
    if (ogFly(e, s.at.x, s.at.y, spd * 1.5, dt) > 4) return true;
    s.ph = 'up'; s.t = OG_DIG; e.look = s.look; s.look = null; e.noTarget = false; e.face = Math.atan2(tg.y - e.y, tg.x - e.x);
    ogSand(e.x, e.y, 16); SFX.play('burrow', 200);
    return true;
  }
  if ((s.t -= dt) > 0) return true;
  if (s.ph === 'down') { // auftauchen 45° bis 90° weiter um das Ziel herum, damit der Weg nicht unter ihm hindurchführt
    const a = Math.atan2(e.y - tg.y, e.x - tg.x) + pick([-1, 1]) * rnd(0.8, 1.6), r = rnd(90, 200);
    s.at = zFree(tg.x + Math.cos(a) * r, tg.y + Math.sin(a) * r, e.r) || { x: e.x, y: e.y };
    s.ph = 'under'; s.look = e.look; e.look = OG_HIDE; e.noTarget = true;
    return true;
  }
  s.ph = null; s.dig = rnd(7, 11); e.paint = null; // aufgetaucht
  return false;
}
// Bild eines Wurms beim Eingraben und Auftauchen: er sinkt in den Sand, der Boden schneidet ihn ab
function ogSink(e) {
  const s = e.og;
  if (s.ph === 'under') return;
  const k = clamp(s.ph === 'down' ? 1 - s.t / OG_DIG : s.t / OG_DIG, 0, 1), h = figH(e), [sx, sy] = proj(e.x, e.y);
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 2 * h, sy - 3 * h, 4 * h, 3 * h + h * 0.25 * (1 - k)); ctx.clip();
  ctx.globalAlpha = 1 - k * 0.4; e.z = -k * h * 0.4; drawEnt(e); e.z = 0;
  ctx.restore();
}
// Sandwurm-Ei: schlüpft nach 5 s als Nachwuchs, ohne Leiche, Erfahrung und Beute
function ogEgg(e, s, tg, dt) {
  ogPin(e, s);
  if ((s.t = (s.t ?? 5) - dt) > 0) return true;
  e.dead = true;
  const [m] = ogCall(ogT('brut', 1), [e], true);
  if (!m) { e.dead = false; s.t = 0.5; return true; } // kein freier Platz: gleich noch einmal
  (m.og ||= {}).mom = s.mom;
  emit(e.x, e.y, 8, 'phys', 10, 30, { vz: rnd(40, 100), g: 300, add: false, col: e.tpl.col, life: 0.5 });
  SFX.play('hatch', 150);
  return true;
}
// Schwarzer-Greifer-Nest: brütet alle 6 s einen Greifer aus, solange weniger als 6 seiner Greifer leben
function ogNest(e, s, tg, dt) {
  ogPin(e, s);
  if ((s.t = (s.t ?? 6) - dt) > 0) return true;
  s.t += 6;
  if (ogKids(e) < 6) for (const m of ogCall(ogT('greifer', 1), [{ x: e.x, y: e.y + e.r }], false)) { (m.og ||= {}).mom = e; e.atkA = 1; SFX.play('hatch', 150); }
  return true;
}
// Untoter Aasfresser: kreist hoch über dem Helden, außer Reichweite; alle paar Sekunden stößt er neben ihm herab,
// beißt am Boden wie jeder Nahkämpfer und steigt wieder auf
const OG_SKY = 110;
function ogVulture(e, s, tg, dt, spd) {
  const prey = tg.hp > 0 && !tg.lure;
  s.ph ||= 'up';
  if (s.ph === 'ground') { if ((s.t -= dt) > 0) return false; s.ph = 'up'; }
  if (s.ph === 'up') {
    e.z = Math.min(OG_SKY, (e.z || 0) + dt * 150);
    ogFly(e, e.x + Math.cos(e.face) * 40, e.y + Math.sin(e.face) * 40, spd, dt);
    if (e.z >= OG_SKY) { s.ph = 'sky'; s.t = rnd(2.5, 4); s.a = Math.atan2(e.y - tg.y, e.x - tg.x); }
  } else if (s.ph === 'sky') {
    s.a += dt * 0.8;
    ogFly(e, tg.x + Math.cos(s.a) * 160, tg.y + Math.sin(s.a) * 160, spd * 1.8, dt);
    if ((s.t -= dt) <= 0 && prey && dist(e, tg) < 260) {
      const b = rnd(0, 6.283), r = tg.r + e.r + 4, at = zFree(tg.x + Math.cos(b) * r, tg.y + Math.sin(b) * r, e.r);
      if (at) { s.ph = 'dive'; s.at = at; s.l0 = Math.max(1, Math.hypot(at.x - e.x, at.y - e.y)); SFX.play('screech', 400); } else s.t = 0.5;
    }
  } else { // Sturzflug
    const l = ogFly(e, s.at.x, s.at.y, spd * 3.2, dt);
    e.z = OG_SKY * Math.min(1, l / s.l0); e.atkA = 1; e.atkCast = true;
    if (l < 2) { s.ph = 'ground'; s.t = rnd(1.4, 2.2); e.z = 0; }
  }
  e.noTarget = e.z > 40;
  return true;
}
// Schwarzer Greifer: schwebt in Hüfthöhe, beißt mit Gift und fliegt danach kurz davon (ausgelöst im hit-Handler)
function ogRaptor(e, s, tg, dt, spd) {
  e.z = (e.z || 0) + (24 + Math.sin(G.t * 3 + e.seed) * 5 - (e.z || 0)) * Math.min(1, dt * 4);
  if (!(s.off > 0)) return false;
  s.off -= dt; e.face = s.oa;
  move(e, Math.cos(s.oa) * spd * 1.3 * dt, Math.sin(s.oa) * spd * 1.3 * dt);
  return true;
}
const OG_AI = { sandwurm: ogWorm, felswurm: ogWorm, ei: ogEgg, nest: ogNest, aas: ogVulture, greifer: ogRaptor };

OAH.act.push((e, tg, dt, spd) => {
  const f = e.team === 'e' && OG_AI[e.tpl?.oa];
  return f ? f(e, e.og ||= {}, tg, dt, spd) : false;
});

OAH.hit.push((src, t, dmg, el, o) => {
  const tt = t.tpl, st = src?.tpl;
  // Käfer: getroffen, schießt er mit der Wahrscheinlichkeit bolts 3 Combo-Blitze; höchstens einmal je 0,25 s, damit ein
  // Treffer mit mehreren Schadensarten nur einmal würfelt
  if (t.team === 'e' && tt?.bolts && dmg > 0 && ((t.og ||= {}).bz || 0) <= G.t && Math.random() < tt.bolts) { t.og.bz = G.t + 0.25; oaBolts(t, 3, t.d * 0.5); }
  if (st?.sting && t.player && o.melee) t.slow = Math.max(t.slow, st.sting); // Stich der Schwärme: statt Ausdauer zu rauben, bremst er den Helden
  if (st?.oa === 'greifer' && o.melee && src.team === 'e') { const s = src.og ||= {}; s.off = rnd(0.8, 1.3); s.oa = Math.atan2(src.y - t.y, src.x - t.x) + rnd(-0.8, 0.8); SFX.play('screech', 500); }
  if (tt?.res && el === 'phys' && t.team === 'e') return dmg * (1 - tt.res); // Schwärme: Widerstand gegen körperlichen Schaden
});

OAH.kill.push(e => {
  if (e.og?.look) e.look = e.og.look; // unter dem Sand gestorben: als Wurm liegen bleiben
  if (e.look?.rig === 'swarm') { e.noCorpse = true; emit(e.x, e.y, 24, 'phys', 12, 40, { vz: rnd(10, 50), add: false, col: e.tpl?.col || '#202020', life: 0.7, s: 1.6 }); } // der Schwarm zerstiebt
});

// Summen, sobald ein Schwarm nahe beim Helden ist
OAH.update.push(() => { if (G.te.some(e => e.look.rig === 'swarm' && dist(e, G.player) < 300)) SFX.play('buzz', 1600); });

// Brut vorab rendern, sonst entsteht ihr Bild erst beim Schlüpfen
OAH.round.push(() => { for (const t of OASE_MONSTERS) if (t.brood) { const L = monLook(t); SPR.warm(L, t.r * 4.8 * Z * (L.hm || 1) * VS * PX, ['idle', 'walk', 'death']); } });
