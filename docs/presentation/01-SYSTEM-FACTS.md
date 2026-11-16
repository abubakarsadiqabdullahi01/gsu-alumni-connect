# GSU Alumni Connect — complete system brief

Everything an author needs to document or present this platform, taken from the
codebase on 3 November 2026 (branch `main`). Attach this file to Claude chat
alongside the prompt in `02-PROMPT-full-documentation.md` or
`03-PROMPT-slide-deck.md`.

Where a number is something the site *displays* rather than something the system
*counts*, it says so. Nothing here is estimated.

---

## 1. What the system is

**GSU Alumni Connect** is the official digital platform of **Gombe State
University**, Gombe State, Nigeria — a university established in **2004** whose
motto is *"Knowledge for Service"*. The platform turns the university's
graduation records into a living professional network: every graduate already
exists in the system before they ever sign up, because the Alumni Secretariat
imports them from the university's own graduation spreadsheets.

Three things follow from that design, and they shape the whole product:

1. **There is no public sign-up.** A graduate signs in with the **registration
   number** the university issued them (e.g. `UG19/ASAC/1025`). Self-registration
   is off by default (`allowSelfRegistration: false`).
2. **Identity is institutional, not self-declared.** Academic facts — faculty,
   department, degree class, CGPA, graduation year — come from the Excel import
   and are locked; the graduate can never edit them. Everything else (bio, job,
   photo, skills, links) is theirs to fill in.
3. **The account exists before the person claims it.** New imports create
   accounts in `PENDING` status with a generated default password; the account
   becomes `ACTIVE` when the graduate completes onboarding.

It runs as a **web application** (desktop and mobile browsers) and a **native
Android app**, both served by the same API and the same session.

### Who uses it

| Audience | What they get |
| --- | --- |
| **Visitors** (not signed in) | Landing page, Android app download, public ID-card verification |
| **Graduates** (`role: "user"`) | The full network: directory, profile, ID card, messaging, groups, jobs, mentorship, events, map, achievements, feed, notifications |
| **Administrators** (`role: "admin"`) | A separate console: graduate records, bulk import, moderation, broadcasts, analytics, platform settings |

---

## 2. The service catalogue

This is the complete list of what the platform offers. Eight of these are
presented on the landing page as the headline features; the rest are supporting
services.

### 2.1 Identity and access

- **Registration-number sign-in.** A custom Better Auth endpoint,
  `POST /api/auth/sign-in/registration`, accepts a registration number **or** an
  email address, plus the password. Registration numbers are normalised before
  lookup, so formatting differences do not lock anyone out.
- **Default passwords.** The import engine generates a password per graduate and
  flags the account `defaultPassword: true`. Anyone still carrying that flag is
  redirected to onboarding on sign-in and cannot reach the rest of the app until
  they set their own password.
- **Onboarding**, resumable: `onboardingStep` (0–5) is stored, so a graduate who
  drops out mid-way continues where they left off rather than starting again.
- **Password reset** by email, through Resend. Tokens expire in **1 hour**, and
  all existing sessions are revoked on reset.
- **Two-factor authentication** is supported by the schema (`TwoFactor` model)
  and enabled by platform setting (`enableTwoFactor: true` by default).
- **Sessions** last **7 days**, refresh if older than a day, and use a 5-minute
  cookie cache. The cookie is **httpOnly** — which is why the Android app stores
  a cookie jar rather than a token.
- **Roles and suspension**: `role` (`user` | `admin`), plus ban fields and an
  `accountStatus` of `PENDING` / `ACTIVE` / `SUSPENDED`.

### 2.2 Alumni directory and profiles

- **Searchable directory** of every graduate who has not opted out
  (`showInDirectory`), filterable by faculty, department, graduation year,
  degree class, state and profession.
- **Profile** combining locked academic records with graduate-supplied
  employment history, further education, skills, bio, social links, NYSC posting,
  date of birth and photo.
