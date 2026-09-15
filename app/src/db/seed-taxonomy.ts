import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TaxonomySkill {
  skillKey: string;
  title: string;
  description: string;
  sortOrder: number;
  mvpPriority: "core" | "supporting";
}

interface TaxonomyArea {
  areaKey: string;
  skills: TaxonomySkill[];
}

interface TaxonomyFile {
  taxonomyVersion: number;
  areas: TaxonomyArea[];
}

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rowCount: number | null; rows: { inserted?: boolean }[] }>;
};

export async function seedTaxonomy(client?: Queryable): Promise<{ inserted: number; updated: number }> {
  const taxonomyPath = join(
    __dirname,
    "../../../docs/domain/skill-taxonomy-v1.json",
  );
  const taxonomy = JSON.parse(
    readFileSync(taxonomyPath, "utf8"),
  ) as TaxonomyFile;

  const db = client ?? getPool();
  let inserted = 0;
  let updated = 0;

  for (const area of taxonomy.areas) {
    for (const skill of area.skills) {
      const skillResult = await db.query(
        `INSERT INTO skills (skill_key)
         VALUES ($1)
         ON CONFLICT (skill_key) DO NOTHING
         RETURNING id`,
        [skill.skillKey],
      );
      if (skillResult.rowCount === 1) {
        inserted += 1;
      }

      const defResult = await db.query(
        `INSERT INTO skill_definitions (
           skill_id, taxonomy_version, area_key, title, description,
           sort_order, mvp_priority
         )
         SELECT s.id, $2, $3, $4, $5, $6, $7
         FROM skills s
         WHERE s.skill_key = $1
         ON CONFLICT (skill_id, taxonomy_version) DO UPDATE SET
           area_key = EXCLUDED.area_key,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           sort_order = EXCLUDED.sort_order,
           mvp_priority = EXCLUDED.mvp_priority
         RETURNING (xmax = 0) AS inserted`,
        [
          skill.skillKey,
          taxonomy.taxonomyVersion,
          area.areaKey,
          skill.title,
          skill.description,
          skill.sortOrder,
          skill.mvpPriority,
        ],
      );

      const rows = defResult.rows;
      if (rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }
  }

  return { inserted, updated };
}

async function main(): Promise<void> {
  const result = await seedTaxonomy();
  console.log(`Taxonomy seed complete: ${result.inserted} inserted, ${result.updated} updated`);
  await closePool();
}

const isMain = process.argv[1]?.endsWith("seed-taxonomy.ts");
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
