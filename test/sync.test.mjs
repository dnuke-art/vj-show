// Smoke test for the sync layer: three headless Chrome pages against a running server.
//   node server.js 8765 &  then  node test/sync.test.mjs [http://localhost:8765]
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:8765';
const EXTRA = process.env.EXTRA || '';   // e.g. EXTRA='&peerserver=public'
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };
async function until(fn, timeoutMs, label){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { try { const v = await fn(); if (v) return v; } catch(e){} await sleep(200); }
  throw new Error('timeout: ' + label);
}
const state = page => page.evaluate(() => ({
  myId, leaderId, isLeader: isLeader(), serverKind, hasLeaderConn: !!leaderConn, followers: [...followers.keys()],
  tiles: tileTags(), scene: scenes[cur] && scenes[cur].name, nxt, overrides, clockOffset, targetOffset, syncRtt,
  err: document.getElementById('err').textContent, status: document.getElementById('pstatus') && document.getElementById('pstatus').textContent,
}));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const open = async (q, name) => { const p = await browser.newPage(); p.on('pageerror', e => console.log(`[${name} pageerror]`, e.message)); p.on('console', m => { if (m.type() === 'error') console.log(`[${name} console.error]`, m.text()); }); await p.goto(`${BASE}/${q}${EXTRA}`); return p; };
try {
  const room = 'test' + Math.random().toString(36).slice(2, 6);
  const a = await open(`?sync=${room}&id=a&grid=2,1&tile=0,0`, 'a');
  const b = await open(`?sync=${room}&id=b&grid=2,1&tile=1,0`, 'b');
  const c = await open(`?sync=${room}&id=c&mode=control`, 'c');

  await until(async () => (await state(a)).isLeader && (await state(a)).followers.length === 2, 20000, 'a leads with 2 followers');
  const sa = await state(a), sb = await state(b), sc = await state(c);
  check('a is leader', sa.isLeader, `via ${sa.serverKind}`);
  check('b follows a', !sb.isLeader && sb.hasLeaderConn && sb.leaderId === sa.myId);
  check('c follows a (control never leads)', !sc.isLeader && sc.hasLeaderConn);
  check('tiles list is a,b everywhere', JSON.stringify(sa.tiles) === '["a","b"]' && JSON.stringify(sc.tiles) === '["a","b"]', JSON.stringify(sc.tiles));

  const t0 = Date.now();
  const sb2 = await until(async () => { const s = await state(b); return s.targetOffset !== null && Math.abs(s.clockOffset - s.targetOffset) < 0.01 && s; }, 15000, 'b clock converges');
  check('b clock converged', true, `in ${((Date.now() - t0)/1000).toFixed(1)}s, offset ${(sb2.clockOffset*1000).toFixed(1)}ms rtt ${(sb2.syncRtt*1000).toFixed(1)}ms`);

  await c.evaluate(() => setParam(scenes[cur].name, 'distance', 4.2));
  await sleep(600);
  const oa = (await state(a)).overrides, ob = (await state(b)).overrides;
  check('slider override reached a and b', JSON.stringify(oa) === JSON.stringify(ob) && Object.values(oa)[0] && Object.values(oa)[0].distance === 4.2, JSON.stringify(ob));

  await c.evaluate(() => jumpTo('rings'));
  await until(async () => (await state(b)).scene === 'rings' && (await state(b)).nxt < 0, 15000, 'jump to rings reaches b');
  check('play-now jumped a and b to rings', (await state(a)).scene === 'rings' && (await state(b)).scene === 'rings');

  // failover: kill the leader
  const tKill = Date.now();
  await a.close();
  await until(async () => (await state(b)).isLeader, 30000, 'b takes over');
  console.log(`     failover took ${((Date.now() - tKill)/1000).toFixed(1)}s`);
  await until(async () => { const s = await state(c); return s.hasLeaderConn && !s.isLeader; }, 20000, 'c reattaches to b');
  const sb3 = await state(b), sc3 = await state(c);
  check('b became leader after a died', sb3.isLeader);
  check('c re-attached to b', sc3.hasLeaderConn && sc3.leaderId === sb3.myId);
  check('overrides survived failover', JSON.stringify(sb3.overrides) === JSON.stringify(ob));
  check('scene survived failover', sb3.scene === 'rings');
  check('no error boxes', !sb3.err && !sc3.err, sb3.err || sc3.err);
  console.log('control status:', sc3.status.split('\n')[0]);
} catch (e) { console.log('FAIL', e.message); failed++; }
finally { await browser.close(); }
process.exit(failed ? 1 : 0);
