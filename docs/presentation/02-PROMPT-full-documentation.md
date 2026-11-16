# Prompt — full system documentation (no pictures needed)

**How to use:** open a new Claude chat, attach `01-SYSTEM-FACTS.md`, then paste
everything below the line. No screenshots are needed for this one.

---

You are writing the official system documentation for **GSU Alumni Connect**,
the alumni platform of Gombe State University, Nigeria.

I have attached `01-SYSTEM-FACTS.md`. **It is your only source of facts.** It was
generated directly from the codebase, so treat it as authoritative and complete.
Do not invent features, numbers, dates, names, integrations or roadmap items that
are not in it. If something a reader would reasonably expect is genuinely not
covered, write "not documented" rather than guessing.

## What to produce

One complete document, written to be read by three audiences at once:
university management who decide, the Alumni Secretariat who operate it daily,
and the technical team who maintain it. Where a section is clearly for one
audience, say so in its opening line so the others can skip it.

Use this structure, in this order:

1. **Executive summary** — one page. What the platform is, the problem it
   solves, what it offers today, who it serves. A reader who stops here should
   be able to explain the system in a meeting.
2. **Background and purpose** — why an alumni platform built on university
   records, and what makes it different from a generic social network: the
   graduate exists before they sign up, and academic identity is institutional
   rather than self-declared.
3. **Users and roles** — visitor, graduate, administrator. For each: what they
   can reach, what they cannot, and how an account comes into being.
4. **Services offered** — the heart of the document. One subsection per service
   from §2 of the facts file, covering all of: identity and access, directory
   and profiles, digital ID card, networking (connections, messaging, groups,
   feed, notifications), careers (jobs, mentorship), events, achievements and
   badges, the alumni map, the administration console, the Android app, and the
   public landing page. For each service write: what it does, who uses it, how
   it works in practice, and any rule or limit a user would hit.
5. **The bulk import engine** — its own chapter, in operator language first and
   engineering detail second. Cover the three spreadsheet eras, column-name
   variants, degree-class normalisation, codes derived from registration
   numbers, automatic group creation, queuing, checkpoint-and-resume, per-row
   error reports, the watchdog, and the rule that locked academic fields are
   never overwritten.
6. **Architecture** — stack table, application shape, how web, API, worker,
   cron and the Android client fit together. Include a text/ASCII or Mermaid
   diagram of the request path and one of the import pipeline.
7. **Data model** — the model groups, the `User`/`Graduate` split and why it
   exists, key relationships, and the indexing strategy. A Mermaid ER diagram of
   the main entities.
8. **Security and privacy** — authentication, password handling, session
   handling, ID-card signing and verification, rate limiting, the nine
   per-graduate privacy toggles, salary and CGPA handling, audit trails, secret
   management.
9. **Reliability and performance** — caching, virtualisation, pooling,
   resumable imports, retry behaviour.
10. **Operations** — deployment topology, the two cron jobs, the worker process,
    environment configuration by area (not actual secret values), how an Android
    release is published, and what routine maintenance looks like.
11. **Current status and known limitations** — reproduce §8 of the facts file
    honestly, including the debug-signed Android build, the flag-disabled skills
    feature, and that the landing-page statistics are presentation constants
    rather than live counts. Do not soften these.
12. **Glossary**.
13. **Appendix: API surface** — the route groups by domain.

## How to write it

- Plain, confident prose. Explain the mechanism, not just the label: a reader
  should finish a section understanding *why* it works that way.
- Prefer tables for anything enumerable: roles, services, flags, statuses,
  models, stack.
- Define every piece of jargon at first use — "registration number", "era",
  "default password", "auto group", "bootstrap", "feature flag".
- British spelling, Nigerian context. Full dates (3 November 2026).
- Never pad. No marketing adjectives, no "cutting-edge", no "seamless". If a
  sentence does not carry information, cut it.
- Mark anything that is a display value, a default, or a flagged-off feature as
  exactly that.
- Length is whatever completeness requires — aim for 15–25 pages equivalent —
  but every paragraph must earn its place.

## Output format

Produce it as a **document artifact in Markdown**, with a title page block at
the top carrying: document title, "Gombe State University — Alumni
Secretariat", version 1.0, and the date. Use heading levels consistently so it
converts cleanly to Word or PDF, and include a table of contents after the
title block.

When you have finished, list separately: (a) anything in the facts file you
could not place in the structure, and (b) the three questions whose answers
would most improve a version 2.
