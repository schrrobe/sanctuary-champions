# 02 · Leistungs-Ausgangslage

Gemessen am 20.10.2026, vor allen Grafikänderungen dieser Runde. Die einzige Änderung am Spiel war das Messwerkzeug selbst (`bench.js`, Zähler im Figuren-Bake), es verändert das Spielbild nicht.

## Referenzsystem

| | |
|---|---|
| Rechner | MacBook Pro (Mac17,2), Apple M5: 10 CPU-Kerne (4 Leistung, 6 Effizienz), 10 GPU-Kerne, 16 GB |
| System | macOS 26.6.2 |
| Browser | Chrome 155.0.8059.85, **headless** (über rea/Playwright), GPU: „ANGLE (Apple, ANGLE Metal Renderer: Apple M5)“ |
| Ansicht | 1280 × 720 und 1920 × 1080, `devicePixelRatio` 1 |
| Renderfläche | 1102 × 620 (Pixel-Look an, Standard), Lichtfläche 1867 × 1050 |
| Einstellungen | 3D-Figuren an, Ton egal, keine Grafikstufen (gab es noch nicht) |

## Methode

Werkzeug: `index.html?bench` (`bench.js`). Je Szene:

1. Szene mit festem Zufallsstartwert aufbauen. Speichern und Rundenablauf sind abgeschaltet, Spielstand und Einstellungen bleiben unberührt.
2. **Aufwärmen**, bis alle vorbestellten Figurenbilder gerendert sind (mindestens 3 s). Laden und Bake sind damit von der Messung getrennt.
3. **8 s messen:** Abstand der `requestAnimationFrame`-Aufrufe (= Bildzeit) und JS-Zeit je Bild (Simulation + Zeichnen + Bedienleiste + Figuren-Bake).
4. **60 weitere Bilder** mit gezählten Canvas-Operationen. Das Zählen kostet selbst Zeit und läuft deshalb getrennt.

Szenen (alle in der Arena „Chaos-Sanktuarium“, Held unverwundbar):

| Szene | Inhalt |
|---|---|
| typisch | Zauberin, 12 frühe Gegner (sterben und werden ersetzt), Feuerblitz alle 0,45 s |
| dicht | Totenbeschwörer, 60 Gegner aller Arten, Skelette und Lehmgolems, Aura Heiliger Frost (färbt alle Gegner blau), Knochenspeer |
| action | Zauberin, 30 Gegner, alle 0,18 s reihum Blizzard, Meteor, Frostkugel, Frost-Nova, Kettenblitz, Feuerball, Statikfeld, Feuerwand |

## Ergebnisse: eingeschwungener Zustand

1280 × 720:

| Szene | Ø FPS | Ø ms | P95 ms | P99 ms | max ms | JS Ø | JS P95 | JS P99 | Zeichnen Ø |
|---|---|---|---|---|---|---|---|---|---|
| typisch | 60,0 | 16,67 | 16,8 | 16,8 | 16,8 | 2,01 | 3,4 | 4,0 | 1,82 |
| dicht | 59,63 | 16,77 | 16,7 | 16,8 | **50,0** | 2,27 | 2,9 | 3,2 | 1,87 |
| action | 60,0 | 16,67 | 16,7 | 16,8 | 16,8 | 1,70 | 2,2 | 2,4 | 1,43 |

1920 × 1080 (gleiche Renderfläche wegen Pixel-Look):

| Szene | Ø FPS | Ø ms | P95 ms | P99 ms | max ms | JS Ø | JS P95 | JS P99 |
|---|---|---|---|---|---|---|---|---|
| typisch | 60,0 | 16,67 | 16,8 | 16,8 | 16,8 | 1,63 | 2,4 | 3,2 |
| dicht | 59,25 | 16,88 | 16,8 | 16,8 | **83,3** | 2,46 | 3,3 | 4,5 |
| action | 60,0 | 16,67 | 16,7 | 16,8 | 16,8 | 1,77 | 2,3 | 2,6 |

Zeichenaufwand je Bild (1280 × 720):

| Szene | fillRect | fill | stroke | drawImage | davon mit Filter | Radialverläufe | Linearverläufe | Partikel |
|---|---|---|---|---|---|---|---|---|
| typisch | 615 | 165 | 21 | 43 | 24 | 85 | 142 | 151 |
| dicht | 959 | 430 | 141 | 81 | 48 | 217 | 141 | 403 |
| action | 1.385 | 474 | 36 | 35 | 24 | 201 | 139 | 900 |

Figuren-Bake (three.js) und Speicher:

| Szene | gebackene Bilder | ms je Bild | Draw Calls je Bild | Dreiecke je Bild | Atlas (Mio. Bildpunkte) | JS-Heap |
|---|---|---|---|---|---|---|
| typisch | 2.310 | 0,62 | 41 | 9.296 | 25,95 | 20,3 MB |
| dicht | 4.160 | 0,89 | 45 | 9.801 | 54,26 | 22,4 MB |
| action | 960 | 0,64 | 41 | 9.547 | 61,08 | 26,3 MB |

## Ergebnisse: Rundenstart (Bake läuft noch)

Mit nur 3 s festem Aufwärmen backt das Spiel während der Messung weiter, so wie beim echten Rundenstart mit neuen Gegnern. 1280 × 720, Szene „dicht“:

| Variante | Ø FPS | Ø ms | P95 ms | P99 ms | max ms | JS Ø | Bake Ø | Bilder in 8 s gebacken |
|---|---|---|---|---|---|---|---|---|
| mit Färbungsfiltern | **46,71** | 21,41 | **33,4** | **50,0** | 66,8 | 3,37 | 1,01 | 3.194 |
| ohne Filter (`&notint`) | 60,0 | 16,67 | 16,7 | 16,8 | 16,8 | 2,88 | 0,67 | 2.631 |

Eine frühere Messung derselben Szene mit allen drei Szenen hintereinander ergab 54,49 FPS, P95 33,3 ms und max 66,7 ms.

## Auswertung

- **Ziel 60 FPS:** In typischen und actionreichen Szenen erreicht, P99 16,8 ms. In der dichten Szene **nicht** durchgehend: Es gibt Ausreißer bis 50 bzw. 83 ms, und beim Rundenstart fällt die Bildrate auf 46,7 FPS mit P95 33,4 ms.
- **Ursache der Einbrüche:** Die Färbungsfilter (48–52 je Bild) sind in Kombination mit dem Figuren-Bake belegt (A/B-Vergleich). Die JS-Zeit liegt dabei nur bei 3–6 ms, der Engpass liegt also beim Rastern bzw. der GPU.
- **Spielraum:** JS braucht im Mittel 1,6–2,5 ms von 16,7 ms. Für zusätzliche Grafik ist auf der CPU viel Luft, auf der GPU ist der Spielraum nur indirekt bestimmbar.

## Grenzen

- Die Bildabstände sind auf 60 Hz begrenzt. Spielraum oberhalb von 60 FPS ist damit nicht messbar.
- Die GPU-Zeit ist für Canvas 2D nicht messbar, siehe Audit.
- Headless-Chrome ist eine reproduzierbare, aber künstliche Umgebung. Fensterzusammensetzung und echte Bildschirmtakte fehlen.
- Je Konfiguration gab es eine Messung zu je 8 s. Die Ausreißer (max) streuen zwischen den Läufen.
- Vorher-Bilder: `bilder/vorher-typisch.jpg`, `bilder/vorher-dicht.jpg`, `bilder/vorher-action.jpg` (Standbild nach 3 s mit festem Takt, `index.html?bench&scene=…&shot=3`).
