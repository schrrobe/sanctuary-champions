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
- **Lauernde Runner:** Sie springen los, sobald der Held nahe kommt, spätestens aber nach 20 Sekunden oder sobald höchstens 5 Zombies übrig sind.
- **Gerufene Zombies:** Die Häutlinge des Mouth, der Häutlings-Ring des Big Mouth und die Leeches des Big Leech kommen zusätzlich zu den Zombies der Runde und müssen ebenfalls besiegt werden. Sie zählen aber gegen die Obergrenze: Leben schon 165 Zombies, wird niemand gerufen.

## Endbosse

Jede 5. Runde erscheint ein Endboss, jede 20. Runde zum Abschluss des Zyklus der stärkste. Ab Runde 20 kommt in Endboss-Runden zusätzlich zufällig einer der drei anderen. Jeder Endboss bringt Gefolge mit.

| Runde im Zyklus | Endboss | Verhalten |
|---|---|---|
| 5 | Big Jumper | springt in Serien quer übers Bild und löst große Schockwellen aus |
| 10 | Big Leech | spuckt Säuresalven, die große Pfützen legen, und speit Leeches aus |
| 15 | Big Cutter | stürmt durch Autowracks und Zombies hindurch und wirbelt mit den Klingen |
| 20 | Big Mouth | Sein Schrei lässt sich nicht unterbrechen. Um den Helden steigt ein Ring aus Häutlingen aus dem Boden. |

Dead Nation selbst hat keine echten Endbosse. Belegt ist nur der Big Mouth aus dem DLC, die anderen drei sind nach seinem Muster abgeleitet.

## Beute und Objekte

- **Beute:** Insgesamt gibt es je Runde etwa so viel Beute wie im Chaos-Sanktuarium, nur verteilt auf viel mehr Zombies.
  - Gewöhnliche Zombies lassen selten etwas fallen, Spezial-Zombies öfter.
  - Endbosse lassen so viel fallen wie die Bosse im Chaos-Sanktuarium.
- **Kofferräume:** An rund 40 Autowracks auf der ganzen Karte gibt es einen Kofferraum. Die Beute ist wie bei einer Urne. Zu jeder Runde füllen sich die Kofferräume neu.
- **Beutekiste:** Ab Runde 2 erscheint sie am Rundenende neben dem Helden, markiert mit rotem Rauch. Sie enthält dasselbe wie die Truhe.
- **Medikit:** Es liegt jede 3. Runde neben der Beutekiste und füllt Leben und Mana.

## Umgebung

- **Alarm-Autos:** In jedem Bereich blinken ein paar Wracks rot.
  - Ein Treffer löst den Alarm aus. Die Zombies im Umkreis stürmen hin und prügeln auf das Auto ein, bis es explodiert.
  - Zu jeder Runde sind die Alarm-Autos wieder scharf.
- **Benzinfässer:** Rote Fässer stehen an der Tankstelle, auf der Farm, an den Straßensperren und im Quarantänelager.
  - Sie explodieren bei einem Treffer des Helden oder seiner Beschwörungen.
  - Auch andere Explosionen bringen sie hoch, so entstehen Kettenreaktionen.
- **Tanklaster:** Er hält 5 Treffer aus. Dann explodiert er mit dem dreifachen Radius eines Fasses und hinterlässt 8 Sekunden lang eine brennende Benzinlache.
- **Wiederherstellung:** Benzinfässer und Tanklaster sind erst nach zwei Runden wieder heil. Was in Runde 4 explodiert, fehlt in Runde 5 und steht ab Runde 6 wieder.
- **Explosionen:** Jede Explosion trifft Zombies, den Helden und seine Beschwörungen. Brennende Zombies taumeln umher.

## Leuchtfackeln

- **Kauf:** Der Händler verkauft sie nur auf dem Highway der Toten. Eine kostet doppelt so viel wie ein Trank.
- **Tragen:** Der Held trägt höchstens 5 Leuchtfackeln, die Anzahl steht in der Anzeige neben den Tränken.
- **Wurf:** L wirft eine Fackel zum Mauszeiger, höchstens etwa 10 Felder weit.
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
- **Nachbarsuche:** Ein räumliches Raster ersetzt den heutigen Vergleich jeder Figur mit jeder. Das betrifft Zielsuche, Abstoßen, Geschosse und Flächen.
- **Wegfindung:** Sie reicht weiter als heute 40 Schritte, damit ferne Zombies nicht an Hindernissen hängen bleiben.
- **Leistung:** Ziel sind 60 FPS in Chrome auf dem Mac bei Grafikstufe Hoch. Gemessen wird mit `index.html?bench` in einer neuen Szene für Horden.

## Stand der Umsetzung

| Etappe | Inhalt | Stand |
|---|---|---|
| 1 | Karte, Kartenwahl, Rundenablauf, Gegnerstufe, Schlurfer, Schutzanzug, Häutling, Austrittspunkte, Obergrenze, Leistungsumbau | umgesetzt |
| 2 | übrige Zombie-Arten | offen |
| 3 | Endbosse | offen |
| 4 | Alarm-Autos, Benzinfässer, Tanklaster, Kofferräume, Beutekiste, Medikit, Leuchtfackeln, Pfeile, Geräusche, Blut | offen |

Messungen nach Etappe 1, Apple M5, Chrome ohne Fenster:

- **Leistung:** `?bench&scene=horde` bei 1280 × 720, Grafikstufe Hoch, 165 Zombies, die sterben und nachrücken. 60 FPS, Rechenzeit je Bild im Mittel 3,0 ms, P99 4,3 ms, längstes Bild 16,8 ms. Zum Vergleich: die Szene „dicht“ mit 60 Gegnern im Chaos-Sanktuarium liegt bei 2,7 ms.
- **Schwierigkeit:** die Kampagne aus `balance.js` (zwölf Ausrichtungen, Runden bis zum Tod, höchstens 25) auf beiden Karten, noch ohne Endbosse des Highways. Im Median schaffen beide Karten 6 Runden. Ausrichtungen mit Flächenschaden kommen auf dem Highway weiter (Frostnova 16 statt 6 Runden), reine Einzelziel-Angriffe fallen früher (Heiliger Blitz 2 statt 5).
- **Chaos-Sanktuarium unverändert:** Die Balance-Prüfung über alle 292 Fähigkeiten liefert dieselben Werte wie vor dem Highway.
