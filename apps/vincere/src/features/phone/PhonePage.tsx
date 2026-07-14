import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  PhoneCall,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import { requestStructured } from '../../services/ai/provider';
import { AiProviderError } from '../../services/ai/types';
import {
  buildConversationDebrief,
  buildConversationPreparation,
  conversationDebriefSchema,
  conversationModes,
  conversationPreparationSchema,
  createSalesCoachMockProvider,
  getConversationMode,
  objectionGuides,
  type ConversationDebrief,
  type ConversationModeId,
  type ConversationPreparation,
} from '../ai';
import type { CallEvent } from '../../types/domain';

type CoachTab = 'prepare' | 'guide' | 'debrief';
type ProviderStatus = 'idle' | 'loading' | 'ready' | 'error';

function toLocalDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function riskTone(risk: ConversationDebrief['salesRisk']) {
  if (risk === 'high') return 'red' as const;
  if (risk === 'medium') return 'gold' as const;
  return 'green' as const;
}

export function PhonePage() {
  const store = useAppStore();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('contact') ?? store.contacts[0]?.id ?? '';
  const contact = store.contacts.find((item) => item.id === selectedId);
  const provider = useMemo(() => createSalesCoachMockProvider(), []);
  const [tab, setTab] = useState<CoachTab>('prepare');
  const [modeId, setModeId] = useState<ConversationModeId>('owner_first_contact');
  const [step, setStep] = useState(0);
  const [selectedObjectionId, setSelectedObjectionId] = useState(objectionGuides[0].id);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>('idle');
  const [providerMessage, setProviderMessage] = useState('Offline-Mock aktiv · keine externe Übertragung');
  const [preparation, setPreparation] = useState<ConversationPreparation>();
  const [outcome, setOutcome] = useState<CallEvent['outcome']>('conversation');
  const [summary, setSummary] = useState('');
  const [motivation, setMotivation] = useState('');
  const [objections, setObjections] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [missingInformation, setMissingInformation] = useState('');
  const [followUpDate, setFollowUpDate] = useState(contact?.nextActionAt ? toLocalDateTime(contact.nextActionAt) : '');
  const [savedDebrief, setSavedDebrief] = useState<ConversationDebrief>();

  const mode = getConversationMode(modeId);
  const currentStep = mode.steps[step] ?? mode.steps[0];
  const selectedObjection = objectionGuides.find((item) => item.id === selectedObjectionId) ?? objectionGuides[0];
  const contactFollowUps = useMemo(
    () => store.followUps.filter((item) => item.contactId === contact?.id),
    [contact?.id, store.followUps],
  );
  const contactCalls = useMemo(
    () => store.callEvents.filter((item) => item.contactId === contact?.id),
    [contact?.id, store.callEvents],
  );
  const deterministicPreparation = useMemo(() => buildConversationPreparation({
    contact,
    followUps: contactFollowUps,
    callEvents: contactCalls,
    modeId,
  }), [contact, contactCalls, contactFollowUps, modeId]);
  const activePreparation = preparation ?? deterministicPreparation;
  const debriefInput = useMemo(() => ({
    contact,
    outcome,
    summary,
    motivation,
    objections: objections.split('\n').map((item) => item.trim()).filter(Boolean),
    nextStep,
    missingInformation: missingInformation.split('\n').map((item) => item.trim()).filter(Boolean),
    followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
  }), [contact, followUpDate, missingInformation, motivation, nextStep, objections, outcome, summary]);
  const debriefPreview = useMemo(() => buildConversationDebrief(debriefInput), [debriefInput]);

  const generatePreparation = async () => {
    setProviderStatus('loading');
    setProviderMessage('Strukturierte Vorbereitung wird im lokalen Mock-Modus erzeugt …');
    try {
      const response = await requestStructured(provider, {
        task: 'conversation_preparation',
        input: { contact, followUps: contactFollowUps, callEvents: contactCalls, modeId },
        schema: conversationPreparationSchema,
      }, { timeoutMs: 2_000 });
      setPreparation(response.data);
      setProviderStatus('ready');
      setProviderMessage(`Struktur geprüft · ${response.providerId} · keine externe Übertragung`);
    } catch (reason) {
      const error = reason instanceof AiProviderError ? reason : new AiProviderError('unknown', 'Vorbereitung fehlgeschlagen.');
      setProviderStatus('error');
      setProviderMessage(`${error.code}: ${error.message}`);
    }
  };

  const save = async () => {
    if (!contact) return;
    setProviderStatus('loading');
    setProviderMessage('Nachbereitung wird strukturiert geprüft …');
    try {
      const response = await requestStructured(provider, {
        task: 'conversation_debrief',
        input: debriefInput,
        schema: conversationDebriefSchema,
      }, { timeoutMs: 2_000 });
      const debrief = response.data;
      const note = [
        debrief.conversationSummary !== 'Unbekannt' ? `Zusammenfassung: ${debrief.conversationSummary}` : undefined,
        debrief.detectedMotivation !== 'Unbekannt' ? `Motivation: ${debrief.detectedMotivation}` : undefined,
        debrief.detectedObjections[0] !== 'Unbekannt' ? `Einwände: ${debrief.detectedObjections.join('; ')}` : undefined,
        debrief.nextStep !== 'Unbekannt' ? `Nächster Schritt: ${debrief.nextStep}` : undefined,
        `Vertriebsrisiko: ${debrief.salesRisk} – ${debrief.riskReason}`,
      ].filter(Boolean).join('\n');
      store.logCall({ contactId: contact.id, outcome, note });
      if (outcome === 'appointment') store.moveContactStage(contact.id, 'appointment');
      setSavedDebrief(debrief);
      setProviderStatus('ready');
      setProviderMessage('Nachbereitung geprüft und über die bestehende Telefonlogik gespeichert.');
    } catch (reason) {
      const error = reason instanceof AiProviderError ? reason : new AiProviderError('unknown', 'Nachbereitung fehlgeschlagen.');
      setProviderStatus('error');
      setProviderMessage(`${error.code}: ${error.message}`);
    }
  };

  if (!store.contacts.length) {
    return <Card><EmptyState title="Noch keine Kontakte" text="Lege zuerst einen Kontakt an, um den Verkaufscoach zu nutzen." /></Card>;
  }

  return (
    <div className="coach-page">
      <Card className="coach-command-bar">
        <div className="coach-command-context">
          <span className={`coach-provider-state state-${providerStatus}`}><BrainCircuit size={15} /> KI-Verkaufscoach V2</span>
          <strong>{providerMessage}</strong>
          <small>Echte Inferenz muss später ausschließlich über einen serverseitigen Endpunkt mit sicher verwahrten Schlüsseln erfolgen.</small>
        </div>
        <div className="coach-command-actions">
          <label>Kontakt
            <select value={selectedId} onChange={(event) => {
              setParams({ contact: event.target.value });
              setPreparation(undefined);
              setSavedDebrief(undefined);
            }}>
              {store.contacts.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
            </select>
          </label>
          <label>Gesprächsmodus
            <select value={modeId} onChange={(event) => {
              setModeId(event.target.value as ConversationModeId);
              setStep(0);
              setPreparation(undefined);
            }}>
              {conversationModes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {contact && <a href={`tel:${contact.phone}`} className="button button-primary coach-call-button"><PhoneCall size={18} /> Anruf starten</a>}
        </div>
      </Card>

      <nav className="coach-tabs" aria-label="Coach-Phasen">
        <button className={tab === 'prepare' ? 'active' : ''} onClick={() => setTab('prepare')}><ClipboardCheck size={17} /> Vorbereiten</button>
        <button className={tab === 'guide' ? 'active' : ''} onClick={() => setTab('guide')}><MessageSquareText size={17} /> Gespräch führen</button>
        <button className={tab === 'debrief' ? 'active' : ''} onClick={() => setTab('debrief')}><Save size={17} /> Nachbereiten</button>
      </nav>

      {tab === 'prepare' && (
        <div className="coach-prepare-grid">
          <Card className="coach-contact-card">
            <SectionHeader title="Gesprächskontext" subtitle="Nur dokumentierte Fakten – fehlende Angaben bleiben unbekannt" />
            {contact && <div className="coach-contact-profile">
              <span className={`initials priority-${contact.priority}`}>{contact.firstName[0]}{contact.lastName[0]}</span>
              <div><h2>{contact.firstName} {contact.lastName}</h2><p>{contact.role} · {contact.city}</p></div>
              <Badge tone={contact.potential >= 80 ? 'red' : 'gold'}>{contact.potential}% Potenzial</Badge>
            </div>}
            <dl className="coach-facts">
              {activePreparation.evidence.map((item) => <div key={item}><dt><ShieldCheck size={14} /> Belegt</dt><dd>{item}</dd></div>)}
            </dl>
            <div className="coach-unknown-box"><AlertTriangle size={17} /><div><strong>Unbekannte Informationen</strong><ul>{activePreparation.unknownFields.length ? activePreparation.unknownFields.map((item) => <li key={item}>{item}</li>) : <li>Keine zentralen Lücken erkannt</li>}</ul></div></div>
          </Card>

          <Card className="coach-preparation-card">
            <SectionHeader title="Strukturierte Vorbereitung" subtitle={mode.description} action={<Button variant="secondary" onClick={generatePreparation} disabled={providerStatus === 'loading'}><RefreshCw size={15} /> Neu erzeugen</Button>} />
            <div className="coach-goals">
              <article><Target size={18} /><span>Mindestziel</span><strong>{activePreparation.minimumGoal}</strong></article>
              <article><Sparkles size={18} /><span>Idealziel</span><strong>{activePreparation.idealGoal}</strong></article>
            </div>
            <div className="coach-prep-sections">
              <article><h3>Kontaktzusammenfassung</h3><p>{activePreparation.contactSummary}</p></article>
              <article><h3>Sinnvoller Einstieg</h3><blockquote>{activePreparation.opening}</blockquote></article>
              <article><h3>Offene Follow-ups</h3><ul>{activePreparation.openFollowUps.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>Bekannte Interessen</h3><ul>{activePreparation.knownInterests.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>Offene Fragen</h3><ul>{activePreparation.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>Mögliche Einwände</h3><ul>{activePreparation.likelyObjections.map((item) => <li key={item}>{item}</li>)}</ul></article>
            </div>
            <Button className="coach-main-action" onClick={() => setTab('guide')}>Gesprächsführung öffnen <ArrowRight size={17} /></Button>
          </Card>
        </div>
      )}

      {tab === 'guide' && (
        <div className="coach-guide-grid">
          <Card className="coach-flow-card">
            <SectionHeader title={mode.label} subtitle="Ein klarer Ablauf – keine starre Wort-für-Wort-Vorgabe" />
            <div className="coach-goal-strip"><span>Mindestziel: {mode.minimumGoal}</span><strong>Idealziel: {mode.idealGoal}</strong></div>
            <div className="coach-stepper">
              {mode.steps.map((item, index) => <button key={item.id} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <CheckCircle2 size={14} /> : index + 1}</span><small>{item.label}</small></button>)}
            </div>
            <div className="coach-step-card">
              <span className="eyebrow"><Sparkles size={15} /> Schritt {step + 1} von {mode.steps.length}</span>
              <h1>{currentStep.label}</h1>
              <p className="coach-step-objective">{currentStep.objective}</p>
              <blockquote>{currentStep.prompt.replace('[Name]', contact?.lastName ?? 'Unbekannt')}</blockquote>
              <div className="coach-listen"><strong>Darauf achten</strong>{currentStep.listenFor.map((item) => <span key={item}>{item}</span>)}</div>
              <p className="coach-guidance">{currentStep.guidance}</p>
              <div className="script-controls">
                <Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={16} /> Zurück</Button>
                <Button disabled={step === mode.steps.length - 1} onClick={() => setStep((value) => Math.min(mode.steps.length - 1, value + 1))}>Weiter <ArrowRight size={16} /></Button>
              </div>
            </div>
          </Card>

          <Card className="coach-objection-panel">
            <SectionHeader title="Schnelle Einwandhilfe" subtitle="Verstehen, nicht überreden" />
            <div className="coach-objection-buttons">{objectionGuides.map((item) => <button key={item.id} className={selectedObjectionId === item.id ? 'active' : ''} onClick={() => setSelectedObjectionId(item.id)}>{item.objection}</button>)}</div>
            <div className="coach-objection-detail">
              <Badge tone="gold">{selectedObjection.type}</Badge>
              <h2>{selectedObjection.objection}</h2>
              <dl>
                <div><dt>Mögliches tatsächliches Motiv</dt><dd>{selectedObjection.possibleMotive}</dd></div>
                <div><dt>Rückfrage</dt><dd>{selectedObjection.followUpQuestion}</dd></div>
                <div><dt>Antwortstrategie</dt><dd>{selectedObjection.responseStrategy}</dd></div>
                <div className="coach-warning"><dt>Ungeeignete Reaktion</dt><dd>{selectedObjection.unsuitableReaction}</dd></div>
                <div><dt>Nächstes realistisches Ziel</dt><dd>{selectedObjection.realisticGoal}</dd></div>
              </dl>
            </div>
            <Button className="coach-main-action" onClick={() => setTab('debrief')}>Gespräch nachbereiten <ArrowRight size={17} /></Button>
          </Card>
        </div>
      )}

      {tab === 'debrief' && (
        <div className="coach-debrief-grid">
          <Card className="coach-debrief-form">
            <SectionHeader title="Gesprächsnachbereitung" subtitle="Ergebnis und nächster Schritt werden über die vorhandene Telefonlogik gespeichert" />
            <div className="coach-form-grid">
              <label>Ergebnis<select value={outcome} onChange={(event) => setOutcome(event.target.value as CallEvent['outcome'])}><option value="conversation">Gespräch geführt</option><option value="appointment">Termin vereinbart</option><option value="no_answer">Nicht erreicht</option><option value="not_interested">Aktuell kein Interesse</option></select></label>
              <label>Follow-up-Vorschlag<input type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label>
              <label className="coach-form-span">Gesprächszusammenfassung<textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Nur tatsächlich besprochene Inhalte …" /></label>
              <label>Erkannte Motivation<textarea rows={3} value={motivation} onChange={(event) => setMotivation(event.target.value)} placeholder="Eine konkrete Motivation pro Zeile oder unbekannt lassen" /></label>
              <label>Erkannte Einwände<textarea rows={3} value={objections} onChange={(event) => setObjections(event.target.value)} placeholder="Ein Einwand pro Zeile" /></label>
              <label className="coach-form-span">Nächster Schritt<textarea rows={3} value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="Wer macht was bis wann?" /></label>
              <label className="coach-form-span">Fehlende Informationen<textarea rows={3} value={missingInformation} onChange={(event) => setMissingInformation(event.target.value)} placeholder="Eine offene Information pro Zeile" /></label>
            </div>
            <Button className="coach-main-action" onClick={save} disabled={!contact || providerStatus === 'loading'}><Save size={17} /> Nachbereitung prüfen und speichern</Button>
          </Card>

          <Card className="coach-debrief-preview">
            <SectionHeader title="Vertriebsbewertung" subtitle="Deterministische Vorschau vor dem Speichern" />
            <div className="coach-risk"><Badge tone={riskTone(debriefPreview.salesRisk)}>Risiko {debriefPreview.salesRisk}</Badge><p>{debriefPreview.riskReason}</p></div>
            <dl>
              <div><dt>Ergebnis</dt><dd>{debriefPreview.result}</dd></div>
              <div><dt>Nächster Schritt</dt><dd>{debriefPreview.nextStep}</dd></div>
              <div><dt>Follow-up</dt><dd>{debriefPreview.followUpSuggestion}</dd></div>
              <div><dt>Terminbedarf</dt><dd>{debriefPreview.appointmentNeeded ? 'Ja' : 'Nein'}</dd></div>
              <div><dt>Empfohlene Nachricht</dt><dd>{debriefPreview.recommendedMessage}</dd></div>
            </dl>
            {savedDebrief && <div className="success-message"><CheckCircle2 size={17} /> Gespräch wurde strukturiert dokumentiert.</div>}
            <div className="coach-architecture-note"><Clock3 size={16} /><span>Keine konkurrierende Follow-up-Persistenz: Der Termin ist in diesem Paket nur ein Vorschlag und wird nicht automatisch angelegt.</span></div>
          </Card>
        </div>
      )}
    </div>
  );
}
