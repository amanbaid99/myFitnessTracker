/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const folder = 'docs/ui-evidence/progress-dashboard';
const dir = 'app/demo/tmp-progress-dashboard';
assert(!fs.existsSync(dir));
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(`${dir}/page.tsx`, `import Preview from '@/scripts/feedback-browser/fixtures/progress-dashboard'; export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const p=await searchParams;return <Preview state={p.state} units={p.units==='lb'?'lb':'kg'}/>;}`);
process.on('exit', () => { fs.unlinkSync(`${dir}/page.tsx`); fs.rmdirSync(dir); });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' });
  await context.addCookies([{ name: 'wt-theme', value: 'beige.orange', domain: 'localhost', path: '/' }]);
  const page = await context.newPage(), errors = [];
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-05T12:00:00Z'));
  async function visit(state = 'ready', extra = '') {
    const response = await page.goto(`http://localhost:3004/demo/tmp-progress-dashboard?state=${state}${extra}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: 'Your trends', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Explore training volume', exact: true }).waitFor();
  }
  async function shot(name, width = 390) {
    await page.setViewportSize({ width, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow: ${name} at ${width}`);
    await page.screenshot({ path: `${folder}/after-${name}-${width}.png`, fullPage: true, timeout: 45000 });
  }
  async function back() {
    await page.getByRole('link', { name: 'Progress overview', exact: true }).click();
    await page.getByRole('heading', { name: 'Your trends', exact: true }).waitFor();
  }
  await visit();
  assert.equal(await page.getByRole('tablist').count(), 0);
  assert.equal(await page.getByRole('textbox').count(), 0);
  assert.equal(await page.getByRole('combobox').count(), 1);
  assert.equal(await page.locator('main svg[role="img"]').count(), 4);
  for (const width of [320, 390, 430]) await shot('overview', width);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Chart period' }).selectOption('4');
  assert.match(page.url(), /range=4/);
  assert.equal(await page.getByRole('img', { name: /^Weekly training volume/ }).locator('rect').count(), 4);
  const volumeLink = page.getByRole('link', { name: 'Explore training volume', exact: true });
  await volumeLink.focus(); await page.keyboard.press('Enter');
  await page.getByRole('combobox', { name: 'Report breakdown' }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Chart period' }).inputValue(), '4');
  await shot('volume');
  await page.goBack();
  await page.getByRole('heading', { name: 'Your trends', exact: true }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Chart period' }).inputValue(), '4');
  await page.getByRole('link', { name: 'Explore strength', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lift featured on your overview' }).selectOption('sample-2');
  await page.getByRole('textbox', { name: 'Search exercises' }).fill('Bench');
  await page.getByRole('combobox', { name: 'Sort exercises' }).selectOption('name');
  await page.getByRole('tab', { name: 'Muscles', exact: true }).click();
  await page.getByRole('heading', { name: 'Weekly muscle sets' }).waitFor();
  await shot('muscles');
  await page.getByRole('tab', { name: 'Strength', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Search exercises' }).inputValue(), 'Bench');
  assert.equal(await page.getByRole('combobox', { name: 'Sort exercises' }).inputValue(), 'name');
  await shot('strength');
  await back();
  await page.getByRole('link', { name: 'Explore strength', exact: true }).getByText(/Lat Pulldown/).waitFor();
  await page.reload();
  await page.getByRole('link', { name: 'Explore strength', exact: true }).getByText(/Lat Pulldown/).waitFor();
  await page.getByRole('link', { name: 'Explore body weight', exact: true }).click();
  await page.getByRole('heading', { name: 'Recorded readings' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Add a check-in' }).getAttribute('href'), '/demo/measurements');
  await shot('weight');
  await back();
  await page.getByRole('link', { name: 'Explore consistency', exact: true }).click();
  await page.getByText('Set this week\'s target', { exact: true }).waitFor();
  await shot('consistency');
  await back();
  for (const state of ['empty', 'single', 'unavailable', 'weight-error', 'partial']) {
    await visit(state);
    await shot(state);
    if (state === 'single') {
      await page.getByText('One session in this period. More sessions show a trend.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('img', { name: /^Barbell Bench Press/ }).locator('circle').count(), 1);
    }
    if (state === 'unavailable') {
      assert.equal(await page.getByRole('img', { name: /^Weekly training volume/ }).count(), 0);
      await page.getByRole('img', { name: /^Recorded body weight/ }).waitFor();
    }
    if (state === 'partial') {
      await page.getByText('No readings in this period', { exact: true }).waitFor();
      await page.getByText('1 workout', { exact: true }).waitFor();
    }
  }
  await visit('long', '&units=lb');
  await page.evaluate(() => { localStorage.removeItem('repd.progress.lift.v1:demo'); window.dispatchEvent(new Event('repd-featured-lift')); });
  await page.getByRole('link', { name: 'Explore strength', exact: true }).getByText(/exceptionally long custom exercise name/).waitFor();
  for (const width of [320, 390, 430]) await shot('long-lb', width);
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  await shot('large-text', 320);
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  for (const base of ['dark', 'light', 'beige']) {
    await page.evaluate(base => { document.documentElement.dataset.base = base; document.documentElement.classList.toggle('dark', base === 'dark'); document.documentElement.style.colorScheme = base === 'dark' ? 'dark' : 'light'; }, base);
    await shot(`theme-${base}`);
  }
  // A failed filtered RPC keeps the last report and its selected scope.
  await visit('write');
  await page.getByRole('link', { name: 'Explore training volume', exact: true }).click();
  let release;
  await page.route('**/rest/v1/rpc/training_weekly_report', async route => {
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic failure' }) });
  });
  await page.getByRole('combobox', { name: 'Report breakdown' }).selectOption('exercise:sample-0');
  await page.getByText('Loading report…', { exact: true }).waitFor();
  await shot('pending-report');
  release();
  await page.getByText('Could not load the selected report. Showing the previous report. Try again.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Report breakdown' }).inputValue(), 'all');
  await shot('failed-report');
  await page.unroute('**/rest/v1/rpc/training_weekly_report');
  await context.setOffline(true);
  await page.getByRole('combobox', { name: 'Report breakdown' }).selectOption('exercise:sample-0');
  await page.getByText('Could not load the selected report. Showing the previous report. Try again.', { exact: true }).waitFor();
  await shot('offline-report');
  await back();
  await page.getByRole('link', { name: 'Explore body weight', exact: true }).click();
  await page.getByRole('heading', { name: 'Recorded readings' }).waitFor();
  await shot('offline-weight');
  await context.setOffline(false);
  // Confirm real public sample destinations, including the optional check-in flow.
  await page.goto('http://localhost:3004/demo/progress');
  await page.getByRole('link', { name: 'Explore body weight', exact: true }).click();
  await page.getByRole('link', { name: 'Add a check-in', exact: true }).click();
  await page.getByRole('heading', { name: 'Measurements', exact: true }).waitFor();
  await shot('demo-check-in');
  for (const view of ['volume', 'strength', 'muscles', 'consistency', 'weight']) {
    await page.goto(`http://localhost:3004/demo/progress?view=${view}&range=4`);
    await page.getByRole('link', { name: 'Progress overview', exact: true }).waitFor();
    if (view === 'volume') await page.getByRole('combobox', { name: 'Report breakdown' }).waitFor();
    else if (view === 'weight') await page.getByRole('heading', { name: 'Recorded readings' }).waitFor();
    else await page.getByRole('tab', { name: view === 'strength' ? 'Strength' : view === 'muscles' ? 'Muscles' : 'Consistency', exact: true }).waitFor();
    for (const width of [320, 430]) await shot(`detail-${view}`, width);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS progress overview: charts, units, period, deep links/back, saved lift, preserved detail filters, empty/single/error/pending/offline, long text, themes and public sample check-in');
})().catch(error => { console.error(error); process.exit(1); });
