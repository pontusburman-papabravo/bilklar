export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Körpasset</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <main class="container">
    ${body}
  </main>
</body>
</html>`;
}

export function primaryButton(label: string, attrs = ""): string {
  return `<button type="submit" class="btn btn-primary" ${attrs}>${escapeHtml(label)}</button>`;
}

export function errorBanner(message: string): string {
  return `<div class="banner banner-error" role="alert">${escapeHtml(message)}</div>`;
}

export function missingSessionPage(): string {
  return layout(
    "Session saknas",
    `${errorBanner("Vi känner inte igen den här enheten.")}
     <h1>Öppna Körpasset igen</h1>
     <p>Om du är elev kan du starta eller fortsätta din körkortsresa här. Om du är handledare: öppna inbjudningslänken från eleven, eller be om en ny.</p>
     <a class="btn btn-primary" href="/onboarding">Starta som elev</a>
     <p class="muted">Inbjudningslänken ser ut som korpasset.se/invite/…</p>`,
  );
}

export function invitationAlreadyUsedPage(studentName: string): string {
  return layout(
    "Inbjudan redan använd",
    `${errorBanner("Den här inbjudan är redan använd.")}
     <h1>Be om en ny länk</h1>
     <p>Inbjudan till ${escapeHtml(studentName)}s körkortsresa har redan accepterats.</p>
     <p>Om du redan anslutit: öppna Körpasset på samma telefon som förut. Om du bytt telefon, be eleven skapa en ny inbjudan.</p>
     <a class="btn btn-secondary" href="/">Till startsidan</a>`,
  );
}
