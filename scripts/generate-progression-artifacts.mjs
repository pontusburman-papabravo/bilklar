#!/usr/bin/env node
/**
 * Generates progression research draft artifacts from canonical taxonomy.
 * NOT used by runtime. Research/data only.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const taxonomy = JSON.parse(
  readFileSync(join(root, "docs/domain/skill-taxonomy-v1.json"), "utf8"),
);

const META = {
  status: "draft",
  notRuntime: true,
  lastUpdated: "2026-09-15",
  taxonomyVersion: 1,
  locale: "sv-SE",
  licenseClass: "B",
};

const SOURCE_CATALOG = Object.fromEntries(
  taxonomy.sources.map((s) => [s.id, s]),
);

const stageMap = {
  car_control_pre_drive_check: "foundation",
  car_control_smooth_start_stop: "foundation",
  car_control_braking: "foundation",
  car_control_gear_shifting: "foundation",
  car_control_speed_adaptation: "controlled_traffic",
  observation_mirror_routine: "controlled_traffic",
  observation_blind_spot: "mixed_traffic",
  observation_signaling: "controlled_traffic",
  observation_scanning: "controlled_traffic",
  positioning_road_position: "controlled_traffic",
  positioning_lane_selection: "mixed_traffic",
  positioning_lane_change: "mixed_traffic",
  positioning_turning: "mixed_traffic",
  intersections_right_hand_rule: "controlled_traffic",
  intersections_give_way: "mixed_traffic",
  intersections_traffic_lights: "mixed_traffic",
  roundabout_entry: "complex_traffic",
  roundabout_positioning: "complex_traffic",
  roundabout_exit: "complex_traffic",
  urban_vulnerable_road_users: "mixed_traffic",
  urban_passing_stationary: "mixed_traffic",
  urban_tight_spaces: "mixed_traffic",
  rural_joining_and_leaving: "complex_traffic",
  rural_curves: "complex_traffic",
  rural_meeting_traffic: "complex_traffic",
  rural_passing: "complex_traffic",
  highway_merging: "complex_traffic",
  highway_lane_discipline: "complex_traffic",
  highway_exiting: "complex_traffic",
  maneuver_reversing: "foundation",
  maneuver_hill_start: "mixed_traffic",
  maneuver_parallel_parking: "mixed_traffic",
  maneuver_parking: "mixed_traffic",
  maneuver_turning_around: "mixed_traffic",
  independent_route_planning: "independent_readiness",
  independent_risk_awareness: "mixed_traffic",
  independent_safety_margins: "mixed_traffic",
  independent_eco_driving: "independent_readiness",
};

/** @type {Record<string, { prerequisites: Array<{skillKey: string, strength: string, dataType: string, rationale: string}>}>} */
const prereqResearch = {
  car_control_pre_drive_check: { prerequisites: [] },
  car_control_smooth_start_stop: {
    prerequisites: [
      {
        skillKey: "car_control_pre_drive_check",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Säkerhetskontroll är officiell rutin före varje pass; start/stopp kan övas parallellt på tom yta.",
      },
    ],
  },
  car_control_braking: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Grundläggande fartkontroll före finare bromsteknik.",
      },
    ],
  },
  car_control_gear_shifting: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — rutinmässig manövrering inkluderar växling vid manuell bil.",
      },
    ],
  },
  car_control_speed_adaptation: {
    prerequisites: [
      {
        skillKey: "car_control_braking",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2011:20 kap. 3 — anpassa hastighet till omständigheter.",
      },
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Placering och hastighet övas ofta tillsammans i bostadsområde.",
      },
    ],
  },
  observation_mirror_routine: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Spegelrutin kräver grundläggande fordonskontroll.",
      },
    ],
  },
  observation_blind_spot: {
    prerequisites: [
      {
        skillKey: "observation_mirror_routine",
        strength: "hard",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Döda vinkeln kompletterar spegelrutin, inte ersätter den.",
      },
    ],
  },
  observation_signaling: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Blinkers kan övas tidigt i lugn miljö.",
      },
    ],
  },
  observation_scanning: {
    prerequisites: [
      {
        skillKey: "observation_mirror_routine",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Avsökning bygger på etablerad blickvana.",
      },
    ],
  },
  positioning_road_position: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Placering övas när eleven kan starta/stanna kontrollerat.",
      },
    ],
  },
  positioning_lane_selection: {
    prerequisites: [
      {
        skillKey: "positioning_road_position",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — val av körfält.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Körfältsval kräver avsökning av skyltning och trafik.",
      },
    ],
  },
  positioning_lane_change: {
    prerequisites: [
      {
        skillKey: "observation_mirror_routine",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Trafikverket provpunkt körfältsbyte — spegel obligatorisk.",
      },
      {
        skillKey: "observation_blind_spot",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Kontrollblick före körfältsbyte.",
      },
      {
        skillKey: "observation_signaling",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Tecken före körfältsbyte.",
      },
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Grundplacering före sidoförflyttning.",
      },
    ],
  },
  positioning_turning: {
    prerequisites: [
      {
        skillKey: "positioning_road_position",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 — placering i sväng.",
      },
      {
        skillKey: "observation_signaling",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Blinkers före sväng.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Fart innan och i sväng.",
      },
    ],
  },
  intersections_right_hand_rule: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Högerregel kräver kontrollerad fart i korsning.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2011:20 — uppmärksamhet och avsökning i korsning.",
      },
    ],
  },
  intersections_give_way: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Stopp/start vid väjningsplikt.",
      },
      {
        skillKey: "car_control_braking",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Kontrollerad inbromsning mot väjningslinje.",
      },
      {
        skillKey: "observation_scanning",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — färd i vägkorsning.",
      },
    ],
  },
  intersections_traffic_lights: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Anpassa fart mot signal.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Uppmärksamhet på signal och korsande trafik.",
      },
    ],
  },
  roundabout_entry: {
    prerequisites: [
      {
        skillKey: "intersections_give_way",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — lämna företräde i cirkulationsplats.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Sänka fart före infart.",
      },
    ],
  },
  roundabout_positioning: {
    prerequisites: [
      {
        skillKey: "roundabout_entry",
        strength: "hard",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Placering i cirkulation efter säker infart.",
      },
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Spårning i körfält.",
      },
    ],
  },
  roundabout_exit: {
    prerequisites: [
      {
        skillKey: "roundabout_positioning",
        strength: "hard",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Utfart bygger på korrekt läge i rondellen.",
      },
      {
        skillKey: "observation_signaling",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Trafikverket — tecken vid utfart ur cirkulationsplats.",
      },
    ],
  },
  urban_vulnerable_road_users: {
    prerequisites: [
      {
        skillKey: "observation_scanning",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — oskyddade trafikanter.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Fartanpassning vid gående/cyklister.",
      },
    ],
  },
  urban_passing_stationary: {
    prerequisites: [
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 — passerande stillastående fordon.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Upptäcka dörrar, fotgängare mellan bilar.",
      },
    ],
  },
  urban_tight_spaces: {
    prerequisites: [
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Grundplacering i smala gator.",
      },
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Långsam kontroll vid möte i trång gata.",
      },
    ],
  },
  rural_joining_and_leaving: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Trafikverket — infart/sväng från landsväg.",
      },
      {
        skillKey: "intersections_give_way",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Väjning vid infart.",
      },
      {
        skillKey: "positioning_turning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Svängteknik vid avfart.",
      },
    ],
  },
  rural_curves: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2011:20 — anpassa fart i kurva.",
      },
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Placering i kurva.",
      },
    ],
  },
  rural_meeting_traffic: {
    prerequisites: [
      {
        skillKey: "positioning_road_position",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — möte.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Fart och lucka vid möte.",
      },
    ],
  },
  rural_passing: {
    prerequisites: [
      {
        skillKey: "rural_meeting_traffic",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Mötesbeteende före omkörning.",
      },
      {
        skillKey: "observation_mirror_routine",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §19 — omkörning.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Acceleration och återgång.",
      },
    ],
  },
  highway_merging: {
    prerequisites: [
      {
        skillKey: "positioning_lane_change",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 — infart motorväg.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "hard",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Accelerationsfält kräver fartmatchning.",
      },
    ],
  },
  highway_lane_discipline: {
    prerequisites: [
      {
        skillKey: "positioning_lane_selection",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 — körfält på motorväg.",
      },
      {
        skillKey: "highway_merging",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Erfarenhet från påfart.",
      },
    ],
  },
  highway_exiting: {
    prerequisites: [
      {
        skillKey: "highway_lane_discipline",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 — avfart motorväg.",
      },
      {
        skillKey: "observation_signaling",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Tidig planering och tecken.",
      },
    ],
  },
  maneuver_reversing: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — backning ingår i särskild manövrering.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Uppsikt bakåt.",
      },
    ],
  },
  maneuver_hill_start: {
    prerequisites: [
      {
        skillKey: "car_control_smooth_start_stop",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — start i lutning.",
      },
      {
        skillKey: "car_control_gear_shifting",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "Manuell bil — växling i lutning. Ej hard vid automatic_only.",
      },
    ],
  },
  maneuver_parallel_parking: {
    prerequisites: [
      {
        skillKey: "maneuver_reversing",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — parkering i ficka.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Uppsikt mot trafik under parkering.",
      },
    ],
  },
  maneuver_parking: {
    prerequisites: [
      {
        skillKey: "maneuver_reversing",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — parkering.",
      },
    ],
  },
  maneuver_turning_around: {
    prerequisites: [
      {
        skillKey: "maneuver_reversing",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §18 — vändning.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Säker plats och uppsikt.",
      },
    ],
  },
  independent_route_planning: {
    prerequisites: [
      {
        skillKey: "positioning_lane_selection",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §12 — självständig körning mot mål.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Navigera kräver avsökning.",
      },
      {
        skillKey: "independent_risk_awareness",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Självständig körning kräver riskmedvetenhet.",
      },
    ],
  },
  independent_risk_awareness: {
    prerequisites: [
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2012:43 §11, §19 p.1 — förutse risker.",
      },
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Riskmedvetenhet kopplas till fart.",
      },
    ],
  },
  independent_safety_margins: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "soft",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2011:20 kap. 3 — säkerhetsmarginaler.",
      },
      {
        skillKey: "observation_scanning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Avstånd kräver uppmärksamhet framåt.",
      },
    ],
  },
  independent_eco_driving: {
    prerequisites: [
      {
        skillKey: "car_control_speed_adaptation",
        strength: "hard",
        dataType: "OFFICIAL REQUIREMENT",
        rationale: "TSFS 2011:20, TSFS 2012:43 §19 p.4 — sparsam körning.",
      },
      {
        skillKey: "independent_route_planning",
        strength: "soft",
        dataType: "PEDAGOGICAL PRACTICE",
        rationale: "Planerad körning i blandad miljö.",
      },
    ],
  },
};

