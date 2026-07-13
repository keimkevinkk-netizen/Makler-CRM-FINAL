// Acceptance test for the "Sales Execution Core V1" order (PDF "Keim CRM Pro -
// Sales Operating System und Implementierungsauftrag", Teil II). Proves the
// concrete acceptance criteria from PDF §8/§9: a deterministic, explainable
// Next-Best-Action engine over EXISTING canonical data (kk_crm_contacts,
// kk_followups, kk_commitments_v1, kk_sales_pipeline), contact-policy
// exclusion, and a guided call workflow (prep -> outcome -> exactly one new
// activity + at most one follow-up/commitment). See docs/adr/ADR-0008 and
// docs/releases/phase27-* for the full design rationale.
const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

function check(name, cond, results) {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) console.log('::error::FAILED CHECK: ' + name);
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

(async () => {
  try {
    const browser = await chromium.launch(LAUNCH_OPTS);
    const fileUrl = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
    const results = [];

    // ---------- Fixture data (seeded BEFORE navigation, so KK_BOOT sees it at boot) ----------
    const seed = async (page) => {
      await page.addInitScript(({ overdueDue, futureDue, callbackDue }) => {
        localStorage.setItem('kk_crm_contacts', JSON.stringify([
          { id: 'ctA', name: 'Herr Overdue', phone: '069111', category: 'Eigentümer', status: 'Neu', area: 'Bruchköbel', lastContact: '', createdAt: new Date().toISOString() },
          { id: 'ctB', name: 'Frau Callback', phone: '069222', category: 'Eigentümer', status: 'Neu', area: 'Bruchköbel', lastContact: '', createdAt: new Date().toISOString() },
          { id: 'ctBlocked', name: 'Herr Gesperrt', phone: '069333', category: 'Eigentümer', status: 'Neu', area: 'Bruchköbel', contactPolicy: { doNotContact: true }, createdAt: new Date().toISOString() }
        ]));
        localStorage.setItem('kk_commitments_v1', JSON.stringify([
          { id: 'commit1', contact: 'Herr Overdue', text: 'Marktbericht senden', due: overdueDue, status: 'offen', createdAt: new Date().toISOString() },
          { id: 'commit2', contact: 'Herr Gesperrt', text: 'Sollte nie erscheinen', due: overdueDue, status: 'offen', createdAt: new Date().toISOString() }
        ]));
        localStorage.setItem('kk_followups', JSON.stringify([
          { id: 'fu1', name: 'Frau Callback', channel: 'Telefon', dueDate: callbackDue, date: callbackDue, status: 'offen', goal: 'Rückruf wie vereinbart', type: 'Nachfassgespräch', createdAt: new Date().toISOString() }
        ]));
        localStorage.setItem('kk_sales_pipeline', JSON.stringify([]));
        localStorage.setItem('kk_entity_link_queue_v1', JSON.stringify([]));
        localStorage.setItem('kk_action_feedback_v1', JSON.stringify([]));
        localStorage.setItem('kk_sales_events_v1', JSON.stringify([]));
      }, { overdueDue: isoDaysAgo(2), futureDue: isoDaysFromNow(5), callbackDue: isoDaysAgo(1) });
    };

    // ==================== Run 1: Engine correctness ====================
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });
    page.on('dialog', async (dialog) => { await dialog.accept(); });
    await seed(page);
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.KK_SALES_CORE && window.KK_APP_SHELL), null, { timeout: 15000 });

    // --- A: module loaded, deterministic recommendations from real data ---
    const recs1 = await page.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    const recs2 = await page.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    check('A: computeRecommendations() liefert ein Array aus echten Daten', Array.isArray(recs1) && recs1.length > 0, results);
    check('A: identische Daten erzeugen identische Reihenfolge (Determinismus, Akzeptanzkriterium 6/11)', JSON.stringify(recs1.map(r => r.id)) === JSON.stringify(recs2.map(r => r.id)), results);

    // --- B: überfällige Zusage hat höchste Priorität (Regel 1) ---
    const commitmentRec = recs1.find(r => r.ruleId === 'commitment_overdue');
    check('B: überfällige Zusage wird als Empfehlung erkannt (ruleId commitment_overdue)', !!commitmentRec, results);
    check('B: überfällige Zusage hat priorityBand 1 (höchste Prioritätsstufe)', !!commitmentRec && commitmentRec.priorityBand === 1, results);
    check('B: überfällige Zusage steht in der Reihenfolge vor dem reinen Rückruf (Regel 1 vor Regel 2)', recs1.findIndex(r => r.ruleId === 'commitment_overdue') < recs1.findIndex(r => r.ruleId === 'callback_due'), results);
    check('B: jede Empfehlung hat eine sichtbare Begründung (whyNow, kein reiner Score)', !!commitmentRec && typeof commitmentRec.whyNow === 'string' && commitmentRec.whyNow.length > 10, results);
    check('B: keine Empfehlung enthält ein numerisches Score-/Wahrscheinlichkeitsfeld', !recs1.some(r => 'score' in r || 'probability' in r), results);

    // --- C: vereinbarter Rückruf wird erkannt (Regel 2) ---
    const callbackRec = recs1.find(r => r.ruleId === 'callback_due');
    check('C: vereinbarter Rückruf (Follow-up, Kanal Telefon, fällig) wird erkannt', !!callbackRec, results);

    // --- D: gesperrter Kontakt (doNotContact) wird NIEMALS empfohlen ---
    const blockedAppears = recs1.some(r => r.entityReferences && r.entityReferences.contactName === 'Herr Gesperrt');
    check('D: Kontakt mit contactPolicy.doNotContact=true erscheint in KEINER Empfehlung (Akzeptanzkriterium 4)', !blockedAppears, results);

    // --- E: jede Empfehlung referenziert per ID auf existierende Kontakte (wo auflösbar) ---
    check('E: aufgelöste Empfehlungen referenzieren einen echten contactId (nicht nur Freitext)', commitmentRec.entityReferences.contactId === 'ctA', results);

    // --- F: ehrlicher Leerzustand ---
    await page.evaluate(() => {
      localStorage.setItem('kk_crm_contacts', '[]');
      localStorage.setItem('kk_commitments_v1', '[]');
      localStorage.setItem('kk_followups', '[]');
      localStorage.setItem('kk_sales_pipeline', '[]');
      localStorage.setItem('kk_action_feedback_v1', '[]');
    });
    const emptyRecs = await page.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    check('F: ohne Daten liefert die Engine ein leeres Array (ehrlicher Leerzustand, kein Fake-Eintrag)', Array.isArray(emptyRecs) && emptyRecs.length === 0, results);
    await page.evaluate(() => { if (window.KK_SALES_CORE.renderCommandCenter) window.KK_SALES_CORE.renderCommandCenter(); });
    const emptyUi = await page.evaluate(() => {
      const el = document.getElementById('kksecEmpty');
      return el ? !el.hidden : false;
    });
    check('F: Daily Command Center zeigt bei leerer Queue den Leerzustand-Hinweis (kein neuer Haupt-Tab, direkt in Heute)', emptyUi, results);
    await browser.close();

    // ==================== Run 2: Daily Command Center UI + guided call workflow ====================
    const browser2 = await chromium.launch(LAUNCH_OPTS);
    const pageErrors2 = [];
    const p2 = await browser2.newPage({ viewport: { width: 1440, height: 1000 } });
    p2.on('pageerror', (e) => { pageErrors2.push(e.message); console.log('::error::PAGEERROR: ' + e.message); });
    p2.on('dialog', async (dialog) => { await dialog.accept(); });
    await seed(p2);
    await p2.goto(fileUrl, { waitUntil: 'load' });
    await p2.waitForFunction(() => !!(window.KK_SALES_CORE && window.KK_APP_SHELL), null, { timeout: 15000 });
    await p2.evaluate(() => { window.KK_APP_SHELL.setActiveTab('heute'); });

    // --- G: Daily Command Center ist Teil des Heute-Panels (kein neuer Haupt-Tab) ---
    const ccInHeute = await p2.evaluate(() => {
      const cc = document.getElementById('kkSalesCoreCC');
      const heutePanel = document.getElementById('kk-app-panel-heute');
      return !!(cc && heutePanel && heutePanel.contains(cc));
    });
    check('G: Command Center liegt im bestehenden Heute-Panel, kein neuer Haupt-Tab (Akzeptanzkriterium 19)', ccInHeute, results);
    const tabCount = await p2.evaluate(() => window.KK_APP_SHELL.tabs.length);
    check('G: Anzahl Haupttabs unverändert bei 11 (kein neuer Tab durch Sales Execution Core hinzugefügt)', tabCount === 11, results);

    // --- H: Anruf starten -> Vorbereitung zeigt echte Fakten ---
    const recsForCall = await p2.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    const overdueRecId = recsForCall.find(r => r.ruleId === 'commitment_overdue').id;
    await p2.evaluate((id) => { window.KK_SALES_CORE.startCallFor(id); }, overdueRecId);
    await p2.waitForSelector('#kkSalesCoreCallDialog[open]', { timeout: 8000 });
    const prep = await p2.evaluate(() => ({
      why: document.getElementById('kksecPrepWhy').textContent,
      minCommit: document.getElementById('kksecPrepMinCommit').textContent,
      hasObjections: document.getElementById('kksecPrepObjections').children.length > 0
    }));
    check('H: Vorbereitungsansicht zeigt "Warum jetzt" aus echten Daten', prep.why.indexOf('Marktbericht senden') > -1, results);
    check('H: Vorbereitungsansicht zeigt minimalen nächsten Schritt', prep.minCommit.length > 5, results);
    check('H: Vorbereitungsansicht zeigt mögliche Einwände (Einwandhilfe)', prep.hasObjections, results);

    // --- I: Gespräch durchführen -> Nachbereitung -> genau eine Aktivität + höchstens ein Follow-up/Commitment ---
    // Buttons inside the native <dialog> are clicked via evaluate(el.click()) rather than
    // Playwright's pointer-based page.click() - the same pattern already used for
    // #kkCentralEditorClose in test-central-object-editor-single-form.js. Real pointer
    // clicks intermittently miss here because the dialog's sticky footer (.kksc-actions)
    // shifts position when setPhase() toggles a much taller/shorter sibling phase's
    // display, so the hit-test coordinates Playwright computed just before the click
    // can be stale by the time the OS-level click actually lands.
    await p2.evaluate(() => document.getElementById('kksecPrepTelLink').click());
    await p2.waitForSelector('.kksc-phase[data-phase="incall"].is-active', { timeout: 8000 });
    await p2.evaluate(() => document.getElementById('kksecCallEndBtn').click());
    await p2.waitForSelector('.kksc-phase[data-phase="postcall"].is-active');
    await p2.evaluate(() => document.querySelector('#kksecOutcomeReached button[data-val="ja"]').click());
    await p2.fill('#kksecOutcomeNextStep', 'Marktbericht nachträglich versendet, in 2 Wochen erneut anrufen');
    const followDate = isoDaysFromNow(14);
    await p2.fill('#kksecOutcomeDate', followDate);
    await p2.evaluate(() => document.getElementById('kksecPostcallSaveBtn').click());
    await p2.waitForSelector('.kksc-phase[data-phase="done"].is-active');

    const afterSave = await p2.evaluate(() => ({
      activities: JSON.parse(localStorage.getItem('kk_crm_activities') || '[]'),
      followups: JSON.parse(localStorage.getItem('kk_followups') || '[]'),
      feedback: JSON.parse(localStorage.getItem('kk_action_feedback_v1') || '[]'),
      commitments: JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]')
    }));
    check('I: nach dem Speichern existiert genau eine neue Aktivität (Akzeptanzkriterium 9)', afterSave.activities.length === 1, results);
    check('I: die neue Aktivität referenziert den echten contactId', afterSave.activities[0].contactId === 'ctA', results);
    check('I: bei vereinbartem nächsten Schritt entsteht genau ein neues Follow-up (Akzeptanzkriterium 10)', afterSave.followups.filter(f => f.source === 'sales-execution-core').length === 1, results);
    check('I: die ursprüngliche Zusage wird als erfüllt markiert (kein Duplikat, dieselbe Zusage aktualisiert)', afterSave.commitments.find(c => c.id === 'commit1').status === 'erfuellt', results);
    check('I: die Empfehlung wird als ausgeführt vermerkt (Empfehlungskontrolle)', afterSave.feedback.some(f => f.recommendationId === overdueRecId && f.decision === 'executed'), results);

    // --- J: erneutes Speichern derselben Empfehlung erzeugt KEIN Duplikat (Empfehlung ist danach nicht mehr in der Queue) ---
    const recsAfter = await p2.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    check('J: erledigte Empfehlung verschwindet aus der aktiven Queue (Akzeptanzkriterium 14)', !recsAfter.some(r => r.id === overdueRecId), results);

    // --- K: Zurückstellen mit Begründung/neuem Datum ---
    const beforeSnooze = await p2.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    const toSnooze = beforeSnooze[0];
    if (toSnooze) {
      await p2.evaluate((id) => { window.KK_SALES_CORE.startCallFor(id); }, toSnooze.id);
      await p2.waitForSelector('#kkSalesCoreCallDialog[open]', { timeout: 8000 });
      await p2.evaluate(() => document.getElementById('kksecSnoozeBtn').click());
      const afterSnoozeFeedback = await p2.evaluate(() => JSON.parse(localStorage.getItem('kk_action_feedback_v1') || '[]'));
      const snoozeEntry = afterSnoozeFeedback.find(f => f.recommendationId === toSnooze.id);
      check('K: Zurückstellen speichert ein neues Datum (snoozedUntil), Akzeptanzkriterium 13', !!(snoozeEntry && snoozeEntry.snoozedUntil), results);
    } else {
      check('K: Zurückstellen speichert ein neues Datum (snoozedUntil), Akzeptanzkriterium 13', false, results);
    }

    // --- L: Vertriebsereignis-Log ist append-only und enthält die durchgeführten Ereignisse ---
    const eventLog = await p2.evaluate(() => window.KK_SALES_CORE.getEventLog());
    check('L: Vertriebsereignis-Log enthält call_started/call_reached/followup_created', ['call_started', 'call_reached', 'followup_created'].every(t => eventLog.some(e => e.type === t)), results);

    // --- M: Mobile 390px, kein horizontaler Overflow, Touch-Ziele erreichbar ---
    await p2.setViewportSize({ width: 390, height: 844 });
    await p2.evaluate(() => { window.KK_APP_SHELL.setActiveTab('heute'); });
    await p2.waitForTimeout(150);
    const overflow = await p2.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 3);
    check('M: kein horizontaler Overflow bei 390px (Heute-Tab mit Command Center)', overflow, results);
    const startBtnBox = await p2.evaluate(() => {
      const el = document.getElementById('kksecStartSeriesBtn');
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    check('M: "Anrufserie starten"-Button ist auf Mobile ein erreichbares Touch-Ziel (>=44px Höhe)', startBtnBox.h >= 44, results);

    // --- N: Kontaktfreigabe-Dialog ist im CRM-Tab erreichbar und additiv (kein zweites Dialogsystem) ---
    await p2.setViewportSize({ width: 1440, height: 1000 });
    await p2.evaluate(() => { window.KK_APP_SHELL.setActiveTab('crm'); });
    await p2.waitForTimeout(150);
    await p2.evaluate(() => { window.KK_SALES_CORE.openContactPolicy('ctB'); });
    await p2.waitForSelector('#kkSalesCorePolicyDialog[open]', { timeout: 8000 });
    const policyDialogTag = await p2.evaluate(() => document.getElementById('kkSalesCorePolicyDialog').tagName);
    check('N: Kontaktfreigabe nutzt das bestehende <dialog>-Pattern (kein neues Dialogsystem)', policyDialogTag === 'DIALOG', results);
    await p2.evaluate(() => { document.getElementById('kksecPolicyDoNotContact').checked = true; });
    await p2.evaluate(() => document.getElementById('kksecPolicySaveBtn').click());
    const policySaved = await p2.evaluate(() => {
      const contacts = JSON.parse(localStorage.getItem('kk_crm_contacts') || '[]');
      const c = contacts.find(x => x.id === 'ctB');
      return c && c.contactPolicy && c.contactPolicy.doNotContact === true;
    });
    check('N: Kontaktfreigabe wird additiv auf kk_crm_contacts gespeichert (kein neuer Kontakt-Store)', policySaved, results);
    const recsAfterPolicy = await p2.evaluate(() => window.KK_SALES_CORE.computeRecommendations());
    check('N: nach dem Setzen von doNotContact verschwindet der Kontakt sofort aus den Empfehlungen', !recsAfterPolicy.some(r => r.entityReferences && r.entityReferences.contactId === 'ctB'), results);

    check('no page errors (run 1)', pageErrors.length === 0, results);
    check('no page errors (run 2)', pageErrors2.length === 0, results);
    await browser2.close();

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
