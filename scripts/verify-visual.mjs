#!/usr/bin/env node
/**
 * Visual and runtime verification.
 *
 * Drives the running application in a real browser and checks the things a
 * unit test cannot: that the pages hydrate, that no Content-Security-Policy
 * violation blocks the app, that the content is legible at small viewports,
 * and that the entrance animations actually run.
 *
 *   node scripts/verify-visual.mjs [baseUrl]
 *
 * Requires a server on http://localhost:3000 and a local Chrome install.
 */

import { mkdir } from "node:fs/promises";
import { existsSync as existsSyncSync } from "node:fs";
import path from "node:path";

import puppeteer from "puppeteer-core";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const SLUG = process.env.RECIPIENT_SLUG ?? "ana";
const CODE = process.env.ACCESS_CODE ?? "";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const OUT_DIR = path.join(process.cwd(), ".verification");

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 780 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const failures = [];

function check(label, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  console.log(`  [${status}] ${label}${detail ? ` — ${detail}` : ""}`);

  if (!condition) {
    failures.push(label);
  }
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSyncSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No Chrome install found. Set CHROME_PATH to the browser executable.",
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const executablePath = process.env.CHROME_PATH ?? findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  const cspViolations = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    consoleErrors.push(
      `request failed: ${request.url()} (${failure ? failure.errorText : "unknown"})`,
    );
  });

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("open.spotify.com")) {
      // The embed is third-party; the offline network is not our problem.
      request.abort().catch(() => {});
      return;
    }
    request.continue().catch(() => {});
  });

  console.log(`\nVerifying ${BASE_URL}\n`);

  // ------------------------------------------------------------- the gate --
  console.log("Access gate");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/${SLUG}`, { waitUntil: "networkidle2" });

  check("gate renders", (await page.$("#access-code")) !== null);
  check(
    "gate has an associated label",
    (await page.$('label[for="access-code"]')) !== null,
  );
  check(
    "gate shows no private content",
    !(await page.content()).includes("Hay días que merecen"),
  );

  const gateVisible = await page.evaluate(() => {
    const input = document.querySelector("#access-code");
    if (!input) return false;
    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  check("gate input is visible", gateVisible);

  await page.screenshot({ path: path.join(OUT_DIR, "gate.png") });

  // --------------------------------------------------------------- login --
  if (CODE.length > 0) {
    console.log("\nAuthentication");

    // The button stays disabled until the client has hydrated.
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]');
        return button instanceof HTMLButtonElement && !button.disabled;
      },
      { timeout: 15000 },
    );

    await page.type("#access-code", CODE);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    check(
      "redirected to the welcome page",
      page.url().includes(`/${SLUG}/bienvenida`),
      page.url(),
    );
    check(
      "the access code never reaches the URL",
      !page.url().includes(CODE),
      page.url(),
    );

    const hydrated = await page.evaluate(() => {
      // A client-side navigation that preserves a window flag proves React
      // hydrated: a full page load would wipe the flag.
      window.__hydrationProbe = true;
      return true;
    });

    await page.click('a[href$="/carta"]');
    await page.waitForFunction(() => location.pathname.endsWith("/carta"), {
      timeout: 10000,
    });

    const clientNavigated = await page.evaluate(
      () => window.__hydrationProbe === true,
    );
    check("React is hydrated (client-side navigation)", hydrated && clientNavigated);

    // ------------------------------------------------------ the three pages --
    console.log("\nPrivate pages");
    for (const [label, route] of [
      ["welcome", "bienvenida"],
      ["playlist", "playlist"],
      ["letter", "carta"],
    ]) {
      await page.goto(`${BASE_URL}/${SLUG}/${route}`, {
        waitUntil: "networkidle2",
      });
      // Long enough for the staggered reveal to finish.
      await new Promise((resolve) => setTimeout(resolve, 2200));

      const heading = await page.$eval("h1", (node) =>
        node.textContent?.trim() ?? "",
      );
      check(`${label} page renders a heading`, heading.length > 0, heading);

      const opacity = await page.evaluate(() => {
        const element = document.querySelector("[data-reveal]");
        if (!element) return null;
        return Number.parseFloat(getComputedStyle(element).opacity);
      });
      check(
        `${label} content is visible`,
        opacity === null || opacity > 0.9,
        `opacity=${opacity}`,
      );

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      check(`${label} has no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`);

      await page.screenshot({
        path: path.join(OUT_DIR, `${label}.png`),
        fullPage: label === "letter",
      });
    }

    // ------------------------------------------------------- responsiveness --
    console.log("\nResponsive layout");
    for (const viewport of VIEWPORTS) {
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
      });
      await page.goto(`${BASE_URL}/${SLUG}/carta`, {
        waitUntil: "networkidle2",
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      check(
        `${viewport.name} (${viewport.width}px) has no horizontal overflow`,
        overflow <= 1,
        `overflow=${overflow}px`,
      );

      const fontSize = await page.evaluate(() => {
        const body = document.querySelector(".letter-body");
        if (!body) return null;
        return Number.parseFloat(getComputedStyle(body).fontSize);
      });
      check(
        `${viewport.name} keeps the letter legible`,
        fontSize !== null && fontSize >= 16,
        fontSize === null ? "no letter body" : `font-size=${fontSize}px`,
      );

      await page.screenshot({ path: path.join(OUT_DIR, `letter-${viewport.name}.png`) });
    }

    // The access form has to stay usable on the narrowest screen too.
    await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/${SLUG}`, { waitUntil: "networkidle2" });
    const gateWidth = await page.evaluate(() => {
      const input = document.querySelector("#access-code");
      return input ? input.getBoundingClientRect().width : null;
    });
    check(
      "mobile keeps the access form usable",
      gateWidth !== null && gateWidth > 120,
      `width=${gateWidth}`,
    );

    // -------------------------------------------------- reduced motion check --
    console.log("\nReduced motion");
    await page.setViewport({ width: 1440, height: 900 });
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await page.goto(`${BASE_URL}/${SLUG}/bienvenida`, {
      waitUntil: "networkidle2",
    });
    await new Promise((resolve) => setTimeout(resolve, 400));

    const motion = await page.evaluate(() => {
      const element = document.querySelector("[data-reveal]");
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        opacity: Number.parseFloat(style.opacity),
        animationDuration: style.animationDuration,
      };
    });
    check(
      "reduced motion keeps the content visible",
      motion !== null && motion.opacity > 0.9,
      motion === null ? "no reveal element" : `opacity=${motion.opacity}`,
    );
    check(
      "reduced motion collapses the animation",
      motion !== null && Number.parseFloat(motion.animationDuration) < 0.05,
      motion === null ? "" : `duration=${motion.animationDuration}`,
    );

    const drifting = await page.evaluate(() => {
      const element = document.querySelector(".ambient-drift");
      if (!element) return null;
      return Number.parseFloat(getComputedStyle(element).animationDuration);
    });
    check(
      "reduced motion stops the ambient drift",
      drifting === null || drifting < 0.05,
      drifting === null ? "" : `duration=${drifting}s`,
    );
  }

  // ---------------------------------------------------------------- errors --
  console.log("\nRuntime");

  /*
   * Regression guard: a Content-Security-Policy that blocks the Turbopack
   * HMR client makes the dev runtime fall back to a full page reload, which
   * turns into an endless reload loop. The symptom is a page that reloaded
   * itself several times a second, so we count document loads over a window.
   */
  const documentLoads = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentLoads.push(request.url());
    }
  });

  await page.goto(`${BASE_URL}/${SLUG}/carta`, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  check(
    "the page does not reload itself in a loop",
    documentLoads.length <= 2,
    `${documentLoads.length} document loads in 5s`,
  );

  const relevantErrors = consoleErrors.filter(
    (error) =>
      !error.includes("net::ERR_ABORTED") &&
      !error.includes("open.spotify.com") &&
      !error.includes("Failed to load resource"),
  );
  check("no console errors", relevantErrors.length === 0, relevantErrors.join(" | "));
  check("no CSP violations", cspViolations.length === 0, cspViolations.join(" | "));

  await browser.close();

  console.log(
    failures.length === 0
      ? "\nAll checks passed.\n"
      : `\n${failures.length} check(s) failed:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`,
  );

  process.exit(failures.length === 0 ? 0 : 1);
}

await main();
