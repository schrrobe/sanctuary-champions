# 04 · Umsetzungsprotokoll

Umsetzung des Plans aus `03-implementation-plan.md`, in der Reihenfolge der Arbeit. Alle Zahlen sind eigene Messungen mit `index.html?bench` auf dem Referenzsystem aus `02-performance-baseline.md` (1280 × 720, Grafikstufe Hoch, wenn nicht anders angegeben). Der Vergleich vorher/nachher steht gesammelt in `05-performance-comparison.md`.

Ausgangsstand ist der Arbeitsstand mit der zuvor umgesetzten Änderung an Heiliger Frost (Verlangsamung, Einfrieren, Radius in Metern). Sie gehört nicht zur Grafikarbeit und liegt ebenfalls noch unveröffentlicht im Arbeitsbaum.

## 0 · Messwerkzeug

- **Neu:** `bench.js`, eingebunden über eine Zeile in `index.html`, die das Skript nur bei `?bench` nachlädt. Szenen, Ablauf und Optionen stehen im Kopf von `bench.js` und in 02.
- **`models.js`:** Zähler im Figuren-Bake (`SPR.stats`: gebackene Bilder, Zeit, Draw Calls, Dreiecke, Färbungskopien, Atlasgröße) und `SPR.pending` (Länge der Bake-Warteschlange). Der Ersatz ohne WebGL hat dieselben Felder.
- **Wirkung auf das Spiel:** keine. Ohne `?bench` wird `bench.js` nicht geladen. Die Zähler sind Additionen in Pfaden, die ohnehin laufen.

## P0-1 · Färbungen ohne Filter je Bild

**Umgesetzt** in `models.js` (`tinted()`, Zeichenteil von `SPR.draw`).

- Jedes gefärbte Figurenbild (Trefferblitz, Kälte, Gift, Frost, Leiche) entsteht **einmal** als Kopie, mit genau dem Filter, der vorher bei jeder Zeichnung lief. Danach wird nur noch kopiert.
- Die Kopien liegen auf eigenen Atlasseiten der jeweiligen Gestalt, alle Färbungen gemeinsam. Sie fallen zusammen mit den Figurenbildern aus dem Speicher, und die Speicherabrechnung zählt beide.
- Die Rangfolge bleibt wie vorher: Trefferblitz vor Leiche vor Färbung.
- **Abweichung vom Plan:**
  - Der Plan sah den Trefferblitz als additives Zweitbild vor. Umgesetzt ist er als zwischengespeicherte Kopie mit dem alten Filter, damit das Bild **gleich** bleibt.
  - Die Leichen-Abdunklung läuft in fünf Stufen (Helligkeit 1; 0,925; 0,85; 0,775; 0,7) statt stufenlos. Der Endwert 0,7 ist derselbe.

Verlauf:

| Stand | Ergebnis | Entscheidung |
|---|---|---|
| 1. Additiver Blitz über der Färbung | Blitz auf blau gefärbten Gegnern bläulich | verworfen, alte Rangfolge als Kopie |
| 2. Kopien auf eigenen kleinen Canvas mit LRU-Grenze 16 Mio. Bildpunkte | dicht: JS Ø 4,02–4,32 ms statt 2,27 ms. Chrome beschleunigt kleine Canvas nicht per GPU, und die LRU-Grenze verwarf ständig Kopien | verworfen |
| 3. Kopien auf großen Atlasseiten, eine Seitenliste je Färbung | dicht: JS Ø 2,47 ms, Atlas 81,0 Mio. Bildpunkte | Speicher zu hoch |
| 4. Kopien auf großen Atlasseiten, eine gemeinsame Seitenliste je Gestalt | dicht: JS Ø 2,66 ms, Atlas 70,5 Mio. Bildpunkte | **übernommen** |
| 5. Keine Kopie, wenn die Abdunklung auf Stufe 0 fällt (Helligkeit 1) | spart etwa 2 % der Kopien; dicht in zwei Läufen einzelne Ausreißer (33,4 und 50 ms), Stand 4 im A/B-Lauf und im Kontrolllauf ohne Ausreißer | verworfen, Stand 4 bleibt |

Bei Stand 5 lässt sich mit drei Läufen nicht entscheiden, ob die Ausreißer an der Änderung oder am Rauschen lagen. Der Nutzen war zu klein, um das weiter zu untersuchen.

**Wirkung:**

- Gefilterte Zeichnungen im Spielbild: dicht 48 → 3, typisch und action 24 → 0.
- Die übrigen 3 stammen von Gloams: Diese Irrlicht-Gegner haben keine 3D-Figur und werden weiter als 2D-Figur mit Filter gezeichnet.
- Rundenstart dicht: 46,71 → 59,88 FPS, P95 33,4 → 16,8 ms. Gemessen inklusive Eigenverschattung im Bake, siehe 05.

## P0-2 · Lichtfläche in Renderauflösung

**Umgesetzt** in `game.js` (`resize`, Lichtteil von `draw`).

