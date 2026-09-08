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

      <h2 id="donations" className="font-serif text-2xl font-bold text-foreground mb-2">6. Memorial Donation Terms</h2>
      <p className="text-sm text-muted-foreground mb-6">Applies to every "Donate in Memory" fundraiser on Reflectlife.</p>

      <Section title="6.1 What a memorial fundraiser is">
        <p>A memorial owner (the "Organizer") may open one fundraiser per memorial in favour of a named beneficiary — a family, a person, or a registered charity. Reflectlife provides the technology to collect donations; Reflectlife is not the beneficiary and does not decide how the funds are used.</p>
      </Section>

      <Section title="6.2 Platform fee schedule">
        <p>To keep the service running, Reflectlife deducts a platform fee from every donation, plus the standard payment-processing fee charged by our payment provider (Stripe):</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong className="text-foreground">Private / individual donors:</strong> 2.5% platform fee + payment processing fee.</li>
          <li><strong className="text-foreground">Company / organization donors:</strong> 3.0% platform fee + payment processing fee.</li>
        </ul>
        <p>The gross donation, the platform fee and the net amount going to the cause are shown to the donor before payment. Fees are calculated per transaction and are not refundable once a payment has been processed.</p>
      </Section>

      <Section title="6.3 Donor commitments">
        <p>Donations are voluntary gifts. Unless the beneficiary is a registered charity that issues its own receipts, donations made through Reflectlife are not tax-deductible. Recurring (monthly) donations can be cancelled at any time by the donor. Donors may choose to remain anonymous; their name will then never be displayed publicly, although the Organizer can still see the amount.</p>
      </Section>

      <Section title="6.4 Campaign transparency guidelines">
        <p>Organizers must describe the purpose of the fundraiser and the beneficiary truthfully and keep this information up to date. Funds must be used solely for the stated purpose. Reflectlife may pause or close a fundraiser and withhold payouts where we suspect misuse, fraud, or a breach of these terms, and may share information with payment providers or authorities where legally required.</p>
      </Section>

      <Section title="6.5 Payout terms">
        <p>Net donations are paid out to the bank account registered by the Organizer (or the designated charity) after the payment provider's standard settlement period. Payouts require a verified identity and bank account. Reflectlife may delay payouts while a chargeback, refund request or review is pending. Chargebacks and refunds are deducted from future payouts.</p>
      </Section>

      <Section title="6.6 Refunds and disputes">
        <p>Because donations are gifts, they are generally not refundable. If a donation was made in error, contact us within 14 days and we will do our best to reverse it if the funds have not yet been paid out. Disputes between donors and Organizers are to be resolved between those parties; Reflectlife may assist but is not obliged to mediate.</p>
      </Section>

      <Section title="6.7 Acceptance">
        <p>Donors accept these Donation Terms by ticking the confirmation box before payment. Organizers accept them when creating a fundraiser. These Donation Terms form part of the Reflectlife Terms & Conditions.</p>
      </Section>
    </div>
  );
}
