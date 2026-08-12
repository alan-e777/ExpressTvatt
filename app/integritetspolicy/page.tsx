import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/firebase-admin";
import { withGdprDefaults, type GdprSettings } from "@/lib/gdpr";

export const metadata: Metadata = {
  title: "Integritetspolicy — Express Tvätt",
  description: "Hur vi behandlar personuppgifter enligt GDPR.",
};

// Retention figures and controller details are admin-editable, so the page must
// not be cached into a stale version of the policy.
export const dynamic = "force-dynamic";

async function getSettings(): Promise<GdprSettings> {
  try {
    const snap = await db.collection("settings").doc("gdpr").get();
    return withGdprDefaults(snap.exists ? (snap.data() as Partial<GdprSettings>) : {});
  } catch {
    return withGdprDefaults(undefined);
  }
}

export default async function PrivacyPolicyPage() {
  const s = await getSettings();

  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link href="/" className="legal-back">← Tillbaka till startsidan</Link>

        <h1 className="legal-h1">Integritetspolicy</h1>
        <p className="legal-meta">
          Version {s.policyVersion} · Senast uppdaterad {s.lastUpdated} ·{" "}
          <a href="#english">In English below</a>
        </p>

        {/* ── SWEDISH ─────────────────────────────────────────────────────── */}
        <section className="legal-body">
          <h2>1. Personuppgiftsansvarig</h2>
          <p>
            {s.companyName}, org.nr {s.orgNumber}, {s.postalAddress}, är personuppgiftsansvarig för
            behandlingen av personuppgifter som beskrivs i denna policy. Frågor om integritet
            besvaras på <a href={`mailto:${s.privacyEmail}`}>{s.privacyEmail}</a> eller {s.privacyPhone}.
          </p>
          <p>
            <strong>Express Tvätt</strong> är ett varumärke och en tjänst som tillhandahålls av{" "}
            {s.companyName}. Hänvisningar till ”vi”, ”oss” och ”Express Tvätt” i denna policy avser
            {" "}{s.companyName}.
          </p>

          <h2>2. Vilka personuppgifter vi behandlar</h2>
          <ul>
            <li><strong>Identitets- och kontaktuppgifter:</strong> namn, e-postadress, telefonnummer.</li>
            <li><strong>Kontouppgifter:</strong> användar-ID och lösenord (lösenord lagras krypterat av Google Firebase Authentication och är aldrig läsbara för oss).</li>
            <li><strong>Adressuppgifter:</strong> gatuadress, postnummer och eventuella leveransanvisningar för upphämtning och avlämning, inklusive sparade adresser.</li>
            <li><strong>Personnummer:</strong> tioställigt personnummer, om du väljer att använda RUT-avdrag. Uppgiften krävs för att kunna begära skattereduktion hos Skatteverket.</li>
            <li><strong>Orderuppgifter:</strong> beställda tjänster och plagg, priser, rabatter, belopp, betalningsstatus, tider för upphämtning och avlämning samt fritextnoteringar du lämnar.</li>
            <li><strong>Betalningsuppgifter:</strong> betalningen genomförs av Stripe. Vi lagrar inte kortnummer. Vi lagrar betalningsreferens, belopp, valuta och status.</li>
            <li><strong>Kommunikation:</strong> meddelanden du skickar i chattfunktionen samt e-post och SMS vi skickar om din order.</li>
            <li><strong>Teknisk information:</strong> vår leverantör av webbhotell (Vercel) loggar IP-adress och teknisk information om din enhet i säkerhets- och driftsyfte.</li>
            <li><strong>Push-token:</strong> om du använder vår mobilapp lagras en teknisk identifierare för att kunna skicka aviseringar.</li>
          </ul>

          <h2>3. Ändamål och rättslig grund</h2>
          <ul>
            <li><strong>Fullgöra avtalet</strong> (art. 6.1 b): utföra beställd tvätt, hämta och lämna, hantera betalning och kontakta dig om din order.</li>
            <li><strong>Rättslig förpliktelse</strong> (art. 6.1 c): bokföring och redovisning enligt bokföringslagen, samt rapportering av RUT-avdrag till Skatteverket.</li>
            <li><strong>Berättigat intresse</strong> (art. 6.1 f): förebygga bedrägeri och missbruk, säkerställa driftsäkerhet, hantera reklamationer och rättsliga anspråk samt utveckla och förbättra tjänsten. Vi har bedömt att dessa intressen väger tyngre än det begränsade integritetsintrång behandlingen innebär.</li>
            <li><strong>Samtycke</strong> (art. 6.1 a): endast där det uttryckligen inhämtas, exempelvis vid frivillig lagring av personnummer i din profil. Samtycke kan när som helst återkallas, vilket dock inte påverkar lagligheten av behandling som skett dessförinnan.</li>
          </ul>

          <h2>4. Mottagare och personuppgiftsbiträden</h2>
          <p>Vi delar uppgifter med följande leverantörer, som endast får behandla uppgifterna enligt våra instruktioner:</p>
          <ul>
            <li><strong>Google Ireland Ltd / Google Cloud (Firebase)</strong> — databas, inloggning och chatt. Databaserna är placerade inom EU (Stockholm respektive Belgien).</li>
            <li><strong>Stripe</strong> — betalningar. Stripe är självständigt personuppgiftsansvarig för sin betalningshantering.</li>
            <li><strong>Vercel</strong> — webbhotell och driftloggar.</li>
            <li><strong>Resend</strong> — utskick av transaktionsmejl.</li>
            <li><strong>46elks</strong> — utskick av SMS om orderstatus.</li>
            <li><strong>Google Maps Platform</strong> — adressförslag. Det du skriver i adressfältet skickas till Google för att ge förslag.</li>
            <li><strong>Expo</strong> — push-aviseringar till mobilappen.</li>
            <li><strong>Skatteverket</strong> — vid RUT-avdrag lämnas personnummer och underlag till Skatteverket enligt lag.</li>
          </ul>
          <p>
            Vi kan komma att anlita ytterligare leverantörer i takt med att tjänsten utvecklas. Vid
            väsentliga förändringar uppdateras denna policy.
          </p>

          <h2>5. Överföring utanför EU/EES</h2>
          <p>
            Våra databaser är placerade inom EU. Vissa leverantörer, särskilt Stripe och Vercel, kan
            dock behandla eller ge support från länder utanför EU/EES. Sådan överföring sker med stöd
            av EU-kommissionens standardavtalsklausuler (SCC) eller annan giltig skyddsmekanism.
          </p>

          <h2>6. Hur länge vi sparar uppgifterna</h2>
          <ul>
            <li><strong>Kund- och orderuppgifter:</strong> upp till {s.customerDataRetentionYears} år.</li>
            <li><strong>Bokföringsunderlag:</strong> minst {s.accountingRetentionYears} år enligt bokföringslagen, och längre om det krävs för rättsliga anspråk.</li>
            <li><strong>Personnummer för RUT:</strong> upp till {s.personnummerRetentionYears} år, eftersom underlaget kan behöva visas upp för Skatteverket.</li>
            <li><strong>Chattkonversationer:</strong> upp till {s.chatRetentionMonths} månader.</li>
            <li><strong>Vilande konton:</strong> upp till {s.inactiveAccountRetentionYears} år efter senaste aktivitet.</li>
          </ul>
          <p>
            Uppgifter kan sparas längre om det är nödvändigt för att fastställa, göra gällande eller
            försvara rättsliga anspråk, eller om lag kräver det.
          </p>

          <h2>7. Dina rättigheter</h2>
          <p>Du har rätt att begära tillgång till dina uppgifter (registerutdrag), rättelse, radering, begränsning av behandling, dataportabilitet, samt att invända mot behandling som sker med stöd av berättigat intresse. Har du lämnat samtycke kan du återkalla det.</p>
          <p>
            <strong>Viktig begränsning:</strong> uppgifter som omfattas av bokföringsskyldighet eller
            annan rättslig förpliktelse kan inte raderas på begäran förrän den lagstadgade
            lagringstiden har löpt ut. Vi kan i sådana fall begränsa behandlingen i stället för att
            radera.
          </p>
          <p>
            Kontakta oss på <a href={`mailto:${s.privacyEmail}`}>{s.privacyEmail}</a>. Du har även
            rätt att klaga till <strong>Integritetsskyddsmyndigheten (IMY)</strong>,{" "}
            <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a>.
          </p>

          <h2>8. Cookies och liknande tekniker</h2>
          <p>
            Vi använder inga cookies för analys, marknadsföring eller spårning, och vi har inga
            tredjepartspixlar på webbplatsen. Vi använder en nödvändig cookie för inloggning i vårt
            interna administrationsgränssnitt. Vår webbplats och app använder även teknisk lagring i
            din webbläsare för att hålla dig inloggad. Dessa är nödvändiga för att tjänsten ska
            fungera och kräver inte samtycke.
          </p>

          <h2>9. Säkerhet</h2>
          <p>
            Vi vidtar rimliga tekniska och organisatoriska säkerhetsåtgärder för att skydda
            personuppgifter, bland annat behörighetsstyrning och krypterad överföring. Ingen
            överföring eller lagring kan dock garanteras vara fullständigt säker. Vi ansvarar inte
            för säkerhetsincidenter hos tredje part, händelser utanför vår rimliga kontroll, eller
            skada som uppstår genom att du delat dina inloggningsuppgifter med annan.
          </p>

          <h2>10. Automatiserat beslutsfattande</h2>
          <p>Vi använder inte automatiserat beslutsfattande eller profilering som har rättsliga följder för dig.</p>

          <h2>11. Barn</h2>
          <p>Tjänsten riktar sig inte till barn under 18 år och vi samlar inte medvetet in uppgifter om barn.</p>

          <h2>12. Ändringar</h2>
          <p>
            Vi kan uppdatera denna policy när som helst. Den senaste versionen publiceras alltid här.
            Vid väsentliga ändringar informerar vi där lag kräver det.
          </p>
        </section>

        {/* ── ENGLISH ─────────────────────────────────────────────────────── */}
        <hr className="legal-rule" id="english" />

        <section className="legal-body">
          <h2 className="legal-h2-lang">Privacy Policy (English)</h2>
          <p className="legal-meta">
            Version {s.policyVersion} · Last updated {s.lastUpdated}. The Swedish version prevails in
            the event of any discrepancy.
          </p>

          <h2>1. Data controller</h2>
          <p>
            {s.companyName}, company reg. no. {s.orgNumber}, {s.postalAddress}, is the controller for
            the processing described here. Privacy enquiries:{" "}
            <a href={`mailto:${s.privacyEmail}`}>{s.privacyEmail}</a> or {s.privacyPhone}.
          </p>
          <p>
            <strong>Express Tvätt</strong> is a brand and service operated by {s.companyName}.
            References to &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;Express Tvätt&rdquo; in this
            policy mean {s.companyName}.
          </p>

          <h2>2. Personal data we process</h2>
          <ul>
            <li><strong>Identity and contact data:</strong> name, email address, telephone number.</li>
            <li><strong>Account data:</strong> user ID and password (passwords are hashed by Google Firebase Authentication and are never readable by us).</li>
            <li><strong>Address data:</strong> street address, postcode and delivery instructions for pickup and drop-off, including saved addresses.</li>
            <li><strong>Personnummer (Swedish personal identity number):</strong> collected only if you use the RUT tax deduction, which requires it for the claim to Skatteverket.</li>
            <li><strong>Order data:</strong> items and services ordered, prices, discounts, amounts, payment status, pickup and delivery times, and any free-text notes you provide.</li>
            <li><strong>Payment data:</strong> payments are handled by Stripe. We do not store card numbers. We store the payment reference, amount, currency and status.</li>
            <li><strong>Communications:</strong> messages sent through the chat, and the emails and SMS we send about your order.</li>
            <li><strong>Technical data:</strong> our hosting provider (Vercel) logs IP address and device information for security and operational purposes.</li>
            <li><strong>Push token:</strong> if you use our mobile app, a technical identifier is stored so notifications can be delivered.</li>
          </ul>

          <h2>3. Purposes and legal bases</h2>
          <ul>
            <li><strong>Performance of a contract</strong> (Art. 6(1)(b)): providing the cleaning service, pickup and delivery, processing payment and contacting you about your order.</li>
            <li><strong>Legal obligation</strong> (Art. 6(1)(c)): accounting under the Swedish Bookkeeping Act, and reporting RUT deductions to Skatteverket.</li>
            <li><strong>Legitimate interests</strong> (Art. 6(1)(f)): preventing fraud and abuse, maintaining operational security, handling complaints and legal claims, and improving the service. We consider these interests to outweigh the limited privacy impact.</li>
            <li><strong>Consent</strong> (Art. 6(1)(a)): only where expressly obtained, such as optionally saving your personnummer to your profile. Consent may be withdrawn at any time without affecting the lawfulness of prior processing.</li>
          </ul>

          <h2>4. Recipients and processors</h2>
          <p>We share data with the following providers, who may process it only on our instructions:</p>
          <ul>
            <li><strong>Google Ireland Ltd / Google Cloud (Firebase)</strong> — database, authentication and chat. Databases are located in the EU (Stockholm and Belgium).</li>
            <li><strong>Stripe</strong> — payments; an independent controller for its own payment processing.</li>
            <li><strong>Vercel</strong> — hosting and operational logs.</li>
            <li><strong>Resend</strong> — transactional email.</li>
            <li><strong>46elks</strong> — order-status SMS.</li>
            <li><strong>Google Maps Platform</strong> — address autocomplete; what you type into the address field is sent to Google to return suggestions.</li>
            <li><strong>Expo</strong> — mobile push notifications.</li>
            <li><strong>Skatteverket</strong> — where RUT is used, your personnummer and supporting data are provided to the Swedish Tax Agency as required by law.</li>
          </ul>
          <p>We may engage additional providers as the service develops; this policy is updated on material changes.</p>

          <h2>5. Transfers outside the EU/EEA</h2>
          <p>
            Our databases are located within the EU. Certain providers, in particular Stripe and
            Vercel, may nonetheless process data or provide support from outside the EU/EEA. Such
            transfers rely on the European Commission's Standard Contractual Clauses or another valid
            safeguard.
          </p>

          <h2>6. Retention</h2>
          <ul>
            <li><strong>Customer and order data:</strong> up to {s.customerDataRetentionYears} years.</li>
            <li><strong>Accounting records:</strong> at least {s.accountingRetentionYears} years as required by the Swedish Bookkeeping Act, and longer where needed for legal claims.</li>
            <li><strong>Personnummer for RUT:</strong> up to {s.personnummerRetentionYears} years, as the claim may need to be substantiated to Skatteverket.</li>
            <li><strong>Chat conversations:</strong> up to {s.chatRetentionMonths} months.</li>
            <li><strong>Dormant accounts:</strong> up to {s.inactiveAccountRetentionYears} years after last activity.</li>
          </ul>
          <p>Data may be kept longer where necessary to establish, exercise or defend legal claims, or where required by law.</p>

          <h2>7. Your rights</h2>
          <p>You may request access, rectification, erasure, restriction of processing and data portability, and you may object to processing based on legitimate interests. Where you have given consent, you may withdraw it.</p>
          <p>
            <strong>Important limitation:</strong> data subject to accounting or other statutory
            obligations cannot be erased on request until the statutory retention period has expired.
            In such cases we may restrict processing instead of deleting.
          </p>
          <p>
            Contact <a href={`mailto:${s.privacyEmail}`}>{s.privacyEmail}</a>. You also have the right
            to lodge a complaint with the Swedish Authority for Privacy Protection (IMY),{" "}
            <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a>.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use no analytics, advertising or tracking cookies, and no third-party pixels. We use one
            strictly necessary cookie for logging in to our internal admin interface, and technical
            browser storage to keep you signed in. These are required for the service to function and
            do not require consent.
          </p>

          <h2>9. Security</h2>
          <p>
            We apply reasonable technical and organisational measures, including access controls and
            encrypted transmission. No transmission or storage can be guaranteed completely secure. We
            are not liable for security incidents at third parties, events beyond our reasonable
            control, or exposure caused by you sharing your credentials.
          </p>

          <h2>10. Automated decision-making</h2>
          <p>We do not carry out automated decision-making or profiling producing legal effects concerning you.</p>

          <h2>11. Children</h2>
          <p>The service is not directed at children under 18 and we do not knowingly collect their data.</p>

          <h2>12. Changes</h2>
          <p>We may update this policy at any time. The current version is always published here, and we give notice of material changes where required by law.</p>
        </section>

        <p className="legal-foot">
          {s.companyName} · Org.nr {s.orgNumber} · {s.postalAddress}
        </p>
      </div>
    </div>
  );
}