function ctx(environment, traffic, light = "daylight", weather = "dry") {
  return { environment, traffic, light, weather };
}

/** @type {Record<string, object[]>} */
const contextProgressionResearch = {
  car_control_pre_drive_check: [
    ctx("residential", "light"),
    ctx("urban", "light"),
    ctx("rural", "light"),
  ],
  car_control_smooth_start_stop: [
    ctx("residential", "light"),
    ctx("residential", "moderate"),
    ctx("urban", "light"),
  ],
  car_control_braking: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("urban", "moderate", "daylight", "rain"),
  ],
  car_control_gear_shifting: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("highway", "moderate"),
  ],
  car_control_speed_adaptation: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("urban", "heavy"),
    ctx("rural", "moderate", "dusk_dawn", "rain"),
  ],
  observation_mirror_routine: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("highway", "moderate"),
  ],
  observation_blind_spot: [
    ctx("urban", "moderate"),
    ctx("highway", "moderate"),
    ctx("urban", "heavy"),
  ],
  observation_signaling: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
  ],
  observation_scanning: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("urban", "heavy", "dusk_dawn"),
  ],
  positioning_road_position: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("rural", "moderate", "dusk_dawn", "rain"),
  ],
  positioning_lane_selection: [
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("highway", "moderate"),
  ],
  positioning_lane_change: [
    ctx("urban", "light"),
    ctx("urban", "moderate"),
    ctx("highway", "moderate"),
    ctx("highway", "heavy"),
  ],
  positioning_turning: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
  ],
  intersections_right_hand_rule: [
    ctx("residential", "light"),
    ctx("residential", "moderate"),
    ctx("urban", "moderate"),
  ],
  intersections_give_way: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("urban", "moderate", "dusk_dawn", "rain"),
  ],
  intersections_traffic_lights: [
    ctx("urban", "light"),
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("urban", "heavy", "night"),
  ],
  roundabout_entry: [
    ctx("urban", "light"),
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
  ],
  roundabout_positioning: [
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("urban", "heavy", "dusk_dawn", "rain"),
  ],
  roundabout_exit: [
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("urban", "heavy", "dusk_dawn"),
  ],
  urban_vulnerable_road_users: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("urban", "moderate", "dusk_dawn"),
  ],
  urban_passing_stationary: [
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
  ],
  urban_tight_spaces: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("residential", "moderate"),
  ],
  rural_joining_and_leaving: [
    ctx("rural", "light"),
    ctx("rural", "moderate"),
    ctx("rural", "heavy"),
  ],
  rural_curves: [
    ctx("rural", "light"),
    ctx("rural", "moderate"),
    ctx("rural", "moderate", "dusk_dawn", "rain"),
  ],
  rural_meeting_traffic: [
    ctx("rural", "light"),
    ctx("rural", "moderate"),
    ctx("rural", "moderate", "dusk_dawn"),
  ],
  rural_passing: [
    ctx("rural", "light"),
    ctx("rural", "moderate"),
  ],
  highway_merging: [
    ctx("highway", "light"),
    ctx("highway", "moderate"),
    ctx("highway", "heavy"),
  ],
  highway_lane_discipline: [
    ctx("highway", "moderate"),
    ctx("highway", "heavy"),
    ctx("highway", "heavy", "rain"),
  ],
  highway_exiting: [
    ctx("highway", "moderate"),
    ctx("highway", "heavy"),
  ],
  maneuver_reversing: [
    ctx("residential", "light"),
    ctx("urban", "light"),
  ],
  maneuver_hill_start: [
    ctx("residential", "light"),
    ctx("urban", "light"),
    ctx("rural", "light"),
  ],
  maneuver_parallel_parking: [
    ctx("residential", "light"),
    ctx("urban", "light"),
    ctx("urban", "moderate"),
  ],
  maneuver_parking: [
    ctx("residential", "light"),
    ctx("urban", "light"),
  ],
  maneuver_turning_around: [
    ctx("residential", "light"),
    ctx("rural", "light"),
  ],
  independent_route_planning: [
    ctx("urban", "moderate"),
    ctx("urban", "heavy"),
    ctx("rural", "moderate"),
  ],
  independent_risk_awareness: [
    ctx("residential", "light"),
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("highway", "moderate"),
    ctx("urban", "heavy", "night", "rain"),
  ],
  independent_safety_margins: [
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("highway", "moderate"),
    ctx("highway", "heavy"),
  ],
  independent_eco_driving: [
    ctx("urban", "moderate"),
    ctx("rural", "moderate"),
    ctx("highway", "moderate"),
  ],
};

