#!/usr/bin/env node
/**
 * Captures the public screens for documentation and slide decks.
 *
 * Every section animates in on scroll (react-intersection-observer), so a naive
 * full-page shot catches half the page at opacity 0. Each section is scrolled
 * into view and given time to settle before it is captured.
 *
 *   node scripts/capture-screenshots.mjs
 *   node scripts/capture-screenshots.mjs --base http://localhost:3000 --out docs/presentation/screenshots
 *
 * Only pages that need no session are captured. Anything behind the login
 * renders live alumni records, which do not belong in a slide deck.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

/**
 * Puppeteer's own Chromium is a ~150 MB download that this repo has never
 * needed, so fall back to a browser the machine already has. CHROME_PATH wins
 * when it is set.
 */
function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = (arg("base", "http://localhost:3000") || "").replace(/\/+$/, "");
const OUT = arg(
  "out",
  process.argv.includes("--light")
    ? path.join("docs", "presentation", "screenshots", "upload")
    : path.join("docs", "presentation", "screenshots")
);

/** `--auth` also captures the screens behind the session. */
const AUTH = process.argv.includes("--auth");
/** `--only admin` / `--only member` / `--only public` narrows a re-run. */
const ONLY = arg("only", null);

/**
 * `--light` writes a second set sized for uploading to a chat: one device
 * pixel per CSS pixel instead of two, and JPEG instead of PNG. The retina PNGs
 * run to several megabytes each, which is right for print and wrong for an
 * attachment limit.
 */
const LIGHT = process.argv.includes("--light");

/** Where a capture lands, and in which format. */
function outPath(name) {
  return path.join(OUT, `${name}.${LIGHT ? "jpg" : "png"}`);
}

function shotOptions(extra = {}) {
  return LIGHT ? { type: "jpeg", quality: 82, ...extra } : extra;
}
/** Keeps the signed-in session between runs, so signing in is a one-time step. */
const PROFILE_DIR = arg("profile", path.join(".capture-profile"));

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: LIGHT ? 1 : 2 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: LIGHT ? 2 : 3, isMobile: true, hasTouch: true };

/** Landing sections, in the order app/page.tsx renders them. */
const SECTIONS = [
  { file: "01-hero", selector: "main > section:nth-of-type(1)", label: "Hero" },
  { file: "02-about", selector: "#about", label: "About the platform" },
  { file: "03-features", selector: "#features", label: "Feature grid" },
  { file: "04-stats", selector: "main > section:nth-of-type(4)", label: "Statistics" },
  { file: "05-download", selector: "#download", label: "Mobile app download" },
  { file: "06-leadership", selector: "#leadership", label: "Leadership messages" },
  { file: "07-cta", selector: "main > section:last-of-type", label: "Call to action" },
  { file: "08-footer", selector: "#contact", label: "Footer" },
];

const PAGES = [
  { file: "10-login", url: "/login", label: "Sign in" },
  { file: "11-forgot-password", url: "/forgot-password", label: "Forgot password" },
  { file: "12-id-card-verify", url: "/verify/id-card", label: "Public ID card verification" },
  { file: "14-reset-password", url: "/reset-password", label: "Reset password" },
];

/**
 * Screens behind the session, captured only with `--auth`.
 *
 * These render live records, so the images are for internal documentation. Do
 * not put them in a deck without redacting, or capture them against a seeded
 * database instead — see docs/presentation/README.md.
 */
const MEMBER_PAGES = [
  { file: "30-dashboard", url: "/dashboard", label: "Dashboard" },
  { file: "31-directory", url: "/directory", label: "Alumni directory" },
  { file: "32-profile", url: "/profile", label: "My profile" },
  { file: "33-id-card", url: "/profile/id-card", label: "Digital ID card", wait: 6000 },
  { file: "34-map", url: "/map", label: "Alumni map" },
  { file: "35-jobs", url: "/jobs", label: "Job board" },
  { file: "36-groups", url: "/groups", label: "Alumni groups" },
  { file: "37-messages", url: "/messages", label: "Messages" },
  { file: "38-connections", url: "/connections", label: "Connections" },
  { file: "39-mentorship", url: "/mentorship", label: "Mentorship" },
  { file: "40-events", url: "/events", label: "Events" },
  { file: "41-achievements", url: "/achievements", label: "Achievements and badges" },
  { file: "42-feed", url: "/feed", label: "Activity feed" },
  { file: "43-notifications", url: "/notifications", label: "Notifications" },
  { file: "44-settings", url: "/settings", label: "Settings and privacy" },
  // Skipped automatically for an account that has already onboarded.
  { file: "48-onboarding", url: "/onboarding", label: "Onboarding" },
];

