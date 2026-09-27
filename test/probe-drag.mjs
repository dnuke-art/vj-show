import puppeteer from 'puppeteer-core';
const B = process.env.BASE || 'http://localhost:8765/', room = 'dg' + Date.now().toString(36), sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new', args: ['--use-gl=angle'] });
const d = await b.newPage(); await d.goto(B + `?sync=${room}&id=1`); await sleep(2000);
const r = await b.newPage(); await r.goto(B + `?sync=${room}&mode=${process.env.MODE || 'remote'}`); await sleep(process.env.MODE === 'control' ? 7000 : 4000);
// throttle the remote's network like phone Wi-Fi
const cdp = await r.target().createCDPSession(); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 30, downloadThroughput: -1, uploadThroughput: -1 });
await d.evaluate(() => { window.__v = []; const t0 = performance.now(); setInterval(() => { const v = effParams(scenes[cur]).amount; const l = window.__v[window.__v.length - 1]; if (!l || l[1] !== v) window.__v.push([Math.round(performance.now() - t0), v]); }, 5); });
const t0 = Date.now();
for (let i = 1; i <= 60; i++) { await r.evaluate(v => { const el = document.querySelector('#psliders input[data-key=amount]'); el.value = v; el.dispatchEvent(new Event('input')); }, +(i / 60).toFixed(3)); await sleep(16); }
const dragMs = Date.now() - t0; await sleep(2500);
const v = await d.evaluate(() => window.__v);
let back = 0; for (let i = 1; i < v.length; i++) if (v[i][1] < v[i - 1][1]) back++;
const t = v.map(x => x[0]), gaps = t.slice(1).map((x, i) => x - t[i]);
console.log(`${process.env.MODE || 'remote'}: drag ${dragMs} ms, display saw ${v.length} distinct values, ${back} went backwards, final ${v[v.length - 1][1]}, max gap ${Math.max(...gaps)} ms, settled ${t[t.length - 1] - t[1]} ms after first change`);
await b.close();
