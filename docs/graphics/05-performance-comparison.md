# 05 · Leistungsvergleich

**Vorher:** Stand aus `02-performance-baseline.md`. **Nachher:** Endstand dieser Runde, gemessen am 20.10.2026.

Gleiches Referenzsystem, gleiche Methode, gleiche Szenen: MacBook Pro mit Apple M5, Chrome 155 headless, ANGLE Metal, `devicePixelRatio` 1, Pixel-Look an mit Renderfläche 1102 × 620. Die Lava-Szene (Amazone auf den Lavafeldern, 12 Gegner, Feuerpfeil alle 0,4 s) kam erst mit der lebendigen Lava dazu und hat deshalb keinen Vorher-Wert.

Alle Werte sind Einzelläufe zu je 8 s, wenn nicht anders angegeben. Bildzeiten in ms, JS als Ø / P95 / P99 in ms.

## Eingeschwungener Zustand, 1280 × 720

| Szene | | Ø FPS | P95 | P99 | max | JS Ø / P95 / P99 | Zeichnen Ø |
|---|---|---|---|---|---|---|---|
| typisch | vorher | 60,0 | 16,8 | 16,8 | 16,8 | 2,01 / 3,4 / 4,0 | 1,82 |
| | **nachher (Hoch)** | **60,0** | 16,7 | 16,8 | 16,8 | 1,71 / 2,5 / 2,9 | 1,58 |
| dicht | vorher | 59,63 | 16,7 | 16,8 | **50,0** | 2,27 / 2,9 / 3,2 | 1,87 |
| | **nachher (Hoch)** | **60,0** | 16,8 | 16,8 | **16,8** | 2,66 / 3,6 / 3,9 | 2,15 |
| action | vorher | 60,0 | 16,7 | 16,8 | 16,8 | 1,70 / 2,2 / 2,4 | 1,43 |
| | **nachher (Hoch)** | **60,0** | 16,7 | 16,8 | 16,8 | 1,99 / 2,6 / 2,9 | 1,70 |
| lava | **nachher (Hoch)** | **60,0** | 16,8 | 16,8 | 16,8 | 1,74 / 2,6 / 3,4 | 1,56 |

Kontrollläufe der dichten Szene am Schluss, Endstand, Hoch:

| Lauf | Ø FPS | P95 | P99 | max | JS Ø / P95 / P99 |
|---|---|---|---|---|---|
| 1 | 60,0 | 16,7 | 16,8 | 16,8 | 2,34 / 3,2 / 3,5 |
| 2 | 60,0 | 16,8 | 16,8 | 16,8 | 2,37 / 3,2 / 3,7 |

## Eingeschwungener Zustand, 1920 × 1080

Die Renderfläche ist wegen des Pixel-Looks gleich groß.

| Szene | | Ø FPS | P95 | P99 | max | JS Ø / P95 / P99 |
|---|---|---|---|---|---|---|
| typisch | vorher | 60,0 | 16,8 | 16,8 | 16,8 | 1,63 / 2,4 / 3,2 |
| | **nachher (Hoch)** | **60,0** | 16,8 | 16,8 | 16,8 | 1,61 / 2,4 / 2,7 |
| dicht | vorher | 59,25 | 16,8 | 16,8 | **83,3** | 2,46 / 3,3 / 4,5 |
| | **nachher (Hoch)** | **60,0** | 16,8 | 16,8 | **16,8** | 2,54 / 3,5 / 4,1 |
| action | vorher | 60,0 | 16,7 | 16,8 | 16,8 | 1,77 / 2,3 / 2,6 |
| | **nachher (Hoch)** | **60,0** | 16,8 | 16,8 | 16,8 | 1,99 / 2,6 / 2,9 |
| lava | **nachher (Hoch)** | **60,0** | 16,7 | 16,8 | 16,8 | 1,48 / 2,1 / 2,4 |

## Rundenstart: Bake läuft während der Messung

Szene „dicht“, 1280 × 720, nur 3 s Aufwärmen (`&kalt`).

| | Ø FPS | Ø ms | P95 | P99 | max | JS Ø / P95 / P99 | Bake Ø je Spielbild | Bilder in 8 s gebacken |
|---|---|---|---|---|---|---|---|---|
| vorher | 46,71 | 21,41 | 33,4 | 50,0 | 66,8 | 3,37 / 5,8 / 6,2 | 1,01 | 3.194 |
| **nachher (Hoch, mit Eigenverschattung)** | **59,88** | 16,70 | **16,8** | **16,8** | 33,2 | 3,80 / 6,5 / 7,5 | 1,13 | 3.029 |

