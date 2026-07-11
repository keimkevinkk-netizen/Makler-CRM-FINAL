// Regression test for a real bug found via live GitHub Actions CI (this
// sandbox cannot reproduce it directly: Chart.js is loaded from
// cdnjs.cloudflare.com, which is blocked here - see ADR-0002 - so
// window.Chart is always undefined locally and the buggy code path never
// executes). Two independent boot modules ("markt-tagesmonitor" priority 64
// and "marktanalyse" priority 67, both around index.html ~line 13260-13490)
// render onto the SAME canvas id (kkV10PriceLevelChart) with separate,
// non-communicating chart-instance bookkeeping (charts{} vs chartBag{}).
// The "marktanalyse" module's destroyChart() correctly checks Chart.js' own
// global registry (Chart.getChart) before creating a new chart, but
// "markt-tagesmonitor"'s destroy() only checked its OWN local dict - so if
// the OTHER module had already attached a live chart to that canvas,
// destroy() found nothing to destroy and the next `new Chart(...)` threw
// Chart.js' own "Canvas is already in use" error, an uncaught pageerror.
//
// Since the real Chart.js library can't be loaded in this sandbox, this test
// injects a minimal fake `window.Chart` (via page.addInitScript, so it is in
// place before any of the page's own scripts run) that faithfully
// reproduces Chart.js' real behaviour for this bug: throwing when a second
// chart is created on a canvas that still has a live (non-destroyed)
// instance registered, and exposing the same `Chart.getChart(el)` API the
// app code depends on.
const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) console.log('::error::FAILED CHECK: ' + name);
}

(async () => {
  try {
    const browser = await chromium.launch(LAUNCH_OPTS);
    const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
    const results = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });

    await page.addInitScript(() => {
      var registry = new Map();
      function FakeChart(el, cfg) {
        if (!el) throw new Error('FakeChart: no canvas element passed');
        if (registry.has(el) && !registry.get(el).__destroyed) {
          throw new Error("Canvas is already in use. Chart with ID '" + (registry.get(el).__id) + "' must be destroyed before the canvas with ID '" + (el.id || '?') + "' can be reused.");
        }
        this.canvas = el;
        this.config = cfg;
        this.data = cfg && cfg.data;
        this.__id = Math.random().toString(36).slice(2);
        this.__destroyed = false;
        registry.set(el, this);
      }
      FakeChart.prototype.destroy = function () { this.__destroyed = true; };
      FakeChart.prototype.update = function () {};
      FakeChart.prototype.resize = function () {};
      FakeChart.getChart = function (el) { var c = registry.get(el); return c && !c.__destroyed ? c : undefined; };
      FakeChart.instances = {};
      window.Chart = FakeChart;
    });

    await page.goto(fileUrl, { waitUntil: 'load' });
    // Both competing boot modules self-render at boot AND the "marktanalyse"
    // module additionally re-renders via setTimeout(render,300) and
    // setTimeout(render,1200) - wait past all of that before asserting.
    await page.waitForTimeout(1800);

    const canvasReuseErrors = pageErrors.filter((m) => /Canvas is already in use/i.test(m));
    check('no "Canvas is already in use" error during boot (two independent chart modules share the kkV10PriceLevelChart canvas)', canvasReuseErrors.length === 0, results);
    check('no page errors at all during boot with Chart.js present', pageErrors.length === 0, results);

    // Switching tabs re-triggers both modules' render() a second time via
    // their kk-app-tab-changed listeners - the real-world trigger path for
    // this bug once the app is already running, not just at boot.
    await page.evaluate(() => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('marktmonitor'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('heute'); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('marktmonitor'); });
    await page.waitForTimeout(500);

    const canvasReuseErrorsAfterTabSwitches = pageErrors.filter((m) => /Canvas is already in use/i.test(m));
    check('no "Canvas is already in use" error after repeated tab switches', canvasReuseErrorsAfterTabSwitches.length === 0, results);

    await browser.close();

    const failed = results.filter((r) => !r.pass);
    console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
    if (failed.length) console.log('FAILED:', failed.map((f) => f.name));
    console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
    process.exit(failed.length ? 1 : 0);
  } catch (err) {
    console.error('FATAL - test crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    process.exit(1);
  }
})();
