// Сборка презентации: node docs/presentation/build.mjs
// slides.html -> MVR-Education-Platform.pdf (16:9, 1920x1080, шрифты встраиваются) + превью слайдов в preview/
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', '..', 'package.json'));
const { chromium } = require('@playwright/test');

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(HERE, 'slides.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));

// Превью каждого слайда (для проверки)
const prev = path.join(HERE, 'preview');
fs.mkdirSync(prev, { recursive: true });
const slides = await page.$$('.slide');
for (const [i, s] of slides.entries()) await s.screenshot({ path: path.join(prev, `slide-${String(i + 1).padStart(2, '0')}.png`) });

await page.pdf({ path: path.join(HERE, 'MVR-Education-Platform.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('ok:', slides.length, 'слайдов');
