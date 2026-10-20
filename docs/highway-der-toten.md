# Highway der Toten

Zweite Karte neben dem Chaos-Sanktuarium: eine moderne Wüste bei Tag, in der der Held Runde um Runde Zombiehorden nach dem Vorbild von Dead Nation (PS3, Housemarque 2010, mit dem DLC Road of Devastation) bekämpft. Begriffe stehen in [GLOSSARY.md](../GLOSSARY.md), die Stilentscheidung in [ADR 0001](adr/0001-highway-der-toten-im-stil-von-dead-nation.md).

## Karte

- **Größe:** 313 × 313 Felder, die 20-fache Fläche des Chaos-Sanktuariums mit 70 × 70 Feldern. Die Karte ist immer dieselbe.
- **Straßen:** Ein Highway führt von West nach Ost, eine Landstraße von Nord nach Süd. An der Kreuzung in der Mitte stehen Tankstelle, Diner und Motel. Dort ist der Startpunkt, auch nach dem Tod.
- **Entlang der Straßen:** Autowracks, der umgestürzte Tanklaster, ein verunglückter Gefangenenbus und Straßensperren mit Sandsäcken.
- **Verteilt über die Karte:** Wohnwagenpark, Farm mit Wasserturm, Quarantänelager mit Zelten und Militärfahrzeugen, verlassenes Dorf.
- **Landschaft:** Dazwischen liegen Sand, Tafelberge, Felsbrocken, Kakteen und ausgetrocknete Flussbetten. Am Rand begrenzen Felswände die Karte.
- **Hindernisse:** Gebäude und Fahrzeuge sind nicht begehbar.
- **Licht:** warmes Nachmittagslicht mit goldenen Farben. Über dem Asphalt flimmert die Hitze, Staub weht über die Straße.
- **Automap:** Sie zeigt von Anfang an die ganze Karte.

## Zugang und Fortschritt

- **Kartenwahl:** Auf dem Startbildschirm schaltet „Chaos-Sanktuarium | Highway der Toten“ die Karte um.
- **Held:** Derselbe Held spielt auf beiden Karten mit Stufe, Fähigkeiten, Gegenständen und Gold.
- **Runden und Rekord:** Jede Karte hat ihren eigenen Rundenzähler und ihren eigenen Rekord.
- **Fortsetzen:** Es führt in die Pause vor der aktuellen Runde der gewählten Karte.
- **Neuer Held:** Beide Karten beginnen wieder bei Runde 1, die Rekorde bleiben stehen.
- **Abbruch:** Wer mitten in einer Runde ins Hauptmenü geht, beginnt diese Runde beim nächsten Mal von vorn.
- **Tod:** Es gibt 3 Sekunden Todesbild, 10 % des Golds gehen verloren. Danach steht der Held am Startpunkt in der Pause derselben Runde. Stufe, Gegenstände und Beschwörungen bleiben.

## Runden

- **Ablauf wie im Chaos-Sanktuarium:**
  1. Pause: Der Händler öffnet sich überall mit H.
  2. N startet die Runde, die Zombies kommen gestaffelt.
  3. Sind alle besiegt, gibt es Gold, die nächste Runde, falls nötig einen neuen Rekord, und das Spiel wird gespeichert.
- **Herkunft:** Die Zombies kommen dorthin, wo der Held steht. Sie treten aus den nächsten Austrittspunkten knapp außerhalb des Bildes, also aus Gebäuden, Bussen, Lkw, Zelten, Gullys und Löchern im Sand. Dazu kommen Nachzügler im Rücken.
- **Anzahl:** Je Runde kommen 44 + 22 × Runde Zombies, gleichzeitig leben höchstens 165, der Rest rückt nach.

  | Runde | Zombies |
  |---|---|
  | 1 | 66 |
  | 5 | 154 |
  | 10 | 264 |
  | 20 | 484 |
- **Gegnerstufe:** Sie ist der höhere Wert aus Wüsten-Runde und Stufe ÷ 1,2. Der Faktor stammt aus der Balance-Prüfung: Stufe 6 ≈ Runde 5, Stufe 18 ≈ Runde 15.
  - Nach ihr richten sich Leben, Schaden, EP und Beute der Zombies, das Gold am Rundenende und die Händlerwaren samt Trankpreis.
  - Nach der Wüsten-Runde richten sich Anzahl, Zombie-Arten, Endbosse und die Häufigkeit von Champions und Unique-Gegnern.
