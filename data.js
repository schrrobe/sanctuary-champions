// Spieldaten: Klassen, Fähigkeiten, Monster, Gegenstände.
// Elemente: phys, fire, cold, light, pois, mag
// Fähigkeitstypen: melee, proj, nova, area, chain, summon, buff, shield, teleport, dash, heal, convert, passive

const EL = {
  phys: ['Physisch', '#d8d0c0'], fire: ['Feuer', '#ff7a2a'], cold: ['Kälte', '#7fd4ff'],
  light: ['Blitz', '#fff27a'], pois: ['Gift', '#7dff5a'], mag: ['Magie', '#d78cff'],
};

const CLASSES = [
  // Diablo II: Lord of Destruction
  { id: 'ama', nm: 'Amazone', g: 'D2', col: '#e0c070', str: 20, dex: 25, vit: 20, ene: 15, ranged: 1, start: ['magic_arrow', 'jab'] },
  { id: 'asn', nm: 'Assassine', g: 'D2', col: '#9b7fe0', str: 20, dex: 20, vit: 20, ene: 25, start: ['tiger_strike', 'fire_blast'] },
  { id: 'bar', nm: 'Barbar', g: 'D2', col: '#c9783f', str: 30, dex: 20, vit: 25, ene: 10, start: ['bash', 'howl'] },
  { id: 'dru', nm: 'Druide', g: 'D2', col: '#6fae55', str: 15, dex: 20, vit: 25, ene: 20, start: ['firestorm', 'raven'] },
  { id: 'nec', nm: 'Totenbeschwörer', g: 'D2', col: '#b4c4aa', str: 15, dex: 25, vit: 15, ene: 25, start: ['raise_skeleton', 'teeth'] },
  { id: 'pal', nm: 'Paladin', g: 'D2', col: '#efe6b8', str: 25, dex: 20, vit: 25, ene: 15, start: ['sacrifice', 'might'] },
  { id: 'sor', nm: 'Zauberin', g: 'D2', col: '#6ab0f0', str: 10, dex: 25, vit: 10, ene: 35, start: ['fire_bolt', 'ice_bolt'] },
  // Champions: Return to Arms
  { id: 'bw', nm: 'Barbaren-Krieger', g: 'CRtA', col: '#d0603a', str: 30, dex: 20, vit: 30, ene: 5, start: ['slam', 'shield_bash'] },
  { id: 'ew', nm: 'Erudit-Zauberer', g: 'CRtA', col: '#4f7de0', str: 10, dex: 20, vit: 15, ene: 40, start: ['shock_of_fire', 'root'] },
  { id: 'wr', nm: 'Waldelfen-Waldläufer', g: 'CRtA', col: '#58c070', str: 15, dex: 30, vit: 20, ene: 15, ranged: 1, start: ['wr_fire_arrow', 'entangle'] },
  { id: 'hc', nm: 'Hochelfen-Kleriker', g: 'CRtA', col: '#f5f0d0', str: 20, dex: 15, vit: 25, ene: 25, start: ['hc_holy_bolt', 'healing'] },
  { id: 'sk', nm: 'Dunkelelfen-Schattenritter', g: 'CRtA', col: '#9050c0', str: 25, dex: 15, vit: 25, ene: 20, start: ['disease_bolt', 'life_tap'] },
  { id: 'vb', nm: 'Vah-Shir-Berserker', g: 'CRtA', col: '#e0a040', str: 30, dex: 25, vit: 25, ene: 5, start: ['throwing', 'battle_cry'] },
  { id: 'is', nm: 'Iksar-Schamane', g: 'CRtA', col: '#60b090', str: 15, dex: 20, vit: 20, ene: 30, start: ['poison_bolt', 'summon_badger'] },
];

// Gruppen für den Fähigkeiten-Filter, die keine spielbare Klasse sind
const GROUPS = { base: 'Basis', crta: 'CRtA Allgemein' };

