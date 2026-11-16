# Presentation and documentation pack

Everything needed to have Claude chat produce the system documentation and the
presentation deck, without it inventing anything.

## The files

| File | What it is | What to do with it |
| --- | --- | --- |
| `01-SYSTEM-FACTS.md` | Complete factual brief of the platform, generated from the codebase | **Attach to the chat.** Never paste a prompt without it |
| `02-PROMPT-full-documentation.md` | Prompt for the complete written documentation | Paste below the line. No images needed |
| `03-PROMPT-slide-deck.md` | Prompt for the presentation deck | Paste below the line, with the images attached |
| `04-MODULE-GUIDE.md` | Short details for all 22 modules, each with its screenshot | Read it, or hand it to someone learning the system |
| `screenshots/` | 48 full-resolution PNGs of every screen | Printing, and the module guide |
| `screenshots/upload/` | The same screens as chat-sized JPEGs | **Attach these to the chat** — the PNGs are 2–8 MB each |

## How to use it

1. Open a new chat at claude.ai.
2. Attach `01-SYSTEM-FACTS.md`.
3. For the deck, also attach the 18 images listed at the top of
   `03-PROMPT-slide-deck.md`, taken from `screenshots/upload/`.
4. Paste the prompt, everything below the `---` line.

Keeping the facts in a separate attached file is what stops the output drifting:
the prompt says *how* to write, the facts file says *what is true*, and the
instruction "this is your only source of facts" ties them together.

## Regenerating the screenshots

After any UI change:

```bash
npm run dev
```

```bash
node scripts/capture-screenshots.mjs --auth --profile .capture-profile
```

```bash
node scripts/capture-screenshots.mjs --auth --only admin --profile .capture-profile-admin
```

Add `--light` to either command to refresh the chat-sized JPEGs in `upload/`.

The script drives a Chrome already on the machine, scrolls each section so its
animation finishes, hides the dev-server badge, and decides what to capture
from **whoever is signed in** — a member session gets the member screens, an
administrator gets the console. Signing in is a one-time step per profile: the
session is saved and restored, because the app issues its cookie without an
expiry and Chrome would otherwise discard it when the browser closes.

Detail pages (one graduate, one group, one mentorship) resolve their ids from
the same API the tables use, since admin rows are clickable elements rather
than links.

## Real records in the images

The captures run against the live Neon database, so some images contain **other
people's** data — names, registration numbers, departments, degree classes:

`31-directory` · `45-directory-profile` · `51-admin-graduates` ·
`61-admin-graduate-detail` · `54-admin-network` · `59-admin-groups` ·
`63-admin-group-detail`

Every other member screen shows only the account that captured it. For an
internal Secretariat meeting the set is usually fine as it stands; for a wider
audience, blur the name and registration-number columns in those seven, or
capture against a seeded database (`prisma/seed.cjs`) instead.

Only `62-admin-job-detail` is missing from the set, because there are no job
postings in the database to open.

## Keeping the facts file honest

`01-SYSTEM-FACTS.md` is a snapshot of the code on 3 November 2026. It records
current status plainly, including the debug-signed Android build and the
feature-flagged skills module. When those change, update §8 — a facts file that
flatters the system is worse than none, because the documentation generated
from it inherits every exaggeration.
