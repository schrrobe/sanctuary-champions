'use strict';
// 3D-Figuren im Stil der vorgerenderten Sprites von Diablo II: Jede Gestalt wird aus einfachen 3D-Körpern gebaut,
// unter festem Licht in 8 Richtungen (Helden in 16) gerendert und Bild für Bild in Atlanten zwischengespeichert.
// Ein Bild entsteht erst, wenn es zum ersten Mal gebraucht wird, mit einem Zeitbudget je Spielbild; bis dahin
// springt das nächstliegende fertige Bild ein. Ohne WebGL bleiben die gezeichneten Figuren aus sprites.js.
const SPR = (() => {
  const KEY = 'sanctuary-3d';
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch { /* privater Modus */ }
  const stub = { draw: () => false, tick() {}, warm() {}, toggle() {}, shadows() {}, get on() { return false; }, stats: { baked: 0, ms: 0, calls: 0, tris: 0, pagePx: 0 }, pending: 0 };
  if (typeof THREE === 'undefined') return stub;
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), alpha: true, antialias: true, preserveDrawingBuffer: true }); }
  catch { return stub; }
  // GS: Größe der Renderfläche; UNIT: Höhe eines Menschen in Modelleinheiten; FOOT: Lage der Füße im Bildausschnitt
  const GS = 1024, TAU = Math.PI * 2, COS30 = Math.cos(Math.PI / 6), UNIT = 0.97, FOOT = 1.3 / 1.85;
  R.setPixelRatio(1); R.setSize(GS, GS, false); R.setClearColor(0x000000, 0);
  R.toneMapping = THREE.NoToneMapping; // satte Farben wie im Original statt Filmlook

  // ---------- Bühne: Umgebung für Metallglanz, warmes Hauptlicht von links oben, Gegenlicht von hinten ----------
  const scene = new THREE.Scene(), stage = new THREE.Group();
  scene.add(stage);
  {
    const env = new THREE.Scene(), geo = new THREE.SphereGeometry(10, 24, 12), pos = geo.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) / 10 + 1) / 2, v = 0.05 + 0.6 * t * t; col.push(v * 1.15, v, v * 0.8); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
    for (const [x, y, z, s, v] of [[-1, 8, 5, 6, 10], [4, 2, -7, 4, 3], [7, 3, 4, 3, 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v * 0.9, v * 0.75), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    const pm = new THREE.PMREMGenerator(R);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  }
  const keyL = new THREE.DirectionalLight(0xffe2c0, 2.6), rimL = new THREE.DirectionalLight(0xffb070, 1.6);
  // Ziel des Hauptlichts in Körpermitte (Richtung wie zuvor): so deckt der Schattenbereich auch große Gestalten ab
  keyL.position.set(-1.5, 3.3, 2.6); keyL.target.position.set(0, 0.7, 0); rimL.position.set(-1.2, 1.2, -2.6);
  scene.add(keyL, keyL.target, rimL, new THREE.HemisphereLight(0xb0a088, 0x140e0a, 0.45));
  // Eigenverschattung (Grafikstufe): das Hauptlicht wirft Schatten innerhalb der Figur, etwa von Armen, Umhang und Kopf.
  // Kostet nur beim Rendern der Figurenbilder, nicht in jedem Spielbild
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  keyL.shadow.mapSize.set(1024, 1024); keyL.shadow.bias = -0.0006; keyL.shadow.normalBias = 0.015;
  Object.assign(keyL.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.5, far: 10 }); keyL.shadow.camera.updateProjectionMatrix();
  // Blick von schräg oben unter 30°, passend zur 2:1-Projektion des Spiels (Bild-rechts = Welt x − y)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
  cam.position.set(Math.SQRT1_2 * COS30 * 20, 10, Math.SQRT1_2 * COS30 * 20); cam.lookAt(0, 0, 0);
  const toCam = cam.position.clone().normalize();
  R.render(scene, cam); // das erste Bild nach dem Erzeugen der Umgebung bliebe sonst leer

  // ---------- Werkstoffe und Grundkörper ----------
  // feines Rauschen auf allen Oberflächen für den körnigen Look der vorgerenderten Originale
  const grit = (() => {
    const c = mkCanvas(64), g = c.getContext('2d'), d = g.createImageData(64, 64);
    for (let i = 0; i < d.data.length; i += 4) { const v = 170 + Math.random() * 85 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,240,220'},${0.05 + Math.random() * 0.08})`; g.beginPath(); g.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 7, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  // Oberflächen wie auf den vorgerenderten Originalen: Fellsträhnen, Schuppen, Kettenglieder, Ledernarben, Gewebe.
  // Dieselbe Textur dient als Relief (bump), damit das harte Oberlicht die Struktur herausarbeitet
  const surf = {};
  function surface(kind) {
    if (kind in surf) return surf[kind];
    const n = 128, c = mkCanvas(n), g = c.getContext('2d'), R = Math.random;
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, n, n);
    const wrapped = f => { for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
    if (kind === 'fur' || kind === 'tiger') for (let i = 0; i < 900; i++) { // Strähnen in Wuchsrichtung
      const x = R() * n, y = R() * n, l = 4 + R() * 9, v = R() < 0.5 ? 60 + R() * 60 : 230 + R() * 25;
      g.strokeStyle = `rgba(${v},${v},${v},.55)`; g.lineWidth = 0.8 + R(); wrapped(() => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + R() * 2 - 1, y + l); g.stroke(); });
    } else if (kind === 'scale') for (let y = 0; y < n + 8; y += 8) for (let x = (y / 8 % 2) * 6; x < n + 12; x += 12) { // überlappende Schuppen
      const gr = g.createRadialGradient(x, y - 2, 1, x, y, 7); gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(0.8, '#a8a8a8'); gr.addColorStop(1, '#505050');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI); g.fill();
    } else if (kind === 'metal') { // Kettenglieder mit Kratzern
      for (let y = 0; y < n; y += 5) for (let x = (y / 5 % 2) * 3; x < n; x += 6) { g.strokeStyle = 'rgba(40,40,40,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 1, y - 2, 1.4, 1.2); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},.18)`; g.beginPath(); const x = R() * n, y = R() * n; g.moveTo(x, y); g.lineTo(x + R() * 30 - 15, y + R() * 6 - 3); g.stroke(); }
    } else if (kind === 'leather') { // Narben, Falten und Nähte
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${0.06 + R() * 0.1})`; g.beginPath(); g.ellipse(R() * n, R() * n, 1 + R() * 5, 0.6 + R() * 2, R() * 3, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(30,20,10,.5)'; g.setLineDash([3, 3]); g.lineWidth = 1.2; for (const y of [31, 95]) { g.beginPath(); g.moveTo(0, y); g.lineTo(n, y); g.stroke(); } g.setLineDash([]);
    } else if (kind === 'cloth') { // grobes Gewebe mit weichen Falten
      for (let y = 0; y < n; y += 2) { g.fillStyle = `rgba(0,0,0,${0.06 + (y % 4 ? 0.04 : 0)})`; g.fillRect(0, y, n, 1); }
      for (let x = 0; x < n; x += 2) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 1, n); }
      for (let i = 0; i < 6; i++) { const x = R() * n, gr = g.createLinearGradient(x - 8, 0, x + 8, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 8, 0, 16, n); }
    } else return surf[kind] = null;
    const tex = (cv, rep) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t; };
    const bump = tex(c, kind === 'scale' ? 4 : 3), map = tex(c, kind === 'scale' ? 4 : 3); map.colorSpace = THREE.SRGBColorSpace;
    if (kind === 'tiger') { // Tigerstreifen des Vah Shir: dunkle, wellige Querbänder über dem Fell
      const s2 = mkCanvas(n), h = s2.getContext('2d'); h.drawImage(c, 0, 0); h.fillStyle = 'rgba(20,12,4,.92)';
      for (let y = 6; y < n; y += 21) { h.beginPath(); h.moveTo(0, y); for (let x = 0; x <= n; x += 8) h.lineTo(x, y + Math.sin(x * 0.11 + y) * 4); for (let x = n; x >= 0; x -= 8) h.lineTo(x, y + 5 + Math.sin(x * 0.09 + y * 2) * 3 - (x % 32 < 12 ? 3 : 0)); h.fill(); }
      const m2 = tex(s2, 2); m2.colorSpace = THREE.SRGBColorSpace; bump.repeat.set(2, 2);
      return surf[kind] = { map: m2, bump };
    }
    return surf[kind] = { map, bump };
  }
  // [Rauheit, Metall, Relief]
  const KIND = { skin: [0.6, 0, 0.6], cloth: [0.95, 0, 1.5], leather: [0.68, 0.05, 2], metal: [0.33, 0.9, 1.6], gold: [0.3, 1, 0.8], bone: [0.55, 0, 0.8], fur: [1, 0, 3], tiger: [1, 0, 3], wood: [0.82, 0, 1], horn: [0.42, 0, 0.8], scale: [0.48, 0.12, 3], flesh: [0.4, 0, 0.6] };
  const mats = new Map();
  function mat(col, kind = 'cloth', two = false) {
    const k = `${col}|${kind}|${two}`;
    if (!mats.has(k)) mats.set(k, kind === 'glow' ? new THREE.MeshBasicMaterial({ color: col, toneMapped: false })
      : new THREE.MeshStandardMaterial({ color: col, roughness: KIND[kind][0], metalness: KIND[kind][1], map: surface(kind)?.map || grit, bumpMap: surface(kind)?.bump || grit, bumpScale: KIND[kind][2],
        envMapIntensity: KIND[kind][1] > 0.5 ? 1 : 0.35, side: two ? THREE.DoubleSide : THREE.FrontSide }));
    return mats.get(k);
  }
  const geos = new Map(), memo = (k, f) => { if (!geos.has(k)) geos.set(k, f()); return geos.get(k); };
  const V2 = (x, y) => new THREE.Vector2(Math.max(1e-4, x), y);
  const SPH = new THREE.SphereGeometry(1, 14, 10), BOX = new THREE.BoxGeometry(1, 1, 1);
  const CAP = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI * 0.55), HALF = new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2);
  // waagrechter Ring (Gürtel, Säume, Rippen mit Lücke vorn)
  const RING = memo('ring', () => new THREE.TorusGeometry(1, 0.16, 6, 20).rotateX(Math.PI / 2));
  const RIB = memo('rib', () => new THREE.TorusGeometry(1, 0.13, 5, 14, Math.PI * 1.5).rotateZ(Math.PI * 0.25).rotateX(Math.PI / 2));
  // rundes, sich verjüngendes Glied vom Gelenk (y = 0) bis −len, Radius r1 oben und r2 unten
  function limbGeo(len, r1, r2, bulge = 0.1) {
    return memo(`l${len.toFixed(3)},${r1.toFixed(4)},${r2.toFixed(4)},${bulge}`, () => {
      const p = [];
      for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI; p.push(V2(Math.cos(a) * r2, -len + Math.sin(a) * r2)); }
      for (let i = 1; i < 6; i++) { const t = i / 6; p.push(V2((r2 + (r1 - r2) * t) * (1 + bulge * Math.sin(Math.PI * t)), -len + len * t)); }
      for (let i = 0; i <= 4; i++) { const a = i / 8 * Math.PI; p.push(V2(Math.cos(a) * r1, Math.sin(a) * r1)); }
      return new THREE.LatheGeometry(p, 10);
    });
  }
  const lathe = (k, pts, seg = 14) => memo(k, () => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg));
  // Kegel von der Basis (y = 0) zur Spitze (y = len), zur Spitze hin um bx/bz gebogen: Hörner, Krallen, Stacheln
  function horn(r, len, bx = 0, bz = 0) {
    return memo(`h${r.toFixed(4)},${len.toFixed(4)},${bx.toFixed(4)},${bz.toFixed(4)}`, () => {
      const g = new THREE.ConeGeometry(r, len, 8, 6).translate(0, len / 2, 0), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / len; p.setX(i, p.getX(i) + bx * t * t); p.setZ(i, p.getZ(i) + bz * t * t); }
      g.computeVertexNormals();
      return g;
    });
  }
  // flache Form in der xy-Ebene, dünn in z ausgeformt: Klingen, Axtblätter, Schilde
  function flat(k, draw, depth = 0.01, bevel = 0.003) {
    return memo(k, () => {
      const s = new THREE.Shape(); draw(s);
      return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -depth / 2);
    });
  }
  // Umhang: hängt von y = 0 nach unten, liegt um den Rücken und weht unten nach hinten
  const capeGeo = (w, len) => memo(`c${w},${len}`, () => {
    const g = new THREE.PlaneGeometry(w, len, 4, 8).translate(0, -len / 2, 0).rotateY(Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / (w / 2), t = -p.getY(i) / len; p.setX(i, p.getX(i) + 0.035 * z * z - 0.08 * t * t); }
    g.computeVertexNormals(); g.userData.two = true;
    return g;
  });
  // Rock einer Robe mit Falten, vom Gürtel (y = 0) bis zum Saum
  const skirtGeo = (len, r0, r1) => memo(`s${len.toFixed(3)},${r0},${r1}`, () => {
    const g = new THREE.LatheGeometry([[r0, 0], [r0 * 1.1, -len * 0.15], [(r0 + r1) * 0.52, -len * 0.55], [r1, -len]].map(([r, y]) => V2(r, y)), 24), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), f = 1 + 0.07 * (-p.getY(i) / len) * Math.sin(a * 9); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    g.computeVertexNormals(); g.userData.two = true;
    return g;
  });
  // flache Fläche mit oberer Kante bei y = 0, Vorderseite nach +x (Wappenrock)
  const panelGeo = (w, len) => memo(`p${w},${len}`, () => { const g = new THREE.PlaneGeometry(w, len, 1, 3).translate(0, -len / 2, 0).rotateY(Math.PI / 2); g.userData.two = true; return g; });

  // ---------- Aufbau ----------
  // Gelenke sind Gruppen, die die Haltung dreht; Teile sind feste Körper daran
  function joint(J, p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); J.all.push(g); return g; }
  function mount(p, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); p.add(g); return g; }
  function add(p, geo, col, kind, at = [0, 0, 0], s = 1, rot) {
    const m = new THREE.Mesh(geo, mat(col, kind === 'cloth2' ? 'cloth' : kind, kind === 'cloth2' || !!geo.userData.two));
    m.position.set(at[0], at[1], at[2]);
    if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    p.add(m);
    return m;
  }
  // Stab entlang +x von x0 bis x1 (Griffe, Schäfte)
  const rod = (p, x0, x1, r0, r1, col, kind) => add(p, limbGeo(x1 - x0, r0, r1, 0), col, kind, [x0, 0, 0], 1, [0, 0, Math.PI / 2]);
  // Kette aus n Gliedern (Schwänze, Tentakel); jedes Glied hängt am Ende des vorigen
  function chain(J, p, n, len, r0, r1, col, kind) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const g = joint(J, p, 0, i ? -len : 0, 0);
      add(g, limbGeo(len, r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, 0.05), col, kind);
      out.push(g); p = g;
    }
    return out;
  }
  const mark = (J, o, c, r, eye) => J.marks.push({ o, c, r, eye, head: J.head });

  // Körperbau: Längen in Modelleinheiten (Mensch ≈ 0,97 hoch), k = Dicke der Glieder, tw/td = Breite/Tiefe des Rumpfs
  const BASE = { k: 1, tw: 1, td: 1, th: 0.235, sh: 0.235, ank: 0.05, hip: 0.062, sp: 0.1, ch: 0.155, hr: 0.062, sw: 0.128, ua: 0.165, fa: 0.15, digi: 0, hunch: 0 };
  const BUILDS = {
    human: {},
    big: { k: 1.32, tw: 1.25, td: 1.12, sw: 0.152, hr: 0.058, th: 0.228, sh: 0.228 },
    slim: { k: 0.84, tw: 0.86, td: 0.9, sw: 0.116, th: 0.246, sh: 0.246, hr: 0.06 },
    tall: { k: 0.88, tw: 0.92, th: 0.25, sh: 0.25, ch: 0.165, hr: 0.064, crown: 1 },
    cat: { k: 1.14, tw: 1.12, td: 1.05, sw: 0.142, digi: 1 },
    lizard: { k: 0.95, digi: 1, hunch: 0.16, hr: 0.058 },
    goat: { digi: 1 },
    bear: { k: 1.45, tw: 1.45, td: 1.35, sw: 0.18, hunch: 0.32, ua: 0.19, fa: 0.18, hr: 0.064, th: 0.24 },
    bones: { k: 1, tw: 0.8 },
    demon: { k: 1.55, tw: 1.42, td: 1.3, sw: 0.175, digi: 1, hunch: 0.42, ua: 0.2, fa: 0.19, hr: 0.068, th: 0.25 },
  };

  function human(L) {
    const b = L.build || (L.bones ? 'bones' : { cat: 'cat', lizard: 'lizard', goat: 'goat', elf: 'slim' }[L.head] || 'human');
    const B = { ...BASE, ...BUILDS[b] }, k = B.k, bones = !!L.bones;
    const skin = L.skin, body = L.body || skin, legs = L.legs || body;
    const armored = !!L.armor, bare = (body === skin || !!L.top) && !bones; // L.top: Oberteil über freiem Bauch
    const sk = bones ? 'bone' : b === 'lizard' ? 'scale' : b === 'cat' || b === 'bear' ? (L.stripes ? 'tiger' : 'fur') : b === 'demon' ? 'flesh' : 'skin';
    const torsoK = armored ? 'metal' : bare ? sk : L.robe ? 'cloth' : 'leather';
    const legK = armored ? 'metal' : legs === skin ? sk : 'cloth';
    const boots = L.boots || (armored ? shade(legs, -0.06) : '#2e2218'), bootK = armored ? 'metal' : 'leather';
    const root = new THREE.Group(), J = { root, all: [], marks: [], B, L, th: {}, kn: {}, an: {}, toe: {}, sh: {}, el: {}, hd: {} };
    const bone = (g, len) => { add(g, limbGeo(len, 0.015, 0.012, 0), skin, 'bone'); add(g, SPH, skin, 'bone', [0, -len, 0], 0.02); };

    // Beine; Katzen, Echsen, Ziegen und Dämonen stehen auf den Zehen (Sprunggelenk hinten)
    const shin = B.digi ? B.sh * 0.9 : B.sh, mt = B.sh * 0.42;
    J.hipY = B.digi ? B.th * Math.cos(0.45) + shin * Math.cos(0.6) + mt * Math.cos(0.35) + 0.035 : B.th + shin + B.ank;
    J.hips = joint(J, root, 0, J.hipY, 0);
    if (!L.tentacles) for (const s of [1, -1]) {
      const th = J.th[s] = joint(J, J.hips, 0, -0.02, s * B.hip * B.tw);
      if (bones) bone(th, B.th); else add(th, limbGeo(B.th, 0.056 * k, 0.04 * k, 0.12), legs, legK);
      const kn = J.kn[s] = joint(J, th, 0, -B.th, 0);
      if (armored) add(kn, SPH, legs, 'metal', [0.014, 0, 0], 0.036 * k);
      if (bones) bone(kn, shin); else add(kn, limbGeo(shin, 0.041 * k, 0.03 * k, 0.15), legs, legK);
      if (!bones && !B.digi) add(kn, limbGeo(shin * 0.5, 0.038 * k, 0.034 * k, 0), boots, bootK, [0, -shin * 0.5, 0]);
      const an = J.an[s] = joint(J, kn, 0, -shin, 0);
      if (B.digi) {
        add(an, limbGeo(mt, 0.03 * k, 0.022 * k), legs, legK);
        const toe = J.toe[s] = joint(J, an, 0, -mt, 0);
        add(toe, SPH, L.boots || (b === 'goat' ? '#2a2018' : skin), b === 'goat' ? 'horn' : sk, [0.032 * k, -0.012, 0], [0.05 * k, 0.022 * k, 0.032 * k]);
        if (b === 'demon' || b === 'lizard') for (const z of [-1, 0, 1]) add(toe, horn(0.008 * k, 0.04 * k, 0, 0), L.horn || '#d8c8a0', 'horn', [0.07 * k, -0.02, z * 0.018 * k], 1, [0, 0, -1.6]);
      } else add(an, SPH, bones ? skin : boots, bones ? 'bone' : bootK, [0.032 * k, -0.026, 0], [0.068 * k, 0.03, 0.036 * k]);
    }

    // Rumpf: Unterleib an der Hüfte, Brustkorb am Rückgrat
    J.spine = joint(J, J.hips, 0, 0.04, 0);
    J.chest = joint(J, J.spine, 0, B.sp, 0);
    if (bones) {
      add(J.hips, SPH, skin, 'bone', [0, -0.01, 0], [0.035, 0.03, 0.07]);
      add(J.chest, limbGeo(0.27, 0.014, 0.014, 0), skin, 'bone', [-0.02, 0.17, 0]);
      for (let i = 0; i < 5; i++) add(J.chest, RIB, skin, 'bone', [0.0, 0.12 - i * 0.032, 0], [0.06 - i * 0.004, 0.06, 0.075 - i * 0.004]);
    } else {
      add(J.hips, lathe('pelvis', [[0, -0.08], [0.05, -0.076], [0.075, -0.05], [0.08, -0.01], [0.074, 0.03], [0.07, 0.066], [0, 0.07]]), L.robe ? body : legs, L.robe ? 'cloth' : legK, [0, 0, 0], [0.74 * B.td, 1, B.tw]);
      add(J.chest, lathe('chest', [[0, -0.1], [0.07, -0.098], [0.076, -0.05], [0.087, 0], [0.098, 0.06], [0.104, 0.1], [0.1, 0.13], [0.08, 0.153], [0.045, 0.168], [0.03, 0.175], [0, 0.178]]), bare ? skin : body, torsoK, [0, 0, 0], [0.64 * B.td, 1, B.tw]);
      if (bare && !L.top) for (const z of [-1, 1]) add(J.chest, SPH, skin, sk, [0.045 * B.td, 0.095, z * 0.045 * B.tw], [0.03 * B.td, 0.034, 0.045 * B.tw]);
      if (L.top) add(J.chest, lathe('top', [[0.092, 0.045], [0.1, 0.06], [0.106, 0.1], [0.102, 0.13], [0.086, 0.15], [0.06, 0.163]]), L.top, 'cloth2', [0, 0, 0], [0.66 * B.td, 1, B.tw * 1.03]);
      if (L.ribs) for (let i = 0; i < 4; i++) add(J.chest, RIB, shade(skin, -0.12), sk, [0.004, 0.1 - i * 0.03, 0], [0.068 * B.td * 0.92, 0.05, 0.09 * B.tw]);
      if (armored) {
        add(J.chest, SPH, shade(body, 0.04), 'metal', [0.03 * B.td, 0.07, 0], [0.05 * B.td, 0.075, 0.09 * B.tw]);
        add(J.hips, RING, shade(body, -0.1), 'metal', [0, -0.03, 0], [0.068 * B.td, 0.18, 0.09 * B.tw]);
      }
      if (L.robe) { add(J.chest, BOX, L.trim || shade(body, 0.2), 'gold', [0.066 * B.td, 0.05, 0], [0.006, 0.2, 0.02]); add(J.chest, RING, L.trim || body, 'gold', [0, 0.158, 0], [0.05 * B.td, 0.12, 0.07 * B.tw]); }
    }
    if (L.belt || armored || L.robe) {
      add(J.hips, RING, L.belt || (L.robe ? L.trim || shade(body, -0.2) : shade(body, -0.25)), L.robe && !L.belt ? 'gold' : 'leather', [0, 0.05, 0], [0.056 * B.td, 0.07, 0.074 * B.tw]);
      add(J.hips, BOX, '#a8884a', 'gold', [0.058 * B.td, 0.05, 0], [0.008, 0.016, 0.018]);
    }
    // Hals und Kopf
    J.neck = joint(J, J.chest, 0.008, B.ch + 0.012, 0);
    if (bones) add(J.neck, limbGeo(0.05, 0.012, 0.012, 0), skin, 'bone', [0, 0.05, 0]);
    else add(J.neck, limbGeo(0.05, 0.034 * k, 0.03 * k, 0), skin, sk, [0, 0.05, 0]);
    J.head = joint(J, J.neck, 0.012, 0.05 + B.hr * 0.8, 0);
    head(J, L, B, sk);

    // Arme: Ärmel, Unterarm, Hand; Rüstung mit Schulterplatten und Panzerhandschuhen
    const sleeve = bones || bare ? skin : body, sleeveK = armored ? 'metal' : bare ? sk : L.robe ? 'cloth' : 'leather';
    const fore = armored ? shade(body, -0.05) : L.robe || L.sleeves ? body : skin, foreK = armored ? 'metal' : L.robe || L.sleeves ? 'cloth' : sk;
    const hand = armored ? shade(body, -0.1) : skin, handK = armored ? 'metal' : sk;
    for (const s of [1, -1]) {
      const sh = J.sh[s] = joint(J, J.chest, -0.004, B.ch - 0.028, s * B.sw);
      if (bones) bone(sh, B.ua);
      else { add(sh, SPH, sleeve, sleeveK, [0, -0.008, 0], [0.042 * k, 0.046 * k, 0.044 * k]); add(sh, limbGeo(B.ua, 0.041 * k, 0.032 * k, 0.16), sleeve, sleeveK); }
      if (armored || L.pauldron) {
        const pc = L.pauldron || shade(body, 0.05);
        add(sh, HALF, pc, L.pauldron ? 'bone' : 'metal', [0, 0.012, 0], [0.066 * k, 0.052 * k, 0.066 * k], [s * 0.4, 0, 0]);
        if (L.spiky) for (const d of [-1, 1]) add(sh, horn(0.012 * k, 0.06 * k, 0, 0), '#c8c0b0', 'horn', [d * 0.025 * k, 0.05 * k, s * 0.03 * k], 1, [s * 0.5, 0, -d * 0.3]);
      }
      const el = J.el[s] = joint(J, sh, 0, -B.ua, 0);
      if (bones) bone(el, B.fa);
      else add(el, limbGeo(B.fa, 0.034 * k, 0.026 * k, 0.12), fore, foreK);
      if (!bones && !armored && !L.robe && (bare || !L.sleeves)) add(el, limbGeo(B.fa * 0.55, 0.036 * k, 0.03 * k, 0), L.belt || shade(body, -0.15), 'leather', [0, -B.fa * 0.42, 0]);
      if (L.robe) {
        add(el, lathe('sleeve', [[0.034, 0], [0.048, -0.07], [0.064, -0.13], [0.06, -0.135]], 12), body, 'cloth2', [0, -B.fa * 0.2, 0], [k, 1, k]);
        add(el, RING, L.trim || body, 'gold', [0, -B.fa * 0.2 - 0.13, 0], [0.062 * k, 0.09, 0.062 * k]);
      }
      const hd = J.hd[s] = joint(J, el, 0, -B.fa, 0);
      add(hd, SPH, bones ? skin : hand, bones ? 'bone' : handK, [0.006, -0.024, 0], [0.02 * k, 0.03 * k, 0.017 * k]);
      if (!bones) add(hd, SPH, bones ? skin : hand, handK, [0.016 * k, -0.034 * k, s * 0.006], [0.008 * k, 0.016 * k, 0.008 * k]);
      if (L.weapon === 'talons') for (const z of [-1, 0, 1]) add(hd, horn(0.009 * k, 0.07 * k, 0.03 * k, 0), L.horn || '#e0d0b0', 'horn', [0.012, -0.05 * k, z * 0.014 * k], 1, [0, 0, 0.3]);
    }
    // Waffe in der rechten Hand: Griffachse +x, Winkel setzt die Haltung
    J.wpn = joint(J, J.hd[1], 0.005, -0.026, 0);
    weapon(J, L);
    J.wpn.scale.setScalar(1.18);
    if (L.weapon === 'bow') {
      J.bow = joint(J, J.hd[-1], 0.005, -0.03, 0);
      const arc = memo('bow', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map(t => new THREE.Vector3(0.34 * t, -0.07 * (1 - t * t) + 0.03 * t * t * t * t, 0))), 16, 0.008, 5));
      add(J.bow, arc, '#5a3a1c', 'wood');
      add(J.bow, BOX, '#e8e0c8', 'cloth', [0, 0.028, 0], [0.7, 0.003, 0.003]);
      add(J.chest, limbGeo(0.22, 0.026, 0.022, 0), '#4a3018', 'leather', [-0.078 * B.td, 0.2, 0.035], 1, [0.3, 0, 0.35]);
      for (const z of [-0.012, 0.004, 0.018]) add(J.chest, BOX, '#e0d8c0', 'cloth', [-0.1 * B.td, 0.22, 0.045 + z], [0.012, 0.035, 0.004], [0, 0, 0.35]);
    }
    if (L.shield) {
      const sm = mount(J.el[-1], 0, -B.fa * 0.45, -0.05 * k, 0, -0.6, 0);
      const metal = armored || L.armor;
      add(sm, flat('shield', s => { s.moveTo(-0.062, 0.078); s.lineTo(0.062, 0.078); s.lineTo(0.062, 0); s.quadraticCurveTo(0.058, -0.07, 0, -0.112); s.quadraticCurveTo(-0.058, -0.07, -0.062, 0); s.closePath(); }, 0.012, 0.005), L.shield, metal ? 'metal' : 'wood', [0, 0, 0], k);
      add(sm, HALF, shade(L.shield, -0.15), 'metal', [0, -0.005, -0.01 * k], [0.022 * k, 0.012 * k, 0.022 * k], [-Math.PI / 2, 0, 0]);
      if (L.emblem) { add(sm, BOX, L.emblem, 'cloth', [0, 0, -0.012 * k], [0.022 * k, 0.15 * k, 0.003]); add(sm, BOX, L.emblem, 'cloth', [0, 0.025 * k, -0.012 * k], [0.1 * k, 0.022 * k, 0.003]); }
    }
    // Kleidung: Umhang, Robe, Wappenrock
    if (L.cape) {
      J.cape = joint(J, J.chest, -0.068 * B.td, B.ch - 0.012, 0);
      add(J.cape, capeGeo(0.23 * B.tw, 0.6), L.cape, 'cloth2');
      add(J.chest, SPH, '#a8884a', 'gold', [0.02, B.ch - 0.01, 0.07 * B.tw], 0.012);
    }
    if (L.robe) {
      const len = J.hipY + 0.05 - 0.012;
      J.skirt = joint(J, J.hips, 0, 0.05, 0);
      add(J.skirt, skirtGeo(len, 0.082, 0.17), body, 'cloth2', [0, 0, 0], [0.82 * B.td, 1, B.tw]);
      if (L.trim) add(J.skirt, RING, L.trim, 'gold', [0, -len + 0.014, 0], [0.165 * 0.82 * B.td, 0.06, 0.165 * B.tw]);
    }
    if (!L.robe && !bones && !L.tentacles && !B.digi) {
      const tun = armored ? shade(legs, 0.05) : L.top || (bare ? L.belt || '#5a3a20' : body);
      add(J.hips, skirtGeo(0.17, 0.08, 0.112), tun, armored ? 'metal' : bare ? 'fur' : 'cloth2', [0, 0.04, 0], [0.86 * B.td, 1, B.tw * 1.02]);
    }
    if (L.tabard) {
      add(J.hips, panelGeo(0.1 * B.tw, 0.3), L.tabard, 'cloth2', [0.062 * B.td, 0.06, 0]);
      add(J.hips, panelGeo(0.1 * B.tw, 0.3), L.tabard, 'cloth2', [-0.062 * B.td, 0.06, 0]);
      add(J.chest, panelGeo(0.1 * B.tw, 0.25), L.tabard, 'cloth2', [0.071 * B.td, 0.15, 0]);
      if (L.emblem) { add(J.chest, BOX, L.emblem, 'cloth', [0.075 * B.td, 0.06, 0], [0.003, 0.12, 0.02]); add(J.chest, BOX, L.emblem, 'cloth', [0.075 * B.td, 0.09, 0], [0.003, 0.02, 0.07]); }
    }
    // Anhängsel: Flügel, Schwanz, Spinnenbeine (Andariel), Rückententakel (Baal), Unterleibstentakel (Mephisto), Rückenstacheln
    if (L.wings) {
      J.wing = {};
      for (const s of [1, -1]) {
        const m = mount(J.chest, -0.05 * B.td, B.ch - 0.04, s * 0.04, 0, -s * 2.09, 0);
        const w = J.wing[s] = joint(J, m);
        add(w, memo('wing', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.12, 0.2); sh.lineTo(0.32, 0.3); sh.lineTo(0.6, 0.24); sh.quadraticCurveTo(0.5, 0.08, 0.55, -0.04); sh.quadraticCurveTo(0.42, 0.02, 0.4, -0.12); sh.quadraticCurveTo(0.28, -0.04, 0.22, -0.18); sh.quadraticCurveTo(0.1, -0.08, 0, -0.1); sh.closePath(); const g = new THREE.ShapeGeometry(sh, 6); g.userData.two = true; return g; }), L.wings, 'leather');
        add(w, limbGeo(0.36, 0.014, 0.008, 0), shade(L.wings, -0.1), 'horn', [0, 0, 0], 1, [0, 0, -1.0]);
        add(w, limbGeo(0.3, 0.01, 0.005, 0), shade(L.wings, -0.1), 'horn', [0.3, 0.29, 0], 1, [0, 0, -1.8]);
      }
    }
    if (L.tail) {
      const n = b === 'lizard' ? 6 : 5;
      J.tail = chain(J, mount(J.hips, -0.06 * B.td, -0.01, 0), n, b === 'cat' ? 0.075 : 0.08, b === 'lizard' ? 0.04 * k : 0.022 * k, 0.007, L.tail, sk);
    }
    if (L.spiderLegs) {
      J.spider = [];
      for (let i = 0; i < 4; i++) {
        const s = i < 2 ? 1 : -1, a = joint(J, J.chest, -0.05 * B.td, 0.13 - (i % 2) * 0.05, s * 0.04);
        add(a, limbGeo(0.3, 0.02, 0.012), L.spiderLegs, 'horn');
        const c = joint(J, a, 0, -0.3, 0);
        add(c, limbGeo(0.34, 0.013, 0.003), L.spiderLegs, 'horn');
        J.spider.push([a, c, s, i % 2]);
      }
    }
    if (L.backTents) {
      J.btents = [];
      for (let i = 0; i < 4; i++) { const s = i < 2 ? 1 : -1; J.btents.push([chain(J, joint(J, J.chest, -0.05 * B.td, 0.12 - (i % 2) * 0.06, s * 0.05), 5, 0.075, 0.026, 0.006, L.backTents, 'flesh'), s, i % 2]); }
    }
    if (L.tentacles) {
      J.tents = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; J.tents.push([chain(J, joint(J, J.hips, Math.cos(a) * 0.04, -0.05, Math.sin(a) * 0.05), 5, 0.1, 0.042, 0.01, shade(L.tentacles, -0.06 * (i % 2)), 'flesh'), a]); }
    }
    if (L.spikes) for (let i = 0; i < 5; i++) add(J.chest, horn(0.02 * k, (0.08 - i * 0.008) * k, -0.03 * k, 0), L.spikes, 'horn', [-0.062 * B.td, 0.15 - i * 0.045, 0], 1, [0, 0, 0.95 + i * 0.12]);
    return { root, J, marks: J.marks, caster: ['staff', 'none'].includes(L.weapon || 'none'), pose: (an, p) => poseHuman(J, an, p) };
  }

  // Köpfe: x zeigt nach vorn, y nach oben, z nach rechts
  function head(J, L, B, sk) {
    const h = J.head, s = L.skin, r = B.hr, t = L.head || 'bald', hairK = 'fur';
    const eyes = (x, y, w, sz = 0.12) => {
      for (const z of [-1, 1]) add(h, SPH, L.eyes || '#140c08', L.eyes ? 'glow' : 'skin', [x, y, z * w], r * sz);
      if (L.eyes) mark(J, mount(h, x + r * 0.05, y, 0), L.eyes, r * 1.6, true);
    };
    const face = () => {
      add(h, SPH, s, sk, [r * 0.42, -r * 0.55, 0], [r * 0.55, r * 0.42, r * 0.62]);
      add(h, horn(r * 0.16, r * 0.32), s, sk, [r * 0.9, -r * 0.12, 0], 1, [0, 0, -Math.PI / 2]);
      add(h, SPH, s, sk, [r * 0.7, r * 0.22, 0], [r * 0.3, r * 0.15, r * 0.72]);
      for (const z of [-1, 1]) add(h, SPH, s, sk, [-r * 0.05, -r * 0.08, z * r * 0.9], [r * 0.2, r * 0.32, r * 0.12]);
      eyes(r * 0.84, r * 0.08, r * 0.34);
    };
    const hornPair = (col, kind, len, up, at = [0, r * 0.45, r * 0.85]) => {
      for (const z of [1, -1]) add(h, horn(r * 0.2, len, 0, -z * up), col, kind, [at[0], at[1], z * at[2]], 1, [z * Math.PI / 2, 0, 0.15]);
    };
    const hair = long => {
      add(h, CAP, L.hair, hairK, [-r * 0.06, r * 0.06, 0], [r * 1.14, r * 1.12, r * 1.0], [0, 0, 0.45]);
      add(h, SPH, L.hair, hairK, [-r * 0.42, -r * 0.18, 0], [r * 0.72, r * 0.95, r * 0.95]);
      if (long) add(h, SPH, L.hair, hairK, [-r * 0.62, -r * 1.3, 0], [r * 0.42, r * 1.35, r * 1.0]);
      if (L.pony) J.pony = chain(J, mount(h, -r * 0.95, r * 0.25, 0, 0, 0, -0.6), 3, r * 0.75, r * 0.32, r * 0.14, L.hair, hairK);
    };
    switch (t) {
      case 'skull':
        add(h, SPH, s, 'bone', [0, 0, 0], [r * 0.98, r * 1.05, r * 0.88]);
        add(h, SPH, s, 'bone', [r * 0.38, -r * 0.62, 0], [r * 0.5, r * 0.32, r * 0.58]);
        for (const z of [-1, 1]) add(h, SPH, '#0a0806', 'skin', [r * 0.74, r * 0.05, z * r * 0.33], r * 0.24);
        add(h, SPH, '#0a0806', 'skin', [r * 0.92, -r * 0.22, 0], [r * 0.08, r * 0.12, r * 0.07]);
        add(h, BOX, '#e8e0c8', 'bone', [r * 0.78, -r * 0.42, 0], [r * 0.1, r * 0.1, r * 0.5]);
        if (L.eyes) eyes(r * 0.86, r * 0.05, r * 0.33, 0.1);
        break;
      case 'helm':
        add(h, lathe(`helm`, [[0.95, -1.05], [1.12, -0.6], [1.15, 0], [1.1, 0.6], [0.85, 1.0], [0.4, 1.2], [0, 1.22]]), L.helm, 'metal', [0, 0, 0], [r * 1.02, r, r * 0.92]);
        add(h, BOX, '#0a0806', 'metal', [r * 1.06, r * 0.1, 0], [r * 0.12, r * 0.14, r * 1.3]);
        add(h, BOX, '#0a0806', 'metal', [r * 1.09, -r * 0.35, 0], [r * 0.1, r * 0.5, r * 0.12]);
        add(h, BOX, shade(L.helm, -0.12), 'metal', [0, r * 1.05, 0], [r * 1.9, r * 0.14, r * 0.12]);
        if (L.eyes) eyes(r * 1.1, r * 0.1, r * 0.3, 0.09);
        break;
      case 'lizard':
        add(h, SPH, s, sk, [r * 0.05, 0, 0], [r * 1.2, r * 0.95, r * 0.85]);
        add(h, SPH, s, sk, [r * 1.0, -r * 0.32, 0], [r * 0.85, r * 0.4, r * 0.55]);
        add(h, SPH, shade(s, -0.1), sk, [r * 0.9, -r * 0.62, 0], [r * 0.75, r * 0.2, r * 0.48]);
        for (let i = 0; i < 4; i++) add(h, horn(r * 0.14, r * (0.55 - i * 0.07), -r * 0.25), shade(s, -0.18), 'horn', [r * (0.25 - i * 0.38), r * (0.82 - i * 0.12), 0], 1, [0, 0, 0.5 + i * 0.3]);
        if (!L.eyes) for (const z of [-1, 1]) add(h, SPH, '#d8b830', 'horn', [r * 0.72, r * 0.15, z * r * 0.45], r * 0.14);
        else eyes(r * 0.72, r * 0.15, r * 0.45);
        break;
      case 'demon':
        add(h, SPH, s, sk, [0, 0, 0], [r * 1.1, r * 0.95, r * 0.9]);
        add(h, SPH, s, sk, [r * 1.0, -r * 0.25, 0], [r * 0.85, r * 0.5, r * 0.6]);
        add(h, SPH, shade(s, -0.12), sk, [r * 0.85, -r * 0.7, 0], [r * 0.75, r * 0.28, r * 0.55]);
        for (const z of [-1, 1]) { add(h, horn(r * 0.3, r * 2.1, -r * 1.4, 0), L.horn, 'horn', [r * 0.2, r * 0.55, z * r * 0.45], 1, [z * 0.45, 0, 0.5]); add(h, horn(r * 0.16, r * 0.9, -r * 0.5, 0), L.horn, 'horn', [r * 0.75, r * 0.45, z * r * 0.4], 1, [z * 0.7, 0, 0.2]); }
        for (let i = 0; i < 3; i++) add(h, horn(r * 0.08, r * 0.3, 0, 0), L.horn, 'horn', [r * (0.9 - i * 0.2), r * 0.38, 0], 1, [0, 0, -0.4]);
        eyes(r * 0.95, r * 0.12, r * 0.32, 0.14);
        break;
      default: {
        // Gesicht mit Kinn, Nase, Brauen, Ohren und Augen, darüber Haar, Kapuze, Helm oder Tiermerkmale
        if (t === 'bald' && B.crown) add(h, SPH, s, sk, [-r * 0.05, r * 0.3, 0], [r * 1.0, r * 1.25, r * 0.88]);
        else add(h, SPH, s, sk, [0, 0, 0], [r * 1.02, r * 1.1, r * 0.9]);
        if (t === 'cat') {
          add(h, SPH, shade(s, 0.12), sk, [r * 0.85, -r * 0.32, 0], [r * 0.45, r * 0.32, r * 0.5]);
          add(h, SPH, '#2a1810', 'skin', [r * 1.25, -r * 0.2, 0], r * 0.1);
          for (const z of [-1, 1]) add(h, horn(r * 0.28, r * 0.6, -r * 0.1), s, sk, [-r * 0.05, r * 0.85, z * r * 0.55], 1, [z * 0.4, 0, 0]);
          add(h, SPH, shade(s, -0.14), sk, [-r * 0.35, -r * 0.4, 0], [r * 0.95, r * 1.25, r * 1.28]);
          eyes(r * 0.84, r * 0.1, r * 0.36);
          break;
        }
        if (t === 'snout' || t === 'goat') {
          add(h, SPH, s, sk, [r * 0.95, -r * 0.25, 0], t === 'goat' ? [r * 0.9, r * 0.42, r * 0.42] : [r * 0.85, r * 0.45, r * 0.48]);
          add(h, SPH, '#1a1410', 'skin', [r * 1.75, -r * 0.14, 0], r * 0.14);
          if (t === 'snout') { for (const z of [-1, 1]) add(h, horn(r * 0.2, r * 0.55, -r * 0.2), s, sk, [-r * 0.25, r * 0.75, z * r * 0.55], 1, [z * 0.35, 0, 0]); add(h, SPH, shade(s, -0.2), 'fur', [-r * 0.5, -r * 0.1, 0], [r * 0.7, r * 1.1, r * 0.8]); }
          else for (const z of [-1, 1]) add(h, horn(r * 0.22, r * 1.5, -r * 1.1, 0), L.horn, 'horn', [r * 0.1, r * 0.72, z * r * 0.45], 1, [z * 0.5, 0, 0.35]);
          eyes(r * 0.8, r * 0.18, r * 0.42);
          break;
        }
        face();
        if (L.beard) { add(h, SPH, L.beard, 'fur', [r * 0.45, -r * 0.72, 0], [r * 0.55, r * 0.62, r * 0.72]); add(h, SPH, L.beard, 'fur', [r * 0.85, -r * 0.32, 0], [r * 0.18, r * 0.12, r * 0.5]); }
        if (t === 'hair') hair(L.long);
        if (t === 'elf') { hair(false); for (const z of [-1, 1]) add(h, horn(r * 0.16, r * 0.75, -r * 0.3), s, sk, [-r * 0.1, 0, z * r * 0.85], 1, [z * 0.6, 0, 0]); }
        if (t === 'goblin') { add(h, horn(r * 0.2, r * 0.7), s, sk, [r * 0.9, -r * 0.1, 0], 1, [0, 0, -1.9]); for (const z of [-1, 1]) add(h, horn(r * 0.24, r * 1.3), s, sk, [-r * 0.05, r * 0.1, z * r * 0.85], 1, [z * 1.3, 0, 0.3]); }
        if (t === 'tusks') { add(h, SPH, s, sk, [r * 0.5, -r * 0.62, 0], [r * 0.65, r * 0.5, r * 0.78]); for (const z of [-1, 1]) add(h, horn(r * 0.1, r * 0.4, r * 0.08), '#f0e8d0', 'horn', [r * 0.9, -r * 0.6, z * r * 0.35]); }
        if (t === 'mask') {
          add(h, CAP, L.hair, 'cloth', [-r * 0.05, r * 0.02, 0], [r * 1.16, r * 1.15, r * 1.05], [0, 0, 0.25]);
          add(h, SPH, L.hair, 'cloth', [-r * 0.35, -r * 0.3, 0], [r * 0.85, r * 1.0, r * 1.02]);
          add(h, SPH, '#18141c', 'cloth', [r * 0.5, -r * 0.45, 0], [r * 0.62, r * 0.48, r * 0.8]);
        }
        if (t === 'pelt') {
          add(h, SPH, L.hood, 'fur', [-r * 0.1, r * 0.48, 0], [r * 1.2, r * 0.8, r * 1.08]);
          add(h, SPH, L.hood, 'fur', [r * 0.95, r * 0.45, 0], [r * 0.62, r * 0.32, r * 0.42]);
          add(h, SPH, '#1a1410', 'skin', [r * 1.52, r * 0.45, 0], r * 0.12);
          for (const z of [-1, 1]) add(h, horn(r * 0.2, r * 0.5, -r * 0.15), L.hood, 'fur', [-r * 0.2, r * 1.05, z * r * 0.5], 1, [z * 0.3, 0, 0]);
          add(h, SPH, L.hood, 'fur', [-r * 0.75, -r * 0.9, 0], [r * 0.45, r * 1.5, r * 1.15]);
        }
        if (t === 'horns') {
          const metal = L.helm !== s;
          add(h, CAP, L.helm, metal ? 'metal' : sk, [-r * 0.02, r * 0.12, 0], [r * 1.13, r * 1.05, r * 1.0], [0, 0, 0.15]);
          if (metal) add(h, BOX, L.helm, 'metal', [r * 1.02, -r * 0.05, 0], [r * 0.12, r * 0.55, r * 0.14]);
          hornPair(L.horn, 'horn', r * 1.4, r * 1.0);
        }
      }
    }
  }

  // Waffen in der Hand: Griff um den Ursprung, Klinge entlang +x
  function weapon(J, L) {
    const w = J.wpn, wood = '#5a3c22', steel = '#b8b8c4', grip = '#3a2414';
    const blade = (len, wd) => flat(`b${len},${wd}`, s => { s.moveTo(0, -wd / 2); s.lineTo(len - wd * 1.6, -wd / 2); s.lineTo(len, 0); s.lineTo(len - wd * 1.6, wd / 2); s.lineTo(0, wd / 2); s.closePath(); }, 0.006, 0.003);
    switch (L.weapon) {
      case 'sword':
        rod(w, -0.045, 0.045, 0.011, 0.011, grip, 'leather'); add(w, SPH, '#a8884a', 'gold', [-0.052, 0, 0], 0.016);
        add(w, BOX, '#8a7040', 'gold', [0.05, 0, 0], [0.016, 0.014, 0.11]);
        add(w, blade(0.4, 0.036), steel, 'metal', [0.055, 0, 0], 1, [0.8, 0, 0]);
        break;
      case 'axe':
        rod(w, -0.12, 0.34, 0.013, 0.012, wood, 'wood');
        add(w, flat('axe', s => { s.moveTo(0.27, 0.015); s.lineTo(0.31, 0.015); s.lineTo(0.33, -0.04); s.quadraticCurveTo(0.39, -0.07, 0.37, -0.125); s.quadraticCurveTo(0.29, -0.145, 0.21, -0.125); s.quadraticCurveTo(0.2, -0.07, 0.25, -0.04); s.closePath(); }, 0.012, 0.004), steel, 'metal');
        add(w, horn(0.012, 0.05), steel, 'metal', [0.29, 0.012, 0], 1, [0, 0, 0.2]);
        break;
      case 'mace':
        rod(w, -0.08, 0.24, 0.012, 0.014, wood, 'wood');
        add(w, SPH, steel, 'metal', [0.27, 0, 0], 0.036);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(w, horn(0.012, 0.035), steel, 'metal', [0.27, Math.cos(a) * 0.03, Math.sin(a) * 0.03], 1, [a, 0, 0]); }
        add(w, horn(0.012, 0.04), steel, 'metal', [0.3, 0, 0], 1, [0, 0, -Math.PI / 2]);
        break;
      case 'club':
        add(w, limbGeo(0.42, 0.016, 0.045, 0.1), wood, 'wood', [-0.05, 0, 0], 1, [0, 0, Math.PI / 2]);
        for (let i = 0; i < 4; i++) add(w, SPH, shade(wood, -0.1), 'wood', [0.22 + i * 0.04, Math.cos(i * 2) * 0.035, Math.sin(i * 2) * 0.035], 0.014);
        break;
      case 'spear':
        rod(w, -0.42, 0.52, 0.01, 0.01, wood, 'wood');
        add(w, flat('leaf', s => { s.moveTo(0, 0); s.quadraticCurveTo(0.04, 0.026, 0.13, 0); s.quadraticCurveTo(0.04, -0.026, 0, 0); }, 0.006, 0.003), steel, 'metal', [0.52, 0, 0], 1, [0.8, 0, 0]);
        add(w, RING, '#8a7040', 'gold', [0.52, 0, 0], [0.014, 0.1, 0.014], [0, 0, Math.PI / 2]);
        break;
      case 'dagger':
        rod(w, -0.035, 0.035, 0.01, 0.01, grip, 'leather'); add(w, BOX, '#8a7040', 'gold', [0.038, 0, 0], [0.01, 0.01, 0.06]);
        add(w, blade(0.17, 0.024), steel, 'metal', [0.04, 0, 0], 1, [0.8, 0, 0]);
        break;
      case 'claw':
        add(w, BOX, '#4a4048', 'metal', [0.02, 0, 0], [0.012, 0.012, 0.06]);
        for (const z of [-0.016, 0, 0.016]) add(w, blade(0.16, 0.014), steel, 'metal', [0.02, 0, z], 1, [Math.PI / 2, 0, 0]);
        break;
      case 'staff':
        rod(w, -0.42, 0.56, 0.013, 0.012, wood, 'wood');
        if (L.orb) {
          for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; add(w, horn(0.008, 0.07, 0.02, 0), '#4a3018', 'wood', [0.56, Math.cos(a) * 0.012, Math.sin(a) * 0.012], 1, [a, 0, -1.3]); }
          add(w, SPH, L.orb, 'glow', [0.62, 0, 0], 0.028);
          mark(J, mount(w, 0.62, 0, 0), L.orb, 0.13);
        } else add(w, SPH, shade(wood, -0.1), 'wood', [0.57, 0, 0], 0.024);
        break;
    }
  }

  // ---------- Haltungen ----------
  const smooth = t => t * t * (3 - 2 * t);
  // Schlüsselbilder [[t, {Werte}], …]; fehlende Werte und die Ränder 0/1 kommen aus der Grundhaltung P
  function keys(P, list, p) {
    let a = [0, {}], b = [1, {}];
    for (const kf of list) { if (kf[0] <= p) a = kf; else { b = kf; break; } }
    const t = smooth(Math.min(1, Math.max(0, (p - a[0]) / ((b[0] - a[0]) || 1)))), out = { ...P };
    for (const n of new Set([...Object.keys(a[1]), ...Object.keys(b[1])])) { const x = a[1][n] ?? P[n], y = b[1][n] ?? P[n]; out[n] = x + (y - x) * t; }
    return out;
  }

  // lt/rt: Oberschenkel vor (+) oder zurück, lk/rk: Kniebeuge, ru/lu: Arm vor/hoch, rx/lx: Arm seitlich ab, re/le: Ellbogen,
  // wa/ba: Winkel von Waffe/Bogen in der Welt (0 = nach vorn, π/2 = senkrecht), lean: vorgebeugt, twist: Oberkörper gedreht,
  // fall: nach hinten gekippt (Tod), drop: Hüfte abgesenkt, fl: Umhang weht
  function poseHuman(J, an, p) {
    const L = J.L, B = J.B, W = L.weapon || 'none', bow = W === 'bow', staff = W === 'staff', shield = !!L.shield;
    for (const g of J.all) g.rotation.set(0, 0, 0);
    let P = { lt: 0.12, lk: 0.18, rt: -0.08, rk: 0.12, bob: -0.006, lean: 0.07 + (L.hunch || 0) + B.hunch, twist: 0,
      ru: 0.32, rx: 0.14 + (B.tw > 1.1 ? 0.08 : 0), re: 0.95, wa: 1.15, lu: shield ? 0.32 : 0.18, lx: 0.16 + (B.tw > 1.1 ? 0.08 : 0), le: shield ? 1.0 : 0.45, ba: 1.25,
      hd: 0, fall: 0, drop: 0, fl: 0.04, tw: 0 };
    if (staff) Object.assign(P, { ru: 0.25, re: 0.65, wa: 1.45 });
    if (bow) Object.assign(P, { lu: 0.25, le: 0.55, ru: 0.15, re: 0.3 });
    if (W === 'talons') Object.assign(P, { ru: 0.45, re: 0.7, lu: 0.45, le: 0.7, rx: 0.3, lx: 0.3 });
    if (L.arms) Object.assign(P, { ru: 1.35, re: 0.15, lu: 1.35, le: 0.15, rx: 0.08, lx: 0.08 });
    if (L.spread) Object.assign(P, { ru: 0.5, rx: 1.75, re: 0.6, lu: 0.5, lx: 1.75, le: 0.6 });
    const s = Math.sin(TAU * p), c = Math.cos(TAU * p);
    if (an === 'idle') {
      P.bob += s * 0.004; P.lean += s * 0.012; P.ru += s * 0.03; P.lu -= s * 0.025; P.hd = -s * 0.02; P.tw = s;
      if (L.spread) { P.rx += s * 0.12; P.lx += s * 0.12; }
    } else if (an === 'walk') {
      const sw = L.robe ? 0.3 : 0.42;
      P.rt = sw * s; P.lt = -sw * s; P.rk = 0.08 + 0.8 * Math.max(0, c); P.lk = 0.08 + 0.8 * Math.max(0, -c);
      P.bob = -0.014 + 0.01 * Math.cos(2 * TAU * p); P.twist = 0.09 * s; P.fl = 0.18 + 0.06 * c; P.tw = s * 2;
      if (!bow && !shield && !L.arms && !L.spread && W !== 'talons') { P.lu = 0.12 + 0.38 * s; P.le = 0.3 + 0.25 * Math.max(0, s); }
      if (!L.arms && !L.spread) P.ru -= 0.16 * s;
      if (L.spread) { P.rx += s * 0.1; P.lx -= s * 0.1; }
    } else if (an === 'attack') {
      if (bow) P = keys(P, [[0.12, { twist: -0.55, lu: 1.5, le: 0.05, lx: 0.06, ba: 1.57, ru: 1.4, rx: -0.05, re: 1.3, lt: 0.25, rt: -0.25 }], [0.6, { twist: -0.6, lu: 1.5, le: 0.05, lx: 0.06, ba: 1.57, ru: 1.45, rx: 0.05, re: 2.5, lt: 0.25, rt: -0.25 }], [0.74, { twist: -0.55, lu: 1.48, le: 0.05, lx: 0.06, ba: 1.57, ru: 1.2, rx: 0.3, re: 1.6, lt: 0.25, rt: -0.25 }]], p);
      else if (W === 'spear') P = keys(P, [[0.38, { ru: -0.25, re: 1.7, wa: 0.08, twist: -0.4, lean: P.lean - 0.05, lt: 0.2 }], [0.6, { ru: 1.0, re: 0.45, rx: 0.08, wa: 0, twist: 0.4, lean: P.lean + 0.2, lt: 0.48, lk: 0.5, rt: -0.3 }]], p);
      else if (L.arms) P = keys(P, [[0.4, { ru: 2.1, lu: 2.1, re: 0.3, le: 0.3, lean: P.lean - 0.15 }], [0.62, { ru: 0.9, lu: 0.9, lean: P.lean + 0.15 }]], p);
      else if (W === 'talons') P = keys(P, [[0.38, { ru: 2.2, re: 1.0, rx: 0.6, lu: 0.6, twist: -0.35, lean: P.lean - 0.1 }], [0.6, { ru: 0.5, re: 0.2, rx: 0.1, lu: 1.0, twist: 0.4, lean: P.lean + 0.15, lt: 0.4, lk: 0.4 }]], p);
      else if (W === 'dagger' || W === 'claw' || W === 'none') P = keys(P, [[0.35, { ru: 0.9, re: 1.9, rx: 0.9, wa: 1.7, twist: -0.35 }], [0.58, { ru: 1.25, re: 0.25, rx: -0.15, wa: 0.15, twist: 0.5, lean: P.lean + 0.15, lt: 0.4, lk: 0.45 }]], p);
      else P = keys(P, [[0.4, { ru: 2.55, re: 1.45, rx: 0.4, wa: 2.7, twist: -0.4, lean: P.lean - 0.07 }], [0.62, { ru: 0.3, re: 0.12, rx: 0.12, wa: -0.4, twist: 0.45, lean: P.lean + 0.25, lt: 0.5, lk: 0.55, rt: -0.32 }]], p);
    } else if (an === 'cast') {
      const both = !shield && !bow;
      if (L.spread) P = keys(P, [[0.42, { rx: 2.3, lx: 2.3, ru: 0.3, lu: 0.3, re: 0.2, le: 0.2, lean: P.lean - 0.1 }], [0.62, { rx: 1.2, lx: 1.2, ru: 1.2, lu: 1.2, re: 0.1, le: 0.1, lean: P.lean + 0.1 }]], p);
      else if (staff) P = keys(P, [[0.42, { ru: 2.5, re: 0.5, rx: 0.2, wa: 1.75, lu: both ? 1.6 : P.lu, le: both ? 0.5 : P.le, lx: 0.4, lean: P.lean - 0.07 }], [0.62, { ru: 1.3, re: 0.2, rx: 0.1, wa: 0.7, lu: both ? 1.25 : P.lu, le: both ? 0.15 : P.le, lx: 0.2, lean: P.lean + 0.18, lt: 0.35, lk: 0.35 }]], p);
      else P = keys(P, [[0.42, { ru: 1.8, re: 0.6, rx: 0.4, wa: 2.2, lu: both ? 1.8 : P.lu, le: both ? 0.6 : P.le, lx: 0.4, lean: P.lean - 0.12 }], [0.62, { ru: 1.35, re: 0.05, rx: 0.15, wa: 1.0, lu: both ? 1.35 : P.lu, le: both ? 0.05 : P.le, lx: 0.15, lean: P.lean + 0.13, lt: 0.32, lk: 0.32 }]], p);
    } else if (an === 'death') {
      P = keys(P, [[0.3, { lk: 0.9, rk: 0.7, lt: 0.55, rt: 0.35, lean: -0.15, ru: 1.0, rx: 0.7, re: 0.4, lu: 1.0, lx: 0.7, le: 0.4, drop: 0.12, fall: 0.2, wa: 1.0 }],
        [0.65, { lk: 0.6, rk: 0.5, lt: 0.4, rt: 0.3, lean: -0.3, ru: 2.2, rx: 0.6, re: 0.3, lu: 2.0, lx: 0.7, le: 0.3, drop: 0.08, fall: 1.0, wa: 1.5 }],
        [1, { lk: 0.5, rk: 0.22, lt: 0.12, rt: 0.06, lean: -0.1, ru: 0.08, rx: 1.25, re: 0.35, lu: -0.05, lx: 1.1, le: 0.5, drop: 0, fall: 1.5708, wa: 1.62, ba: 1.6, hd: 0.3 }]], p);
    }
    const root = J.root;
    root.rotation.set(0, 0, P.fall);
    root.position.set(0, Math.sin(P.fall) * 0.075 * B.td + (L.float ? 0.06 + Math.sin(TAU * p) * 0.015 : 0), 0);
    J.hips.position.y = J.hipY + P.bob - P.drop;
    for (const [sd, t, kn] of [[1, P.rt, P.rk], [-1, P.lt, P.lk]]) {
      if (!J.th[sd]) break;
      if (B.digi) { J.th[sd].rotation.z = t + 0.45; J.kn[sd].rotation.z = -kn - 1.05; J.an[sd].rotation.z = kn - t + 0.95; J.toe[sd].rotation.z = -0.35; }
      else { J.th[sd].rotation.z = t; J.kn[sd].rotation.z = -kn; J.an[sd].rotation.z = kn - t; }
    }
    J.spine.rotation.set(0, P.twist * 0.5, -P.lean * 0.6);
    J.chest.rotation.set(0, P.twist * 0.5, -P.lean * 0.4);
    J.neck.rotation.set(0, -P.twist * 0.7, P.lean * 0.75 + P.hd);
    J.sh[1].rotation.set(-P.rx, 0, P.ru); J.el[1].rotation.z = P.re;
    J.sh[-1].rotation.set(P.lx, 0, P.lu); J.el[-1].rotation.z = P.le;
    J.wpn.rotation.z = P.wa - (P.ru + P.re - P.lean);
    if (J.bow) J.bow.rotation.z = P.ba - (P.lu + P.le - P.lean);
    if (J.cape) J.cape.rotation.z = P.lean - 0.08 - P.fl;
    if (J.skirt) J.skirt.rotation.set(P.twist * 0.3, 0, (P.rt + P.lt) * 0.2 + P.lean * 0.3);
    if (J.tail) J.tail.forEach((g, i) => { g.rotation.set(Math.sin(TAU * p + i * 0.8) * 0.12 * (1 + Math.abs(P.tw)), 0, i ? 0.22 : -0.95 + P.lean * 0.5); });
    if (J.pony) J.pony.forEach((g, i) => { g.rotation.z = (i ? 0.2 : 0) - P.lean * 0.3 + Math.sin(TAU * p + i) * 0.05; });
    if (J.wing) for (const sd of [1, -1]) J.wing[sd].rotation.z = 0.15 + Math.sin(TAU * p) * (an === 'walk' ? 0.3 : 0.15) + (an === 'cast' ? 0.4 : 0);
    if (J.spider) for (const [a, cc, sd, odd] of J.spider) { a.rotation.set(sd * (0.55 + odd * 0.3), 0, -2.55 + odd * 0.35 + Math.sin(TAU * p + odd * 2 + sd) * 0.08); cc.rotation.z = 2.1 + Math.sin(TAU * p + odd) * 0.1; }
    if (J.btents) for (const [ch, sd, odd] of J.btents) ch.forEach((g, i) => g.rotation.set(i ? sd * 0.1 : sd * (0.7 + odd * 0.4), 0, i ? 0.2 + Math.sin(TAU * p + i + odd * 2) * 0.15 : -2.3 + odd * 0.4));
    if (J.tents) for (const [ch, a] of J.tents) ch.forEach((g, i) => {
      const w = Math.sin(TAU * p * (an === 'walk' ? 2 : 1) + i * 0.9 + a) * 0.18, out = i ? (i === 4 ? 0.5 : 0.08) : 0.32;
      g.rotation.set(-Math.sin(a) * out + Math.cos(a) * w, 0, Math.cos(a) * out + Math.sin(a) * w);
    });
  }

  // ---------- Vierbeiner: Wolf, Bär, Stachelratte, Dachs ----------
  function quad(L) {
    const c = L.col, bk = L.bulk ? 1.4 : 1, root = new THREE.Group(), J = { root, all: [], marks: [], L, legs: [] }, fur = 'fur';
    J.body = joint(J, root, 0, 0.3 * bk, 0);
    add(J.body, SPH, c, fur, [-0.02, 0, 0], [0.24 * bk, 0.1 * bk, 0.095 * bk]);
    add(J.body, SPH, c, fur, [0.12 * bk, 0.01, 0], [0.13 * bk, 0.12 * bk, 0.11 * bk]);
    add(J.body, SPH, shade(c, 0.08), fur, [0.0, -0.05 * bk, 0], [0.2 * bk, 0.05 * bk, 0.08 * bk]);
    J.head = joint(J, J.body, 0.22 * bk, 0.07 * bk, 0);
    const h = J.head;
    add(h, SPH, c, fur, [0.03 * bk, 0.01, 0], [0.075 * bk, 0.065 * bk, 0.062 * bk]);
    add(h, SPH, shade(c, -0.08), fur, [0.1 * bk, -0.008, 0], L.bulk ? [0.05, 0.035, 0.045] : [0.065, 0.032, 0.035]);
    add(h, SPH, '#141010', 'skin', [0.16 * bk, 0.0, 0], 0.012 * bk);
    for (const z of [-1, 1]) add(h, horn(0.02 * bk, (L.bulk ? 0.025 : 0.05) * bk, -0.01), c, fur, [-0.01, 0.055 * bk, z * 0.035 * bk], 1, [z * 0.3, 0, 0]);
    J.jaw = joint(J, h, 0.06 * bk, -0.025 * bk, 0);
    add(J.jaw, SPH, shade(c, -0.15), fur, [0.04 * bk, 0, 0], [0.05 * bk, 0.014 * bk, 0.03 * bk]);
    for (const z of [-1, 1]) add(h, SPH, L.eyes || '#100808', L.eyes ? 'glow' : 'skin', [0.075 * bk, 0.025 * bk, z * 0.03 * bk], 0.008 * bk);
    if (L.eyes) mark(J, mount(h, 0.08 * bk, 0.025 * bk, 0), L.eyes, 0.06);
    for (const [x, z, front] of [[0.14, 1, 1], [0.14, -1, 1], [-0.17, 1, 0], [-0.17, -1, 0]]) {
      const hip = joint(J, J.body, x * bk, -0.03 * bk, z * 0.065 * bk);
      add(hip, limbGeo(0.14 * bk, 0.04 * bk, 0.026 * bk, 0.2), c, fur);
      const kn = joint(J, hip, 0, -0.14 * bk, 0);
      add(kn, limbGeo(0.13 * bk, 0.024 * bk, 0.017 * bk), shade(c, -0.06), fur);
      add(kn, SPH, shade(c, -0.15), fur, [0.012, -0.135 * bk, 0], [0.026 * bk, 0.014 * bk, 0.02 * bk]);
      J.legs.push([hip, kn, front, z]);
    }
    J.tail = chain(J, mount(J.body, -0.24 * bk, 0.04 * bk, 0), 4, 0.055 * bk, 0.024 * bk, 0.008, c, fur);
    if (L.spikes) for (let i = 0; i < 14; i++) add(J.body, horn(0.008, 0.07, -0.04), L.spikes, 'horn', [0.12 - (i >> 1) * 0.045, 0.07 + Math.sin(i) * 0.01, (i % 2 ? 1 : -1) * 0.03], 1, [(i % 2 ? 1 : -1) * 0.4, 0, 0.6]);
    J.y0 = 0.3 * bk;
    return { root, J, marks: J.marks, caster: false, pose: (an, p) => poseQuad(J, an, p) };
  }
  function poseQuad(J, an, p) {
    for (const g of J.all) g.rotation.set(0, 0, 0);
    const s = Math.sin(TAU * p), root = J.root;
    root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); J.body.position.y = J.y0;
    let pitch = 0, fwd = 0, jaw = 0.05, headUp = 0.1;
    if (an === 'walk') J.body.position.y += Math.abs(Math.cos(TAU * p)) * 0.012;
    if (an === 'idle') { J.body.position.y += s * 0.004; headUp += s * 0.04; }
    if (an === 'attack' || an === 'cast') { const k = keys({ pitch: 0, fwd: 0, jaw: 0.05, headUp: 0.1 }, [[0.35, { pitch: 0.15, fwd: -0.04, headUp: 0.25 }], [0.6, { pitch: -0.3, fwd: 0.12, jaw: 0.6, headUp: -0.25 }]], p); ({ pitch, fwd, jaw, headUp } = k); }
    J.body.rotation.z = pitch; root.position.x = fwd; J.head.rotation.z = headUp; J.jaw.rotation.z = -jaw;
    for (const [hip, kn, front, z] of J.legs) {
      const ph = an === 'walk' ? Math.sin(TAU * (p + (front ? 0 : 0.5) + (z > 0 ? 0.5 : 0))) : 0, cph = an === 'walk' ? Math.cos(TAU * (p + (front ? 0 : 0.5) + (z > 0 ? 0.5 : 0))) : 0;
      hip.rotation.z = ph * 0.45 - pitch;
      kn.rotation.z = front ? -Math.max(0, cph) * 0.7 : 0.25 + Math.max(0, cph) * 0.6;
    }
    J.tail.forEach((g, i) => g.rotation.set(Math.sin(TAU * p * 2 + i) * 0.25, 0, i ? 0.25 : -1.2));
    if (an === 'death') { const f = smooth(p); root.rotation.x = f * Math.PI / 2; root.position.y = f * 0.09; for (const [hip, kn] of J.legs) { hip.rotation.z = 0.3 * f; kn.rotation.z = -0.2 * f; } J.head.rotation.z = -0.3 * f; }
  }

  // ---------- Duriel: aufgerichteter Madenleib mit Sichelarmen ----------
  function grub(L) {
    const c = L.col, root = new THREE.Group(), J = { root, all: [], marks: [], L, segs: [] };
    const SEG = [[-0.52, 0.06, 0.06], [-0.4, 0.09, 0.09], [-0.26, 0.12, 0.12], [-0.11, 0.17, 0.145], [0.0, 0.3, 0.15], [0.05, 0.45, 0.14], [0.06, 0.59, 0.12]];
    for (const [x, y, r] of SEG) {
      const g = joint(J, root, x, y, 0);
      add(g, SPH, c, 'flesh', [0, 0, 0], [r * 1.05, r, r * 0.95]);
      add(g, RING, shade(c, -0.18), 'flesh', [0, 0, 0], [r * 1.02, 0.15, r * 0.98], [0, 0, 1.2]);
      add(g, horn(r * 0.18, r * 0.6, -r * 0.3), L.spikes, 'horn', [-r * 0.6, r * 0.7, 0], 1, [0, 0, 0.7]);
      J.segs.push([g, x, y]);
    }
    J.head = joint(J, root, 0.12, 0.72, 0);
    add(J.head, SPH, shade(c, -0.05), 'flesh', [0, 0, 0], [0.1, 0.085, 0.09]);
    for (const z of [-1, 1]) add(J.head, horn(0.022, 0.12, 0.05, -z * 0.04), L.spikes, 'horn', [0.07, -0.04, z * 0.04], 1, [0, 0, -1.4]);
    for (const z of [-1, 1]) add(J.head, SPH, L.eyes, 'glow', [0.08, 0.02, z * 0.03], 0.012);
    mark(J, mount(J.head, 0.09, 0.02, 0), L.eyes, 0.08);
    J.arms = [];
    for (const s of [1, -1]) {
      const sh = joint(J, root, 0.08, 0.6, s * 0.12);
      add(sh, limbGeo(0.16, 0.04, 0.03), c, 'flesh');
      const el = joint(J, sh, 0, -0.16, 0);
      add(el, limbGeo(0.14, 0.03, 0.022), c, 'flesh');
      add(el, flat('scythe', sh2 => { sh2.moveTo(0, 0.02); sh2.quadraticCurveTo(0.2, 0.08, 0.34, -0.04); sh2.quadraticCurveTo(0.18, 0.01, 0, -0.02); sh2.closePath(); }, 0.012, 0.004), L.spikes, 'horn', [0, -0.14, 0], 1, [0, 0, -0.6]);
      J.arms.push([sh, el, s]);
    }
    return { root, J, marks: J.marks, caster: false, pose: (an, p) => poseGrub(J, an, p) };
  }
  function poseGrub(J, an, p) {
    for (const g of J.all) g.rotation.set(0, 0, 0);
    const s = Math.sin(TAU * p), f = an === 'death' ? smooth(p) : 0;
    J.segs.forEach(([g, x, y], i) => { const w = an === 'walk' ? Math.sin(TAU * p - i * 0.8) * 0.02 : Math.sin(TAU * p + i) * 0.006; g.position.set(x + w * 0.5, y * (1 - f * 0.6) + (i < 4 ? w : 0), 0); });
    J.head.position.set(0.12 + f * 0.1, 0.72 - f * 0.5, 0); J.head.rotation.z = -0.1 - f * 0.4;
    let a = 0.9 + s * 0.08, e = 1.3;
    if (an === 'attack' || an === 'cast') ({ a, e } = keys({ a, e }, [[0.4, { a: 2.6, e: 0.5 }], [0.62, { a: 0.4, e: 1.4 }]], p));
    for (const [sh, el, sd] of J.arms) { sh.rotation.set(-sd * 0.25, 0, a - f * 0.8); el.rotation.z = e; sh.position.y = 0.6 * (1 - f * 0.6); }
  }

  // ---------- Rabe ----------
  function bird(L) {
    const c = L.col, root = new THREE.Group(), J = { root, all: [], marks: [], L };
    J.body = joint(J, root, 0, 0.62, 0);
    J.body.scale.setScalar(1.8);
    add(J.body, SPH, c, 'fur', [0, 0, 0], [0.07, 0.035, 0.038]);
    add(J.body, SPH, c, 'fur', [0.07, 0.015, 0], 0.03);
    add(J.body, horn(0.012, 0.045), '#c8a040', 'horn', [0.095, 0.012, 0], 1, [0, 0, -Math.PI / 2]);
    add(J.body, flat('tail', s => { s.moveTo(0, 0); s.lineTo(-0.09, 0.035); s.lineTo(-0.1, -0.035); s.closePath(); }, 0.004, 0), c, 'fur', [-0.05, 0, 0], 1, [Math.PI / 2, 0, 0]);
    J.wings = [];
    for (const s of [1, -1]) {
      const w = joint(J, J.body, 0.01, 0.02, s * 0.03);
      add(w, flat('feather', sh => { sh.moveTo(-0.04, 0); sh.lineTo(0.04, 0); sh.quadraticCurveTo(0.02, 0.1, -0.06, 0.2); sh.lineTo(-0.07, 0.06); sh.closePath(); }, 0.004, 0), c, 'fur', [0, 0, 0], 1, [s * -Math.PI / 2, 0, 0]);
      J.wings.push([w, s]);
    }
    return { root, J, marks: J.marks, caster: false, pose: (an, p) => { const fl = Math.sin(TAU * p * 2); J.body.position.y = 0.62 + Math.sin(TAU * p) * 0.02 - (an === 'death' ? smooth(p) * 0.58 : 0); for (const [w, s] of J.wings) w.rotation.x = s * (an === 'death' ? -0.3 : fl * 0.7); } };
  }

  // Dämonenrig (Diablo und seine Abbilder) als schwerer Humanoid auf Zehen mit Stacheln, Hörnern, Schwanz und Klauen
  const demonLook = L => ({ skin: L.col, body: L.col, legs: shade(L.col, -0.08), head: 'demon', horn: L.horn, spikes: L.spikes, tail: L.col, eyes: L.eyes, weapon: 'talons', build: 'demon' });

  // ---------- Modelle und Bildspeicher ----------
  const FR = { idle: 8, walk: 8, attack: 8, cast: 8, death: 8 }, HEROES = new Set(Object.values(LOOKS));
  const models = new WeakMap(), ents = new Map(), queue = [];
  let ids = 0, frameNo = 0, deadline = 0, pagePx = 0;
  const stats = { baked: 0, ms: 0, calls: 0, tris: 0, tinted: 0 }; // für die Grafik-Messung (bench.js)
  // gefärbte Figurenbilder (Trefferblitz, Kälte, Gift, Frost, Leichen) einmal erzeugen statt bei jeder Zeichnung zu filtern.
  // Sie liegen wie die Figurenbilder auf eigenen Atlasseiten ihrer Gestalt (alle Färbungen gemeinsam) und fallen mit ihr heraus
  function tinted(e, fr, flt) {
    const pages = e.tp ||= [];
    let at = (fr.t ||= {})[flt];
    if (!at) {
      at = fr.t[flt] = place(e, fr.w, fr.h, pages);
      const g = pages[at.pg].g;
      g.filter = flt; g.drawImage(e.pages[fr.pg].c, fr.x, fr.y, fr.w, fr.h, at.x, at.y, fr.w, fr.h); g.filter = 'none';
      stats.tinted++;
    }
    return [pages[at.pg].c, at.x, at.y];
  }
  function model(L) {
    if (models.has(L)) return models.get(L);
    let M = null;
    if (!['wisp', 'hammer', 'trap', 'hydra', 'bonewall', 'vine', 'totem'].includes(L.rig)) {
      M = L.rig === 'quad' ? quad(L) : L.rig === 'grub' ? grub(L) : L.rig === 'bird' ? bird(L) : human(L.rig === 'demon' ? demonLook(L) : L);
      M.turn = new THREE.Group(); M.turn.add(M.root);
      M.root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = !o.material.isMeshBasicMaterial; }); // Leuchtteile werfen keinen Schatten
      M.id = ++ids; M.dirs = HEROES.has(L) ? 16 : 8;
    }
    models.set(L, M);
    return M;
  }
  // Bildspeicher je Gestalt und Größe; Größen in Schritten von 8 %, damit sich Bilder wiederverwenden lassen
  function entry(M, want) {
    const H = Math.round(1.08 ** Math.round(Math.log(Math.min(want, 300)) / Math.log(1.08))), k = `${M.id}|${H}`;
    let e = ents.get(k);
    if (!e) {
      const cw = Math.ceil(2.6 * H), ch = Math.ceil(1.85 * H);
      e = { H, cw, ch, ss: cw * 2 <= GS && ch * 2 <= GS ? 2 : 1, ps: Math.max(512, 2 ** Math.ceil(Math.log2(Math.max(cw, ch) + 2))), pages: [], fr: new Map(), used: 0 };
      ents.set(k, e);
    }
    e.used = frameNo;
    return e;
  }
  // Regal-Packen: Bilder reihenweise auf Atlasseiten
  function place(e, w, h, pages = e.pages) {
    let pg = pages[pages.length - 1];
    if (pg && pg.x + w > e.ps) { pg.y += pg.row; pg.x = 0; pg.row = 0; }
    if (!pg || pg.y + h > e.ps) {
      pg = { c: mkCanvas(e.ps), x: 0, y: 0, row: 0 }; pg.g = pg.c.getContext('2d'); pg.g.imageSmoothingQuality = 'high';
      pages.push(pg); pagePx += e.ps * e.ps; evict();
    }
    const at = { pg: pages.length - 1, x: pg.x, y: pg.y };
    pg.x += w + 1; pg.row = Math.max(pg.row, h + 1);
    return at;
  }
  // höchstens etwa 48 Millionen Bildpunkte; zuerst fallen die am längsten ungenutzten Gestalten heraus
  function evict() {
    while (pagePx > 48e6) {
      let old = null;
      for (const [k, e] of ents) if (e.used < frameNo - 60 && (!old || e.used < old[1].used)) old = [k, e];
      if (!old) return;
      pagePx -= (old[1].pages.length + (old[1].tp?.length || 0)) * old[1].ps * old[1].ps;
      ents.delete(old[0]);
    }
  }
  const v3 = new THREE.Vector3(), box = new THREE.Box3();
  function bake(e, M, an, d, f) {
    const t0 = performance.now();
    M.pose(an, f / FR[an]);
    M.turn.rotation.y = -d * TAU / M.dirs;
    stage.add(M.turn); M.turn.updateMatrixWorld(true);
    const { cw, ch, ss } = e, ppu = e.H / COS30 / UNIT;
    cam.left = -cw / 2 / ppu; cam.right = cw / 2 / ppu; cam.top = FOOT * ch / ppu; cam.bottom = -(1 - FOOT) * ch / ppu; cam.updateProjectionMatrix();
    // nur den von der Figur bedeckten Ausschnitt speichern
    box.setFromObject(M.turn);
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    for (let i = 0; i < 8; i++) {
      v3.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
      const px = (v3.x + 1) / 2 * cw, py = (1 - v3.y) / 2 * ch;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(cw, Math.ceil(x1) + 1); y1 = Math.min(ch, Math.ceil(y1) + 1);
    const fr = { w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0), ox: cw / 2 - x0, oy: FOOT * ch - y0, glow: [] };
    if (fr.w && fr.h) {
      R.setViewport(0, GS - ch * ss, cw * ss, ch * ss); R.setScissor(0, GS - ch * ss, cw * ss, ch * ss); R.setScissorTest(true);
      R.render(scene, cam); stats.calls += R.info.render.calls; stats.tris += R.info.render.triangles;
      Object.assign(fr, place(e, fr.w, fr.h));
      e.pages[fr.pg].g.drawImage(R.domElement, x0 * ss, y0 * ss, fr.w * ss, fr.h * ss, fr.x, fr.y, fr.w, fr.h);
    }
    // Leuchtpunkte (Augen, Stabkugeln) werden beim Zeichnen additiv dazugelegt; abgewandte Augen leuchten nicht
    for (const mk of M.marks) {
      if (an === 'death' && f >= FR.death / 2) break; // Tote leuchten nicht
      if (mk.eye) { v3.set(1, 0, 0).transformDirection(mk.head.matrixWorld); if (v3.dot(toCam) < -0.1) continue; }
      mk.o.getWorldPosition(v3).project(cam);
      fr.glow.push([(v3.x + 1) / 2 * cw - cw / 2, (1 - v3.y) / 2 * ch - FOOT * ch, mk.r * ppu, mk.c]);
    }
    stage.remove(M.turn);
    e.fr.set(`${an}${d}.${f}`, fr);
    stats.baked++; stats.ms += performance.now() - t0;
    return fr;
  }
  // fehlt ein Bild und ist das Zeitbudget aufgebraucht: nächstes fertiges Bild derselben Bewegung und Richtung,
  // sonst irgendeins dieser Richtung, sonst dieselbe Bewegung in einer anderen Richtung
  function near(e, M, an, d, f) {
    for (let i = 1; i < FR[an]; i++) for (const g of [f - i, f + i]) { const fr = e.fr.get(`${an}${d}.${(g + FR[an]) % FR[an]}`); if (fr) return fr; }
    for (const a of ['idle', 'walk', 'attack', 'cast']) for (let i = 0; i < FR[a]; i++) { const fr = e.fr.get(`${a}${d}.${i}`); if (fr) return fr; }
    for (let j = 1; j <= M.dirs / 2; j++) for (const dd of [d - j, d + j]) { const fr = e.fr.get(`${an}${(dd + M.dirs) % M.dirs}.${f}`); if (fr) return fr; }
    return null;
  }
  const frac = v => v - Math.floor(v);
  const dirOf = (face, n) => ((Math.round(face / (TAU / n)) % n) + n) % n;

  function draw(g, x, y, L, st) {
    if (!on) return false;
    const M = model(L);
    if (!M) return false;
    const m = g.getTransform(), k = Math.hypot(m.a, m.b), want = st.h * k;
    if (!(want > 6)) return false;
    const e = entry(M, want);
    const an = st.lying ? 'death' : st.atk > 0 ? ((st.cast ?? M.caster) ? 'cast' : 'attack') : st.moving ? 'walk' : 'idle', n = FR[an];
    const f = an === 'death' ? Math.min(n - 1, Math.round(st.lying * (n - 1))) : an === 'attack' || an === 'cast' ? Math.min(n - 1, Math.floor((1 - st.atk) * n))
      : an === 'walk' ? Math.floor(frac(st.walk / st.h) * n) : Math.floor(frac(st.t / 2.4) * n);
    const d = dirOf(st.face ?? (st.fx > 0 ? 0 : Math.PI / 2), M.dirs);
    let fr = e.fr.get(`${an}${d}.${f}`);
    // ganz ohne passendes Bild wird trotz Budget gerendert, damit nie die gezeichnete Ersatzfigur aufblitzt
    if (!fr) fr = (performance.now() < deadline ? null : near(e, M, an, d, f)) || bake(e, M, an, d, f);
    const s = want / e.H, px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha *= (L.ghost || 1) * (st.alpha ?? 1);
    if (L.glow) glowDot(g, px, py - want * 0.5, want * 0.55, L.glow);
    if (fr.w) {
      const dx = Math.round(px - fr.ox * s), dy = Math.round(py - fr.oy * s), dw = Math.round(fr.w * s), dh = Math.round(fr.h * s);
      // Trefferblitz vor Leiche vor Färbung, wie bisher; Leichen-Abdunklung in Viertelstufen, damit die Kopien wiederverwendbar sind
      const flt = st.flash ? 'brightness(2.4) saturate(.5)' : st.lying ? `brightness(${1 - 0.075 * Math.round(st.lying * 4)})` : st.tint;
      const [src, sx, sy] = flt ? tinted(e, fr, flt) : [e.pages[fr.pg].c, fr.x, fr.y];
      g.drawImage(src, sx, sy, fr.w, fr.h, dx, dy, dw, dh);
    }
    for (const [gx, gy, r, c] of fr.glow) glowDot(g, px + gx * s, py + gy * s, r * s, c);
    g.restore();
    return true;
  }

  return {
    draw,
    // zu Beginn jedes Spielbilds: Zeitbudget fürs Rendern neu setzen, übrige Zeit für vorbestellte Bilder nutzen
    tick(ms = 5) {
      frameNo++;
      deadline = performance.now() + ms;
      while (queue.length && performance.now() < deadline - ms / 2) {
        const [L, want, an, d, f] = queue.shift(), M = model(L);
        if (!M) continue;
        const e = entry(M, want);
        if (!e.fr.has(`${an}${d}.${f}`)) bake(e, M, an, d, f);
      }
    },
    // Bilder einer Gestalt vorbestellen, etwa für die Gegner der nächsten Runde
    warm(L, want, anims = ['walk', 'idle']) {
      const M = on && model(L);
      if (!M) return;
      for (const an of anims) for (let d = 0; d < M.dirs; d++) for (let f = 0; f < FR[an]; f++) queue.push([L, want, an, d, f]);
    },
    get on() { return on; },
    get stats() { return { ...stats, pagePx }; },
    get pending() { return queue.length; },
    // Eigenverschattung an/aus: Materialien neu übersetzen und alle Figurenbilder neu rendern lassen
    shadows(v) {
      v = !!v;
      if (R.shadowMap.enabled === v) return;
      R.shadowMap.enabled = keyL.castShadow = v;
      for (const m of mats.values()) m.needsUpdate = true;
      ents.clear(); pagePx = 0;
    },
    toggle() { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* privater Modus */ } },
  };
})();
