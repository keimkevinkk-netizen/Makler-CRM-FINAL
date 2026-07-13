const { chromium } = require('playwright');
const path = require('path');

const LAUNCH_OPTS = Object.assign({ args: ['--no-sandbox'] }, process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const FILE_URL = process.env.TEST_BASE_URL || ('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
const results = [];

function check(name, condition, detail) {
  const pass = !!condition;
  results.push({ name, pass, detail: detail || '' });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
  if (!pass) console.log(`::error::FAILED CHECK: ${name}`);
}
function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
async function openSeeded(browser, seed, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('dialog', async dialog => { await dialog.accept(); });
  await page.addInitScript(data => {
    if (window.sessionStorage.getItem('__kk_sales_core_seeded') === '1') return;
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    window.sessionStorage.setItem('__kk_sales_core_seeded', '1');
  }, seed || {});
  await page.goto(FILE_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window.KK_SALES_CORE && window.KK_STORE && window.KK_APP_SHELL), null, { timeout: 20000 });
  return { context, page, pageErrors };
}
function baseEmpty(overrides = {}) {
  return Object.assign({
    kk_crm_contacts: [], kk_crm_activities: [], kk_crm_objects: [], kk_followups: [],
    kk_commitments_v1: [], kk_sales_pipeline: [], kk12_calendar_events: [],
    kk_entity_link_queue_v1: [], kk_action_feedback_v1: [], kk_sales_events_v1: [],
    kk_sales_event_archive_v1: []
  }, overrides);
}

(async () => {
  const browser = await chromium.launch(LAUNCH_OPTS);
  try {
    // 1) Contact policy, stable links, explainability and action filtering.
    const contacts = [
      { id: 'ct-unknown', name: 'Unbekannte Grundlage', phone: '060001', category: 'Eigentümer', status: 'Neu' },
      { id: 'ct-consent', name: 'Einwilligung', phone: '060002', category: 'Eigentümer', status: 'Neu', contactPolicy: { basisType: 'explicit_consent', basis: 'Telefonische Einwilligung am 10.07.2026 dokumentiert' } },
      { id: 'ct-callback', name: 'Rückruf Wunsch', phone: '060003', category: 'Eigentümer', status: 'Neu' },
      { id: 'ct-relation', name: 'Bestehende Beziehung', phone: '060004', category: 'Eigentümer', status: 'Gespräch', lastContact: day(-20) },
      { id: 'ct-optout', name: 'Opt Out', phone: '060005', category: 'Eigentümer', status: 'Neu', contactPolicy: { optOut: true } },
      { id: 'ct-block', name: 'Sperrvermerk', phone: '060006', category: 'Eigentümer', status: 'Neu', contactPolicy: { doNotContact: true } },
      { id: 'ct-revoked', name: 'Widerrufen', phone: '060007', category: 'Eigentümer', status: 'Neu', contactPolicy: { basisType: 'explicit_consent', basis: 'Frühere Einwilligung', consentRevokedAt: day(-1) } },
      { id: 'ct-conflict', name: 'Widersprüchlich', phone: '060008', category: 'Eigentümer', status: 'Neu', contactPolicy: { basisType: 'explicit_consent', basis: 'Einwilligung', optOut: true } },
      { id: 'ct-dupe-a', name: 'Doppel Name', phone: '060009', contactPolicy: { basisType: 'explicit_consent', basis: 'Einwilligung A' } },
      { id: 'ct-dupe-b', name: 'Doppel Name', phone: '060010', contactPolicy: { basisType: 'explicit_consent', basis: 'Einwilligung B' } }
    ];
    const policyRun = await openSeeded(browser, baseEmpty({
      kk_crm_contacts: contacts,
      kk_sales_pipeline: [
        { id: 'opp-unknown', contactId: 'ct-unknown', name: 'Unbekannte Grundlage', stage: 'Rohkontakt', nextStep: '' },
        { id: 'opp-consent', contactId: 'ct-consent', name: 'Einwilligung', stage: 'Rohkontakt', nextStep: '' },
        { id: 'opp-revoked', contactId: 'ct-revoked', name: 'Widerrufen', stage: 'Qualifiziert', nextStep: '' }
      ],
      kk_followups: [
        { id: 'fu-callback', contactId: 'ct-callback', name: 'Rückruf Wunsch', channel: 'Telefon', dueDate: day(-1), status: 'offen', goal: 'Rückruf wie gewünscht' },
        { id: 'fu-optout', contactId: 'ct-optout', name: 'Opt Out', channel: 'Telefon', dueDate: day(-1), status: 'offen' },
        { id: 'fu-block', contactId: 'ct-block', name: 'Sperrvermerk', channel: 'Telefon', dueDate: day(-1), status: 'offen' },
        { id: 'fu-conflict', contactId: 'ct-conflict', name: 'Widersprüchlich', channel: 'Telefon', dueDate: day(-1), status: 'offen' },
        { id: 'fu-future', contactId: 'ct-consent', name: 'Einwilligung', channel: 'Telefon', dueDate: day(10), status: 'offen' }
      ],
      kk_commitments_v1: [
        { id: 'commit-dupe', contact: 'Doppel Name', text: 'Mehrdeutig', due: day(-2), status: 'offen' },
        { id: 'commit-relation', contactId: 'ct-relation', contact: 'Bestehende Beziehung', text: 'Unterlagen melden', due: day(-2), status: 'offen' },
        { id: 'commit-done', contactId: 'ct-consent', contact: 'Einwilligung', text: 'Erledigt', due: day(-2), status: 'erfuellt' }
      ]
    }));
    const p = policyRun.page;
    const snapshot = await p.evaluate(() => ({
      recs: window.KK_SALES_CORE.computeRecommendations(),
      audit: window.KK_SALES_CORE.getDecisionAudit(),
      queue: window.KK_SALES_CORE.getLinkQueue(),
      evals: {
        consent: window.KK_SALES_CORE.evaluateContactPolicy('ct-consent'),
        optout: window.KK_SALES_CORE.evaluateContactPolicy('ct-optout'),
        block: window.KK_SALES_CORE.evaluateContactPolicy('ct-block'),
        revoked: window.KK_SALES_CORE.evaluateContactPolicy('ct-revoked'),
        conflict: window.KK_SALES_CORE.evaluateContactPolicy('ct-conflict')
      }
    }));
    const hasContact = id => snapshot.recs.some(r => r.contactReference && r.contactReference.contactId === id);
    check('Unbekannte Kontaktgrundlage wird aus automatischer Tagespriorisierung ausgeschlossen', !hasContact('ct-unknown'));
    check('Dokumentierte ausdrückliche Einwilligung wird berücksichtigt', hasContact('ct-consent') && snapshot.evals.consent.allowed);
    check('Dokumentierter Rückrufwunsch wird berücksichtigt und sichtbar begründet', hasContact('ct-callback') && snapshot.recs.some(r => r.contactReference.contactId === 'ct-callback' && r.contactBasis.type === 'callback_request'));
    check('Nachvollziehbare bestehende Beziehung wird berücksichtigt', hasContact('ct-relation') && snapshot.recs.some(r => r.contactReference.contactId === 'ct-relation' && r.contactBasis.type === 'existing_relationship'));
    check('Opt-out wird hart ausgeschlossen', !hasContact('ct-optout') && snapshot.evals.optout.blocked);
    check('Sperrvermerk wird hart ausgeschlossen', !hasContact('ct-block') && snapshot.evals.block.blocked);
    check('Nachträglich widerrufene Einwilligung wird hart ausgeschlossen', !hasContact('ct-revoked') && snapshot.evals.revoked.reasons.includes('einwilligung_widerrufen'));
    check('Widersprüchliche Kontaktinformationen werden hart ausgeschlossen und gewarnt', !hasContact('ct-conflict') && snapshot.evals.conflict.warnings.includes('widerspruechliche_kontaktinformationen'));
    check('Zukünftige Follow-ups und erledigte Zusagen werden nicht priorisiert', !snapshot.recs.some(r => r.id === 'callback_due:fu-future' || r.id === 'commitment_overdue:commit-done'));
    check('Mehrdeutiger Namensbezug erzeugt Queue-Eintrag statt stiller Verknüpfung', snapshot.queue.some(x => x.sourceRecordId === 'commit-dupe' && x.status === 'ambiguous') && !snapshot.recs.some(r => r.id === 'commitment_overdue:commit-dupe'));
    const required = ['action', 'reason', 'priority', 'dataBasis', 'goal', 'contactReference', 'dueAt', 'warnings', 'exclusionNotes'];
    check('Jede Empfehlung enthält alle geforderten Nachvollziehbarkeitsfelder', snapshot.recs.length > 0 && snapshot.recs.every(r => required.every(k => Object.prototype.hasOwnProperty.call(r, k)) && r.contactReference.contactId && r.contactBasis && r.sourceFacts.sourceKey));
    check('Empfehlungen bleiben deterministisch und ohne Score', JSON.stringify(snapshot.recs.map(r => r.id)) === JSON.stringify((await p.evaluate(() => window.KK_SALES_CORE.computeRecommendations())).map(r => r.id)) && !snapshot.recs.some(r => 'score' in r || 'probability' in r));
    check('Engine dokumentiert sicher ausgeschlossene Entscheidungen', snapshot.audit.some(x => x.contactId === 'ct-unknown' && x.reasons.includes('kontaktgrundlage_unbekannt')));
    check('Keine Browserfehler bei Kontaktpolitik und Ambiguitätsfällen', policyRun.pageErrors.length === 0, policyRun.pageErrors.join('; '));
    await policyRun.context.close();

    // 2) Manual warning confirmation and hard block.
    const manualRun = await openSeeded(browser, baseEmpty({ kk_crm_contacts: [
      { id: 'manual-unknown', name: 'Manuell Unbekannt', phone: '061111' },
      { id: 'manual-blocked', name: 'Manuell Gesperrt', phone: '061112', contactPolicy: { doNotContact: true } }
    ] }));
    const mp = manualRun.page;
    const requestUnknown = await mp.evaluate(() => window.KK_SALES_CORE.requestManualContact('manual-unknown'));
    check('Manueller Versuch ohne Grundlage verlangt Warnbestätigung', requestUnknown.status === 'confirmation_required' && await mp.locator('#kkSalesCoreManualConfirmDialog').evaluate(el => el.open));
    const invalidConfirm = await mp.evaluate(() => window.KK_SALES_CORE.confirmManualContact());
    check('Warnbestätigung erzwingt Kontaktgrundlage, Begründung und bewusste Bestätigung', invalidConfirm.status === 'validation' && !(await mp.locator('#kksecManualError').getAttribute('hidden')));
    await mp.selectOption('#kksecManualBasisType', 'manual_reason');
    await mp.fill('#kksecManualReason', 'Einmaliger manueller Kontakt nach eigener Prüfung');
    await mp.check('#kksecManualConfirmCheck');
    const validConfirm = await mp.evaluate(() => window.KK_SALES_CORE.confirmManualContact());
    check('Vollständig dokumentierte manuelle Warnbestätigung öffnet den geführten Workflow', validConfirm.ok && await mp.locator('#kkSalesCoreCallDialog').evaluate(el => el.open));
    await mp.evaluate(() => document.getElementById('kksecCallCloseBtn').click());
    const requestBlocked = await mp.evaluate(() => window.KK_SALES_CORE.requestManualContact('manual-blocked'));
    check('Manueller Kontaktversuch umgeht Sperrvermerk nicht', requestBlocked.status === 'blocked');
    const manualEvents = await mp.evaluate(() => window.KK_SALES_CORE.getEventLog());
    check('Manuelle Bestätigung wird mit Grundlage und Begründung protokolliert', manualEvents.some(e => e.type === 'manual_contact_confirmed' && e.basisType === 'manual_reason' && e.reason));
    await manualRun.context.close();

    // 3) Call workflow idempotency, stable contact/opportunity/property references.
    const callRun = await openSeeded(browser, baseEmpty({
      kk_crm_contacts: [{ id: 'ct-call', name: 'Anruf Test', phone: '062222', contactPolicy: { basisType: 'explicit_consent', basis: 'Einwilligung dokumentiert' } }],
      kk_crm_objects: [{ id: 'obj-1', address: 'Teststraße 1', title: 'Testobjekt' }],
      kk_sales_pipeline: [{ id: 'opp-1', contactId: 'ct-call', name: 'Anruf Test', stage: 'Qualifiziert', objectLabel: 'Teststraße 1', propertyId: 'obj-1', nextStep: '' }]
    }));
    const cp = callRun.page;
    const rec = (await cp.evaluate(() => window.KK_SALES_CORE.computeRecommendations())).find(r => r.ruleId === 'opportunity_no_next_step');
    check('Opportunity-Empfehlung referenziert stabile Kontakt-, Opportunity- und Objekt-ID', rec && rec.entityReferences.contactId === 'ct-call' && rec.entityReferences.opportunityId === 'opp-1' && rec.entityReferences.propertyId === 'obj-1');
    await cp.evaluate(id => { window.KK_SALES_CORE.startCallFor(id); window.KK_SALES_CORE.startCallFor(id); }, rec.id);
    const firstSession = await cp.evaluate(() => JSON.parse(localStorage.getItem('kk_call_session_v1')));
    check('Wiederholtes Öffnen nutzt dieselbe laufende Session statt einer zweiten', firstSession && firstSession.id && await cp.locator('#kkSalesCoreCallDialog').evaluate(el => el.open));
    await cp.evaluate(() => document.getElementById('kksecPrepTelLink').click());
    await cp.evaluate(() => document.getElementById('kksecCallEndBtn').click());
    await cp.evaluate(() => document.querySelector('#kksecOutcomeReached button[data-val="ja"]').click());
    await cp.fill('#kksecOutcomeNextStep', 'Unterlagen senden');
    await cp.fill('#kksecOutcomeDate', day(7));
    await cp.fill('#kksecOutcomeCommitment', 'Exposé bis Freitag senden');
    await cp.check('#kksecPipelineConfirmCheck');
    await cp.evaluate(() => { const b = document.getElementById('kksecPostcallSaveBtn'); b.click(); b.click(); });
    await cp.waitForSelector('.kksc-phase[data-phase="done"].is-active');
    let saved = await cp.evaluate(() => ({
      activities: JSON.parse(localStorage.getItem('kk_crm_activities') || '[]').filter(x => x.source === 'sales-execution-core'),
      followups: JSON.parse(localStorage.getItem('kk_followups') || '[]').filter(x => x.source === 'sales-execution-core'),
      commitments: JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]').filter(x => x.source === 'sales-execution-core'),
      feedback: JSON.parse(localStorage.getItem('kk_action_feedback_v1') || '[]'),
      deals: JSON.parse(localStorage.getItem('kk_sales_pipeline') || '[]')
    }));
    check('Doppelklick erzeugt genau eine Aktivität, ein Follow-up und eine Zusage', saved.activities.length === 1 && saved.followups.length === 1 && saved.commitments.length === 1);
    check('Alle neuen Datensätze tragen stabile Kontakt-, Opportunity-, Objekt- und Session-IDs', [saved.activities[0], saved.followups[0], saved.commitments[0]].every(x => x.id && x.contactId === 'ct-call' && x.opportunityId === 'opp-1' && x.propertyId === 'obj-1' && x.sessionId === firstSession.id));
    check('Pipeline wird nur nach ausdrücklicher Bestätigung idempotent aktualisiert', saved.deals[0].nextStep === 'Unterlagen senden' && saved.deals[0].followUpDate === day(7));
    await cp.reload({ waitUntil: 'load' });
    await cp.waitForFunction(() => !!window.KK_SALES_CORE);
    await cp.evaluate(id => window.KK_SALES_CORE.startCallFor(id), rec.id);
    saved = await cp.evaluate(id => ({ a: JSON.parse(localStorage.getItem('kk_crm_activities') || '[]').filter(x => x.recommendationId === id).length, f: JSON.parse(localStorage.getItem('kk_followups') || '[]').filter(x => x.recommendationId === id).length, c: JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]').filter(x => x.recommendationId === id).length, sessionRaw: localStorage.getItem('kk_call_session_v1'), feedback: JSON.parse(localStorage.getItem('kk_action_feedback_v1') || '[]').filter(x => x.recommendationId === id), deals: JSON.parse(localStorage.getItem('kk_sales_pipeline') || '[]') }), rec.id);
    check('Neuladen und erneuter Start einer erledigten Empfehlung erzeugen keine Duplikate', saved.a === 1 && saved.f === 1 && saved.c === 1, JSON.stringify(saved));
    check('Call-Session ist nach erfolgreichem Abschluss geleert', JSON.parse(saved.sessionRaw || 'null') === null, saved.sessionRaw || '<entfernt>');
    check('Keine Browserfehler im wiederholten Anrufworkflow', callRun.pageErrors.length === 0, callRun.pageErrors.join('; '));
    await callRun.context.close();

    // 4) Interrupted-save recovery: existing activity finalizes feedback without another write.
    const recoveryRun = await openSeeded(browser, baseEmpty({
      kk_crm_contacts: [{ id: 'ct-recover', name: 'Recovery', phone: '063333', contactPolicy: { basisType: 'explicit_consent', basis: 'Einwilligung' } }],
      kk_sales_pipeline: [{ id: 'opp-recover', contactId: 'ct-recover', name: 'Recovery', stage: 'Qualifiziert', nextStep: '' }],
      kk_crm_activities: [{ id: 'act-fixed', contactId: 'ct-recover', contact: 'Recovery', recommendationId: 'opportunity_no_next_step:opp-recover', sessionId: 'session-fixed', source: 'sales-execution-core', createdAt: new Date().toISOString() }],
      kk_call_session_v1: { id: 'session-fixed', recommendationId: 'opportunity_no_next_step:opp-recover', contactId: 'ct-recover', activityId: 'act-fixed', status: 'saving' }
    }));
    const recovered = await recoveryRun.page.evaluate(() => ({
      activities: JSON.parse(localStorage.getItem('kk_crm_activities') || '[]').filter(x => x.recommendationId === 'opportunity_no_next_step:opp-recover'),
      feedback: JSON.parse(localStorage.getItem('kk_action_feedback_v1') || '[]'), session: localStorage.getItem('kk_call_session_v1')
    }));
    check('Unterbrochener Speichervorgang wird anhand recommendationId/sessionId ohne Doppelaktivität abgeschlossen', recovered.activities.length === 1 && recovered.feedback.some(x => x.recommendationId === 'opportunity_no_next_step:opp-recover' && x.decision === 'executed') && recovered.session === 'null');
    await recoveryRun.context.close();

    // 5) Empty/corrupt/large/mobile robustness.
    const corruptRun = await openSeeded(browser, baseEmpty({
      kk_crm_contacts: '{bad-json', kk_followups: [null, 'legacy', 42, { id: 'future', name: 'Niemand', dueDate: day(5), status: 'offen' }], kk_sales_pipeline: { broken: true }
    }), { width: 390, height: 844 });
    const corruptState = await corruptRun.page.evaluate(() => {
      window.KK_APP_SHELL.setActiveTab('heute'); window.KK_SALES_CORE.renderCommandCenter();
      return { recs: window.KK_SALES_CORE.computeRecommendations(), empty: !document.getElementById('kksecEmpty').hidden, overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 3 };
    });
    check('Leere und beschädigte Legacy-Daten führen zu ehrlichem, stabilem Leerzustand', Array.isArray(corruptState.recs) && corruptState.recs.length === 0 && corruptState.empty);
    check('Daily Command Center bleibt auf 390px ohne horizontalen Overflow', corruptState.overflow);
    check('Beschädigte Legacy-Daten erzeugen keinen Browserfehler', corruptRun.pageErrors.length === 0, corruptRun.pageErrors.join('; '));
    await corruptRun.context.close();

    const largeContacts = Array.from({ length: 450 }, (_, i) => ({ id: `bulk-${i}`, name: `Bulk ${i}`, phone: `064${String(i).padStart(4, '0')}` }));
    const largeFollowups = largeContacts.map((c, i) => ({ id: `bulk-fu-${i}`, contactId: c.id, name: c.name, channel: 'Telefon', dueDate: day(-1), status: 'offen', goal: 'Rückruf' }));
    const largeRun = await openSeeded(browser, baseEmpty({ kk_crm_contacts: largeContacts, kk_followups: largeFollowups }));
    const t0 = Date.now();
    const largeResult = await largeRun.page.evaluate(() => { const recs = window.KK_SALES_CORE.computeRecommendations(); window.KK_SALES_CORE.renderCommandCenter(); return { count: recs.length, rendered: document.querySelectorAll('#kksecQueue .kksec-card').length }; });
    check('Mehrere hundert Kontakte werden stabil verarbeitet und UI begrenzt gerendert', largeResult.count === 450 && largeResult.rendered === 8, `${Date.now() - t0}ms`);
    check('Großer Datenbestand erzeugt keinen Browserfehler', largeRun.pageErrors.length === 0, largeRun.pageErrors.join('; '));
    await largeRun.context.close();

    // 6) Migration backup/idempotence, backup/restore and bounded event archive.
    const migrationRun = await openSeeded(browser, baseEmpty({
      kk_crm_contacts: [{ name: 'Ohne ID', phone: '065555' }],
      kk_commitments_v1: [{ contact: 'Ohne ID', text: 'Legacy Zusage', due: day(-1), status: 'offen' }]
    }));
    const mig = await migrationRun.page.evaluate(() => {
      const firstContacts = JSON.parse(localStorage.getItem('kk_crm_contacts') || '[]');
      const firstCommitments = JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]');
      const before = { contact: firstContacts[0].id || firstContacts[0]._id, commitment: firstCommitments[0].id || firstCommitments[0]._id };
      const first = window.KK_SALES_CORE.ensureStableIds();
      const second = window.KK_SALES_CORE.ensureStableIds();
      const afterContacts = JSON.parse(localStorage.getItem('kk_crm_contacts') || '[]');
      const afterCommitments = JSON.parse(localStorage.getItem('kk_commitments_v1') || '[]');
      return {
        before, after: { contact: afterContacts[0].id || afterContacts[0]._id, commitment: afterCommitments[0].id || afterCommitments[0]._id }, first, second,
        salesSnapshot: JSON.parse(localStorage.getItem('kk_pre_import_sales_core_v2') || 'null'),
        globalSnapshot: JSON.parse(localStorage.getItem('kk_pre_import_storage_migrations_v28') || 'null')
      };
    });
    check('Bestehende Daten werden vor neuen Migrationen automatisch gesichert', !!mig.salesSnapshot && !!mig.globalSnapshot && mig.salesSnapshot.data.kk_commitments_v1[0].id == null);
    check('Stable-ID-Migration ist idempotent und verändert IDs beim Wiederholen nicht', mig.before.contact === mig.after.contact && mig.before.commitment === mig.after.commitment && mig.second.changed === false);

    const backupResult = await migrationRun.page.evaluate(() => {
      localStorage.setItem('kk_action_feedback_v1', JSON.stringify([{ id: 'fb1' }]));
      localStorage.setItem('kk_call_session_v1', JSON.stringify({ id: 's1' }));
      localStorage.setItem('kk_entity_link_queue_v1', JSON.stringify([{ id: 'l1' }]));
      localStorage.setItem('kk_sales_events_v1', JSON.stringify([{ id: 'e1', type: 'x', at: new Date().toISOString() }]));
      localStorage.setItem('kk_sales_event_archive_v1', JSON.stringify([{ id: 'a1', month: '2026-07' }]));
      const payload = window.KK_STORE.makeBackup({ module: 'all', includeLegacy: true });
      const keys = ['kk_action_feedback_v1', 'kk_call_session_v1', 'kk_entity_link_queue_v1', 'kk_sales_events_v1', 'kk_sales_event_archive_v1'];
      keys.forEach(k => localStorage.removeItem(k));
      const restored = window.KK_STORE.importPayload(payload, { mode: 'merge' });
      return { keys, exported: payload.manifest.exportedKeys, restored, values: keys.map(k => localStorage.getItem(k)) };
    });
    check('Komplettbackup enthält alle neuen Sales-Core-Datenbereiche', backupResult.keys.every(k => backupResult.exported.includes(k)));
    check('Restore stellt alle neuen Sales-Core-Datenbereiche vollständig wieder her', backupResult.restored.ok && backupResult.values.every(Boolean));

    const archiveResult = await migrationRun.page.evaluate(() => {
      const events = Array.from({ length: 2105 }, (_, i) => ({ id: `evt-${i}`, eventKey: `k-${i}`, type: i % 2 ? 'call_started' : 'call_reached', at: `2026-${String(1 + (i % 7)).padStart(2, '0')}-01T00:00:00.000Z` }));
      localStorage.setItem('kk_sales_events_v1', JSON.stringify(events));
      return window.KK_SALES_CORE.archiveEventLogNow();
    });
    check('Aktiver append-only Ereignis-Log ist sicher begrenzt', archiveResult.active.length === 1500);
    check('Ältere Ereignisse werden als begrenzte Monatsaggregate archiviert', archiveResult.archive.length > 0 && archiveResult.archive.length <= 24 && archiveResult.archive.reduce((n, x) => n + x.eventCount, 0) === 605);
    check('Neue Storage-Keys sind im aktiven Registry-Snapshot dokumentiert', await migrationRun.page.evaluate(() => ['kk_action_feedback_v1','kk_call_session_v1','kk_entity_link_queue_v1','kk_sales_events_v1','kk_sales_event_archive_v1'].every(k => window.KK_STORE.registry.activeKeys.includes(k))));
    await migrationRun.context.close();

    const failed = results.filter(r => !r.pass);
    console.log(`\n=== SALES EXECUTION CORE FINAL REVIEW: ${results.length - failed.length}/${results.length} checks passed ===`);
    if (failed.length) console.log('FAILED:', failed.map(x => x.name));
    console.log(`RESULT: ${failed.length ? 'FAIL' : 'PASS'}`);
    process.exitCode = failed.length ? 1 : 0;
  } catch (error) {
    console.error('FATAL - test crashed:', error && error.stack || error);
    console.log(`::error::FATAL: ${String(error && error.message || error)}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