const ADMIN_PAGES = [
  { file: "50-admin-overview", url: "/admin", label: "Admin — overview" },
  { file: "51-admin-graduates", url: "/admin/graduates", label: "Admin — graduates" },
  { file: "52-admin-uploads", url: "/admin/uploads", label: "Admin — bulk import" },
  { file: "53-admin-analytics", url: "/admin/analytics", label: "Admin — analytics" },
  { file: "54-admin-network", url: "/admin/network", label: "Admin — network" },
  { file: "55-admin-notifications", url: "/admin/notifications", label: "Admin — broadcasts" },
  { file: "56-admin-settings", url: "/admin/settings", label: "Admin — settings and flags" },
  { file: "57-admin-jobs", url: "/admin/jobs", label: "Admin — job moderation" },
  { file: "58-admin-achievements", url: "/admin/achievements", label: "Admin — achievement verification" },
  { file: "59-admin-groups", url: "/admin/groups", label: "Admin — group moderation" },
  { file: "60-admin-mentorship", url: "/admin/mentorship", label: "Admin — mentorship oversight" },
];

/**
 * Detail pages need a real id, so each one is found by opening its list and
 * taking the first row's link. Hard-coding ids would rot the moment the
 * database changed, and these runs are meant to be repeatable.
 */
const MEMBER_DETAILS = [
  { file: "45-directory-profile", list: "/directory", pattern: "^/directory/[0-9a-f-]{8,}", label: "Alumni profile" },
  { file: "46-group-posts", list: "/groups", pattern: "^/groups/[0-9a-f-]{8,}", suffix: "/posts", label: "Inside a group" },
];

/**
 * Admin tables are built from clickable rows rather than links, so there is no
 * href to read. These ask the same API the table uses and take the first id.
 */
const ADMIN_DETAILS = [
  { file: "61-admin-graduate-detail", api: "/api/admin/graduates?page=1&pageSize=1", base: "/admin/graduates", label: "Admin — one graduate" },
  { file: "62-admin-job-detail", api: "/api/admin/jobs?page=1&pageSize=1", base: "/admin/jobs", label: "Admin — one job" },
  { file: "63-admin-group-detail", api: "/api/admin/groups?page=1&pageSize=1", base: "/admin/groups", label: "Admin — one group" },
  { file: "64-admin-mentorship-detail", api: "/api/admin/mentorship?page=1&pageSize=1", base: "/admin/mentorship", label: "Admin — one mentorship" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The dev-server badge sits over the bottom-left corner of every shot. */
async function hideDevOverlays(page) {
  await page.addStyleTag({
    content: "nextjs-portal, #__next-build-watcher { display: none !important; }",
  });
}

/** Scrolls the whole page once so every on-scroll animation has fired. */
async function settlePage(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 260));
    }
    window.scrollTo(0, 0);
  });
  await sleep(700);
}

/**
 * Captures a list of pages, skipping any that bounce the visitor elsewhere —
 * a member account hitting /admin lands on the dashboard, and a screenshot of
 * the dashboard filed as "admin overview" is worse than a missing file.
 */
