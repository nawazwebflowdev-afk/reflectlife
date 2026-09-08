import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet-async";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="font-serif text-xl font-semibold text-foreground mb-3">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Helmet>
        <title>Terms & Conditions | Reflectlife</title>
        <meta name="description" content="Reflectlife terms of use, including memorial donation, campaign transparency and payout terms." />
        <link rel="canonical" href="https://reflectlife.net/terms" />
      </Helmet>

      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">Terms & Conditions</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 8 September 2026</p>

      <p className="text-muted-foreground leading-relaxed mb-8">
        These Terms & Conditions govern your use of Reflectlife (reflectlife.net), operated by Sypera UG. By creating an
        account, publishing a memorial, or using any of our services you agree to these terms. Please also read our{" "}
        <Link to="/privacy-policy" className="text-primary underline underline-offset-4">Privacy Policy</Link> and{" "}
        <Link to="/cookie-policy" className="text-primary underline underline-offset-4">Cookie Policy</Link>.
      </p>

      <Separator className="my-8" />

      <Section title="1. Your account">
        <p>You must provide accurate information when registering and keep your login details confidential. You are responsible for all activity under your account. You must be at least 16 years old to use Reflectlife.</p>
      </Section>

      <Section title="2. Memorials and shared content">
        <p>You keep ownership of the photos, stories, tributes and other content you upload. By publishing it you grant Reflectlife a non-exclusive licence to display it as part of the service according to the privacy settings you choose. You confirm that you have the right to share the content and that it does not infringe the rights or dignity of others.</p>
        <p>We may remove content that is unlawful, hateful, harassing or otherwise inappropriate for a place of remembrance.</p>
      </Section>

      <Section title="3. Purchases, candles and templates">
        <p>Paid templates and remembrance candles are digital services delivered immediately. Prices are shown in euro and include applicable VAT. Payments are processed by Stripe; Reflectlife does not store card details.</p>
      </Section>

      <Section title="4. Liability">
        <p>Reflectlife is provided "as is". To the extent permitted by law, Sypera UG is not liable for indirect damages or for content published by users. Nothing in these terms limits liability for intent or gross negligence.</p>
      </Section>

      <Section title="5. Changes and contact">
        <p>We may update these terms; material changes will be announced on the site. Questions can be sent to sypera.sylvia@gmail.com. German law applies.</p>
      </Section>

      <Separator className="my-8" />

      <h2 id="donations" className="font-serif text-2xl font-bold text-foreground mb-2">6. Memorial Donations & Charity Terms of Service</h2>
      <p className="text-sm text-muted-foreground mb-6">Applies to every "Donate in Memory" fundraiser on Reflectlife.</p>

      <Section title="6.1 Overview & Purpose">
        <p>Reflectlife ("Platform") offers memorial fundraising features allowing users, families, and organizations to create memorial campaign causes and collect charitable donations in honor of loved ones.</p>
      </Section>

      <Section title="6.2 Platform Service Fees">
        <p>Reflectlife maintains a transparent platform service fee structure designed to support ongoing server operations, secure memorial preservation, payment infrastructure, and customer care. Fees are calculated automatically at checkout as follows:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong className="text-foreground">Private / Individual Contributions:</strong> All donations initiated by private individuals are subject to a standard Reflectlife platform fee of 2.5% of the total gross transaction amount.</li>
          <li><strong className="text-foreground">Corporate / Company Contributions:</strong> All donations initiated by commercial entities, organizations, or registered businesses are subject to a platform fee of 3.0% of the total gross transaction amount.</li>
          <li><strong className="text-foreground">Payment Processing Fees:</strong> Standard third-party payment processing fees (e.g., via Stripe, PayPal, or card networks) apply separately and are deducted prior to net payout distribution.</li>
        </ul>
      </Section>

      <Section title="6.3 Disbursement & Net Payouts">
        <p>All net funds (Gross Donation minus applicable 2.5% or 3.0% platform fees and payment processing costs) are credited toward the designated beneficiary account or verified charitable institution as specified in the campaign setup.</p>
      </Section>

      <Section title="6.4 Transparency & Reporting">
        <p>Organizers and charities gain real-time access to the Reflectlife Charity Dashboard, which displays itemized gross contributions, platform fee deductions, net payout totals, and donor messages.</p>
      </Section>
    </div>
  );
}
