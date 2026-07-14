import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  Route,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import {
  buildAppointmentOperations,
  formatAppointmentTime,
  getAppointmentCapabilities,
  type AppointmentBriefing,
} from '../../domain/appointments/appointmentOperations';
import { FieldOpsInspectionMode } from '../field-ops/FieldOpsInspectionMode';
import './appointment-field-ops.css';

type ViewMode = 'briefing' | 'route' | 'debrief' | 'field';
type PipelineStage = '' | 'lead' | 'qualified' | 'appointment' | 'mandate' | 'sold';

interface DebriefDraft {
  occurred: 'unknown' | 'yes' | 'no';
  result: string;
  motivation: string;
  objections: string;
  nextAction: string;
  dueAt: string;
  pipelineStage: PipelineStage;
  propertyImpact: string;
  messageDraft: string;
}

const emptyDebrief = (): DebriefDraft => ({
  occurred: 'unknown',
  result: '',
  motivation: '',
  objections: '',
  nextAction: '',
  dueAt: '',
  pipelineStage: '',
  propertyImpact: '',
  messageDraft: '',
});

function priorityTone(priority: AppointmentBriefing['priority']): 'red' | 'gold' | 'blue' {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'gold';
  return 'blue';
}

function defaultDueAt(briefing: AppointmentBriefing): string {
  const base = briefing.startsAt ? new Date(briefing.startsAt) : new Date();
  base.setDate(base.getDate() + 1);
  const offset = base.getTimezoneOffset() * 60_000;
  return new Date(base.getTime() - offset).toISOString().slice(0, 16);
}

function AppointmentList({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: AppointmentBriefing[];
  selectedId?: string;
  onSelect: (briefing: AppointmentBriefing) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="appointment-ops-group">
      <h3>{label}</h3>
      {items.map((briefing) => (
        <button
          key={briefing.appointment.id}
          className={`appointment-ops-item ${selectedId === briefing.appointment.id ? 'is-active' : ''}`}
          onClick={() => onSelect(briefing)}
        >
          <span className="appointment-ops-item-time"><Clock3 size={15} />{formatAppointmentTime(briefing)}</span>
          <strong>{briefing.appointment.title || 'Termin ohne Titel'}</strong>
          <span>{briefing.contact ? `${briefing.contact.firstName} ${briefing.contact.lastName}` : 'Kontakt nicht zugeordnet'}</span>
          <span className="appointment-ops-item-meta">
            <Badge tone={priorityTone(briefing.priority)}>{briefing.priority}</Badge>
            <Badge tone={briefing.kind.confidence === 'unclear' ? 'red' : 'neutral'}>{briefing.kind.kind}</Badge>
          </span>
        </button>
      ))}
    </div>
  );
}