- **Profile completion scoring**, computed on the server so web and Android
  always agree. Weighted sections, each with an invitation-style prompt, and a
  **next best action** — the single highest-weight outstanding item. A bio under
  40 characters and fewer than 3 skills count as not done.
- **Privacy controls**, per graduate: `showCgpa`, `showEmail`, `showPhone`,
  `showDob`, `showInDirectory`, `allowMessages`, `showActivityFeed`,
  `openToOpportunities`, `availableForMentorship`. Salary range is stored but is
  **admin-only, never public**.
- **Profile views** are logged — who viewed whom, and when — and surfaced as a
  counter on the profile.
- **Skills and endorsements**: graduates list skills with a proficiency level
  (beginner / intermediate / expert); other graduates endorse them. Governed by
  the `featureSkills` flag, which is **off by default**.

### 2.3 Digital ID card

The alumni identity card, issued and verified by the platform:

- Rendered front and back from a university-designed template.
- Carries a **QR code** that resolves to a public verification page
  (`/verify/id-card`) — no sign-in needed, so a third party can check a card.
- The server signs a short-lived payload with **HMAC-SHA256**; the client only
  renders what it is given. The verification query itself is signed over
  `cardId | alumniNumber | expiry` and compared in constant time, so a card
  cannot be forged or its expiry edited.
- Verification returns one of three states: **valid**, **expired**, **invalid**.
- Exportable as **PDF**, and the graduate can upload a signature image.

### 2.4 Networking

- **Connections** — request, accept, decline, block.
- **Real-time messaging** — one-to-one and group conversations, with
  attachments, read receipts (`lastReadAt`), soft deletion, and live delivery
  over **Pusher**. Presence is tracked through a heartbeat endpoint.
- **Alumni groups**, of two kinds:
  - **Automatic**, created by the import engine as records land: cohort
    ("2019 Set"), department, faculty and state-of-origin groups. A graduate is
    placed in theirs without lifting a finger.
  - **Custom**, created by graduates, with admin / moderator / member roles.
  - Each group has posts, threaded comments, five reaction types, and pinning.
- **Activity feed** — "Amina updated her job to Senior Engineer at MTN" — built
  from typed activity events, respecting each graduate's feed privacy setting.
- **Notifications**, 13 types, each with a deep link, read state and metadata,
  delivered in-app and cached in Redis.

### 2.5 Careers

- **Job board**: postings by alumni, with industry, job type (full-time,
  part-time, contract, remote, hybrid, internship), location, optional salary
  range the poster may hide, deadline, and an admin "verified" mark.
- **Applications** with a cover note and CV upload, tracked through
  `APPLIED → REVIEWED → SHORTLISTED → REJECTED`.
- **Mentorship**: graduates mark themselves available; mentees request with a
  subject and message; requests move through pending / accepted / declined /
  completed / cancelled, and mentors keep private notes.

### 2.6 Events

Reunions, meetups, workshops, networking sessions and webinars, with location,
start and end times, optional capacity, public/private visibility, cancellation,
and RSVP tracking.

### 2.7 Achievements and badges

- **Achievements** a graduate records themselves, which an administrator can
  **verify**.
- **Seven automatic badges**: First Class Honours, Profile Complete, Early
  Adopter (first 500 to join), Mentor, Job Poster (3+ jobs), Top Connector
  (50+ profile views), Verified. The catalogue lives in one place so every
  surface — web profile, API, Android — uses the same labels.

### 2.8 Alumni map

Where GSU graduates are, across Nigeria and beyond. State-level aggregation from
graduate locations, with LGA boundary data available. The Android client renders
this as a custom-painted bubble map over a simplified national outline —
**no tile server, no API key, no per-view billing**, and it works offline once
cached.

### 2.9 Administration console

A separate area at `/admin`, reachable only by `role: "admin"`:

| Section | What it does |
| --- | --- |
| **Overview** | Platform dashboard |
| **Graduates** | Search, inspect and edit every graduate record; export to CSV/Excel |
| **Uploads** | Bulk Excel import — the engine described in §3 — with live progress, per-row error reports and a downloadable template |
| **Jobs** | Review, verify and remove postings; see applications |
| **Achievements** | Verify claimed achievements |
| **Groups** | Manage groups and moderate posts |
| **Mentorship** | Oversee mentor/mentee relationships |
| **Network** | Connection-level view of the alumni graph |
| **Notifications** | Broadcast announcements to the membership |
| **Analytics** | Alumni insights, with export |
| **Settings** | Platform identity, auth policy and **six feature flags** |

**Feature flags** (`AdminSetting`) switch whole areas off without a deploy:
`featureJobBoard`, `featureMentorship`, `featureMessaging`, `featureMap`,
`featureGroups` (all on by default) and `featureSkills` (off). The Android
client reads these at start-up and drops the matching tabs, so it never shows a
destination that would answer 403.

### 2.10 Android application

A **Flutter** client covering twenty feature areas — splash, auth, dashboard,
directory, profile, ID card, connections, messages, groups, feed, jobs,
mentorship, events, map, notifications, achievements, settings and the app
shell. It talks to the same Next.js API with the same Better Auth session
cookie, held in a persistent cookie jar on disk because the cookie is httpOnly
and cannot be read by the client.

A single start-up call, `GET /api/mobile/bootstrap`, answers "what should the
shell render?" in one round trip: identity, feature flags, unread notification
count, pending connections and unread conversations.

Distribution is direct: the landing page hands out the APK from object storage
through `/api/download/android`, with a QR code for desktop visitors and the
three install steps. Package id `com.gsualumni.connect`, minimum **Android 7.0**
(API 24).

### 2.11 Public landing page

The marketing surface at `/`: hero, about, the eight headline features,
statistics, the mobile-app download section, messages from university
leadership, a call to action and the footer. Signed-in visitors never see it —
they are redirected to their dashboard, or to `/admin`, or to onboarding if they
still hold a default password.

---

## 3. The bulk import engine

This is the piece that makes the platform possible, and the hardest engineering
in it. The university's graduation records are not one clean dataset — they are
decades of spreadsheets written by different people in different conventions.

**What it handles**

- **Three record eras** — `LEGACY`, `MID_ERA`, `MODERN` — detected per sheet,
  because older sheets carry fewer columns (no CGPA, sometimes a JAMB number,
  names split across two columns instead of one).
- **Column-name variants**: `REG.NO`, `REG. NO`, `REGISTRATION NO`, `REGNO`,
  `REG NO` all mean the same thing. Every field has a variant list — name,
  surname, other names, class, course, sex, state, LGA, CGPA, faculty, JAMB.
- **Degree-class normalisation**: `1`, `FIRST CLASS`, `FIRST CLASS HONOURS` and
  `WITH FIRST CLASS HONOURS` all resolve to `FIRST_CLASS`; the same for the two
  second-class divisions, third class and pass.
- **Programme codes decoded from the registration number** — faculty and
  department are derived (`UG19/ASAC/1025` → entry year 2019, faculty, course)
  and expanded to full names through a department map.
- **Automatic group creation** as rows land: cohort, department, faculty and
  state groups are created once and cached in-process, then every graduate is
  enrolled in theirs.
- **Password generation**, hashed in batches of 20 in parallel, matching the
  same scrypt hasher the auth layer verifies against.

**How it survives reality**

- **Queued, not inline.** Uploads go to object storage; a job row is created and
  processed by a **BullMQ worker** backed by Redis, so a 10,000-row import does
  not live or die with an HTTP request.
- **Checkpointed every 50 rows** — `lastRow`, `processedRows`, `createdRows`,
  `updatedRows`, `failedRows` and a heartbeat are written to the job row, so a
  crashed or killed import **resumes where it stopped** instead of starting over
  or double-creating accounts.
- **Lean transactions** (5 s max wait, 10 s timeout) with up to **3 retries** on
  retryable failures and exponential backoff.