- **Stärke:** Ein einzelner Zombie ist schwächer als ein Gegner im Chaos-Sanktuarium mit derselben Gegnerstufe, Spezial-Zombies sind zäh. Insgesamt ist es etwa so schwer wie im Chaos-Sanktuarium.
- **Champions und Unique-Gegner:** wie im Chaos-Sanktuarium, bei gewöhnlichen und Spezial-Zombies, nicht bei Endbossen.
- **Letzte Zombies:** Sobald höchstens 5 übrig sind, zeigen rote Pfeile am Bildschirmrand die Richtung. Auf der Automap erscheinen sie als rote Punkte.
- **Pause:** Sie zeigt „Nächster Endboss: Runde N“.

## Zombie-Arten

Alle Zombies sind Untote. Die Spezial-Zombies und Endbosse tragen ihre Originalnamen, die übrigen deutsche Namen.

| ab Runde | Zombie-Art | Aussehen und Verhalten |
|---|---|---|
| 1 | Schlurfer | Alltagskleidung, langsam, schwach, kommt in Massen. Eine dicke Variante hält mehr aus. |
| 1 | Schutzanzug | gelber Schutzanzug aus dem Quarantänelager, die schwächste Art |
| 1 | Häutling | rot und ohne Haut, schnell, fällt mit einem Treffer, kommt im Schwarm |
| 1 | Runner | schlaksig und sehr schnell. Lauert reglos an Wänden und Wracks und springt hervor. |
| 2 | Polizist | Wird er getroffen, löst sich manchmal ein Schuss, der Zombies und den Helden trifft. |
| 2 | Häftling | oranger Overall aus dem Gefangenenbus, schnell |
| 2 | Bombie | aufgedunsen. Erst quillt Gas aus seinem Mund, dann explodiert er und trifft alles im Umkreis. |
| 3 | Feuerwehrmann | schnell, zäh, mit Feueraxt. Gegen Feuerschaden immun, Feuer verlangsamt ihn nur. |
| 3 | Mouth | hagerer Riese mit aufklaffendem Brustmaul. Jeder Schrei ruft einen Schwarm Häutlinge, bis er stirbt. Meist lässt er einen Heiltrank fallen. |
| 4 | Biker | dick, mit Lederjacke, sehr zäh |
| 4 | Jumper | gorillaartig. Stößt einen Warnschrei aus und springt dann weit, bei der Landung entsteht eine Schockwelle. |
| 5 | Soldat | Helm und Weste, sehr zäh. Der erste starke Treffer reißt ihm den Helm weg. Meist lässt er einen Heiltrank fallen. |
| 6 | Cutter | dreimal so groß wie der Held, mit Macheten-Händen. Stürmt an, schnelle Treffer betäuben ihn kurz. |
| 7 | Leech | kindsgroß und fast nur Maul, kommt in Gruppen. Spuckt Säure, die Pfützen hinterlässt. |
| selten | Zombie-Weihnachtsmann | lässt viel Gold fallen |

- **Treffer unter Zombies:** Bombie-Explosion, Jumper-Landung, Cutter-Ansturm, Polizistenschüsse und alle Explosionen treffen auch Zombies.
- **Lauernde Runner:** Sie springen los, sobald der Held nahe kommt, spätestens aber nach 20 Sekunden oder sobald höchstens 5 Zombies übrig sind. Auch eine Leuchtfackel, ein heulendes Alarm-Auto oder ein Treffer holt sie hervor.
- **Gerufene Zombies:** Die Häutlinge des Mouth, der Häutlings-Ring des Big Mouth und die Leeches des Big Leech kommen zusätzlich zu den Zombies der Runde und müssen ebenfalls besiegt werden. Sie zählen aber gegen die Obergrenze: Leben schon 165 Zombies, wird niemand gerufen.
- **Champions und Unique-Gegner unter den Spezial-Zombies:** Ihre Gruppen sind höchstens eins größer als die größte gewöhnliche Gruppe ihrer Art, damit nicht vier Cutter zugleich kommen. Die freien Plätze bekommt eine gewöhnliche Gruppe, die Rundengröße bleibt gleich.

Werte für Gegnerstufe 1. Leben, Schaden und Erfahrung wachsen wie bei allen Gegnern mit der Gegnerstufe. Der Anteil bestimmt, wie oft eine Gruppe der Art gezogen wird. Spezial-Zombies machen etwa 7 bis 9 % der Horde aus.