function assessmentCriteria(skill) {
  const t = skill.title.toLowerCase();
  const d = skill.description;
  return {
    needs_help: `Behöver hjälp: handledaren måste ofta ingripa, påminna eller korrigera vid ${t}. ${d.split(".")[0]}.`,
    with_support: `Med stöd: eleven klarar ${t} när handledaren påminner eller guidar vid behov, men behöver inte ta över.`,
    independent: `Självständig: eleven hanterar ${t} själv i aktuellt context utan att handledaren behöver korrigera.`,
    dataType: "PRODUCT HYPOTHESIS",
    note: "Formulerat för handledares tap-to-rate — inte officiella betygskriterier.",
  };
}

function mapOfficialBasis(skill) {
  return (skill.officialBasis ?? []).map((ref) => {
    let sourceId = "tsfs-2011-20";
    if (ref.includes("2012:43") || ref.includes("TSFS 2012")) sourceId = "tsfs-2012-43";
    else if (ref.includes("Trafikverket")) sourceId = "trv-korprov";
    else if (ref.includes("Planera")) sourceId = "ts-planera";
    else if (ref.includes("Råd till handledaren")) sourceId = "ts-rad-2026";
    const catalog = SOURCE_CATALOG[sourceId];
    return {
      sourceId,
      reference: ref,
      sourceTitle: catalog?.title ?? ref,
      sourceUrl: catalog?.url ?? null,
      dataType: "OFFICIAL REQUIREMENT",
    };
  });
}

