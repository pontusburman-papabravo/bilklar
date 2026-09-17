import type { FastifyInstance } from "fastify";
import { AppError } from "../errors.js";
import {
  clearAdminCookie,
  isAdminConfigured,
  isAdminRequest,
  setAdminCookie,
  verifyAdminPassword,
} from "../auth/admin.js";
import {
  INTEREST_STATUSES,
  countNewInterestSignups,
  getInterestSignup,
  listInterestSignups,
  updateInterestSignup,
  type InterestRole,
  type InterestStatus,
} from "../services/interest.js";
import { escapeHtml, errorBanner, primaryButton, siteLayout } from "./layout.js";
import { siteFooter, siteHeader } from "./landing.js";

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

function adminPage(title: string, body: string): string {
  return siteLayout(title, `${siteHeader({ variant: "admin" })}${body}${siteFooter()}`, {
    extraCss: [],
  });
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

function loginPage(errorMessage?: string): string {
  return adminPage(
    "Admin",
    `<main class="site-section site-section--cream">
       <div class="site-inner site-inner--narrow">
         <h1>Admin</h1>
         <p>Intresseanmälningar för Körpassets beta.</p>
         ${errorMessage ? errorBanner(errorMessage) : ""}
         <form method="post" action="/admin/login" class="admin-form">
           <div>
             <label for="password">Lösenord</label>
             <input id="password" name="password" type="password" required autocomplete="current-password">
           </div>
           ${primaryButton("Logga in")}
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

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin", async (request, reply) => {
    if (!isAdminConfigured()) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (!isAdminRequest(request)) {
      return reply.type("text/html").send(loginPage());
    }
    return reply.redirect("/admin/signups");
  });

  app.post("/admin/login", async (request, reply) => {
    if (!isAdminConfigured()) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    const body = request.body as { password?: string };
    if (!verifyAdminPassword(body.password ?? "")) {
      return reply.status(401).type("text/html").send(loginPage("Fel lösenord"));
    }
    setAdminCookie(reply);
    return reply.redirect("/admin/signups");
  });

  app.post("/admin/logout", async (request, reply) => {
    clearAdminCookie(reply);
    return reply.redirect("/admin");
  });

  app.get("/admin/signups", async (request, reply) => {
    if (!isAdminConfigured()) {
      const missing = notConfigured();
      return reply.status(missing.status).type("text/html").send(missing.html);
    }
    if (!isAdminRequest(request)) {
      return reply.redirect("/admin");
    }

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
             <form method="post" action="/admin/logout"><button type="submit" class="btn-link">Logga ut</button></form>
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
      ),
    );
  });

  app.get("/admin/signups.csv", async (request, reply) => {
    if (!isAdminConfigured() || !isAdminRequest(request)) {
      return reply.redirect("/admin");
    }
    const signups = await listInterestSignups();
    const header = "created_at,name,email,role,city,status,message";
    const lines = signups.map((signup) =>
      [
        signup.createdAt,
        csvEscape(signup.name),
        csvEscape(signup.email),
        signup.role,
        csvEscape(signup.city ?? ""),
        signup.status,
        csvEscape(signup.message ?? ""),
      ].join(","),
    );
    return reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", "attachment; filename=korpasset-intresse.csv")
      .send([header, ...lines].join("\n"));
  });

  app.get("/admin/signups/:id", async (request, reply) => {
    if (!isAdminConfigured() || !isAdminRequest(request)) {
      return reply.redirect("/admin");
    }
    const { id } = request.params as { id: string };
    const signup = await getInterestSignup(id);
    if (!signup) {
      return reply.status(404).type("text/html").send(
        adminPage("Saknas", `<main class="admin-shell">${errorBanner("Anmälan hittades inte")}</main>`),
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
         </main>`,
      ),
    );
  });

  app.post("/admin/signups/:id", async (request, reply) => {
    if (!isAdminConfigured() || !isAdminRequest(request)) {
      return reply.redirect("/admin");
    }
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
        adminPage("Fel", `<main class="admin-shell">${errorBanner(message)}</main>`),
      );
    }
  });
}