| Zombie-Art | Leben | Schaden | Tempo | Anteil | Gruppe | ab Runde |
|---|---|---|---|---|---|---|
| Schlurfer | 6 | 2,4 | 48 | 6 | 6–10 | 1 |
| Dicker Schlurfer | 16 | 4 | 40 | 1 | 2–4 | 1 |
| Schutzanzug | 4 | 1,8 | 50 | 3 | 5–8 | 1 |
| Häutling | 2 | 1,6 | 135 | 2 | 8–14 | 1 |
| Runner | 5 | 3 | 150 | 1 | 1–3 | 1 |
| Polizist | 9 | 3 | 50 | 2 | 3–5 | 2 |
| Häftling | 6 | 2,4 | 78 | 1,5 | 4–7 | 2 |
| Bombie | 8 | 2 | 42 | 0,8 | 1 | 2 |
| Feuerwehrmann | 15 | 3,5 | 72 | 1 | 2–4 | 3 |
| Mouth | 30 | 6 | 45 | 0,5 | 1 | 3 |
| Biker | 26 | 5 | 44 | 1 | 2–3 | 4 |
| Jumper | 40 | 8 | 60 | 0,6 | 1–2 | 4 |
| Soldat | 30 | 5 | 48 | 1 | 2–4 | 5 |
| Cutter | 140 | 14 | 55 | 0,4 | 1 | 6 |
| Leech | 5 | 2 | 32 | 0,8 | 3–5 | 7 |
| Zombie-Weihnachtsmann | 20 | 3 | 46 | 0,08 | 1 | 1 |

Dazu bei Gegnerstufe 1:
- Bombie-Explosion: 26 Schaden im Radius 120
- Jumper-Schockwelle: 12 im Radius 110
- Polizistenschuss und Cutter-Ansturm: doppelter Schaden der Art

## Endbosse

Jede 5. Runde erscheint ein Endboss, jede 20. Runde zum Abschluss des Zyklus der stärkste. Ab Runde 20 kommt in jeder Endboss-Runde zusätzlich zufällig ein zweiter dazu. Der zweite ist nie der Big Mouth, der bleibt wie Diablo im Chaos-Sanktuarium dem Abschluss vorbehalten. Jeder Endboss bringt Gefolge mit, und er kommt am Ende der Horde als Abschluss der Runde. Auf dem Highway der Toten ist sein Lebensbalken immer zu sehen, auch aus der Ferne.

| Runde im Zyklus | Endboss | Verhalten |
|---|---|---|
| 5 | Big Jumper | springt in Serien quer übers Bild und löst große Schockwellen aus |
| 10 | Big Leech | spuckt Säuresalven, die große Pfützen legen, und speit Leeches aus |
| 15 | Big Cutter | stürmt durch Autowracks und Zombies hindurch und wirbelt mit den Klingen |
| 20 | Big Mouth | Sein Schrei lässt sich nicht unterbrechen. Um den Helden steigt ein Ring aus Häutlingen aus dem Boden. |

Dead Nation selbst hat keine echten Endbosse. Belegt ist nur der Big Mouth aus dem DLC, die anderen drei sind nach seinem Muster abgeleitet.

Werte für Gegnerstufe 1. Die Größe im Bild ergibt sich aus dem Radius, beim Big Cutter und Big Mouth zusätzlich aus der Gestalt. So überragen sie ihre gewöhnliche Form deutlich.

| Endboss | Leben | Schaden | Tempo | Radius | Höhe (Held = 1) | Gefolge |
|---|---|---|---|---|---|---|
| Big Jumper | 340 | 14 | 72 | 32 | 2,3 | 2 Jumper, 6 Runner |
| Big Leech | 440 | 11 | 46 | 34 | 2,4 | 6 Leech, 6 Schutzanzug |
| Big Cutter | 520 | 20 | 80 | 36 | 3,6 | 5 Soldaten, 5 Polizisten |
| Big Mouth | 880 | 24 | 66 | 40 | 3,6 | 12 Häutlinge, 4 Feuerwehrmänner |

- **Big Jumper:** Er springt in Serien von 3 Sätzen dorthin, wo der Held stand. Ein roter Kreis am Boden zeigt die Landung an. Jede Landung löst eine Schockwelle mit Radius 170 aus, die auch Zombies trifft.
- **Big Leech:** Er spuckt einzelne Säurebälle. Im Wechsel kommen eine Salve aus 7 Säurebällen mit großen Pfützen und eine Brut aus 3 bis 5 Leeches.
- **Big Cutter:**
  - Er holt 0,65 Sekunden lang mit roter Bahn als Warnung aus und stürmt dann mitten durch Wracks. Zombies im Weg mäht er nieder, Fässer bringt er zur Explosion.
  - Ist der Held nah, wirbelt er im Wechsel mit dem Ansturm 1,3 Sekunden lang mit den Klingen.
