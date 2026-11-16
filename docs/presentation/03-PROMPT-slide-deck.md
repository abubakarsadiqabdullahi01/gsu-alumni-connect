# Prompt — presentation slide deck (with images)

**How to use**

1. Open a new chat at claude.ai.
2. Attach `01-SYSTEM-FACTS.md`.
3. Attach the images from **`screenshots/upload/`** (the chat-sized JPEGs — the
   PNGs beside them are 2–8 MB each and will not upload well).
4. Paste everything below the line.

## Which images to attach

Attach these **18**. They carry the whole story and stay inside a chat's
attachment limit.

| File | Shows | Lands on slide |
| --- | --- | --- |
| `01-hero.jpg` | Landing hero | 1 — Title |
| `03-features.jpg` | The eight headline services | 4 — Service map |
| `31-directory.jpg` | Searchable alumni directory | 5 — Directory |
| `33-id-card.jpg` | The ID card, front | 6 — Digital ID |
| `13-id-card-verified.jpg` | A scanned card verifying as VALID | 7 — Verification |
| `36-groups.jpg` | Automatic and custom groups | 8 — Networking |
| `35-jobs.jpg` | Job board | 9 — Careers |
| `39-mentorship.jpg` | Mentorship | 9 — Careers |
| `34-map.jpg` | Alumni coverage map | 10 — Where alumni are |
| `40-events.jpg` | Events | 11 — Events and recognition |
| `10-login.jpg` | Registration-number sign-in | 12 — Institutional identity |
| `52-admin-uploads.jpg` | Bulk import with progress and error report | 13 — The import engine |
| `44-settings.jpg` | The nine privacy switches | 14 — Privacy |
| `50-admin-overview.jpg` | Admin console | 15 — Administration |
| `56-admin-settings.jpg` | Feature flags | 15 — Administration |
| `05-download.jpg` | Android download, QR, install steps | 16 — Reach |
| `20-mobile-hero.jpg` | The platform on a phone | 16 — Reach |
| `30-dashboard.jpg` | A member's dashboard | 17 — Getting started |

If you have room, these deepen three slides: `45-directory-profile.jpg` (a
graduate's profile), `47-id-card-back.jpg` (card reverse), `46-group-posts.jpg`
(inside a group), `53-admin-analytics.jpg` (analytics).

## Before you attach: real records

These images contain **other people's** data — names, registration numbers,
departments, degree classes:

`31-directory` · `45-directory-profile` · `51-admin-graduates` ·
`61-admin-graduate-detail` · `54-admin-network` · `59-admin-groups` ·
`63-admin-group-detail`

For an internal Secretariat meeting that is usually fine. For anything wider,
blur the name and registration-number columns first. The member screens other
than those show only the account that captured them.

---

You are building a presentation deck for **GSU Alumni Connect**, the alumni
platform of Gombe State University, Nigeria.

I have attached `01-SYSTEM-FACTS.md` — generated from the codebase and the
**only source of facts**. Do not invent features, figures, dates, names or
roadmap items that are not in it. I have also attached screenshots of the
running system; use each one on the slide the table above assigns it, and say
in your output which image belongs to which slide.

## Audience and purpose

Presented by the Alumni Secretariat to **university management and the alumni
association** — people who decide on budget, policy and rollout, not engineers.
They need to see what the platform does for graduates and for the university,
why it is credible, and what it needs next. A short technical annex serves the
few who ask harder questions.

## Deck structure

**18–22 slides**, in this arc:

**Opening (3)**
1. Title — platform name, Gombe State University, "Knowledge for Service", the
   date. Hero image.
2. The problem — a university loses touch with its graduates the day they
   leave; the records sit in spreadsheets; alumni have no way to find each
   other. No image.
3. The answer in one line — the official platform where every GSU graduate
   already has an account, built from the university's own graduation records.

**What it offers (7)**
4. The service map — all services on one slide, grouped.
5. Directory and profiles — institutional facts locked, professional detail
   owned by the graduate.
6. The digital ID card — issued, printable, carried.
7. Verification — a stranger scans the QR and gets a definitive answer. Make
   the point that the card verifies for its full five-year life and can be
   revoked if lost.
8. Networking — groups (created automatically from the import), messaging,
   connections.
9. Careers — job board and mentorship.
10. The alumni map — and the privacy decision behind it: coverage is aggregated
    by state before it leaves the server.
11. Events and recognition — events, achievements, the seven badges.

**Why it is credible (4)**
12. Institutional identity — sign-in by registration number; academic records
    locked, not self-declared.
13. The import engine — decades of inconsistent spreadsheets turned into
    accounts, resumable, with a per-row error report. This slide proves the
    system was built for real university data.
14. Privacy and security — nine per-graduate controls, signed ID cards, salary
    and CGPA never public, every upload audited.
15. Administration and control — the console, and feature flags that switch
    whole areas off without a deployment.

**Reach (2)**
16. Web and Android, one account, same data.
17. How a graduate starts — registration number, set a password, complete the
    profile.

**Close (3–4)**
18. Where it stands today. Use §8 of the facts file and these figures, which
    are the honest state of play: **17,606 graduates imported, 49 accounts
    active, 17,558 still on their default password**. Say plainly that the
    published Android build is a test build pending a signed release.
19. What that means — the platform is built; adoption has not started. The next
    work is reaching the membership, not more features. Be accurate about what
    exists: §8 of the facts file records that the system currently has no way
    to send an announcement to graduates at all.
20. Ask / next steps — leave the specific ask as a clearly marked placeholder
    for me to fill in.
21. Closing — the one-line value, and contact details.

**Technical annex (2–3, after the close)**
Architecture at a glance, data model scale, integrations.

## Slide craft

- **Six lines maximum per slide, under twelve words each.** If it needs more,
  it is two slides.
- Every slide gets a **headline that states a conclusion**, not a label:
  "Every graduate already has an account" beats "Accounts".
- Put the detail in **speaker notes**, and write them for every slide — spoken
  sentences, 45–60 seconds' worth. Someone who has not read the facts file
  should be able to present from the notes alone.
- Say how each image should be placed or cropped.
- Use the platform's own palette: deep green (`#032d1f`, `#047857`) with
  emerald accents on white. Motto: "Knowledge for Service".
- No stock photography, no clip art, no decorative icons that carry no meaning.
- Figures: only 10,000+ alumni, 5 faculties, 50+ departments, 20+ years since
  2004 — presented as the platform's published figures — plus the adoption
  numbers on slide 18.

## Output format

Build it as a **slide deck artifact**. For each slide give: number, headline,
body lines, the image to use, and speaker notes.

Afterwards, add two short lists: (a) which claims would be stronger as a live
demo than a screenshot, and (b) the three slides most likely to draw a hard
question, each with a one-line answer.