- **Per-row error capture**: every rejected row is stored with its row number,
  registration number, message and payload, and downloadable as a CSV report —
  so the Secretariat fixes the sheet rather than guessing.
- **A watchdog cron** (`/api/cron/import-watchdog`) catches jobs that stalled,
  and `/api/cron/process-import` runs nightly at **02:00**.
- **Statuses**: `QUEUED → RUNNING → COMPLETED | PARTIAL_SUCCESS | FAILED |
  CANCELLED`. Partial success is a first-class outcome, because a real
  spreadsheet usually has some bad rows.
- **Audit log**: every upload records who did it, the file, row counts by
  outcome, which sheets were processed, and when it started and finished.

**What it refuses to do**: overwrite locked academic fields on re-import. Once a
graduate's record is in, a later sheet cannot silently rewrite their degree class.

---

## 4. Architecture

### Stack

| Layer | Technology |
| --- | --- |
| Web framework | **Next.js 16.1.6** (App Router, server components), **React 19.2.3**, TypeScript |
| Styling / UI | Tailwind CSS, shadcn-style component library on Radix UI, Framer Motion, Lucide icons |
| Data layer | **Prisma 7.4** with the `@prisma/adapter-pg` driver adapter |
| Database | **PostgreSQL** on **Neon** (pooled + direct connections) |
| Authentication | **Better Auth 1.5** with the admin plugin and a custom registration-number endpoint |
| Client state | TanStack Query, TanStack Table, TanStack Virtual (virtualised tables for large graduate lists) |
| Real-time | **Pusher** (channels + presence) |
| Cache | **Upstash Redis**, with per-area TTLs and cache versioning |
| Queue | **BullMQ** on Redis, with a standalone worker process |
| Object storage | **Tigris** (S3-compatible) — avatars, signatures, import files, error reports, the Android APK |
| Email | **Resend** (React Email templates) |
| SMS | **Termii** |
| Documents | jsPDF + html2canvas (ID cards), SheetJS (`xlsx`) for import/export, Puppeteer for server-side rendering |
| Charts & maps | Recharts, Leaflet / react-leaflet, react-simple-maps, d3-geo |
| Hosting | **Vercel** (web + cron), worker on a long-running process (`Procfile`) |
| Mobile | **Flutter** — Riverpod, go_router, Dio with a persistent cookie jar, flutter_secure_storage |

### Shape of the application

- **Four route groups**: `(app)` for graduates, `(admin)` for the console,
  `(auth)` for sign-in and recovery, `(onboarding)` for first-run — plus the
  public landing page and the public ID-card verification page.
- **~80 API routes** under `/api`, grouped by domain: auth, profile, directory,
  connections, messages, groups, jobs, mentorship, events, achievements,
  notifications, feed, map, insights, search, settings, id-cards, uploads,
  import-jobs, presence, pusher, cron, mobile, download.
- **One mobile contract endpoint** (`/api/mobile/bootstrap`) rather than making
  the Android client replicate the web app's server components.
- **Background worker** (`workers/import-worker.ts`) consuming the import queue.
- **Two cron jobs** on Vercel: nightly import processing and an import watchdog.

### Data model

**34 models and 17 enums.** Grouped:

| Group | Models |
| --- | --- |
| Auth (Better Auth core) | `User`, `Session`, `Account`, `Verification`, `TwoFactor` |
| Graduate profile | `Graduate`, `Employment`, `Education`, `Skill`, `Endorsement`, `GraduateLocation` |
| Recognition | `Achievement`, `ProfileBadge` |
| Groups | `AlumniGroup`, `GroupMember`, `GroupPost`, `PostComment`, `PostReaction` |
| Messaging | `Conversation`, `ConversationParticipant`, `Message` |
| Graph | `Connection`, `ProfileView` |
| Careers | `JobPosting`, `JobApplication`, `Mentorship` |
| Events | `Event`, `EventAttendee` |
| Engagement | `Notification`, `ActivityFeedItem` |
| Operations | `AdminSetting`, `UploadAuditLog`, `ImportJob`, `ImportJobError` |

