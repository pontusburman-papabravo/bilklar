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

export function siteLayout(
  title: string,
  body: string,
  options: { description?: string; extraCss?: string[] } = {},
): string {
  const description =
    options.description ??
    "Övningskör med en plan. Körpasset hjälper elev och handledare att välja dagens fokus, följa upp på några sekunder och hålla ihop träningen mellan flera handledare.";
  const extraCss = (options.extraCss ?? [])
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Körpasset</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)} · Körpasset">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/landing.css">
  ${extraCss}
</head>
<body class="site">
  ${body}
</body>
</html>`;
}

export function primaryButton(label: string, attrs = ""): string {
  return `<button type="submit" class="btn btn-primary" ${attrs}>${escapeHtml(label)}</button>`;
}

export function errorBanner(message: string): string {
  return `<div class="banner banner-error" role="alert">${escapeHtml(message)}</div>`;
}
