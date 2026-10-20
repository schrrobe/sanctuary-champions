# 01 · Rendering-Audit

Stand: 20.10.2026, vor allen Grafikänderungen dieser Runde. Alle Angaben beruhen auf dem Quelltext und auf eigenen Messungen (siehe `02-performance-baseline.md`).

## Kurzfassung

Sanctuary & Norrath ist **kein klassisches three.js-Spiel**. Das Spielbild entsteht vollständig mit **Canvas 2D** in isometrischer Projektion. three.js (r159, WebGLRenderer) läuft **unsichtbar daneben** und rendert nur die 3D-Figuren einmalig in Bildatlanten („vorgerenderte Sprites“ wie in Diablo II). Daraus folgt:

- Eine Post-Processing-Kette mit `EffectComposer`, SSAO, Schattenkarten im Spielbild, GLTF/KTX2 oder Instancing gibt es nicht und ist für dieses Spiel auch nicht der passende Weg. Ein Wechsel auf ein WebGL-Spielbild wäre ein Neubau des Renderers und wurde bewusst nicht vorgenommen.
- Verbesserungen setzen an zwei Stellen an: am **Figuren-Bake** (three.js: Licht, Schatten, Material) und an der **2D-Bildkette** (Licht, Nachbearbeitung, Umgebung, Effekte).
- Einen Build, Paketmanager, Linter oder Typprüfung gibt es nicht. Prüfwerkzeuge sind die Balance-Prüfung (`node balance.js`, deterministisch) und ab jetzt die Grafik-Messung (`index.html?bench`).

## Architektur

| Teil | Datei | Aufgabe |
|---|---|---|
| Hauptbild | `game.js` (`draw()`, `drawEnt()`, `drawWall()`, `bakeFloor()`, `bakeLava()`) | Canvas 2D, isometrisch, Kamera folgt dem Helden |
| Figuren-Bake | `models.js` (`SPR`) | three.js r159, 1024² WebGL-Fläche außerhalb des Dokuments, rendert Figuren in Atlasseiten (2D-Canvas) |
| Ersatzfiguren | `sprites.js` (`drawFigure`) | gezeichnete Vektorfiguren, nur ohne WebGL oder bei abgeschalteten 3D-Figuren |
| Texturen, Effekte | `sprites.js` (`genTextures`, `drawProjVis`, `drawFx`, `glowDot`, `flame`, `zap`) | prozedural erzeugte Texturen und Zaubereffekte |
| Bedienleiste | `index.html` (DOM + CSS) | Kugeln, Fähigkeitsfelder, Gürtel als HTML über dem Canvas |

### Ablauf je Bild (`frame()` in `game.js`)

1. `SPR.tick(5)`: bis zu 5 ms für vorbestellte Figurenbilder (Bake).
2. `update(dt)`: Simulation (Bewegung, Kampf, Fähigkeiten, Partikelpositionen).
3. `draw()`:
   1. Boden: ein vorab gebackenes 2800 × 2800-Bild (Boden + Lava + Pentagramm) mit Isometrie-Transformation.
   2. Bodeneffekte (`lighter`): Lava-Glut, Flächenzauber, Aurazeichen, Runen, Ringe.
   3. Schatten: zwei Ellipsen je Figur (Schlagschatten weg vom Helden, Fleck unter den Füßen).
   4. Leichen, Beute.
   5. Wände und Figuren nach Tiefe sortiert. Wände kachelweise mit Musterfüllung plus Verlaufsschattierung, Figuren über `SPR.draw` aus dem Atlas.
   6. Geschosse, Partikel, Einschläge, Blitze (überwiegend additiv).
   7. Licht: eigene Lichtfläche `light`. Dunkelheit füllen, Lichter per `destination-out` ausstanzen (Radialverläufe), Lava als selbstleuchtend, Vignette. Danach auf das Bild legen.
   8. Farbiges Licht: additive Glühpunkte für Fackeln, Pentagramm, Lava, Zauber.
   9. Bodenbeschriftungen, Schadenszahlen, Automap.
4. `hud()`: DOM-Aktualisierung der Bedienleiste.

### Auflösung und Skalierung

