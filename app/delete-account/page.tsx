import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PUBLISHER } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "How to delete your GSU Alumni Connect account and the data associated with it, and what the University keeps.",
};

const subject = encodeURIComponent("Delete my GSU Alumni Connect account");
const body = encodeURIComponent(
  "Please delete my GSU Alumni Connect account.\n\nRegistration number:\nFull name:\n"
);

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your account"
      summary="You can ask for your GSU Alumni Connect account, and everything you added to it, to be deleted at any time. This page explains how, and what the University keeps."
      updated="25 November 2026"
    >
      <h2 id="in-app">Delete it yourself</h2>
      <ol>
        <li>Sign in to the GSU Alumni Connect app or to this website.</li>
        <li>
          Open <strong>Settings</strong>. In the app, scroll to <strong>Account</strong>; on the website, open the{" "}
          <strong>Account Overview</strong> tab.
        </li>
        <li>Choose <strong>Delete account</strong> and enter your password to confirm.</li>
      </ol>
      <p>Deletion happens straight away and signs you out on every device.</p>

      <h2 id="how">Or ask the Secretariat</h2>
      <p>If you cannot sign in:</p>
      <ol>
        <li>
          Email <a href={`mailto:${PUBLISHER.email}?subject=${subject}&body=${body}`}>{PUBLISHER.email}</a> with
          the subject &ldquo;Delete my GSU Alumni Connect account&rdquo;.
        </li>
        <li>
          Send it from the email address on your account, or include your registration number and full name.
        </li>
        <li>
          If the request does not come from the email on the account, the Secretariat will confirm it is you
          before deleting anything, so that no one can delete someone else&rsquo;s account.
        </li>
      </ol>
      <p>
        We confirm by email once an emailed request is done, within 30 days. Deletion cannot be
        undone: if you want to use the platform again later, the Secretariat can set your University record up
        for activation again, but your old profile, posts and messages will not come back.
      </p>

      <h2 id="deleted">What is deleted</h2>
      <ul>
        <li>Your sign-in details, password and all active sessions, on every device</li>
        <li>Your date of birth, email address, phone number and the rest of your profile: biography, links, employment, education, skills, NYSC details, location and salary range</li>
        <li>Your profile photo and signature, and your alumni ID card (which will show as no longer valid)</li>
        <li>Your posts, comments and reactions, and the messages you sent</li>
        <li>Your connections, group memberships, event RSVPs, mentorship requests and job postings</li>
        <li>Your job applications and any CVs you uploaded</li>
        <li>Your notifications, activity feed and profile-view history</li>
      </ul>

      <h2 id="kept">What is kept</h2>
      <ul>
        <li>
          <strong>Your academic record</strong> (registration number, name, programme, graduation year and the
          other details from the University&rsquo;s graduation records). It belongs to the University&rsquo;s
          records, so it is kept, but it is unlinked from the deleted account and hidden: it no longer appears
          to members anywhere on the platform.
        </li>
        <li>
          <strong>Security log entries</strong> about sign-in and activation attempts on your registration
          number, until they are deleted automatically after 12 months.
        </li>
      </ul>
      <p>
        More about how your data is used is in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
