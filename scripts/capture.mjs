import path from 'node:path';
import { ensureServer, stopServer, launchBrowser, makePage, loadApp, ROOT } from './harness.mjs';

const server = await ensureServer();
const browser = await launchBrowser();
const shots = [];

try {
  const page = await makePage(browser, { width: 1440, height: 900 });
  const errors = await loadApp(page);
  await page.waitForTimeout(800);

  const save = async (name) => {
    const file = path.join(ROOT, name);
    await page.screenshot({ path: file });
    shots.push(name);
  };

  await save('preview-landing.png');

  const still = async (time, name) => {
    await page.evaluate((t) => {
      const app = window.__APP__;
      app.seekFilm(t);
      document.getElementById('chapterCard')?.classList.remove('is-visible');
      document.getElementById('cinemaTitle')?.classList.remove('is-visible');
    }, time);
    await page.waitForTimeout(1500);
    await save(name);
  };

  await still(14.8, 'preview-pit-exit.png');
  await still(24.6, 'preview-track-speed.png');
  await still(28.2, 'preview-approach.png');
  await still(31.6, 'preview-escape.png');

  await page.evaluate(() => window.__APP__.skipFilm());
  await page.waitForTimeout(1800);
  await save('preview-end.png');

  const mobile = await makePage(browser, { width: 390, height: 844, dpr: 2 });
  await loadApp(mobile);
  await mobile.waitForTimeout(1100);
  await mobile.screenshot({ path: path.join(ROOT, 'preview-mobile.png') });
  shots.push('preview-mobile.png');
  await mobile.close();

  if (errors.length) {
    console.warn('Runtime warnings/errors:', errors);
  }
  console.log('Captured:', shots.join(', '));
} finally {
  await browser.close();
  stopServer(server);
}
