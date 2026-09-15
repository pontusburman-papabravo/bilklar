import Fastify from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerRoutes } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  const app = Fastify({ logger: false });

  await app.register(cookie);
  await app.register(formbody);
  await app.register(fastifyStatic, {
    root: join(__dirname, "../../public"),
    prefix: "/",
  });

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    reply.status(error.statusCode ?? 500).send({
      error: error.message,
    });
  });

  await registerRoutes(app);
  return app;
}