- `VS` (Weltmaßstab) richtet sich nach der Fensterhöhe. `PX` ist der **Pixel-Look**: Das Bild wird mit etwa 620 Bildpunkten Höhe gerendert und per `image-rendering: pixelated` hochskaliert. Das ist eine bewusste Stilentscheidung (800×600-Gefühl des Originals) und standardmäßig an.
- **Befund:** Ist der Pixel-Look aus, rendert das Canvas in CSS-Pixeln und ignoriert `devicePixelRatio`. Auf Retina-Bildschirmen wird es dann unscharf hochskaliert.
- **Befund:** Die Lichtfläche hat die Größe `innerWidth/VS × innerHeight/VS`, bei 1280×720 also 1867 × 1050 Pixel. Das ist das **2,9-Fache** der tatsächlichen Renderfläche (1102 × 620). Alle Lichtverläufe werden mit dieser Überauflösung gefüllt.

## three.js-Teil (Figuren-Bake)

- three.js **r159** (UMD, `vendor/three.min.js`), **WebGLRenderer** (WebGL 2 über ANGLE/Metal). WebGPU wird nicht genutzt.
- Renderfläche 1024², `antialias: true` (MSAA), zusätzlich 2-fache Überabtastung, wenn die Zelle passt. Bilder werden nach dem Rendern auf 2D-Atlasseiten kopiert.
- Kamera orthografisch unter 30°, passend zur 2:1-Projektion. 8 Richtungen für Monster, 16 für Helden. 5 Animationen mit je 8 Bildern.
- Licht: warmes Hauptlicht (DirectionalLight 2,6), Gegenlicht (1,6), Hemisphärenlicht (0,45), Umgebung über PMREM aus einer prozeduralen Lichtkuppel. **Keine Schatten** (`shadowMap` aus), daher keine Eigenverschattung der Figuren.
- Tonwerte: `NoToneMapping`, laut Code-Kommentar bewusst für satte Farben wie im Original. Ausgabe sRGB (Standard ab r152).
- Materialien: `MeshStandardMaterial` mit prozeduralen Oberflächen (Fell, Schuppen, Kettenglieder, Leder, Gewebe) als Farb- und Reliefkarte (`bumpMap`). Leuchtteile mit `MeshBasicMaterial`. Materialien werden über einen Schlüssel geteilt.
- Gemessen: **41–45 Draw Calls und 9.300–9.800 Dreiecke je gebackenem Bild**, 0,6–1,0 ms je Bild.
- Atlasspeicher: weiche Grenze 48 Mio. Bildpunkte (evict nach längster Nichtnutzung). In der dichten Szene gemessen: 54 Mio. Bildpunkte, etwa 217 MB RGBA. Die Grenze wird überschritten, weil nichts lange genug unbenutzt ist.

## 2D-Bildkette: Befunde

### Licht

- Dunkelheit 0,84 (Chaos-Sanktuarium), Lichtkreis um den Helden, Fackeln, Fensterlicht, selbstleuchtende Lava, Zauberlicht. Das Konzept passt zu D2.
- Jede Lampe ist ein neu erzeugter Radialverlauf je Bild, gemessen 85–217 Radialverläufe je Bild in der ganzen Szene.
- Die Lichtfläche ist überauflöst (siehe oben).

### Materialien und Texturen

- Boden- und Wandtexturen sind prozedurale 2D-Canvas-Texturen (`genTextures`). Der Boden ist vorab gebacken, Wände werden je Kachel mit Muster gefüllt (138–142 lineare Verläufe je Bild nur für die Wandschattierung).
- Figuren: siehe three.js-Teil. Ohne Eigenverschattung wirken sie flach beleuchtet.

### Umgebung und Atmosphäre

- Lava, Mauern mit Spitzbogenfenstern, Turmspitzen, Fackeln. Bewegung gibt es nur durch pulsierende Glühpunkte an Lavarändern und vereinzelte Funken.
- Die Lava selbst ist ein statisches Bild. Kein Glutflug in der Luft, Fenster flackern nicht. Die Fackelflammen sind einfache Ellipsen.

### Nachbearbeitung

- Es gibt **keine** Nachbearbeitung außer einer Vignette in der Lichtfläche. Kein Bloom: Feuer, Lava und Zauber sind additiv hell, strahlen aber nicht über.
- Keine Farbkorrektur. Kantenglättung übernimmt Canvas 2D selbst. Der Pixel-Look ist absichtlich kantig.

### Effekte und Partikel

