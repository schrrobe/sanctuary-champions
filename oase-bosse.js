'use strict';
// Ferne Oase, Etappe 3: Endbosse nach Diablo II samt ihren Eigenschaften Magie-resistant und Kälte-Verzauberung.
// Käferkau und Kaltwurm der Gräber stammen aus dem Original, Aasschwinge und Greifermutter sind wie die Endbosse des
// Highway aus den Arten der Oase abgeleitet. Daten, Ablauf und Verhalten über die Erweiterungspunkte OAH aus oase.js,
// Zustand je Endboss in e.ob. Gefolge, Nester und Eier sind Arten aus OASE_MONSTERS (oase-gegner.js), gerufen über
// zCall, zFree und zRing (zombies.js) und damit nie über die Obergrenze

// Riesenformen der Arten der Oase. c: Lage im 20er-Zyklus (Runde 5, 10, 15, 20 als Abschluss) · gf: Gefolge [Art, Anzahl],
// kommt mit dem Endboss · mres: Magie-resistant · ce: Kälte-Verzauberung · Werte für Gegnerstufe 1, gewachsen wird wie
// bei allen Gegnern in spawnMon. Der Kaltwurm spuckt als Fernkämpfer Schleim (rng)
const OASE_BOSSES = [
  { nm: 'Käferkau', hp: 306, d: 7, v: 100, r: 30, col: '#3a7a52', xp: 450, c: 5, mres: 1, gf: [['Todeskäfer', 4]] },
  { nm: 'Aasschwinge', hp: 374, d: 8, v: 120, r: 34, col: '#4e463e', xp: 560, undead: 1, c: 10, gf: [['Untoter Aasfresser', 4]] },
  { nm: 'Greifermutter', hp: 442, d: 7.5, v: 130, r: 34, col: '#1c181c', xp: 700, el: 'pois', c: 15, gf: [['Schwarzer Greifer', 5], ['Schwarzer-Greifer-Nest', 2]] },
  { nm: 'Kaltwurm der Gräber', hp: 748, d: 11, v: 60, r: 44, col: '#c4d4e0', xp: 1100, c: 0, mres: 1, ce: 1, rng: { el: 'pois', v: 300 }, gf: [['Sandwurm', 3], ['Felswurm', 2]] },
];
// Gestalten aus oase-gegner.js (Look-Werte dort im Kopf), Höhe in Heldenhöhen 1,6 · 2,4 · 2,4 · 2,0
Object.assign(MON_LOOKS, {
  'Käferkau': { rig: 'beetle', col: '#3a7a52', belly: '#1a2a1e', horn: '#e4d8ac', eyes: '#d8ff70', hm: 1.7 },
  'Aasschwinge': { rig: 'vulture', col: '#4e463e', skin: '#d8ccb4', beak: '#e0d090', bones: '#ece4d0', eyes: '#ff3010', hm: 2.4 },
  'Greifermutter': { rig: 'raptor', col: '#1c181c', beak: '#e0b040', crest: '#8a1010', eyes: '#ff2010', hm: 2.8 },
  'Kaltwurm der Gräber': { rig: 'maggot', queen: 1, col: '#c4d4e0', band: '#5a7a96', legs: '#34465a', eyes: '#80d8ff', hm: 1.4 },
});
// Art aus OASE_MONSTERS nach Namen; brood wählt die Brut, sonst die Art, die mit den Runden kommt
const obT = (nm, brood) => OASE_MONSTERS.find(m => m.nm === nm && !m.brood === !brood);
const OB_NEST = 'Schwarzer-Greifer-Nest', OB_SAND = ['#dcc690', '#c8a86c', '#a88a58'], OB_MRES = ['fire', 'cold', 'light'];
const obSand = (x, y, n, s = 30) => emit(x, y, 2, 'phys', n, s, { vz: rnd(60, 160), g: 320, add: false, col: pick(OB_SAND), life: 0.7, s: rnd(3, 5) });

