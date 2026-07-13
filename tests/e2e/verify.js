const { chromium } = require('playwright');
const path = require('path');

// Kein hartcodierter Sandbox-Pfad: in CI/lokal wird der von Playwright selbst
// verwaltete Browser genutzt; nur diese Entwicklungssandbox setzt einen
// vorinstallierten Pfad ueber PLAYWRIGHT_CHROMIUM_PATH.
const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

(async () => {
  const failures = [];

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
      await page.evaluate((payloadValue) => {
        const deal = {
          id: 'test1',
          name: payloadValue,
          town: payloadValue,
          area: payloadValue,
          phase: payloadValue,
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

      const tableContainsRawImg = /<img/i.test(tableHtml || '');
      const tableContainsEscaped = /&lt;img/i.test(tableHtml || '');
      const regionsContainRawImg = /<img/i.test(regionsHtml || '');

      console.log('XSS_TEST_alertFired:', alertFired);
      console.log('XSS_TEST_windowFlagFired:', xssFired);
      console.log('XSS_TEST_dealsTable_containsRawImgTag:', tableContainsRawImg);
      console.log('XSS_TEST_dealsTable_containsEscaped:', tableContainsEscaped);
      console.log('XSS_TEST_regions_containsRawImgTag:', regionsContainRawImg);
      console.log('XSS_TEST_pageErrors:', JSON.stringify(errors));

      if (alertFired) failures.push('XSS regression: a browser dialog was triggered by the payload.');
      if (xssFired) failures.push('XSS regression: the injected onerror handler executed.');
      if (tableContainsRawImg) failures.push('XSS regression: raw <img> markup reached the deals table.');
      if (regionsContainRawImg) failures.push('XSS regression: raw <img> markup reached the regions output.');
      if (errors.length) failures.push('XSS regression page errors: ' + errors.join(' | '));

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

      const hasAppShell = await page.evaluate(() => !!(window.KK_APP_SHELL && typeof window.KK_APP_SHELL.setActiveTab === 'function'));
      if (!hasAppShell) failures.push(`[${viewport.tag}] KK_APP_SHELL.setActiveTab is unavailable.`);

      for (const tab of tabs) {
        await page.evaluate((tabName) => {
          if (window.KK_APP_SHELL && typeof window.KK_APP_SHELL.setActiveTab === 'function') {
            window.KK_APP_SHELL.setActiveTab(tabName);
          }
        }, tab);
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth
        }));
        const hOverflow = overflow.scrollWidth > overflow.clientWidth + 3;
        console.log(`[${viewport.tag}] tab=${tab} scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} horizontalOverflow=${hOverflow}`);
        if (hOverflow) {
          failures.push(`[${viewport.tag}] horizontal overflow in tab ${tab}: ${overflow.scrollWidth}px > ${overflow.clientWidth}px.`);
        }
        if (viewport.tag === 'desktop' && tab === 'heute') {
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

      if (pageErrors.length) failures.push(`[${viewport.tag}] page errors: ${pageErrors.join(' | ')}`);
      if (realErrors.length) failures.push(`[${viewport.tag}] console errors: ${realErrors.join(' | ')}`);

      await context.close();
    }

    await browser.close();

    if (failures.length) {
      console.error(`FATAL - verify.js found ${failures.length} regression(s):`);
      failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
      process.exit(1);
    }

    console.log('PASS - verify.js found no XSS, page-error, console-error or horizontal-overflow regression.');
  } catch (err) {
    console.error('FATAL - verify.js crashed:', err && err.stack || err);
    console.log('::error::FATAL: ' + String(err && err.message || err));
    process.exit(1);
  }
})();
