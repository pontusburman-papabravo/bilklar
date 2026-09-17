import type { FastifyInstance } from "fastify";
import { AppError } from "../errors.js";
import { saveInterestSignup } from "../services/interest.js";
import {
  renderInterestFormError,
  renderInterestThanksPage,
} from "./landing.js";
import { contactPage, privacyPage, termsPage } from "./legal.js";

function formValues(body: Record<string, unknown>) {
  return {
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    role: typeof body.role === "string" ? body.role : "",
    city: typeof body.city === "string" ? body.city : "",
    message: typeof body.message === "string" ? body.message : "",
  };
}

export async function registerMarketingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/integritet", async (_request, reply) => {
    return reply.type("text/html").send(privacyPage());
  });

  app.get("/villkor", async (_request, reply) => {
    return reply.type("text/html").send(termsPage());
  });

  app.get("/kontakt", async (_request, reply) => {
    return reply.type("text/html").send(contactPage());
  });

  app.get("/interest/tack", async (_request, reply) => {
    return reply.type("text/html").send(renderInterestThanksPage());
  });

  app.post("/interest", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const values = formValues(body);

    if (body.consent !== "yes") {
      return reply.status(400).type("text/html").send(
        renderInterestFormError(
          "Bekräfta att du vill bli kontaktad om betan.",
          values,
        ),
      );
    }

    try {
      const result = await saveInterestSignup({
        ...values,
        honeypot: typeof body.website === "string" ? body.website : "",
      });
      if (!result) {
        return reply.redirect("/interest/tack");
      }
      return reply.redirect("/interest/tack");
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : "Kunde inte spara anmälan.";
      return reply.status(400).type("text/html").send(
        renderInterestFormError(message, values),
      );
    }
  });
}
