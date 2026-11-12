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
  await page.waitForTimeout(300);

  check('app boots', await page.evaluate(() => window.__READY__ === true));
  check('loader dismissed', await page.locator('#loader').evaluate((el) => getComputedStyle(el).display === 'none'));
  check('hero heading', (await page.locator('#modeTitle').innerText()).includes('FULL'));
  check('car loaded', await page.evaluate(() => window.__SHOWCASE__.car.wheels.length === 4 && Boolean(window.__SHOWCASE__.car.root)));
  check('2022 livery applied', await page.evaluate(() => window.__SHOWCASE__.car.liveryMaterials.length >= 20));
  check('Ferrari shield + number', await page.evaluate(() => {
    let shield = false;
    let number = false;
    window.__SHOWCASE__.car.root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name === 'livery-shield-front' && o.geometry.attributes.position?.count > 0) shield = true;
      if (o.name === 'livery-number-nose' && o.geometry.attributes.position?.count > 0) number = true;
    });
    return shield && number;
  }));
  check('Pirelli tyre marks', await page.evaluate(() => {
    let n = 0;
    window.__SHOWCASE__.car.root.traverse((o) => {
      if (o.isMesh && o.material?.name === 'PirelliTyreMark') n += 1;
    });
    return n === 4;
  }));
  check('canvas sized', await page.locator('#stage').evaluate((el) => el.clientWidth > 1000 && el.clientHeight > 600));
  check('desktop has no overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('four modes rendered', await page.locator('.mode-btn').count() === 4);

  await page.click('.mode-btn[data-mode="cutaway"]');
  await page.waitForTimeout(1400);
  check('cutaway activates', (await page.locator('#modeTitle').innerText()).includes('CUT'));
  check('cutaway clips body', await page.evaluate(() => window.__SHOWCASE__.car.bodyMaterial.clippingPlanes.length === 1));
  check('systems panel visible', await page.locator('#asidePanel').getAttribute('aria-hidden') === 'false');
  check('projected pins visible', await page.locator('.pin.is-on').count() >= 2);

  await page.click('.mode-btn[data-mode="systems"]');
  await page.waitForTimeout(1400);
  check('systems activates', (await page.locator('#modeTitle').innerText()).includes('SYSTEMS'));
  check('ghost shell active', await page.evaluate(() => window.__SHOWCASE__.car.bodyMaterial.transparent === true));
  check('systems pins visible', await page.locator('.pin.is-on').count() >= 2);

  await page.click('.mode-btn[data-mode="detail"]');
  await page.waitForTimeout(1400);
  check('detail activates', (await page.locator('#modeTitle').innerText()).includes('DETAIL'));
  check('detail restores solid body', await page.evaluate(() => window.__SHOWCASE__.car.bodyMaterial.transparent === false));
  check('detail clears clipping', await page.evaluate(() => window.__SHOWCASE__.car.bodyMaterial.clippingPlanes.length === 0));

  await page.click('#resetView');
  await page.waitForTimeout(250);
  check('reset gives feedback', await page.locator('#toast').evaluate((el) => el.classList.contains('is-on')));

  await page.click('#creditsBtn');
  await page.waitForTimeout(250);
  check('credits opens', await page.locator('#creditsModal').evaluate((el) => el.classList.contains('is-open')));
  await page.click('#creditsClose');
  await page.waitForTimeout(250);
  check('credits closes', await page.locator('#creditsModal').evaluate((el) => !el.classList.contains('is-open')));

  await page.keyboard.press('2');
  await page.waitForTimeout(900);
  check('keyboard mode shortcut', (await page.locator('#modeTitle').innerText()).includes('CUT'));
  await page.keyboard.press('1');
  await page.waitForTimeout(700);

  check('no page errors (desktop)', errors.length === 0, errors.join(' | '));

  const mobile = await makePage(browser, { width: 390, height: 844, dpr: 2 });
  const mobileErrors = await loadApp(mobile);
  await mobile.waitForTimeout(300);
  check('mobile has no overflow', await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('mobile modes visible', await mobile.locator('.mode-rail').isVisible());
  check('mobile action icons', await mobile.locator('.top-actions .action').count() === 3);
  await mobile.click('.mode-btn[data-mode="cutaway"]');
  await mobile.waitForTimeout(1200);
  check('mobile mode switch', (await mobile.locator('#modeTitle').innerText()).includes('CUT'));
  check('no page errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | '));
  await mobile.close();
} finally {
  await browser.close();
  stopServer(server);
}

const passed = checks.filter((c) => c.ok).length;
console.log(`\n${passed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
