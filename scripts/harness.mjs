import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const PORT = Number(process.env.PORT || 4199);
export const APP_URL = `http://127.0.0.1:${PORT}`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('Chrome not found. Set CHROME_PATH to a Chromium/Chrome executable.');
}

async function serverUp() {
  try {
    const res = await fetch(`${APP_URL}/`, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureServer() {
  if (await serverUp()) return { proc: null, url: APP_URL };
  const proc = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    windowsHide: true,
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await serverUp()) return { proc, url: APP_URL };
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error(`Preview server did not start on ${APP_URL}`);
}

export function stopServer(handle) {
  if (handle?.proc) handle.proc.kill();
}

export async function launchBrowser() {
  const args = ['--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'];
  if (process.platform === 'win32') args.push('--use-angle=d3d11');
  return chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args,
  });
}

export async function loadApp(page, { timeout = 180000 } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__READY__ === true, null, { timeout });
  await page.waitForTimeout(1700);
  return errors;
}

export async function makePage(browser, { width = 1440, height = 900, dpr = 1 } = {}) {
  return browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
}
