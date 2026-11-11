import { chromium } from 'playwright-core';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = path.resolve(import.meta.dirname, '..');
await mkdir(root, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto('http://127.0.0.1:4197/?shot=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 90000 });
await page.waitForTimeout(3200);

const clean = async () => {
  await page.evaluate(() => {
    document.getElementById('toast')?.classList.remove('is-visible');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
};

async function capture(name) {
  await clean();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, name) });
  console.log('captured', name);
}

await capture('preview-full.png');

await page.evaluate(() => window.__DEBUG__.setMode('cutaway'));
await page.waitForTimeout(3000);
await capture('preview-cutaway.png');

await page.evaluate(() => window.__DEBUG__.setMode('half'));
await page.waitForTimeout(3000);
await capture('preview-half.png');

await page.evaluate(() => window.__DEBUG__.setMode('exploded'));
await page.waitForTimeout(4200);
await capture('preview-exploded.png');
await page.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
mobile.on('pageerror', (e) => console.error('MOBILE PAGE ERROR', e.message));
await mobile.goto('http://127.0.0.1:4197/?shot=1', { waitUntil: 'domcontentloaded' });
await mobile.waitForFunction(() => window.__READY__ === true, null, { timeout: 90000 });
await mobile.waitForTimeout(3200);
await mobile.evaluate(() => {
  document.getElementById('toast')?.classList.remove('is-visible');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
});
await mobile.screenshot({ path: path.join(root, 'preview-mobile.png') });
console.log('captured preview-mobile.png');
await mobile.close();

await browser.close();
