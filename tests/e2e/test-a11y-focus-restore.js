// Accessibility regression test: toast live-regions, dialog focus-trap on open,
// focus restored to the trigger element on close (Escape), and a global
// prefers-reduced-motion rule. Rewritten from an older ad hoc scratchpad script
// (test-phase12-a11y.js) which called window.KK_CRM_PRO.showTab('cockpit') -
// the contacts table with the Details button actually lives in the 'capture'
// tab, so the trigger button was hidden and .focus() silently no-op'd. That
// made the test flag a false "focus not restored" failure; the underlying app
// code (lastDetailTrigger + dialog 'close' listener, see index.html ~line 6690)
// works correctly once the right tab is shown - confirmed by a fresh manual
// repro before rewriting this test.
const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {};

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
}

(async () => {
  const browser = await chromium.launch(LAUNCH_OPTS);
  const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
  const results = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  const toastAttrs = await page.evaluate(() => {
    return ['kkhToast', 'kk12Toast', 'kkcrmproToast', 'kkCrmToast', 'kkFuToast'].map((id) => {
      const el = document.getElementById(id);
      return { id, role: el ? el.getAttribute('role') : null, live: el ? el.getAttribute('aria-live') : null };
    });
  });
  check('every toast container has role="status" + aria-live="polite"', toastAttrs.every((t) => t.role === 'status' && t.live === 'polite'), results);

  await page.evaluate(() => {
    window.KK_STORE.writeJSON('kk_crm_contacts', [{ id: 'c1', name: 'Fokus Test', category: 'Eigentümer', phone: '0170' }]);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  // 'capture' (not 'cockpit'/'Heute') is the tab that actually renders
  // #kkcrmproContactRows - see comment above.
  await page.evaluate(() => { window.KK_APP_SHELL.openTab('crm'); window.KK_CRM_PRO.showTab('capture'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const btn = document.querySelector('[data-contact-detail]');
    btn.id = 'kk-a11y-trigger-btn';
    btn.focus();
    btn.click();
  });
  await page.waitForTimeout(300);

  const focusInsideDialogAfterOpen = await page.evaluate(() => {
    const dlg = document.getElementById('kkcrmproContactDetailDialog');
    return dlg.contains(document.activeElement);
  });
  check('focus moves inside the contact detail dialog when opened', focusInsideDialogAfterOpen, results);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const closedByEscape = await page.evaluate(() => !document.getElementById('kkcrmproContactDetailDialog').open);
  const focusReturnedToTrigger = await page.evaluate(() => !!document.activeElement && document.activeElement.id === 'kk-a11y-trigger-btn');
  check('Escape closes the contact detail dialog', closedByEscape, results);
  check('focus returns to the trigger button after the dialog closes', focusReturnedToTrigger, results);

  const reducedMotionRuleExists = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.media && /prefers-reduced-motion/.test(rule.media.mediaText)) return true;
        }
      } catch (e) {}
    }
    return false;
  });
  check('a global prefers-reduced-motion CSS rule exists', reducedMotionRuleExists, results);

  check('no page errors', pageErrors.length === 0, results);
  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log('\n=== SUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' checks passed ===');
  if (failed.length) console.log('FAILED:', failed.map((f) => f.name));
  console.log('RESULT:', failed.length === 0 ? 'PASS' : 'FAIL');
  process.exit(failed.length ? 1 : 0);
})();
