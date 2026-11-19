'use strict';
// Same nine steps as pwterm's examples/login.yaml, driven over obscura's CDP
// endpoint. Usage: CDP_URL=http://127.0.0.1:9222 node obscura-login.cjs
//
// Needs playwright-core (any copy). Set PWTERM_DIR to the pwterm checkout so the
// Android browser-registry patch and the pwterm helpers can be reused:
//   PWTERM_DIR=$HOME/pwterm

const path = require('path');
const PWTERM = process.env.PWTERM_DIR || path.join(process.env.HOME || '.', 'pwterm');

// Must run before playwright-core is required: on Android its registry caches
// the browser cache dir at import time and throws otherwise.
require(path.join(PWTERM, 'src', 'termux')).applyEnvDefaults();

const { chromium } = require(path.join(PWTERM, 'node_modules', 'playwright-core'));

const SHOT = process.env.SHOT || path.join(require('os').tmpdir(), 'obscura-login.png');
const t0 = Date.now();

(async () => {
  const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
  const tConnect = Date.now();
  const page = await (await browser.newContext()).newPage();
  const tPage = Date.now();

  await page.goto('https://practicetestautomation.com/practice-test-login/');
  const tGoto = Date.now();
  if (!/Practice Test Automation/.test(await page.title())) throw new Error('title mismatch');

  await page.fill('#username', process.env.USERNAME_VAR || 'student');
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
    connect_ms: tConnect - t0,
    newPage_ms: tPage - tConnect,
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
