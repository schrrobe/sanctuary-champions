'use strict';
// Ferne Oase, Etappe 4: Truhen, Krüge, Tote Wächter, Brunnen, Schreine, Wegpunkte und der Wüstenwind. Über die
// Erweiterungspunkte OAH aus oase.js. Die Orte kommen aus G.L.sites, gewürfelt wird mit P.oaSeed (eigener Zufall wie in
// hwGen, damit jede Truhe bei jedem Laden an derselben Stelle steht). Gezeichnet in drawProp (sprites.js), Klänge in audio.js.
// Spielstand: P.oaWp (freigeschaltete Wegpunkte als Indizes in L.sites), P.oaChest = { c: Zyklus, o: [geöffnete Truhen] }

const OA_CHESTS = 12, OA_JARS = 40, OA_GUARDS = 16; // auf der Karte verteilt, Tote Wächter je 2 an den 8 Rastplätzen
const OA_MM = { coffer: '#e0b040', jar: '#b88050', guard: '#a89880', well: '#40a8ff', wp: '#90d0ff', shrine_combat: '#ff6040', shrine_armor: '#b8d8ff', shrine_exp: '#ffd040' }; // Farbe auf der Automap
// Schreine nach shrines.json: Dauer 2400 bzw. 3600 Bilder zu 25 je Sekunde, Meldung wie im deutschen D2. Der Schrein des
// Kampfes gibt hier +50 % auf Angriffe und Zauber statt +200 % auf körperlichen Schaden
const OA_SHRINES = {
  shrine_combat: { id: 'oa_combat', nm: 'Schrein des Kampfes', dur: 96, icol: '#ff6040', mods: { dmgPct: 0.5, spellPct: 0.5 }, fx: '+50 % Schaden für 96 s', say: 'Sie fühlen sich kampfbereit.' },
  shrine_armor: { id: 'oa_armor', nm: 'Schrein der Rüstung', dur: 96, icol: '#a8d0ff', mods: { armorPct: 1 }, fx: '+100 % Verteidigung für 96 s', say: 'Ihre Haut wird härter.' },
  shrine_exp: { id: 'oa_exp', nm: 'Schrein der Erfahrung', dur: 144, icol: '#ffd040', mods: { xpPct: 0.5 }, fx: '+50 % Erfahrung für 144 s', say: 'Ihre Erfahrung macht sich bezahlt.' },
};
Object.assign(ICON_SPEC, { oa_combat: 'sword*2:0,0,.8', oa_armor: 'shield', oa_exp: 'star' }); // Symbole der Wirkung über den Kugeln
// Wegpunkt-Liste links wie Händler und Charakter, freigeschaltete mit blauem Licht
document.head.insertAdjacentHTML('beforeend', `<style>
  #panel.pn-wp { left: 0; width: min(380px, 100vw); }
  .wps { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 14px; }
  .wps button { display: flex; align-items: center; gap: 10px; font-size: 14px; text-align: left; }
  .wps button::before { content: ""; flex: none; width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(#d0ecff, #2a70c0 55%, #08142a); box-shadow: 0 0 8px #3a90ff; }
  .wps button:disabled:not(.on)::before { background: radial-gradient(#5a544a, #2a2620 60%, #0a0806); box-shadow: none; }
  .wps button.on { color: #fff; border-color: var(--gold); opacity: 1; }
</style>`);