function startingContexts(steps) {
  const first = steps[0];
  return {
    environment: [first.environment],
    traffic: [first.traffic],
    light: [first.light ?? "daylight"],
    weather: [first.weather ?? "dry"],
    dataType: "PEDAGOGICAL PRACTICE",
  };
}

const allSkills = [];
for (const area of taxonomy.areas) {
  for (const skill of area.skills) {
    allSkills.push({ ...skill, areaKey: area.areaKey });
  }
}

// Artifact 1: official basis
const officialBasisArtifact = {
  ...META,
  artifact: "skill-official-basis-v1",
  description: "Mapping of each canonical skill to official Swedish sources. Does not imply training order.",
  sourceCatalog: taxonomy.sources,
  skills: allSkills.map((skill) => ({
    skillKey: skill.skillKey,
    title: skill.title,
    areaKey: skill.areaKey,
    mvpPriority: skill.mvpPriority,
    officialBasis: mapOfficialBasis(skill),
    officialSummary: skill.whyNeeded,
    dataType: "OFFICIAL REQUIREMENT",
  })),
};

// Artifact 2: prerequisites
const prerequisitesArtifact = {
  ...META,
  artifact: "skill-prerequisites-v1",
  description: "Pedagogical and official prerequisite graph. strength=hard only where evidence supports blocking; most edges are soft.",
  introductionStages: [
    { key: "foundation", dataType: "PEDAGOGICAL PRACTICE" },
    { key: "controlled_traffic", dataType: "PEDAGOGICAL PRACTICE" },
    { key: "mixed_traffic", dataType: "PEDAGOGICAL PRACTICE" },
    { key: "complex_traffic", dataType: "PEDAGOGICAL PRACTICE" },
    { key: "independent_readiness", dataType: "PEDAGOGICAL PRACTICE" },
  ],
  pedagogicalChains: [
    {
      name: "vehicle_basics",
      dataType: "PEDAGOGICAL PRACTICE",
      skills: [
        "car_control_pre_drive_check",
        "car_control_smooth_start_stop",
        "car_control_braking",
        "positioning_road_position",
      ],
      note: "Typisk tidig kedja — inte obligatorisk ordning.",
    },
    {
      name: "observation_to_interaction",
      dataType: "PEDAGOGICAL PRACTICE",
      skills: [
        "observation_mirror_routine",
        "observation_blind_spot",
        "observation_scanning",
        "observation_signaling",
      ],
    },
    {
      name: "intersections_to_roundabout",
      dataType: "PEDAGOGICAL PRACTICE",
      skills: [
        "intersections_right_hand_rule",
        "intersections_give_way",
        "roundabout_entry",
        "roundabout_positioning",
        "roundabout_exit",
      ],
    },
  ],
  skills: allSkills.map((skill) => ({
    skillKey: skill.skillKey,
    title: skill.title,
    introductionStage: stageMap[skill.skillKey],
    introductionStageDataType: "PEDAGOGICAL PRACTICE",
    prerequisites: prereqResearch[skill.skillKey]?.prerequisites ?? [],
    taxonomyLikelyPrerequisites: skill.likelyPrerequisites,
    taxonomyDeviations: [],
  })),
};