`User` and `Graduate` are **1:1** — authentication identity on one side, the
academic and professional person on the other. Nearly every app-side relation
hangs off `Graduate`, not `User`.

Indexes are deliberate rather than incidental: registration number and email on
`User`; registration number, graduation year, faculty+course, degree class and
state on `Graduate`; composite sort indexes on posts, messages, notifications and
profile views; and status/date indexes on import jobs.

---

## 5. Security and privacy

- **Passwords** hashed with **scrypt**, the same implementation in the auth layer
  and the import engine, so imported accounts verify correctly on first sign-in.
- **Sessions** in httpOnly cookies, signed with `BETTER_AUTH_SECRET`, revoked
  across devices on password reset.
- **ID cards** signed with HMAC-SHA256 and compared in constant time; the
  verification link carries its own expiry inside the signature.
- **Rate limiting** via `@upstash/ratelimit`.
- **Privacy is per-graduate and enforced server-side** — nine visibility toggles,
  with salary never exposed outside the admin console and CGPA hidden on request.
- **Audit trail** for every bulk upload: who, what file, what outcome.
- **Trusted origins** pinned for auth; API routes pass through shared middleware
  for session and role checks.
- **Secrets never in the repo**: database URLs, Pusher, Redis, Resend, Termii and
  S3 credentials all come from the environment; the Android signing keystore and
  `key.properties` are gitignored.

---

## 6. Reliability and performance

- **Redis caching** with per-area TTLs (directory, notifications, admin lists)
  and a cache-version key so an admin change invalidates cleanly.
- **Virtualised tables** for graduate lists that run to five figures.
- **Connection pooling** tuned through environment variables (pool min/max,
  statement and idle timeouts, keepalive).
- **Resumable imports** (§3) and a watchdog for stalled jobs.
- **Chunked, retrying APK upload** for releases, because a single 55 MB PUT does
  not survive the connections this is published from.
- **Defensive JSON parsing** on the mobile side: the API returns Prisma output
  directly, so nullable columns arrive as `null` and `Decimal` columns as
  strings, and the client absorbs both rather than scattering casts.

---

## 7. What the site presents

These are **display values on the landing page**, not live database counts:

- **10,000+** alumni graduates, "across Nigeria & beyond"
- **5** faculties — Arts & Social Sciences, Education, Science, Medicine, Pharmacy
- **50+** departments
- **20+** years of excellence, since 2004

The landing page also carries messages from the **Vice Chancellor** and other
university leadership, and the university motto, *"Knowledge for Service"*.

Contact as published: Tudun Wada, Gombe, Gombe State, Nigeria —
`alumni@gsu.edu.ng`.

---

## 8. Honest current status

For an internal document, these are worth stating plainly:

- The **Android build currently published is debug-signed**. It installs and is
  fine for testing, but it must be replaced with a keystore-signed build before
  members install it — otherwise no signed update can ever replace it. The
  publishing script now refuses to upload a debug-signed APK unless explicitly
  overridden. See `docs/ANDROID_APP_DISTRIBUTION.md`.
- **Skills and endorsements** ship behind a flag that is **off by default**.
- **Self-registration is off**; membership comes from the Secretariat's imports.
- The landing-page statistics are **presentation constants**, not live queries.
- `DeveloperSection` exists on the landing page but is **commented out**.

---

## 9. Glossary

| Term | Meaning |
| --- | --- |
| **Registration number** | The university-issued student identifier, e.g. `UG19/ASAC/1025`. The login credential and the primary key for matching imports. |
| **Era** | Which generation of spreadsheet a row came from: legacy, mid-era or modern. Determines which columns to expect. |
| **Default password** | A generated password set at import. Forces onboarding until changed. |
| **Auto group** | A cohort, department, faculty or state group created by the importer rather than by a person. |
| **Bootstrap** | The single Android start-up call returning identity, flags and badge counts. |
| **Feature flag** | An `AdminSetting` boolean that switches a whole area off for web and mobile at once. |