// ---------- Lage aller Objekte, einmal je Karte ----------
function oaPlace(L) {
  let sd = P.oaSeed * 48271 % 2147483647 || 1;
  const r = () => (sd = sd * 16807 % 2147483647) / 2147483647, out = [];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const of = k => L.sites.map((s, i) => ({ ...s, i })).filter(s => s.k === k);
  // freies Feld d0–d1 Felder um den Ort, mit Abstand gap (Felder) zu den übrigen Objekten; gelingt es nicht, sucht es
  // weiter draußen. pad: auch die acht Nachbarfelder frei, damit die Steinplatte des Wegpunkts nirgends im Fels liegt
  const put = (s, k, d0, d1, o = {}, gap = 1.3, pad = false) => {
    for (let n = 0; n < 120; n++) {
      const a = r() * 6.283, d = d0 + r() * (d1 - d0) + n * 0.1, tx = Math.floor(s.x + Math.cos(a) * d), ty = Math.floor(s.y + Math.sin(a) * d);
      if (!oaFieldFree(tx, ty) || (pad && !DIRS8.every(([dx, dy]) => oaFieldFree(tx + dx, ty + dy)))) continue;
      const x = (tx + 0.5) * T + (pad ? 0 : (r() - 0.5) * 16), y = (ty + 0.5) * T + (pad ? 0 : (r() - 0.5) * 16);
      if (out.some(q => Math.hypot(q.x - x, q.y - y) < Math.max(gap, q.gap) * T)) continue;
      return out.push({ x, y, k, seed: Math.floor(r() * 100), mm: OA_MM[k], gap, ...o });
    }
  };
  // Oasen: Brunnen und Wegpunkt am Teich, der Wegpunkt mit etwas Abstand
  for (const s of [...of('start'), ...of('oasis')]) { if (s.wp) put(s, 'wp', 2, 3, { s: s.i }, 3, true); put(s, 'well', 1, 2); }
  // Ruinen: je ein Schrein, je zwei jeder Art
  const ruins = shuffle(of('ruin')), camps = shuffle(of('camp')), kinds = shuffle(['shrine_combat', 'shrine_combat', 'shrine_armor', 'shrine_armor', 'shrine_exp', 'shrine_exp']);
  kinds.forEach((k, i) => { const s = ruins[i % ruins.length]; put(s, k, 1, s.r * 0.5, {}, 2); });
  for (let i = 0; i < OA_GUARDS; i++) { const s = camps[i % camps.length]; put(s, 'guard', 1, s.r * 0.8); }
  // Truhen zuerst an alle Ruinen, dann an Rastplätze; Krüge reihum an Ruinen und Rastplätzen
  const box = [...ruins, ...camps], jb = shuffle([...box]);
  for (let i = 0; i < OA_CHESTS; i++) { const s = box[i % box.length]; put(s, 'coffer', 1, s.r, { i }); }
  for (let i = 0; i < OA_JARS; i++) { const s = jb[i % jb.length]; put(s, 'jar', 1, s.r); }
  return out;
}

// ---------- Objekte zur Pause ----------
OAH.props.push(() => {
  const L = G.L, d = P.depth, p = G.player, cy = Math.floor((d - 1) / 5); // Zyklus: nach jedem Endboss (Runde 5, 10 …) ein neuer
  if (P.oaChest?.c !== cy) P.oaChest = { c: cy, o: [] }; // Truhen füllen sich nur nach jedem Endboss neu
  P.oaWp ||= [L.sites.findIndex(s => s.k === 'start')]; // neuer Held: nur der Wegpunkt der Startoase ist frei
  // Krüge, Tote Wächter, Brunnen und Schreine sind zu jeder Runde wieder voll und bereit
  for (const q of L.oaObj ||= oaPlace(L)) G.props.push({ ...q, open: q.k === 'coffer' && P.oaChest.o.includes(q.i), on: q.k === 'wp' && P.oaWp.includes(q.s) });
  G.oaWps = G.props.filter(q => q.k === 'wp');
  // Truhe am Rundenende ab Runde 2 neben dem Helden, wie die Beutekiste des Highways
  const spot = (dx, dy) => { for (let s = 1; s < 4; s++) { const x = p.x + dx * s, y = p.y + dy * s; if (free(x, y, 16)) return [x, y]; } return null; };
  const c = d > 1 && (spot(46, 22) || spot(-46, 22) || spot(22, -46));
  if (c) G.props.push({ x: c[0], y: c[1], k: 'coffer', seed: d, open: false, mm: OA_MM.coffer });
});