- `LS = VS · PX · GFX.light` ist die Zahl der Lichtpixel je Weltbildpunkt. Die Lichtfläche hat `W · LS × H · LS` Pixel.
- Gezeichnet wird mit der Grundskalierung `lctx.setTransform(LS, 0, 0, LS, 0, 0)`. Alle Lampenkoordinaten bleiben, wie sie waren. Die Lava-Lichtkarte bekommt dieselbe Skalierung in ihre Transformation.
- Zusammengesetzt wird mit `ctx.drawImage(light, 0, 0, W, H)`.

**Wirkung:**

| Grafikstufe | Lichtfläche |
|---|---|
| vorher | 1867 × 1050 |
| Hoch, Ultra | 1103 × 620 (2,9× weniger Pixel) |
| Mittel | 827 × 465 (5,1× weniger) |
| Niedrig | 552 × 310 (11,5× weniger) |

Kein Versatz zwischen Licht und Bild in den Standbildern `bilder/nachher-*.jpg`. Der GPU-Gewinn ist nicht messbar, siehe 05.

## P1-1 · Eigenverschattung der Figuren im Bake

**Umgesetzt** in `models.js`.

- Schattenkarte für das Hauptlicht: `PCFSoftShadowMap`, 1024 × 1024, `bias −0,0006`, `normalBias 0,015`. Die Schattenkamera umfasst ±1,5 Einheiten um die Figur, `near 0,5`, `far 10`.
- Das Hauptlicht zielt jetzt auf die Körpermitte `(0; 0,7; 0)` statt auf den Boden. Die Position wurde um denselben Betrag angehoben (`y 2,6 → 3,3`), damit die **Lichtrichtung gleich** bleibt. So deckt der enge Schattenbereich auch große Gestalten ab.
- Alle Körperteile werfen und empfangen Schatten. Leuchtteile (`MeshBasicMaterial`) tun beides nicht.
- `SPR.shadows(an/aus)` schaltet die Schattenkarte, übersetzt die Materialien neu und leert den Bildspeicher. Danach wird neu gebacken, ähnlich wie beim Rundenstart. Die Grafikstufen rufen es beim Wechsel auf.

**Wirkung:**

- Bild: Arm-, Kopf- und Umhangschatten auf dem Körper, vorher und nachher in `bilder/figuren-eigenverschattung.jpg`. Kein Schattenakne in der Heldenreihe.
- Bake je Bild: im Median 0,58 ms ohne und 0,68 ms mit Eigenverschattung, also +17 %. Gemessen über 8 bzw. 12 Szenenläufe, die Streuung reicht von 0,48 bis 1,11 ms. Die Annahme im Plan (+50 %) war zu hoch.
- Draw Calls und Dreiecke je gebackenem Bild bleiben bei 41–48 bzw. 9.270–10.560. three.js setzt seine Zähler erst nach dem Schattendurchgang zurück, dessen Aufrufe sind deshalb nicht enthalten.

## P1-2 · Bloom und Farbkorrektur

**Umgesetzt** in `game.js` (`FILTER_OK`, `bloom()`, `resize`).

- **Bloom:**
  - Das fertige Spielbild wird vor den Bodenbeschriftungen und der Bedienleiste auf ein Viertel der Kantenlänge verkleinert und gefiltert: `brightness(.7) contrast(5) blur(2px)` in einem Durchgang. Erst ab etwa 57 % Helligkeit kommt etwas durch, voll ab etwa 86 %.
  - Danach wird es mit `lighter` und der Stärke der Grafikstufe zurückgelegt.
  - Ultra hat zusätzlich eine breitere Stufe auf einem Achtel der Kantenlänge (`blur(3px)`, Stärke × 0,6).
- **Filterprüfung:** `FILTER_OK` prüft einmalig, ob `ctx.filter` wirkt. Ohne Wirkung bleibt Bloom aus, sonst würde das ganze Bild aufgehellt.
- **Farbkorrektur:** `contrast(1.06) saturate(1.1)` als CSS-Filter auf dem Canvas-Element. Den berechnet der Compositor, nicht der Zeichencode.
- **Abstimmung:** Mit Stärke 0,5 und `brightness(.8)` war die Bildmitte um den Lichtkreis milchig. Festgelegt wurden Stärke 0,32 auf Hoch und die Schwelle `brightness(.7)`.

**Wirkung:**

- Feuer, Lava, Fackeln und Zauber strahlen über, gewöhnliche Flächen bleiben unverändert (`bilder/nachher-*.jpg`).
- Kosten im Endstand: action JS Ø 1,99 ms mit Bloom und 2,23 ms ohne. Der Unterschied liegt im Rauschen zwischen Läufen, die Bloom-Kosten sind also kleiner als die Streuung.
- Ein früherer Wert (4,0 gegenüber 2,82 ms) stammt aus Stand 2 von P0-1. Dort erzwang das Abgreifen des Spielbilds das Rastern der vielen kleinen Canvas. Für den Endstand ist er nicht gültig.