// Mark deviations
const devMap = {
  maneuver_hill_start: "gear_shifting hard should be conditional on manual transmission",
  independent_eco_driving: "route_planning demoted to soft; speed_adaptation is official hard",
  intersections_give_way: "added soft braking prerequisite",
  car_control_speed_adaptation: "added soft positioning prerequisite",
};
for (const s of prerequisitesArtifact.skills) {
  if (devMap[s.skillKey]) {
    s.taxonomyDeviations.push({
      issue: devMap[s.skillKey],
      dataType: "PRODUCT HYPOTHESIS",
    });
  }
}

// Artifact 3: context progression + assessment criteria
const contextArtifact = {
  ...META,
  artifact: "skill-context-progression-v1",
  description: "Per-skill starting contexts, context ladders, and supervisor assessment guidance.",
  contextCombinationRule: {
    rule: "Increase at most one ordinal dimension after independent; needs_help → same or easier step",
    dataType: "PRODUCT HYPOTHESIS",
  },
  skills: allSkills.map((skill) => {
    const steps = contextProgressionResearch[skill.skillKey];
    return {
      skillKey: skill.skillKey,
      title: skill.title,
      recommendedStartingContexts: startingContexts(steps),
      contextProgression: steps.map((step, i) => ({
        step: i + 1,
        ...step,
        dataType: i === 0 ? "PEDAGOGICAL PRACTICE" : "PRODUCT HYPOTHESIS",
      })),
      progressionGuidance: {
        needs_help: "repeat_same_or_easier",
        with_support: "repeat_similar",
        independent: "increase_context_or_adjacent_skill",
        dataType: "PRODUCT HYPOTHESIS",
      },
      assessmentCriteria: assessmentCriteria(skill),
    };
  }),
};

