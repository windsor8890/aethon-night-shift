import path from 'node:path';
import { ensureServer, stopServer, launchBrowser, makePage, loadApp, ROOT } from './harness.mjs';

const server = await ensureServer();
const browser = await launchBrowser();
const shots = [];

async function save(page, name) {
  await page.screenshot({ path: path.join(ROOT, name) });
  shots.push(name);
}

try {
  const page = await makePage(browser, { width: 1440, height: 900 });
  const errors = await loadApp(page);
  await page.waitForTimeout(500);
  await save(page, 'preview-full.png');

  for (const [mode, name] of [
    ['cutaway', 'preview-cutaway.png'],
    ['systems', 'preview-systems.png'],
    ['detail', 'preview-detail.png'],
  ]) {
    await page.click(`.mode-btn[data-mode="${mode}"]`);
    await page.waitForTimeout(1300);
    await save(page, name);
  }

  const mobile = await makePage(browser, { width: 390, height: 844, dpr: 2 });
  await loadApp(mobile);
  await mobile.waitForTimeout(300);
  await save(mobile, 'preview-mobile.png');
  await mobile.close();

  if (errors.length) console.warn('Runtime warnings/errors:', errors);
  console.log('Captured:', shots.join(', '));
} finally {
  await browser.close();
  stopServer(server);
}