## P1-3 · Tonwert-Abbildung

**Geprüft, nicht übernommen.**

- `ACESFilmicToneMapping` gegen den bisherigen Stand (`NoToneMapping`) an derselben Heldenreihe verglichen, siehe `bilder/test-aces-nicht-uebernommen.jpg`.
- ACES erhöht Kontrast und Sättigung und wärmt die Hauttöne. Das weicht vom D2-Stil ab.
- Ausgebrannte Metallflächen gab es auch ohne Tone Mapping nicht.

## P2-1 · Lebendige Umgebung

**Umgesetzt** in `game.js`, nur mit `GFX.life` (Mittel, Hoch, Ultra).

- **Lava:**
  - Auf jedem dritten sichtbaren Lavafeld (fest über den Feld-Hash gewählt) wandert eine pulsierende Glutstelle: ±0,35 Felder, Radius 20 ± 10, Farbe `rgba(255,140,30,.2)`.
  - Je sichtbarer Glutstelle und Bild steigt mit 0,8 % Wahrscheinlichkeit ein Glutfunke auf.
- **Fenster:** Die Glut hinter den Fenstern der Mauern flackert über zwei überlagerte Sinuswellen.
- **Fackeln:** Statt einer gelben Ellipse zeigen sie die vorhandene Flammenfunktion `flame()`.
- **Abstimmung:**
  - Die erste Glutfarbe war zu gelb.
  - Die Feldauswahl ging über das Rechteck um die Bildraute und zeichnete etwa 160 unsichtbare Verläufe je Bild. Jetzt prüft sie, ob der Punkt im Bild liegt.
- **Spielablauf:** Die Funken entstehen im Zeichenpfad, der in der Balance-Prüfung nicht läuft. Sie sind reine Partikel ohne Wirkung.

## P2-2 · Partikelbudget

**Umgesetzt** in `game.js`: Beim Zeichnen werden die ältesten Partikel über dem Budget der Grafikstufe verworfen (350 / 700 / 1.200 / 2.000). Auf Hoch und Ultra liegt die Action-Szene mit etwa 900 Partikeln unter dem Budget, das Bild ist also unverändert.

## P3-1 · Grafikstufen

**Umgesetzt** in `game.js`.

- Die Tabelle `GFX_SETS` und das Objekt `GFX` legen alle Stufen fest, Werte in `06-graphics-presets.md`.
- Im Menü gibt es den Knopf „Grafik: Hoch“. Jeder Klick schaltet zur nächsten Stufe.
- Die Wahl wird unter `sanctuary-gfx` in `localStorage` gespeichert. Standard ist **Hoch**.
- Der Wechsel wirkt sofort: Eigenverschattung, Auflösungen und Farbkorrektur werden neu gesetzt.
- Geprüft: Hoch → Ultra → Niedrig, nach dem Neuladen bleibt die Wahl erhalten.

## P3-2 · Scharfes Rendern ohne Pixel-Look

**Umgesetzt** in `game.js` (`resize`): Ohne Pixel-Look gilt `PX = min(devicePixelRatio, GFX.dpr)`.

**Abweichung vom Plan:** Grenzen 1 / 1 / 1 / 2 statt 1 / 1 / 1,5 / 2.

- Gemessen auf Ultra ohne Pixel-Look mit `devicePixelRatio` 2 in der Action-Szene: Renderfläche 2560 × 1440, 60 FPS, P99 16,8 ms, JS Ø 2,96 ms.
- Der Figurenatlas wuchs dabei auf **475,5 Mio. Bildpunkte**. Das sind roh etwa 1,9 GB (4 Byte je Bildpunkt, abgeleitet, nicht gemessen).
- Die Atlasfläche wächst mit dem Quadrat des Faktors. Deshalb nutzt nur Ultra die volle Schärfe, Hoch bleibt bei 1.
- Mit Pixel-Look (Standard) ändert sich nichts.

## Bewusst nicht umgesetzt

Siehe 03. Hinzu kommt der Verzicht auf Stand 5 von P0-1. Offene Möglichkeiten stehen im Abschlussbericht und in 05.

## Prüfungen nach der Umsetzung

- **Syntax:** alle Skripte (`node`-Parser).
- **Balance:** vollständiger Lauf `node balance.js` mit allen 292 Fähigkeiten, vor und nach der Grafikarbeit.
  - Die Tabellen sind **identisch**.
  - Das JSON unterscheidet sich nur im Feld `ms` (Laufzeit).
- **Fähigkeiten in Node:** Logik aller 292 Fähigkeiten, 0 Fehler. Alle Tooltips, 0 Fehler.
- **Zeichnen im Browser:** alle Fähigkeiten in zwei Hälften mit je 2.190 Bildern, 0 Fehler.
- **Messungen:** In allen Messläufen gab es keine Seitenfehler. Die einzige Konsolenmeldung war das fehlende `favicon.ico`.
- **Standbilder:** vorher und nachher je Szene mit festem Takt (`&shot=3`).
