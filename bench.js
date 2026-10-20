'use strict';
// Grafik-Messung: index.html?bench spielt drei feste Szenen ab und misst Bildabstände, Rechenzeit je Bild,
// Zeichenoperationen, Speicher und das Rendern der 3D-Figuren. Ergebnis als Tabelle im Bild und als JSON in
// der Konsole (Zeile „BENCH …“). Spielstand, Rekord und Einstellungen bleiben unberührt.
// Optionen: &scene=typisch|dicht|action|lava|horde · &secs=8 (Messdauer je Szene) · &gfx=niedrig|mittel|hoch|ultra
// (Grafikstufe nur für die Messung) · &set=bloom:0,life:0 (einzelne Werte der Stufe überschreiben) · &pixel=0 (ohne Pixel-Look) · &shot=3 (Szene 3 s mit festem Takt rechnen, dann eingefroren zeigen,
// für vergleichbare Bilder) · &kalt (nur 3 s Aufwärmen wie beim Rundenstart, Bake läuft während der Messung weiter) ·
// &notint (Färbungen per Filter aus, nur zur Ursachensuche) · &at=x,y (Lage des Helden in Feldern ab Kartenmitte, etwa für Bilder vom Highway) · &mon=n (Gegnerzahl der Szene)
const BENCH = (() => {
  const Q = new URLSearchParams(location.search), SECS = +(Q.get('secs') || 8), WARM = 3, WARM_MAX = 25;
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const EARLY = ['Gefallener', 'Zombie', 'Skelett', 'Goblin', 'Gnoll', 'Skelett-Bogenschütze'];
  const ALL = MONSTERS.map(m => m.nm);
  // at: Lage des Helden in Kacheln ab Arenamitte; mon: Gegnerzahl; mortal: Gegner sterben und werden ersetzt
  const SCENES = {
    typisch: { cls: 'sor', at: [0, 4], mon: 12, pool: EARLY, mortal: true, skills: ['fire_bolt'], every: 0.45 },
    dicht: { cls: 'nec', at: [0, -6], mon: 60, pool: ALL, mortal: false, skills: ['bone_spear'], every: 0.6, summons: ['raise_skeleton', 'clay_golem'], aura: 'holy_freeze' },
    action: { cls: 'sor', at: [0, 0], mon: 30, pool: ALL, mortal: false, every: 0.18,
      skills: ['blizzard', 'meteor', 'frozen_orb', 'frost_nova', 'chain_lightning', 'fire_ball', 'static_field', 'fire_wall'] },
    lava: { cls: 'ama', at: [20, 2], mon: 12, pool: EARLY, mortal: true, skills: ['fire_arrow'], every: 0.4 },
    // Highway der Toten: volle Horde (Obergrenze 165) um den Helden an der Kreuzung, Zombies sterben und rücken nach
    horde: { cls: 'sor', map: 'hw', at: [0, 4], mon: 165, pool: ZOMBIES.map(z => z.lk || z.nm), mortal: true, skills: ['frost_nova', 'chain_lightning', 'fire_ball'], every: 0.35 },
  };
  const names = Q.get('scene') ? [Q.get('scene')] : Object.keys(SCENES), results = [];
  // ohne Pixel-Look messen; die Einstellung des Spielers wird danach wiederhergestellt
  let pixel0 = null;
  if (Q.get('pixel') === '0') { try { pixel0 = localStorage.getItem(PIXEL); localStorage.setItem(PIXEL, '0'); } catch { /* privater Modus */ } resize(); }
  const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))] || 0; };
  const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), r2 = v => Math.round(v * 100) / 100;
  if (Q.get('gfx') && typeof GFX !== 'undefined') GFX.set(Q.get('gfx'), false);
  if (Q.get('set') && typeof GFX !== 'undefined') { for (const kv of Q.get('set').split(',')) { const [k, v] = kv.split(':'); GFX[k] = +v; } SPR.shadows(GFX.shadows); resize(); }

  // Rechenzeit der Spielschleife je Bild: Simulation, Zeichnen, Bedienleiste, Rendern der 3D-Figuren
  let acc = { u: 0, d: 0, h: 0, b: 0 }, frozen = false;
  const orig = { update, draw, hud, tick: SPR.tick };
  update = dt => { if (frozen) return; const t = performance.now(); orig.update(dt); acc.u += performance.now() - t; };
  draw = () => { const t = performance.now(); orig.draw(); acc.d += performance.now() - t; };
  hud = () => { const t = performance.now(); orig.hud(); acc.h += performance.now() - t; };
  SPR.tick = ms => { const t = performance.now(); orig.tick.call(SPR, ms); acc.b += performance.now() - t; };
  save = () => {}; rounds = () => {};
  if (Q.has('notint')) TINT.cold = TINT.pois = TINT.frz = null;

  function setup(sc) {
    Math.random = seeded(42);
    newChar(sc.cls, 'Messung'); setMap(sc.map || 'sanct'); startGame(); closePanel(); G.phase = 'fight'; G.queue = [];
    const p = G.player, c = sc.map ? HW_C : AC, at = Q.get('at') ? Q.get('at').split(',').map(Number) : sc.at;
    p.x = (c + at[0] + 0.5) * T; p.y = (c + at[1] + 0.5) * T; p.order = null;
    for (const id of [...(sc.skills || []), ...(sc.summons || []), sc.aura].filter(Boolean)) P.ranks[id] = 10;
    if (sc.aura) G.buffs[sc.aura] = { s: SK[sc.aura], r: 10, t: 1e9, pt: 0 };
    if (Q.has('mon')) sc.mon = +Q.get('mon');
    for (let i = 0; i < sc.mon; i++) spawn(sc);
    for (const id of sc.summons || []) { P.slots[0] = id; p.mp = 1e5; G.cds[id] = 0; cast(0, p.x + 60, p.y + 40); }
    // alle Gestalten der Szene vorab rendern lassen, gemessen wird danach im eingeschwungenen Zustand
    for (const e of G.ents) if (e.look) SPR.warm(e.look, figH(e) * VS * PX, ['idle', 'walk', 'attack', 'cast', 'death']);
  }
  function spawn(sc) {
    const p = G.player;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * 6.283, d = (150 + Math.random() * 230) * (sc.map ? 1.6 : 1), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.8;
      if (!free(x, y, 18)) continue;
      const nm = sc.pool[Math.floor(Math.random() * sc.pool.length)], e = spawnMon((sc.map ? ZOMBIES : MONSTERS).find(m => (m.lk || m.nm) === nm), x, y, null);
      e.awake = true;
      if (!sc.mortal) e.hp = e.maxhp = 1e9;
      return;
    }
  }
  // Eingaben der Szene: Held wirkt reihum seine Fähigkeiten auf den nächsten Gegner, ist unverwundbar, Gegnerzahl bleibt gleich
  function act(sc, st, dt) {
    const p = G.player;
    p.hp = S.maxhp; p.dead = false; G.dead = 0;
    if ((st.cd -= dt) <= 0 && sc.skills) {
      st.cd = sc.every;
      const id = sc.skills[st.i++ % sc.skills.length], tg = nearest(p, foes(p));
      P.slots[0] = id; p.atkT = 0; p.mp = 1e5; G.cds[id] = 0;
      cast(0, tg ? tg.x : p.x + 120, tg ? tg.y : p.y + 80);
    }
    if (sc.mortal) while (G.ents.filter(e => e.team === 'e' && !e.dead).length < sc.mon) spawn(sc);
  }

  // Zeichenoperationen je Bild zählen (eigene Phase, weil das Zählen selbst Zeit kostet)
  const OPS = ['fill', 'stroke', 'fillRect', 'drawImage', 'createRadialGradient', 'createLinearGradient', 'fillText'];
  const filtered = { n: 0 };
  function countOps(on) {
    for (const c of [ctx, lctx]) {
      for (const k of OPS) {
        if (!on) { delete c[k]; continue; }
        const f = CanvasRenderingContext2D.prototype[k];
        c[k] = function (...a) { BENCH.ops[k] = (BENCH.ops[k] || 0) + 1; if (k === 'drawImage' && this.filter !== 'none') filtered.n++; return f.apply(this, a); };
      }
    }
  }

  function info() {
    let gpu = 'unbekannt';
    try { const gl = document.createElement('canvas').getContext('webgl'), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER); } catch { /* ohne WebGL */ }
    return { ua: navigator.userAgent, gpu, dpr: devicePixelRatio, viewport: `${innerWidth}×${innerHeight}`, render: `${cv.width}×${cv.height}`, light: `${light.width}×${light.height}`, VS: r2(VS), PX: r2(PX), fig3d: SPR.on, preset: typeof GFX !== 'undefined' ? GFX.name + (Q.get('set') ? ` (${Q.get('set')})` : '') : '–', bloomOk: typeof FILTER_OK !== 'undefined' ? FILTER_OK : null };
  }

  function run(name) {
    const sc = SCENES[name], st = { cd: 0, i: 0 }, rec = [], b0 = { ...SPR.stats };
    setup(sc);
    let t0 = null, prev = null, phase = 'warm', n = 0, bm = 0, warm = 0;
    return new Promise(done => {
      function loop(now) {
        if (t0 === null) t0 = now;
        const dt = prev === null ? 0 : (now - prev) / 1000, el = (now - t0) / 1000;
        if (phase === 'warm') {
          orig.tick.call(SPR, 40);
          if ((el > WARM && (!SPR.pending || Q.has('kalt'))) || el > WARM_MAX) { phase = 'measure'; warm = el; t0 = now; acc = { u: 0, d: 0, h: 0, b: 0 }; bm = SPR.stats.baked; }
        } else if (phase === 'measure') {
          rec.push({ dt: now - prev, u: acc.u, d: acc.d, h: acc.h, b: acc.b }); acc = { u: 0, d: 0, h: 0, b: 0 };
          if (el > SECS) { phase = 'ops'; BENCH.ops = {}; filtered.n = 0; countOps(true); n = 0; bm = SPR.stats.baked - bm; }
        } else if (++n > 60) {
          countOps(false);
          const ops = Object.fromEntries(Object.entries(BENCH.ops).map(([k, v]) => [k, Math.round(v / 60)]));
          const iv = rec.slice(1).map(r => r.dt), js = rec.map(r => r.u + r.d + r.h + r.b), dr = rec.map(r => r.d), b1 = SPR.stats;
          results.push({
            scene: name, warm: r2(warm), frames: rec.length, fps: r2(1000 / avg(iv)), frameAvg: r2(avg(iv)), frameP95: r2(pct(iv, 0.95)), frameP99: r2(pct(iv, 0.99)), frameMax: r2(Math.max(...iv)),
            jsAvg: r2(avg(js)), jsP95: r2(pct(js, 0.95)), jsP99: r2(pct(js, 0.99)), drawAvg: r2(avg(dr)), drawP95: r2(pct(dr, 0.95)), updAvg: r2(avg(rec.map(r => r.u))),
            bakeAvg: r2(avg(rec.map(r => r.b))), bakedInMeasure: bm, tintCopies: (b1.tinted || 0) - (b0.tinted || 0), ops, filteredDraws: Math.round(filtered.n / 60), ents: G.ents.length, parts: G.parts.length, fx: G.fx.length,
            heapMB: performance.memory ? r2(performance.memory.usedJSHeapSize / 1048576) : null, atlasMPx: r2(b1.pagePx / 1e6),
            baked: b1.baked - b0.baked, bakeMs: r2((b1.ms - b0.ms) / Math.max(1, b1.baked - b0.baked)), bakeCalls: Math.round((b1.calls - b0.calls) / Math.max(1, b1.baked - b0.baked)), bakeTris: Math.round((b1.tris - b0.tris) / Math.max(1, b1.baked - b0.baked)),
          });
          return done();
        }
        act(sc, st, dt); prev = now;
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    });
  }

  function show(env) {
    const d = document.createElement('pre');
    d.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;margin:0;padding:10px;background:rgba(0,0,0,.85);color:#e8dcc0;font:12px/1.35 monospace;pointer-events:none';
    d.textContent = `Grafik-Messung · ${env.gpu}\nAnsicht ${env.viewport} · Renderfläche ${env.render} · Lichtfläche ${env.light} · DPR ${env.dpr} · Grafikstufe ${env.preset}\n\n` +
      'Szene     FPS   Ø ms  P95   P99   max   | JS Ø  JS P95 Zeichnen Ø | Ops je Bild (fill/stroke/rect/img/rad/lin) · Filter\n' +
      results.map(r => `${r.scene.padEnd(9)} ${String(r.fps).padStart(5)} ${String(r.frameAvg).padStart(5)} ${String(r.frameP95).padStart(5)} ${String(r.frameP99).padStart(5)} ${String(r.frameMax).padStart(5)} | ${String(r.jsAvg).padStart(5)} ${String(r.jsP95).padStart(5)}  ${String(r.drawAvg).padStart(7)}    | ${['fill', 'stroke', 'fillRect', 'drawImage', 'createRadialGradient', 'createLinearGradient'].map(k => r.ops[k] || 0).join('/')} · ${r.filteredDraws}`).join('\n');
    document.body.appendChild(d);
  }

  // Standbild: Szene mit festem Takt vorrechnen, alle Figurenbilder fertig rendern, dann einfrieren
  function shot(name) {
    const sc = SCENES[name], st = { cd: 0, i: 0 };
    setup(sc);
    for (let i = 0; i < +Q.get('shot') * 60; i++) { act(sc, st, 1 / 60); orig.update(1 / 60); }
    for (let i = 0; i < 500 && SPR.pending; i++) orig.tick.call(SPR, 100);
    frozen = true;
    console.log('SHOT', name, G.ents.length, G.parts.length);
  }

  setTimeout(async () => {
    if (Q.has('shot')) return shot(names[0]);
    for (const n of names) await run(n);
    const env = info();
    console.log('BENCH ' + JSON.stringify({ env, results }));
    show(env);
    if (pixel0 !== null || Q.get('pixel') === '0') try { if (pixel0 === null) localStorage.removeItem(PIXEL); else localStorage.setItem(PIXEL, pixel0); } catch { /* privater Modus */ }
  }, 300);
  return { ops: {} };
})();