// ---------- Verhalten ----------
// start beginnt einen Angriff, tick führt ihn in jedem Bild weiter (auch betäubt: einmal begonnen, läuft er durch), idle
// bewegt zwischen den Angriffen (true übernimmt den Zug). Käferkau kämpft wie ein Todeskäfer, besonders ist nur sein hit
const OB_AI = {
  // kreist hoch über dem Helden, außer Reichweite wie die Untoten Aasfresser; in Serien von drei Sturzflügen stößt sie
  // dorthin, wo der Held beim Anvisieren stand. Ein Schatten am Boden zeigt jede Landung an, am Boden ist sie verwundbar
  'Aasschwinge': {
    idle(e, b, dt, spd) {
      const p = G.player;
      b.ang = (b.ang ?? Math.atan2(e.y - p.y, e.x - p.x)) + dt * 0.5;
      obFly(e, p.x + Math.cos(b.ang) * 300, p.y + Math.sin(b.ang) * 300, spd * 1.5 * dt);
      e.z = (e.z || 0) + (110 - (e.z || 0)) * Math.min(1, dt * 2); e.noTarget = e.z > 40;
      return true;
    },
    start(e, b) { b.n = 3; obSwoop(e, b, 0.7); },
    tick(e, b, dt) {
      if (b.a === 'aim') { // flattert hoch und zurück, den Blick auf den Landepunkt
        e.atkA = 1; e.atkCast = true;
        obFly(e, b.rx, b.ry, 520 * dt); e.face = Math.atan2(b.ty - e.y, b.tx - e.x);
        e.z += (150 - e.z) * Math.min(1, dt * 5);
        if ((b.t -= dt) <= 0) { Object.assign(b, { a: 'dive', k: 0, x0: e.x, y0: e.y, z0: e.z, dur: clamp(Math.hypot(b.tx - e.x, b.ty - e.y) / 650, 0.35, 0.7) }); SFX.play('screech'); }
      } else if (b.a === 'dive') {
        const k = b.k = Math.min(1, b.k + dt / b.dur);
        e.x = b.x0 + (b.tx - b.x0) * k; e.y = b.y0 + (b.ty - b.y0) * k; e.z = b.z0 * (1 - k); e.movT = 0.12; e.atkA = 1;
        if (k >= 1) { // Landung: Hieb mit Rückstoß rings um den Landepunkt
          for (const o of G.tp) if (!o.dead && dist(o, e) < 80 + o.r) hit(e, o, e.d * 1.5, 'phys', { kb: 40 });
          obSand(e.x, e.y, 22, 80); SFX.play('smash');
          Object.assign(b, { a: 'perch', t: 1 }); e.atkCast = undefined;
        }
      } else if ((b.t -= dt) <= 0) { if (--b.n > 0) obSwoop(e, b, 0.45); else { b.a = null; b.cd = rnd(2.5, 3.5); b.ang = undefined; } } // danach geradewegs zurück in den Kreis
      e.noTarget = e.z > 40;
    },
  },
  // wirft abwechselnd Nester um den Helden (höchstens 4 stehen zugleich) und greift im Giftsturzflug an, quer durch den
  // Helden und über Hindernisse hinweg; eine grüne Bahn am Boden zeigt ihn an. Dazwischen beißt sie mit Gift
  'Greifermutter': {
    idle(e, b, dt) { e.z = (e.z || 0) + (40 - (e.z || 0)) * Math.min(1, dt * 3); }, // schwebt niedrig
    start(e, b) {
      const p = G.player, nests = G.te.filter(o => !o.dead && o.tpl?.nm === OB_NEST).length;
      b.alt = !b.alt; SFX.play('screech');
      if (b.alt && nests < 4) { Object.assign(b, { a: 'nest', t: 1.3, x0: e.x, y0: e.y, fly: zRing(p.x, p.y, Math.min(2, 4 - nests), 110, 190).map(q => ({ ...q, k: -0.5 })) }); return; }
      const d0 = dist(e, p);
      Object.assign(b, { a: 'wind', t: 0.6, ang: Math.atan2(p.y - e.y, p.x - e.x), d0, len: Math.min(720, d0 + 220), run: 0, hits: new Set(), safe: [e.x, e.y] });
    },
    tick(e, b, dt) {
      e.atkA = 1;
      if (b.a === 'nest') { // holt aus, dann fliegen die Nester im Bogen (gezeichnet in sort) und landen als Gegner
        e.atkCast = true; e.face = Math.atan2(G.player.y - e.y, G.player.x - e.x);
        for (const q of b.fly) if (!q.done && (q.k += dt / 0.8) >= 1) { q.done = 1; zCall(obT(OB_NEST), [q], null, false); obSand(q.x, q.y, 12, 40); }
        if ((b.t -= dt) <= 0) { b.a = null; b.cd = rnd(2.5, 3.5); }
        return;
      }
      if (b.a === 'wind') { // steigt auf und holt aus
        e.atkCast = true; e.face = b.ang; e.z += (110 - e.z) * Math.min(1, dt * 5);
        if ((b.t -= dt) <= 0) b.a = 'dive';
        return;
      }
      const step = 720 * dt, ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      b.run += step; obFly(e, e.x + ca * step, e.y + sa * step, step);
      e.z = 110 * Math.min(1, Math.abs(b.run - b.d0) / 180); // am tiefsten dort, wo der Held stand
      if (free(e.x, e.y, e.r) && G.flow[tileOf(e)] >= 0) b.safe = [e.x, e.y];
      if (Math.random() < 0.7) emit(e.x, e.y, e.z + 10, 'pois', 2, 20, { vz: rnd(-20, 20), life: 0.6 });
      for (const o of G.tp) if (!o.dead && !b.hits.has(o) && dist(o, e) < e.r + o.r + 10) { b.hits.add(o); hit(e, o, e.d * 1.5, 'pois'); }
      if (b.run < b.len) return;
      [e.x, e.y] = b.safe; // nie in einem Hindernis stehen bleiben
      b.a = null; b.cd = rnd(2.5, 3.5);
    },
  },
  // gräbt sich abwechselnd ein und taucht beim Helden wieder auf (der Ausbruch wirft ihn zurück) oder legt einen Kreis
  // aus Sandwurm-Eiern um sich; dazwischen spuckt er Schleim. Unter dem Sand ist nur ein wandernder Hügel zu sehen
  'Kaltwurm der Gräber': {
    start(e, b) { b.alt = !b.alt; Object.assign(b, { a: b.alt ? 'dig' : 'lay', t: b.alt ? 0.8 : 1 }); SFX.play(b.alt ? 'burrow' : 'spit'); },
    tick(e, b, dt) {
      const p = G.player;
      if (b.a === 'tunnel') {
        obFly(e, p.x, p.y, 380 * dt);
        if (Math.random() < 0.5) obSand(e.x, e.y, 1, 20);
        if ((b.t -= dt) > 0 && dist(e, p) > 30) return;
        const at = zFree(e.x, e.y, b.r0) || p;
        Object.assign(e, { x: at.x, y: at.y, r: b.r0, noTarget: false, paint: null }); b.r0 = 0;
        for (const o of G.tp) if (!o.dead && dist(o, e) < e.r + o.r + 60) hit(e, o, e.d * 1.5, 'phys', { kb: 80 });
        obSand(e.x, e.y, 40, 90); SFX.play('burrow'); SFX.play('smash');
        b.a = null; b.cd = rnd(4, 6);
        return;
      }
      e.atkA = 1; e.atkCast = true;
      if (b.a === 'dig' && Math.random() < 0.6) obSand(e.x, e.y, 2, e.r);
      if ((b.t -= dt) > 0) return;
      if (b.a === 'dig') { Object.assign(b, { a: 'tunnel', t: 2.5, r0: e.r }); Object.assign(e, { r: 4, noTarget: true, paint: obMound }); return; } // klein, damit er unter dem Sand niemanden schiebt
      zCall(obT('Sandwurm-Ei', 1), zRing(e.x, e.y, 6, e.r + 30, e.r + 60), null, false);
      emit(e.x, e.y, figH(e) * 0.3, 'pois', 16, 50, { vz: rnd(20, 80), g: 300, add: false, life: 0.6 });
      b.a = null; b.cd = rnd(4, 6);
    },
  },
};
// fliegt oder wühlt über alle Hindernisse hinweg geradewegs auf (x, y) zu, höchstens step weit, und bleibt auf der Karte
function obFly(e, x, y, step) {
  const dx = x - e.x, dy = y - e.y, l = Math.hypot(dx, dy), k = l > step ? step / l : 1;
  if (l < 0.5) return;
  e.x = clamp(e.x + dx * k, T, (MW - 1) * T); e.y = clamp(e.y + dy * k, T, (MH - 1) * T);
  e.face = Math.atan2(dy, dx); e.movT = 0.12; e.walk = (e.walk || 0) + l * k;
}
// nächster Sturzflug der Aasschwinge: Landung dort, wo der Held jetzt steht (frei und erreichbar); bis dahin flattert sie
// seitlich vom Helden weg nach oben
function obSwoop(e, b, t) {
  const p = G.player, s = zFree(p.x + rnd(-30, 30), p.y + rnd(-30, 30), e.r) || p, a = Math.atan2(e.y - p.y, e.x - p.x) + rnd(-0.6, 0.6);
  Object.assign(b, { a: 'aim', t, tx: s.x, ty: s.y, rx: p.x + Math.cos(a) * 240, ry: p.y + Math.sin(a) * 240 });
}
// eingegraben ist vom Kaltwurm nur ein wandernder Sandhügel zu sehen (e.paint ersetzt die Figur)
function obMound(e) {
  const [sx, sy] = proj(e.x, e.y), w = e.ob.r0 * (1 + 0.06 * Math.sin(G.t * 11));
  ctx.fillStyle = 'rgba(40,28,14,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, w * 1.15, w * 0.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#a08050'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, w, w * 0.55, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#d4b880'; ctx.beginPath(); ctx.ellipse(sx - w * 0.15, sy - 3, w * 0.55, w * 0.3, 0, Math.PI, 0); ctx.fill();
}

