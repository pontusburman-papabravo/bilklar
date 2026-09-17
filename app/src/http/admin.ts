import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors.js";
import {
  clearAdminCookie,
  getAdminFromRequest,
  setAdminCookie,
} from "../auth/admin.js";
import { config } from "../config.js";
import { csvCell } from "./csv.js";
import {
  ADMIN_RESET_NEUTRAL_MESSAGE,
  authenticateAdmin,
  countEnabledAdmins,
  requestAdminPasswordReset,
  resetAdminPassword,
} from "../services/admin-users.js";
import { EmailSendError, sendAdminResetEmail } from "../services/email.js";
import {
  INTEREST_STATUSES,
  countNewInterestSignups,
  deleteInterestSignup,
  getInterestSignup,
  listInterestSignups,
  updateInterestSignup,
  type InterestRole,
  type InterestStatus,
} from "../services/interest.js";
import {
  escapeHtml,
  errorBanner,
  primaryButton,
  siteLayout,
  successBanner,
} from "./layout.js";
import { siteFooter, siteHeader } from "./landing.js";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  ADMIN_RESET_RATE_LIMIT,
  allowRequest,
} from "./rate-limit.js";

const ROLE_LABELS: Record<InterestRole, string> = {
  parent: "Förälder",
  student: "Elev",
  supervisor: "Handledare",
  other: "Annat",
};

const STATUS_LABELS: Record<InterestStatus, string> = {
  new: "Ny",
  contacted: "Kontaktad",
  invited: "Inbjuden",
  declined: "Avböjd",
};

function adminPage(
  title: string,
  body: string,
  options: { signedIn?: boolean } = {},
): string {
  return siteLayout(
    title,
    `${siteHeader({ variant: "admin", signedIn: options.signedIn })}${body}${siteFooter()}`,
  );
}

function notConfigured() {
  return {
    status: 404 as const,
    html: siteLayout(
      "Inte hittad",
      `${siteHeader()}<main class="site-section"><div class="site-inner site-inner--narrow"><h1>Sidan finns inte</h1></div></main>${siteFooter()}`,
    ),
  };
}

function loginPage(options: { errorMessage?: string; successMessage?: string } = {}): string {
  return adminPage(
    "Admin",
    `<main class="site-section site-section--cream">
       <div class="site-inner site-inner--narrow">
         <h1>Admin</h1>
         <p>Intresseanmälningar för Körpassets beta.</p>
         ${options.successMessage ? successBanner(options.successMessage) : ""}
         ${options.errorMessage ? errorBanner(options.errorMessage) : ""}
         <form method="post" action="/admin/login" class="admin-form">
           <div>
             <label for="email">E-post</label>
             <input id="email" name="email" type="email" required autocomplete="username">
           </div>
           <div>
             <label for="password">Lösenord</label>
             <input id="password" name="password" type="password" required autocomplete="current-password">
           </div>
           ${primaryButton("Logga in")}
         </form>
         <p><a href="/admin/forgot-password">Glömt lösenord?</a></p>
       </div>
     </main>`,
  );
}

function forgotPage(message?: { kind: "ok" | "error"; text: string }): string {
  return adminPage(
    "Glömt lösenord",
    `<main class="site-section site-section--cream">
       <div class="site-inner site-inner--narrow">
         <h1>Glömt lösenord</h1>
         <p>Ange e-postadressen för admin-kontot.</p>
         ${message?.kind === "ok" ? successBanner(message.text) : ""}
         ${message?.kind === "error" ? errorBanner(message.text) : ""}
         <form method="post" action="/admin/forgot-password" class="admin-form">
           <div>
             <label for="email">E-post</label>
             <input id="email" name="email" type="email" required autocomplete="username">
           </div>
           ${primaryButton("Skicka länk")}
         </form>
         <p><a href="/admin/login">Tillbaka till inloggning</a></p>
       </div>
     </main>`,
  );
}

function resetPage(options: { token?: string; errorMessage?: string }): string {
  return adminPage(
    "Nytt lösenord",
    `<main class="site-section site-section--cream">
       <div class="site-inner site-inner--narrow">
         <h1>Välj nytt lösenord</h1>
         ${options.errorMessage ? errorBanner(options.errorMessage) : ""}
         <form method="post" action="/admin/reset-password" class="admin-form">
           <input type="hidden" name="token" value="${escapeHtml(options.token ?? "")}">
           <div>
             <label for="password">Nytt lösenord</label>
             <input id="password" name="password" type="password" required minlength="12" autocomplete="new-password">
           </div>
           <div>
             <label for="confirm">Upprepa lösenord</label>
             <input id="confirm" name="confirm" type="password" required minlength="12" autocomplete="new-password">
           </div>
           ${primaryButton("Spara lösenord")}
         </form>
       </div>
     </main>`,
  );
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(new Date(iso));
}

function clientKey(request: FastifyRequest, prefix: string): string {
  return `${prefix}:${request.ip || "unknown"}`;
}

