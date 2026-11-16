# Module guide

One short entry per module: what it is, what a member does there, and what the
screen shows. Written from the running system on 3 November 2026.

Screenshots live in `screenshots/`. The member and admin images are produced by
`node scripts/capture-screenshots.mjs --auth`; they contain **live graduate
records**, so redact them before showing them outside the Secretariat.

Modules appear in the order the sidebar lists them.

---

## Main

### Dashboard — `/dashboard`
![Dashboard](screenshots/30-dashboard.png)

The landing screen after sign-in. Greets the member by name, shows their
registration number, and gives four counters — **connections, profile views,
jobs applied, groups joined** — above a recent-activity list drawn from their
own activity feed. It is a status board, not a workspace: everything on it is a
jumping-off point to another module.

### Activity feed — `/feed`
![Activity feed](screenshots/42-feed.png)

A chronological feed of what the network has been doing: people joining,
changing jobs, joining groups, posting, completing profiles, hitting graduation
anniversaries. Each item is a typed event with a written headline. Members who
switch off `showActivityFeed` do not appear in anyone else's feed.

### Directory — `/directory`
![Directory](screenshots/31-directory.png)

The searchable roll of alumni. Free-text search across name, department,
faculty and registration number, plus filters for **department** and
**graduation year**, and an *All / Connected* split. The result count reflects
only graduates who are **ACTIVE** and have left `showInDirectory` on — which is
why it currently reads 47 rather than 17,606.

Opening a row gives that graduate's public profile, subject to their privacy
switches:

![Alumni profile](screenshots/45-directory-profile.png)

### Job board — `/jobs`
![Job board](screenshots/35-jobs.png)

Openings posted by alumni, for alumni. Three tabs — **Browse**, **My
postings**, **Applied** — with search by role, company, industry or location, a
job-type filter and a location filter. Members post with **Post job**; salary is
optional and hidden unless the poster chooses to show it. Applications carry a
cover note and a CV, and move through applied → reviewed → shortlisted →
rejected. Administrators can mark a posting verified.

### Connections — `/connections`
![Connections](screenshots/38-connections.png)

The member's own graph: accepted connections, requests received awaiting a
decision, and requests sent. Requests can be accepted, declined or blocked.
Connection state also gates the *Connected* filter in the directory.

### Groups — `/groups`
![Groups](screenshots/36-groups.png)

Two kinds of community, in one list. **Automatic groups** are created by the
import engine — a cohort group ("2019 Set"), a department group, a faculty
group and a state group — and a graduate is enrolled in theirs on import,
without asking. **Custom groups** are made by members. Inside a group: posts,
threaded comments, five reaction types, pinned posts, and admin / moderator /
member roles.

![Inside a group](screenshots/46-group-posts.png)

### Messages — `/messages`
![Messages](screenshots/37-messages.png)

Direct and group conversations, delivered live over Pusher. Attachments, read
receipts and soft deletion are supported, and presence is tracked by heartbeat.
A member who turns off `allowMessages` cannot be opened in a new conversation.

---

## Explore

### Events — `/events`
![Events](screenshots/40-events.png)

Reunions, meetups, workshops, networking nights and webinars, with location,
start and end times, optional capacity and RSVP. Events can be public or
private, and cancelled without being deleted so attendees still see what
happened.

### Mentorship — `/mentorship`
![Mentorship](screenshots/39-mentorship.png)

Pairs experienced graduates with newer ones. A member opts in with
`availableForMentorship`; a mentee sends a request with a subject and a message;
the request moves through pending → accepted → declined → completed →
cancelled. Mentors keep private notes against a relationship, visible only to
them.

### Achievements and badges — `/achievements`
![Achievements](screenshots/41-achievements.png)

Two different things on one screen. **Achievements** are entries the graduate
writes themselves — an award, a publication, an appointment — which an
administrator can mark verified. **Badges** are awarded by the system against
fixed rules: First Class Honours, Profile Complete, Early Adopter (first 500 to
join), Mentor, Job Poster (3+ jobs), Top Connector (50+ profile views) and
Verified.

### Alumni map — `/map`
![Alumni map](screenshots/34-map.png)

Where GSU graduates are, by state, with filters for faculty, graduation year and
LGA. Four headline figures: **mapped alumni**, **top state**, **states
covered**, and unmapped. The page states plainly that coverage is aggregated by
state **before it leaves the server** — no individual address or coordinate is
shared, which is a deliberate privacy decision, not a limitation. A saved
location wins; state of origin is the fallback.

It currently shows **47 alumni across 4 states** (Gombe 43, Benue 2, Yobe 1,
Kogi 1). That is not a defect: the map counts only ACTIVE accounts, and only 49
of 17,607 graduates have signed in.

### Notifications — `/notifications`
![Notifications](screenshots/43-notifications.png)

Thirteen notification types — connection requests and acceptances, messages,
group posts, job matches, mentorship requests, endorsements, graduation
anniversaries, admin broadcasts and more. Each carries a deep link to the thing
it is about, plus read state. Counts are cached in Redis and surfaced in the
header bell and on the Android shell.

---

## Profile

### My profile — `/profile`
![Profile](screenshots/32-profile.png)

