const { chromium } = require('playwright');
const path = require('path');

// Kein hartcodierter Sandbox-Pfad: in CI/lokal wird der von Playwright selbst
// verwaltete Browser genutzt; nur diese Entwicklungssandbox setzt einen
// vorinstallierten Pfad ueber PLAYWRIGHT_CHROMIUM_PATH.
const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

(async () => {
  try {
  const browser = await chromium.launch(LAUNCH_OPTS);
  const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');

  // ---------- 1) XSS regression test ----------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let alertFired = false;
    page.on('dialog', async (d) => { alertFired = true; await d.dismiss(); });
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('::error::PAGEERROR: ' + e.message + (e.stack ? ' | ' + e.stack.split('\n').slice(0, 3).join(' <- ') : '')); });
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(800);

    const payload = '<img src=x onerror="window.__xssFired=true">';
    await page.evaluate((payload) => {
      const deal = {
        id: 'test1',
        name: payload,
        town: payload,
        area: payload,
        phase: payload,
        status: 'Auftrag angeboten',
        probability: 80,
        expectedProvision: 5000,
        updatedAt: new Date().toISOString()
      };
      window.KK_STORE.setRaw('kk_pipeline_deals', JSON.stringify([deal]));
      if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab('kpis');
    }, payload);
    await page.waitForTimeout(1000);

    const xssFired = await page.evaluate(() => !!window.__xssFired);
    const tableHtml = await page.evaluate(() => {
      const el = document.getElementById('kkccDealsTable');
      return el ? el.innerHTML : null;
    });
    const regionsHtml = await page.evaluate(() => {
      const el = document.getElementById('kkccRegions');
      return el ? el.innerHTML : null;
    });

    console.log('XSS_TEST_alertFired:', alertFired);
    console.log('XSS_TEST_windowFlagFired:', xssFired);
    console.log('XSS_TEST_dealsTable_containsRawImgTag:', /<img/i.test(tableHtml || ''));
    console.log('XSS_TEST_dealsTable_containsEscaped:', /&lt;img/i.test(tableHtml || ''));
    console.log('XSS_TEST_regions_containsRawImgTag:', /<img/i.test(regionsHtml || ''));
    console.log('XSS_TEST_pageErrors:', JSON.stringify(errors));
    await context.close();
  }

  // ---------- 2) Full tab sweep, desktop + mobile, console/scroll check ----------
  const tabs = ['heute', 'marktmonitor', 'crm', 'followups', 'pipeline', 'tippgeber', 'ki-prompts', 'kpis', 'backup', 'wissen'];
  for (const viewport of [{ w: 1440, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
    const context = await browser.newContext({ viewport: { width: viewport.w, height: viewport.h } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message + (e.stack ? ' | ' + e.stack.split('\n').slice(0, 3).join(' <- ') : '')); });
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1000);

    for (const tab of tabs) {
      await page.evaluate((t) => { if (window.KK_APP_SHELL) window.KK_APP_SHELL.setActiveTab(t); }, tab);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth
      }));
      const hOverflow = overflow.scrollWidth > overflow.clientWidth + 2;
      console.log(`[${viewport.tag}] tab=${tab} scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} horizontalOverflow=${hOverflow}`);
      if (viewport.tag === 'desktop' && (tab === 'heute')) {
        // capture nav to confirm "Archiv: Wissen" is now visible
        const navLabels = await page.evaluate(() => Array.from(document.querySelectorAll('nav.topnav [data-app-tab]')).map(a => a.textContent.trim()));
        console.log('NAV_LABELS:', JSON.stringify(navLabels));
      }
    }

    // Best-effort diagnostic screenshot only - written under the OS temp dir so
    // this works on any machine/CI runner, not just this development sandbox.
    // Never allowed to fail the whole regression run.
    try {
      await page.screenshot({ path: path.join(require('os').tmpdir(), `verify-${viewport.tag}-final.png`), fullPage: false });
    } catch (e) { console.log(`[${viewport.tag}] screenshot skipped:`, e.message); }

    const realErrors = consoleErrors.filter(e => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_RESET|Failed to load resource/i.test(e));
    console.log(`[${viewport.tag}] pageErrors:`, JSON.stringify(pageErrors));
    console.log(`[${viewport.tag}] consoleErrors(filtered):`, JSON.stringify(realErrors));
    await context.close();
  }

  await browser.close();
  } catch (err) {
    console.error('FATAL - verify.js crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    process.exit(1);
  }
})();
