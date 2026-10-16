# Sanctuary & Norrath

Ein Browser-Action-RPG im Geiste von **Diablo II: Lord of Destruction** und **Champions: Return to Arms**.
Kein Build, keine Abhängigkeiten: `index.html` öffnen oder per GitHub Pages spielen.

## Features

- **Diablo-II-Optik**: isometrische Ansicht mit texturierten Böden und Mauern, Fackeln und dynamischem Licht, Partikeleffekte für Zauber, Blut und Leichen, animierte Figuren, D2-Bedienleiste mit Lebens- und Manakugel, Gürtel, Fähigkeitsbaum, Inventarraster und Automap. Alle Grafiken werden im Code erzeugt, es werden keine Originalgrafiken verwendet.
- **14 Klassen**: die 7 Klassen aus Diablo II: LoD (Amazone, Assassine, Barbar, Druide, Totenbeschwörer, Paladin, Zauberin) und die 7 aus Champions: Return to Arms (Barbaren-Krieger, Erudit-Zauberer, Waldelfen-Waldläufer, Hochelfen-Kleriker, Dunkelelfen-Schattenritter, Vah-Shir-Berserker, Iksar-Schamane)
- **Freier Skill-Baukasten**: Jede Klasse kann jede der 177 Fähigkeiten aus beiden Spielen lernen. Fähigkeiten der eigenen Klasse wirken 25 % stärker.
- 12 Gebiete (Blutmoor bis Weltsteinturm), Champions und einzigartige Monster, alle 5 Ebenen ein Boss (Andariel, Duriel, Mephisto, Innoruuk, Diablo, Baal)
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
| Tab | Automap |
| WASD | Alternativ laufen |
| Esc | Menü / Fenster schließen |

## Lokal starten

```sh
python3 -m http.server 8000   # dann http://localhost:8000
```

## Dateien

- `data.js`: Klassen, Fähigkeiten, Monster, Beschwörungen, Gegenstände (zum Erweitern hier Einträge ergänzen)
- `sprites.js`: prozedurale Texturen, Figuren, Symbole
- `game.js`: Engine (Karte, Kampf, KI, Darstellung, UI)
- `index.html`: Layout und Stil

## Hinweise

Fan-Projekt ohne Originalgrafiken oder -code. Die Fähigkeitslisten stammen aus öffentlichen Übersichten
(z. B. GameBanshee); die Liste des Hochelfen-Klerikers ist teilweise angenähert. Werte und Wirkungen sind
eigene Umsetzungen, keine Nachbildung der Originalformeln.
Diablo ist eine Marke von Blizzard Entertainment, Champions: Return to Arms von Sony Online Entertainment.