async function capturePages(page, pages, captured, group) {
  if (ONLY && ONLY !== group) return;
  for (const entry of pages) {
    await page.goto(`${BASE}${entry.url}`, { waitUntil: "networkidle2", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await hideDevOverlays(page);
    // The ID card studio fetches its payload and then resolves two images
    // through the proxy before it renders anything, so it needs longer than a
    // page whose data arrives with the document.
    await sleep(entry.wait ?? 1400);

    const landed = new URL(page.url()).pathname;
    if (landed !== entry.url) {
      console.warn(`  skipped ${entry.file} — redirected to ${landed}`);
      continue;
    }

    // One screen that will not capture should cost that screen, not the run.
    try {
      await page.screenshot(shotOptions({ path: outPath(entry.file) }));
      captured.push([entry.file, entry.label]);
      console.log(`  ${entry.file}.png  ${entry.label}`);
    } catch (error) {
      console.warn(`  failed  ${entry.file} — ${error?.message ?? error}`);
    }
  }
}

/**
 * A full-page shot of a long page can fail in a visible window, where the
 * capture is bounded by the real window rather than the emulated viewport.
 * Falling back to the viewport keeps a usable image instead of none.
 */
async function screenshotSafely(page, file, options = {}) {
  try {
    await page.screenshot(shotOptions({ path: file, ...options }));
    return true;
  } catch (error) {
    if (options.fullPage) {
      try {
        await page.screenshot(shotOptions({ path: file }));
        console.warn(`  ${path.basename(file)} captured at viewport height — full page failed`);
        return true;
      } catch {
        /* fall through */
      }
    }
    console.warn(`  failed  ${path.basename(file)} — ${error?.message ?? error}`);
    return false;
  }
}

/** Opens a list page and returns the first row's detail link, or null. */
async function findFirstDetailLink(page, listUrl, pattern) {
  await page.goto(`${BASE}${listUrl}`, { waitUntil: "networkidle2", timeout: 60_000 });
  await hideDevOverlays(page);
  await sleep(1800); // rows arrive after the page settles

  return page.evaluate((source) => {
    const re = new RegExp(source);
    const href = [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .find((h) => h && re.test(h));
    return href ?? null;
  }, pattern);
}

/** First id in an API response, whatever key the payload wraps its rows in. */
async function findIdFromApi(page, apiUrl) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const seen = new WeakSet();
    const walk = (node) => {
      if (!node || typeof node !== "object" || seen.has(node)) return null;
      seen.add(node);

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = walk(item);
          if (found) return found;
        }
        return null;
      }

      if (typeof node.id === "string" && /^[0-9a-f-]{20,}$/i.test(node.id)) return node.id;

      for (const value of Object.values(node)) {
        const found = walk(value);
        if (found) return found;
      }
      return null;
    };

    return walk(await response.json());
  }, apiUrl);
}

async function captureDetails(page, details, captured, group) {
  if (ONLY && ONLY !== group) return;

  for (const detail of details) {
    let href = null;

    if (detail.api) {
      const id = await findIdFromApi(page, detail.api);
      if (id) href = `${detail.base}/${id}`;
    } else {
      href = await findFirstDetailLink(page, detail.list, detail.pattern);
    }

    if (!href) {
      console.warn(`  skipped ${detail.file} — nothing to open (no rows yet)`);
      continue;
    }

    await page.goto(`${BASE}${href}${detail.suffix ?? ""}`, { waitUntil: "networkidle2", timeout: 60_000 });
    await hideDevOverlays(page);
    await sleep(1800);

    if (await screenshotSafely(page, outPath(detail.file))) {
      captured.push([detail.file, detail.label]);
      console.log(`  ${detail.file}.png  ${detail.label}`);
    }
  }
}

/** The card's reverse face, which only exists behind the FRONT/BACK toggle. */
async function captureIdCardBack(page, captured) {
  await page.goto(`${BASE}/profile/id-card`, { waitUntil: "networkidle2", timeout: 60_000 });
  await hideDevOverlays(page);
  await sleep(5000); // the studio resolves photo and signature through the proxy first

  const flipped = await page.evaluate(() => {
    const control = [...document.querySelectorAll("button, [role='tab']")].find(
      (el) => el.textContent?.trim().toUpperCase() === "BACK"
    );
    if (!control) return false;
    control.click();
    return true;
  });

  if (!flipped) {
    console.warn("  skipped 47-id-card-back — no BACK control found");
    return;
  }

  await sleep(2000);
  if (await screenshotSafely(page, outPath("47-id-card-back"))) {
    captured.push(["47-id-card-back", "ID card, reverse face"]);
    console.log("  47-id-card-back.png  ID card, reverse face");
  }
}