- **Big Mouth:** Sein Schrei dauert 1,8 Sekunden, Betäubung, Frost und Furcht wirken dabei nicht. Kurz vor dem Ende wölbt sich der Boden um den Helden. Dann steigen 10 + Gegnerstufe ÷ 4 Häutlinge auf, höchstens 18.

## Beute und Objekte

- **Beute:** Insgesamt gibt es je Runde etwa so viel Beute wie im Chaos-Sanktuarium, nur verteilt auf viel mehr Zombies.
  - Gewöhnliche Zombies lassen selten etwas fallen, Spezial-Zombies öfter.
  - Endbosse lassen so viel fallen wie die Bosse im Chaos-Sanktuarium.
- **Kofferräume:** An rund 40 Autowracks auf der ganzen Karte gibt es einen Kofferraum. Die Beute ist wie bei einer Urne. Zu jeder Runde füllen sich die Kofferräume neu.
- **Beutekiste:** Ab Runde 2 erscheint sie am Rundenende neben dem Helden, markiert mit rotem Rauch. Sie enthält dasselbe wie die Truhe.
- **Medikit:** Es liegt jede 3. Runde neben der Beutekiste und füllt Leben und Mana.

## Umgebung

- **Alarm-Autos:** In jedem Bereich blinken ein paar Wracks rot, insgesamt 21.
  - Ein Treffer löst den Alarm aus. Die Zombies im Umkreis stürmen hin und prügeln auf das Auto ein, bis es nach 10 Schlägen explodiert. Eine Explosion jagt es sofort hoch.
  - Kommt 20 Sekunden lang niemand, verstummt der Alarm und lässt sich erneut auslösen.
  - Zu jeder Runde sind die Alarm-Autos wieder scharf.
- **Benzinfässer:** 28 rote Fässer stehen an der Tankstelle, auf der Farm, an den Straßensperren und im Quarantänelager.
  - Sie explodieren bei einem Treffer des Helden oder seiner Beschwörungen.
  - Auch andere Explosionen und die Endbosse bringen sie hoch. So entstehen Kettenreaktionen.
  - Schläge und Schüsse gewöhnlicher Zombies zünden nichts.
- **Anvisieren:** Fährt die Maus über ein Fass, ein Alarm-Auto oder den Tanklaster, wird es zum Ziel; ein Klick greift es an.
- **Tanklaster:** Er hält 5 Treffer aus. Dann explodiert er mit dem dreifachen Radius eines Fasses und hinterlässt 8 Sekunden lang eine brennende Benzinlache.
- **Wiederherstellung:** Benzinfässer und Tanklaster sind erst nach zwei Runden wieder heil. Was in Runde 4 explodiert, fehlt in Runde 5 und steht ab Runde 6 wieder.
- **Explosionen:** Jede Explosion trifft Zombies, den Helden und seine Beschwörungen. Brennende Zombies taumeln umher.

## Leuchtfackeln

- **Kauf:** Der Händler verkauft sie nur auf dem Highway der Toten. Eine kostet doppelt so viel wie ein Trank.
- **Tragen:** Der Held trägt höchstens 5 Leuchtfackeln, die Anzahl steht in der Anzeige neben den Tränken.
- **Wurf:** L wirft eine Fackel zum Mauszeiger, höchstens etwa 10 Felder weit. Das geht nur während einer Runde, damit in der Pause keine verloren geht.
- **Wirkung:**
  - Sie brennt 8 Sekunden mit rotem Licht und Rauch.
  - Alle Zombies im Umkreis von etwa einer Bildschirmbreite laufen hin, auch Runner. Endbosse lassen sich nicht ablenken.
  - Schaden macht sie keinen.
- **Im Chaos-Sanktuarium** wirkt sie nicht.

## Darstellung und Ton

- **Leichen:** Sie bleiben 40 Sekunden liegen, bei Horden höchstens die letzten 150.
- **Explosionen:** Sie zerreißen Zombies in Teile, mit Blutspritzern.
- **Geräusche:**
  - Schlurfen und Stöhnen der Horde
  - Schrei des Mouth und Warnschrei des Jumpers
  - Zischen des Bombie
  - Autoalarm und Explosion

## Fahrzeuge