- Partikel sind Objekte in `G.parts`, gezeichnet als `fillRect`-Quadrate oder Glühpunkte. Es gibt **keine Obergrenze**: In der Action-Szene waren es 900 gleichzeitig mit 1.385 `fillRect` je Bild.
- `glowDot()` erzeugt bei jedem Aufruf einen neuen Radialverlauf.
- **Färbungen bei Kälte, Gift, Einfrieren, Treffern und Leichen** werden je Zeichenaufruf über `ctx.filter` (CSS-Filter) gerendert. Gemessen: 24–52 gefilterte `drawImage` je Bild. Jeder davon braucht einen eigenen Zwischenpuffer auf der GPU.

## Gemessene Engpässe

| Befund | Messung | Bewertung |
|---|---|---|
| Gefilterte Figurenzeichnungen (Färbung) | dichte Szene, Rundenstart: 46,7 FPS, P95 33,4 ms, P99 50 ms; ohne Filter 60 FPS, P99 16,8 ms (A/B mit `&notint`) | **bestätigt**, Hauptursache für Ruckler |
| Figuren-Bake während des Spiels | bis 3.194 Bilder in 8 s gebacken, 1 ms je Spielbild; zusammen mit Filtern Einbrüche auf 30 FPS-Takte | bestätigt, tritt bei Rundenstart und neuen Gegnern auf |
| Überauflöste Lichtfläche | 1867 × 1050 statt 1102 × 620 | bestätigt als Mehraufwand. Der GPU-Anteil ist nicht einzeln messbar, siehe Grenzen |
| Partikel ohne Obergrenze | bis 900 Partikel | bestätigt. Im eingeschwungenen Zustand noch kein Einbruch |
| Atlasspeicher | bis 61 Mio. Bildpunkte (~244 MB) | bestätigt, Grenze wird überschritten |
| Rechenzeit | JS gesamt Ø 1,6–2,5 ms, P99 ≤ 4,5 ms | **kein** Engpass |

## Grenzen der Analyse

- Für Canvas 2D gibt es keine GPU-Zeitmessung (keine Timer-Queries). GPU-Last ist nur indirekt über die Bildabstände (requestAnimationFrame) sichtbar, und die sind auf 60 Hz begrenzt.
- `EXT_disjoint_timer_query` steht in Chrome ohne Flags nicht zur Verfügung. Der Bake wird deshalb über CPU-Zeit und `renderer.info` gemessen.
- Gemessen wurde in Headless-Chrome 155 (ANGLE Metal, Apple M5). Ein echter Bildschirm mit Vsync und Fensterzusammensetzung kann abweichen. Mit `index.html?bench` lässt sich die Messung im eigenen Browser wiederholen.

## Empfehlungen

1. **P0:** Färbungen ohne Filter je Bild: gefärbte Figurenbilder einmal erzeugen und zwischenspeichern, Trefferblitz per additivem Zweitbild.
2. **P0:** Lichtfläche in der Auflösung der Renderfläche statt in Überauflösung.
3. **P1:** Eigenverschattung der Figuren im Bake (Schattenkarte des Hauptlichts). Kostet nur beim Bake, nicht je Bild.
4. **P1:** Leichter Bloom als 2D-Nachbearbeitung auf Viertelauflösung, abschaltbar. Dazu eine dezente Farbkorrektur.
5. **P2:** Lebendigere Umgebung: wandernde Glut auf der Lava, aufsteigende Funken in der Luft, flackernde Fenster, echte Fackelflammen.
6. **P2:** Obergrenze für Partikel je Grafikstufe.
7. **P3:** Grafikstufen Niedrig, Mittel, Hoch und Ultra im bestehenden Menü. Ohne Pixel-Look scharfes Rendern nach `devicePixelRatio`.

## Kompatibilität

- `ctx.filter` (für Bloom und bisherige Färbungen) gibt es in Chrome und Firefox. Safari unterstützt es erst in neueren Versionen. Bloom erkennt daher vorab, ob Filter wirken, und schaltet sich sonst ab.
- Ohne WebGL bleibt der bestehende Ersatz (gezeichnete Figuren) unverändert. Dort wirken weiter die alten Filterfärbungen.
- WebGPU, GLTF, KTX2, Instancing und LOD sind für dieses Spiel nicht anwendbar, weil es keine 3D-Echtzeitszene gibt.
