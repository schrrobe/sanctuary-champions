# Sanctuary & Norrath

Ein Browser-Action-RPG im Geiste von **Diablo II: Lord of Destruction** und **Champions: Return to Arms**.
Kein Build: `index.html` öffnen oder per GitHub Pages spielen. Einzige Fremdbibliothek ist three.js (MIT), beigelegt unter `vendor/`.

## Features

- **Diablo-II-Optik**: isometrische Ansicht mit texturierten Böden und Mauern, Fackeln und dynamischem Licht, Partikeleffekte für Zauber, Blut und Leichen, animierte Figuren, D2-Bedienleiste mit Lebens- und Manakugel, Gürtel, Fähigkeitsbaum, Inventarraster und Automap. Alle Grafiken werden im Code erzeugt, es werden keine Originalgrafiken verwendet.
- **14 Klassen**: die 7 Klassen aus Diablo II: LoD (Amazone, Assassine, Barbar, Druide, Totenbeschwörer, Paladin, Zauberin) und die 7 aus Champions: Return to Arms (Barbaren-Krieger, Erudit-Zauberer, Waldelfen-Waldläufer, Hochelfen-Kleriker, Dunkelelfen-Schattenritter, Vah-Shir-Berserker, Iksar-Schamane)
- **Freier Skill-Baukasten**: Jede Klasse kann jede der 292 Fähigkeiten aus beiden Spielen lernen (alle 30 je Diablo-II-Klasse), ohne Stufensperre. Zum Start gibt es 30 Punkte, jeder Aufstieg bringt einen weiteren. Rechtsklick gibt einen Punkt zurück. Fähigkeiten der eigenen Klasse wirken 25 % stärker.
- **Arena im Chaos-Sanktuarium**: Gegner kommen rundenweise aus den vier Armen der Halle, jede Runde wird schwerer, alle 5 Runden ein Boss (Andariel, Duriel, Mephisto, Innoruuk, Diablo, Baal). Champions und einzigartige Monster werden mit den Runden häufiger. Wer fällt, beginnt die Runde von vorn.
- **Händler zwischen den Runden**: Ausrüstung und Tränke kaufen, kostenlos heilen, Urnen zerschlagen, Belohnungstruhe öffnen, jede dritte Runde ein Erneuerungsschrein
- **Siegel und Wächter**: Fünf Siegel auf dem Pentagramm. In Runde 5, 10 und 15 jedes 20er-Zyklus erscheinen der Großwesir des Chaos, Lord De Seis und der Seelenverseucher und brechen die Siegel, in Runde 20 kommt Diablo. Ab dem zweiten Zyklus bringt jeder Wächter einen weiteren Boss mit. Rundenzähler mit verbleibenden Gegnern und Rekord (höchste geschaffte Runde)
- **Händler**: Ausrüstung mit Vergleich zur angelegten, Glücksspiel, neues Angebot gegen Gold
- **Ton**: Geräusche und Musik werden per Web Audio erzeugt, abschaltbar im Menü
- **Pixel-Look**: Die Spielfläche wird in etwa 600 Bildpunkten Höhe gezeichnet (wie 800×600 im Original) und grob hochskaliert, abschaltbar im Menü. Der Bildausschnitt richtet sich nach der Fensterhöhe, sodass Figuren wie in D2 etwa ein Achtel der Bildhöhe einnehmen
- **Vorgerenderte 3D-Figuren wie in D2**: Helden und Monster sind aus 3D-Körpern gebaut (three.js) und werden unter festem Licht in 8 Richtungen gerendert, die Helden in 16. Animationen: Stehen, Gehen, Schlagen, Zaubern, Sterben. Jedes Bild entsteht beim ersten Gebrauch und wird zwischengespeichert. Die Völker aus Champions haben eigene Körper (Vah Shir mit Katzenbeinen und Schwanz, Iksar als Echsen, große Erudit, schlanke Elfen). Abschaltbar im Menü; ohne WebGL erscheinen die gezeichneten Figuren
- **Grafik im Stil von D2**: Charakterauswahl am Lagerfeuer, Bedienleiste mit Steinfassungen sowie Engel- und Dämonenstatue
- **Zaubereffekte wie im Original**: Einschläge je Element (Feuerexplosion, zerspringendes Eis, Funken, Giftwolke), Novas als Ring aus Eiskristallen, Gift, Flammen oder Blitzen, gezackte flackernde Blitze, Meteor im Schrägflug mit brennendem Boden, fallende Eissplitter bei Blizzard, Feuerregen, Lichtsäulen beim Teleport, Zauberleuchten in der Elementfarbe. Gegner färben sich wie in D2: blau bei Kälte, grün bei Gift, eisblau und starr, wenn sie eingefroren sind. Die Fähigkeiten aus Champions haben eigene Effekte: Feuer- und Frostkegel des Erudit als Flammenwand bzw. Frostwelle, Feuer- und Froststurm, Tagars Insekten, Ebenenwind, Seuchenbolzen und Lebensentzug, Wurzeln und Verstricken, Heiliges Licht, Heilung als Lichtsäule, Schlachtruf mit Schockwellen, Elementwaffen leuchten in der Hand, Stärkungen wie Fester Stand, Segen, Regeneration oder Seuchenschild lassen Lichtpunkte in ihrer Farbe um den Helden aufsteigen
- **Typische Mechaniken**: Geladener Blitz zuckt unstet, Blitzfurie zerspringt am Ziel in Blitze auf die Gegner ringsum, Giftwurfspeer hinterlässt Giftwolken, Faust der Himmel setzt Heilige Blitze frei, Gefrierpfeil friert ein, Sprungangriff fliegt im Bogen, Feuersturm und Glühender Felsbrocken hinterlassen Flammen, Skelette und Golems erheben sich aus dem Boden (Skelette des Totenbeschwörers aus Leichen in Zielnähe)
- **Alle Fähigkeiten der D2-Klassen**: wie in D2 wirkt immer nur eine Paladin-Aura zugleich (Aura-Siegel am Boden in ihrer Farbe), Flüche zeigen ihr Zeichen über dem Kopf des Gegners (Schaden verstärken, Schwächen, Eiserne Jungfrau, Verwirren, Anziehen, Widerstand senken …), Verwirrte greifen einander an. Die Assassine lädt Kampfkünste auf (Ladungskugeln kreisen um sie, der dritte Treffer entlädt Feuer, Blitz, Eis, Lebensraub oder Phönix), der Druide verwandelt sich in Werwolf oder Werbär, Ranken verzehren Leichen, Feuerwand und Knochenwand stehen quer zur Blickrichtung, Knochengefängnis umschließt das Ziel mit Dornen, Wiederbeleben holt Gegner als Diener zurück, Gewittersturm und Armageddon schlagen aus dem Himmel ein, Klingenwächter pendelt zwischen Assassine und Ziel
- **Ebenenwind des Iksar-Schamanen** nach Originalaufnahmen: eine große, wogende weiß-lila Windwolke mit Sichelböen wie auf dem Originalsymbol, die vor dem Schamanen anschwillt und Gegner zurückstößt
- Beute in vier Seltenheitsstufen, Ausrüstung, Tränke, Gold, Attributpunkte, Spielstand im Browser