// ---------- Benutzen ----------
// aus useProp: Brunnen, Schreine und Wegpunkte erledigt es hier (true); Truhen merkt es sich, Beute geben sie wie Krüge und
// Tote Wächter über useProp
function oaUse(pr) {
  const p = G.player, sh = OA_SHRINES[pr.k];
  if (pr.k === 'coffer') { if (pr.i !== undefined) P.oaChest.o.push(pr.i); return false; }
  if (pr.k === 'well') {
    pr.open = true; p.hp = S.maxhp; p.mp = S.maxmp; SFX.play('well');
    emit(pr.x, pr.y, 16, 'cold', 30, 14, { vz: rnd(60, 160), life: 1, col: '#9fe8ff' });
    msg('Brunnen: Leben und Mana aufgefüllt', '#7fd4ff');
    return true;
  }
  if (sh) {
    pr.open = true;
    G.buffs[sh.id] = { s: sh, r: 1, t: sh.dur, pt: 0 }; // läuft wie jede Stärkung auch in der Pause weiter
    S = calc(); SFX.play('boost');
    emit(pr.x, pr.y, 30, 'cold', 30, 16, { vz: rnd(80, 200), life: 1.2, col: sh.icol });
    fx({ k: 'ring', x: p.x, y: p.y, r0: 10, r1: 90, col: sh.icol, life: 0.5 });
    msg(`${sh.nm}: ${sh.fx}`, sh.icol); note(sh.say);
    return true;
  }
  if (pr.k !== 'wp') return false;
  oaUnlock(pr);
  if (G.phase !== 'pause') note('Wegpunkte bringen dich erst nach der Runde an andere Orte');
  else { PANELS.wp ||= oaWpPanel; openPanel('wp'); }
  return true;
}
// beim ersten Besuch frei, auch mitten in der Runde; bleibt es für diesen Helden
function oaUnlock(w) {
  if (w.on) return;
  w.on = true; P.oaWp.push(w.s);
  SFX.play('wp'); note(`Wegpunkt freigeschaltet: ${oaWpList(G.L).find(q => q.s === w.s).nm}`);
  fx({ k: 'ring', x: w.x, y: w.y, r0: 10, r1: 80, col: '#6ab8ff', life: 0.6 });
}

// ---------- Wegpunkt-Liste ----------
// Namen nach der Himmelsrichtung von der Startoase aus, so wie der Spieler sie auf dem Bildschirm und der Automap sieht
// (Norden oben). Teilen sich zwei eine Richtung, heißt die fernere „Äußere Oase …“. Reihenfolge: Startoase, dann im
// Uhrzeigersinn ab Norden; je Eintrag { s: Index in L.sites, nm }
const OA_DIRS = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
function oaWpList(L) {
  if (L.oaWpList) return L.oaWpList;
  const c = L.sites.find(s => s.k === 'start'), n = {};
  const list = L.sites.map((s, i) => ({ s: i, site: s, dx: s.x - c.x, dy: s.y - c.y })).filter(q => q.site.wp)
    .map(q => ({ ...q, dir: (Math.round(Math.atan2(q.dx + q.dy, q.dx - q.dy) / (Math.PI / 4)) + 8) % 8, d: Math.hypot(q.dx, q.dy) }))
    .sort((a, b) => a.d - b.d);
  for (const q of list) q.nm = q.site.k === 'start' ? 'Startoase' : `${(n[q.dir] = (n[q.dir] || 0) + 1) > 1 ? 'Äußere ' : ''}Oase im ${OA_DIRS[q.dir]}`;
  const ord = q => q.site.k === 'start' ? -1 : (q.dir + 2) % 8;
  return L.oaWpList = list.sort((a, b) => ord(a) - ord(b) || a.d - b.d).map(({ s, nm }) => ({ s, nm }));
}
// wie in D2: alle Wegpunkte der Karte, nur freigeschaltete lassen sich wählen, der eigene ist hervorgehoben
function oaWpPanel() {
  const p = G.player, here = G.oaWps.find(w => Math.hypot(w.x - p.x, w.y - p.y) < 3 * T)?.s;
  return `<header><h2>Wegpunkte</h2><button class="x" data-act="close">✕</button></header>
    <div class="wps">${oaWpList(G.L).map(q => `<button data-wp="${q.s}" class="${q.s === here ? 'on' : ''}" ${P.oaWp.includes(q.s) && q.s !== here ? '' : 'disabled'}>${q.nm}</button>`).join('')}</div>
    <p class="hint">Klick: dorthin reisen · Weitere Wegpunkte schalten sich frei, sobald du sie erreichst</p>`;
}
addEventListener('click', e => { const b = e.target.closest?.('#panel [data-wp]'); if (b && !b.disabled) oaTravel(+b.dataset.wp); });
// Reise nur in der Pause, damit keine Gegner irgendwo zurückbleiben; die Beschwörungen kommen mit
function oaTravel(i) {
  const w = G.oaWps.find(q => q.s === i), p = G.player;
  if (!w || G.phase !== 'pause' || !P.oaWp.includes(i)) return false;
  closePanel();
  const [x, y] = [[w.x + 26, w.y + 26], [w.x, w.y]].find(([x, y]) => free(x, y, p.r)) || [w.x, w.y];
  Object.assign(p, { x, y, order: null, path: null, pathT: -1 });
  for (const m of G.ents) if (m.minion && !m.dead) { m.x = x + rnd(-30, 30); m.y = y + rnd(-30, 30); }
  updateCam(); G.flowT = 0; G.floorWarm = false; // am Ziel die Bodenkacheln auf einmal backen statt eine je Bild
  fx({ k: 'ring', x, y, r0: 90, r1: 10, col: '#6ab8ff', life: 0.6 });
  emit(x, y, 10, 'cold', 30, 30, { vz: rnd(60, 180), col: '#a8dcff', life: 1 });
  SFX.play('wp');
  return true;
}

