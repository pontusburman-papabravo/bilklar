# Skill Taxonomy v1 — svenskt B-körkort

Status: **Canonical**
Last updated: 2026-09-15

De nio huvudområdena: **Canonical**.
Enskilda skills: **Canonical** (38 st).
Taxonomy version: 1.

Detta är en produktmodell för praktisk privat övningskörning. Det är inte en juridisk omskrivning av Transportstyrelsens kursplan och inte seed-data för databasen.

---

## 1. Syfte

Körpasset v1 ska efter ett körpass kunna svara på:

> Hur självständigt klarade eleven detta?

med nivåerna `needs_help` | `with_support` | `independent`.

Taxonomin listar därför bara färdigheter som en handledare rimligen kan observera under privat övningskörning. Hela körkortsutbildningens kunskapsmål är ett större set. Det setet är medvetet inte målet här.

Senare kan listan seedas till `skills` (stabil identitet) och `skill_definitions` (titel, beskrivning, gruppering). DDL v1.2 omarbetas inte i detta dokument.

---

## 2. Canonical produktregler som inte ändras här

Följande är redan låsta i produktens grundmodell. Om något i taxonomin skulle krocka med dem ska taxonomin ge vika, inte reglerna.

| Regel | Innebörd |
| --- | --- |
| Skill ≠ Context | Skill = vad eleven utför. Context = under vilka förhållanden. |
| Observation ≠ Training Focus ≠ Drive Focus | Taxonomin beskriver *vad som kan observeras*, inte rekommendationsalgoritmen. |
| Append-only observationer | En ny bedömning skapar ny evidens, den skriver inte över historik. |
| Eleven äger resan | Skills tillhör elevens `driving_journey`, inte handledaren. |
| Multi-supervisor | Olika handledare bedömer samma skills. |
| Ingen extern integration i v1 | Inga antaganden om TABS, STR, SteerClear eller liknande. |
| Ingen teoriapp i v1 | Teoretiska kunskapsmål är inte v1-skills. |

### Canonical context (inte skills)

Environment: `residential` | `urban` | `rural` | `highway`

Light: `daylight` | `dusk_dawn` | `night`

Weather: `dry` | `rain` | `snow_ice` | `fog`

Traffic: `light` | `moderate` | `heavy`

Därför skapas inte skills som `roundabout_in_heavy_traffic` eller `night_driving_roundabout`.

Exempel: eleven kan vara `independent` på `roundabout_positioning` i `light` traffic, men ha mycket lite evidens för samma skill i `heavy` traffic.

---

## 3. Principer för v1-taxonomin

1. En skill ska gå att tap-to-rate på cirka 15–20 sekunder efter passet, tillsammans med de andra relevanta skills för just det passet.
2. `independent` ska låta naturligt. “Eleven klarade detta själv” ska vara en begriplig mening.
3. Skill-nyckeln är engelsk `snake_case`, stabil och versionsfri. UI-copy får ändras i `skill_definitions`.
4. Titlar är vardagssvenska som en förälder/handledare förstår, inte myndighetsspråk.
5. Hellre 35–45 observerbara skills än 120 atomära delmoment.
6. Cross-cutting förmågor (hastighet, avsökning, marginaler) modelleras en gång och bedöms i det context där de tränades.
7. Myndighetskrav inspirerar urvalet. De dikterar inte en 1:1-mappning mot de fyra kursplanemomenten.
8. Prerequisite-relationer är analys, inte datamodell. Ingen graf implementeras nu.

---

## 4. Officiella källor

Lästa 2026-09-14. Primärkällor, inte trafikskolebloggar eller körkortsappar.

