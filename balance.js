'use strict';
// Balance-Prüfung: Jede Fähigkeit kämpft automatisch gegen dieselben Wellen und einen Boss, gemessen werden
// Zeit bis zum Sieg und erlittener Schaden. Start: `node balance.js` (Tabelle in der Konsole)
// oder index.html?balance im Browser.
const BAL = (() => {
  // reproduzierbarer Zufall, damit Läufe vergleichbar sind
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const CHECKS = { früh: { lvl: 6, rk: 5, round: 5 }, spät: { lvl: 18, rk: 15, round: 15 } };
  const WAVE = ['Gefallener', 'Zombie', 'Skelett', 'Skelett-Bogenschütze', 'Gnoll', 'Ork-Plünderer', 'Ziegenmensch', 'Gloam', 'Dunkelelfen-Magier', 'Verdammnisritter'];
  const SUPPORT = ['buff', 'shield', 'heal', 'passive', 'teleport'];
  const DT = 1 / 30, CAP = 300, WAVES = 3;

  function setup(s, ck, cls) {
    const own = cls || (CL[s.c] ? s.c : 'bar'), c = CL[own];
    G = null;
    newChar(own, 'Prüfling');
    const basic = c.ranged ? 'shoot' : 'attack', weaponSkill = !!s.wm || !(s.d || s.pct);
    const main = weaponSkill ? (c.ranged ? 'dex' : 'str') : 'ene';
    P.lvl = ck.lvl; P.depth = ck.round;
    P[main] += 3 * (ck.lvl - 1); P.vit += 2 * (ck.lvl - 1);
    P.ranks = s.c === 'base' ? {} : { [s.id]: ck.rk };
    P.slots = [s.id, basic];
    const sc = 1 + 0.12 * (ck.round - 1);
    P.eq = {
      weapon: { slot: 'weapon', base: 'Prüfwaffe', nm: 'Prüfwaffe', rar: 0, min: Math.round(4 * sc), max: Math.round(11 * sc), mods: {}, val: 1 },
      armor: { slot: 'armor', base: 'Prüfrüstung', nm: 'Prüfrüstung', rar: 0, def: Math.round(16 * sc), mods: {}, val: 1 },
      helm: { slot: 'helm', base: 'Prüfhelm', nm: 'Prüfhelm', rar: 0, def: Math.round(6 * sc), mods: {}, val: 1 },
    };
    genLevel();
    G.props = [];
    const p = G.player; S = calc(); p.hp = S.maxhp; p.mp = S.maxmp;
    wave();
    return basic;
  }
  // freier Platz nahe (x, y): schrittweise zur Hallenmitte hin, die immer frei ist
  function spot(x, y, r) {
    const c = (AC + 0.5) * T;
    for (let i = 0; i < 40 && !free(x, y, r); i++) { x += (c - x) * 0.1; y += (c - y) * 0.1; }
    return free(x, y, r) ? [x, y] : [c + rnd(-60, 60), c + rnd(-60, 60)];
  }
  // eine ganze Welle auf einmal, Gruppen aus vier Richtungen
  function wave() {
    const p = G.player;
    WAVE.forEach((nm, i) => {
      const a = i * Math.PI / 2 + 0.4, x = p.x + Math.cos(a) * 380, y = p.y + Math.sin(a) * 380;
      for (let j = 0; j < 4; j++) {
        // nur auf freie Felder, sonst steckt ein Gegner unerreichbar in einer Säule
        const [sx, sy] = spot(x + rnd(-40, 40), y + rnd(-40, 40), 16);
        spawnMon(MONSTERS.find(m => m.nm === nm), sx, sy, null).awake = true;
      }
    });
  }

  // automatische Spielfigur
  // Fähigkeiten ohne eigenen Schaden (Schwächen, Betäuben, Furcht, Bekehren) wirkt sie erst wieder, wenn die Wirkung abläuft
  const recast = s => !(s.d || s.wm || s.pct) && ['nova', 'area', 'convert'].includes(s.t) ? s.deb?.dur || s.fear || s.st || s.dur || 4 : 0;
  function pilot(s, basic, now, mem) {
    const p = G.player, all = foes(p).filter(e => e.team !== 'n'), id = s.id; // Fässer und Autos des Highways greift der Prüfling nicht gezielt an
    // Fernkampf: nächstes Ziel mit freier Sichtlinie, sonst bleibt die Figur an Säulenecken hängen
    let tg = nearest(p, all);
    if (s.t !== 'melee' || !tg) tg = nearest(p, all.filter(e => dist(p, e) < 400 && clearLine(p, e, 6))) || tg;
    const tryMain = (x, y) => cast(0, x, y);
    if (s.t === 'buff' && !G.buffs[id] && tryMain(p.x, p.y)) return;
    if (s.t === 'shield' && G.shield <= 0 && tryMain(p.x, p.y)) return;
    if (s.t === 'heal' && p.hp < S.maxhp * 0.6 && tryMain(p.x, p.y)) return;
    if (s.t === 'summon' && G.ents.filter(e => e.sid === id && !e.dead).length < summonMax(s, rank(id)) && tryMain(tg ? tg.x : p.x, tg ? tg.y : p.y)) return;
    if (!tg) return;
    const off = ['melee', 'proj', 'nova', 'area', 'chain', 'dash', 'convert'].includes(s.t);
    const useMain = off && p.mp >= costOf(id) && !(G.cds[id] > 0) && now - mem.last >= recast(s);
    const k = useMain ? s : SK[basic], d = dist(p, tg);
    const reach = k.t === 'melee' ? p.r + 38 + tg.r : k.t === 'nova' ? k.r * 0.8 : k.t === 'dash' ? 260 : 400;
    if (d > reach || (k.t !== 'nova' && !clearLine(p, tg, 6))) { pathMove(p, tg.x, tg.y, DT); return; }
    let tx = tg.x, ty = tg.y;
    if (useMain && k.corpse) { const c = nearest(p, G.corpses); if (!c) { cast(1, tg.x, tg.y); return; } tx = c.x; ty = c.y; }
    if (useMain && cast(0, tx, ty)) mem.last = now; else cast(1, tg.x, tg.y);
  }

  // Bosskampf: Lord De Seis allein, misst Einzelzielschaden
  function boss() {
    const p = G.player;
    const [x, y] = spot(p.x + 260, p.y - 120, 24);
    // dreifaches Leben, damit auch der Manahaushalt zählt und nicht nur der erste Vorrat
    const e = spawnMon(SEAL_BOSSES[1], x, y, 'boss');
    e.awake = true; e.hp = e.maxhp *= 3;
  }
  const hpLeft = () => G.ents.filter(e => e.team === 'e' && !e.dead).reduce((a, e) => a + e.hp, 0);

  function run(id, ck, mode = 'wave', seed = 7, cls) {
    const real = Math.random, t0 = performance.now(); Math.random = seeded(seed);
    try {
      const s = SK[id], basic = setup(s, ck, cls), p = G.player, max = mode === 'boss' ? 1 : WAVES;
      mode === 'boss' ? boss() : wave();
      const waveHp = hpLeft();
      let taken = 0, t = 0, waves = 1;
      const mem = { last: -99 };
      while (t < CAP) {
        if (!G.ents.some(e => e.team === 'e' && !e.dead)) { if (waves >= max) break; waves++; wave(); }
        pilot(s, basic, t, mem);
        const h0 = p.hp;
        update(DT);
        if (p.hp < h0) taken += h0 - p.hp;
        // nie sterben: fehlendes Leben wird gezählt, aber aufgefüllt
        if (p.dead || p.hp < S.maxhp * 0.5) { p.dead = false; G.dead = 0; p.hp = S.maxhp * 0.5; }
        t += DT;
      }
      // nicht fertig: Zeit anhand des geschafften Anteils hochrechnen
      const done = 1 - (hpLeft() + (max - waves) * waveHp) / (max * waveHp);
      return { t: +(t / Math.max(done, 0.02)).toFixed(1), taken: Math.round(taken / S.maxhp * 100) / 100, done: +done.toFixed(2), ms: Math.round(performance.now() - t0) };
    } finally { Math.random = real; }
  }

  // Kampagne: echte Runden mit Erfahrung, Stufenaufstiegen, Ausrüstung je Runde und Tränken, bis der Held fällt.
  // build = [Hauptfähigkeit, Unterstützung]; Ergebnis: geschaffte Runden, Zeit je Runde, Stufe
  const BUILDS = [
    ['bash', 'battle_orders'], ['whirlwind', 'shout'], ['multiple_shot', 'burst_of_speed'], ['fire_ball', 'frozen_armor'],
    ['frost_nova', 'energy_shield'], ['blizzard', 'frozen_armor'], ['chain_lightning', 'energy_shield'], ['raise_skeleton', 'bone_armor'],
    ['fissure', 'oak_sage'], ['holy_bolt', 'might'], ['poison_arrow', 'regeneration'], ['bw_charge', 'strong_stance'],
  ];
  // map: Karte wie in setMap, die Ferne Oase immer mit demselben Startwert (node balance.js --kampagne oase)
  function campaign([main, sup], maxRound = 40, seed = 3, map = 'sanct') {
    const real = Math.random; Math.random = seeded(seed);
    try {
      const s = SK[main], own = CL[s.c] ? s.c : 'bar', c = CL[own], basic = c.ranged ? 'shoot' : 'attack';
      const stat = s.wm || !(s.d || s.pct) ? (c.ranged ? 'dex' : 'str') : 'ene';
      G = null; newChar(own, 'Kampagne'); P.oaSeed = 1; setMap(map);
      const spend = () => {
        while (P.skillPts > 0) { const r0 = P.skillPts; learn(main); if (P.skillPts === r0) learn(sup); if (P.skillPts === r0) break; }
        while (P.statPts >= 5) { P[stat] += 3; P.vit += 2; P.statPts -= 5; }
      };
      spend(); P.slots = [main, basic];
      genLevel(); G.props = [];
      const p = G.player, times = [], mem = { last: -99 };
      let potT = 0;
      while (P.depth <= maxRound) {
        const sc = 1 + 0.12 * (P.depth - 1);
        Object.assign(P.eq.weapon, { min: Math.round(4 * sc), max: Math.round(11 * sc) });
        P.eq.armor = { slot: 'armor', base: 'Rüstung', nm: 'Rüstung', rar: 0, def: Math.round(16 * sc), mods: {}, val: 1 };
        P.eq.helm = { slot: 'helm', base: 'Helm', nm: 'Helm', rar: 0, def: Math.round(6 * sc), mods: {}, val: 1 };
        P.pots.hp = Math.min(10, P.pots.hp + 2); P.pots.mp = Math.min(10, P.pots.mp + 2);
        S = calc(); p.hp = S.maxhp; p.mp = S.maxmp;
        const round = P.depth;
        startRound();
        let t = 0;
        while (G.phase === 'fight' && !G.dead && t < 300) {
          // Unterstützung aufrechterhalten (über den zweiten Platz), dann kämpfen
          const ss = SK[sup];
          if (P.ranks[sup] && ((ss.t === 'buff' && !G.buffs[sup]) || (ss.t === 'shield' && G.shield <= 0)) && p.atkT <= 0 && p.mp >= costOf(sup)) { P.slots[1] = sup; cast(1, p.x, p.y); P.slots[1] = basic; }
          else pilot(s, basic, t, mem);
          if ((potT -= DT) <= 0) {
            if (p.hp < S.maxhp * 0.4 && P.pots.hp) { potion('hp'); potT = 1; }
            else if (p.mp < costOf(main) && P.pots.mp) { potion('mp'); potT = 1; }
          }
          update(DT); t += DT;
          spend();
        }
        if (G.dead || t >= 300) return { build: main, rounds: round - 1, lvl: P.lvl, times, died: !!G.dead };
        times.push(Math.round(t));
      }
      return { build: main, rounds: maxRound, lvl: P.lvl, times, died: false };
    } finally { Math.random = real; }
  }

  // alle Fähigkeiten an beiden Prüfpunkten; asynchron, damit die Seite nicht einfriert
  async function all(ids = SKILLS.map(s => s.id), onStep, baselines = true) {
    const saveFn = save, emitFn = emit, realPanel = panel;
    save = () => {}; emit = () => {}; panel = 'balance';
    const out = {};
    try {
      for (const ck in CHECKS) for (const id of ids) {
        (out[id] = out[id] || {})[ck] = run(id, CHECKS[ck]);
        out[id][ck + 'Boss'] = run(id, CHECKS[ck], 'boss');
        onStep?.(id, ck);
        await new Promise(r => setTimeout(r));
      }
      // Grundangriff jeder Klasse als Maßstab für Unterstützungsfähigkeiten
      if (baselines) for (const ck in CHECKS) for (const c of CLASSES) {
        const id = c.ranged ? 'shoot' : 'attack', o = out['basis:' + c.id] = out['basis:' + c.id] || {};
        o[ck] = run(id, CHECKS[ck], 'wave', 7, c.id); o[ck + 'Boss'] = run(id, CHECKS[ck], 'boss', 7, c.id);
      }
    } finally { save = saveFn; emit = emitFn; panel = realPanel; }
    return out;
  }

  // Kennzahlen gegenüber dem Grundangriff der Klasse (1 = gleich gut):
  // W = Wellen, B = Boss, A = Angriff (Mittel aus W und B), S = Schutz (weniger erlittener Schaden in den Wellen)
  function score(res) {
    const rows = [];
    for (const id in res) {
      if (id.startsWith('basis:')) continue;
      // Angriffsfähigkeiten gegen den Grundangriff des Barbaren, Unterstützung gegen den Grundangriff der eigenen Klasse
      const s = SK[id], own = res['basis:' + (CL[s.c] ? s.c : 'bar')], b = SUPPORT.includes(s.t) || !(s.d || s.wm || s.pct || s.t === 'summon') ? own : res['basis:bar'];
      const r = { id, nm: s.nm, t: s.t, c: s.c };
      for (const ck in CHECKS) {
        const w = b[ck].t / res[id][ck].t, bo = b[ck + 'Boss'].t / res[id][ck + 'Boss'].t;
        Object.assign(r, { [ck + 'W']: +w.toFixed(2), [ck + 'B']: +bo.toFixed(2), [ck + 'A']: +Math.sqrt(w * bo).toFixed(2), [ck + 'S']: +(b[ck].taken / Math.max(0.01, res[id][ck].taken)).toFixed(2) });
      }
      rows.push(r);
    }
    return rows;
  }

  return { CHECKS, BUILDS, run, all, score, campaign, result: null };
})();