// Artifact 4: first drive + recommendation rules
const rulesArtifact = {
  ...META,
  artifact: "first-drive-recommendation-rules-v1",
  description: "Rules for zero-observation starting points and post-observation next steps.",
  firstDriveStartingPoints: [
    {
      skillKey: "car_control_pre_drive_check",
      title: "Säkerhetskontroll",
      priority: 1,
      dataType: "OFFICIAL REQUIREMENT",
      rationale: "TSFS 2012:43 §14–17; Råd till handledaren 2026 — rutin före varje pass.",
    },
    {
      skillKey: "car_control_smooth_start_stop",
      title: "Start och stannande",
      priority: 2,
      dataType: "OFFICIAL REQUIREMENT",
      rationale: "TSFS 2011:20 kap. 2 manövrering; första motoriska tröskel.",
    },
    {
      skillKey: "car_control_braking",
      title: "Bromsning",
      priority: 3,
      dataType: "OFFICIAL REQUIREMENT",
      rationale: "TSFS 2012:43 §18 — olika bromsmetoder.",
    },
    {
      skillKey: "positioning_road_position",
      title: "Placering på vägen",
      priority: 4,
      dataType: "PEDAGOGICAL PRACTICE",
      rationale: "Planera övningskörningen — lugna platser, sedan placering i körfält.",
    },
    {
      skillKey: "observation_signaling",
      title: "Tecken och blinkers",
      priority: 5,
      optional: true,
      dataType: "PEDAGOGICAL PRACTICE",
      rationale: "Enkel tidig vinst; kan kombineras med start/stopp.",
    },
  ],
  firstDriveDataType: "PEDAGOGICAL PRACTICE",
  observationProgressionRules: {
    needs_help: {
      action: "repeat_same_or_easier_context",
      priority: 1,
      dataType: "PRODUCT HYPOTHESIS",
      alignsWith: "Transportstyrelsen — öva tills momentet sitter",
    },
    with_support: {
      action: "repeat_same_context",
      optionalAdjacentPrerequisite: true,
      dataType: "PRODUCT HYPOTHESIS",
    },
    independent: {
      action: "increase_one_context_dimension_or_introduce_adjacent_skill",
      dataType: "PRODUCT HYPOTHESIS",
    },
  },
  recommendationEvidenceExamples: [
    {
      dataType: "PRODUCT HYPOTHESIS",
      example: {
        skillKey: "positioning_road_position",
        lastAssessment: "independent",
        lastContext: ctx("residential", "light"),
        inference: "Not done everywhere — suggest same skill at urban + moderate traffic",
        nextStep: ctx("urban", "moderate"),
      },
    },
    {
      dataType: "PRODUCT HYPOTHESIS",
      example: {
        skillKey: "intersections_give_way",
        lastAssessment: "needs_help",
        lastContext: ctx("urban", "moderate"),
        inference: "Repeat same skill or step down to residential + light",
        nextStep: ctx("residential", "light"),
      },
    },
  ],
  recommendationPriorityOrder: [
    "active_training_focus",
    "needs_help_recent",
    "with_support_recent",
    "independent_context_step_up",
    "adjacent_unobserved_core",
    "first_drive_starting_points",
  ],
  explicitlyNotModelled: [
    "readiness_percentage",
    "required_lesson_count",
    "universal_mandatory_skill_order",
    "exact_repetition_count",
    "ML/AI predictions",
  ],
};