In Feldern zu je etwa 2,3 m: Autos 2 × 1, Militärlaster 3 × 1, Gefangenenbus 5 × 1, umgestürzter Tanklaster 8 × 2.

## Technik

- **Boden:** Er wird in Kacheln vorgezeichnet. Ein einziges Bild für 313 × 313 Felder wäre 12.520 px breit und über 600 MB groß.
- **Nachbarsuche:**
  - Ein räumliches Raster aus 80er-Zellen begrenzt das gegenseitige Abstoßen auf Nachbarn.
  - Die Ziellisten (Held und Beschwörungen, Zombies) entstehen einmal je Bild.
  - Die Reihenfolge der Paare ist dieselbe wie zuvor, die Balance-Prüfung bleibt also gleich.
- **Wegfindung:** Das Flussfeld reicht auf dem Highway 64 statt 40 Schritte, damit ferne Zombies nicht an Hindernissen hängen bleiben.
- **Dateien:**
  - `highway.js`: Karte, Boden, Hindernisse, Runden, Explosionen (`hwBoom`)
  - `zombies.js`: Zombie-Arten
  - `bosses.js`: Endbosse
  - `umgebung.js`: Alarm-Autos, Fässer, Tanklaster, Objekte, Leuchtfackeln, Pfeile und Blut
- **Erweiterungspunkte:** Die drei letzten Dateien hängen sich über die Erweiterungspunkte `HWH` in `highway.js` ein, statt den Kern zu ändern. Ziele, eigenes Verhalten, Treffer, Tod, Rundenstart, Objekte und die Zeichenschichten werden nur auf dem Highway der Toten aufgerufen.
- **Gemeinsames:** Rufen, freie Plätze und Säure teilen Zombie-Arten und Endbosse (`zCall`, `zFree`, `zRing`, `zSpit`).
- **Fässer, Alarm-Autos und Tanklaster:** Sie sind unsichtbare Figuren ohne Team. So treffen alle Fähigkeiten, Flächen und Explosionen sie von selbst.
- **Leistung:** Ziel sind 60 FPS in Chrome auf dem Mac bei Grafikstufe Hoch. Gemessen wird mit `index.html?bench&scene=horde`.

## Stand der Umsetzung

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Karte, Kartenwahl, Rundenablauf, Gegnerstufe, Schlurfer, Schutzanzug, Häutling, Austrittspunkte, Obergrenze, Leistungsumbau | umgesetzt |
| 2 | übrige Zombie-Arten, Aussehen der Endbosse | umgesetzt |
| 3 | Endbosse | umgesetzt |
| 4 | Alarm-Autos, Benzinfässer, Tanklaster, Kofferräume, Beutekiste, Medikit, Leuchtfackeln, Pfeile, Geräusche, Blut | umgesetzt |

Die Etappen 2 bis 4 entstanden gleichzeitig in drei getrennten Arbeitskopien und wurden danach zusammengeführt.

Messungen nach Etappe 4, Apple M5, Chrome ohne Fenster:

- **Leistung:** `?bench&scene=horde` bei 1280 × 720, Grafikstufe Hoch, 165 Zombies aller Arten zu gleichen Teilen, die sterben und nachrücken.
  - 60 FPS, längstes Bild 16,8 ms.
  - Rechenzeit je Bild im Mittel 5,2 ms, P99 7,5 ms; davon Zeichnen 4,6 ms.
  - Nach Etappe 1, nur mit Schlurfern, Schutzanzügen und Häutlingen, waren es 3,0 ms. Die Szene „dicht“ mit 60 Gegnern im Chaos-Sanktuarium liegt bei 2,7 ms.
  - Die Figurenbilder belegen 218 Mio. Bildpunkte, roh rund 870 MB, weil in der Messung alle 16 Arten mit allen Bewegungen gleichzeitig zu sehen sind. In echten Runden sind Spezial-Zombies seltener.
- **Schwierigkeit:** die Kampagne aus `balance.js` auf beiden Karten (zwölf Ausrichtungen, Runden bis zum Tod, höchstens 25). Im Median schaffen beide Karten 6 Runden. Flächenschaden kommt auf dem Highway weiter, etwa Frostnova 9 statt 4 und Kettenblitz 9 statt 7 Runden. Reine Einzelziel-Angriffe fallen früher, etwa Heiliger Blitz 3 statt 5.
- **Chaos-Sanktuarium unverändert:** Die Balance-Prüfung über alle 292 Fähigkeiten liefert dieselben Werte wie vor dem Highway.

