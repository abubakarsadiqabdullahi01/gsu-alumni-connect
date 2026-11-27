import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PUBLISHER } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Child Safety Standards",
  description:
    "GSU Alumni Connect's standards against child sexual abuse and exploitation (CSAE), and how to report a concern.",
};

export default function ChildSafetyPage() {
  return (
    <LegalPage
      title="Child Safety Standards"
      summary="GSU Alumni Connect has zero tolerance for child sexual abuse and exploitation (CSAE), including child sexual abuse material (CSAM). These standards apply to the website and the mobile app."
      updated="27 November 2026"
    >
      <h2 id="standard">1. Our standard</h2>
      <p>
        {PUBLISHER.name} prohibits any content or behaviour on GSU Alumni Connect that sexually abuses, exploits
        or endangers children. This includes:
      </p>
      <ul>
        <li>child sexual abuse material (CSAM) of any kind, including drawn, edited or AI-generated images</li>
        <li>grooming, or contacting a child for a sexual purpose</li>
        <li>sexualising minors in words, images or links</li>
        <li>sextortion, and the trafficking or sale of children</li>
        <li>sharing links to, or asking for, any of the above</li>
      </ul>
      <p>
        These rules cover profiles, photos, posts, comments, private messages, group chats, job adverts and
        events.
      </p>

      <h2 id="audience">2. Who the platform is for</h2>
      <p>
        GSU Alumni Connect is only for graduates of Gombe State University. Accounts come from the
        University&rsquo;s own graduation records, there is no public sign-up, and the platform is not intended
        for anyone under 18. See the <Link href="/terms">Terms of Use</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="report">3. How to report a concern</h2>
      <ul>
        <li>
          <strong>In the app or on the website:</strong> use <strong>Report</strong> on a post (the &#8942; menu),
          on a message (long-press it), or on a member&rsquo;s profile. Choose the closest reason and describe
          the concern.
        </li>
        <li>
          <strong>By email:</strong> write to <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> with
          &ldquo;Child safety&rdquo; in the subject.
        </li>
        <li>
          <strong>If a child is in immediate danger,</strong> contact the Nigeria Police Force first.
        </li>
      </ul>

      <h2 id="action">4. What we do</h2>
      <p>The Alumni Secretariat reviews every report within 24 hours. When content or behaviour breaks these standards, we:</p>
      <ul>
        <li>remove the content</li>
        <li>suspend or close the accounts involved</li>
        <li>
          report it to the relevant Nigerian authorities, including the Nigeria Police Force and the National
          Agency for the Prohibition of Trafficking in Persons (NAPTIP)
        </li>
        <li>cooperate with law enforcement, including sharing information we hold when lawfully requested</li>
      </ul>

      <h2 id="contact">5. Child safety contact</h2>
      <p>
        Our designated point of contact for child safety is the Alumni Secretariat of the{" "}
        {PUBLISHER.association}: <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>, {PUBLISHER.address}.
      </p>
    </LegalPage>
  );
}
