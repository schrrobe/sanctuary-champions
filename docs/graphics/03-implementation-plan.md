# 03 · Umsetzungsplan

Grundlage: `01-rendering-audit.md` und `02-performance-baseline.md`. **Bestätigt** heißt gemessen oder im Code nachgewiesen, **Annahme** heißt zu prüfen. Gameplay, Steuerung, Kamera, Balance und Spielstände bleiben unverändert. Jede Änderung ist reine Darstellung.

Allgemeine Prüfung nach jedem Schritt: Syntaxprüfung aller Dateien, Fähigkeiten-Durchlauf (alle 292 Fähigkeiten, Logik in Node und Zeichnen im Browser), Grafik-Messung, Standbilder. Am Ende: vollständige Balance-Prüfung, die **identisch** zur Ausgangslage sein muss.

## P0 · hohe Wirkung, geringes Risiko

### P0-1 Färbungen ohne Filter je Bild

- **Problem (bestätigt):** Kälte-, Gift-, Frost-, Leichen- und Trefferfärbung laufen je Zeichenaufruf über `ctx.filter`. In der dichten Szene sind es 48–52 Filterdurchgänge je Bild. Zusammen mit dem Bake führt das zu Einbrüchen auf 46,7 FPS (A/B gemessen).
- **Lösung:** In `SPR.draw` jedes gefärbte Figurenbild **einmal** erzeugen und zwischenspeichern, mit begrenztem Speicher und Entfernen der zuletzt ungenutzten. Der Trefferblitz entsteht als additives Zweitbild ohne Filter. Leichen-Abdunklung wird in Stufen zwischengespeichert. *(Umgesetzt mit Abweichungen: Kopien auf den Atlasseiten der Gestalt, Trefferblitz als Kopie mit dem alten Filter, siehe 04.)*
- **Dateien:** `models.js`.
- **Bild:** identisch, der Blitz minimal anders (heller statt entsättigt).
- **Leistung:** Filterdurchgänge je Bild → nahe 0. Einmalige Kosten beim ersten Auftreten einer Färbung.
- **Risiken:** Speicherbedarf der Kopien, daher mit eigener Obergrenze. Leichte Abweichung beim Trefferblitz.
- **Prüfung:** `filteredDraws` in der Messung, Rundenstart-Messung, Standbild der dichten Szene.
- **Rückweg:** Die alte Filterzeile ist eine Bedingung. Abschaltbar, indem der Cache leer bleibt.

### P0-2 Lichtfläche in Renderauflösung

- **Problem (bestätigt):** Die Lichtfläche hat das 2,9-Fache der Pixel der Renderfläche. Der GPU-Nutzen der Verkleinerung ist eine Annahme, weil er nicht direkt messbar ist.
- **Lösung:** Die Lichtfläche bekommt die Auflösung der Renderfläche mal Faktor (Grafikstufe: 0,5 bis 1). Gezeichnet wird über eine Grundskalierung, die Lampenkoordinaten bleiben gleich.
- **Dateien:** `game.js` (`resize`, Lichtteil in `draw`).
- **Bild:** Licht ist weich, daher kein sichtbarer Unterschied bei Faktor 1. Bei 0,5 minimal weicher.
- **Leistung:** 2,9× weniger Lichtpixel bei Faktor 1, 11,6× weniger bei 0,5.
- **Risiken:** Versatz zwischen Licht und Bild bei falscher Skalierung. Prüfung per Standbild.
- **Rückweg:** Faktor auf Überauflösung zurücksetzen.

## P1 · hohe Wirkung, mittleres Risiko

### P1-1 Eigenverschattung der Figuren im Bake

- **Problem (bestätigt):** Ohne Schattenkarte gibt es keinen Arm- oder Umhangschatten auf dem Körper, die Figuren wirken flach.
- **Lösung:** Schattenkarte für das Hauptlicht im three.js-Bake (PCF weich, enger Schattenbereich um die Figur, Bias gegen Schattenakne). Alle Körperteile werfen und empfangen Schatten, Leuchtteile nicht.
- **Dateien:** `models.js`.
- **Bild:** mehr Tiefe und Form, gleicher Stil und gleiche Farben.
- **Leistung (Annahme):** Bake je Bild etwa +50 %. Kosten fallen nur beim Bake an, nicht je Spielbild. *(Gemessen: im Median +17 %, siehe 05.)*
- **Risiken:** Schattenakne bei falschem Bias, längere Bake-Zeit beim Rundenstart. Prüfung mit einer Heldenreihe vorher und nachher.
- **Rückweg:** über Grafikstufe abschaltbar (Niedrig und Mittel ohne). Beim Umschalten wird der Bildspeicher geleert.

