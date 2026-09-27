// Control page room-wide settings: layout (span, mirror, per-display cell, canvas, identify,
// survive reload, clear) and the stats overlay toggle.
//   node server.js 8765 &  then  CHROME=... node test/layout.test.mjs [http://localhost:8765/]
import puppeteer from 'puppeteer-core';
const B = process.argv[2] || 'http://localhost:8765/', room = 'lay' + Date.now().toString(36);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (name, got, want) => { const ok = got === want; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${got}, want ${want}`}`); };
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new', args: ['--use-gl=angle'] });
const open = async (q, w, h) => { const p = await b.newPage(); await p.setViewport({ width: w, height: h }); await p.goto(B + '?sync=' + room + q); return p; };
const a = await open('&id=a', 540, 960); await sleep(2500);
const d = await open('&id=b', 540, 960); await sleep(1500);
const c = await open('&mode=control', 1200, 900);
const tile = p => p.evaluate(() => [TILE.x, TILE.y, TILE.w, TILE.h].map(v => +v.toFixed(3)).join(',') + ' ' + canvasStr());
await sleep(5000);
check('control sees both displays with window sizes', (await c.evaluate(() => displays().map(d => d.tag + ':' + d.win))).join(' '), 'a:540,960 b:540,960');
await c.select('#lgrid', '2x1'); await c.click('#lspan'); await sleep(1500);
check('span 2x1: a left half', await tile(a), '0,0,0.5,1 9:8'); check('span 2x1: b right half', await tile(d), '0.5,0,0.5,1 9:8'); check('span 2x1: control canvas', await c.evaluate(() => canvasStr()), '9:8');
await c.click('#lmirror'); await sleep(1500);
check('mirror: a whole', await tile(a), '0,0,1,1 9:16'); check('mirror: b whole', await tile(d), '0,0,1,1 9:16');
await c.select('#lgrid', '2x1'); await c.click('#lspan'); await sleep(1000);
const sels = await c.$$('#ldisplays select'); await sels[0].select('1'); await sleep(1500);   // a -> cell 1
check('dropdown moves a to cell 2', await tile(a), '0.5,0,0.5,1 9:8');
await c.evaluate(() => { const i = document.getElementById('lcanvas'); i.value = '1:1'; i.dispatchEvent(new Event('change')); }); await sleep(1500);
check('canvas field keeps tiles, changes aspect', await tile(d), '0.5,0,0.5,1 1:1');
await c.click('#lident'); await sleep(800);
check('identify shows the tag', await a.evaluate(() => getComputedStyle(document.getElementById('ident')).display + ' ' + document.getElementById('ident').firstChild.textContent), 'flex a');
const statsShown = async () => (await Promise.all([a, d].map(p => p.evaluate(() => getComputedStyle(document.getElementById('stats')).display)))).join(',');
await c.click('#pstats'); await sleep(1500);
check('stats checkbox shows the overlay on every display', await statsShown(), 'block,block');
await c.click('#pstats'); await sleep(1500);
check('and hides it again', await statsShown(), 'none,none');
await d.reload(); await sleep(5000);
check('layout survives a display reload', await tile(d), '0.5,0,0.5,1 1:1');
await c.click('#lclear'); await sleep(1500);
check('clear returns to URL tile and scenes.json canvas', await tile(a), '0,0,1,1 9:16');
check('no error boxes', (await a.evaluate(() => document.getElementById('err').textContent)) + (await c.evaluate(() => document.getElementById('err').textContent)), '');
await b.close();
console.log(failed ? `${failed} failed` : 'all ok'); process.exit(failed ? 1 : 0);