if (typeof location !== 'undefined' && location.search.includes('balance')) addEventListener('load', async () => {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;inset:0;z-index:99;margin:0;padding:12px;overflow:auto;background:#000d;color:#ddd;font:12px monospace';
  document.body.appendChild(box);
  const res = await BAL.all(undefined, (id, ck) => { box.textContent = `Prüfe ${ck}: ${SK[id].nm} …`; });
  BAL.result = res;
  const rows = BAL.score(res).sort((a, b) => b.spätA - a.spätA);
  box.textContent = 'Fähigkeit'.padEnd(30) + 'Typ'.padEnd(10) + 'früh Angriff  früh Schutz  spät Angriff  spät Schutz\n' +
    rows.map(r => r.nm.padEnd(30) + r.t.padEnd(10) + [r.frühA, r.frühS, r.spätA, r.spätS].map(v => String(v).padStart(12)).join('  ')).join('\n');
  console.table(rows);
});

// Node: Spielcode mit Attrappen für Seite und Zeichenfläche laden und alle Fähigkeiten prüfen,
// verteilt auf alle Prozessorkerne
if (typeof require === 'function' && typeof module === 'object' && require.main === module) {
  const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { fork } = require('child_process');
  const load = () => {
    const stub = new Proxy(function () {}, {
      get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === Symbol.iterator ? function* () {} : stub,
      apply: () => stub, construct: () => stub, set: () => true,
    });
    const store = { 'sanctuary-infmana': '0' }; // Balance und Kampagne immer mit echtem Mana
    const ctx = {
      document: stub, Image: stub, addEventListener: () => {}, requestAnimationFrame: () => {}, getComputedStyle: () => stub,
      localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
      innerWidth: 1280, innerHeight: 800, location: { search: '' }, console, setTimeout, performance,
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    // Skripte in der Reihenfolge von index.html, ohne three.js (die 3D-Figuren fallen ohne WebGL ohnehin weg)
    const files = [...fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').matchAll(/^<script src="([^"]+)"/gm)].map(m => m[1]).filter(f => !f.startsWith('vendor/'));
    for (const f of [...files, 'balance.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
    return ctx;
  };
  const ctx = load();
  if (process.env.BAL_CAMP) {
    vm.runInContext(`(async () => { save = () => {}; emit = () => {}; return BAL.campaign(${process.env.BAL_CAMP}); })()`, ctx).then(r => process.send(r, () => process.exit(0)));
  } else if (process.argv[2] === '--kampagne') { // node balance.js --kampagne [sanct|hw|oase]
    const builds = vm.runInContext('BAL.BUILDS', ctx), t0 = Date.now(), map = process.argv[3] || 'sanct';
    Promise.all(builds.map(b => new Promise((ok, fail) => {
      const c = fork(__filename, [], { env: { ...process.env, BAL_CAMP: `${JSON.stringify(b)}, 40, 3, ${JSON.stringify(map)}` } });
      c.on('message', ok); c.on('exit', code => code && fail(new Error(`${b[0]} abgebrochen`)));
    }))).then(rs => {
      const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : '-';
      console.log('Ausrichtung'.padEnd(18) + 'Runden  Stufe  Ende      Ø Zeit R1–5  R6–15  R16+');
      for (const r of rs) console.log(r.build.padEnd(18) + String(r.rounds).padStart(6) + String(r.lvl).padStart(7) + '  ' + (r.died ? 'gefallen' : r.rounds >= 40 ? 'Ziel' : 'zu lang').padEnd(9) + String(avg(r.times.slice(0, 5))).padStart(12) + String(avg(r.times.slice(5, 15))).padStart(7) + String(avg(r.times.slice(15))).padStart(6));
      const sorted = rs.map(r => r.rounds).sort((a, b) => a - b);
      console.log(`\nMedian ${sorted[sorted.length >> 1]} Runden · Karte ${map} · ${Math.round((Date.now() - t0) / 1000)} s`);
    });
  } else if (process.env.BAL_PART) {
    vm.runInContext(`BAL.all(${process.env.BAL_PART}, null, ${process.env.BAL_BASE === '1'})`, ctx).then(res => process.send(res, () => process.exit(0)));
  } else {
    const args = process.argv.slice(2), ids = args.length ? args : vm.runInContext('SKILLS.map(s => s.id)', ctx);
    const n = Math.max(1, Math.min(os.cpus().length, ids.length)), t0 = Date.now();
    const parts = Array.from({ length: n }, (_, i) => ids.filter((_, j) => j % n === i));
    Promise.all(parts.map((part, i) => new Promise((ok, fail) => {
      const c = fork(__filename, [], { env: { ...process.env, BAL_PART: JSON.stringify(part), BAL_BASE: i ? '0' : '1' } });
      c.on('message', ok); c.on('exit', code => code && fail(new Error(`Teil ${i} abgebrochen`)));
    }))).then(rs => {
      const res = Object.assign({}, ...rs);
      ctx.__res = res;
      const rows = vm.runInContext('BAL.score(__res)', ctx);
      fs.writeFileSync(path.join(__dirname, 'balance-result.json'), JSON.stringify({ rows, res }));
      const f = v => String(v).padStart(6);
      console.log('Fähigkeit'.padEnd(28) + 'Typ'.padEnd(9) + '  früh: Welle  Boss  Angr Schutz   spät: Welle  Boss  Angr Schutz');
      for (const r of rows.sort((a, b) => b.spätA - a.spätA)) console.log(r.nm.slice(0, 27).padEnd(28) + r.t.padEnd(9) + '       ' + [r.frühW, r.frühB, r.frühA, r.frühS].map(f).join('') + '         ' + [r.spätW, r.spätB, r.spätA, r.spätS].map(f).join(''));
      console.log(`\n${rows.length} Fähigkeiten in ${Math.round((Date.now() - t0) / 1000)} s auf ${n} Kernen · Rohdaten: balance-result.json`);
    });
  }
}