Die JS-Zeit steigt um 0,4 ms, davon 0,12 ms durch den teureren Bake mit Schatten (Bake Ø 1,01 → 1,13 ms je Spielbild). Die Einbrüche verschwinden trotzdem, denn ihre Ursache waren die Filter beim Rastern und nicht die JS-Zeit (A/B in 02). Ein Bild mit 33,2 ms bleibt.

## Grafikstufen im Endstand, 1280 × 720

| Stufe | Szene | Ø FPS | P95 | P99 | max | JS Ø / P95 / P99 | Lichtfläche |
|---|---|---|---|---|---|---|---|
| Niedrig | typisch | 60,0 | 16,7 | 16,8 | 16,8 | 2,12 / 3,3 / 3,8 | 552 × 310 |
| | dicht | 59,88 | 16,7 | 16,8 | 33,3 | 2,45 / 3,4 / 4,2 | |
| | action | 60,0 | 16,8 | 16,8 | 16,8 | 1,84 / 2,7 / 3,1 | |
| | lava | 60,0 | 16,7 | 16,8 | 16,8 | 2,05 / 2,8 / 3,2 | |
| Mittel | typisch | 60,0 | 16,8 | 16,8 | 16,8 | 1,78 / 2,7 / 3,2 | 827 × 465 |
| | dicht | 60,0 | 16,7 | 16,8 | 16,8 | 2,67 / 3,6 / 4,0 | |
| | action | 60,0 | 16,7 | 16,8 | 16,8 | 2,05 / 2,7 / 3,0 | |
| | lava | 60,0 | 16,8 | 16,8 | 16,8 | 2,10 / 3,0 / 3,5 | |
| Hoch | siehe oben | 60,0 | ≤ 16,8 | 16,8 | 16,8 | 1,71–2,66 Ø | 1103 × 620 |
| Ultra | typisch | 60,0 | 16,7 | 16,8 | 16,8 | 1,55 / 2,3 / 3,0 | 1103 × 620 |
| | dicht | 60,0 | 16,7 | 16,8 | 16,8 | 2,52 / 3,4 / 3,8 | |
| | action | 60,0 | 16,7 | 16,8 | 16,8 | 1,97 / 2,6 / 2,9 | |
| | lava | 60,0 | 16,7 | 16,8 | 16,8 | 1,67 / 2,3 / 2,6 | |

Ultra ohne Pixel-Look mit `devicePixelRatio` 2, Szene action:

- Renderfläche 2560 × 1440, Lichtfläche 2561 × 1440
- 60,0 FPS, P95 16,8 ms, P99 16,8 ms, max 16,8 ms
- JS Ø 2,96 / 3,8 / 4,3 ms
- Atlas 475,5 Mio. Bildpunkte, siehe Speicher

Mittel und Ultra wurden je zweimal gemessen. Im ersten Durchgang liefen beide Messungen versehentlich gleichzeitig und behinderten sich gegenseitig: dicht hatte max 33,3 bzw. 66,7 ms. Die Tabelle zeigt die getrennt wiederholten Läufe.

## Zeichenaufwand je Bild

| Szene | Gefilterte Zeichnungen vorher → nachher | Färbungskopien seit Szenenstart | Partikel (Budget Hoch 1.200) |
|---|---|---|---|
| typisch | 24 → **0** | 270 | 170 |
| dicht | 48 → **3** (Gloams, 2D-Figur) | 1.727 | 297 |
| action | 24 → **0** | 344 | 900 |
| lava | – → 0 | 214 | 192 |

Weitere Werte:

- **Radialverläufe** in der dichten Szene: 217 vorher, 223–232 nachher (Kontrollläufe des Endstands).
- **Bloom** kostet 2 zusätzliche Zeichenaufrufe je Bild (Ultra: 4), davon 1 bzw. 2 gefiltert auf kleiner Fläche.

## Bloom-Kosten

| Szene action, Hoch | JS Ø / P95 / P99 |
|---|---|
| mit Bloom (Endstand) | 1,99 / 2,6 / 2,9 |
| Bloom aus (`&set=bloom:0`, Endstand) | 2,23 / 3,0 / 3,6 |

