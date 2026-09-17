import { escapeHtml, errorBanner, primaryButton, siteLayout } from "./layout.js";
import type { InterestRole } from "../services/interest.js";

const ROLE_LABELS: Record<InterestRole, string> = {
  parent: "Förälder / vårdnadshavare",
  student: "Elev",
  supervisor: "Handledare",
  other: "Annat",
};

export function renderLandingPage(options: {
  errorMessage?: string;
  values?: {
    name?: string;
    email?: string;
    role?: string;
    city?: string;
    message?: string;
  };
} = {}): string {
  const values = options.values ?? {};
  const formError = options.errorMessage ? errorBanner(options.errorMessage) : "";

  return siteLayout(
    "Övningskör med en plan",
    `${siteHeader()}
     <main>
       ${hero()}
       ${problem()}
       ${howItWorks()}
       ${multiSupervisor()}
       ${principles()}
       ${faq()}
       ${interestSection(formError, values)}
     </main>
     ${siteFooter()}`,
  );
}

export function renderInterestThanksPage(): string {
  return siteLayout(
    "Tack för din anmälan",
    `${siteHeader()}
     <main>
       <section class="site-section site-section--cream">
         <div class="site-inner site-inner--narrow">
           <p class="eyebrow">Betan</p>
           <h1>Tack — vi hör av oss.</h1>
           <p class="lede">Din intresseanmälan är inne. Körpasset är gratis under betaperioden. Vi tar in familjer löpande och mejlar när det är dags.</p>
           <p>Ingen betalvägg. Inget löfte om livstidsfri användning. Du hjälper oss se att kärnloopen håller i riktig övningskörning.</p>
           <p><a class="btn-link" href="/">Tillbaka till startsidan</a></p>
         </div>
       </section>
     </main>
     ${siteFooter()}`,
    {
      description: "Tack för din intresseanmälan till Körpassets beta.",
    },
  );
}

export function renderLegalPage(title: string, body: string): string {
  return siteLayout(
    title,
    `${siteHeader()}
     <main>
       <article class="site-section site-section--cream">
         <div class="site-inner site-inner--narrow legal">
           ${body}
         </div>
       </article>
     </main>
     ${siteFooter()}`,
  );
}

export function siteHeader(options: { ctaHref?: string; variant?: "site" | "admin" } = {}): string {
  if (options.variant === "admin") {
    return `<header class="site-nav">
    <a class="site-logo" href="/admin">Körpasset admin</a>
    <nav class="site-nav__links" aria-label="Admin">
      <a href="/admin/signups">Anmälningar</a>
      <a href="/">Till sajten</a>
    </nav>
  </header>`;
  }

  const ctaHref = options.ctaHref ?? "/#intresse";
  return `<header class="site-nav">
    <a class="site-logo" href="/">Körpasset</a>
    <nav class="site-nav__links" aria-label="Huvudmeny">
      <a href="/#sa-funkar-det">Så funkar det</a>
      <a href="/#intresse" class="site-nav__cta">Bli betatestare</a>
    </nav>
    <a class="site-nav__cta site-nav__cta--mobile" href="${escapeHtml(ctaHref)}">Bli betatestare</a>
  </header>`;
}

export function siteFooter(): string {
  return `<footer class="site-footer">
    <div class="site-inner site-footer__grid">
      <div>
        <p class="site-logo">Körpasset</p>
        <p>Övningskör med en plan.</p>
      </div>
      <div>
        <a href="/integritet">Integritet</a>
        <a href="/villkor">Villkor</a>
        <a href="/kontakt">Kontakt</a>
      </div>
      <p class="muted">Körpasset är en fristående tjänst från Papa Bravo AB. Inte utvecklad av, ansluten till eller godkänd av Transportstyrelsen eller Trafikverket.</p>
    </div>
  </footer>`;
}

function hero(): string {
  return `<section class="hero">
    <div class="site-inner hero__grid">
      <div>
        <p class="eyebrow">Privat övningskörning · B-körkort</p>
        <h1>Övningskör med en plan.</h1>
        <p class="lede">Välj vad ni ska träna på. Kör. Följ upp på några sekunder.</p>
        <p>Körpasset håller ihop elevens träning mellan en eller flera handledare — så nästa körpass kan fortsätta där det förra slutade.</p>
        <div class="hero__ctas">
          <a class="btn btn-primary" href="#intresse">Bli betatestare</a>
          <a class="btn-link" href="#sa-funkar-det">Se hur det fungerar</a>
        </div>
        <p class="hero__trust">Gratis under betan · Inga betaluppgifter · Webb först</p>
      </div>
      ${heroCard()}
    </div>
  </section>`;
}