| Källa | Vad den användes till |
| --- | --- |
| [TSFS 2011:20](https://www.transportstyrelsen.se/tsfs/TSFS%202011_20.pdf) — kursplan behörighet B | Officiella utbildningsmål. Coverage matrix. Vad som är färdighet vs teori/självvärdering. |
| [TSFS 2012:43](https://lagen.nu/tsfs/2012:43) — förarprov behörighet B, särskilt 11–19 §§ | Vad som faktiskt prövas på körprovet: säkerhetskontroll, manövrering, trafikbeteende. |
| [Planera övningskörningen](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/planera-ovningsskorningen/) | Planera vad/var, öva till självständighet, variera miljö/väder/tid, följ upp efter passet. |
| [Övningsköra](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/ovningskora/) och [Handledare](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/handledare/) | Ram för privat övningskörning. Inte skill-lista, men bekräftar B2C-privat som wedge. |
| [Råd till handledaren](https://www.transportstyrelsen.se/globalassets/global/publikationer-och-rapporter/vag/korkort/rad_till_handledaren_a5_2026-08-01.pdf) (TS, 2026-08-01) | Säkerhetskontroll före pass, manövrering först, därefter trafikmiljöer, spara halka/mörker tills grunden sitter. |
| [Så går körprovet till](https://www.trafikverket.se/korkort/ta-korkort/personbil-och-latt-lastbil/sa-gar-korprovet-till/) | Trafikverkets aktuella provpunkter (korsning, rondell, landsväg, motorväg, oskyddade trafikanter, m.m.). |
| [Riskutbildning för personbil](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/riskutbildning/riskutbildning-bil/) | Avgränsning: alkohol/trötthet och halka/hastighet i särförhållanden är obligatorisk extern utbildning, inte v1-skills. |

Sekundärkällor användes inte som urvalskriterium.

---

## 5. De nio huvudområdena (Canonical)

De är UX-grupperingar för “Vad tränar vi idag?”, inte Transportstyrelsens fyra kursplanemoment.

Ingen sammanslagning eller namnbyte föreslås i v1. De nio ytorna matchar hur en handledare planerar ett pass (bilen, blicken, placeringen, korsningen, staden, landsvägen, motorvägen, manövern, självständigheten).

| sortOrder | areaKey | Titel | Antal skills | Motivering att behålla |
| --- | --- | --- | --- | --- |
| 1 | `car_control` | Bilkontroll | 5 | TSFS 2011:20, 2 kap. Rutinmässig manövrering innan trafik. |
| 2 | `observation_interaction` | Blick & samspel | 4 | TSFS 2011:20, 3 kap. 2 §: avsökningsrutiner och samspel. |
| 3 | `positioning_lanes` | Placering & körfält | 4 | TSFS 2011:20, 3 kap. 2 §: anpassa placering. TSFS 2012:43, 19 §. |
| 4 | `intersections_roundabouts` | Korsningar & rondeller | 6 | Egna regelverk och beteenden. Hög träningsvolym privat. |
| 5 | `urban_traffic` | Stadstrafik | 3 | Trafikverket: tätort, oskyddade trafikanter, stillastående fordon. |
| 6 | `rural_roads` | Landsväg | 4 | Körprovet ska omfatta körning utanför tätort. |
| 7 | `highway` | Motorväg & större leder | 3 | TSFS 2012:43, 19 §: infart/avfart motorväg eller liknande. |
| 8 | `maneuvering` | Manövrering | 5 | TSFS 2012:43, 18 §: backning, vändning, parkering, lutning. |
| 9 | `independent_safe_driving` | Självständig & säker körning | 4 | Transportstyrelsen: målet är säkra, självständiga förare. |

**Totalt: 38 skills.**

Maskinläsbar lista: [skill-taxonomy-v1.json](skill-taxonomy-v1.json).

---

## 6. Skill-lista

Varje skill har `mvpPriority`:

- `core` — ska kunna bedömas i v1:s tap-to-rate när den är relevant för passet
- `supporting` — finns i taxonomin, men ska inte tränga ut kärnloopen

`likely_prerequisites` är analys, inte constraints.

`relevant_context` är metadata. Det är inte ett förbud mot andra värden.

### 6.1 Bilkontroll (`car_control`)

#### `car_control_pre_drive_check`

- **Titel:** Säkerhetskontroll
- **Beskrivning:** Eleven gör en enkel kontroll av bilen och körställning innan ni kör: ljus, däck, vätskor, speglar, stol, bälte.
- **Varför:** Varje körprov börjar här. Transportstyrelsen råder handledare att göra kontroll före varje övning.
- **Officiell grund:** TSFS 2011:20, 2 kap. 2 § p. 3; TSFS 2012:43, 14–17 §§; *Råd till handledaren*.
- **MVP-prioritet:** core
- **likely_prerequisites:** —
- **relevant_context:** Alla environment/light/weather. Traffic irrelevant.
- **Bedömning:** `independent` = eleven gör kontrollen själv utan att bli driftad genom listan.

#### `car_control_smooth_start_stop`

- **Titel:** Start och stannande
- **Beskrivning:** Eleven får i gång bilen och stannar den mjukt, utan ryck, rullning eller onödiga motorstopp.
- **Varför:** Första praktiska tröskeln. Transportstyrelsen: vänta med trafik tills eleven hanterar fordonet.
- **Officiell grund:** TSFS 2011:20, 2 kap. 2 § p. 4; Trafikverket: start från vägkant.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_pre_drive_check`
- **relevant_context:** Särskilt `residential` / `urban`, `weather` vid halt väglag, `light` natt (svårare dosering).
- **Bedömning:** `independent` = start och stopp utan verbal hjälp.

#### `car_control_braking`

- **Titel:** Bromsning
- **Beskrivning:** Eleven doserar bromsen så att farten sjunker i tid, mjukt i vanlig körning och bestämt när det behövs.
- **Varför:** TSFS kräver att eleven kan använda olika sätt att bromsa. I v1 bedöms kontrollerad broms i vanlig körning, inte halkbanans nödbroms.
- **Officiell grund:** TSFS 2011:20, 2 kap. 2 § p. 5; TSFS 2012:43, 18 § (effektiv bromsning är provmoment, se luckor).
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`
- **relevant_context:** Alla environment. `weather` och `traffic` höjer evidensvärdet.

#### `car_control_gear_shifting`

- **Titel:** Växling
- **Beskrivning:** Eleven väljer och byter växel i tid, utan att tappa uppmärksamheten från vägen. Gäller manuell låda.
- **Varför:** Standard-B utan villkor 78 prövas med manuell växellåda. Vid `transmission_scope = automatic_only` behandlas som `not_applicable` i progression — skillen tas inte bort.
- **Officiell grund:** TSFS 2011:20, 2 kap. 2 § p. 4; Trafikverket om villkor 78.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`
- **relevant_context:** Alla environment. Landsväg/motorväg prövar högre växlar.
- **Tveksam gräns:** Se avsnitt 10. Inte relevant för automat.

#### `car_control_speed_adaptation`

- **Titel:** Hastighetsanpassning
- **Beskrivning:** Eleven håller en fart som passar skylt, sikt, väglag och trafik — inte bara den skyltade maxfarten.
- **Varför:** Tvärgående kärnförmåga. Modelleras en gång, bedöms i det context där den övades. Ersätter inte landsväg/motorväg som egna miljöer.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 6; TSFS 2012:43, 19 § p. 3; Trafikverket: landsväg och tätort.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_braking`
- **relevant_context:** Alla dimensioner. Högt evidensvärde i `rural`/`highway`, `night`, `rain`/`snow_ice`, `heavy`.

### 6.2 Blick & samspel (`observation_interaction`)

#### `observation_mirror_routine`

- **Titel:** Spegelrutin
- **Beskrivning:** Eleven tittar i speglarna före fartsänkning, sväng, körfältsbyte och när något händer bakom.
- **Varför:** Konkret, träningsbar del av “goda avsökningsrutiner”. Lätt för handledare att se.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 3; TSFS 2012:43, 19 § p. 2.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`
- **relevant_context:** Särskilt `urban`/`highway`, `heavy` traffic.

#### `observation_blind_spot`

- **Titel:** Döda vinkeln
- **Beskrivning:** Eleven tar en kontrollblick över axeln innan körfältsbyte, start från kant och sväng där det behövs.
- **Varför:** Eget, vanligt fel. Inte samma sak som spegelrutin.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 3; Trafikverket: körfältsbyte.
- **MVP-prioritet:** core
- **likely_prerequisites:** `observation_mirror_routine`
- **relevant_context:** `urban`/`highway`, `moderate`/`heavy`.

#### `observation_signaling`

- **Titel:** Tecken och blinkers
- **Beskrivning:** Eleven visar avsikt i tid — blinkers, och ibland tecken med hand — och släcker när momentet är klart.
- **Varför:** Samspel mer än blick. Klassiskt fel i rondellutfart och landsvägssväng.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 2–3; Trafikverket: cirkulationsplats, körfältsbyte, sväng från landsväg.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`
- **relevant_context:** Alla environment. Extra synligt i `urban` och vid rondell.

#### `observation_scanning`

- **Titel:** Avsökning
- **Beskrivning:** Eleven letar långt fram, åt sidorna och efter det som kan hända — inte bara på bilen framför.
- **Varför:** Samlar generell avsökning och tidig upptäckt. `observation_anticipation` slogs ihop hit (se review).
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 3, 7–8; TSFS 2012:43, 19 § p. 1–2.
- **MVP-prioritet:** core
- **likely_prerequisites:** `observation_mirror_routine`
- **relevant_context:** Alla. Särskilt `urban`, `dusk_dawn`/`night`, `fog`, `heavy`.

### 6.3 Placering & körfält (`positioning_lanes`)

#### `positioning_road_position`

- **Titel:** Placering på vägen
- **Beskrivning:** Eleven ligger rätt i körfältet — inte för nära kant, mittlinje, parkerade bilar eller mötande.
- **Varför:** Grundplacering syns i nästan varje pass.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 6; TSFS 2012:43, 19 § p. 5.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`
- **relevant_context:** Alla environment. `rural` möte och `urban` parkerade bilar höjer värdet.

#### `positioning_lane_selection`

- **Titel:** Val av körfält
- **Beskrivning:** Eleven väljer körfält efter vart hen ska, inte efter “alla andra ligger här”.
- **Varför:** Eget provmoment när flera fält går åt samma håll.
- **Officiell grund:** TSFS 2012:43, 19 §; Trafikverket: körning i körfält.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_road_position`, `observation_scanning`
- **relevant_context:** Främst `urban` och `highway`. Traffic `moderate`/`heavy`.

#### `positioning_lane_change`

- **Titel:** Körfältsbyte
- **Beskrivning:** Eleven planerar bytet, speglar, blinkar, tar döda vinkeln och byter med avstånd till andra.
- **Varför:** Sätter ihop blick, tecken och placering i ett observerbart moment.
- **Officiell grund:** Trafikverket: körfältsbyte; TSFS 2012:43, 19 §.
- **MVP-prioritet:** core
- **likely_prerequisites:** `observation_mirror_routine`, `observation_blind_spot`, `observation_signaling`, `positioning_road_position`
- **relevant_context:** `urban`/`highway`, `moderate`/`heavy`.

#### `positioning_turning`

- **Titel:** Sväng
- **Beskrivning:** Eleven närmar sig, placerar sig och spårar genom svängen utan att skära eller svänga för vitt.
- **Varför:** Placering i sväng är ett beteende. Reglerna i korsningen är andra skills. `intersections_turning` togs bort som dublett.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 6; Trafikverket: gatukorsning, sväng från landsväg.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_road_position`, `observation_signaling`, `car_control_speed_adaptation`
- **relevant_context:** `urban`/`rural`. `weather` vid halt.

### 6.4 Korsningar & rondeller (`intersections_roundabouts`)

#### `intersections_right_hand_rule`

- **Titel:** Högerregeln
- **Beskrivning:** Eleven känner igen korsningar utan väjningsmärke och lämnar företräde åt höger när det krävs.
- **Varför:** Svensk särregel. Vanlig i bostadsområden. Inte samma sak som skyltad väjningsplikt.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 2; Trafikverket: gatukorsning.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `observation_scanning`
- **relevant_context:** Främst `residential`/`urban`, `light`/`moderate`.

#### `intersections_give_way`

- **Titel:** Väjningsplikt och stopp
- **Beskrivning:** Eleven stannar eller lämnar företräde när märken, linjer eller sikt kräver det, och kör ut först när luckan räcker.
- **Varför:** Skyltad väjningsplikt och stopplikt är ett praktiskt paket. Handledare skiljer sällan dem som två ratings.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 2; TSFS 2012:43, 19 § färd i vägkorsning.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`, `observation_scanning`
- **relevant_context:** `urban`/`rural`. Traffic och sikt (`light`/`weather`) är evidens.

#### `intersections_traffic_lights`

- **Titel:** Trafikljus
- **Beskrivning:** Eleven anpassar farten mot ljuset, är beredd på skifte och hamnar inte i korsningen på rött.
- **Varför:** Eget provmoment. Kräver timing mer än bara “kunna färgerna”.
- **Officiell grund:** Trafikverket: signalerande korsning; TSFS 2012:43, 19 § p. 2.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `observation_scanning`
- **relevant_context:** `urban`. Traffic `moderate`/`heavy`.

#### `roundabout_entry`

- **Titel:** Infart i rondell
- **Beskrivning:** Eleven sänker farten, lämnar företräde åt trafiken i cirkulationen och tar en lucka utan att stanna i onödan.
- **Varför:** Annat beteende än placering inne i rondellen eller utfart.
- **Officiell grund:** TSFS 2012:43, 19 § cirkulationsplats; Trafikverket: cirkulationsplats.
- **MVP-prioritet:** core
- **likely_prerequisites:** `intersections_give_way`, `observation_scanning`, `car_control_speed_adaptation`
- **relevant_context:** Främst `urban`. Traffic är den viktiga dimensionen.

#### `roundabout_positioning`

- **Titel:** Placering i rondell
- **Beskrivning:** Eleven väljer rätt läge i cirkulationen, särskilt i flerfältsrondell, och håller spåret utan att skära.
- **Varför:** Skilt från infart. Vanligt fel i större svenska rondeller.
- **Officiell grund:** Trafikverket: cirkulationsplats (placering); TSFS 2012:43, 19 §.
- **MVP-prioritet:** core
- **likely_prerequisites:** `roundabout_entry`, `positioning_road_position`
- **relevant_context:** `urban`. Traffic `moderate`/`heavy` i flerfältsrondell.
- **Tveksam gräns:** Review kan slå ihop med `roundabout_entry`. Behålls tills vidare för att de är olika praktiska fel.

#### `roundabout_exit`

- **Titel:** Utfart ur rondell
- **Beskrivning:** Eleven visar tecken i tid, byter till ytterläge om det behövs och lämnar rondellen utan att störa andra.
- **Varför:** Missat blinkers ut är ett av de vanligaste handledarkommentarerna.
- **Officiell grund:** Trafikverket: cirkulationsplats (tecken, avsikt); TSFS 2012:43, 19 §.
- **MVP-prioritet:** core
- **likely_prerequisites:** `roundabout_positioning`, `observation_signaling`
- **relevant_context:** `urban`. Alla traffic-nivåer.

### 6.5 Stadstrafik (`urban_traffic`)

#### `urban_vulnerable_road_users`

- **Titel:** Oskyddade trafikanter
- **Beskrivning:** Eleven upptäcker gående, cyklister och barn i tid och anpassar fart, lucka och ögonkontakt.
- **Varför:** Trafikverket behandlar oskyddade trafikanter som ett paket. Separata gång- och cykel-skills slogs ihop.
- **Officiell grund:** TSFS 2012:43, 19 § (övergångsställe, cykelöverfart, oskyddade); Trafikverket: oskyddade trafikanter.
- **MVP-prioritet:** core
- **likely_prerequisites:** `observation_scanning`, `car_control_speed_adaptation`
- **relevant_context:** `residential`/`urban`. `dusk_dawn`/`night` och `heavy` höjer evidensvärdet.

#### `urban_passing_stationary`

- **Titel:** Passera stillastående fordon
- **Beskrivning:** Eleven sänker farten och lämnar lucka när hen passerar parkerade bilar, buss i hållplats eller andra stillastående hinder.
- **Varför:** Ersätter den mer teoretiska kandidaten `urban_public_transport`. Matchar Trafikverkets provpunkt.
- **Officiell grund:** TSFS 2012:43, 19 §; Trafikverket: passerande av stillastående fordon.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_road_position`, `observation_scanning`
- **relevant_context:** `urban`. Traffic `moderate`/`heavy`.

#### `urban_tight_spaces`

- **Titel:** Trånga gator
- **Beskrivning:** Eleven tar sig fram där det är smalt — bilar på båda sidor, mötande i villagata — utan att skrapa eller frysa.
- **Varför:** Vanlig svensk bostadsträning. Inte samma sak som landsvägsmote.
- **Officiell grund:** TSFS 2011:20, 3 kap. 1–2 §§ (olika trafikmiljöer); Trafikverket: körning i tätort.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_road_position`, `car_control_smooth_start_stop`
- **relevant_context:** `residential`/`urban`. `light` traffic först, sedan `moderate`.

### 6.6 Landsväg (`rural_roads`)

#### `rural_joining_and_leaving`

- **Titel:** Infart och avfart på landsväg
- **Beskrivning:** Eleven kommer ut på, och svänger av från, en mer högtrafikerad landsväg med rätt fart, placering och tecken.
- **Varför:** Saknades i kandidatlistan. Trafikverket har egna provpunkter för infart till och sväng från landsväg.
- **Officiell grund:** Trafikverket: infart till landsväg, sväng från landsväg; TSFS 2012:43, 19 §.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `observation_signaling`, `intersections_give_way`, `positioning_turning`
- **relevant_context:** `rural`. Traffic och `weather` är evidens.

#### `rural_curves`

- **Titel:** Kurvor på landsväg
- **Beskrivning:** Eleven läser kurvan, sänker före, placerar sig och gasar ut utan att skära eller bromsa mitt i.
- **Varför:** Eget landsvägsbeteende. Inte bara “hastighet + rural context”.
- **Officiell grund:** Trafikverket: smal och/eller krokig väg; TSFS 2011:20, 3 kap. 2 § p. 6–7.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `positioning_road_position`
- **relevant_context:** `rural`. `weather` (`rain`/`snow_ice`) och `dusk_dawn`/`night`.

#### `rural_meeting_traffic`

- **Titel:** Möte
- **Beskrivning:** Eleven möter andra fordon med rätt lucka, fart och placering, även på smal väg.
- **Varför:** Trafikverket har möte som egen bedömning. Skilt från omkörning.
- **Officiell grund:** TSFS 2012:43, 19 § möte; Trafikverket: möte.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_road_position`, `car_control_speed_adaptation`
- **relevant_context:** `rural`. `weather` och smal väg.

#### `rural_passing`

- **Titel:** Omkörning
- **Beskrivning:** Eleven väljer plats, visar tecken, accelererar och går tillbaka utan att skära in för tidigt. Inkluderar att avstå.
- **Varför:** Högriskmoment. `independent` inkluderar att låta bli när det inte är säkert. Sällsynt i tidig träning — supporting så den inte tränger ut kärnloopen.
- **Officiell grund:** TSFS 2012:43, 19 § omkörning; Trafikverket: omkörning.
- **MVP-prioritet:** supporting
- **likely_prerequisites:** `observation_mirror_routine`, `observation_signaling`, `car_control_speed_adaptation`, `rural_meeting_traffic`
- **relevant_context:** `rural` (ibland `highway`). Traffic `light`/`moderate`. Sikt (`light`/`weather`).

### 6.7 Motorväg & större leder (`highway`)

#### `highway_merging`

- **Titel:** Påfart
- **Beskrivning:** Eleven använder accelerationsfältet, speglar, blinkar och smälter in i luckan utan att stanna på rampen.
- **Varför:** Eget motorvägsbeteende. Förutsätter fart, spegel och körfältsbyte.
- **Officiell grund:** TSFS 2012:43, 19 § infart på motorväg/motortrafikled; Trafikverket: motorväg.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `observation_mirror_routine`, `observation_blind_spot`, `positioning_lane_change`
- **relevant_context:** `highway`. Traffic är den tunga dimensionen. `weather`/`light` som evidens.

#### `highway_lane_discipline`

- **Titel:** Körfält på motorväg
- **Beskrivning:** Eleven håller höger när det går, använder vänster till omkörning och håller jämn placering i hög fart.
- **Varför:** Inte samma sak som urbant körfältsval. `highway_distance` togs bort; avstånd hör till `independent_safety_margins`.
- **Officiell grund:** TSFS 2012:43, 19 § val av körfält; Trafikverket: motorväg, motortrafikled.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_lane_selection`, `highway_merging`
- **relevant_context:** `highway`. Traffic `moderate`/`heavy`.

#### `highway_exiting`

- **Titel:** Avfart
- **Beskrivning:** Eleven planerar avfarten i tid, byter fält, blinkar och sänker farten på decelerationsfältet — inte ute i körfältet.
- **Varför:** Spegelvänt mot påfart. Vanligt att farten sänks för tidigt.
- **Officiell grund:** TSFS 2012:43, 19 § avfart från motorväg; Trafikverket: motorväg.
- **MVP-prioritet:** core
- **likely_prerequisites:** `highway_lane_discipline`, `observation_signaling`, `car_control_speed_adaptation`
- **relevant_context:** `highway`.

### 6.8 Manövrering (`maneuvering`)

#### `maneuver_reversing`

- **Titel:** Backning
- **Beskrivning:** Eleven backar rakt och i sväng med uppsikt, långsamt och utan att gissa sig fram.
- **Varför:** Minst ett backmoment krävs på körprovet.
- **Officiell grund:** TSFS 2012:43, 18 §; Trafikverket: backning.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`, `observation_scanning`
- **relevant_context:** Främst `residential`/`urban`. Traffic `light`. Light påverkar uppsikt.

#### `maneuver_hill_start`

- **Titel:** Start i lutning
- **Beskrivning:** Eleven startar i motlut och medlut utan att rulla okontrollerat bakåt eller framåt.
- **Varför:** Uttryckligt tilläggsmoment på körprovet. Vanlig tröskel med manuell låda.
- **Officiell grund:** TSFS 2012:43, 18 §; Trafikverket: start i lutning.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_smooth_start_stop`, `car_control_gear_shifting`
- **relevant_context:** Alla environment där lutning finns. `weather` vid halt.

#### `maneuver_parallel_parking`

- **Titel:** Parallellparkering
- **Beskrivning:** Eleven parkerar längs gatan, vanligen genom att backa in, med kontroll på hörn och trafik.
- **Varför:** Det moment svenska familjer övar mest. Hålls isär från övrig parkering.
- **Officiell grund:** TSFS 2012:43, 18 § parkering; Trafikverket: parkering i ficka längs väg.
- **MVP-prioritet:** core
- **likely_prerequisites:** `maneuver_reversing`, `observation_scanning`, `positioning_road_position`
- **relevant_context:** `urban`/`residential`. Traffic `light` först.
- **Tveksam gräns:** Review kan slå ihop med `maneuver_parking`.

#### `maneuver_parking`

- **Titel:** Övrig parkering
- **Beskrivning:** Eleven parkerar på tomt, vinkelplats eller annan ficka som inte är klassisk parallellparkering.
- **Varför:** Körprovet kan be om olika parkeringssätt. Inte samma motorik som längs gata.
- **Officiell grund:** TSFS 2012:43, 18 §; Trafikverket: parkering på parkeringsplats.
- **MVP-prioritet:** supporting
- **likely_prerequisites:** `maneuver_reversing`
- **relevant_context:** `urban`/`residential`. Traffic `light`.

#### `maneuver_turning_around`

- **Titel:** Vändning
- **Beskrivning:** Eleven väljer en säker plats och vänder — trepunkt, slinga eller motsvarande — med uppsikt.
- **Varför:** Eget provmoment. Kopplar till självständig körning när eleven kört fel.
- **Officiell grund:** TSFS 2012:43, 18 §; Trafikverket: vändning.
- **MVP-prioritet:** core
- **likely_prerequisites:** `maneuver_reversing`, `observation_scanning`
- **relevant_context:** `residential`/`urban`/`rural`. Traffic `light`.

### 6.9 Självständig & säker körning (`independent_safe_driving`)

#### `independent_route_planning`

- **Titel:** Köra mot mål
- **Beskrivning:** Eleven hittar fram mot ett mål själv — känt mål eller skyltat — och rättar till om hen kör fel.
- **Varför:** Trafikverkets “självständig körning mot mål”. Produktens sista kil före uppkörning.
- **Officiell grund:** TSFS 2012:43, 12 §; Trafikverket: självständig körning mot mål.
- **MVP-prioritet:** core
- **likely_prerequisites:** `positioning_lane_selection`, `observation_scanning`, `independent_risk_awareness`
- **relevant_context:** `urban`/`rural`. Traffic `moderate`/`heavy` är starkare evidens.

#### `independent_risk_awareness`

- **Titel:** Riskmedvetenhet
- **Beskrivning:** Eleven ser risker i tid och agerar tidigt — sänker, väntar, byter plan — utan att handledaren behöver peka.
- **Varför:** Samlar förutseende och proaktiva beslut. `observation_anticipation` och `independent_proactive_decisions` slogs ihop hit.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 7–9; TSFS 2012:43, 11 § och 19 § p. 1.
- **MVP-prioritet:** core
- **likely_prerequisites:** `observation_scanning`, `car_control_speed_adaptation`
- **relevant_context:** Alla. Högst evidensvärde i `heavy`, `night`, `snow_ice`, `fog`.

#### `independent_safety_margins`

- **Titel:** Säkerhetsmarginaler
- **Beskrivning:** Eleven håller avstånd framåt, åt sidorna och i tid — inte stötvis, inte tätt inpå.
- **Varför:** Eget kursplanemål. Ersätter `rural_speed_and_distance` och `highway_distance` som egna skills.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 4; TSFS 2012:43, 19 § p. 3.
- **MVP-prioritet:** core
- **likely_prerequisites:** `car_control_speed_adaptation`, `observation_scanning`
- **relevant_context:** Alla. Särskilt `highway` och `rural` i högre fart, `weather` halt.

#### `independent_eco_driving`

- **Titel:** Sparsam körning
- **Beskrivning:** Eleven planerar så att hen kan rulla, undvika onödiga stopp och hålla jämn fart utan att jaga växlar.
- **Varför:** Finns i både kursplan och körprov. Lätt att överge i v1-UI, därför `supporting`.
- **Officiell grund:** TSFS 2011:20, 3 kap. 2 § p. 5; TSFS 2012:43, 19 § p. 4; *Planera övningskörningen*; *Råd till handledaren*.
- **MVP-prioritet:** supporting
- **likely_prerequisites:** `car_control_speed_adaptation`, `car_control_gear_shifting`, `independent_route_planning`
- **relevant_context:** Alla. Tydligast i `urban` (stopp) och `rural`/`highway` (jämn fart).
- **Bedömning:** `independent` = eleven kör sparsamt utan att bli påmind. Inte “87 % miljövänlig”.

---

## 7. Coverage mot TSFS 2011:20

Målet är inte 100 % coverage. Målet är att veta vad vi modellerar.

| Officiellt målområde | Körpasset coverage | Kommentar |
| --- | --- | --- |
| 1 kap. fyra moment + teori/färdighet/självvärdering | Delvis | Vi modellerar praktisk färdighet. Teori och självvärdering är inte skills. |
| 2 kap. rutinmässig manövrering | Bilkontroll + Manövrering | Täcks praktiskt. |
| 2 kap. enklare kontroller av fordonet | `car_control_pre_drive_check` | Täcks. |
| 2 kap. olika sätt att bromsa | `car_control_braking` | Kontrollerad broms. Inte halkbanans nödbroms. |
| 2 kap. bilens konstruktion, skyddssystem, drivsystem | Ej v1 skill | Teori. |
| 2 kap. naturlagar, styrbarhet, väglagets fysik | Ej v1 skill | Teori / riskutbildning del 2. Väglag är Context. |
| 3 kap. goda avsökningsrutiner | Blick & samspel | Täcks. |
| 3 kap. samspel med andra trafikanter | Blick, korsningar, stad | Täcks som beteende. |
| 3 kap. tillämpa trafikregler | Korsningar, tecken, landsväg | Som körbeteende, inte som teorifrågor. |
| 3 kap. hastighetsanpassning | `car_control_speed_adaptation` | En skill, många context. |
| 3 kap. placering | Placering & körfält | Täcks. |
| 3 kap. säkerhetsmarginaler | `independent_safety_margins` | Täcks. |
| 3 kap. förutse händelseförlopp / identifiera risker | `independent_risk_awareness` + `observation_scanning` | Delvis observerbart. |
| 3 kap. sparsam körning | `independent_eco_driving` | Supporting. |
| 3 kap. första hjälpen och åtgärder vid olycka | Ej v1 skill | Teori. Inte körpass-loop. |
| 3 kap. redogöra för trafikregler i teorin | Ej v1 skill | Ingen teoriapp. |
| 4 kap. alkohol, droger, medicin, trötthet, stress | Ej v1 skill | Riskutbildning del 1. |
| 4 kap. val av färdmedel och ressällskap | Ej v1 skill | Teori / livsstil. |
| 4 kap. tid på dygnet, väglag, vägmiljö | Context, inte skills | Canonical: Skill ≠ Context. |
| 5 kap. grupptryck, livsstil, attityd, impulser | Ej v1 skill | Teori / riskutbildning. Utanför tap-to-rate. |
| Självvärdering i alla kapitel | Produktloop, inte skill | Efter passet: eleven får beskriva vad som gick bra. Inte en skill-rad. |
| Riskutbildning del 1 och 2 | Ej v1 skills | Obligatorisk extern utbildning. |
| Järnvägs-/spårvägskorsning | Ej egen skill | För sällsynt. Ingår i riskmedvetenhet när det händer. |
| Vägarbete, tunnel, i-/urstigning | Ej egna skills | Situationsbundna provpunkter. |
| Effektiv bromsning som provmoment | Ej egen skill | Osäkert att öva privat på allmän väg. Hör till riskutbildning del 2 / handledd bana. |

---

## 8. Medvetet utanför v1

- Teorikunskap: märken, stoppsträckor, alkoholfysiologi, last, barnstol.
- Riskutbildningens innehåll (alkohol/trötthet, halka i särförhållanden).
- Natt, dimma, halka som *skills*. Det är Context.
- GPS-telemetri, sensor-/AI-bedömning, röst-AI.
- Trafikskoleportal och externa observationer som canonical källa.
- Provrutter, marketplace, bokning.
- Falsk precision (“82 % körklar”).
- Prerequisite-graf i databasen.
- Fler än cirka 45 skills.

---

## 9. Kritisk review — vad som ändrades

Första kandidatlistan hade 44 nycklar. Efter genomgång mot källor, observerbarhet och tap-to-rate återstår 38.

### Borttagna kandidater

| Borttagen key | Skäl |
| --- | --- |
| `car_control_steering` | För atomär. Styrning syns i placering, kurvor och manövrer. `independent` på “styrning” blir tomt. |
| `observation_anticipation` | Handledare skiljer den inte från avsökning + riskmedvetenhet. Inbakad i `observation_scanning` och `independent_risk_awareness`. |
| `intersections_turning` | Dubblett av `positioning_turning`. Korsnings-skills = regler. Sväng = placering. |
| `urban_pedestrian_awareness` | Slogs ihop med cyklister till `urban_vulnerable_road_users`. Trafikverket behandlar oskyddade som ett paket. |
| `urban_cyclist_awareness` | Samma sammanslagning. |
| `urban_public_transport` | För teoretisk. Ersatt av observerbara `urban_passing_stationary`. |
| `urban_street_parking` | Context + `maneuver_parallel_parking`. |
| `rural_speed_and_distance` | Skill + Context-brott. Hastighet och avstånd finns redan som `car_control_speed_adaptation` och `independent_safety_margins`. |
| `highway_distance` | Samma brott. Avstånd på motorväg är samma skill i `highway`-context. |
| `independent_proactive_decisions` | Semantiskt samma som riskmedvetenhet för en förälder efter 20 sekunder. |

### Tillagda

| Ny key | Skäl |
| --- | --- |
| `car_control_pre_drive_check` | TSFS 2011:20, 2 kap. 2 § p. 3; varje körprov; *Råd till handledaren*. |
| `rural_joining_and_leaving` | Trafikverkets infart till / sväng från landsväg. Vanlig svensk 70–90-träning. |
| `urban_vulnerable_road_users` | Sammanslagen ersättare för gång + cykel. |
| `urban_passing_stationary` | Ersätter kollektivtrafik-kandidaten med Trafikverkets provpunkt. |

### Kvar efter andra passet, medvetet tunna ytor

- **Stadstrafik har 3 skills.** Medvetet. Mycket av “stad” är korsning, blick och placering.
- **Motorväg har 3 skills.** Avstånd lyftes till säkerhetsmarginaler.
- **Korsningar & rondeller har 6.** Största gruppen. Motiverat av svensk regelbild och träningsvolym, men första gruppen att skära i review.
- **Manövrering har 5.** Två parkerings-skills är den tydligaste övervikten.

---

## 10. Final review (2026-09-15) — Canonical

Granskning utan blocker. Taxonomin är **Canonical** med `taxonomyVersion: 1`.

| Fråga | Beslut | Motivering |
| --- | --- | --- |
| `car_control_gear_shifting` | Behåll | Kompatibel med `automatic_only` via `transmission_scope` på journey → `not_applicable` i progression |
| `rural_passing` | **Ändrad till supporting** | Omkörning är sällsynt i tidig träning; `rural_meeting_traffic` täcker det vanligare mötet |
| `maneuver_parallel_parking` vs `maneuver_parking` | Behåll separat | Två ratings ger verkligt produktvärde — familjer övar parallellparkering mest, körprovet kan kräva annan typ |
| Tre rondell-skills | Behåll alla tre | Handledare bedömer rimligen infart, placering och utfart separat; vanliga fel är olika |
| `car_control_pre_drive_check` | Behåll som skill | Observerbar före varje pass; checklista utanför skill-grafen skulle splittra tap-to-rate |

### Kvarvarande observationer (ej blocker)

- **`independent_eco_driving`** — supporting. Officiellt krav men sällan prioriterad efter pass.
- **Järnvägskorsning och vägarbete** — inga egna skills. Kan läggas till senare.
- **Effektiv bromsning** — provkrav men olämplig som privat övning. Inte v1-skill.

---

## 11. Rekommenderade prerequisite-relationer

Ingen graf ska implementeras nu. Detta är underlag till en senare Skill Graph.

Kärnstig:

```text
car_control_pre_drive_check
  → car_control_smooth_start_stop
    → car_control_braking
    → car_control_gear_shifting
      → car_control_speed_adaptation
      → maneuver_hill_start
```

Blick före sammansatta moment:

```text
observation_mirror_routine → observation_blind_spot
observation_mirror_routine → observation_scanning
observation_signaling + positioning_road_position → positioning_turning
observation_* + positioning_road_position → positioning_lane_change
```

Trafik efter kontroll:

```text
speed_adaptation + scanning → intersections_right_hand_rule
                                intersections_give_way
                                intersections_traffic_lights
give_way + scanning → roundabout_entry → roundabout_positioning → roundabout_exit
```

Miljöer:

```text
positioning + scanning + speed → urban_vulnerable_road_users
                                 urban_tight_spaces
give_way + turning + speed → rural_joining_and_leaving
speed + road_position → rural_curves
                        rural_meeting_traffic → rural_passing
lane_change + speed + mirrors → highway_merging
  → highway_lane_discipline → highway_exiting
```

Manöver och självständighet:

```text
smooth_start_stop + scanning → maneuver_reversing
  → maneuver_parallel_parking
  → maneuver_parking
  → maneuver_turning_around
scanning + speed → independent_risk_awareness
                   independent_safety_margins
lane_selection + risk_awareness → independent_route_planning
speed + route_planning → independent_eco_driving
```

Minsta slutsats för framtida graf: **riktade relationer behövs**. Annars kan recommendation engine föreslå motorväg innan spegelrutin och fart sitter. Bygg inte tabellen ännu.

---

## 12. Relaterade dokument

- [Data model](data-model.md) — canonical DDL
- [Progression model](progression-model.md) — read model, inte DB-state
- [MVP v1](../product/mvp-v1.md)
- [Database](../architecture/database.md)

---

## 13. Nästa steg

- Seed `skills` / `skill_definitions` från [skill-taxonomy-v1.json](skill-taxonomy-v1.json)
- Första end-to-end-flödet (onboarding → drive → observations)
- Progression engine och recommendation logic i kod