### P1-2 Bloom und Farbkorrektur

- **Problem (bestätigt):** Keine Nachbearbeitung. Feuer, Lava und Zauber strahlen nicht.
- **Lösung:** Bloom in Canvas 2D. Das fertige Bild (vor Beschriftungen) auf Viertelauflösung mit weicher Helligkeitsschwelle und Weichzeichner (ein Filterdurchgang auf kleiner Fläche), dann additiv zurück. Auf Ultra zusätzlich eine breitere Stufe. Dazu eine dezente Farbkorrektur (Kontrast und Sättigung) als CSS-Filter auf dem Canvas-Element, berechnet vom Compositor. Filterunterstützung wird vorab geprüft, ohne Unterstützung bleibt Bloom aus.
- **Dateien:** `game.js`.
- **Bild:** Glut, Feuer und Zauber leuchten über. Gewöhnliche Flächen bleiben unverändert, weil die Schwelle nur hohe Helligkeiten durchlässt.
- **Leistung (Annahme):** 2 zusätzliche Zeichenaufrufe je Bild, davon einer gefiltert auf 1/16 der Fläche.
- **Risiken:** Überstrahlen und milchiges Bild. Gegenmittel sind eine Schwelle, die mittlere Helligkeit ausschließt, und eine niedrige Stärke.
- **Rückweg:** Grafikstufe Niedrig ohne Bloom.

### P1-3 Tonwert-Abbildung prüfen

- **Problem (Annahme):** Ohne Tone Mapping könnten helle Metallflächen ausbrennen.
- **Lösung:** ACESFilmic gegen den bisherigen Stand vergleichen (r159 bietet weder AgX noch Neutral). Übernommen wird es nur, wenn Farben und Kontrast des D2-Stils erhalten bleiben.
- **Dateien:** `models.js`.

## P2 · gezielte Ergänzungen

### P2-1 Lebendige Umgebung

- **Problem (bestätigt):** Lava ist ein Standbild, die Luft leer, Fenster und Fackeln statisch.
- **Lösung:**
  - wandernde, pulsierende Glutstellen auf sichtbaren Lavafeldern
  - aufsteigende Glutfunken über der Lava
  - flackernde Fenster
  - Fackeln mit der vorhandenen Flammenfunktion
- **Dateien:** `game.js`.
- **Leistung:** einige Dutzend additive Punkte je Bild.
- **Risiken:** Unruhe im Bild. Deshalb dezent und abschaltbar.
- **Rückweg:** Grafikstufe Niedrig ohne.

### P2-2 Partikelbudget

- **Problem (bestätigt):** Partikel haben keine Obergrenze, in der Action-Szene sind es bis 900.
- **Lösung:** Obergrenze je Grafikstufe, beim Zeichnen werden die ältesten verworfen. Partikel sind reine Darstellung.
- **Dateien:** `game.js`.

## P3 · Optimierung und Einstellungen

### P3-1 Grafikstufen

- **Lösung:** Niedrig, Mittel, Hoch und Ultra als zentrale Tabelle in `game.js`. Wählbar im bestehenden Menü, gespeichert wie die übrigen Einstellungen in `localStorage`. Umschalten zur Laufzeit. Der Bildspeicher wird nur bei Änderung der Eigenverschattung geleert.
- **Standard:** Hoch, sofern die Messung es trägt.

### P3-2 Scharfes Rendern ohne Pixel-Look

- **Problem (bestätigt):** Ohne Pixel-Look wird `devicePixelRatio` ignoriert, Retina wird unscharf.
- **Lösung:** Renderfläche mit `devicePixelRatio`, begrenzt je Grafikstufe (1 / 1 / 1,5 / 2). Der Pixel-Look bleibt unverändert der Standard. *(Umgesetzt mit 1 / 1 / 1 / 2, weil der Figurenatlas mit dem Quadrat des Faktors wächst, siehe 04.)*
- **Dateien:** `game.js` (`resize`).

## Bewusst nicht umgesetzt

- **EffectComposer, SSAO, SSR, Schattenkarten im Spielbild, Instancing, LOD, GLTF/KTX2:** Es gibt keine 3D-Echtzeitszene, das wäre ein Renderer-Neubau.
- **Hitzeflimmern über der Lava:** Echte Verzerrung ist in Canvas 2D nur mit Pixelzugriff möglich, zu teuer.
- **3-fache Überabtastung im Bake:** mehr Bake-Zeit für kaum sichtbaren Gewinn bei 2-fach plus MSAA.
- **Verdichten des Atlasspeichers:** sinnvoll, aber unabhängig vom Bild. Als offene Aufgabe notiert.