/**
 * The verification page as a stranger scanning the QR actually sees it.
 *
 * The public capture lands on the empty form and shows INVALID, which is the
 * one state nobody wants on a slide. This asks the signed-in session for its
 * own card and follows the real link.
 */
async function captureValidVerification(page, captured) {
  const url = await page.evaluate(async () => {
    const response = await fetch("/api/id-cards", { cache: "no-store" });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.verification?.url ?? null;
  });

  if (!url) {
    console.warn("  skipped 13-id-card-verified — could not read the card's verification link");
    return;
  }

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
  await hideDevOverlays(page);
  await sleep(1200);

  if (await screenshotSafely(page, outPath("13-id-card-verified"))) {
    captured.push(["13-id-card-verified", "ID card verification — valid result"]);
    console.log("  13-id-card-verified.png  ID card verification — valid result");
  }
}

/**
 * Keeps the signed-in session across runs.
 *
 * The Chrome profile alone is not enough: the app issues its session cookie
 * without an expiry, so Chrome treats it as session-scoped and drops it the
 * moment puppeteer closes the browser — which is why "sign in once" kept
 * turning into "sign in every run". Saving the cookie with an explicit expiry
 * and restoring it makes the sign-in genuinely one-time.
 *
 * The file holds a live session cookie, so it stays inside the gitignored
 * profile directory and nowhere else.
 */
function cookieFile() {
  return path.join(PROFILE_DIR, "session-cookies.json");
}

async function saveSession(page) {
  try {
    const cookies = await page.cookies(BASE);
    if (!cookies.length) return;
    const weekFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const persistent = cookies.map((cookie) => ({
      ...cookie,
      expires: cookie.expires && cookie.expires > 0 ? cookie.expires : weekFromNow,
    }));
    mkdirSync(PROFILE_DIR, { recursive: true });
    writeFileSync(cookieFile(), JSON.stringify(persistent, null, 2));
    console.log("  Session saved — the next run will not ask you to sign in.\n");
  } catch (error) {
    console.warn(`  could not save the session — ${error?.message ?? error}`);
  }
}

async function restoreSession(page) {
  if (!existsSync(cookieFile())) return;
  try {
    const cookies = JSON.parse(readFileSync(cookieFile(), "utf8"));
    if (Array.isArray(cookies) && cookies.length) await page.setCookie(...cookies);
  } catch (error) {
    console.warn(`  could not restore the saved session — ${error?.message ?? error}`);
  }
}