Ohne Bloom ist es nicht schneller. Die Bloom-Kosten liegen damit unter der Streuung zwischen Läufen, die bei etwa ±0,3 ms JS liegt. Der GPU-Anteil ist nicht messbar.

## Figuren-Bake und Speicher

| | vorher | nachher |
|---|---|---|
| Bake je Bild (Median über Szenenläufe) | 0,62 / 0,89 / 0,64 ms (typisch / dicht / action, Einzelläufe) | 0,58 ms ohne, 0,68 ms mit Eigenverschattung (Spanne 0,48–1,11) |
| Draw Calls je gebackenem Bild | 41–45 | 41–48 (ohne Schattendurchgang, siehe 04) |
| Atlas typisch / dicht / action | 25,95 / 54,26 / 61,08 Mio. Bildpunkte | 28,84 / 70,52 / 76,55 Mio. Bildpunkte (Hoch) |
| Atlas roh (4 Byte je Bildpunkt, abgeleitet) | 104 / 217 / 244 MB | 115 / 282 / 306 MB |
| Atlas Ultra ohne Pixel-Look, DPR 2, action | – | 475,5 Mio. Bildpunkte (~1,9 GB roh) |
| JS-Heap | 18–31 MB | 18–34 MB |

Der Atlas wächst um 11–30 %, weil die Färbungskopien darin liegen. Das ist der Preis für die wegfallenden Filter. Die vorhandene Obergrenze von 48 Mio. Bildpunkten verwirft nur Gestalten, die 60 Bilder lang nicht gezeichnet wurden. In dichten Szenen wird sie deshalb wie schon vorher überschritten.

## Zielbewertung

- **Ziel 60 FPS:** Im Referenzsystem **gemessen** für alle vier Szenen und alle vier Stufen bei 1280 × 720, auf Hoch auch bei 1920 × 1080: Ø 59,88–60,0 FPS, P99 jeweils 16,8 ms. Vorher verfehlte die dichte Szene das Ziel: im Rundenstart 46,71 FPS, im eingeschwungenen Zustand Ausreißer bis 50 bzw. 83,3 ms.
- **Ziel P95 ≤ 16,67 ms:** Gemessene P95-Werte liegen bei 16,7–16,8 ms.
  - Die Bildabstände sind an den 60-Hz-Takt gebunden und auf 0,1 ms gerundet. 16,7–16,8 ms ist also genau ein Bildtakt mit Taktschwankung, mehr ist mit dieser Methode nicht auflösbar.
  - Streng genommen liegt 16,8 über 16,67. Gemeint ist: kein ausgelassenes Bild im 95. Perzentil.
- **Einzelne Ausreißer** (ein Bild mit 33–50 ms in 8 s) traten nachher noch vereinzelt auf:
  - Niedrig, dicht: 33,3 ms
  - Rundenstart: 33,2 ms
  - zwei Läufe der verworfenen Kleinständerung: 33,4 und 50 ms (04, P0-1 Stand 5)
  - Sie wiederholten sich nicht in Folgeläufen. Ob sie vom Spiel oder vom Testsystem kommen, ist nicht bestimmbar.
- **Nicht belegt** ist das Ziel auf anderer Hardware, in anderen Browsern und im sichtbaren Fenster mit echtem Bildschirmtakt.

## Grenzen der Messung

- Bildabstände sind auf 60 Hz begrenzt, Spielraum über 60 FPS ist nicht messbar. Die JS-Zeit (Ø 1,5–2,7 ms von 16,7 ms) zeigt den CPU-Spielraum.
- GPU-Zeit ist für Canvas 2D nicht messbar. Damit sind die Gewinne bei Lichtfläche, Farbkorrektur und Bloom-Filter **nicht** belegt, nur abgeleitet.
- Headless-Chrome ist reproduzierbar, aber künstlich: Fensterzusammensetzung und echter Bildschirmtakt fehlen.
- Je Konfiguration gab es meist einen Lauf. Unterschiede unter etwa 0,3 ms JS liegen im Rauschen, Beispiel: Niedrig ist in typisch langsamer als Hoch, obwohl es weniger zeichnet.
- Die Systemlast wurde nicht kontrolliert. Bei den Kontrollläufen lag sie bei 2,3 (10 Kerne), daneben lief eine virtuelle Maschine.
