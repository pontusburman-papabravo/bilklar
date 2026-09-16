# Bilklar — Kravspecifikation v1

**Status:** Canonical  
**Datum:** 2026-09-16  
**Produkt:** Bilklar  
**Omfattning:** Privat övningskörning, svenskt B-körkort  
**Källa:** Samlad vy av den kanoniska dokumentationen i detta repo

Detta dokument är den **publika, samlade kravspecifikationen** för Bilklar v1. De enskilda källfilerna under `docs/` förblir canonical för produkt- och arkitekturarbete. Den här filen finns för att kunna delas som **en enda länk**.

---

## Innehåll

1. [Vision och syfte](#1-vision-och-syfte)
2. [Omfattning](#2-omfattning)
3. [Aktörer](#3-aktörer)
4. [Produktprinciper](#4-produktprinciper)
5. [Funktionella krav](#5-funktionella-krav)
6. [Domänmodell](#6-domänmodell)
7. [Skill Taxonomy v1](#7-skill-taxonomy-v1)
8. [Datamodell](#8-datamodell)
9. [Progression och rekommendation](#9-progression-och-rekommendation)
10. [Integritetskrav](#10-integritetskrav)
11. [Tekniska beslut](#11-tekniska-beslut)
12. [Källhänvisningar](#12-källhänvisningar)

---

## 1. Vision och syfte

Bilklar är en **B2C-app för svensk privat övningskörning** som håller ihop elevens träning mellan en eller flera handledare.

### 1.1 Kärnfrågor

Varje körpass och varje planeringssession ska kunna svara på:

> **Vad ska vi träna på idag?**

> **Hur gick det, och vad bör vi träna på nästa gång?**

### 1.2 Långsiktig vision

Eleven äger ett **Driving Passport** — en elevcentrerad, portabel körkortsresa som följer eleven oavsett vilka handledare, bilar eller miljöer som ingår.

v1 är strikt begränsad till **privat övningskörning** utan trafikskola, externa API:er eller teori.

### 1.3 Vad Bilklar inte är

- Inte en teoriapp
- Inte en AI-trafiklärare
- Inte en trafikskoleportal
- Inte ett verktyg som visar falsk precision som "87 % uppkörningsklar"

---

## 2. Omfattning

v1 är **privat övningskörning för svenskt B-körkort** — inget mer, inget mindre.

| Ingår i v1 | Ingår inte i v1 |
| --- | --- |
| Elevägd körkortsresa (`driving_journey`) | Trafikskoleintegration |
| Flera handledare (first-class) | Teori och kunskapsfrågor |
| QR/länk-handoff till handledare | AI-trafiklärare |
| Guest actor innan full autentisering | GPS-telemetri |
| Tap-to-rate efter körpass | Betalning |
| Training Focus och Drive Focus | Progression-UI med falsk precision |
| Append-only observations | Externa API:er (TABS, STR, m.m.) |
| Manuell/automat per resa | Native app (Capacitor) |
| Valfri drive-context (miljö, ljus, väder, trafik) | Obligatorisk context-registrering i första flödet |

### 2.1 Produktloopen

```text
Observations
    ↓
Progression Engine
    ↓
Recommendation Engine
    ↓
Training Focus
    ↓
Drive Focus
    ↓
Drive
    ↓
New Observations
```

### 2.2 Första end-to-end-flödet (implementerat)

1. Elev skapar journey
2. Elev delar QR/länk
3. Handledare (guest eller befintlig user) accepterar
4. Elev och handledare planerar Drive Focus (2–3 moment)
5. Körpass genomförs
6. Handledare registrerar observations
7. System visar recap och föreslår Training Focus (recommendation engine i kod)

---

## 3. Aktörer

| Aktör | Äger resan | Får administrera | Får bedöma körpass | Autentisering i v1 |
| --- | --- | --- | --- | --- |
| **Elev (student)** | Ja | Ja — inbjudningar | Nej (handledaren bedömer i vertical slice) | Display name + session |
| **Handledare (supervisor)** | Nej | Nej | Ja, för körpass där hen är tilldelad handledare | Guest actor via invitation, sedan samma `user_id` |
| **Trafiklärare (`driving_instructor`)** | Nej | — | — | Finns i datamodellen, **ingen v1-feature** |

Regler:

- `driving_journeys.student_user_id` är canonical student.
- Studenten är **inte** duplicerad som `journey_collaborator`.
- Flera handledare är first-class. Samma elev, flera supervisors — utan att duplicera data eller byta `user_id`.
- Handledaren ska nästan aldrig administrera. QR/länk ger lågfriktions-handoff.

---

## 4. Produktprinciper

Canonical v1-principer. Dessa är låsta tills ett ADR explicit ändrar dem.

### Elev och handledare

1. **Eleven äger körkortsresan.** `driving_journey` tillhör eleven. Handledare deltar, administrerar inte.
2. **Flera handledare är first-class.**
3. **Handledaren ska nästan aldrig administrera.**
4. **Guest actor får finnas innan full autentisering.** Scan → stable `user_id` → delta → claim senare, utan merge.

### Domän och data

5. **Skill ≠ Context.** Skill = vad eleven utför. Context = under vilka förhållanden.
6. **Observation ≠ Training Focus ≠ Drive Focus.** Tre separata begrepp.
7. **Observationer är append-only** för normal produktkod. Korrigering = ny observation med `supersedes_observation_id`.
8. **Progression är beräknat read model.** Lagras inte som canonical DB-state.
9. **Recommendation logic ligger i kod**, inte som canonical DB-state.

### Produkt och marknad

10. **B2C-first.** Privat övningskörning är wedge. Ingen extern integration krävs för launch.
11. **Bilklar fungerar utan trafikskola och externa API:er.**
12. **Bilklar är inte teoriapp** och **inte AI-trafiklärare**.
13. **Bilklar visar inte falsk precision** som "87 % uppkörningsklar".

### Teknik

14. **Actor ≠ authentication.** `users` är person/actor. `auth_identities` är hur personen autentiseras.
15. **PostgreSQL 15+** som canonical databas.

---

## 5. Funktionella krav

Kraven nedan beskriver det kanoniska v1-flödet. Där vertical slice redan finns i koden anges det.

### FR-1 Elev skapar körkortsresa

| Fält | Krav |
| --- | --- |
| ID | FR-1 |
| Aktör | Elev |
| Status | Implementerat |
| Beskrivning | En ny elev anger sitt namn och får en `driving_journey` med `licence_type = B`. |
| Session | Servern skapar en stable `user_id` och sätter session-cookie. Identity skickas inte in som betrodd klientdata. |
| Efter steg | Eleven landar på sin journey-sida och kan bjuda in handledare. |

### FR-2 Inbjudan via länk och QR

| Fält | Krav |
| --- | --- |
| ID | FR-2 |
| Aktör | Elev |
| Status | Implementerat |
| Beskrivning | Eleven skapar en invitation. Systemet visar en delbar URL och QR-kod. |
| Token | Lagras endast som hash (`token_hash`). Plain token lämnar servern i URL:en, inte i databasen. |
| Expiry | Invitation har `expires_at` och status `pending` / `accepted` / `expired` / `revoked`. |
| Begränsningar | Eleven får inte bjudas in som sin egen handledare. Samma user får inte förekomma två gånger i samma journey. |

### FR-3 Handledare ansluter som guest

| Fält | Krav |
| --- | --- |
| ID | FR-3 |
| Aktör | Handledare |
| Status | Implementerat |
| Beskrivning | Handledare öppnar länken, anger namn och ansluter. En guest actor med stable `user_id` skapas (eller befintlig session återanvänds). |
| Accept | Atomic conditional UPDATE: exakt en caller vinner. Replay skyddas av unik `token_hash`. |
| Efter accept | Handledare blir `journey_collaborator` med `role = supervisor` och `status = active`. |
| Senare claim | Samma `user_id` behålls när auth läggs till via `auth_identities`. Ingen normal guest→registered-merge. |

### FR-4 Planera Drive Focus

| Fält | Krav |
| --- | --- |
| ID | FR-4 |
| Aktör | Elev eller handledare med journey-access |
| Status | Implementerat |
| Beskrivning | Innan körpasset väljs **2–3 skills** som Drive Focus — svaret på “Vad tränar ni på idag?”. |
| UI | Räknare “N av 3 valda”. Fler än 3 val ska inte gå att göra. Färre än 2 ska inte gå att starta. |
| Server | Samma 2–3-regel valideras i service layer. |
| Flera handledare | Om eleven har mer än en aktiv handledare ska eleven välja vilken som kör med dem. |
| Aktivt pass | Finns redan ett pågående körpass ska användaren tas dit, inte starta ett nytt. |

### FR-5 Genomföra körpass

| Fält | Krav |
| --- | --- |
| ID | FR-5 |
| Aktör | Elev och tilldelad handledare |
| Status | Implementerat |
| Beskrivning | Ett `drive` skapas med valt Drive Focus. Under passet visas de valda momenten. |
| Avsluta | Eleven eller den tilldelade handledaren får avsluta. Andra handledare får inte avsluta. |
| Context | Drive-context (miljö, ljus, väder, trafik) är **valfri** i v1. Första flödet ska inte tvinga handledaren att ange den. |

### FR-6 Tap-to-rate efter körpass

| Fält | Krav |
| --- | --- |
| ID | FR-6 |
| Aktör | Tilldelad handledare |
| Status | Implementerat |
| Beskrivning | Efter avslutat pass bedömer handledaren **endast Drive Focus-skills** med tre nivåer. |
| Nivåer (UI) | Behöver hjälp / Med påminnelse / Utan hjälp |
| Behörighet | Bara `drive.supervisor_user_id`. Andra handledare och eleven bedömer inte i detta flöde. |
| En gång | En handledarbedömning per körpass. Redan bedömt körpass går till recap. |
| Tid | Bedömningen ska gå att göra på cirka 15–20 sekunder tillsammans för de valda momenten. |

### FR-7 Recap och nästa träning

| Fält | Krav |
| --- | --- |
| ID | FR-7 |
| Aktör | Elev och handledare |
| Status | Implementerat |
| Beskrivning | Efter bedömning visas “Så gick det” (recap per bedömt moment) och “Nästa gång” (rekommendationer). |
| Rekommendation | Högst 3 förslag. Prioritet: aktiv Training Focus → `needs_help` → `with_support` → core skills utan evidens. |
| Transmission | Vid `automatic_only` ska `car_control_gear_shifting` inte rekommenderas. |

### FR-8 Navigering till rätt journey

| Fält | Krav |
| --- | --- |
| ID | FR-8 |
| Aktör | Inloggad user |
| Status | Implementerat |
| Beskrivning | Root `/` ska skicka en user med aktiv journey till den journeyn — även handledare med exakt en aktiv journey. |

### FR-9 Flera handledare utan dataflytt

| Fält | Krav |
| --- | --- |
| ID | FR-9 |
| Aktör | System |
| Status | Specificerat och delvis implementerat |
| Beskrivning | Handledare kan lämnas/ersättas utan att observations, focus eller drives flyttas. All journey-data tillhör eleven. |

### FR-10 Guest claim utan merge

| Fält | Krav |
| --- | --- |
| ID | FR-10 |
| Aktör | Handledare |
| Status | Specificerat, auth-providers inte byggda |
| Beskrivning | Guest kan senare claima Apple, Google, passkey eller e-post magic link utan att byta `user_id`. |
| Undantag | Claim av identity som redan hör till annan user är ett separat reconciliation-fall och ingår inte i första vertical slice. |

---

## 6. Domänmodell

### 6.1 Tre separata begrepp

| Begrepp | Fråga | Tabell |
| --- | --- | --- |
| **Observation** | Vad visade eleven att hen kunde? | `drive_observations` |
| **Training Focus** | Vad bör eleven träna på framåt? | `training_focus_items` |
| **Drive Focus** | Vad avsåg just detta körpass att träna? | `drive_focus_skills` |

En observation skapar inte automatiskt Training Focus. Drive Focus kan länka till en befintlig Training Focus-rad, men måste inte.

### 6.2 Assessment levels

| Kod | UI-etikett | Betydelse |
| --- | --- | --- |
| `needs_help` | Behöver hjälp | Handledaren måste ingripa eller instruera aktivt |
| `with_support` | Med påminnelse | Eleven klarar momentet med viss guidning eller påminnelse |
| `independent` | Utan hjälp | Eleven utför momentet självständigt och säkert |

`independent` ska låta naturligt. “Eleven klarade detta själv” ska vara en begriplig mening.

### 6.3 Skill ≠ Context

Context är **inte** skills. Skapa inte skills som `roundabout_in_heavy_traffic`.

| Dimension | Värden |
| --- | --- |
| Environment | `residential`, `urban`, `rural`, `highway` |
| Light | `daylight`, `dusk_dawn`, `night` |
| Weather | `dry`, `rain`, `snow_ice`, `fog` |
| Traffic | `light`, `moderate`, `heavy` |

Context lagras på `drives` och kan overridas per observation via `context_override`.

Exempel: eleven kan vara `independent` på `roundabout_positioning` i `light` traffic, men ha mycket lite evidens för samma skill i `heavy` traffic.

### 6.4 Transmission scope

Varje `driving_journey` anger om resan är `unknown`, `manual` eller `automatic_only`.

| Scope | Effekt på `car_control_gear_shifting` |
| --- | --- |
| `unknown` | Skill kan bedömas normalt |
| `manual` | Skill kan bedömas normalt |
| `automatic_only` | Skill behandlas som `not_applicable` i progression — inte borttagen från taxonomin |

---

## 7. Skill Taxonomy v1

**Status:** Canonical  
**Taxonomy version:** 1  
**Antal skills:** 38  
**Licensklass:** B

Detta är en produktmodell för praktisk privat övningskörning. Det är inte en juridisk omskrivning av Transportstyrelsens kursplan.

De nio huvudområdena är UX-grupperingar för “Vad tränar vi idag?”, inte Transportstyrelsens fyra kursplanemoment.

| sortOrder | areaKey | Titel | Antal skills |
| --- | --- | --- | --- |
| 1 | `car_control` | Bilkontroll | 5 |
| 2 | `observation_interaction` | Blick & samspel | 4 |
| 3 | `positioning_lanes` | Placering & körfält | 4 |
| 4 | `intersections_roundabouts` | Korsningar & rondeller | 6 |
| 5 | `urban_traffic` | Stadstrafik | 3 |
| 6 | `rural_roads` | Landsväg | 4 |
| 7 | `highway` | Motorväg & större leder | 3 |
| 8 | `maneuvering` | Manövrering | 5 |
| 9 | `independent_safe_driving` | Självständig & säker körning | 4 |

`mvpPriority`:

- `core` — ska kunna bedömas i v1:s tap-to-rate när den är relevant för passet
- `supporting` — finns i taxonomin, men ska inte tränga ut kärnloopen

### 7.1 Bilkontroll (`car_control`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `car_control_pre_drive_check` | Säkerhetskontroll | core | Eleven gör en enkel kontroll av bilen och körställning innan ni kör: ljus, däck, vätskor, speglar, stol, bälte. |
| `car_control_smooth_start_stop` | Start och stannande | core | Eleven får i gång bilen och stannar den mjukt, utan ryck, rullning eller onödiga motorstopp. |
| `car_control_braking` | Bromsning | core | Eleven doserar bromsen så att farten sjunker i tid, mjukt i vanlig körning och bestämt när det behövs. |
| `car_control_gear_shifting` | Växling | core | Eleven väljer och byter växel i tid, utan att tappa uppmärksamheten från vägen. Gäller manuell låda. |
| `car_control_speed_adaptation` | Hastighetsanpassning | core | Eleven håller en fart som passar skylt, sikt, väglag och trafik — inte bara den skyltade maxfarten. |

### 7.2 Blick & samspel (`observation_interaction`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `observation_mirror_routine` | Spegelrutin | core | Eleven tittar i speglarna före fartsänkning, sväng, körfältsbyte och när något händer bakom. |
| `observation_blind_spot` | Döda vinkeln | core | Eleven tar en kontrollblick över axeln innan körfältsbyte, start från kant och sväng där det behövs. |
| `observation_signaling` | Tecken och blinkers | core | Eleven visar avsikt i tid — blinkers, och ibland tecken med hand — och släcker när momentet är klart. |
| `observation_scanning` | Avsökning | core | Eleven letar långt fram, åt sidorna och efter det som kan hända — inte bara på bilen framför. |

### 7.3 Placering & körfält (`positioning_lanes`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `positioning_road_position` | Placering på vägen | core | Eleven ligger rätt i körfältet — inte för nära kant, mittlinje, parkerade bilar eller mötande. |
| `positioning_lane_selection` | Val av körfält | core | Eleven väljer körfält efter vart hen ska, inte efter att alla andra ligger här. |
| `positioning_lane_change` | Körfältsbyte | core | Eleven planerar bytet, speglar, blinkar, tar döda vinkeln och byter med avstånd till andra. |
| `positioning_turning` | Sväng | core | Eleven närmar sig, placerar sig och spårar genom svängen utan att skära eller svänga för vitt. |

### 7.4 Korsningar & rondeller (`intersections_roundabouts`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `intersections_right_hand_rule` | Högerregeln | core | Eleven känner igen korsningar utan väjningsmärke och lämnar företräde åt höger när det krävs. |
| `intersections_give_way` | Väjningsplikt och stopp | core | Eleven stannar eller lämnar företräde när märken, linjer eller sikt kräver det, och kör ut först när luckan räcker. |
| `intersections_traffic_lights` | Trafikljus | core | Eleven anpassar farten mot ljuset, är beredd på skifte och hamnar inte i korsningen på rött. |
| `roundabout_entry` | Infart i rondell | core | Eleven sänker farten, lämnar företräde åt trafiken i cirkulationen och tar en lucka utan att stanna i onödan. |
| `roundabout_positioning` | Placering i rondell | core | Eleven väljer rätt läge i cirkulationen, särskilt i flerfältsrondell, och håller spåret utan att skära. |
| `roundabout_exit` | Utfart ur rondell | core | Eleven visar tecken i tid, byter till ytterläge om det behövs och lämnar rondellen utan att störa andra. |

### 7.5 Stadstrafik (`urban_traffic`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `urban_vulnerable_road_users` | Oskyddade trafikanter | core | Eleven upptäcker gående, cyklister och barn i tid och anpassar fart, lucka och ögonkontakt. |
| `urban_passing_stationary` | Passera stillastående fordon | core | Eleven sänker farten och lämnar lucka när hen passerar parkerade bilar, buss i hållplats eller andra stillastående hinder. |
| `urban_tight_spaces` | Trånga gator | core | Eleven tar sig fram där det är smalt — bilar på båda sidor, mötande i villagata — utan att skrapa eller frysa. |

### 7.6 Landsväg (`rural_roads`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `rural_joining_and_leaving` | Infart och avfart på landsväg | core | Eleven kommer ut på, och svänger av från, en mer högtrafikerad landsväg med rätt fart, placering och tecken. |
| `rural_curves` | Kurvor på landsväg | core | Eleven läser kurvan, sänker före, placerar sig och gasar ut utan att skära eller bromsa mitt i. |
| `rural_meeting_traffic` | Möte | core | Eleven möter andra fordon med rätt lucka, fart och placering, även på smal väg. |
| `rural_passing` | Omkörning | supporting | Eleven väljer plats, visar tecken, accelererar och går tillbaka utan att skära in för tidigt. Inkluderar att avstå. |

### 7.7 Motorväg & större leder (`highway`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `highway_merging` | Påfart | core | Eleven använder accelerationsfältet, speglar, blinkar och smälter in i luckan utan att stanna på rampen. |
| `highway_lane_discipline` | Körfält på motorväg | core | Eleven håller höger när det går, använder vänster till omkörning och håller jämn placering i hög fart. |
| `highway_exiting` | Avfart | core | Eleven planerar avfarten i tid, byter fält, blinkar och sänker farten på decelerationsfältet — inte ute i körfältet. |

### 7.8 Manövrering (`maneuvering`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `maneuver_reversing` | Backning | core | Eleven backar rakt och i sväng med uppsikt, långsamt och utan att gissa sig fram. |
| `maneuver_hill_start` | Start i lutning | core | Eleven startar i motlut och medlut utan att rulla okontrollerat bakåt eller framåt. |
| `maneuver_parallel_parking` | Parallellparkering | core | Eleven parkerar längs gatan, vanligen genom att backa in, med kontroll på hörn och trafik. |
| `maneuver_parking` | Övrig parkering | supporting | Eleven parkerar på tomt, vinkelplats eller annan ficka som inte är klassisk parallellparkering. |
| `maneuver_turning_around` | Vändning | core | Eleven väljer en säker plats och vänder — trepunkt, slinga eller motsvarande — med uppsikt. |

### 7.9 Självständig & säker körning (`independent_safe_driving`)

| Nyckel | Titel | Prioritet | Beskrivning |
| --- | --- | --- | --- |
| `independent_route_planning` | Köra mot mål | core | Eleven hittar fram mot ett mål själv — känt mål eller skyltat — och rättar till om hen kör fel. |
| `independent_risk_awareness` | Riskmedvetenhet | core | Eleven ser risker i tid och agerar tidigt — sänker, väntar, byter plan — utan att handledaren behöver peka. |
| `independent_safety_margins` | Säkerhetsmarginaler | core | Eleven håller avstånd framåt, åt sidorna och i tid — inte stötvis, inte tätt inpå. |
| `independent_eco_driving` | Sparsam körning | supporting | Eleven planerar så att hen kan rulla, undvika onödiga stopp och hålla jämn fart utan att jaga växlar. |

Maskinläsbar seed-input: [`docs/domain/skill-taxonomy-v1.json`](domain/skill-taxonomy-v1.json). Fullständig officiell grund per skill: [`docs/domain/skill-taxonomy.md`](domain/skill-taxonomy.md).

---

## 8. Datamodell

Implementerad i [`db/migrations/0001_initial.sql`](../db/migrations/0001_initial.sql).

### 8.1 Översikt

```text
users ←→ auth_identities
  │
  ├── driving_journeys (student_user_id)
  │     ├── journey_collaborators
  │     ├── journey_invitations
  │     ├── drives
  │     ├── training_focus_items
  │     ├── drive_focus_skills
  │     └── drive_observations
  │
skills ← skill_definitions (versionerad taxonomi)
```

### 8.2 Enums

| Enum | Värden |
| --- | --- |
| `account_state` | `guest`, `active`, `suspended`, `deleted` |
| `collaborator_role` | `supervisor`, `driving_instructor` |
| `collaborator_status` | `active`, `removed` |
| `invitation_status` | `pending`, `accepted`, `expired`, `revoked` |
| `assessment_level` | `needs_help`, `with_support`, `independent` |
| `observation_source` | `supervisor`, `student`, `system`, `external`, `driving_school` |
| `focus_source` | `student`, `supervisor`, `driving_school`, `system`, `external` |
| `focus_status` | `active`, `completed`, `dismissed` |
| `driving_environment` | `residential`, `urban`, `rural`, `highway` |
| `light_condition` | `daylight`, `dusk_dawn`, `night` |
| `weather_condition` | `dry`, `rain`, `snow_ice`, `fog` |
| `traffic_level` | `light`, `moderate`, `heavy` |
| `transmission_scope` | `unknown`, `manual`, `automatic_only` |
| `journey_status` | `active`, `completed`, `archived` |
| `auth_provider` | `guest`, `apple`, `google`, `passkey`, `email_magic_link` |

`driving_instructor`, `observation_source = driving_school` och `focus_source = driving_school` finns för framtida integration men används inte i v1.

### 8.3 Tabeller (kravnivå)

**`users`** — actor/person. Guest och registrerad delar samma modell. `id` är stable genom guest → registered.

**`auth_identities`** — sätt att autentisera en user. En user kan ha flera identities. Unik `(provider, provider_subject)`.

**`driving_journeys`** — elevägd resa. Studenten är inte collaborator. `licence_type` är `B` i v1.

**`journey_collaborators`** — unik `(journey_id, user_id)`.

**`journey_invitations`** — token endast hashad. DB CHECK: `accepted` kräver `accepted_at` + `accepted_by_user_id`; `pending` kräver att båda är NULL.

**`skills` / `skill_definitions`** — `skill_key` är permanent identitet. Definitioner är versionerad presentation (`taxonomy_version`, titel, area, `mvp_priority`).

**`drives`** — körpass. Context-fält nullable. `environment` default `{}` = inte registrerat.

**`training_focus_items`** — framåtblickande intent. Unik `(id, journey_id)`.

**`drive_focus_skills`** — plan för ett specifikt körpass. Unik `(drive_id, journey_id, skill_id)`.

**`drive_observations`** — append-only ledger. Unik `(id, journey_id)`.

Journey-isolering implementeras med **composite foreign keys**, t.ex. observation → drive inom samma journey.

---

## 9. Progression och rekommendation

Progression är ett **beräknat read model** — inte canonical DB-state.

```text
Observations (append-only ledger)
    ↓
Progression Engine (beräknar)
    ↓
Read model (per skill, per context, per journey)
    ↓
Recommendation Engine (i kod)
    ↓
Training Focus (persisted intent)
```

### 9.1 Vad som inte är progression

| Begrepp | Varför inte progression |
| --- | --- |
| Training Focus | Framåtblickande intent — separat entitet |
| Drive Focus | Plan för ett specifikt körpass — separat entitet |
| Prerequisite-graf | Analys i taxonomin, inte DB-constraint |

### 9.2 Recommendation v0 (implementerad)

Prioritetsordning, max 3 resultat, utan dubbletter:

1. Aktiva `training_focus_items`
2. Senaste icke-supersedade observation `needs_help`
3. Senaste icke-supersedade observation `with_support`
4. Core-skills utan evidens, i taxonomins `sort_order`

`car_control_gear_shifting` hoppas över vid `transmission_scope = automatic_only`.

---

## 10. Integritetskrav

| # | Invariant | Lagring |
| --- | --- | --- |
| 1 | Observation får inte peka på drive i annan journey | DB — composite FK |
| 2 | Drive focus får inte peka på focus item i annan journey | DB — composite FK |
| 3 | Observation får inte superseda observation i annan journey | DB — composite FK |
| 4 | Observation får inte superseda sig själv | DB — CHECK |
| 5 | Högst en observation får superseda en given observation | DB — unique index |
| 6 | Correction måste behålla samma `journey_id`, `drive_id`, `skill_id` | Service layer |
| 7 | Correction-chain får inte skapa cykel | Service layer |
| 8 | Supervisor på drive måste höra till journey | Service layer |
| 9 | `started_by_user_id` måste ha relation till journey | Service layer |
| 10 | Eleven får inte bjudas in som sin egen handledare | Service layer |
| 11 | Invitation får inte accepteras två gånger | Service layer — atomic UPDATE |
| 12 | Accepted invitation kräver accept-fält | DB — CHECK |
| 13 | Pending invitation får inte ha accept-fält | DB — CHECK |
| 14 | Expired/revoked invitation får inte användas | Service layer |
| 15 | Completed focus item ska ha `completed_at` | DB — CHECK |
| 16 | Active focus item ska normalt inte ha `completed_at` | DB — CHECK |
| 17 | Student observation → `observer_user_id = student_user_id` | Service layer |
| 18 | Supervisor observation → `observer_user_id` är aktiv supervisor | Service layer |
| 19 | Actor identity hämtas från server session, inte klientinput | Service layer |
| 20 | Drive Focus måste vara 2–3 skills | Service layer |
| 21 | Bara tilldelad handledare får bedöma körpasset | Service layer |
| 22 | Bara elev eller tilldelad handledare får avsluta körpasset | Service layer |

### 10.1 Observation source rules

| Source | Krav |
| --- | --- |
| `supervisor`, `student` | `observer_user_id` krävs |
| `system` | Ingen actor krävs |
| `external` | `external_source_ref` krävs |
| `driving_school` | `observer_user_id` ELLER `external_source_ref` krävs |

Authorization: `observer_user_id`, `started_by_user_id` och accepterande user vid invitation hämtas från serverns actor/session.

Normal produktkod ska **INSERT** — inte UPDATE/DELETE — på `drive_observations`. Privileged GDPR/admin-process får hantera legitim radering/anonymisering.

---

## 11. Tekniska beslut

| ADR | Beslut | Status |
| --- | --- | --- |
| [ADR-001](decisions/ADR-001-student-owned-journey.md) | Eleven äger `driving_journey`. Handledare är collaborators. | Accepted |
| [ADR-002](decisions/ADR-002-actor-auth-separation.md) | `users` ≠ `auth_identities`. Guest behåller samma `user_id`. | Accepted |
| [ADR-003](decisions/ADR-003-skill-context-separation.md) | Skill ≠ Context. Context på drive + optional override. | Accepted |
| [ADR-004](decisions/ADR-004-append-only-observations.md) | Observationer är append-only ledger. | Accepted |
| [ADR-005](decisions/ADR-005-observation-focus-separation.md) | Observation ≠ Training Focus ≠ Drive Focus. | Accepted |
| [ADR-006](decisions/ADR-006-b2c-first.md) | B2C-first. Ingen trafikskola eller extern API i v1. | Accepted |
| [ADR-007](decisions/ADR-007-postgresql-15.md) | PostgreSQL 15+ p.g.a. column-specific `ON DELETE SET NULL`. | Accepted |

Databas: raw SQL-migration, inget ORM i foundation. Docker Compose för lokal utveckling.

---

## 12. Källhänvisningar

### 12.1 Canonical dokument i repo

- [Vision](product/vision.md)
- [MVP v1](product/mvp-v1.md)
- [Produktprinciper](product/product-principles.md)
- [Onboarding & handoff](product/onboarding-handoff.md)
- [Skill Taxonomy v1](domain/skill-taxonomy.md)
- [Data model](domain/data-model.md)
- [Progression model](domain/progression-model.md)
- [Database](architecture/database.md)

### 12.2 Officiella källor för taxonomin

Lästa 2026-09-14. Primärkällor, inte trafikskolebloggar eller körkortsappar.

| Källa | Användning |
| --- | --- |
| [TSFS 2011:20](https://www.transportstyrelsen.se/tsfs/TSFS%202011_20.pdf) | Kursplan behörighet B |
| [TSFS 2012:43](https://lagen.nu/tsfs/2012:43) | Förarprov behörighet B |
| [Planera övningskörningen](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/planera-ovningsskorningen/) | Planera, öva till självständighet, följ upp |
| [Övningsköra](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/ovningskora/) | Ram för privat övningskörning |
| [Handledare](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/handledarskap-och-ovningskorning/handledare/) | Handledarroll |
| [Råd till handledaren](https://www.transportstyrelsen.se/globalassets/global/publikationer-och-rapporter/vag/korkort/rad_till_handledaren_a5_2026-08-01.pdf) (2026-08-01) | Säkerhetskontroll, manövrering, miljöprogression |
| [Så går körprovet till](https://www.trafikverket.se/korkort/ta-korkort/personbil-och-latt-lastbil/sa-gar-korprovet-till/) | Trafikverkets provpunkter |
| [Riskutbildning för personbil](https://www.transportstyrelsen.se/sv/vagtrafik/korkort/ta-korkort/riskutbildning/riskutbildning-bil/) | Avgränsning: inte v1-skills |

Riskutbildning (alkohol/trötthet och halka/hastighet i särförhållanden) är obligatorisk **extern** utbildning och ingår inte som v1-skills.
