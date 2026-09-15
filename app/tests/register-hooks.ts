import { after, before } from "node:test";
import { setupTestDatabase, teardownTestDatabase } from "./setup.js";

before(async () => {
  await setupTestDatabase();
});

after(async () => {
  await teardownTestDatabase();
});
