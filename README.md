# Sanctuary & Norrath

Ein Browser-Action-RPG im Geiste von **Diablo II: Lord of Destruction** und **Champions: Return to Arms**.
Kein Build, keine Abhängigkeiten: `index.html` öffnen oder per GitHub Pages spielen.

## Features

- **14 Klassen**: die 7 Klassen aus Diablo II: LoD (Amazone, Assassine, Barbar, Druide, Totenbeschwörer, Paladin, Zauberin) und die 7 aus Champions: Return to Arms (Barbaren-Krieger, Erudit-Zauberer, Waldelfen-Waldläufer, Hochelfen-Kleriker, Dunkelelfen-Schattenritter, Vah-Shir-Berserker, Iksar-Schamane)
- **Freier Skill-Baukasten**: Jede Klasse kann jede der 177 Fähigkeiten aus beiden Spielen lernen und auf 8 Tasten legen. Fähigkeiten der eigenen Klasse wirken 25 % stärker.
- Zufallsgenerierte Dungeons, Champions und einzigartige Monster, alle 5 Ebenen ein Boss (Andariel, Duriel, Mephisto, Innoruuk, Diablo, Baal)
- Beute in vier Seltenheitsstufen (normal, magisch, selten, einzigartig), Ausrüstung, Tränke, Gold
- Attributpunkte, Stufenaufstiege, Automap, Spielstand im Browser (localStorage)

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Bewegen |
| Maus | Zielen |
| Linke / rechte Maustaste, 1–6 | Fähigkeiten |
| Q / E | Heil- / Manatrank |
| K | Fähigkeiten-Baukasten |
| C | Charakter und Attribute |
| I | Inventar |
| Esc | Fenster schließen |

## Lokal starten

```sh
python3 -m http.server 8000   # dann http://localhost:8000
```

## Dateien

- `data.js`: Klassen, Fähigkeiten, Monster, Beschwörungen, Gegenstände (zum Erweitern hier Einträge ergänzen)
- `game.js`: Engine (Karte, Kampf, KI, Darstellung, UI)
- `index.html`: Layout und Stil

## Hinweise

Fan-Projekt ohne Originalgrafiken oder -code. Die Fähigkeitslisten stammen aus öffentlichen Übersichten
(z. B. GameBanshee); die Liste des Hochelfen-Klerikers ist teilweise angenähert. Werte und Wirkungen sind
eigene Umsetzungen, keine Nachbildung der Originalformeln.
Diablo ist eine Marke von Blizzard Entertainment, Champions: Return to Arms von Sony Online Entertainment.
