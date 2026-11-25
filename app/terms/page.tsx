import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PUBLISHER } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using GSU Alumni Connect, the official platform of the Gombe State University Alumni Association.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      summary="These terms apply to the GSU Alumni Connect website and mobile app. By activating your account you agree to them. They are written to be read, so please do."
      updated="25 November 2026"
    >
      <h2 id="about">1. About the platform</h2>
      <p>
        GSU Alumni Connect is published by {PUBLISHER.name} and run by the Alumni Secretariat of the{" "}
        {PUBLISHER.association}. It is free. There are no fees, payments, subscriptions, ads or in-app
        purchases. How we handle personal data is set out in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="eligibility">2. Who can use it</h2>
      <p>
        Accounts are only for graduates of Gombe State University whose records the University holds. You may
        only activate and use the account that belongs to you. Activating someone else&rsquo;s account, or
        trying to, is impersonation: we will close the account and may refer the matter to the University and
        the authorities.
      </p>

      <h2 id="account">3. Your account</h2>
      <ul>
        <li>
          On first sign-in you confirm a detail from your University record, then choose your own password.
          Keep the password to yourself and do not reuse it elsewhere.
        </li>
        <li>Keep your contact details accurate so the Association can reach you.</li>
        <li>
          Tell the Secretariat at <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> straight away if
          you think someone else has used your account.
        </li>
      </ul>

      <h2 id="conduct">4. How to behave</h2>
      <p>You agree not to:</p>
      <ul>
        <li>harass, threaten, defame or discriminate against anyone</li>
        <li>post anything unlawful, sexually explicit, hateful, or that infringes someone else&rsquo;s rights</li>
        <li>send spam, chain messages or unsolicited advertising</li>
        <li>
          copy, scrape or export other members&rsquo; information, or use it for marketing, recruitment
          databases, debt collection or anything other than keeping in touch with fellow alumni
        </li>
        <li>post job adverts that are fake, that charge applicants a fee, or that hide who the employer is</li>
        <li>try to break, overload or get around the platform&rsquo;s security, including its sign-in limits</li>
      </ul>
      <p>
        Tell the Secretariat about anything that breaks these rules. Administrators may remove content or
        restrict accounts that break them.
      </p>

      <h2 id="content">5. What you post</h2>
      <p>
        You keep ownership of what you post. You allow the Association to store and display it on the platform
        to the members who are allowed to see it, for as long as it stays on the platform. You are responsible
        for what you post and must have the right to post it.
      </p>

      <h2 id="member-activity">6. Jobs, events and mentorship</h2>
      <p>
        Jobs, events and mentorship offers are posted by members. The Association does not employ, endorse or
        vet the people or organisations behind them, and is not a party to any arrangement you make. Use your
        own judgement, and never pay to apply for a job.
      </p>

      <h2 id="id-card">7. Alumni ID card</h2>
      <p>
        The digital alumni ID card shows that the University&rsquo;s records list you as a graduate. It is
        issued only to activated members who have confirmed their identity, it remains the property of the
        Association, and it can be revoked if it was obtained wrongly or the account is closed. Anyone can
        check whether a card is valid by scanning its QR code. Do not alter a card or present it as anything
        other than proof of alumni membership.
      </p>

      <h2 id="ending">8. Ending your account</h2>
      <p>
        You can delete your account at any time; see <Link href="/delete-account">Delete your account</Link>.
        We may suspend or close an account that breaks these terms, telling you why unless the law or an
        investigation prevents it.
      </p>

      <h2 id="liability">9. Our responsibility</h2>
      <p>
        We work to keep the platform available and accurate, but provide it as it is, without guarantees that
        it will always be available or error-free. The Association is not responsible for what members post or
        for arrangements between members. Nothing in these terms limits rights you have under Nigerian law
        that cannot be limited.
      </p>

      <h2 id="law">10. Law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria and of Gombe State.</p>

      <h2 id="changes">11. Changes</h2>
      <p>
        If we change these terms we will update this page and its date, and tell members on the platform before
        a significant change takes effect.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>
        Alumni Secretariat, {PUBLISHER.association}, {PUBLISHER.address}.{" "}
        <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
      </p>
    </LegalPage>
  );
}
