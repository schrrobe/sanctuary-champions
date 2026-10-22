# Ferne Oase

Die Ferne Oase ist die dritte Karte neben dem Chaos-Sanktuarium und dem Highway der Toten. Sie ist eine weite, offene Wüste nach dem gleichnamigen Gebiet aus Akt 2 von Diablo II: Lord of Destruction. Der Held erkundet Oasen, Ruinen und Dünen, während die Gegner der Fernen Oase und der Wurmgruft Runde um Runde zu ihm kommen.

Begriffe stehen in [GLOSSARY.md](../GLOSSARY.md), die Grundentscheidung steht in [ADR 0002](adr/0002-ferne-oase-mit-anrueckenden-gegnern-je-held-neu.md).

## Vorlage aus dem Original

- **Gebiet:** Die Ferne Oase liegt in Akt 2 zwischen den Verdorrten Hügeln und der Vergessenen Stadt. Dort gibt es einen Wegpunkt und den Eingang zur Wurmgruft. Die Gegnerstufe ist 16 in Normal, 45 in Albtraum und 76 in Hölle.
- **Gegner der Fernen Oase:** Todeskäfer, Sandwurm, Stichlinge, Untoter Aasfresser, Schwarzer Greifer mit Schwarzer-Greifer-Nest.
- **Zusätzliche Gegner der Wurmgruft:** Felswurm, Skarabäus, Schwarze Heuschrecken.
- **Benannte Gegner:**
  - **Käferkau** (Beetleburst) in der Fernen Oase: ein Todeskäfer mit Gefolge, Magie-resistant.
  - **Kaltwurm der Gräber** (Coldworm the Burrower) in Ebene 3 der Wurmgruft: eine Sandwurm-Königin mit Kälte-Verzauberung, Magie-resistant.
- **Bausteine der Wüste:**
  - Oasen in drei Größen, Ruinen mit Säulen, Tafelberge und Dünen
  - Riesenskelette und Wagenwracks
  - Felswände am Rand und der Eingang zur Wurmgruft