// ---------- Ablauf ----------
// Endboss am Ende der Horde als Abschluss der Runde; ab Runde 20 kommt in jeder Endboss-Runde zufällig ein zweiter dazu.
// Der Kaltwurm bleibt dem Abschluss des Zyklus vorbehalten
OAH.round.push(d => {
  const main = OASE_BOSSES.find(b => b.c === d % 20);
  if (!main) return;
  G.queue.push({ t: main, kind: 'boss', n: 1 });
  if (d >= 20) G.queue.push({ t: pick(OASE_BOSSES.filter(b => b.c && b !== main)), kind: 'boss', n: 1 });
});
OAH.spawn.push(e => {
  if (e.kind !== 'boss' || !OASE_BOSSES.includes(e.tpl)) return;
  e.ob = { a: null, t: 0, cd: rnd(1.5, 2.5) };
  G.boss ||= e;
  SFX.play('boss'); msg(`${e.nm} naht!`, '#c7b377');
  for (const [nm, n] of e.tpl.gf) zCall(obT(nm), zRing(e.x, e.y, n, 50, 130), 'minion', false);
});
// eigener Zug, sobald der Held nah genug ist; solange ein Angriff läuft, übernimmt tick
OAH.act.push((e, tg, dt, spd) => {
  const b = e.ob, ai = b && OB_AI[e.tpl.nm];
  if (!ai) return;
  if (b.a) return true;
  if ((b.cd -= dt) <= 0 && dist(e, G.player) < 650) { ai.start(e, b); return true; }
  return ai.idle?.(e, b, dt, spd);
});
OAH.update.push(dt => {
  if (!G.boss || G.boss.dead) G.boss = G.ents.find(o => o.kind === 'boss' && !o.dead) || null; // zweiter Endboss übernimmt den Lebensbalken
  for (const e of G.ents) if (!e.dead && e.ob?.a) OB_AI[e.tpl.nm].tick(e, e.ob, dt);
});
OAH.pause.push(() => ` · Nächster Endboss: Runde ${Math.ceil(P.depth / 5) * 5}`);

