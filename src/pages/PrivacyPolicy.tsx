import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Effective date / Gültigkeitsdatum: May 15, 2025
        </p>

        <div className="space-y-10">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              1. Introduction / Einleitung
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Welcome to Reflectlife (www.reflectlife.net), an online remembrance platform operated by Sypera
                UG (Rablstr. 12/629, 81669 Munich, Germany).
              </p>
              <p>
                We respect your privacy and are committed to protecting your personal data. This Privacy Policy
                explains how we collect, use, and safeguard your information when you use our website and
                services.
              </p>
              <Separator className="my-4" />
              <p>
                Willkommen bei Reflectlife (www.reflectlife.net), einer Online-Gedenkplattform, betrieben von
                Sypera UG (Rablstr. 12/629, 81669 München, Deutschland).
              </p>
              <p>
                Wir respektieren Ihre Privatsphäre und verpflichten uns, Ihre persönlichen Daten zu schützen.
                Diese Datenschutzrichtlinie erläutert, wie wir Ihre Daten erfassen, verwenden und schützen, wenn
                Sie unsere Website und Dienstleistungen nutzen.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              2. Data Controller / Verantwortlicher
            </h2>
            <div className="space-y-2 text-muted-foreground bg-muted/30 p-6 rounded-lg">
              <p className="font-semibold text-foreground">Sypera UG</p>
              <p>Attn: Sylvia Perez</p>
              <p>Rablstr. 12/629, 81669 Munich, Germany</p>
              <p>Phone: +49 151 40017533</p>
              <p>Email: sypera.sylvia@gmail.com</p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              3. Data We Collect / Erhobene Daten
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We collect the following categories of data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Personal information (e.g., name, email address, password)</li>
                <li>Usage data (analytics, browser type, device information)</li>
                <li>Uploaded content (images, texts, journals, family trees)</li>
                <li>Communication data (messages, comments)</li>
                <li>Cookies and tracking data</li>
              </ul>
              <Separator className="my-4" />
              <p>Wir erfassen folgende Datenkategorien:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Persönliche Daten (z. B. Name, E-Mail-Adresse, Passwort)</li>
                <li>Nutzungsdaten (Analysen, Browsertyp, Geräteinformationen)</li>
                <li>Hochgeladene Inhalte (Bilder, Texte, Erinnerungen, Familienstammbäume)</li>
                <li>Kommunikationsdaten (Nachrichten, Kommentare)</li>
                <li>Cookies und Tracking-Daten</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              4. Purpose of Data Processing / Zweck der Datenverarbeitung
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Your data is used for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Creating and managing user accounts</li>
                <li>Sending newsletters and updates</li>
                <li>Analyzing usage to improve our services</li>
                <li>Providing customer support</li>
                <li>Enhancing platform security</li>
              </ul>
              <Separator className="my-4" />
              <p>Ihre Daten werden verwendet, um:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Benutzerkonten zu erstellen und zu verwalten</li>
                <li>Newsletter und Updates zu versenden</li>
                <li>Die Nutzung zu analysieren und unsere Dienste zu verbessern</li>
                <li>Kundensupport bereitzustellen</li>
                <li>Die Plattform sicherer zu gestalten</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              5. Use of Third-Party Services / Nutzung von Drittanbietern
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We may use trusted third-party services for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hosting (e.g., AWS, IONOS)</li>
                <li>Analytics (e.g., Google Analytics)</li>
                <li>Payments (e.g., Stripe, PayPal)</li>
                <li>Email and newsletter management (e.g., Mailchimp, Brevo)</li>
                <li>Social media integrations (e.g., Facebook, Instagram)</li>
              </ul>
              <p className="mt-4">
                These providers may process data outside the EU, but we ensure adequate data protection
                measures (such as Standard Contractual Clauses) are in place.
              </p>
              <Separator className="my-4" />
              <p>Wir verwenden vertrauenswürdige Drittanbieter für:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hosting (z. B. AWS, IONOS)</li>
                <li>Analysen (z. B. Google Analytics)</li>
                <li>Zahlungen (z. B. Stripe, PayPal)</li>
                <li>E-Mail- und Newsletter-Verwaltung (z. B. Mailchimp, Brevo)</li>
                <li>Social-Media-Integrationen (z. B. Facebook, Instagram)</li>
              </ul>
              <p className="mt-4">
                Diese Anbieter können Daten außerhalb der EU verarbeiten, jedoch stellen wir sicher, dass
                angemessene Datenschutzmaßnahmen (z. B. Standardvertragsklauseln) bestehen.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              6. Cookies & Tracking / Cookies & Tracking
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Reflectlife uses cookies to improve your browsing experience, analyze traffic, and personalize
                content.
              </p>
              <p>You can manage your cookie preferences through your browser settings.</p>
              <Separator className="my-4" />
              <p>
                ReflectLife verwendet Cookies, um Ihr Nutzungserlebnis zu verbessern, den Datenverkehr zu
                analysieren und Inhalte zu personalisieren.
              </p>
              <p>Sie können Ihre Cookie-Einstellungen über Ihren Browser anpassen.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              7. Data Retention / Datenspeicherung
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We retain personal data only as long as necessary to fulfill the purposes described or as required
                by law.
              </p>
              <p>Users may request deletion of their data or account at any time.</p>
              <Separator className="my-4" />
              <p>
                Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke
                erforderlich ist oder gesetzlich vorgeschrieben wird.
              </p>
              <p>Benutzer können jederzeit die Löschung ihrer Daten oder ihres Kontos verlangen.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              8. User Rights / Rechte der Nutzer
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Under the GDPR and other privacy laws, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access and obtain a copy of your data</li>
                <li>Correct or delete your data</li>
                <li>Restrict or object to data processing</li>
                <li>Withdraw consent at any time</li>
                <li>File a complaint with a data protection authority</li>
              </ul>
              <Separator className="my-4" />
              <p>Nach der DSGVO und anderen Datenschutzgesetzen haben Sie das Recht:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Zugriff auf Ihre Daten zu erhalten</li>
                <li>Ihre Daten zu berichtigen oder zu löschen</li>
                <li>Die Verarbeitung einzuschränken oder zu widersprechen</li>
                <li>Ihre Einwilligung jederzeit zu widerrufen</li>
                <li>Eine Beschwerde bei einer Datenschutzbehörde einzureichen</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              9. International Data Transfers / Internationale Datenübertragungen
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If personal data is transferred to countries outside the European Union, we ensure adequate
                protection through appropriate legal safeguards such as Standard Contractual Clauses.
              </p>
              <Separator className="my-4" />
              <p>
                Wenn personenbezogene Daten in Länder außerhalb der Europäischen Union übertragen werden,
                stellen wir einen angemessenen Schutz durch geeignete rechtliche Garantien (z. B.
                Standardvertragsklauseln) sicher.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              10. Updates to This Policy / Aktualisierung dieser Richtlinie
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time. Any changes will be published on this page
                with a revised effective date.
              </p>
              <Separator className="my-4" />
              <p>
                Wir können diese Datenschutzrichtlinie von Zeit zu Zeit aktualisieren. Änderungen werden auf
                dieser Seite mit einem neuen Gültigkeitsdatum veröffentlicht.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              11. Contact / Kontakt
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>If you have any questions about this Privacy Policy or your personal data, please contact us at:</p>
              <div className="bg-muted/30 p-6 rounded-lg space-y-2">
                <p>Email: sypera.sylvia@gmail.com</p>
                <p>Phone: +49 151 40017533</p>
              </div>
              <Separator className="my-4" />
              <p>
                Wenn Sie Fragen zu dieser Datenschutzrichtlinie oder zu Ihren personenbezogenen Daten haben,
                kontaktieren Sie uns bitte unter:
              </p>
              <div className="bg-muted/30 p-6 rounded-lg space-y-2">
                <p>E-Mail: sypera.sylvia@gmail.com</p>
                <p>Telefon: +49 151 40017533</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