The member's own record, in two halves. **Locked academic facts** from the
university import — registration number, faculty, department, degree class,
CGPA, graduation year — which the graduate cannot edit. **Everything else** is
theirs: photo, bio, employment history, further education, skills, social links,
NYSC posting, signature image.

A server-computed **completion score** sits alongside it, with weighted sections
and a *next best action* naming the single highest-value thing still missing. A
bio under 40 characters, or fewer than three skills, counts as not done.

### Digital ID card — `/profile/id-card`
![ID card](screenshots/33-id-card.png)

The alumni identity card, rendered front and back from the university template
and exportable as PDF or printed with crop marks. It carries the holder's photo,
membership number, year of graduation, discipline, gender, signature and a
**QR code**.

Scanning the QR opens `/verify/id-card`, which anyone can use without signing
in. The QR carries an **opaque card id and a signature — never a name or
registration number**. Validity and revocation live in the `id_card` row and are
read at the moment of the scan, so a card verifies for its full **five-year**
life, and a lost card can be revoked.

The reverse face carries the association's terms and the holder's details:

![ID card, reverse](screenshots/47-id-card-back.png)

Verification answers one of four states: **valid**, **expired**, **revoked**,
**invalid** — and the identity it shows always comes from the card's own record,
never from anything supplied in the scanned link. This is what a stranger
scanning the QR sees:

![Verified card](screenshots/13-id-card-verified.png)

Note the masked membership number, and the five-year expiry: the card verifies
for as long as it is valid, not for the few minutes its page was open.

### Settings — `/settings`
![Settings](screenshots/44-settings.png)

Account and privacy. Nine switches decide what other members see: CGPA, email,
phone, date of birth, directory listing, who may message, activity-feed
visibility, open to opportunities, available for mentorship. Salary range is
stored for institutional reporting and is **never shown to other members**.

---

## Administration — `/admin`

Reachable only by an account with `role: "admin"`. There is currently **one**
admin account.

### Overview — `/admin`
![Admin overview](screenshots/50-admin-overview.png)

Platform health at a glance: membership, activity and the state of recent
imports.

### Graduates — `/admin/graduates`
![Admin graduates](screenshots/51-admin-graduates.png)

Every graduate record, searchable and filterable, with export. The table is
virtualised because the list runs to five figures. Opening a record shows the
full profile including fields members never see.

### Bulk import — `/admin/uploads`
![Admin uploads](screenshots/52-admin-uploads.png)

Where graduation spreadsheets become accounts. Upload a workbook, pick the
sheets, and the job is queued to a worker rather than processed in the request.
The screen shows live progress — rows processed, created, updated, failed — and
on completion a **per-row error report** listing every rejected row with its row
number, registration number and reason. A downloadable template is provided.

Imports checkpoint every 50 rows, so a crashed job resumes where it stopped
instead of restarting or double-creating accounts, and `PARTIAL_SUCCESS` is a
first-class outcome because real spreadsheets have bad rows.

### Analytics — `/admin/analytics`
![Admin analytics](screenshots/53-admin-analytics.png)

Alumni insights — distribution by faculty, department, degree class, graduation
year and state — with export.

### Network — `/admin/network`
![Admin network](screenshots/54-admin-network.png)

The connection graph at institutional level: who is connecting, how densely, and
where the network is thin.

### Broadcasts — `/admin/notifications`
![Admin broadcasts](screenshots/55-admin-notifications.png)

Announcements to the whole membership or a segment of it, delivered as in-app
notifications.

### Settings and feature flags — `/admin/settings`
![Admin settings](screenshots/56-admin-settings.png)

Platform identity (name, support email, welcome message), authentication policy
(self-registration, email verification, forced password change, two-factor), and
**six feature flags**: job board, mentorship, messaging, map, groups (all on)
and skills (**off**). Switching a flag off removes that area from the web app
and from the Android client at once — the mobile shell reads the flags at
start-up and drops the matching tabs, so it never offers a screen that would
answer 403.

### Job moderation — `/admin/jobs`
![Admin jobs](screenshots/57-admin-jobs.png)

Every posting, with the power to verify, deactivate or remove one, and to read
the applications against it.

### Achievement verification — `/admin/achievements`
![Admin achievements](screenshots/58-admin-achievements.png)

Claimed achievements awaiting a decision. Verifying one marks it on the
graduate's public profile.

### Group moderation — `/admin/groups`
![Admin groups](screenshots/59-admin-groups.png)

Every group, automatic and custom, with membership counts and post moderation.

![One group](screenshots/63-admin-group-detail.png)

### Mentorship oversight — `/admin/mentorship`
![Admin mentorship](screenshots/60-admin-mentorship.png)

Mentor and mentee pairings and their status, for spotting requests that have
gone unanswered.

![One mentorship](screenshots/64-admin-mentorship-detail.png)

### One graduate — `/admin/graduates/[id]`
![One graduate](screenshots/61-admin-graduate-detail.png)

The full record behind a row: locked academic fields, profile data, employment,
and the administrative fields members never see.

---

## One number worth carrying into any presentation

| | |
| --- | --- |
| Graduates imported | **17,606** |
| Accounts ACTIVE | **49** |
| Accounts PENDING, still on the default password | **17,558** |
| Profiles completed | **48** |

The platform is built and working; adoption has not started. Every "empty"
screen — the map with 47 dots, the directory with 47 rows — is this number, not
a fault in the module.