function heroCard(): string {
  return `<aside class="pass-card" aria-label="Exempel på ett körpass">
    <p class="pass-card__stamp">Körpasset</p>
    <h2>Dagens fokus</h2>
    <ol>
      <li>Infart i rondell</li>
      <li>Spegelrutin</li>
      <li>Högerregeln</li>
    </ol>
    <div class="pass-card__recap">
      <p class="pass-card__label">Så gick körpasset</p>
      <p>Infart i rondell — <strong>Med påminnelse</strong></p>
      <p>Spegelrutin — <strong>Utan hjälp</strong></p>
    </div>
    <div class="pass-card__next">
      <p class="pass-card__label">Nästa gång</p>
      <p>Trafikljus · Döda vinkeln · Väjningsplikt</p>
    </div>
  </aside>`;
}

function problem(): string {
  return `<section class="site-section site-section--white" id="problemet">
    <div class="site-inner">
      <p class="eyebrow">Varför Körpasset</p>
      <h2>När flera hjälper till blir övningskörningen lätt spretig.</h2>
      <p class="lede">Pappa vet inte vad mamma övade på sist. Eleven hör olika råd. Ingen har en gemensam bild av vad som faktiskt tränats.</p>
      <div class="card-grid">
        <article class="value-card">
          <h3>Vad ska vi träna på idag?</h3>
          <p>Välj 2–3 moment före körpasset. Inte hela kursplanen. Inte “kör runt lite”.</p>
        </article>
        <article class="value-card">
          <h3>Hur gick det?</h3>
          <p>Handledaren bedömer bara dagens fokus. Tre nivåer. Ungefär 15–20 sekunder.</p>
        </article>
        <article class="value-card">
          <h3>Vad bör vi träna på nästa gång?</h3>
          <p>Recap och nästa fokus följer eleven — oavsett vem som sitter bredvid.</p>
        </article>
      </div>
    </div>
  </section>`;
}

function howItWorks(): string {
  return `<section class="site-section site-section--cream" id="sa-funkar-det">
    <div class="site-inner">
      <p class="eyebrow">Tre steg</p>
      <h2>Så fungerar Körpasset</h2>
      <ol class="steps">
        <li>
          <span class="steps__num">1</span>
          <div>
            <h3>Eleven skapar resan och bjuder in</h3>
            <p>QR eller länk till handledaren. Ingen administration för den som ska sitta bredvid.</p>
          </div>
        </li>
        <li>
          <span class="steps__num">2</span>
          <div>
            <h3>Ni väljer dagens fokus och kör</h3>
            <p>2–3 moment. Finns flera handledare väljer eleven vem som kör med dem idag.</p>
          </div>
        </li>
        <li>
          <span class="steps__num">3</span>
          <div>
            <h3>Handledaren följer upp på några sekunder</h3>
            <p>Behöver hjälp / Med påminnelse / Utan hjälp. Sen recap och ett förslag på nästa gång.</p>
          </div>
        </li>
      </ol>
    </div>
  </section>`;
}

function multiSupervisor(): string {
  return `<section class="site-section site-section--navy" id="handledare">
    <div class="site-inner site-inner--narrow">
      <p class="eyebrow">Flera handledare</p>
      <h2>Pappa vet vad mamma övade på sist.</h2>
      <p class="lede">När flera hjälper till med övningskörningen blir det lätt spretigt. Körpasset håller ihop träningen kring eleven, så nästa körpass kan fortsätta där det förra slutade – oavsett vem som sitter bredvid.</p>
      <p>Observationer och rekommendationer tillhör elevens körkortsresa, inte en enskild handledare. Ingen ska behöva mejla över en lista till nästa pass.</p>
    </div>
  </section>`;
}

function principles(): string {
  return `<section class="site-section site-section--white">
    <div class="site-inner">
      <p class="eyebrow">Vad Körpasset inte är</p>
      <h2>Utveckling utan falska procentsiffror.</h2>
      <div class="card-grid">
        <article class="value-card">
          <h3>Inte en teoriapp</h3>
          <p>Körpasset äger den praktiska träningsloopen. Inte kunskapsfrågor, inte provsimulator.</p>
        </article>
        <article class="value-card">
          <h3>Ingen “87 % körklar”</h3>
          <p>Vi visar evidens: inte tränat ännu, behöver hjälp, med påminnelse, utan hjälp. Inte certifiering.</p>
        </article>
        <article class="value-card">
          <h3>Byggd mot officiell vägledning</h3>
          <p>Taxonomin utgår från svenska regler och vägledning för privat övningskörning. Körpasset är ändå en fristående tjänst.</p>
        </article>
      </div>
    </div>
  </section>`;
}

