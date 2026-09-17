import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { AppError } from "../errors.js";
import {
  getSessionUserId,
  requireSessionUserId,
  setSessionCookie,
} from "../auth/session.js";
import { createInvitation, acceptInvitation, getInvitationByToken } from "../services/invitations.js";
import {
  createJourneyForStudent,
  formatAccessibleJourneyLabel,
  getJourneyById,
  listAccessibleActiveJourneys,
  listActiveSupervisors,
} from "../services/journeys.js";
import {
  requireActiveSupervisor,
  requireJourneyAccess,
} from "../services/authorization.js";
import { getPool } from "../db/pool.js";
import {
  createDriveWithFocus,
  endDrive,
  getActiveDrive,
  getDrive,
  getDriveFocusSkills,
  isDriveFocusFullyObserved,
} from "../services/drives.js";
import { listSkillsForTaxonomy } from "../services/skills.js";
import {
  ASSESSMENT_DISPLAY,
  addLiveObservation,
  completeMissingDriveObservations,
  getDriveObservationRecap,
  getLatestDriveObservationsBySkill,
  getMissingDriveFocusSkillIds,
  saveDriveObservations,
  type AssessmentLevel,
} from "../services/observations.js";
import { recommendNextFocus } from "../services/recommendations.js";
import {
  escapeHtml,
  layout,
  primaryButton,
  errorBanner,
} from "./layout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function handleError(error: unknown): { status: number; message: string } {
  if (error instanceof AppError) {
    return { status: error.statusCode, message: error.message };
  }
  console.error(error);
  return { status: 500, message: "Something went wrong" };
}

const RATING_LEVELS: AssessmentLevel[] = [
  "needs_help",
  "with_support",
  "independent",
];

function renderRatingOption(skillId: string, level: AssessmentLevel): string {
  const display = ASSESSMENT_DISPLAY[level];
  return `<label class="rating-option rating-option--${level}">
    <input type="radio" name="assessment_${escapeHtml(skillId)}" value="${level}" required class="rating-option__input">
    <span class="rating-option__body">
      <span class="rating-option__label">${escapeHtml(display.label)}</span>
      <span class="rating-option__micro">${escapeHtml(display.microcopy)}</span>
    </span>
  </label>`;
}

function renderLiveAssessmentButton(level: AssessmentLevel): string {
  const display = ASSESSMENT_DISPLAY[level];
  return `<button
    type="submit"
    name="assessment"
    value="${level}"
    class="btn btn-secondary live-observe__choice live-observe__choice--${level}"
  >${escapeHtml(display.label)}</button>`;
}

function renderSupervisorLiveFocusRow(
  journeyId: string,
  driveId: string,
  skill: { skillId: string; title: string },
  latestAssessment: AssessmentLevel | null,
): string {
  const noteLabel = latestAssessment ? "Notera igen" : "Notera";
  const statusHtml = latestAssessment
    ? `<p class="live-observe__status">
         <span class="live-observe__signal" aria-hidden="true">${ASSESSMENT_DISPLAY[latestAssessment].signal}</span>
         <span>${escapeHtml(ASSESSMENT_DISPLAY[latestAssessment].label)}</span>
       </p>`
    : "";

  return `<li class="live-observe__item">
    <div class="live-observe__header">
      <h2 class="live-observe__title">${escapeHtml(skill.title)}</h2>
      ${statusHtml}
    </div>
    <details class="live-observe__details">
      <summary class="btn btn-secondary live-observe__summary">${escapeHtml(noteLabel)}</summary>
      <form method="post" action="/journey/${escapeHtml(journeyId)}/drive/${escapeHtml(driveId)}/observe" class="live-observe__form">
        <input type="hidden" name="skill_id" value="${escapeHtml(skill.skillId)}">
        <div class="live-observe__choices">
          ${RATING_LEVELS.map((level) => renderLiveAssessmentButton(level)).join("")}
        </div>
      </form>
    </details>
  </li>`;
}

function renderReadOnlyObservedSkill(
  title: string,
  assessment: AssessmentLevel,
): string {
  const display = ASSESSMENT_DISPLAY[assessment];
  return `<div class="rating-item rating-item--observed">
    <h3>${escapeHtml(title)}</h3>
    <p class="rating-observed">
      <span class="drive-recap-signal" aria-hidden="true">${display.signal}</span>
      <span>${escapeHtml(display.label)}</span>
    </p>
  </div>`;
}

