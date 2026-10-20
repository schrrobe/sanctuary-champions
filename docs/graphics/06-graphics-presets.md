# 06 · Grafikstufen

Vier Stufen in `game.js` (`GFX_SETS`), wählbar im Menü über den Knopf **„Grafik: …“**. Jeder Klick schaltet weiter: Niedrig → Mittel → Hoch → Ultra → Niedrig.

- Die Wahl wird im Browser unter `sanctuary-gfx` (`localStorage`) gespeichert. Ohne Speicher, etwa im privaten Modus, gilt die Stufe bis zum Neuladen.
- Standard ist **Hoch**.
- Die Stufen ändern **nur die Darstellung**. Spielablauf, Balance, Kamera, Steuerung und Spielstände sind in allen Stufen gleich. Die Balance-Prüfung ist mit dem Ausgangsstand identisch.

## Übersicht

| Wert | Niedrig | Mittel | Hoch (Standard) | Ultra |
|---|---|---|---|---|
| `light`: Auflösung der Lichtfläche, relativ zur Renderfläche | 0,5 | 0,75 | 1 | 1 |
| `bloom`: Stärke des Überstrahlens (0 = aus) | 0 | 0,22 | 0,32 | 0,36 |
| `wide`: zweite, breitere Bloom-Stufe | – | – | – | ja |
| `grade`: Farbkorrektur (Kontrast 1,06, Sättigung 1,1) | – | ja | ja | ja |
| `shadows`: Eigenverschattung der 3D-Figuren | – | – | ja | ja |
| `life`: lebendige Umgebung | – | ja | ja | ja |
| `parts`: Partikelbudget | 350 | 700 | 1.200 | 2.000 |
| `dpr`: Höchstwert für `devicePixelRatio` ohne Pixel-Look | 1 | 1 | 1 | 2 |

`life` umfasst:

- wandernde, pulsierende Glutstellen auf der Lava
- aufsteigende Glutfunken
- flackernde Fenster
- Fackeln mit Flamme

## Was die Werte kosten

| Wert | Wirkung im Bild | Kosten | Messung (05) |
|---|---|---|---|
| `light` | Weichheit der Lichtkanten. Bei 0,5 minimal weicher | GPU: Pixel der Lichtfläche (Hoch 1103 × 620, Niedrig 552 × 310) | nicht messbar (GPU) |
| `bloom` | Feuer, Lava, Fackeln und Zauber strahlen über | 2 Zeichenaufrufe je Bild, 1 gefiltert auf 1/16 der Fläche | JS-Kosten unter der Streuung |
| `wide` | breiterer, weicherer Schein um sehr helle Stellen | 2 weitere Aufrufe, 1 gefiltert auf 1/64 der Fläche | Ultra gleichauf mit Hoch |
| `grade` | etwas mehr Tiefe und Farbe | vom Compositor berechnet, kein Zeichencode | nicht messbar (GPU) |
| `shadows` | Arm-, Kopf- und Umhangschatten auf den Figuren | nur beim Figuren-Bake: im Median +17 % je Bild | Rundenstart dicht 59,88 FPS |
| `life` | Lava und Gemäuer wirken lebendig | einige Dutzend additive Punkte je Bild auf Lava | lava: JS Ø 1,74 ms (Hoch) |
| `parts` | wie viele Funken und Splitter gleichzeitig sichtbar sind | Zeichenaufwand je Partikel | action: 900 Partikel bei 60 FPS |
| `dpr` | scharfes Bild auf Retina-Bildschirmen | Renderfläche und **Figurenatlas** wachsen mit dem Quadrat des Faktors | Ultra, DPR 2: 60 FPS, Atlas 475,5 Mio. Bildpunkte |

## Zusammenspiel mit den übrigen Einstellungen

- **Pixel-Look (Menü):** Ist er an (Standard), gilt seine feste Renderhöhe von etwa 620 Bildpunkten, und `dpr` hat keine Wirkung. Nur ohne Pixel-Look rendert Ultra mit bis zu doppelter Auflösung.
- **3D-Figuren (Menü):** `shadows` wirkt nur auf die 3D-Figuren. Die gezeichneten Ersatzfiguren ohne WebGL bleiben, wie sie sind.
- **Filterunterstützung:** Bloom braucht `ctx.filter`. Das Spiel prüft beim Start, ob Filter wirken. Ohne Unterstützung, etwa in älteren Safari-Versionen, bleibt Bloom in allen Stufen aus, alles andere funktioniert.
- **Umschalten der Eigenverschattung:** Ein Wechsel, der sie an- oder abschaltet (Mittel → Hoch, Ultra → Niedrig), leert den Bildspeicher der Figuren. Die nächsten Sekunden werden die Figuren neu gerendert, ähnlich wie beim Rundenstart. Andere Wechsel wirken sofort ohne Neuaufbau.

## Empfehlungen

| Rechner | Stufe |
|---|---|
| aktuelle Rechner mit eigener oder Apple-GPU | **Hoch** (Standard) |
| schwächere integrierte Grafik, ältere Laptops, Akkubetrieb | **Mittel**: ohne Schattenbake, kleinere Lichtfläche |
| sehr alte Geräte, ruckelnde Ausgabe | **Niedrig**: ohne Nachbearbeitung, halbe Lichtauflösung, kleines Partikelbudget |
| Retina-Bildschirm, scharfes Bild gewünscht, viel Speicher | **Ultra** mit Pixel-Look aus. Der Figurenatlas braucht dann etwa das Vierfache, gemessen 475,5 Mio. Bildpunkte, roh ~1,9 GB |

Die Messungen in 05 stammen von einem Apple M5. Für schwächere Hardware sind die Empfehlungen abgeleitet, nicht gemessen.

## Messen und Anpassen

- **Messen einer Stufe:** `index.html?bench&gfx=mittel`. Die Wahl gilt nur für die Messung, die gespeicherte Stufe bleibt.
- **Einzelne Werte überschreiben:** `&set=bloom:0,life:0`. Das Ergebnis erscheint als Tabelle im Bild und als Zeile `BENCH {…}` in der Konsole.
- **Stufen ändern oder ergänzen:** Einträge in `GFX_SETS` in `game.js` bearbeiten. Der Menüname steht in `GFX_NM`, die Reihenfolge im Menü folgt der Tabelle.