const SKILLS = [
  // Basis (immer gelernt)
  { id: 'attack', nm: 'Angriff', g: 'Basis', c: 'base', t: 'melee', q: 1, mp: 0, wm: 1, max: 1 },
  { id: 'shoot', nm: 'Schuss', g: 'Basis', c: 'base', t: 'proj', q: 1, mp: 0, wm: 1, v: 520, max: 1 },

  // ---------- Diablo II: Amazone ----------
  { id: 'jab', nm: 'Stoß', g: 'D2', c: 'ama', t: 'melee', q: 1, mp: 2, wm: 0.72, hits: 3 },
  { id: 'magic_arrow', nm: 'Magischer Pfeil', g: 'D2', c: 'ama', t: 'proj', q: 1, mp: 1, d: 11.9, el: 'mag', v: 560 },
  { id: 'fire_arrow', nm: 'Feuerpfeil', g: 'D2', c: 'ama', t: 'proj', q: 1, mp: 3, d: 30.0, el: 'fire', v: 540 },
  { id: 'cold_arrow', nm: 'Kältepfeil', g: 'D2', c: 'ama', t: 'proj', q: 6, mp: 3, d: 23.2, el: 'cold', v: 540 },
  { id: 'multiple_shot', nm: 'Mehrfachschuss', g: 'D2', c: 'ama', t: 'proj', q: 6, mp: 4, wm: 0.63, k: 5, sp: 0.6, v: 520 },
  { id: 'power_strike', nm: 'Kraftstoß', g: 'D2', c: 'ama', t: 'melee', q: 6, mp: 3, wm: 2.93, d: 26.8, el: 'light' },
  { id: 'poison_javelin', nm: 'Giftwurfspeer', g: 'D2', c: 'ama', t: 'proj', q: 6, mp: 4, d: 15.1, el: 'pois', pr: 3, v: 480 },
  { id: 'guided_arrow', nm: 'Gelenkter Pfeil', g: 'D2', c: 'ama', t: 'proj', q: 18, mp: 6, wm: 18.05, hm: 1, v: 500 },
  { id: 'freezing_arrow', nm: 'Eispfeil', g: 'D2', c: 'ama', t: 'proj', q: 18, mp: 8, d: 6.3, el: 'cold', ex: 80, v: 520 },
  { id: 'lightning_fury', nm: 'Blitzfurie', g: 'D2', c: 'ama', t: 'proj', q: 30, mp: 12, d: 52.3, el: 'light', pr: 99, v: 760 },
  { id: 'valkyrie', nm: 'Walküre', g: 'D2', c: 'ama', t: 'summon', q: 30, mp: 25, cd: 4, m: 'valk', k: 1, pw: 2.15 },
  { id: 'critical_strike', nm: 'Kritischer Schlag', g: 'D2', c: 'ama', t: 'passive', q: 1, mods: { crit: 0.03 } },
  { id: 'd2_dodge', nm: 'Ausweichen', g: 'D2', c: 'ama', t: 'passive', q: 6, mods: { dodge: 0.025 } },

  // ---------- Diablo II: Zauberin ----------
  { id: 'fire_bolt', nm: 'Feuerblitz', g: 'D2', c: 'sor', t: 'proj', q: 1, mp: 2, d: 11, el: 'fire', v: 460 },
  { id: 'ice_bolt', nm: 'Eisblitz', g: 'D2', c: 'sor', t: 'proj', q: 1, mp: 2, d: 10.9, el: 'cold', v: 460 },
  { id: 'charged_bolt', nm: 'Geladener Blitz', g: 'D2', c: 'sor', t: 'proj', q: 1, mp: 3, d: 2.6, el: 'light', k: 6, sp: 1.4, v: 300, life: 1.2 },
  { id: 'frost_nova', nm: 'Frost-Nova', g: 'D2', c: 'sor', t: 'nova', q: 6, mp: 8, d: 2.8, el: 'cold', r: 170 },
  { id: 'static_field', nm: 'Statikfeld', g: 'D2', c: 'sor', t: 'nova', q: 6, mp: 9, cd: 0.6, el: 'light', r: 210, pct: 0.25 },
  { id: 'fire_ball', nm: 'Feuerball', g: 'D2', c: 'sor', t: 'proj', q: 12, mp: 7, d: 3.8, el: 'fire', ex: 80, v: 480 },
  { id: 'lightning', nm: 'Blitz', g: 'D2', c: 'sor', t: 'proj', q: 12, mp: 8, d: 11.5, el: 'light', pr: 99, v: 900, sz: 4 },
  { id: 'teleport', nm: 'Teleportieren', g: 'D2', c: 'sor', t: 'teleport', q: 18, mp: 12, rng: 420 },
  { id: 'chain_lightning', nm: 'Kettenblitz', g: 'D2', c: 'sor', t: 'chain', q: 18, mp: 10, d: 8.8, el: 'light', jumps: 5 },
  { id: 'frozen_armor', nm: 'Frostrüstung', g: 'D2', c: 'sor', t: 'buff', q: 1, mp: 7, dur: 120, mods: { armor: 15 } },
  { id: 'energy_shield', nm: 'Energieschild', g: 'D2', c: 'sor', t: 'shield', q: 24, mp: 20, cd: 10, amt: 80 },
  { id: 'blizzard', nm: 'Blizzard', g: 'D2', c: 'sor', t: 'area', q: 24, mp: 20, cd: 1.5, d: 0.9, el: 'cold', r: 130, ticks: 8, iv: 0.35 },
  { id: 'meteor', nm: 'Meteor', g: 'D2', c: 'sor', t: 'area', q: 24, mp: 18, d: 6.0, el: 'fire', r: 110, delay: 0.9, burn: 3 },
  { id: 'frozen_orb', nm: 'Frostkugel', g: 'D2', c: 'sor', t: 'proj', q: 30, mp: 25, cd: 1, d: 30.3, el: 'cold', v: 220, shards: 1, life: 1.6 },
  { id: 'hydra', nm: 'Hydra', g: 'D2', c: 'sor', t: 'summon', q: 30, mp: 22, m: 'hydra', k: 2, dur: 10, pw: 0.87 },
  { id: 'warmth', nm: 'Wärme', g: 'D2', c: 'sor', t: 'passive', q: 1, mods: { mregen: 0.3 } },
  { id: 'fire_mastery', nm: 'Feuer-Beherrschung', g: 'D2', c: 'sor', t: 'passive', q: 30, mods: { fire: 0.1 } },
  { id: 'cold_mastery', nm: 'Kälte-Beherrschung', g: 'D2', c: 'sor', t: 'passive', q: 30, mods: { cold: 0.1 } },
  { id: 'lightning_mastery', nm: 'Blitz-Beherrschung', g: 'D2', c: 'sor', t: 'passive', q: 30, mods: { light: 0.1 } },

  // ---------- Diablo II: Totenbeschwörer ----------
  { id: 'teeth', nm: 'Zähne', g: 'D2', c: 'nec', t: 'proj', q: 1, mp: 3, d: 4.0, el: 'mag', k: 3, sp: 0.5, v: 480 },
  { id: 'raise_skeleton', nm: 'Skelett erwecken', g: 'D2', c: 'nec', t: 'summon', q: 1, mp: 6, cd: 0.5, m: 'skel', k: 2, pw: 1.12 },
  { id: 'amplify_damage', nm: 'Schaden verstärken', g: 'D2', c: 'nec', t: 'area', q: 1, mp: 4, r: 110, deb: { amp: 1.5, dur: 8 } },
  { id: 'bone_armor', nm: 'Knochenpanzer', g: 'D2', c: 'nec', t: 'shield', q: 1, mp: 10, cd: 6, amt: 40 },
  { id: 'clay_golem', nm: 'Lehmgolem', g: 'D2', c: 'nec', t: 'summon', q: 1, mp: 15, cd: 2, m: 'golem', k: 1, pw: 1.51 },
  { id: 'skeletal_mage', nm: 'Skelettmagier', g: 'D2', c: 'nec', t: 'summon', q: 6, mp: 8, cd: 0.5, m: 'smage', k: 2, pw: 1.59 },
  { id: 'corpse_explosion', nm: 'Leichenexplosion', g: 'D2', c: 'nec', t: 'area', q: 6, mp: 10, d: 11.7, el: 'fire', r: 110, corpse: 1 },
  { id: 'skeleton_mastery', nm: 'Skelett-Beherrschung', g: 'D2', c: 'nec', t: 'passive', q: 1, mods: { minionPct: 0.12 } },
  { id: 'bone_spear', nm: 'Knochenspeer', g: 'D2', c: 'nec', t: 'proj', q: 18, mp: 8, d: 14.8, el: 'mag', pr: 99, v: 650 },
  { id: 'blood_golem', nm: 'Blutgolem', g: 'D2', c: 'nec', t: 'summon', q: 12, mp: 20, cd: 2, m: 'bgolem', k: 1, pw: 1.59 },
  { id: 'decrepify', nm: 'Altersschwäche', g: 'D2', c: 'nec', t: 'area', q: 24, mp: 10, r: 120, deb: { amp: 1.5, slow: 1, dur: 8 } },
  { id: 'poison_nova', nm: 'Giftnova', g: 'D2', c: 'nec', t: 'nova', q: 30, mp: 20, d: 11.0, el: 'pois', r: 230 },
  { id: 'bone_spirit', nm: 'Knochengeist', g: 'D2', c: 'nec', t: 'proj', q: 30, mp: 14, d: 1784.9, el: 'mag', hm: 1, v: 380, life: 3 },

  // ---------- Diablo II: Barbar ----------
  { id: 'bash', nm: 'Hieb', g: 'D2', c: 'bar', t: 'melee', q: 1, mp: 2, wm: 8.54, kb: 60 },
  { id: 'howl', nm: 'Heulen', g: 'D2', c: 'bar', t: 'nova', q: 1, mp: 4, cd: 6, r: 220, fear: 3 },
  { id: 'double_swing', nm: 'Doppelschlag', g: 'D2', c: 'bar', t: 'melee', q: 6, mp: 2, wm: 7.19, hits: 2 },
  { id: 'shout', nm: 'Schrei', g: 'D2', c: 'bar', t: 'buff', q: 6, mp: 6, dur: 60, mods: { armor: 20 } },
  { id: 'leap_attack', nm: 'Sprungangriff', g: 'D2', c: 'bar', t: 'dash', q: 18, mp: 9, wm: 1.17, land: 90, v: 700 },
  { id: 'battle_orders', nm: 'Kampfbefehle', g: 'D2', c: 'bar', t: 'buff', q: 24, mp: 12, dur: 90, mods: { lifePct: 0.25, manaPct: 0.25 } },
  { id: 'whirlwind', nm: 'Wirbelwind', g: 'D2', c: 'bar', t: 'dash', q: 30, mp: 10, wm: 1.54, spin: 1, v: 360 },
  { id: 'berserk', nm: 'Berserker', g: 'D2', c: 'bar', t: 'melee', q: 30, mp: 5, wm: 55.75, el: 'mag' },
  { id: 'war_cry', nm: 'Kriegsschrei', g: 'D2', c: 'bar', t: 'nova', q: 30, mp: 12, cd: 3, d: 6.4, el: 'phys', r: 160, st: 1.5 },
  { id: 'sword_mastery', nm: 'Waffen-Beherrschung', g: 'D2', c: 'bar', t: 'passive', q: 1, mods: { dmgPct: 0.08, crit: 0.01 } },
  { id: 'iron_skin', nm: 'Eisenhaut', g: 'D2', c: 'bar', t: 'passive', q: 18, mods: { armor: 8 } },
  { id: 'increased_speed', nm: 'Erhöhtes Tempo', g: 'D2', c: 'bar', t: 'passive', q: 12, mods: { speed: 0.04 } },
  { id: 'natural_resistance', nm: 'Natürlicher Widerstand', g: 'D2', c: 'bar', t: 'passive', q: 24, mods: { res: 0.04 } },

  // ---------- Diablo II: Paladin ----------
  { id: 'sacrifice', nm: 'Opfer', g: 'D2', c: 'pal', t: 'melee', q: 1, mp: 0, wm: 1.13, self: 0.04 },
  { id: 'smite', nm: 'Niederschmettern', g: 'D2', c: 'pal', t: 'melee', q: 1, mp: 2, wm: 4.68, st: 1 },
  { id: 'might', nm: 'Macht (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 1, mp: 5, dur: 60, mods: { dmgPct: 0.3 } },
  { id: 'prayer', nm: 'Gebet (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 1, mp: 5, dur: 60, pulse: { iv: 2, r: 250, heal: 0.03 } },
  { id: 'holy_fire', nm: 'Heiliges Feuer (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 6, mp: 8, dur: 60, pulse: { iv: 1, r: 170, d: 0.7, el: 'fire' } },
  { id: 'holy_bolt', nm: 'Heiliger Blitz', g: 'D2', c: 'pal', t: 'proj', q: 6, mp: 4, d: 92.2, el: 'mag', v: 500 },
  { id: 'charge', nm: 'Ansturm', g: 'D2', c: 'pal', t: 'dash', q: 12, mp: 9, wm: 16.97, v: 750 },
  { id: 'holy_freeze', nm: 'Heiliger Frost (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 18, mp: 10, dur: 60, pulse: { iv: 1, r: 170, d: 0.7, el: 'cold' } },
  { id: 'blessed_hammer', nm: 'Gesegneter Hammer', g: 'D2', c: 'pal', t: 'proj', q: 18, mp: 6, d: 15.3, el: 'mag', spiral: 1, pr: 99, life: 2 },
  { id: 'conversion', nm: 'Bekehrung', g: 'D2', c: 'pal', t: 'convert', q: 24, mp: 12, cd: 4, dur: 20 },
  { id: 'conviction', nm: 'Überzeugung (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 24, mp: 12, dur: 60, pulse: { iv: 1, r: 220, amp: 1.4 } },
  { id: 'fanaticism', nm: 'Fanatismus (Aura)', g: 'D2', c: 'pal', t: 'buff', q: 30, mp: 12, dur: 60, mods: { dmgPct: 0.3, atkSpd: 0.25 } },
  { id: 'fist_of_heavens', nm: 'Faust der Himmel', g: 'D2', c: 'pal', t: 'area', q: 30, mp: 25, cd: 1, d: 32.9, el: 'light', r: 90, delay: 0.2 },

  // ---------- Diablo II: Druide ----------
  { id: 'firestorm', nm: 'Feuersturm', g: 'D2', c: 'dru', t: 'proj', q: 1, mp: 4, d: 2.8, el: 'fire', k: 3, sp: 0.3, v: 340, pr: 2 },
  { id: 'raven', nm: 'Rabe', g: 'D2', c: 'dru', t: 'summon', q: 1, mp: 6, m: 'raven', k: 4, dur: 15, pw: 1.53 },
  { id: 'arctic_blast', nm: 'Arktischer Wind', g: 'D2', c: 'dru', t: 'proj', q: 6, mp: 4, d: 1.7, el: 'cold', k: 7, sp: 0.7, v: 420, life: 0.45, pr: 99 },
  { id: 'molten_boulder', nm: 'Glühender Felsbrocken', g: 'D2', c: 'dru', t: 'proj', q: 6, mp: 8, d: 9.3, el: 'fire', v: 250, pr: 99, kb: 80, sz: 12 },
  { id: 'summon_spirit_wolf', nm: 'Geisterwolf beschwören', g: 'D2', c: 'dru', t: 'summon', q: 6, mp: 10, cd: 1, m: 'wolf', k: 2, pw: 1.46 },
  { id: 'cyclone_armor', nm: 'Zyklonrüstung', g: 'D2', c: 'dru', t: 'shield', q: 12, mp: 10, cd: 8, amt: 60 },
  { id: 'fissure', nm: 'Erdspalte', g: 'D2', c: 'dru', t: 'area', q: 12, mp: 15, cd: 1, d: 1.4, el: 'fire', r: 120, ticks: 6, iv: 0.3 },
  { id: 'oak_sage', nm: 'Eichenweiser', g: 'D2', c: 'dru', t: 'buff', q: 6, mp: 12, dur: 90, mods: { lifePct: 0.3 } },
  { id: 'twister', nm: 'Twister', g: 'D2', c: 'dru', t: 'proj', q: 18, mp: 6, d: 4.9, el: 'phys', k: 3, sp: 0.4, v: 360, st: 0.6, pr: 3 },
  { id: 'tornado', nm: 'Tornado', g: 'D2', c: 'dru', t: 'proj', q: 24, mp: 10, d: 20.1, el: 'phys', v: 330, pr: 99, sz: 10 },
  { id: 'summon_grizzly', nm: 'Grizzly beschwören', g: 'D2', c: 'dru', t: 'summon', q: 30, mp: 30, cd: 3, m: 'bear', k: 1, pw: 1.7 },
  { id: 'hurricane', nm: 'Hurrikan', g: 'D2', c: 'dru', t: 'buff', q: 30, mp: 25, dur: 10, cd: 10, pulse: { iv: 0.4, r: 200, d: 0.3, el: 'cold' } },
  { id: 'volcano', nm: 'Vulkan', g: 'D2', c: 'dru', t: 'area', q: 24, mp: 20, cd: 2, d: 1.2, el: 'fire', r: 100, ticks: 10, iv: 0.4 },

  // ---------- Diablo II: Assassine ----------
  { id: 'tiger_strike', nm: 'Tigerschlag', g: 'D2', c: 'asn', t: 'melee', q: 1, mp: 1, wm: 1.33 },
  { id: 'fire_blast', nm: 'Feuerstoß', g: 'D2', c: 'asn', t: 'proj', q: 1, mp: 3, d: 3.0, el: 'fire', ex: 60, v: 420 },
  { id: 'psychic_hammer', nm: 'Psychischer Hammer', g: 'D2', c: 'asn', t: 'proj', q: 1, mp: 4, d: 48.0, el: 'mag', kb: 70, v: 400 },
  { id: 'claw_mastery', nm: 'Klauen-Beherrschung', g: 'D2', c: 'asn', t: 'passive', q: 1, mods: { dmgPct: 0.07, crit: 0.01 } },
  { id: 'burst_of_speed', nm: 'Tempoexplosion', g: 'D2', c: 'asn', t: 'buff', q: 6, mp: 10, dur: 60, mods: { speed: 0.25, atkSpd: 0.2 } },
  { id: 'wake_of_fire', nm: 'Flammenwelle', g: 'D2', c: 'asn', t: 'proj', q: 6, mp: 8, d: 2.6, el: 'fire', k: 5, sp: 0.8, v: 300, pr: 99, life: 1 },
  { id: 'dragon_talon', nm: 'Drachenklaue', g: 'D2', c: 'asn', t: 'melee', q: 6, mp: 3, wm: 3.23, hits: 3, kb: 20 },
  { id: 'cloak_of_shadows', nm: 'Schattenmantel', g: 'D2', c: 'asn', t: 'nova', q: 12, mp: 13, cd: 4, r: 260, st: 2 },
  { id: 'shadow_warrior', nm: 'Schattenkrieger', g: 'D2', c: 'asn', t: 'summon', q: 18, mp: 18, cd: 3, m: 'shadow', k: 1, pw: 1.69 },
  { id: 'venom', nm: 'Gift', g: 'D2', c: 'asn', t: 'buff', q: 30, mp: 12, dur: 60, mods: { ae: ['pois', 10] } },
  { id: 'lightning_sentry', nm: 'Blitz-Wächter', g: 'D2', c: 'asn', t: 'summon', q: 24, mp: 20, m: 'sentry', k: 3, dur: 12, pw: 0.72 },
  { id: 'mind_blast', nm: 'Geiststoß', g: 'D2', c: 'asn', t: 'area', q: 24, mp: 9, cd: 3, d: 5.7, el: 'mag', r: 100, deb: { stun: 1.5, dur: 1.5 } },
  { id: 'fade', nm: 'Verblassen', g: 'D2', c: 'asn', t: 'buff', q: 18, mp: 10, dur: 60, mods: { res: 0.2, armor: 10 } },

  // ---------- Champions: Allgemein (von mehreren Klassen geteilt) ----------
  { id: 'bind_wound', nm: 'Wunden binden', g: 'CRtA', c: 'crta', t: 'passive', q: 1, mods: { regen: 0.5 } },
  { id: 'slashing', nm: 'Hiebwaffen', g: 'CRtA', c: 'crta', t: 'passive', q: 1, mods: { dmgPct: 0.06 } },
  { id: 'blunt_weapons', nm: 'Stumpfe Waffen', g: 'CRtA', c: 'crta', t: 'passive', q: 1, mods: { dmgPct: 0.05, armor: 2 } },
  { id: 'endurance', nm: 'Ausdauer', g: 'CRtA', c: 'crta', t: 'passive', q: 1, mods: { lifePct: 0.04 } },
  { id: 'critical_hit', nm: 'Kritischer Treffer', g: 'CRtA', c: 'crta', t: 'passive', q: 6, mods: { crit: 0.025 } },
  { id: 'dodge', nm: 'Ausweichen (CRtA)', g: 'CRtA', c: 'crta', t: 'passive', q: 6, mods: { dodge: 0.02 } },
  { id: 'riposte', nm: 'Riposte', g: 'CRtA', c: 'crta', t: 'passive', q: 6, mods: { thorns: 4 } },
  { id: 'dual_wield', nm: 'Beidhändig', g: 'CRtA', c: 'crta', t: 'passive', q: 12, mods: { atkSpd: 0.05 } },
  { id: 'concentration', nm: 'Konzentration', g: 'CRtA', c: 'crta', t: 'passive', q: 1, mods: { mregen: 0.35 } },
  { id: 'healing', nm: 'Heilung', g: 'CRtA', c: 'crta', t: 'heal', q: 1, mp: 8, cd: 2, amt: 0.2 },
  { id: 'root', nm: 'Wurzeln', g: 'CRtA', c: 'crta', t: 'area', q: 1, mp: 5, cd: 5, r: 80, deb: { stun: 2.5, dur: 2.5 } },
  { id: 'shield_bash', nm: 'Schildstoß', g: 'CRtA', c: 'crta', t: 'melee', q: 1, mp: 3, wm: 20.57, st: 0.8, kb: 50 },
  { id: 'cyclone', nm: 'Zyklon', g: 'CRtA', c: 'crta', t: 'nova', q: 12, mp: 8, wm: 1.0, r: 110 },

  // ---------- Champions: Barbaren-Krieger ----------
  { id: 'slam', nm: 'Wuchtschlag', g: 'CRtA', c: 'bw', t: 'melee', q: 1, mp: 2, wm: 0.45, aoe: 70, kb: 40 },
  { id: 'bw_charge', nm: 'Sturmangriff', g: 'CRtA', c: 'bw', t: 'dash', q: 6, mp: 8, wm: 13.85, v: 760, st: 0.6 },
  { id: 'stunning_strike', nm: 'Betäubender Schlag', g: 'CRtA', c: 'bw', t: 'melee', q: 6, mp: 4, wm: 35.27, st: 1.6 },
  { id: 'ground_pound', nm: 'Bodenstampfer', g: 'CRtA', c: 'bw', t: 'nova', q: 12, mp: 10, cd: 2, wm: 1.2, r: 150, st: 1 },
  { id: 'strong_stance', nm: 'Fester Stand', g: 'CRtA', c: 'bw', t: 'buff', q: 18, mp: 8, dur: 30, mods: { armor: 30, res: 0.1 } },
  { id: 'ancestral_call', nm: 'Ruf der Ahnen', g: 'CRtA', c: 'bw', t: 'summon', q: 24, mp: 25, cd: 6, m: 'ancestor', k: 2, dur: 30, pw: 1.88 },
  { id: 'bw_natural_resistance', nm: 'Natürliche Resistenz', g: 'CRtA', c: 'bw', t: 'passive', q: 6, mods: { res: 0.04 } },

  // ---------- Champions: Erudit-Zauberer ----------
  { id: 'bolt_of_shock', nm: 'Schockbolzen', g: 'CRtA', c: 'ew', t: 'proj', q: 1, mp: 2, d: 10, el: 'light', v: 600 },
  { id: 'shock_of_fire', nm: 'Feuerschock', g: 'CRtA', c: 'ew', t: 'proj', q: 1, mp: 2, d: 10.3, el: 'fire', v: 480 },
  { id: 'shock_of_frost', nm: 'Frostschock', g: 'CRtA', c: 'ew', t: 'proj', q: 1, mp: 2, d: 10, el: 'cold', v: 480 },
  { id: 'cone_of_fire', nm: 'Feuerkegel', g: 'CRtA', c: 'ew', t: 'proj', q: 6, mp: 6, d: 1.5, el: 'fire', k: 6, sp: 0.8, v: 420, life: 0.5, pr: 99 },
  { id: 'cone_of_frost', nm: 'Frostkegel', g: 'CRtA', c: 'ew', t: 'proj', q: 6, mp: 6, d: 1.7, el: 'cold', k: 6, sp: 0.8, v: 420, life: 0.5, pr: 99 },
  { id: 'fire_flares', nm: 'Feuerfackeln', g: 'CRtA', c: 'ew', t: 'proj', q: 12, mp: 8, d: 8.9, el: 'fire', k: 3, sp: 1.2, hm: 1, v: 360, life: 2 },
  { id: 'wave_of_flame', nm: 'Flammenwoge', g: 'CRtA', c: 'ew', t: 'nova', q: 12, mp: 12, d: 4.8, el: 'fire', r: 190 },
  { id: 'fire_storm', nm: 'Feuersturm (CRtA)', g: 'CRtA', c: 'ew', t: 'area', q: 18, mp: 18, cd: 1.5, d: 0.9, el: 'fire', r: 130, ticks: 7, iv: 0.35 },
  { id: 'frost_storm', nm: 'Froststurm', g: 'CRtA', c: 'ew', t: 'area', q: 18, mp: 18, cd: 1.5, d: 1.2, el: 'cold', r: 130, ticks: 7, iv: 0.35 },
  { id: 'wizard_beam', nm: 'Zaubererstrahl', g: 'CRtA', c: 'ew', t: 'proj', q: 24, mp: 12, d: 25.3, el: 'mag', pr: 99, v: 1000, sz: 5 },
  { id: 'frost_armor', nm: 'Frostpanzer', g: 'CRtA', c: 'ew', t: 'buff', q: 6, mp: 8, dur: 90, mods: { armor: 18 } },
  { id: 'fire_weapons', nm: 'Feuerwaffen', g: 'CRtA', c: 'ew', t: 'buff', q: 6, mp: 10, dur: 60, mods: { ae: ['fire', 8] } },
  { id: 'cold_weapons', nm: 'Kältewaffen', g: 'CRtA', c: 'ew', t: 'buff', q: 6, mp: 10, dur: 60, mods: { ae: ['cold', 7] } },
  { id: 'lightning_weapons', nm: 'Blitzwaffen', g: 'CRtA', c: 'ew', t: 'buff', q: 12, mp: 10, dur: 60, mods: { ae: ['light', 9] } },
  { id: 'battle_mage', nm: 'Kampfmagier', g: 'CRtA', c: 'ew', t: 'buff', q: 18, mp: 15, dur: 60, mods: { dmgPct: 0.3, armor: 15 } },

  // ---------- Champions: Waldelfen-Waldläufer ----------
  { id: 'archery', nm: 'Bogenschießen', g: 'CRtA', c: 'wr', t: 'passive', q: 1, mods: { dmgPct: 0.07 } },
  { id: 'wr_fire_arrow', nm: 'Flammenpfeil', g: 'CRtA', c: 'wr', t: 'proj', q: 1, mp: 3, wm: 3.26, d: 24.5, el: 'fire', v: 560 },
  { id: 'wr_cold_arrow', nm: 'Frostpfeil', g: 'CRtA', c: 'wr', t: 'proj', q: 1, mp: 3, wm: 3.2, d: 20.0, el: 'cold', v: 560 },
  { id: 'poison_arrow', nm: 'Giftpfeil', g: 'CRtA', c: 'wr', t: 'proj', q: 6, mp: 4, wm: 4.08, d: 58.3, el: 'pois', v: 560 },
  { id: 'explode_arrow', nm: 'Explosionspfeil', g: 'CRtA', c: 'wr', t: 'proj', q: 12, mp: 7, wm: 0.51, ex: 80, v: 540 },
  { id: 'multi_fire', nm: 'Salve', g: 'CRtA', c: 'wr', t: 'proj', q: 12, mp: 6, wm: 0.75, k: 5, sp: 0.5, v: 560 },
  { id: 'entangle', nm: 'Verstricken', g: 'CRtA', c: 'wr', t: 'area', q: 1, mp: 5, cd: 4, r: 100, deb: { stun: 2, slow: 1, dur: 4 } },
  { id: 'penetrating_arrows', nm: 'Durchschlagende Pfeile', g: 'CRtA', c: 'wr', t: 'passive', q: 12, mods: { pierce: 1 } },
  { id: 'light_quiver', nm: 'Leichter Köcher', g: 'CRtA', c: 'wr', t: 'passive', q: 6, mods: { atkSpd: 0.05 } },
  { id: 'regeneration', nm: 'Regeneration', g: 'CRtA', c: 'wr', t: 'buff', q: 6, mp: 10, dur: 60, mods: { regen: 2 } },
  { id: 'summon_arrows', nm: 'Pfeile beschwören', g: 'CRtA', c: 'wr', t: 'buff', q: 18, mp: 12, dur: 60, mods: { dmgPct: 0.25, pierce: 1 } },

  // ---------- Champions: Hochelfen-Kleriker (Fähigkeitsliste teils angenähert) ----------
  { id: 'hc_holy_bolt', nm: 'Heiliges Geschoss', g: 'CRtA', c: 'hc', t: 'proj', q: 1, mp: 3, d: 17.2, el: 'mag', v: 500 },
  { id: 'hc_smite', nm: 'Strafe', g: 'CRtA', c: 'hc', t: 'melee', q: 1, mp: 2, wm: 1.47, d: 7.4, el: 'mag' },
  { id: 'summon_hammer', nm: 'Hammer beschwören', g: 'CRtA', c: 'hc', t: 'summon', q: 6, mp: 12, cd: 2, m: 'hammer', k: 1, dur: 30, pw: 1.67 },
  { id: 'turn_undead', nm: 'Untote vertreiben', g: 'CRtA', c: 'hc', t: 'nova', q: 12, mp: 10, d: 3.0, el: 'mag', r: 200, undead: 3 },
  { id: 'divine_aura', nm: 'Göttliche Aura', g: 'CRtA', c: 'hc', t: 'shield', q: 18, mp: 15, cd: 10, amt: 90 },
  { id: 'blessing', nm: 'Segen', g: 'CRtA', c: 'hc', t: 'buff', q: 12, mp: 10, dur: 60, mods: { lifePct: 0.15, armor: 10 } },
  { id: 'holy_light', nm: 'Heiliges Licht', g: 'CRtA', c: 'hc', t: 'area', q: 24, mp: 18, cd: 1, d: 10.0, el: 'mag', r: 120, delay: 0.3 },

  // ---------- Champions: Dunkelelfen-Schattenritter ----------
  { id: 'disease_bolt', nm: 'Seuchenbolzen', g: 'CRtA', c: 'sk', t: 'proj', q: 1, mp: 3, d: 50.1, el: 'pois', v: 460 },
  { id: 'life_tap', nm: 'Lebensentzug', g: 'CRtA', c: 'sk', t: 'proj', q: 1, mp: 4, d: 59.0, el: 'mag', v: 480, leech: 0.5 },
  { id: 'disease_blade', nm: 'Seuchenklinge', g: 'CRtA', c: 'sk', t: 'buff', q: 6, mp: 10, dur: 60, mods: { ae: ['pois', 9] } },
  { id: 'disease_shield', nm: 'Seuchenschild', g: 'CRtA', c: 'sk', t: 'buff', q: 6, mp: 10, dur: 60, mods: { thorns: 10, armor: 8 } },
  { id: 'disease_trail', nm: 'Seuchenspur', g: 'CRtA', c: 'sk', t: 'buff', q: 12, mp: 12, dur: 30, pulse: { iv: 0.5, r: 90, d: 0.7, el: 'pois' } },
  { id: 'engulfing_darkness', nm: 'Verschlingende Dunkelheit', g: 'CRtA', c: 'sk', t: 'area', q: 12, mp: 10, cd: 6, r: 120, deb: { fear: 3, slow: 1, dur: 4 } },
  { id: 'harm_touch', nm: 'Schadensberührung', g: 'CRtA', c: 'sk', t: 'melee', q: 18, mp: 15, cd: 6, wm: 26.94, d: 2426.3, el: 'mag' },
  { id: 'summon_skeleton', nm: 'Skelett rufen', g: 'CRtA', c: 'sk', t: 'summon', q: 6, mp: 8, cd: 1, m: 'skel', k: 1, pw: 2.83 },
  { id: 'raise_army', nm: 'Armee erheben', g: 'CRtA', c: 'sk', t: 'summon', q: 24, mp: 30, cd: 8, m: 'skel', k: 5, dur: 25, pw: 1.86 },
  { id: 'convert_undead', nm: 'Untote bekehren', g: 'CRtA', c: 'sk', t: 'convert', q: 18, mp: 10, cd: 4, dur: 25 },
  { id: 'shadow_step', nm: 'Schattenschritt', g: 'CRtA', c: 'sk', t: 'teleport', q: 12, mp: 10, cd: 1, rng: 320 },

  // ---------- Champions: Vah-Shir-Berserker ----------
  { id: 'throwing', nm: 'Axtwurf', g: 'CRtA', c: 'vb', t: 'proj', q: 1, mp: 2, wm: 5.43, v: 520, sz: 7 },
  { id: 'summon_axe', nm: 'Axtsalve', g: 'CRtA', c: 'vb', t: 'proj', q: 6, mp: 6, wm: 4.77, k: 3, sp: 0.35, v: 520, sz: 7 },
  { id: 'battle_cry', nm: 'Schlachtruf', g: 'CRtA', c: 'vb', t: 'buff', q: 1, mp: 6, dur: 60, mods: { dmgPct: 0.2 } },
  { id: 'roar', nm: 'Brüllen', g: 'CRtA', c: 'vb', t: 'nova', q: 6, mp: 6, cd: 6, r: 200, fear: 3, d: 6.9, el: 'phys' },
  { id: 'berserker_rage', nm: 'Berserkerwut', g: 'CRtA', c: 'vb', t: 'buff', q: 12, mp: 10, dur: 20, mods: { dmgPct: 0.5, atkSpd: 0.3, armor: -20 } },
  { id: 'blood_lust', nm: 'Blutdurst', g: 'CRtA', c: 'vb', t: 'passive', q: 12, mods: { leech: 0.01 } },
  { id: 'axe_bandolier', nm: 'Axtgurt', g: 'CRtA', c: 'vb', t: 'passive', q: 1, mods: { dmgPct: 0.06 } },

  // ---------- Champions: Iksar-Schamane ----------
  { id: 'poison_bolt', nm: 'Giftbolzen', g: 'CRtA', c: 'is', t: 'proj', q: 1, mp: 3, d: 43.0, el: 'pois', v: 480 },
  { id: 'drowsy', nm: 'Schläfrigkeit', g: 'CRtA', c: 'is', t: 'proj', q: 1, mp: 3, d: 2.5, el: 'cold', v: 420, ex: 60 },
  { id: 'summon_badger', nm: 'Dachs beschwören', g: 'CRtA', c: 'is', t: 'summon', q: 1, mp: 10, cd: 1, m: 'badger', k: 1, pw: 1.67 },
  { id: 'planar_wind', nm: 'Ebenenwind', g: 'CRtA', c: 'is', t: 'proj', q: 6, mp: 6, d: 6.6, el: 'phys', v: 420, kb: 140, pr: 99, sz: 12 },
  { id: 'spirit_shield', nm: 'Geisterschild', g: 'CRtA', c: 'is', t: 'shield', q: 6, mp: 10, cd: 8, amt: 55 },
  { id: 'poison_weapons', nm: 'Giftwaffen', g: 'CRtA', c: 'is', t: 'buff', q: 6, mp: 10, dur: 60, mods: { ae: ['pois', 9] } },
  { id: 'tagars_insects', nm: 'Tagars Insekten', g: 'CRtA', c: 'is', t: 'proj', q: 12, mp: 8, d: 37.7, el: 'pois', k: 4, sp: 1, hm: 1, v: 300, life: 2.5 },
  { id: 'pus_storm', nm: 'Eitersturm', g: 'CRtA', c: 'is', t: 'area', q: 18, mp: 16, cd: 1.5, d: 1.3, el: 'pois', r: 130, ticks: 7, iv: 0.35 },
  { id: 'giant_growth', nm: 'Riesenwuchs', g: 'CRtA', c: 'is', t: 'buff', q: 24, mp: 15, dur: 60, mods: { dmgPct: 0.25, lifePct: 0.2, size: 1 } },
];

// Beschwörungen
const MINIONS = {
  skel: { nm: 'Skelett', hp: 35, d: 5, v: 150, r: 11, col: '#e8e2cf' },
  smage: { nm: 'Skelettmagier', hp: 22, d: 6, v: 130, r: 11, col: '#a8d8ff', rng: 300, el: 'cold' },
  golem: { nm: 'Lehmgolem', hp: 150, d: 7, v: 110, r: 17, col: '#a88866' },
  bgolem: { nm: 'Blutgolem', hp: 110, d: 10, v: 120, r: 16, col: '#b02020' },
  raven: { nm: 'Rabe', hp: 12, d: 3, v: 240, r: 7, col: '#303040' },
  wolf: { nm: 'Geisterwolf', hp: 45, d: 6, v: 200, r: 12, col: '#c8d8f0' },
  bear: { nm: 'Grizzly', hp: 200, d: 16, v: 130, r: 19, col: '#6b4a2b' },
  valk: { nm: 'Walküre', hp: 130, d: 13, v: 180, r: 13, col: '#fff6c0' },
  hydra: { nm: 'Hydra', hp: 9999, d: 9, v: 0, r: 13, col: '#ff6a2a', rng: 380, el: 'fire' },
  sentry: { nm: 'Blitz-Wächter', hp: 9999, d: 8, v: 0, r: 9, col: '#fff27a', rng: 360, el: 'light' },
  ancestor: { nm: 'Ahnengeist', hp: 160, d: 15, v: 160, r: 15, col: '#d0a070' },
  badger: { nm: 'Geisterdachs', hp: 55, d: 7, v: 190, r: 11, col: '#887060' },
  hammer: { nm: 'Geisterhammer', hp: 70, d: 10, v: 210, r: 10, col: '#fff8e0', el: 'mag' },
  shadow: { nm: 'Schattenkrieger', hp: 80, d: 11, v: 180, r: 13, col: '#5555aa' },
};

const MONSTERS = [
  { nm: 'Gefallener', hp: 14, d: 3, v: 100, r: 11, col: '#c84040', xp: 6, from: 1 },
  { nm: 'Zombie', hp: 32, d: 6, v: 55, r: 14, col: '#6a8a70', xp: 9, from: 1, undead: 1 },
  { nm: 'Stachelratte', hp: 15, d: 4, v: 90, r: 11, col: '#a08060', xp: 9, from: 1, rng: { el: 'phys', v: 300 } },
  { nm: 'Goblin', hp: 18, d: 4, v: 115, r: 11, col: '#70a040', xp: 8, from: 1 },
  { nm: 'Skelett', hp: 22, d: 5, v: 90, r: 12, col: '#e0dcc8', xp: 9, from: 2, undead: 1 },
  { nm: 'Skelett-Bogenschütze', hp: 18, d: 5, v: 80, r: 12, col: '#c8c4b0', xp: 11, from: 2, undead: 1, rng: { el: 'phys', v: 360 } },
  { nm: 'Gnoll', hp: 30, d: 7, v: 105, r: 13, col: '#b09060', xp: 12, from: 3 },
  { nm: 'Ork-Plünderer', hp: 40, d: 8, v: 95, r: 15, col: '#5a7a3a', xp: 14, from: 4 },
  { nm: 'Ziegenmensch', hp: 36, d: 8, v: 110, r: 14, col: '#a07050', xp: 13, from: 4 },
  { nm: 'Gloam', hp: 20, d: 8, v: 80, r: 12, col: '#a0d0ff', xp: 14, from: 5, rng: { el: 'light', v: 380 } },
  { nm: 'Dunkelelfen-Magier', hp: 26, d: 9, v: 85, r: 12, col: '#8050b0', xp: 15, from: 6, rng: { el: 'fire', v: 340 } },
  { nm: 'Vampir', hp: 45, d: 10, v: 90, r: 14, col: '#902040', xp: 17, from: 8, undead: 1, rng: { el: 'fire', v: 360 } },
  { nm: 'Frostriese', hp: 80, d: 13, v: 70, r: 20, col: '#b0d8f0', xp: 24, from: 9, el: 'cold' },
  { nm: 'Dämonenfürst', hp: 70, d: 14, v: 100, r: 17, col: '#d03020', xp: 24, from: 12, el: 'fire' },
  // Diener des Chaos-Sanktuariums
  { nm: 'Verdammnisritter', hp: 55, d: 12, v: 95, r: 14, col: '#4a4048', xp: 20, from: 6, undead: 1 },
  { nm: 'Venomfürst', hp: 64, d: 13, v: 115, r: 16, col: '#b03018', xp: 22, from: 8, el: 'fire' },
  { nm: 'Vergessensritter', hp: 48, d: 11, v: 80, r: 14, col: '#6a5a80', xp: 22, from: 10, undead: 1, rng: { el: 'mag', v: 360 } },
];

// Siegelwächter des Chaos-Sanktuariums: Runde 5, 10 und 15 jedes 20er-Zyklus, in Runde 20 Diablo
const SEAL_BOSSES = [
  { nm: 'Großwesir des Chaos', hp: 320, d: 13, v: 95, r: 20, col: '#a02818', xp: 350, el: 'fire', rng: { el: 'fire', v: 380 }, nova: { el: 'fire', r: 180, cd: 5 } },
  { nm: 'Lord De Seis', hp: 450, d: 18, v: 125, r: 22, col: '#3a3440', xp: 500, el: 'phys' },
  { nm: 'Seelenverseucher', hp: 380, d: 16, v: 165, r: 20, col: '#802050', xp: 600, el: 'fire', nova: { el: 'fire', r: 170, cd: 3 } },
];
// ab dem zweiten Zyklus kommt zu jedem Siegelwächter einer dieser Bosse dazu
const BOSSES = [
  { nm: 'Andariel', hp: 380, d: 14, v: 110, r: 24, col: '#e060a0', xp: 400, el: 'pois', nova: { el: 'pois', r: 200, cd: 4 } },
  { nm: 'Duriel', hp: 520, d: 20, v: 140, r: 28, col: '#d0b080', xp: 600, el: 'cold', nova: { el: 'cold', r: 160, cd: 5 } },
  { nm: 'Mephisto', hp: 600, d: 18, v: 95, r: 24, col: '#6080d0', xp: 800, el: 'light', rng: { el: 'light', v: 420 }, nova: { el: 'light', r: 220, cd: 5 } },
  { nm: 'Innoruuk', hp: 700, d: 20, v: 100, r: 25, col: '#7020a0', xp: 900, el: 'mag', rng: { el: 'mag', v: 380 }, nova: { el: 'mag', r: 230, cd: 4 } },
  { nm: 'Diablo', hp: 850, d: 24, v: 110, r: 30, col: '#e03020', xp: 1100, el: 'fire', rng: { el: 'fire', v: 420 }, nova: { el: 'fire', r: 260, cd: 4 } },
  { nm: 'Baal', hp: 1000, d: 26, v: 110, r: 28, col: '#c0a0f0', xp: 1400, el: 'cold', rng: { el: 'cold', v: 420 }, nova: { el: 'cold', r: 260, cd: 4 } },
];

// [Name, Boden, Wand, Dunkelheit 0..1]
// [Name, Boden, Wände, Dunkelheit]
const ARENA = ['Chaos-Sanktuarium', 'hell', 'hell', 0.84];

const BASES = {
  weapon: [['Kurzschwert', 2, 7], ['Streitkolben', 3, 8], ['Kriegsaxt', 4, 11], ['Langbogen', 3, 9], ['Kampfstab', 3, 10], ['Klaue', 3, 8], ['Breitschwert', 5, 13]],
  armor: [['Lederrüstung', 8], ['Kettenhemd', 16], ['Schuppenpanzer', 24], ['Plattenpanzer', 34]],
  helm: [['Kappe', 3], ['Helm', 7], ['Knochenhelm', 10], ['Krone', 13]],
  ring: [['Ring', 0]],
  amulet: [['Amulett', 0]],
};

// [Schlüssel, Präfix, Anzeige, min, max, Teiler]
const AFFIXES = [
  ['maxhp', 'Robuster', '+{v} Leben', 6, 18, 1], ['maxmp', 'Weiser', '+{v} Mana', 6, 18, 1],
  ['dmgPct', 'Grausamer', '+{v}% Schaden', 6, 20, 100], ['spellPct', 'Arkaner', '+{v}% Zauberschaden', 6, 20, 100],
  ['str', 'Starker', '+{v} Stärke', 2, 6, 1], ['dex', 'Flinker', '+{v} Geschick', 2, 6, 1],
  ['vit', 'Zäher', '+{v} Vitalität', 2, 6, 1], ['ene', 'Mystischer', '+{v} Energie', 2, 6, 1],
  ['crit', 'Präziser', '+{v}% Kritische Trefferchance', 2, 6, 100], ['leech', 'Vampirischer', '{v}% Lebensraub', 2, 5, 100],
  ['res', 'Geschützter', '+{v}% Widerstand (alle)', 5, 14, 100], ['speed', 'Eiliger', '+{v}% Laufgeschwindigkeit', 5, 15, 100],
  ['atkSpd', 'Rasender', '+{v}% Angriffs-/Zaubertempo', 5, 15, 100], ['armor', 'Gepanzerter', '+{v} Verteidigung', 4, 14, 1],
  ['regen', 'Heilender', '+{v} Leben/Sek.', 1, 3, 1],
];

const UNIQUE_NAMES = ['Schattenzahn', 'Grabesruf', 'Sturmbrecher', 'Seelenhüter', 'Norraths Zorn', 'Blutmond', 'Eiswacht', 'Kerkerfürst', 'Aschenkrone', 'Wolfsherz'];
const RARE_A = ['Dämonen', 'Blut', 'Toten', 'Sturm', 'Grab', 'Schatten', 'Knochen', 'Geister', 'Zorn', 'Eis'];
const RARE_B = ['biss', 'schrei', 'wacht', 'mal', 'fluch', 'klaue', 'sang', 'hauch', 'schwur', 'stich'];
