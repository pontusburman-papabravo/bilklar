import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { getPool } from "../db/pool.js";

export interface SkillWithDefinition {
  skillId: string;
  skillKey: string;
  areaKey: string;
  areaTitle: string;
  title: string;
  description: string;
  sortOrder: number;
  mvpPriority: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadAreaTitles(): Record<string, string> {
  const taxonomyPath = join(
    __dirname,
    "../../../docs/domain/skill-taxonomy-v1.json",
  );
  const taxonomy = JSON.parse(readFileSync(taxonomyPath, "utf8")) as {
    areas: { areaKey: string; title: string }[];
  };
  return Object.fromEntries(
    taxonomy.areas.map((area) => [area.areaKey, area.title]),
  );
}

const AREA_TITLES = loadAreaTitles();

export async function listSkillsForTaxonomy(
  taxonomyVersion = 1,
  client?: pg.PoolClient,
): Promise<SkillWithDefinition[]> {
  const db = client ?? getPool();
  const result = await db.query(
    `SELECT s.id AS skill_id, s.skill_key, sd.area_key, sd.title, sd.description,
            sd.sort_order, sd.mvp_priority
     FROM skills s
     JOIN skill_definitions sd ON sd.skill_id = s.id
     WHERE sd.taxonomy_version = $1
     ORDER BY sd.sort_order`,
    [taxonomyVersion],
  );

  return result.rows.map((row) => ({
    skillId: row.skill_id,
    skillKey: row.skill_key,
    areaKey: row.area_key,
    areaTitle: AREA_TITLES[row.area_key] ?? row.area_key,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    mvpPriority: row.mvp_priority,
  }));
}

export async function getSkillsByIds(
  skillIds: string[],
  journeyId: string,
  client?: pg.PoolClient,
): Promise<SkillWithDefinition[]> {
  if (skillIds.length === 0) return [];
  const db = client ?? getPool();
  const result = await db.query(
    `SELECT s.id AS skill_id, s.skill_key, sd.area_key, sd.title, sd.description,
            sd.sort_order, sd.mvp_priority
     FROM skills s
     JOIN skill_definitions sd ON sd.skill_id = s.id AND sd.taxonomy_version = 1
     WHERE s.id = ANY($1::uuid[])
     ORDER BY sd.sort_order`,
    [skillIds],
  );
  return result.rows.map((row) => ({
    skillId: row.skill_id,
    skillKey: row.skill_key,
    areaKey: row.area_key,
    areaTitle: AREA_TITLES[row.area_key] ?? row.area_key,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    mvpPriority: row.mvp_priority,
  }));
}
