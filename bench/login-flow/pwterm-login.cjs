'use strict';
// Same nine steps as pwterm's examples/login.yaml, driven with pwterm's system
// Chromium. Usage: PWTERM_DIR=$HOME/pwterm node pwterm-login.cjs
//
// This is the baseline the obscura numbers are compared against.

const path = require('path');
const os = require('os');
const PWTERM = process.env.PWTERM_DIR || path.join(process.env.HOME || '.', 'pwterm');

require(path.join(PWTERM, 'src', 'termux')).applyEnvDefaults();

const { chromium } = require(path.join(PWTERM, 'node_modules', 'playwright-core'));
const { findChromium } = require(path.join(PWTERM, 'src', 'termux'));
const stealth = require(path.join(PWTERM, 'src', 'stealth'));

const SHOT = process.env.SHOT || path.join(os.tmpdir(), 'pwterm-login.png');
const t0 = Date.now();

(async () => {
  // Same launch path pwterm uses: system Chromium + stealth defaults.
  const executablePath = findChromium();
  const useStealth = stealth.enabled({});
  const extra = useStealth ? stealth.launchOptions({ executablePath }) : { args: [] };
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', ...extra.args],
    ...(extra.ignoreDefaultArgs ? { ignoreDefaultArgs: extra.ignoreDefaultArgs } : {}),
  });
  if (useStealth) stealth.harden(browser);
  const tLaunch = Date.now();
  const page = await browser.newPage();
  const tPage = Date.now();

  await page.goto('https://practicetestautomation.com/practice-test-login/');
  const tGoto = Date.now();
  if (!/Practice Test Automation/.test(await page.title())) throw new Error('title mismatch');

  await page.fill('#username', 'student');
  await page.fill('#password', 'Password123');
  await page.click('#submit');
  await page.waitForURL(/logged-in-successfully/);
  const h1 = (await page.textContent('h1')).trim();
  if (h1 !== 'Logged In Successfully') throw new Error('h1 mismatch: ' + h1);
  await page.waitForSelector("a:has-text('Log out')", { state: 'visible' });
  const tSteps = Date.now();

  await page.screenshot({ path: SHOT });
  const tEnd = Date.now();

  console.log(JSON.stringify({
    launch_ms: tLaunch - t0,
    newPage_ms: tPage - tLaunch,
    goto_ms: tGoto - tPage,
    steps_ms: tSteps - tGoto,
    screenshot_ms: tEnd - tSteps,
    total_ms: tEnd - t0,
    ok: true,
  }));
  await browser.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