async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  if ((await countEnabledAdmins()) === 0) {
    const missing = notConfigured();
    await reply.status(missing.status).type("text/html").send(missing.html);
    return false;
  }
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    await reply.redirect("/admin/login");
    return false;
  }
  return true;
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (!(await getAdminFromRequest(request))) {
      return reply.redirect("/admin/login");
    }
    return reply.redirect("/admin/signups");
  });

  app.get("/admin/login", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (await getAdminFromRequest(request)) {
      return reply.redirect("/admin/signups");
    }
    const query = request.query as { reset?: string };
    return reply.type("text/html").send(
      loginPage({
        successMessage:
          query.reset === "1" ? "Lösenordet är uppdaterat. Logga in med det nya lösenordet." : undefined,
      }),
    );
  });

  app.post("/admin/login", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (
      !allowRequest(
        clientKey(request, "admin-login"),
        ADMIN_LOGIN_RATE_LIMIT.limit,
        ADMIN_LOGIN_RATE_LIMIT.windowMs,
      )
    ) {
      return reply.status(429).type("text/html").send(
        loginPage({ errorMessage: "För många försök. Vänta en stund och prova igen." }),
      );
    }
    const body = request.body as { email?: string; password?: string };
    const admin = await authenticateAdmin(body.email ?? "", body.password ?? "");
    if (!admin) {
      return reply.status(401).type("text/html").send(
        loginPage({ errorMessage: "Fel e-post eller lösenord" }),
      );
    }
    setAdminCookie(reply, admin.id);
    return reply.redirect("/admin/signups");
  });

  app.post("/admin/logout", async (_request, reply) => {
    clearAdminCookie(reply);
    return reply.redirect("/admin/login");
  });

  app.get("/admin/forgot-password", async (_request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    return reply.type("text/html").send(forgotPage());
  });

  app.post("/admin/forgot-password", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (
      !allowRequest(
        clientKey(request, "admin-reset"),
        ADMIN_RESET_RATE_LIMIT.limit,
        ADMIN_RESET_RATE_LIMIT.windowMs,
      )
    ) {
      return reply.status(429).type("text/html").send(
        forgotPage({
          kind: "error",
          text: "För många försök. Vänta en stund och prova igen.",
        }),
      );
    }
    const body = request.body as { email?: string };
    const result = await requestAdminPasswordReset(body.email ?? "");
    if (result.created && result.rawToken && result.admin) {
      const resetUrl = `${config.appBaseUrl.replace(/\/$/, "")}/admin/reset-password?token=${encodeURIComponent(result.rawToken)}`;
      try {
        await sendAdminResetEmail(result.admin.email, resetUrl);
      } catch (error) {
        request.log.error(
          {
            err: error instanceof EmailSendError ? error.message : "email_send_failed",
            adminUserId: result.admin.id,
          },
          "admin password reset email failed",
        );
      }
    }
    return reply.type("text/html").send(
      forgotPage({ kind: "ok", text: ADMIN_RESET_NEUTRAL_MESSAGE }),
    );
  });

  app.get("/admin/reset-password", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    const query = request.query as { token?: string };
    if (!query.token) {
      return reply.status(400).type("text/html").send(
        resetPage({ errorMessage: "Ogiltig eller utgången länk" }),
      );
    }
    return reply.type("text/html").send(resetPage({ token: query.token }));
  });

  app.post("/admin/reset-password", async (request, reply) => {
    if ((await countEnabledAdmins()) === 0) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    const body = request.body as { token?: string; password?: string; confirm?: string };
    if ((body.password ?? "") !== (body.confirm ?? "")) {
      return reply.status(400).type("text/html").send(
        resetPage({
          token: body.token,
          errorMessage: "Lösenorden matchar inte",
        }),
      );
    }
    try {
      await resetAdminPassword(body.token ?? "", body.password ?? "");
      return reply.redirect("/admin/login?reset=1");
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : "Ogiltig eller utgången länk";
      return reply.status(400).type("text/html").send(
        resetPage({ token: body.token, errorMessage: message }),
      );
    }
  });

  app.get("/admin/signups", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const query = request.query as { status?: string };
    const status = INTEREST_STATUSES.includes(query.status as InterestStatus)
      ? (query.status as InterestStatus)
      : undefined;
    const signups = await listInterestSignups(status);
    const newCount = await countNewInterestSignups();

    const rows = signups
      .map((signup) => {
        const preview = signup.message
          ? escapeHtml(signup.message.slice(0, 80))
          : "—";
        return `<tr>
          <td><a href="/admin/signups/${escapeHtml(signup.id)}">${escapeHtml(signup.name)}</a><div class="muted">${escapeHtml(signup.email)}</div></td>
          <td>${escapeHtml(ROLE_LABELS[signup.role])}</td>
          <td><span class="status status--${signup.status}">${escapeHtml(STATUS_LABELS[signup.status])}</span></td>
          <td>${escapeHtml(signup.city ?? "—")}</td>
          <td>${preview}</td>
          <td>${escapeHtml(formatWhen(signup.createdAt))}</td>
        </tr>`;
      })
      .join("");

    const filters = ["all", ...INTEREST_STATUSES]
      .map((value) => {
        const href = value === "all" ? "/admin/signups" : `/admin/signups?status=${value}`;
        const label = value === "all" ? "Alla" : STATUS_LABELS[value as InterestStatus];
        const current = (value === "all" && !status) || value === status;
        return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
      })
      .join(" · ");

    return reply.type("text/html").send(
      adminPage(
        "Intresseanmälningar",
        `<main class="admin-shell">
           <h1>Intresseanmälningar</h1>
           <p>${newCount} nya · ${signups.length} visade</p>
           <div class="admin-toolbar">
             <div>${filters}</div>
             <a href="/admin/signups.csv">Ladda ner CSV</a>
           </div>
           <table class="admin-table">
             <thead>
               <tr><th>Namn</th><th>Roll</th><th>Status</th><th>Ort</th><th>Meddelande</th><th>Inkommen</th></tr>
             </thead>
             <tbody>
               ${rows || `<tr><td colspan="6">Inga anmälningar ännu.</td></tr>`}
             </tbody>
           </table>
         </main>`,
        { signedIn: true },
      ),
    );
  });

  app.get("/admin/signups.csv", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const signups = await listInterestSignups();
    const header = "created_at,name,email,role,city,status,message";
    const lines = signups.map((signup) =>
      [
        signup.createdAt,
        csvCell(signup.name),
        csvCell(signup.email),
        signup.role,
        csvCell(signup.city ?? ""),
        signup.status,
        csvCell(signup.message ?? ""),
      ].join(","),
    );
    return reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", "attachment; filename=korpasset-intresse.csv")
      .send([header, ...lines].join("\n"));
  });

  app.get("/admin/signups/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const signup = await getInterestSignup(id);
    if (!signup) {
      return reply.status(404).type("text/html").send(
        adminPage("Saknas", `<main class="admin-shell">${errorBanner("Anmälan hittades inte")}</main>`, {
          signedIn: true,
        }),
      );
    }

    const options = INTEREST_STATUSES.map((status) => {
      const selected = status === signup.status ? " selected" : "";
      return `<option value="${status}"${selected}>${escapeHtml(STATUS_LABELS[status])}</option>`;
    }).join("");

    return reply.type("text/html").send(
      adminPage(
        signup.name,
        `<main class="admin-shell">
           <p><a href="/admin/signups">← Alla anmälningar</a></p>
           <h1>${escapeHtml(signup.name)}</h1>
           <p>${escapeHtml(signup.email)} · ${escapeHtml(ROLE_LABELS[signup.role])} · ${escapeHtml(signup.city ?? "Ingen ort")}</p>
           <p>Inkommen ${escapeHtml(formatWhen(signup.createdAt))}</p>
           ${signup.message ? `<blockquote>${escapeHtml(signup.message)}</blockquote>` : "<p class=\"muted\">Inget meddelande.</p>"}
           <form method="post" action="/admin/signups/${escapeHtml(signup.id)}" class="admin-form">
             <div>
               <label for="status">Status</label>
               <select id="status" name="status">${options}</select>
             </div>
             <div>
               <label for="admin_note">Intern anteckning</label>
               <textarea id="admin_note" name="admin_note" rows="4">${escapeHtml(signup.adminNote ?? "")}</textarea>
             </div>
             ${primaryButton("Spara")}
           </form>
           <form method="post" action="/admin/signups/${escapeHtml(signup.id)}/delete" class="admin-form admin-form--danger" onsubmit="return confirm('Radera anmälan? Det går inte att ångra.');">
             <p>Radering tar bort waitlist-raden. Används vid begäran eller manuell retention.</p>
             <label class="consent">
               <input type="checkbox" name="confirm" value="yes" required>
               <span>Jag vill radera den här anmälan.</span>
             </label>
             ${primaryButton("Radera anmälan")}
           </form>
         </main>`,
        { signedIn: true },
      ),
    );
  });

  app.post("/admin/signups/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string; admin_note?: string };
    try {
      await updateInterestSignup(id, {
        status: body.status,
        adminNote: body.admin_note,
      });
      return reply.redirect(`/admin/signups/${id}`);
    } catch (error) {
      const message = error instanceof AppError ? error.message : "Kunde inte spara";
      return reply.status(400).type("text/html").send(
        adminPage("Fel", `<main class="admin-shell">${errorBanner(message)}</main>`, {
          signedIn: true,
        }),
      );
    }
  });

  app.post("/admin/signups/:id/delete", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = request.body as { confirm?: string };
    if (body.confirm !== "yes") {
      return reply.status(400).type("text/html").send(
        adminPage(
          "Bekräfta radering",
          `<main class="admin-shell">${errorBanner("Bekräfta raderingen.")}<p><a href="/admin/signups/${escapeHtml(id)}">Tillbaka</a></p></main>`,
          { signedIn: true },
        ),
      );
    }
    try {
      await deleteInterestSignup(id);
      return reply.redirect("/admin/signups");
    } catch (error) {
      const message = error instanceof AppError ? error.message : "Kunde inte radera";
      return reply.status(400).type("text/html").send(
        adminPage("Fel", `<main class="admin-shell">${errorBanner(message)}</main>`, {
          signedIn: true,
        }),
      );
    }
  });
}