function BriefingView({ briefing }: { briefing: AppointmentBriefing }) {
  return (
    <div className="appointment-ops-stack">
      <Card className="appointment-ops-hero">
        <div>
          <small>Terminbriefing</small>
          <h2>{briefing.appointment.title || 'Termin ohne Titel'}</h2>
          <p>{formatAppointmentTime(briefing)} · {briefing.location ?? 'Ort nicht dokumentiert'}</p>
        </div>
        <div className="appointment-ops-badges">
          <Badge tone={priorityTone(briefing.priority)}>Priorität {briefing.priority}</Badge>
          <Badge tone={briefing.kind.confidence === 'unclear' ? 'red' : 'gold'}>{briefing.kind.kind}</Badge>
          <Badge tone={briefing.confirmation === 'documented' ? 'green' : 'red'}>
            {briefing.confirmation === 'documented' ? 'Bestätigt' : 'Bestätigung fehlt'}
          </Badge>
        </div>
      </Card>

      <div className="appointment-ops-grid">
        <Card>
          <div className="appointment-ops-fact"><UserRound size={18} /><div><small>Kontakt</small><strong>{briefing.contact ? `${briefing.contact.firstName} ${briefing.contact.lastName}` : 'Nicht zugeordnet'}</strong><span>{briefing.contact?.role ?? 'Rolle unbekannt'}</span></div></div>
          <div className="appointment-ops-fact"><Phone size={18} /><div><small>Kontaktdaten</small><strong>{briefing.contactDetails[0] ?? 'Nicht dokumentiert'}</strong><span>{briefing.contactDetails[1] ?? 'Keine weitere Kontaktangabe'}</span></div></div>
          <div className="appointment-ops-fact"><MapPin size={18} /><div><small>Ort</small><strong>{briefing.location ?? 'Nicht dokumentiert'}</strong><span>Keine Karten-API angebunden</span></div></div>
        </Card>
        <Card>
          <div className="appointment-ops-fact"><Building2 size={18} /><div><small>Objekt</small><strong>{briefing.propertyResolution.property?.title ?? 'Nicht eindeutig verknüpft'}</strong><span>{briefing.propertyResolution.status === 'ambiguous' ? `${briefing.propertyResolution.candidates.length} mögliche Objekte` : briefing.propertyResolution.property?.status ?? 'Keine belastbare Zuordnung'}</span></div></div>
          <div className="appointment-ops-fact"><CalendarClock size={18} /><div><small>Planungsannahmen</small><strong>{briefing.estimatedDurationMinutes} Min. Termin</strong><span>{briefing.estimatedPreparationMinutes} Min. Vorbereitung</span></div></div>
          <div className="appointment-ops-fact"><ClipboardList size={18} /><div><small>Unterlagen</small><strong>Nicht vollständig prüfbar</strong><span>{briefing.documentAssessment}</span></div></div>
        </Card>
      </div>

      <div className="appointment-ops-grid">
        <Card>
          <h3>Ziele und Gesprächsstand</h3>
          <dl className="appointment-ops-definition-list">
            <div><dt>Gesprächsziel</dt><dd>{briefing.goals.conversationGoal ?? 'Nicht dokumentiert'}</dd></div>
            <div><dt>Mindestziel</dt><dd>{briefing.goals.minimumGoal ?? 'Nicht dokumentiert'}</dd></div>
            <div><dt>Idealziel</dt><dd>{briefing.goals.idealGoal ?? 'Nicht dokumentiert'}</dd></div>
            <div><dt>Letzte Aktivität</dt><dd>{briefing.lastActivity ?? 'Nicht dokumentiert'}</dd></div>
          </dl>
        </Card>
        <Card>
          <h3>Einwände und offene Fragen</h3>
          <h4>Einwände</h4>
          {briefing.knownObjections.length > 0 ? <ul>{briefing.knownObjections.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="appointment-ops-muted">Keine ausdrücklich gekennzeichneten Einwände.</p>}
          <h4>Offene Fragen</h4>
          {briefing.goals.openQuestions.length > 0 ? <ul>{briefing.goals.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="appointment-ops-muted">Keine ausdrücklich gekennzeichneten offenen Fragen.</p>}
        </Card>
      </div>

      <Card>
        <h3>Vorbereitungsrisiken</h3>
        <div className="appointment-ops-issues">
          {briefing.issues.map((issue) => (
            <div key={issue.code} className={`appointment-ops-issue issue-${issue.severity}`}>
              {issue.severity === 'high' ? <ShieldAlert size={18} /> : issue.severity === 'medium' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <div><strong>{issue.title}</strong><span>{issue.detail}</span></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="appointment-ops-grid">
        <Card>
          <h3>Empfohlene Vorbereitung</h3>
          {briefing.recommendedPreparation.length > 0 ? <ol>{briefing.recommendedPreparation.map((item) => <li key={item}>{item}</li>)}</ol> : <p className="appointment-ops-muted">Keine zusätzlichen Hinweise.</p>}
        </Card>
        <Card>
          <h3>Offene Follow-ups</h3>
          {briefing.openFollowUps.length > 0 ? <ul>{briefing.openFollowUps.map((item) => <li key={item.id}><strong>{item.title}</strong> · {new Date(item.dueAt).toLocaleString('de-DE')}</li>)}</ul> : <p className="appointment-ops-muted">Keine offenen Follow-ups dokumentiert.</p>}
        </Card>
      </div>
    </div>
  );
}

function RouteView({ items }: { items: ReturnType<typeof buildAppointmentOperations>['route'] }) {
  if (items.length === 0) return <EmptyState title="Keine Termine für heute" text="Die lokale Tagesroute enthält keine gültigen Termine für den aktuellen Tag." />;
  return (
    <div className="appointment-ops-route">
      {items.map((item) => (
        <Card key={item.briefing.appointment.id} className="appointment-ops-route-card">
          <div className="appointment-ops-route-index">{item.chronologicalIndex}</div>
          <div>
            <strong>{item.briefing.startsAt?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</strong>
            <span>{item.briefing.estimatedPreparationMinutes} Min. Vorbereitung</span>
          </div>
          <div className="appointment-ops-route-main">
            <h3>{item.briefing.appointment.title}</h3>
            <p>{item.briefing.location ?? 'Ort unbekannt'} · {item.briefing.estimatedDurationMinutes} Min. Termin</p>
            <p>{item.estimatedTransferBufferMinutes} Min. Ortswechsel-Puffer · {item.recommendedPostAppointmentBufferMinutes} Min. Nachbereitung</p>
            {item.requiredCallback && <Badge tone="red">{item.requiredCallback}</Badge>}
            {item.conflictWithAppointmentIds.length > 0 && <Badge tone="red">Terminkonflikt</Badge>}
          </div>
          <small>{item.planningNotice}</small>
        </Card>
      ))}
    </div>
  );
}

export function AppointmentFieldOpsPage() {
  const store = useAppStore();
  const [now] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>('briefing');
  const [selectedId, setSelectedId] = useState<string>();
  const [debrief, setDebrief] = useState<DebriefDraft>(emptyDebrief);
  const [feedback, setFeedback] = useState('');

  const snapshot = useMemo(() => buildAppointmentOperations({
    appointments: store.appointments,
    contacts: store.contacts,
    properties: store.properties,
    followUps: store.followUps,
    callEvents: store.callEvents,
    now,
    sourceMode: store.cloudSync.status === 'offline' ? 'offline-mock' : 'workspace',
  }), [store.appointments, store.callEvents, store.cloudSync.status, store.contacts, store.followUps, store.properties, now]);

  const briefings = useMemo(
    () => [...snapshot.today, ...snapshot.future, ...snapshot.past, ...snapshot.invalid],
    [snapshot],
  );
  const selected = briefings.find((item) => item.appointment.id === selectedId) ?? briefings[0];
  const capabilities = getAppointmentCapabilities(store.currentUser.role);

  const select = (briefing: AppointmentBriefing) => {
    setSelectedId(briefing.appointment.id);
    setDebrief({ ...emptyDebrief(), dueAt: defaultDueAt(briefing) });
    setFeedback('');
  };

  const createFollowUp = (title: string, dueAt: string) => {
    if (!selected?.contact || !capabilities.canCreateFollowUp) return;
    store.addFollowUp({
      contactId: selected.contact.id,
      title,
      dueAt,
      priority: selected.priority,
      status: 'open',
      channel: 'phone',
    });
    setFeedback('Follow-up wurde über das vorhandene Store-Kommando angelegt.');
  };

  const createDebriefFollowUp = () => {
    if (!debrief.nextAction.trim() || !debrief.dueAt) return;
    createFollowUp(debrief.nextAction.trim(), new Date(debrief.dueAt).toISOString());
  };

  const movePipeline = () => {
    if (!selected?.contact || !debrief.pipelineStage || !capabilities.canMovePipeline) return;
    store.moveContactStage(selected.contact.id, debrief.pipelineStage);
    setFeedback(`Pipeline-Stufe wurde bewusst auf „${debrief.pipelineStage}“ gesetzt.`);
  };

  return (
    <div className="appointment-ops-page">
      <SectionHeader
        title="Termin-, Besichtigungs- und Außendienstzentrale"
        subtitle="Deterministische Vorbereitung, Tagesroute und Nachbereitung ohne erfundene Fakten oder parallele Persistenz."
        action={<Badge tone={snapshot.sourceMode === 'offline-mock' ? 'gold' : 'green'}>{snapshot.sourceMode === 'offline-mock' ? 'Offline-/Mock-Zustand' : 'Workspace-Daten'}</Badge>}
      />

      <div className="appointment-ops-kpis">
        <Card><CalendarClock size={20} /><div><strong>{snapshot.today.length}</strong><span>Termine heute</span></div></Card>
        <Card><ShieldAlert size={20} /><div><strong>{snapshot.highRiskCount}</strong><span>Termine mit hohem Risiko</span></div></Card>
        <Card><Phone size={20} /><div><strong>{snapshot.callbacksRequired}</strong><span>Bestätigungen / Rückrufe</span></div></Card>
        <Card><AlertTriangle size={20} /><div><strong>{snapshot.unresolvedTypeCount}</strong><span>Unklare Terminarten</span></div></Card>
      </div>

      <div className="appointment-ops-tabs" role="tablist" aria-label="Terminansichten">
        <button className={view === 'briefing' ? 'is-active' : ''} onClick={() => setView('briefing')}><ClipboardList size={17} /> Briefing</button>
        <button className={view === 'route' ? 'is-active' : ''} onClick={() => setView('route')}><Route size={17} /> Tagesroute</button>
        <button className={view === 'debrief' ? 'is-active' : ''} onClick={() => setView('debrief')}><MessageSquareText size={17} /> Nachbereitung</button>
        <button className={view === 'field' ? 'is-active' : ''} onClick={() => setView('field')}><MapPin size={17} /> Außendienstmodus</button>
      </div>

      {view === 'route' ? <RouteView items={snapshot.route} /> : (
        <div className="appointment-ops-layout">
          <aside className="appointment-ops-sidebar">
            <div className="appointment-ops-sidebar-header"><strong>Termine</strong><span>{briefings.length} gesamt</span></div>
            {briefings.length === 0 ? <EmptyState title="Keine Termine" text="Die Terminliste ist leer. Es werden keine Platzhaltertermine erzeugt." /> : (
              <>
                <AppointmentList label="Heute" items={snapshot.today} selectedId={selected?.appointment.id} onSelect={select} />
                <AppointmentList label="Demnächst" items={snapshot.future} selectedId={selected?.appointment.id} onSelect={select} />
                <AppointmentList label="Klärung erforderlich" items={[...snapshot.past, ...snapshot.invalid]} selectedId={selected?.appointment.id} onSelect={select} />
              </>
            )}
          </aside>

          <section className="appointment-ops-content">
            {!selected && <EmptyState title="Kein Termin ausgewählt" text="Sobald ein Termin vorhanden ist, erscheinen Briefing, Risiken und nächste Schritte." />}
            {selected && view === 'briefing' && <BriefingView briefing={selected} />}
            {selected && view === 'field' && <FieldOpsInspectionMode briefing={selected} canWrite={capabilities.canCreateFollowUp} onCreateFollowUp={createFollowUp} />}
            {selected && view === 'debrief' && (
              <div className="appointment-ops-stack">
                <Card className="appointment-ops-notice"><MessageSquareText size={20} /><div><strong>Lokaler Nachbereitungsentwurf</strong><span>Terminstatus, Ergebnis, Motivation, Einwände und Nachricht werden nicht konkurrierend persistiert. Nur ausdrücklich ausgelöste bestehende Store-Kommandos schreiben Daten.</span></div></Card>
                <div className="appointment-ops-grid">
                  <Card>
                    <h3>Termin und Ergebnis</h3>
                    <label className="appointment-ops-field"><span>Termin stattgefunden?</span><select value={debrief.occurred} onChange={(event) => setDebrief({ ...debrief, occurred: event.target.value as DebriefDraft['occurred'] })}><option value="unknown">Noch nicht festgelegt</option><option value="yes">Ja</option><option value="no">Nein</option></select></label>
                    <label className="appointment-ops-field"><span>Ergebnis</span><textarea rows={4} value={debrief.result} onChange={(event) => setDebrief({ ...debrief, result: event.target.value })} /></label>
                    <label className="appointment-ops-field"><span>Motivation</span><textarea rows={3} value={debrief.motivation} onChange={(event) => setDebrief({ ...debrief, motivation: event.target.value })} /></label>
                    <label className="appointment-ops-field"><span>Einwände</span><textarea rows={3} value={debrief.objections} onChange={(event) => setDebrief({ ...debrief, objections: event.target.value })} /></label>
                    <label className="appointment-ops-field"><span>Objektstatus betroffen?</span><input value={debrief.propertyImpact} onChange={(event) => setDebrief({ ...debrief, propertyImpact: event.target.value })} placeholder="Lokale Arbeitsnotiz" /></label>
                  </Card>
                  <Card>
                    <h3>Nächste Aktion</h3>
                    <label className="appointment-ops-field"><span>Nächste Aktion</span><input value={debrief.nextAction} onChange={(event) => setDebrief({ ...debrief, nextAction: event.target.value })} /></label>
                    <label className="appointment-ops-field"><span>Fälligkeit</span><input type="datetime-local" value={debrief.dueAt} onChange={(event) => setDebrief({ ...debrief, dueAt: event.target.value })} /></label>
                    <Button disabled={!capabilities.canCreateFollowUp || !selected.contact || !debrief.nextAction.trim() || !debrief.dueAt} onClick={createDebriefFollowUp}>Follow-up über Store anlegen</Button>
                    <label className="appointment-ops-field"><span>Pipeline-Stufe</span><select value={debrief.pipelineStage} onChange={(event) => setDebrief({ ...debrief, pipelineStage: event.target.value as PipelineStage })}><option value="">Keine Änderung</option><option value="lead">Lead</option><option value="qualified">Qualifiziert</option><option value="appointment">Termin</option><option value="mandate">Mandat</option><option value="sold">Verkauft</option></select></label>
                    <Button variant="secondary" disabled={!capabilities.canMovePipeline || !selected.contact || !debrief.pipelineStage} onClick={movePipeline}>Pipeline bewusst aktualisieren</Button>
                    <label className="appointment-ops-field"><span>Nachricht oder Rückruf vorbereiten</span><textarea rows={5} value={debrief.messageDraft} onChange={(event) => setDebrief({ ...debrief, messageDraft: event.target.value })} placeholder="Lokaler Entwurf – kein Versand" /></label>
                    {!capabilities.canCreateFollowUp && <p className="appointment-ops-readonly">Viewer bleiben vollständig lesend.</p>}
                  </Card>
                </div>
              </div>
            )}
            {feedback && <p className="appointment-ops-feedback">{feedback}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