/** Waits for the person to sign in by hand, in the window we just opened. */
async function waitForSignIn(page, timeoutMs = 5 * 60_000) {
  await restoreSession(page);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60_000 });

  if (new URL(page.url()).pathname !== "/login") return true; // already signed in

  console.log("\n  A Chrome window is open. Sign in there — this waits up to 5 minutes.");
  console.log("  The session is then saved, so this is a one-time step.\n");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1500);
    const pathname = new URL(page.url()).pathname;
    if (pathname !== "/login" && !pathname.startsWith("/forgot") && !pathname.startsWith("/reset")) {
      console.log(`  Signed in — landed on ${pathname}\n`);
      await sleep(1200);
      await saveSession(page);
      return true;
    }
  }
  return false;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const executablePath = findBrowser();
  const browser = await puppeteer.launch({
    // Signing in needs a visible window; everything else runs headless.
    headless: AUTH ? false : "new",
    ...(executablePath ? { executablePath } : {}),
    ...(AUTH ? { userDataDir: PROFILE_DIR } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: DESKTOP,
  });
  if (executablePath) console.log(`  Chrome ${executablePath}`);

  const captured = [];

  try {
    const page = await browser.newPage();
    await page.setViewport(DESKTOP);

    console.log(`  Base   ${BASE}`);
    console.log(`  Out    ${path.resolve(OUT)}\n`);

    // ── Landing page ────────────────────────────────────────────────────────
    // `--only member` / `--only admin` skips this whole block: re-shooting the
    // public pages just to reach a sign-in wastes a minute every run.
    const doPublic = !ONLY || ONLY === "public";

    if (doPublic) {
    await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await hideDevOverlays(page);
    await settlePage(page);

    for (const section of SECTIONS) {
      const el = await page.$(section.selector);
      if (!el) {
        console.warn(`  skipped ${section.file} — no match for ${section.selector}`);
        continue;
      }
      await el.scrollIntoView();
      await sleep(900); // let the fade-in finish
      const file = outPath(section.file);
      await el.screenshot(shotOptions({ path: file }));
      captured.push([section.file, section.label]);
      console.log(`  ${section.file}.png  ${section.label}`);
    }

    // Whole page in one image, for a reference sheet rather than a slide.
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);
    if (await screenshotSafely(page, outPath("00-landing-full"), { fullPage: true })) {
      captured.push(["00-landing-full", "Entire landing page"]);
      console.log("  00-landing-full.png  Entire landing page");
    }

    // ── Standalone public pages ─────────────────────────────────────────────
    for (const entry of PAGES) {
      await page.goto(`${BASE}${entry.url}`, { waitUntil: "networkidle2", timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);
      await hideDevOverlays(page);
      await sleep(900);
      await page.screenshot(shotOptions({ path: outPath(entry.file) }));
      captured.push([entry.file, entry.label]);
      console.log(`  ${entry.file}.png  ${entry.label}`);
    }

    } // end public pages

    // ── Screens behind the session ──────────────────────────────────────────
    if (AUTH) {
      const landing = await waitForSignIn(page);
      if (landing) {
        // What gets captured is decided by whoever is signed in, not by which
        // profile directory was passed. Profile names drift from their contents
        // the moment someone signs a different account into one, and an
        // administrator has no graduate record — so their "member" screens
        // capture empty, which is worse than capturing nothing.
        const asAdmin = new URL(page.url()).pathname.startsWith("/admin");
        const wantMember = !ONLY || ONLY === "member";
        const wantAdmin = !ONLY || ONLY === "admin";

        console.log(`  Session is ${asAdmin ? "an administrator" : "a member"}.\n`);

        if (asAdmin) {
          if (wantAdmin) {
            await capturePages(page, ADMIN_PAGES, captured, "admin");
            await captureDetails(page, ADMIN_DETAILS, captured, "admin");
          }
          if (wantMember) {
            console.warn("  Member screens need a member account — skipped.");
          }
        } else {
          if (wantMember) {
            await capturePages(page, MEMBER_PAGES, captured, "member");
            await captureDetails(page, MEMBER_DETAILS, captured, "member");
            await captureIdCardBack(page, captured);
            await captureValidVerification(page, captured);
          }
          if (wantAdmin) {
            console.warn("  Admin screens need the ADMIN/ADMIN account — skipped.");
          }
        }
      } else {
        console.warn("  Timed out waiting for sign-in — member screens skipped.\n");
      }
    }

    // ── Phone-width landing, for the "works on any device" slide ────────────
    if (!doPublic) return;
    const mobile = await browser.newPage();
    await mobile.setViewport(MOBILE);
    await mobile.goto(BASE, { waitUntil: "networkidle2", timeout: 60_000 });
    await mobile.evaluate(() => document.fonts.ready);
    await hideDevOverlays(mobile);
    await settlePage(mobile);
    if (await screenshotSafely(mobile, outPath("20-mobile-hero"))) {
      captured.push(["20-mobile-hero", "Landing on a phone"]);
      console.log("  20-mobile-hero.png  Landing on a phone");
    }
    if (await screenshotSafely(mobile, outPath("21-mobile-full"), { fullPage: true })) {
      captured.push(["21-mobile-full", "Landing on a phone, full"]);
      console.log("  21-mobile-full.png  Landing on a phone, full");
    }
  } finally {
    await browser.close();
  }

  console.log(`\n  ${captured.length} images in ${path.resolve(OUT)}\n`);
}

main().catch((error) => {
  console.error(`\n  Failed: ${error?.message ?? error}\n`);
  process.exit(1);
});
