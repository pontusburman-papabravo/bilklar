import { buildServer } from "./http/server.js";
import { config } from "./config.js";
import { seedTaxonomy } from "./db/seed-taxonomy.js";

async function main(): Promise<void> {
  await seedTaxonomy();
  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`Körpasset app listening on ${config.appBaseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
