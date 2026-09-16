import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTestApp } from "./helpers.js";

describe("GET /health", () => {
  it("returns ok without a session", async () => {
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    await app.close();
  });
});