- **Objekte:** Truhen, Krüge, Brunnen, Tote Wächter und Schreine.
- **Quellen:**
  - die Spieldaten aus [d2data](https://github.com/blizzhackers/d2data): Gebiete, Gegnerwerte, Superuniques, Schreine und die deutschen Texte
  - [The Arreat Summit](https://classic.battle.net/diablo2exp/monsters/act2-scarabdemon.shtml)
  - Standbilder aus Spielvideos

## Karte

- **Größe:** 443 × 443 Felder.
  - Das ist die doppelte Fläche des Highway der Toten mit 313 × 313 Feldern, etwa 1 km Kantenlänge.
  - Von der Mitte bis in eine Ecke läuft der Held ohne Tempo-Boni etwa 74 Sekunden.
- **Zufall:**
  - Jeder neue Held bekommt eine neu gewürfelte Karte, der Startwert steht im Spielstand.
  - Nur die Startoase liegt immer in der Mitte. Alles ist von ihr aus erreichbar.
- **Orte:**

  | Ort | Anzahl | Was dort ist |
  |---|---|---|
  | Startoase | 1, in der Mitte | großer Teich, Palmen, Brunnen, Wegpunkt. Startpunkt, auch nach dem Tod. |
  | Oasen | 8, in drei Größen | Teich, Palmen, je ein Brunnen. 4 von ihnen haben einen Wegpunkt. |
  | Ruinenfelder | 6 | Säulen und Mauerreste mit Truhen und Schreinen. Die Ruineneingänge sind Austrittspunkte. |
  | Rastplätze | 8 | Riesenskelette und Wagenwracks mit je 2 Toten Wächtern |
  | Eingang zur Wurmgruft | 1 | Wahrzeichen und Austrittspunkt. Hinein kommt man nicht. |
  | Rand | ringsum | Felswände mit Felsspalten als Austrittspunkte |
  | dazwischen | überall | Dünen, Tafelberge, Felsbrocken, trockene Büsche und Sandlöcher als Austrittspunkte |

- **Verteilt über die Karte:** 12 Truhen und 40 Krüge an Ruinen, Wagen und Skeletten, dazu 6 Schreine an den Ruinen.
- **Hindernisse:**
  - Teiche sind nicht begehbar.
  - Palmen, Säulen, Felsen und Tafelberge sind Hindernisse.
  - Über Dünen kann man laufen.
- **Licht:** heller Mittag in den Farben von D2.
  - blasser, goldbeiger Sand mit kurzen, harten Schatten
  - dunkle, graubraune Felsen
  - grünes Wasser, Palmen und trockene Büsche
- **Automap:**
  - Sie deckt sich wie in D2 erst dort auf, wo der Held schon war.
  - Was aufgedeckt ist, bleibt es für diesen Helden, auch nach dem Tod und beim nächsten Spielen.
  - Wegpunkte, Oasen und Brunnen sind markiert, sobald ihre Gegend aufgedeckt ist.

## Zugang und Fortschritt

- **Kartenwahl:** Auf dem Startbildschirm schaltet „Chaos-Sanktuarium | Highway der Toten | Ferne Oase“ die Karte um.
- **Held:** Derselbe Held spielt auf allen drei Karten mit Stufe, Fähigkeiten, Gegenständen und Gold.
- **Runden und Rekord:** Die Ferne Oase hat einen eigenen Rundenzähler und einen eigenen Rekord.
- **Fortsetzen:** Es führt in die Pause vor der aktuellen Runde.
- **Neuer Held:** Alle Karten beginnen bei Runde 1, die Rekorde bleiben stehen. Auf der Fernen Oase heißt das außerdem:
  - eine neue Karte
  - eine verdeckte Automap
  - nur der Wegpunkt der Startoase ist frei
- **Abbruch:** Wer mitten in einer Runde ins Hauptmenü geht, beginnt diese Runde beim nächsten Mal von vorn.
- **Tod:**
  - 3 Sekunden Todesbild, 10 % des Golds gehen verloren.
  - Danach steht der Held an der Startoase in der Pause derselben Runde.
  - Stufe, Gegenstände, Beschwörungen, Automap und Wegpunkte bleiben.

## Wegpunkte

- **Anzahl:** 5, einer an der Startoase und je einer an 4 Oasen.
- **Freischalten:** beim ersten Besuch, auch während einer Runde. Freigeschaltet bleibt freigeschaltet für diesen Helden.
- **Reisen:**
  - nur in der Pause, damit keine Gegner irgendwo zurückbleiben
  - Ein Klick auf einen Wegpunkt öffnet wie in D2 die Liste der freigeschalteten Wegpunkte, ein Klick auf einen Eintrag reist dorthin.
  - Die Wegpunkte heißen nach der Himmelsrichtung, etwa „Startoase“ oder „Oase im Nordosten“.

## Runden

- **Ablauf wie auf dem Highway der Toten:**
  1. In der Pause öffnet sich der Händler überall mit H.
  2. N startet die Runde, die Gegner kommen gestaffelt.
  3. Sind alle besiegt, gibt es Gold und die nächste Runde, falls nötig einen neuen Rekord, und das Spiel wird gespeichert.
- **Herkunft:**
  - Die Gegner kommen dorthin, wo der Held steht, aus den nächsten Austrittspunkten knapp außerhalb des Bildes. Dazu kommen Nachzügler im Rücken.
  - Austrittspunkte sind Sandlöcher, aus denen sich die Gegner mit einer Sandfontäne herausgraben, Ruineneingänge, Felsspalten und der Eingang zur Wurmgruft.
- **Anzahl:** 12 + 6 × Runde Gegner je Runde.
  - Geplant war ein Viertel des Highway, 22 + 11 × Runde.
  - Damit schaffte die Kampagne aber nur 2 Runden statt 6 wie im Chaos-Sanktuarium. Die Balance-Prüfung hat die Zahl deshalb etwa halbiert.

  | Runde | Gegner |
  |---|---|
  | 1 | 18 |
  | 5 | 42 |
  | 10 | 72 |
  | 20 | 132 |

  - Die Gruppen haben die Größe aus dem Original.
  - Gleichzeitig leben höchstens 80 Gegner, Brut eingeschlossen, der Rest rückt nach.
  - Alle 2 Sekunden kommt eine Gruppe, bei weniger als 15 lebenden Gegnern jede Sekunde.
- **Gegnerstufe:** wie auf dem Highway der höhere Wert aus Oasen-Runde und Stufe ÷ 1,2.
  - Nach ihr richten sich Leben, Schaden, EP und Beute der Gegner, das Gold am Rundenende und die Händlerwaren.
  - Nach der Oasen-Runde richten sich Anzahl, Gegnerarten, Endbosse und die Häufigkeit von Champions und Unique-Gegnern.
- **Stärke:**
  - Jeder Gegner ist so stark wie ein Gegner im Chaos-Sanktuarium mit derselben Gegnerstufe.
  - Insgesamt soll die Karte etwa so schwer sein wie das Chaos-Sanktuarium. Die Balance-Prüfung stimmt die Zahlen ab.
- **Champions und Unique-Gegner:** wie im Chaos-Sanktuarium, bei allen Gegnerarten außer Sandwurm-Ei, Sandwurm-Nachwuchs und Nest, nicht bei Endbossen.
- **Letzte Gegner:** Sobald höchstens 5 übrig sind, zeigen rote Pfeile am Bildschirmrand die Richtung. Auf der Automap erscheinen sie als rote Punkte.
- **Pause:** Sie zeigt „Nächster Endboss: Runde N“.

## Gegnerarten

Die Namen sind die der deutschen D2-Fassung. Der Untote Aasfresser ist ein Untoter.

| ab Runde | Gegnerart | Herkunft | Gruppe | Verhalten |
|---|---|---|---|---|
| 1 | Todeskäfer | Oase | 3–4 | Nahkampf mit körperlichem Schaden wie im Original. Getroffen, schießt er mit 20 % Wahrscheinlichkeit 3 Combo-Blitze mit halbem Schaden in zufällige Richtungen, höchstens einmal in 0,25 Sekunden. |
| 1 | Sandwurm | Oase | 1 | Gräbt sich ein und taucht anderswo auf, spuckt Giftschleim, legt alle 6 Sekunden ein Ei, höchstens 3 zugleich |
| 1 | Untoter Aasfresser | Oase | 2–3 | Kreist um den Helden und stößt alle paar Sekunden zum Angriff herab |
| 2 | Stichlinge | Oase | 4–8 | Insektenschwarm mit 60 % Widerstand gegen körperlichen Schaden. Der Stich verlangsamt den Helden, weil es hier keine Ausdauer gibt. |
| 3 | Schwarzer Greifer | Oase | 3–5 | Schneller Raubvogel mit Giftschaden. Greift an und fliegt wieder weg. |
| 3 | Schwarzer-Greifer-Nest | Oase | 1 | Steht fest. Brütet alle 6 Sekunden einen Greifer aus, höchstens 6 lebende je Nest, bis es zerstört ist. |
| 5 | Felswurm | Wurmgruft | 1 | wie der Sandwurm, stärker |
| 6 | Skarabäus | Wurmgruft | 3–5 | wie der Todeskäfer, stärker, Combo-Blitze mit 25 % |
| 7 | Schwarze Heuschrecken | Wurmgruft | 5–8 | wie die Stichlinge, stärker, 70 % Widerstand gegen körperlichen Schaden |

- **Brut:**
  - Ein Sandwurm-Ei schlüpft nach 5 Sekunden als Sandwurm-Nachwuchs, wenn man es nicht vorher zerschlägt.
  - Der Nachwuchs ist klein, beißt mit Gift und hat die Gruppe 1.
  - Brut kommt zu den Gegnern der Runde dazu und muss ebenfalls besiegt werden.
  - Leben schon 80 Gegner, schlüpft nichts.
- **Combo-Blitze:** Sie treffen nur den Helden und seine Beschwörungen.

Werte für Gegnerstufe 1:
- **Herleitung:** aus den Grundwerten des Originals, im selben Verhältnis wie bei Gefallenem, Zombie, Skelett und Ziegenmensch im Chaos-Sanktuarium. Das sind Leben × 0,27, Schaden × 0,065, Erfahrung × 0,1 und Tempo 20 je Tempostufe des Originals.
- **Balance-Prüfung:** Sie hat das Leben danach auf 85 % und den Schaden auf die Hälfte gesetzt. So liegen die Arten im Bereich der frühen Gegner des Chaos-Sanktuariums.
- **Arten der Wurmgruft:** Sie sind etwa 1,4-mal so stark, weil die Gegnerstufe hier nicht nach Gebiet steigt.
- **Anteil:** Er bestimmt, wie oft eine Gruppe der Art gezogen wird.

| Gegnerart | Leben | Schaden | Tempo | EP | Anteil |
|---|---|---|---|---|---|
| Todeskäfer | 20 | 3,5 | 100 | 12 | 3 |
| Sandwurm | 36 | 4 | 80 | 12 | 1,5 |
| Sandwurm-Ei | 20 | – | – | 5 | Brut |
| Sandwurm-Nachwuchs | 10 | 1,25 | 80 | 5 | Brut |
| Untoter Aasfresser | 20 | 3,5 | 80 | 8 | 2 |
| Stichlinge | 8 | 2,5 | 100 | 6 | 1,5 |
| Schwarzer Greifer | 8 | 1,5 | 120 | 4 | 2 |
| Schwarzer-Greifer-Nest | 102 | – | – | 18 | 0,4 |
| Felswurm | 49 | 5,5 | 80 | 16 | 1 |
| Skarabäus | 29 | 5 | 100 | 16 | 2 |
| Schwarze Heuschrecken | 10 | 3,5 | 120 | 8 | 1 |

Einzelheiten zum Verhalten:
- **Sandwurm:**
  - Er gräbt sich für etwa 2,3 Sekunden ein. Dann ist er nicht zu treffen und taucht rund 260 px weiter wieder auf.
  - „Höchstens 3 zugleich“ zählt Eier und Nachwuchs zusammen. Sonst würde der Nachwuchs ohne Grenze wachsen.
- **Untoter Aasfresser:** Er kreist bis in 110 px Höhe und ist über 40 px Höhe nicht zu treffen.
- **Schwarzer Greifer:** Er fliegt nach dem Biss etwa 225 px weg.
- **Schwärme:** Sie bluten nicht und hinterlassen keine Leiche. Der Stich bremst den Helden 1,5 Sekunden auf das 0,6-fache Tempo.

## Endbosse

- **Rhythmus:**
  - Jede 5. Runde erscheint ein Endboss, jede 20. Runde zum Abschluss des Zyklus der stärkste.
  - Ab Runde 20 kommt in jeder Endboss-Runde zufällig ein zweiter dazu, nie der Kaltwurm der Gräber.
- **Auftritt:** Jeder Endboss bringt Gefolge mit und kommt am Ende der Horde. Sein Lebensbalken ist immer zu sehen.
- **Herkunft:** Käferkau und Kaltwurm der Gräber stammen aus dem Original. Aasschwinge und Greifermutter sind nach demselben Muster wie auf dem Highway aus den Arten der Oase abgeleitet.

| Runde im Zyklus | Endboss | Verhalten | Gefolge |
|---|---|---|---|
| 5 | Käferkau | Großer Todeskäfer mit körperlichem Nahkampf, Magie-resistant. Getroffen, schießt er mit 50 % Wahrscheinlichkeit 5 Combo-Blitze mit halbem Schaden, höchstens alle 0,4 Sekunden. | 4 Todeskäfer |
| 10 | Aasschwinge | Riesiger Untoter Aasfresser. Kreist in 300 px Abstand außer Reichweite und stößt in Serien von 3 Sturzflügen dorthin, wo der Held stand. Ein Schatten am Boden zeigt jede Landung an. Die Landung trifft mit 1,5-fachem Schaden im Radius 80 und stößt zurück. Danach sitzt sie 1 Sekunde verwundbar am Boden. | 4 Untote Aasfresser |
| 15 | Greifermutter | Riesiger Schwarzer Greifer. Wirft je 2 Nester um den Helden, höchstens 4 stehen zugleich. Im Wechsel stürzt sie mit 1,5-fachem Giftschaden quer durch den Helden, eine grüne Bahn warnt vorher. | 5 Schwarze Greifer, 2 Nester |
| 20 | Kaltwurm der Gräber | Riesige Sandwurm-Königin mit Kälte-Verzauberung, Magie-resistant. Spuckt zwischen den Angriffen Giftschleim. Gräbt sich ein und wandert als Sandhügel, der nicht zu treffen ist. Taucht beim Helden mit 1,5-fachem Schaden und Rückstoß auf und legt 6 Eier im Kreis. | 3 Sandwürmer, 2 Felswürmer |

- **Eigenschaften wie im Original:** Nur diese beiden haben die Endbosse aus dem Original. Andere Unique-Gegner bekommen keine Eigenschaften.
  - **Magie-resistant:** Feuer, Kälte und Blitz machen nur 60 % Schaden.
  - **Kälte-Verzauberung:** Jeder Treffer macht 50 % Kälteschaden dazu, der verlangsamt. Beim Tod löst er eine Frost-Nova mit Radius 180 und vollem Schaden aus.
- **Zweiter Endboss ab Runde 20:** Stirbt der erste, übernimmt der zweite den Lebensbalken.

Werte für Gegnerstufe 1:
- **Herkunft:** nach dem Muster der Endbosse des Highway.
- **Balance-Prüfung:** wie bei den Gegnerarten Leben auf 85 % und Schaden auf die Hälfte.

| Endboss | Leben | Schaden | Tempo | Radius | Höhe (Held = 1) |
|---|---|---|---|---|---|
| Käferkau | 306 | 7 | 100 | 30 | 1,6 |
| Aasschwinge | 374 | 8 | 120 | 34 | 2,4 |
| Greifermutter | 442 | 7,5 | 130 | 34 | 2,4 |
| Kaltwurm der Gräber | 748 | 11 | 60 | 44 | 2,0 |

## Beute und Objekte

- **Beute:**
  - Gewöhnliche Gegner lassen ein Viertel so oft etwas fallen wie im Chaos-Sanktuarium. Champions, Unique-Gegner und Endbosse lassen so viel fallen wie dort. So bleibt die Beute je Runde etwa wie im Chaos-Sanktuarium.
  - Brut lässt nichts fallen.
  - Erfahrung gibt jeder Gegner wie ein gleich starker Gegner im Chaos-Sanktuarium.
  - Landet Gold neben einem anderen Goldhaufen, kommt es auf diesen Haufen.
- **Truhe am Rundenende:** Ab Runde 2 erscheint sie neben dem Helden. Sie enthält dasselbe wie die Truhe im Chaos-Sanktuarium.
- **Truhen auf der Karte:** 12 Stück mit demselben Inhalt. Sie füllen sich nur nach jedem Endboss neu, also alle 5 Runden.
- **Krüge und Tote Wächter:** 40 Krüge und 16 Tote Wächter. Ihre Beute ist wie bei einer Urne. Zu jeder Runde füllen sie sich neu.
- **Brunnen:** An jeder der 9 Oasen steht einer. Er füllt Leben und Mana und lässt sich jede Runde einmal benutzen.
- **Schreine:** 6 Stück an den Ruinen, je 2 jeder Art. Zu jeder Runde sind sie wieder bereit. Die Zeit läuft auch in der Pause.

  | Schrein | Wirkung | Dauer |
  |---|---|---|
  | Schrein des Kampfes | +50 % Schaden für Angriffe und Zauber | 96 s |
  | Schrein der Rüstung | +100 % Rüstung | 96 s |
  | Schrein der Erfahrung | +50 % Erfahrung | 144 s |

  Im Original wirkt der Schrein des Kampfes mit +200 % auf den körperlichen Schaden. Im deutschen Original heißt der Schrein der Rüstung „Schrein der Waffen“.

- **Ohne Highway-Objekte:** Es gibt keine Explosionen und keine Alarme. Leuchtfackeln verkauft der Händler hier nicht.

## Darstellung und Ton

- **Leichen:** Sie bleiben 40 Sekunden liegen, bei vielen Gegnern höchstens die letzten 150.
- **Geräusche:**
  - Wüstenwind
  - Summen der Stichlinge und Heuschrecken
  - Schreie der Aasfresser und Greifer
  - Graben und Schmatzen der Sandwürmer
  - Knistern der Combo-Blitze
  - eigene Klänge für Brunnen, Schreine und Wegpunkte

## Technik

- **Kartenlogik:** Sie kennt jetzt drei Karten.
  - Kartenwahl, Rekord, Gegnerstufe, Kartenaufbau, Boden, Licht, Automap und Anzeige haben einen Fall für `G.oase`.
  - Die Rekorde liegen in `RECORD = { sanct, hw, oase }`. Die Schlüssel des Chaos-Sanktuariums und des Highway sind gleich geblieben.
- **Dateien:** Sie hängen sich wie beim Highway über Erweiterungspunkte ein, statt den Kern zu ändern.
  - `oase.js`: Generator, Boden, Hindernisse, Runden, Wegpunkte, Aufdecken der Automap
  - `oase-gegner.js`: Gegnerarten und Brut
  - `oase-bosse.js`: Endbosse und Eigenschaften
  - `oase-objekte.js`: Truhen, Krüge, Tote Wächter, Brunnen, Schreine und Geräusche
- **Boden:**
  - Er wird wie beim Highway in Kacheln zu 16 × 16 Feldern vorgezeichnet, höchstens 40 Kacheln liegen im Speicher.
  - Insgesamt sind es 784 Kacheln.
- **Speicher:**
  - Raster für Hindernisse und Wege brauchen etwa 3,3 MB.
  - Die Automap ist ein Bild mit 1 Bildpunkt je Feld, etwa 0,8 MB.
  - Die aufgedeckten Gegenden stehen als grobes Raster im Spielstand.
- **Wegfindung:** Das Flussfeld reicht wie auf dem Highway 64 Schritte.
- **Generator:** Er prüft, dass alle Orte von der Startoase aus erreichbar sind.
- **Balance-Prüfung:** Die Kampagne läuft auf der Fernen Oase mit einem festen Startwert. Das Chaos-Sanktuarium und der Highway dürfen sich dabei nicht ändern.
- **Leistung:** Ziel sind 60 FPS in Chrome auf dem Mac bei Grafikstufe Hoch. Gemessen wird mit `index.html?bench&scene=oase`, 80 Gegner aller Arten samt Brut.

### Umsetzung im Einzelnen

- **Orte:** `L.sites` liegt nicht in der Teichmitte, sondern auf einem freien Feld vor dem Teich. Der Teich liegt Richtung oberer Bildrand.
- **Größen der Orte** (Radius in Feldern):

  | Ort | Radius |
  |---|---|
  | Oase | 10, 12 oder 14 |
  | Startoase | 16 |
  | Ruine | etwa 10 |
  | Rastplatz | 5 |
  | Wurmgruft | 8 |

- **Richtungen:** Die 8 Oasen liegen in den 8 Himmelsrichtungen. Die 4 mit Wegpunkt liegen auf dem äußeren Ring.
- **Austrittspunkte:** etwa 400 je Karte, die meisten davon Sandlöcher.
- **Generator:** Er braucht etwa 170 ms. 300 Startwerte wurden geprüft: Alles ist erreichbar, der Rand ist geschlossen, und Wasser ist nicht begehbar.
- **Startwert:** `P.oaSeed` kommt aus der Uhrzeit, nicht aus `Math.random`. So bleibt der Zufall der Balance-Prüfung gleich.
- **Automap:** `P.oaSeen` speichert ein Raster aus 56 × 56 Zellen zu je 8 × 8 Feldern als Hex-Text. Aufgedeckt wird alles im Umkreis von 16 Feldern um den Helden.
- **Objekte:**
  - Die Truhe heißt im Code `coffer`, damit die Truhe des Chaos-Sanktuariums (`chest`) unberührt bleibt. Dazu kommen `jar`, `guard`, `well`, `wp`, `shrine_combat`, `shrine_armor` und `shrine_exp`.
  - `P.oaChest` ist `{ c: Zyklus, o: [geöffnete Truhen] }`. Der Zyklus ist ⌊(Runde − 1) ÷ 5⌋.
- **Klänge:** `boost` ist der Klang der drei neuen Schreine. `shrine` bleibt beim Erneuerungsschrein.

## Stand der Umsetzung

Alle vier Etappen entstanden gleichzeitig in vier getrennten Arbeitskopien. Grundlage war eine gemeinsam festgelegte Schnittstelle. Danach wurden sie ohne Konflikte zusammengeführt.

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Karte mit Generator und Startwert je Held, Boden, Hindernisse, Kartenwahl, Aufdecken der Automap, Runden mit Formel, Takt, Austrittspunkten und Gegnerstufe | umgesetzt |
| 2 | Gegnerarten mit Brut | umgesetzt |
| 3 | Endbosse mit Eigenschaften | umgesetzt |
| 4 | Truhen, Krüge, Tote Wächter, Brunnen, Schreine, Wegpunkte, Geräusche | umgesetzt |

Messungen nach dem Zusammenführen:

- **Chaos-Sanktuarium und Highway unverändert:** `node balance.js holy_freeze fire_bolt raise_skeleton whirlwind` liefert dieselben Werte wie vorher.
- **Schwierigkeit:** die Kampagne aus `balance.js` (`node balance.js --kampagne oase`) mit zwölf Ausrichtungen, Runden bis zum Tod.

  | Startwert der Kampagne | Ferne Oase | Chaos-Sanktuarium |
  |---|---|---|
  | 3 | 5 | 6 |
  | 4 | 6 | 6 |
  | 5 | 6 | 7 |

  - Die Zahlen sind Mediane der geschafften Runden.
  - Wie auf dem Highway kommt Flächenschaden weiter, etwa Frostnova 14 und Kettenblitz 12 Runden. Reine Einzelziel-Angriffe fallen früher, etwa Heiliger Blitz 4.
- **Leistung:** `?bench&scene=oase` in Chrome mit Fenster auf einem Apple M5 bei Grafikstufe Hoch, 80 Gegner aller Arten samt Brut.

  | Messwert | Ergebnis |
  |---|---|
  | Bildrate | 118 FPS (Bildschirm mit 120 Hz) |
  | Bildzeit | im Mittel 8,5 ms, P99 16,6 ms |
  | Rechenzeit je Bild | im Mittel 4,1 ms, P99 8,1 ms |
  | davon Zeichnen | 3,4 ms |
  | Spiellogik | 0,6 ms |
  | Vorab-Rendern aller 3.520 Figurenbilder | 3,9 s |

  Chrome ohne Fenster rechnet 3D ohne Grafikkarte. Dort dauert das Vorab-Rendern der Szene über 10 Minuten, deshalb taugt die Messung nur mit Fenster.

Nach dem Zusammenführen behoben:
- **Tiefensortierung:**
  - Figuren mit einem Radius über 16 werden um die Differenz weiter hinten einsortiert.
  - Ihr Bild reicht weit über die Füße hinaus. So verdecken Mauern und Säulen daneben die großen Endbosse, statt dass diese darübergezeichnet werden.
- **Beschwörungen:** Sie wählen keine Gegner mit `noTarget` mehr als Ziel, also eingegrabene Würmer und hoch kreisende Aasfresser. Dasselbe gilt für verwirrte Gegner.
- **Anklicken:**
  - Fliegende Gegner lassen sich auf ihrer Höhe anklicken.
  - Unerreichbare Gegner werden nicht mehr hervorgehoben.
- **Schrein der Rüstung:** Er wirkt als `armorPct` in `calc()`. Dadurch gilt er auch nach einem Wechsel der Ausrüstung.

Offen:
- **Gelände:** Tafelberge und Felsbrocken wirken noch etwas kastenförmig.
