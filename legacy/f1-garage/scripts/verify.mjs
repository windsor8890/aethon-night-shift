import { chromium } from 'playwright-core';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = path.resolve(import.meta.dirname, '..');
const shots = path.join(root, 'shots');
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto('http://127.0.0.1:4197/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.__READY__ === true, null, { timeout: 90000 });
await page.waitForTimeout(2600);

const check = async (label) => {
  const data = await page.evaluate(() => ({
    mode: window.__DEBUG__?.state?.mode,
    explode: window.__DEBUG__?.state?.explode,
    ready: window.__READY__,
    diag: window.__DIAG__,
    loaderVisible: getComputedStyle(document.getElementById('loader')).visibility,
    panelClass: document.getElementById('infoPanel')?.className,
    activeTabs: [...document.querySelectorAll('.mode-btn.is-active')].map((e) => e.dataset.mode),
    explodePressed: document.getElementById('explodeBtn')?.getAttribute('aria-pressed'),
    manifestHidden: document.getElementById('assemblyManifest')?.hidden,
    labels: [...document.querySelectorAll('.part-label.is-visible')].map((e) => e.textContent.trim().slice(0, 24)),
    bodyClass: document.body.className,
    helpHidden: document.getElementById('helpModal')?.hidden,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log(label, JSON.stringify(data));
  return data;
};

await check('INITIAL');
await page.screenshot({ path: path.join(shots, 'verify_full.png') });

// click cutaway tab
await page.click('.mode-btn[data-mode="cutaway"]');
await page.waitForTimeout(2800);
await check('CUTAWAY');
await page.screenshot({ path: path.join(shots, 'verify_cutaway.png') });

// keyboard half
await page.keyboard.press('3');
await page.waitForTimeout(3000);
await check('HALF');
await page.screenshot({ path: path.join(shots, 'verify_half.png') });

// keyboard exploded
await page.keyboard.press('4');
await page.waitForTimeout(3800);
await check('EXPLODED');
await page.screenshot({ path: path.join(shots, 'verify_exploded.png') });

// toggle back via space
await page.keyboard.press(' ');
await page.waitForTimeout(2400);
await check('RESTORED');

// help
await page.click('#helpBtn');
await page.waitForTimeout(500);
const helpVisible = await page.evaluate(() => !document.getElementById('helpModal').hidden);
console.log('HELP VISIBLE', helpVisible);
await page.screenshot({ path: path.join(shots, 'verify_help.png') });
await page.click('#helpClose');
await page.waitForTimeout(300);

// HUD hide and restore
await page.keyboard.press('h');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, 'verify_hud_off.png') });
await page.keyboard.press('h');
await page.waitForTimeout(300);

// sound toggle
await page.click('#soundBtn');
await page.waitForTimeout(500);
const soundOn = await page.evaluate(() => document.getElementById('soundBtn').classList.contains('is-on'));
console.log('SOUND ON', soundOn);
await page.click('#soundBtn');

console.log('LOGS');
console.log(logs.filter((l) => !l.includes('X4122') && !l.includes('willReadFrequently') && !l.includes('PCFSoftShadowMap')).join('\n'));

await browser.close();
