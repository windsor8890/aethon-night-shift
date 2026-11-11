import { ensureServer, stopServer, launchBrowser, makePage, loadApp } from './harness.mjs';

const server = await ensureServer();
const browser = await launchBrowser();
const checks = [];
let failed = false;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failed = true;
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

try {
  const page = await makePage(browser, { width: 1440, height: 900 });
  const errors = await loadApp(page);
  await page.waitForTimeout(600);

  check('app boots', await page.evaluate(() => window.__READY__ === true));
  check('landing state', (await page.evaluate(() => window.__APP__.state)) === 'landing');
  check('desktop has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('chapter index rendered', await page.locator('.film-index li').count() === 5);

  await page.click('#playBtn');
  await page.waitForTimeout(1600);
  check('film plays', (await page.evaluate(() => window.__APP__.state)) === 'cinema');
  check('letterbox engages', (await page.locator('#app').getAttribute('class')).includes('is-cinema'));
  check('audio context running', await page.evaluate(() => window.__APP__.audio.ctx?.state === 'running'));
  check('audio graph built', await page.evaluate(() => (window.__APP__.audio.nodes?.length || 0) > 5));

  await page.click('#filmSound');
  await page.waitForTimeout(180);
  check('film mute works', await page.evaluate(() => window.__APP__.audio.muted === true));
  await page.click('#filmSound');
  await page.waitForTimeout(180);

  await page.waitForTimeout(1200);
  await page.click('#skipBtn');
  await page.waitForTimeout(1700);
  check('skip reaches end', (await page.evaluate(() => window.__APP__.state)) === 'end');
  check('end card visible', (await page.locator('#endCard').getAttribute('aria-hidden')) === 'false');

  await page.click('#replayBtn');
  await page.waitForTimeout(1300);
  check('replay returns to film', (await page.evaluate(() => window.__APP__.state)) === 'cinema');

  await page.evaluate(() => window.__APP__.enterExplore('track'));
  await page.waitForTimeout(700);
  check('track free look', (await page.evaluate(() => window.__APP__.state)) === 'exploreTrack');
  check('controls enabled in free look', await page.evaluate(() => window.__APP__.controls.enabled));
  check('car staged on track', await page.evaluate(() => Math.abs(window.__APP__.vehicle.root.position.z - 50) < 0.01));

  await page.evaluate(() => window.__APP__.returnGarage());
  await page.waitForTimeout(1000);
  check('returns to garage', (await page.evaluate(() => window.__APP__.state)) === 'landing');

  await page.click('#creditsBtn');
  await page.waitForTimeout(350);
  check('credits modal opens', (await page.locator('#creditsModal').getAttribute('class')).includes('is-open'));
  await page.click('#closeCredits');
  await page.waitForTimeout(250);
  check('credits modal closes', !(await page.locator('#creditsModal').getAttribute('class')).includes('is-open'));

  check('no page errors (desktop)', errors.length === 0, errors.join(' | '));

  const mobile = await makePage(browser, { width: 390, height: 844, dpr: 2 });
  const mobileErrors = await loadApp(mobile);
  await mobile.waitForTimeout(800);
  check('mobile landing visible', (await mobile.evaluate(() => window.__APP__.state)) === 'landing');
  check('mobile has no overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.click('#playBtn');
  await mobile.waitForTimeout(1400);
  check('mobile film starts', (await mobile.evaluate(() => window.__APP__.state)) === 'cinema');
  check('mobile sound control visible', await mobile.locator('#filmSound').isVisible());
  check('no page errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | '));
  await mobile.close();
} finally {
  await browser.close();
  stopServer(server);
}

const passed = checks.filter((c) => c.ok).length;
console.log(`\n${passed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