function groupSkillsByArea(
  skills: Awaited<ReturnType<typeof listSkillsForTaxonomy>>,
): Map<string, { areaTitle: string; skills: typeof skills }> {
  const groups = new Map<string, { areaTitle: string; skills: typeof skills }>();
  for (const skill of skills) {
    const existing = groups.get(skill.areaKey);
    if (existing) {
      existing.skills.push(skill);
    } else {
      groups.set(skill.areaKey, {
        areaTitle: skill.areaTitle,
        skills: [skill],
      });
    }
  }
  return groups;
}

function onboardingForm(errorMessage?: string): string {
  return `${errorMessage ? errorBanner(errorMessage) : ""}
         <h1>Vad heter du?</h1>
         <form method="post" action="/start" class="stack">
           <div>
             <label for="name">Namn</label>
             <input id="name" name="name" type="text" required autocomplete="name" placeholder="Ditt namn">
           </div>
           ${primaryButton("Starta min körkortsresa")}
         </form>`;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    const userId = getSessionUserId(request);
    if (userId) {
      const journeys = await listAccessibleActiveJourneys(userId);
      if (journeys.length === 1) {
        return reply.redirect(`/journey/${journeys[0].id}`);
      }
      if (journeys.length > 1) {
        const choices = journeys
          .map((journey) => {
            const label = formatAccessibleJourneyLabel(journey);
            return `<a class="card journey-choice" href="/journey/${escapeHtml(journey.id)}">${escapeHtml(label)}</a>`;
          })
          .join("");
        return reply.type("text/html").send(
          layout(
            "Välj elev",
            `<h1>Välj elev</h1>
             <p>Vilken körkortsresa vill du öppna?</p>
             <div class="stack">${choices}</div>`,
          ),
        );
      }
    }

    return reply.redirect("/onboarding");
  });

  app.get("/onboarding", async (_request, reply) => {
    reply.type("text/html").send(
      layout("Starta din körkortsresa", onboardingForm()),
    );
  });

  app.post("/start", async (request, reply) => {
    const body = request.body as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return reply
        .type("text/html")
        .status(400)
        .send(
          layout(
            "Starta din körkortsresa",
            onboardingForm("Ange ditt namn"),
          ),
        );
    }

    const sessionUserId = getSessionUserId(request);
    const { journey, userId } = await createJourneyForStudent(name, sessionUserId);
    setSessionCookie(reply, userId);
    return reply.redirect(`/journey/${journey.id}`);
  });

  app.get("/journey/:journeyId", async (request, reply) => {
    const { journeyId } = request.params as { journeyId: string };
    const userId = requireSessionUserId(request);

    try {
      const access = await requireJourneyAccess(journeyId, userId);
      const journey = await getJourneyById(journeyId);
      if (!journey) {
        return reply.status(404).send("Not found");
      }

      const supervisors = await listActiveSupervisors(journeyId);
      const hasSupervisor = supervisors.length > 0;

      const inviteSection = access.role === "student"
        ? `<section class="card">
             <h2>Bjud in handledare</h2>
             <p>Dela länken eller QR-koden med din handledare.</p>
             <form method="post" action="/journey/${escapeHtml(journeyId)}/invitations">
               ${primaryButton("Skapa inbjudan")}
             </form>
           </section>`
        : "";

      const activeDrive = await getActiveDrive(journeyId);
      const latestEnded = await getPool().query(
        `SELECT id, supervisor_user_id FROM drives
         WHERE journey_id = $1 AND ended_at IS NOT NULL
         ORDER BY ended_at DESC
         LIMIT 1`,
        [journeyId],
      );
      const latestEndedDrive = latestEnded.rows[0];

      let pendingRating = "";
      if (
        latestEndedDrive &&
        access.role === "supervisor" &&
        latestEndedDrive.supervisor_user_id === userId
      ) {
        const fullyObserved = await isDriveFocusFullyObserved(
          journeyId,
          latestEndedDrive.id,
        );
        if (!fullyObserved) {
          pendingRating = `<section class="card">
               <h2>Bedöm senaste körpasset</h2>
               <a class="btn btn-primary" href="/journey/${escapeHtml(journeyId)}/drive/${escapeHtml(latestEndedDrive.id)}/rate">Bedöm moment</a>
             </section>`;
        }
      }

      const activeDriveSection = activeDrive
        ? `<section class="card">
             <h2>Körpass pågår</h2>
             <a class="btn btn-primary" href="/journey/${escapeHtml(journeyId)}/drive/${escapeHtml(activeDrive.id)}">Gå till körpasset</a>
           </section>`
        : "";

      const startDriveSection =
        hasSupervisor && !activeDrive
          ? `<section class="card">
               <h2>Nästa körpass</h2>
               <p>Välj 2–3 moment att träna på idag.</p>
               <a class="btn btn-primary" href="/journey/${escapeHtml(journeyId)}/drive/new">Vad tränar ni på idag?</a>
             </section>`
          : "";

      const driveSection = hasSupervisor
        ? `${activeDriveSection}${pendingRating}${startDriveSection}`
        : `<section class="card">
             <p class="muted">Bjud in en handledare för att kunna starta ett körpass.</p>
           </section>`;

      const supervisorNames = supervisors
        .map((s) => escapeHtml(s.displayName ?? "Handledare"))
        .join(", ");

      reply.type("text/html").send(
        layout(
          journey.studentName ?? "Körkortsresa",
          `<h1>${escapeHtml(journey.studentName ?? "Körkortsresa")}</h1>
           <p class="muted">Din körkortsresa</p>
           ${hasSupervisor ? `<p>Handledare: ${supervisorNames}</p>` : ""}
           ${inviteSection}
           ${driveSection}`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.post("/journey/:journeyId/invitations", async (request, reply) => {
    const { journeyId } = request.params as { journeyId: string };
    const userId = requireSessionUserId(request);

    try {
      const invitation = await createInvitation(journeyId, userId);
      const qrDataUrl = await QRCode.toDataURL(invitation.inviteUrl, {
        margin: 1,
        width: 256,
      });

      reply.type("text/html").send(
        layout(
          "Inbjudan",
          `<h1>Bjud in handledare</h1>
           <p>Dela med <strong>${escapeHtml(invitation.studentName)}</strong>s handledare.</p>
           <div class="invite-url">${escapeHtml(invitation.inviteUrl)}</div>
           <div class="qr-wrap"><img src="${qrDataUrl}" alt="QR-kod för inbjudan"></div>
           <a class="btn btn-secondary" href="/journey/${escapeHtml(journeyId)}">Tillbaka till resan</a>`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.get("/invite/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return reply.status(404).type("text/html").send(
        layout("Inbjudan", errorBanner("Inbjudan hittades inte")),
      );
    }

    if (invitation.status !== "pending") {
      if (invitation.status === "accepted") {
        return reply.redirect(`/journey/${invitation.journeyId}`);
      }
      return reply.status(410).type("text/html").send(
        layout("Inbjudan", errorBanner("Inbjudan är inte längre giltig")),
      );
    }

    if (new Date(invitation.expiresAt) <= new Date()) {
      return reply.status(410).type("text/html").send(
        layout("Inbjudan", errorBanner("Inbjudan har gått ut")),
      );
    }

    reply.type("text/html").send(
      layout(
        "Anslut som handledare",
        `<h1>Du ska övningsköra med ${escapeHtml(invitation.studentName)}</h1>
         <form method="post" action="/invite/${escapeHtml(token)}/accept" class="stack">
           <div>
             <label for="name">Vad heter du?</label>
             <input id="name" name="name" type="text" required autocomplete="name" placeholder="Ditt namn">
           </div>
           ${primaryButton("Anslut")}
         </form>`,
      ),
    );
  });

  app.post("/invite/:token/accept", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = request.body as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return reply.status(400).type("text/html").send(
        layout("Anslut", errorBanner("Ange ditt namn")),
      );
    }

    try {
      const sessionUserId = getSessionUserId(request);
      const result = await acceptInvitation(token, name, sessionUserId);
      setSessionCookie(reply, result.userId);
      return reply.redirect(`/journey/${result.journeyId}`);
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Anslut", errorBanner(message)),
      );
    }
  });

  app.get("/journey/:journeyId/drive/new", async (request, reply) => {
    const { journeyId } = request.params as { journeyId: string };
    const userId = requireSessionUserId(request);

    try {
      const access = await requireJourneyAccess(journeyId, userId);
      const activeDrive = await getActiveDrive(journeyId);
      if (activeDrive) {
        return reply.redirect(`/journey/${journeyId}/drive/${activeDrive.id}`);
      }

      const supervisors = await listActiveSupervisors(journeyId);
      const supervisorPicker =
        access.role === "student" && supervisors.length > 1
          ? `<div>
               <label for="supervisor">Vilken handledare kör med er?</label>
               <select id="supervisor" name="supervisor_user_id" required class="supervisor-select">
                 ${supervisors
                   .map(
                     (s) =>
                       `<option value="${escapeHtml(s.userId)}">${escapeHtml(s.displayName ?? "Handledare")}</option>`,
                   )
                   .join("")}
               </select>
             </div>`
          : "";

      const skills = await listSkillsForTaxonomy();
      const groups = groupSkillsByArea(skills);

      const areaHtml = [...groups.values()]
        .map(
          (group) => `<section class="skill-area">
            <h3>${escapeHtml(group.areaTitle)}</h3>
            <div class="skill-grid">
              ${group.skills
                .map(
                  (skill) => `<label class="skill-option">
                    <input type="checkbox" name="skill_ids" value="${escapeHtml(skill.skillId)}">
                    <span>${escapeHtml(skill.title)}</span>
                  </label>`,
                )
                .join("")}
            </div>
          </section>`,
        )
        .join("");

      reply.type("text/html").send(
        layout(
          "Välj fokus",
          `<h1>Vad tränar ni på idag?</h1>
           <p>Välj 2–3 moment.</p>
           <p class="focus-count" id="focus-count" aria-live="polite">0 av 3 valda</p>
           <form method="post" action="/journey/${escapeHtml(journeyId)}/drives" class="stack" id="focus-form">
             ${supervisorPicker}
             ${areaHtml}
             ${primaryButton("Starta körpass")}
           </form>
           <script>
             (function () {
               const form = document.getElementById('focus-form');
               const countEl = document.getElementById('focus-count');
               const checkboxes = form.querySelectorAll('input[name="skill_ids"]');

               function updateFocusSelection() {
                 const checked = form.querySelectorAll('input[name="skill_ids"]:checked');
                 const count = checked.length;
                 countEl.textContent = count + ' av 3 valda';
                 checkboxes.forEach((checkbox) => {
                   const option = checkbox.closest('.skill-option');
                   const atMax = count >= 3 && !checkbox.checked;
                   checkbox.disabled = atMax;
                   if (option) {
                     option.classList.toggle('skill-option--disabled', atMax);
                   }
                 });
               }

               checkboxes.forEach((checkbox) => {
                 checkbox.addEventListener('change', updateFocusSelection);
               });
               updateFocusSelection();

               form.addEventListener('submit', function (e) {
                 const checked = form.querySelectorAll('input[name="skill_ids"]:checked');
                 if (checked.length < 2 || checked.length > 3) {
                   e.preventDefault();
                   alert('Välj 2–3 moment.');
                 }
               });
             })();
           </script>`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.post("/journey/:journeyId/drives", async (request, reply) => {
    const { journeyId } = request.params as { journeyId: string };
    const userId = requireSessionUserId(request);
    const body = request.body as {
      skill_ids?: string | string[];
      supervisor_user_id?: string;
    };

    const skillIds = Array.isArray(body.skill_ids)
      ? body.skill_ids
      : body.skill_ids
        ? [body.skill_ids]
        : [];

    try {
      const { drive } = await createDriveWithFocus(
        journeyId,
        userId,
        skillIds,
        body.supervisor_user_id,
      );
      return reply.redirect(`/journey/${journeyId}/drive/${drive.id}`);
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.get("/journey/:journeyId/drive/:driveId", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const userId = requireSessionUserId(request);

    try {
      const drive = await getDrive(journeyId, driveId, userId);
      if (!drive) {
        return reply.status(404).send("Not found");
      }

      if (drive.endedAt) {
        const access = await requireJourneyAccess(journeyId, userId);
        if (
          access.role === "supervisor" &&
          drive.supervisorUserId === userId
        ) {
          const fullyObserved = await isDriveFocusFullyObserved(journeyId, driveId);
          if (fullyObserved) {
            return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
          }
          return reply.redirect(`/journey/${journeyId}/drive/${driveId}/rate`);
        }
        return reply.type("text/html").send(
          layout(
            "Körpass avslutat",
            `<h1>Körpasset är klart</h1>
             <p>Handledaren kan nu bedöma valda moment.</p>
             <a class="btn btn-secondary" href="/journey/${escapeHtml(journeyId)}">Tillbaka till resan</a>`,
          ),
        );
      }

      const access = await requireJourneyAccess(journeyId, userId);
      const focusSkills = await getDriveFocusSkills(journeyId, driveId, userId);
      const isSupervisorOnDrive =
        access.role === "supervisor" && drive.supervisorUserId === userId;

      const canEnd =
        access.role === "student" || drive.supervisorUserId === userId;
      const endSection = canEnd
        ? `<form method="post" action="/journey/${escapeHtml(journeyId)}/drive/${escapeHtml(driveId)}/end">
             ${primaryButton("Körpasset klart")}
           </form>`
        : "";

      if (isSupervisorOnDrive) {
        const latestBySkill = await getLatestDriveObservationsBySkill(journeyId, driveId);
        const latestMap = new Map(
          latestBySkill.map((obs) => [obs.skillId, obs.assessment]),
        );
        const focusList = focusSkills
          .map((skill) =>
            renderSupervisorLiveFocusRow(
              journeyId,
              driveId,
              skill,
              latestMap.get(skill.skillId) ?? null,
            ),
          )
          .join("");

        reply.type("text/html").send(
          layout(
            "Körpass",
            `<h1>Körpass pågår</h1>
             <p class="live-observe__safety">Notera bara när det är säkert.</p>
             <ul class="live-observe__list">${focusList}</ul>
             ${endSection}`,
          ),
        );
        return;
      }

      const focusList = focusSkills
        .map((skill) => `<li>${escapeHtml(skill.title)}</li>`)
        .join("");

      reply.type("text/html").send(
        layout(
          "Körpass",
          `<h1>Körpass pågår</h1>
           <p>Ni tränar på:</p>
           <ul class="focus-list">${focusList}</ul>
           ${endSection}`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.post("/journey/:journeyId/drive/:driveId/end", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const userId = requireSessionUserId(request);

    try {
      const drive = await endDrive(journeyId, driveId, userId);
      if (drive.supervisorUserId === userId) {
        const fullyObserved = await isDriveFocusFullyObserved(journeyId, driveId);
        if (fullyObserved) {
          return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
        }
        return reply.redirect(`/journey/${journeyId}/drive/${driveId}/rate`);
      }
      return reply.redirect(`/journey/${journeyId}/drive/${driveId}`);
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.post("/journey/:journeyId/drive/:driveId/observe", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const observerUserId = requireSessionUserId(request);
    const body = request.body as { skill_id?: string; assessment?: string };

    try {
      await addLiveObservation(journeyId, driveId, observerUserId, {
        skillId: body.skill_id ?? "",
        assessment: body.assessment as AssessmentLevel,
      });
      return reply.redirect(`/journey/${journeyId}/drive/${driveId}`);
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.get("/journey/:journeyId/drive/:driveId/rate", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const userId = requireSessionUserId(request);

    try {
      await requireActiveSupervisor(journeyId, userId);
      const drive = await getDrive(journeyId, driveId, userId);
      if (!drive) {
        return reply.status(404).send("Not found");
      }
      if (drive.supervisorUserId !== userId) {
        throw new AppError("Only the drive supervisor can rate this drive", 403);
      }
      if (!drive.endedAt) {
        return reply.redirect(`/journey/${journeyId}/drive/${driveId}`);
      }
      if (await isDriveFocusFullyObserved(journeyId, driveId)) {
        return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
      }

      const focusSkills = await getDriveFocusSkills(journeyId, driveId, userId);
      const latestBySkill = await getLatestDriveObservationsBySkill(journeyId, driveId);
      const latestMap = new Map(
        latestBySkill.map((obs) => [obs.skillId, obs.assessment]),
      );
      const missingSkillIds = await getMissingDriveFocusSkillIds(journeyId, driveId);
      const missingSet = new Set(missingSkillIds);
      const hasPartialObservations = latestBySkill.length > 0;

      const ratingItems = focusSkills
        .map((skill) => {
          const latest = latestMap.get(skill.skillId);
          if (latest && !missingSet.has(skill.skillId)) {
            return renderReadOnlyObservedSkill(skill.title, latest);
          }
          return `<div class="rating-item">
            <h3>${escapeHtml(skill.title)}</h3>
            <div class="rating-buttons">
              ${RATING_LEVELS.map((level) => renderRatingOption(skill.skillId, level)).join("")}
            </div>
            <input type="hidden" name="skill_ids" value="${escapeHtml(skill.skillId)}">
          </div>`;
        })
        .join("");

      const intro = hasPartialObservations
        ? "<p>Komplettera de moment som saknar bedömning.</p>"
        : "<p>Handledaren bedömer valda moment.</p>";

      reply.type("text/html").send(
        layout(
          "Bedöm körpasset",
          `<h1>Hur gick det?</h1>
           ${intro}
           <form method="post" action="/journey/${escapeHtml(journeyId)}/drive/${escapeHtml(driveId)}/rate" class="rating-list">
             ${ratingItems}
             ${primaryButton("Spara bedömning")}
           </form>`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.post("/journey/:journeyId/drive/:driveId/rate", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const observerUserId = requireSessionUserId(request);

    const body = request.body as Record<string, string | string[]>;

    const skillIds = Array.isArray(body.skill_ids)
      ? body.skill_ids
      : body.skill_ids
        ? [body.skill_ids]
        : [];

    const observations = skillIds.map((skillId) => {
      const assessment = body[`assessment_${skillId}`] as AssessmentLevel;
      return { skillId, assessment };
    });

    try {
      const missingSkillIds = await getMissingDriveFocusSkillIds(
        journeyId,
        driveId,
      );
      const focusSkills = await getDriveFocusSkills(journeyId, driveId, observerUserId);
      const missingSet = new Set(missingSkillIds);

      if (missingSkillIds.length === focusSkills.length) {
        await saveDriveObservations(journeyId, driveId, observerUserId, observations);
      } else if (missingSkillIds.length > 0) {
        const missingObservations = observations.filter((obs) =>
          missingSet.has(obs.skillId),
        );
        await completeMissingDriveObservations(
          journeyId,
          driveId,
          observerUserId,
          missingObservations,
        );
      } else {
        return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
      }
      return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
    } catch (error) {
      const { status, message } = handleError(error);
      if (error instanceof AppError && error.code === "already_rated") {
        return reply.redirect(`/journey/${journeyId}/drive/${driveId}/done`);
      }
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });

  app.get("/journey/:journeyId/drive/:driveId/done", async (request, reply) => {
    const { journeyId, driveId } = request.params as {
      journeyId: string;
      driveId: string;
    };
    const userId = requireSessionUserId(request);

    try {
      await requireJourneyAccess(journeyId, userId);
      const recap = await getDriveObservationRecap(journeyId, driveId);
      const recommendations = await recommendNextFocus(journeyId);

      const recapList = recap.length > 0
        ? `<ul class="drive-recap-list">
             ${recap
               .map((item) => {
                 const display = ASSESSMENT_DISPLAY[item.assessment];
                 return `<li class="drive-recap-item">
                   <span class="drive-recap-signal" aria-hidden="true">${display.signal}</span>
                   <span class="drive-recap-copy">
                     <span class="drive-recap-title">${escapeHtml(item.title)}</span>
                     <span class="drive-recap-label">${escapeHtml(display.label)}</span>
                   </span>
                 </li>`;
               })
               .join("")}
           </ul>`
        : "";

      const recList = recommendations.length > 0
        ? `<ul class="recommendation-list">
             ${recommendations
               .map(
                 (rec) => `<li>
                   <span class="recommendation-title">${escapeHtml(rec.title)}</span>
                   <span class="recommendation-message">${escapeHtml(rec.message)}</span>
                 </li>`,
               )
               .join("")}
           </ul>`
        : `<p class="muted">Inga rekommendationer ännu.</p>`;

      reply.type("text/html").send(
        layout(
          "Körpass klart",
          `${recapList ? `<section class="drive-recap">
             <h1>Så gick det</h1>
             ${recapList}
           </section>` : ""}
           <section class="drive-next">
             <h2>Nästa gång</h2>
             ${recList}
           </section>
           <a class="btn btn-primary" href="/journey/${escapeHtml(journeyId)}">Tillbaka till resan</a>`,
        ),
      );
    } catch (error) {
      const { status, message } = handleError(error);
      return reply.status(status).type("text/html").send(
        layout("Fel", errorBanner(message)),
      );
    }
  });
}