// ---------- Eigenschaften ----------
OAH.hit.push((src, t, dmg, el) => {
  // Kälte-Verzauberung: jeder Treffer des Endbosses macht halb so viel Kälteschaden dazu, der den Helden verlangsamt
  if (src?.tpl?.ce && t.team === 'p' && el !== 'cold' && dmg > 0) hit(src, t, dmg * 0.5, 'cold');
  const b = t.ob;
  if (!b) return;
  // Käferkau: getroffen, schießt er mit 50 % Wahrscheinlichkeit 5 Combo-Blitze; höchstens alle 0,4 s, damit ein Treffer
  // mit mehreren Schadensarten nur einmal würfelt
  if (t.tpl.nm === 'Käferkau' && src?.team === 'p' && dmg > 0 && (b.zap || 0) <= G.t && Math.random() < 0.5) { b.zap = G.t + 0.4; oaBolts(t, 5, t.d * 0.5); }
  if (t.tpl.mres && OB_MRES.includes(el)) return dmg * 0.6; // Magie-resistant: 40 % Widerstand gegen Feuer, Kälte und Blitz
});
// Kälte-Verzauberung: beim Tod eine Frost-Nova, die Held und Beschwörungen trifft und verlangsamt
OAH.kill.push(e => {
  if (!e.ob) return;
  if (e.ob.r0) e.r = e.ob.r0; // unter dem Sand gestorben: als ganzer Wurm liegen bleiben
  if (!e.tpl.ce) return;
  fx({ k: 'nova', x: e.x, y: e.y, r: 180, el: 'cold', life: 0.6, seed: rnd(0, 6) });
  fx({ k: 'ring', x: e.x, y: e.y, r0: 20, r1: 180, col: EL.cold[1], life: 0.5 });
  SFX.play('cold');
  for (const o of G.tp) if (!o.dead && dist(o, e) < 180 + o.r) hit(e, o, e.d, 'cold');
});