function faq(): string {
  return `<section class="site-section site-section--cream" id="fragor">
    <div class="site-inner site-inner--narrow">
      <p class="eyebrow">Vanliga frågor</p>
      <h2>Innan ni anmäler er</h2>
      <div class="faq">
        <details open>
          <summary>Kostar Körpasset något under betan?</summary>
          <p>Nej. Körpasset är gratis under betaperioden. Du får tidig tillgång och hjälper oss förbättra tjänsten. Vi lovar inte livstidsfri användning och tar inte emot betaluppgifter nu.</p>
        </details>
        <details>
          <summary>Måste vi gå på trafikskola?</summary>
          <p>Nej. v1 är privat övningskörning. Ingen trafikskoleportal och inga externa myndighets-API:er.</p>
        </details>
        <details>
          <summary>Kan flera handledare vara med?</summary>
          <p>Ja. Det är ett centralt värde. Samma elevresa, flera handledare, gemensam historik.</p>
        </details>
        <details>
          <summary>Finns det en app?</summary>
          <p>Just nu är Körpasset en webbapp på korpasset.se. iPhone och Android via TestFlight och Play kommer inför öppen beta. Du kan anmäla er redan nu.</p>
        </details>
        <details>
          <summary>Är Körpasset från Transportstyrelsen?</summary>
          <p>Nej. Körpasset är en fristående tjänst och är inte utvecklad av, ansluten till eller godkänd av Transportstyrelsen eller Trafikverket. Den är däremot utvecklad med utgångspunkt i deras regler och vägledning.</p>
        </details>
      </div>
    </div>
  </section>`;
}

function interestSection(
  formError: string,
  values: {
    name?: string;
    email?: string;
    role?: string;
    city?: string;
    message?: string;
  },
): string {
  const roleOptions = (Object.entries(ROLE_LABELS) as [InterestRole, string][])
    .map(([value, label]) => {
      const selected = values.role === value ? " selected" : "";
      return `<option value="${value}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  return `<section class="site-section site-section--cta" id="intresse">
    <div class="site-inner site-inner--narrow">
      <p class="eyebrow">Beta</p>
      <h2>Bli betatestare</h2>
      <p class="lede">Vi tar in familjer som övningskör privat mot B-körkort. Anmäl intresse så hör vi av oss när det är er tur.</p>
      ${formError}
      <form method="post" action="/interest" class="interest-form" novalidate>
        <div class="hp" aria-hidden="true">
          <label for="website">Webbplats</label>
          <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>
        <div>
          <label for="name">Namn</label>
          <input id="name" name="name" type="text" required maxlength="80" autocomplete="name" value="${escapeHtml(values.name ?? "")}">
        </div>
        <div>
          <label for="email">Mejladress</label>
          <input id="email" name="email" type="email" required maxlength="120" autocomplete="email" value="${escapeHtml(values.email ?? "")}">
        </div>
        <div>
          <label for="role">Jag är</label>
          <select id="role" name="role" required>
            <option value="">Välj…</option>
            ${roleOptions}
          </select>
        </div>
        <div>
          <label for="city">Ort <span class="optional">(valfritt)</span></label>
          <input id="city" name="city" type="text" maxlength="80" autocomplete="address-level2" value="${escapeHtml(values.city ?? "")}">
        </div>
        <div>
          <label for="message">Kort om er övningskörning <span class="optional">(valfritt)</span></label>
          <textarea id="message" name="message" maxlength="1000" rows="4" placeholder="Till exempel: elev + mamma och pappa, kört i tre månader">${escapeHtml(values.message ?? "")}</textarea>
        </div>
        <label class="consent">
          <input type="checkbox" name="consent" value="yes" required>
          <span>Jag vill bli kontaktad om betan. Vi använder uppgifterna bara för det. Läs mer i <a href="/integritet">integritetspolicyn</a>.</span>
        </label>
        ${primaryButton("Skicka intresseanmälan")}
      </form>
    </div>
  </section>`;
}

export function renderInterestFormError(
  message: string,
  values: {
    name?: string;
    email?: string;
    role?: string;
    city?: string;
    message?: string;
  },
): string {
  return renderLandingPage({ errorMessage: message, values });
}