// Combined index for convenience
const combinedArtifact = {
  ...META,
  artifact: "progression-model-draft-v1",
  description: "Combined index of four research artifacts. NOT read by runtime.",
  artifacts: {
    officialBasis: "skill-official-basis-v1.json",
    prerequisites: "skill-prerequisites-v1.json",
    contextProgression: "skill-context-progression-v1.json",
    firstDriveRules: "first-drive-recommendation-rules-v1.json",
  },
  skills: allSkills.map((skill) => {
    const steps = contextProgressionResearch[skill.skillKey];
    return {
      skillKey: skill.skillKey,
      title: skill.title,
      officialBasis: mapOfficialBasis(skill),
      introductionStage: stageMap[skill.skillKey],
      prerequisites: prereqResearch[skill.skillKey]?.prerequisites ?? [],
      recommendedStartingContexts: {
        environment: [steps[0].environment],
        traffic: [steps[0].traffic],
        light: [steps[0].light ?? "daylight"],
        weather: [steps[0].weather ?? "dry"],
      },
      contextProgression: steps,
      progressionGuidance: {
        needs_help: "repeat_same_or_easier",
        with_support: "repeat_similar",
        independent: "increase_context_or_move_forward",
      },
      assessmentCriteria: {
        needs_help: assessmentCriteria(skill).needs_help,
        with_support: assessmentCriteria(skill).with_support,
        independent: assessmentCriteria(skill).independent,
      },
    };
  }),
};

const outDir = join(root, "docs/domain");
writeFileSync(
  join(outDir, "skill-official-basis-v1.json"),
  JSON.stringify(officialBasisArtifact, null, 2) + "\n",
);
writeFileSync(
  join(outDir, "skill-prerequisites-v1.json"),
  JSON.stringify(prerequisitesArtifact, null, 2) + "\n",
);
writeFileSync(
  join(outDir, "skill-context-progression-v1.json"),
  JSON.stringify(contextArtifact, null, 2) + "\n",
);
writeFileSync(
  join(outDir, "first-drive-recommendation-rules-v1.json"),
  JSON.stringify(rulesArtifact, null, 2) + "\n",
);
writeFileSync(
  join(outDir, "progression-model-draft-v1.json"),
  JSON.stringify(combinedArtifact, null, 2) + "\n",
);

console.log("Generated 5 files for", allSkills.length, "skills");
