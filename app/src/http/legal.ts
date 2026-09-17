import { renderLegalPage } from "./landing.js";

export function privacyPage(): string {
  return renderLegalPage(
    "Integritetspolicy",
    `<h1>Integritetspolicy</h1>
     <p>Senast uppdaterad: 17 september 2026.</p>
     <p>Papa Bravo AB är personuppgiftsansvarig för Körpasset. Vi samlar in så lite som möjligt, säljer inte dina uppgifter och använder dem inte för riktad annonsmarknadsföring.</p>

     <h2>Intresseanmälan till betan</h2>
     <p>När du anmäler intresse behandlar vi namn, e-post, roll (elev, förälder, handledare eller annat) samt valfri ort och fritext. Rättslig grund är samtycke. Syftet är att kontakta dig om betan och administrera kön.</p>
     <p>Vi använder inte uppgifterna till nyhetsbrev, säljmejl eller profilering.</p>

     <h2>När du använder produkten</h2>
     <p>Om du senare får tillgång till Körpasset behandlar vi det som behövs för körkortsresan: visningsnamn, session, inbjudningar, körpass, observationer och rekommendationer. Rättslig grund är att tillhandahålla tjänsten.</p>
     <p>Vi samlar inte in personnummer, GPS-spår eller hälsodata.</p>

     <h2>Lagring</h2>
     <p>Uppgifterna lagras på Körpassets server och databas inom EU/EES. Förbindelsen är HTTPS. Intresseanmälningar sparas tills du återkallar samtycket, eller tills betan är avslutad och vi inte längre behöver kön — som längst 18 månader efter att du anmälde dig, om du inte blivit användare.</p>

     <h2>Dina rättigheter</h2>
     <p>Du kan begära registerutdrag, rättelse, radering eller återkalla samtycket via <a href="/kontakt">kontakt</a>. Du kan klaga till Integritetsskyddsmyndigheten.</p>

     <h2>Cookies</h2>
     <p>På landningssidan sätter vi inga analys- eller reklamcookies. Om du loggar in i produkten används en nödvändig sessionscookie för att hålla dig inloggad.</p>`,
  );
}

export function termsPage(): string {
  return renderLegalPage(
    "Användarvillkor",
    `<h1>Användarvillkor</h1>
     <p>Senast uppdaterad: 17 september 2026.</p>
     <p>Körpasset är en digital tjänst för privat övningskörning mot svenskt B-körkort. Tjänsten tillhandahålls av Papa Bravo AB.</p>

     <h2>Beta</h2>
     <p>Under den första betan är Körpasset gratis. En intresseanmälan ger inte automatiskt tillgång och är inte ett löfte om livstidsfri användning. Vi väljer in familjer löpande.</p>

     <h2>Vad tjänsten är — och inte är</h2>
     <p>Körpasset hjälper elev och handledare att planera, följa upp och hålla ihop praktisk träning. Det är inte en teoriapp, inte en AI-trafiklärare, inte en trafikskoleportal och inte ett officiellt körkortsdokument. Körpasset är inte utvecklat av, anslutet till eller godkänt av Transportstyrelsen eller Trafikverket.</p>
     <p>Produkten visar inte påstådd uppkörningsberedskap i procent och ersätter inte handledarens ansvar i bilen.</p>

     <h2>Ansvar</h2>
     <p>Du ansvarar för att de uppgifter du lämnar är riktiga och för hur ni övningskör. Körpasset tillhandahålls i befintligt skick. Svensk lag gäller.</p>

     <h2>Kontakt</h2>
     <p>Frågor: <a href="/kontakt">kontakta oss</a>.</p>`,
  );
}

export function contactPage(): string {
  return renderLegalPage(
    "Kontakt",
    `<h1>Kontakt</h1>
     <p>Körpasset är i sluten beta. Den snabbaste vägen är <a href="/#intresse">intresseanmälan</a> — då hamnar du i kön och vi kan återkomma.</p>
     <p>Personuppgiftsfrågor och övrig kontakt: använd samma formulär och skriv vad det gäller i meddelandefältet, så sorterar vi det i admin.</p>
     <p>Personuppgiftsansvarig: Papa Bravo AB.</p>
     <p>Körpasset är en fristående tjänst och är inte utvecklad av, ansluten till eller godkänd av Transportstyrelsen eller Trafikverket.</p>`,
  );
}