// ---------- Darstellung ----------
// am Boden (Weltkoordinaten): Schatten der Aasschwinge am Landepunkt, dunkler und schärfer, je tiefer sie kommt;
// Bahn des Giftsturzflugs der Greifermutter
OAH.under.push(() => {
  for (const e of G.ents) {
    const b = e.ob;
    if (e.dead || !b?.a) continue;
    if (e.tpl.nm === 'Aasschwinge' && (b.a === 'aim' || b.a === 'dive')) {
      const k = b.a === 'dive' ? b.k : 0;
      ctx.fillStyle = `rgba(30,18,8,${0.3 + 0.4 * k})`; ctx.beginPath(); ctx.arc(b.tx, b.ty, e.r * (1.7 - 0.7 * k), 0, 7); ctx.fill();
    } else if (e.tpl.nm === 'Greifermutter' && b.a === 'wind') {
      const w = e.r + 10;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(b.ang);
      ctx.fillStyle = `rgba(90,170,30,${0.16 + 0.1 * Math.sin(G.t * 18)})`; ctx.fillRect(0, -w, b.len, w * 2);
      ctx.strokeStyle = 'rgba(150,230,60,.6)'; ctx.lineWidth = 3; ctx.strokeRect(0, -w, b.len, w * 2);
      ctx.restore();
    }
  }
});
// Nester im Flug, nach Tiefe sortiert mit den Figuren
OAH.sort.push(list => {
  for (const e of G.ents) if (!e.dead && e.ob?.a === 'nest') for (const q of e.ob.fly) if (!q.done && q.k > 0) {
    const b = e.ob, x = b.x0 + (q.x - b.x0) * q.k, y = b.y0 + (q.y - b.y0) * q.k, z = figH(e) * 0.4 * (1 - q.k) + Math.sin(Math.PI * q.k) * 140;
    list.push({ d: x + y, draw() {
      const [sx, sy] = proj(x, y), h = sy - z;
      ctx.fillStyle = '#4a3826'; ctx.beginPath(); ctx.ellipse(sx, h, 24, 13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5e3a'; ctx.beginPath(); ctx.ellipse(sx, h - 4, 18, 7, 0, 0, 7); ctx.fill();
      disc(ctx, sx - 5, h - 5, 3.5, '#d8ceb4'); disc(ctx, sx + 5, h - 4, 3, '#c8c0a8');
    } });
  }
});