## Steuerung (wie in Diablo II)

| Eingabe | Aktion |
|---|---|
| Linksklick | Laufen bzw. Gegner mit der linken Fähigkeit angreifen, Gegenstände aufheben |
| Umschalt + Linksklick | Angreifen ohne zu laufen |
| Rechtsklick | Rechte Fähigkeit |
| Klick auf die Felder neben den Kugeln | Linke/rechte Fähigkeit wählen |
| F1–F8 / Mausrad | Rechte Fähigkeit wechseln (Maus über Fähigkeit + F-Taste: belegen) |
| 1–4 (oder Q/E) | Tränke aus dem Gürtel |
| C · I · T | Charakter · Inventar · Fähigkeiten |
| H · N | Händler · nächste Runde starten (in der Pause) |
| Tab | Automap |
| WASD | Alternativ laufen |
| Esc | Menü / Fenster schließen |

## Lokal starten

```sh
python3 -m http.server 8000   # dann http://localhost:8000
```

## Dateien

- `data.js`: Klassen, Fähigkeiten, Monster, Beschwörungen, Gegenstände (zum Erweitern hier Einträge ergänzen)
- `sprites.js`: prozedurale Texturen, gezeichnete Figuren (Ersatz ohne WebGL), Objekte, Symbole, Zaubereffekte
- `models.js`: 3D-Figuren: Körperbau, Köpfe, Waffen, Animationen und der Bildspeicher für die vorgerenderten Ansichten
- `vendor/three.min.js`: three.js r159 (MIT-Lizenz, siehe `vendor/three-LICENSE.txt`)
- `audio.js`: Geräusche und Musik
- `game.js`: Engine (Arena, Runden, Kampf, KI, Darstellung, UI)
- `index.html`: Layout und Stil

## Hinweise

Fan-Projekt ohne Originalgrafiken oder -code. Die Fähigkeitslisten stammen aus öffentlichen Übersichten
(z. B. GameBanshee); die Liste des Hochelfen-Klerikers ist teilweise angenähert. Werte und Wirkungen sind
eigene Umsetzungen, keine Nachbildung der Originalformeln.
Diablo ist eine Marke von Blizzard Entertainment, Champions: Return to Arms von Sony Online Entertainment.
