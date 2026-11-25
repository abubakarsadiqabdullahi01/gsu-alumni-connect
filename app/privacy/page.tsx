import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PUBLISHER } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GSU Alumni Connect, the official app of the Gombe State University Alumni Association, collects, uses and protects graduates' personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="GSU Alumni Connect is the official platform of the Gombe State University Alumni Association. This policy explains what we hold about you, where it comes from, who can see it, and the choices you have under the Nigeria Data Protection Act 2023."
      updated="25 November 2026"
    >
      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        GSU Alumni Connect (the website at <a href={PUBLISHER.website}>www.gsualumni.org.ng</a> and the
        GSU Alumni Connect mobile app) is published by <strong>{PUBLISHER.name}</strong> and run by the
        Alumni Secretariat of the {PUBLISHER.association}. Gombe State University is the data controller for
        the personal data described here.
      </p>
      <p>
        Address: {PUBLISHER.address}. Email: <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>.
      </p>

      <h2 id="source">2. Where your record comes from</h2>
      <p>
        Your basic academic record comes from <strong>Gombe State University graduation records</strong>. The
        Alumni Secretariat loads these records so that every graduate already has a place on the platform. If
        you graduated from the University, a pending account may exist for you before you ever sign in. It is
        not visible to other members until you activate it.
      </p>
      <p>
        If anything in your academic record is wrong, contact the Secretariat. Academic records can only be
        corrected against the University&rsquo;s own records, not edited by members.
      </p>

      <h2 id="what-we-hold">3. What we hold</h2>
      <h3>From the University&rsquo;s graduation records</h3>
      <ul>
        <li>Registration number, full name and surname, sex, state of origin and local government area</li>
        <li>Faculty, department, course, entry year and graduation year</li>
        <li>CGPA, degree class and JAMB registration number, where the record includes them</li>
      </ul>
      <h3>What you add</h3>
      <ul>
        <li>Date of birth, email address, phone number and password (stored only as a salted scrypt hash, never in readable form)</li>
        <li>Profile photo, signature (for your alumni ID card), biography and social or website links</li>
        <li>Employment, further education, skills, NYSC details, current city and state, and an optional salary range</li>
        <li>Posts, comments, reactions, messages, connections, group memberships, event RSVPs, mentorship requests, job postings and job applications with any CV you upload</li>
        <li>Privacy and notification preferences</li>
      </ul>
      <h3>Generated as you use the platform</h3>
      <ul>
        <li>Sign-in sessions: a session cookie, your IP address and your browser or device description</li>
        <li>A security log of sign-in and activation attempts (see section 6)</li>
        <li>Notifications, profile views (members can see who viewed their profile) and your activity feed</li>
        <li>
          Reports you make about posts, messages or members (the reported member is not told who reported them),
          and the members you block
        </li>
        <li>Anonymous page-view statistics from Vercel Web Analytics, which uses no cookies and does not identify you</li>
      </ul>
      <p>
        We do not show ads, sell personal data, or track you across other apps and websites. The platform is
        free and has no payments or in-app purchases.
      </p>

      <h2 id="who-sees-what">4. Who can see what</h2>
      <p>
        Only <strong>activated members</strong> appear to other members, and you can hide yourself from the
        directory and map at any time in Settings.
      </p>
      <table>
        <thead>
          <tr>
            <th>Visible to other signed-in members</th>
            <th>Never shown to other members</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Name, photo, registration number, faculty, department, graduation year, state of origin, biography,
              work and education history, skills, links, whether you are open to opportunities or mentorship.
              Email and phone only if you switch them on.
            </td>
            <td>CGPA, degree class, JAMB registration number, date of birth and salary range.</td>
          </tr>
        </tbody>
      </table>
      <p>
        The alumni map shows how many members are in each state; it does not place individual members on it.
        Your alumni ID card carries a QR code. Anyone who scans it sees a verification page with the card
        number, your name, sex, state of origin, graduation year and programme, and whether the card is valid.
      </p>
      <p>
        Secretariat administrators can see full records in order to run the Association, import new graduates
        and correct records. Salary ranges are only ever used in anonymous, aggregated statistics.
      </p>

      <h2 id="why">5. Why we use it</h2>
      <p>Under the Nigeria Data Protection Act 2023 we rely on:</p>
      <ul>
        <li>
          <strong>Public interest and legitimate interest</strong>: the University keeping in touch with its
          graduates, verifying who is a graduate, and issuing alumni ID cards.
        </li>
        <li>
          <strong>Your consent</strong>: for everything you choose to add to your profile and to make visible.
          You can withdraw it by removing the information, changing your settings, or deleting your account.
        </li>
        <li>
          <strong>Providing the service you sign up for</strong>: running your account, messages, groups,
          events, jobs and mentorship.
        </li>
        <li>
          <strong>Security</strong>: protecting accounts from misuse, described below.
        </li>
      </ul>

      <h2 id="security">6. How we protect your account</h2>
      <ul>
        <li>
          <strong>Activation check.</strong> The first time you sign in with the starting password, we do not
          open a session. We first ask you to confirm a detail from your University record: your CGPA, or your
          surname if your record has no CGPA. Only then can you set your own password.
        </li>
        <li>
          <strong>Lockout.</strong> After five wrong answers within 24 hours, activation is locked for that
          registration number. The Secretariat can unlock it after confirming your identity by its own means.
          Activation attempts from one network are also limited to ten per hour.
        </li>
        <li>
          <strong>Sign-in limits.</strong> After five failed sign-ins for one registration number, or thirty
          from one network, within 15 minutes, further attempts are paused until the window passes.
        </li>
        <li>
          <strong>Alumni ID cards</strong> are issued only to activated members who have passed this check.
          Members who activated before the check existed are asked to confirm once before their card is
          issued.
        </li>
        <li>
          <strong>Security log.</strong> For every failed sign-in and every activation attempt we record the
          time, the registration number, the IP address, the browser or device description and the reason (for
          example &ldquo;wrong password&rdquo;). We never record the password or the answer that was typed.
          The log is used only to enforce these limits and to investigate misuse.
        </li>
        <li>
          Passwords are hashed with scrypt and a random salt. All traffic uses HTTPS. Sessions expire after
          seven days without use and can be ended by signing out.
        </li>
      </ul>

      <h2 id="providers">7. Service providers and where data is stored</h2>
      <p>
        We use the following providers to run the platform. Each processes data only on our behalf. Most store
        data in the <strong>United States</strong>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Vercel</td><td>Website and API hosting; anonymous page statistics</td><td>United States</td></tr>
          <tr><td>Neon</td><td>Main database (all account and profile data)</td><td>United States (Oregon)</td></tr>
          <tr><td>Tigris Data</td><td>File storage: photos, signatures, ID cards, CVs and the Android app download</td><td>United States</td></tr>
          <tr><td>Upstash</td><td>Short-lived cache and the queue for importing graduation records</td><td>Global (nearest region)</td></tr>
          <tr><td>Pusher</td><td>Real-time delivery of messages and notifications</td><td>European Union</td></tr>
          <tr><td>Resend</td><td>Sending account and notification emails</td><td>United States</td></tr>
          <tr><td>OpenStreetMap</td><td>Map images, loaded by your browser, which shares your IP address with it</td><td>United Kingdom / European Union</td></tr>
          <tr><td>Google Fonts</td><td>Mobile app versions before 1.0.0 (build 4) download their typeface from Google, which receives your IP address. Later versions include it and make no such request</td><td>United States</td></tr>
        </tbody>
      </table>
      <p>
        Transfers outside Nigeria are made under Part VIII of the Nigeria Data Protection Act 2023, relying on
        these providers&rsquo; contractual data protection commitments. We do not share personal data with
        anyone else, except where the law requires it.
      </p>

      <h2 id="retention">8. How long we keep it</h2>
      <ul>
        <li>Your account and profile: until you delete your account.</li>
        <li>
          Your academic record: kept as a University record. If you delete your account it is hidden and
          unlinked from you (see <Link href="/delete-account">Delete your account</Link>).
        </li>
        <li>Sign-in sessions: until they expire or you sign out.</li>
        <li>Security log entries: 12 months.</li>
      </ul>

      <h2 id="rights">9. Your rights</h2>
      <p>Under the Nigeria Data Protection Act 2023 you may ask us to:</p>
      <ul>
        <li>give you a copy of the personal data we hold about you</li>
        <li>correct data that is wrong (academic records against the University&rsquo;s records)</li>
        <li>delete your data, as described on the <Link href="/delete-account">account deletion page</Link></li>
        <li>restrict or object to how we use it, or withdraw consent you gave</li>
        <li>give you your data in a portable format</li>
      </ul>
      <p>
        Email <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> from the address on your account, or
        include your registration number. We reply within 30 days. If you are not satisfied, you can complain
        to the Nigeria Data Protection Commission.
      </p>

      <h2 id="children">10. Children</h2>
      <p>
        The platform is for graduates of Gombe State University and is not intended for anyone under 18.
      </p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        If we change how we use your data, we will update this page and its date, and tell members on the
        platform before a significant change takes effect.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>
        Alumni Secretariat, {PUBLISHER.association}, {PUBLISHER.address}.{" "}
        <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
      </p>
    </LegalPage>
  );
}