// ---------- Ablauf je Bild ----------
OAH.update.push(dt => {
  const p = G.player;
  for (const w of G.oaWps || []) if (!w.on && Math.hypot(w.x - p.x, w.y - p.y) < 3 * T) oaUnlock(w);
  if ((G.oaWindT = (G.oaWindT || 0) - dt) <= 0) { G.oaWindT = 4; SFX.play('wind', 0, 0.8 + 0.2 * Math.sin(G.t * 0.7)); } // Böen überlappen sich zu leisem, stetem Wind; ohne Math.random, damit die Kampagne der Balance-Prüfung gleich bleibt
});

// ---------- Bodenschicht ----------
// Steinplatte des Wegpunkts flach am Boden (Weltkoordinaten), damit Figuren auf ihr stehen statt dahinter: zwei Ringe aus
// Sandstein mit Runen und einem Stern, freigeschaltet leuchten sie blau
OAH.under.push(() => {
  for (const w of G.oaWps || []) {
    const [sx, sy] = proj(w.x, w.y);
    if (sx < -150 || sx > W + 150 || sy < -100 || sy > H + 100) continue;
    const { x, y } = w, hov = w === G.hoverProp, ring = (rr, f, s) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); if (f) { ctx.fillStyle = f; ctx.fill(); } if (s) ctx.stroke(); };
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(x + 3, y + 3, 29, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5e4e36'; ctx.lineWidth = 1.6;
    ring(28, hov ? '#d4bf94' : '#b49e76', 1); ring(20, hov ? '#ae9a74' : '#8e7a58', 1); ring(10, '#6e5e44');
    ctx.strokeStyle = w.on ? '#8ccaff' : '#4e4030'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.39; ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); }
    for (let i = 0; i <= 5; i++) { const a = i * 2.513 - 1.571; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 8, y + Math.sin(a) * 8); }
    ctx.stroke();
    if (!w.on) continue;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 28); g.addColorStop(0, 'rgba(90,170,255,.55)'); g.addColorStop(0.7, 'rgba(60,130,255,.22)'); g.addColorStop(1, 'rgba(40,100,255,0)');
    ring(28, g); ctx.strokeStyle = `rgba(120,200,255,${0.5 + 0.3 * Math.sin(G.t * 3)})`; ctx.lineWidth = 2; ring(20, null, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
});
