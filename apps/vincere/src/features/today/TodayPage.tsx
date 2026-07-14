import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Crosshair,
  FastForward,
  LockKeyhole,
  Mail,
  Phone,
  RotateCcw,
  Sparkles,
  Target,
  UserRoundSearch,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import {
  buildDailyExecutionPlan,
  getExecutionCapabilities,
  type PrioritizedAction,
} from '../../domain/next-best-action/engine';
import type { Contact } from '../../types/domain';
import { FocusMode } from '../followups/FocusMode';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ungültiger Zeitpunkt';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function urgencyTone(urgency: PrioritizedAction['urgency']): 'red' | 'gold' | 'blue' | 'neutral' {
  if (urgency === 'critical') return 'red';
  if (urgency === 'high') return 'gold';
  if (urgency === 'normal') return 'blue';
  return 'neutral';
}

function channelLabel(channel: PrioritizedAction['channel']): string {
  if (channel === 'phone') return 'Telefon';
  if (channel === 'email') return 'E-Mail';
  if (channel === 'meeting') return 'Termin';
  return 'Planung';
}

function channelIcon(channel: PrioritizedAction['channel']) {
  if (channel === 'phone') return <Phone size={15} />;
  if (channel === 'email') return <Mail size={15} />;
  return <CalendarDays size={15} />;
}

function PriorityCard({
  action,
  contact,
  rank,
  onFocus,
}: {
  action: PrioritizedAction;
  contact?: Contact;
  rank?: number;
  onFocus: (actionId: string) => void;
}) {
  return (
    <article className={`intelligence-action urgency-${action.urgency}`}>
      <div className="intelligence-action-rank">{rank ?? <Sparkles size={16} />}</div>
      <div className="intelligence-action-main">
        <div className="intelligence-action-meta">
          <Badge tone={urgencyTone(action.urgency)}>{action.score} Punkte</Badge>
          <span>{channelIcon(action.channel)} {channelLabel(action.channel)}</span>
          {action.relatedFollowUpIds.length > 1 && <span>{action.relatedFollowUpIds.length} Follow-ups gebündelt</span>}
        </div>
        <h3>{action.title}</h3>
        <p>{action.reason}</p>
        <small>{contact ? `${contact.role} · ${contact.city} · Potenzial ${contact.potential}/100` : 'Kontaktbezug fehlt'}</small>
        {action.blockedReason && <div className="inline-warning"><LockKeyhole size={14} /> {action.blockedReason}</div>}

        <details className="priority-explanation">
          <summary>Priorisierung nachvollziehen</summary>
          <div className="score-factor-list">
            {action.factors.map((factor) => (
              <div key={factor.key}>
                <span><strong>{factor.label}</strong><small>{factor.detail}</small></span>
                <b className={factor.points < 0 ? 'negative' : ''}>{factor.points > 0 ? '+' : ''}{factor.points}</b>
              </div>
            ))}
          </div>
          {action.missingSignals.length > 0 && (
            <div className="explanation-block"><strong>Fehlende Faktoren</strong><ul>{action.missingSignals.map((item) => <li key={item}>{item}</li>)}</ul></div>
          )}
          <div className="explanation-columns">
            <div><strong>Verschiebt nach oben</strong><ul>{action.movesUp.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>Verschiebt nach unten</strong><ul>{action.movesDown.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </details>
      </div>
      <div className="intelligence-action-buttons">
        <Button disabled={Boolean(action.blockedReason)} onClick={() => onFocus(action.id)}><Crosshair size={16} /> Fokus</Button>
        {!action.blockedReason && action.channel === 'phone' && contact?.phone && <Link className="button button-secondary" to={`/phone?contact=${contact.id}`}><Phone size={16} /> Gespräch</Link>}
      </div>
    </article>
  );
}

export function TodayPage() {
  const store = useAppStore();
  const [now] = useState(() => Date.now());
  const [focusActionId, setFocusActionId] = useState<string | undefined>(undefined);
  const capabilities = getExecutionCapabilities(store.currentUser.role);
  const plan = useMemo(() => buildDailyExecutionPlan(store, now), [store, now]);
  const contactsById = useMemo(() => new Map(store.contacts.map((contact) => [contact.id, contact])), [store.contacts]);

  const startFocus = (actionId?: string) => {
    const nextActionId = actionId ?? plan.actions[0]?.id;
    if (nextActionId) setFocusActionId(nextActionId);
  };

  return (
    <div className="page-stack execution-page">
      <Card className="hero-card execution-hero">
        <div>
          <span className="eyebrow"><Target size={15} /> Daily Execution Engine</span>
          <h1>Heute zählt die richtige Reihenfolge.</h1>
          <p>Die Priorisierung basiert ausschließlich auf vorhandenen Follow-ups, Kontaktdaten, Pipeline-Stufen, Aktivitäten, Terminen und Immobilienbezügen. Der Prioritätswert ist keine Abschlusswahrscheinlichkeit.</p>
          <div className="hero-actions">
            <Button disabled={plan.actions.length === 0} onClick={() => startFocus()}><Crosshair size={17} /> Fokusmodus starten</Button>
            {capabilities.readOnly && <span className="read-only-note"><LockKeyhole size={15} /> Lesezugriff aktiv</span>}
          </div>
        </div>
        <div className="daily-goal-card">
          <small>Tagesziel</small>
          <strong>{plan.progress.completed}/{plan.progress.target}</strong>
          <span>{plan.progress.label}</span>
          <div className="execution-progress" aria-label={`${plan.progress.percent} Prozent Tagesfortschritt`}><i style={{ width: `${plan.progress.percent}%` }} /></div>
          <em>{plan.progress.percent}% umgesetzt</em>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Top-3-Aktionen"
          subtitle="Die heute voraussichtlich wertvollste Reihenfolge nach belegbaren Signalen"
          action={<Badge tone="gold">Stand {new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(now))}</Badge>}
        />
        <div className="intelligence-action-list top-action-list">
          {plan.topActions.length > 0
            ? plan.topActions.map((action, index) => <PriorityCard key={action.id} action={action} contact={contactsById.get(action.contactId)} rank={index + 1} onFocus={startFocus} />)
            : <EmptyState title="Keine priorisierte Aktion" text="Alle offenen Datensignale sind abgearbeitet oder es fehlen ausführbare Kontakte." />}
        </div>
      </Card>

      <div className="execution-summary-grid">
        <Card className="execution-summary-card">
          <SectionHeader title="Überfällige Follow-ups" subtitle={`${plan.overdueFollowUps.length} offene Aufgaben mit überschrittener Fälligkeit`} />
          <div className="execution-compact-list">
            {plan.overdueFollowUps.length > 0 ? plan.overdueFollowUps.slice(0, 6).map(({ followUp, contact, overdueHours }) => (
              <div key={followUp.id}>
                <span className="summary-icon danger"><AlertTriangle size={16} /></span>
                <span><strong>{followUp.title}</strong><small>{contact ? `${contact.firstName} ${contact.lastName}` : 'Kontakt fehlt'} · {Math.ceil(overdueHours / 24)} Tag(e) überfällig</small></span>
                <div className="row-actions">
                  <Button variant="ghost" title="Morgen" disabled={!capabilities.canManageFollowUps} onClick={() => store.rescheduleFollowUp(followUp.id, new Date(now + 86_400_000).toISOString())}><RotateCcw size={15} /></Button>
                  <Button variant="secondary" disabled={!capabilities.canManageFollowUps} onClick={() => store.completeFollowUp(followUp.id)}><Check size={15} /> Erledigt</Button>
                </div>
              </div>
            )) : <EmptyState title="Nichts überfällig" text="Aktuell ist kein offenes Follow-up über seinem Fälligkeitszeitpunkt." />}
          </div>
        </Card>

        <Card className="execution-summary-card">
          <SectionHeader title="Schnelle Erfolge" subtitle="Ausführbare Aktionen mit höchstens fünf Minuten Aufwand" />
          <div className="execution-compact-list">
            {plan.quickWins.length > 0 ? plan.quickWins.map((action) => {
              const contact = contactsById.get(action.contactId);
              return <button type="button" key={action.id} onClick={() => startFocus(action.id)}><span className="summary-icon success"><FastForward size={16} /></span><span><strong>{action.title}</strong><small>{contact?.city ?? 'Ort fehlt'} · {action.score} Punkte</small></span><ArrowRight size={16} /></button>;
            }) : <EmptyState title="Keine schnellen Erfolge" text="Die vorhandenen Aktionen benötigen derzeit mehr Vorbereitung oder sind blockiert." />}
          </div>
        </Card>

        <Card className="execution-summary-card">
          <SectionHeader title="Wichtige Eigentümerkontakte" subtitle="Eigentümer mit den stärksten aktuellen Vertriebs- und Dringlichkeitssignalen" />
          <div className="execution-compact-list">
            {plan.importantOwnerActions.length > 0 ? plan.importantOwnerActions.map((action) => {
              const contact = contactsById.get(action.contactId);
              return <button type="button" key={action.id} onClick={() => startFocus(action.id)}><span className="summary-icon gold"><UserRoundSearch size={16} /></span><span><strong>{contact?.firstName} {contact?.lastName}</strong><small>{action.title} · {action.score} Punkte</small></span><ArrowRight size={16} /></button>;
            }) : <EmptyState title="Keine Eigentümeraktion" text="Derzeit liegt keine priorisierte Aktion für einen Eigentümerkontakt vor." />}
          </div>
        </Card>
      </div>

      <div className="two-column-layout execution-detail-grid">
        <Card>
          <SectionHeader title="Weitere priorisierte Aktionen" subtitle="Nach den Top-3 in stabiler Reihenfolge abarbeiten" />
          <div className="intelligence-action-list compact-action-list">
            {plan.additionalActions.length > 0
              ? plan.additionalActions.slice(0, 8).map((action) => <PriorityCard key={action.id} action={action} contact={contactsById.get(action.contactId)} onFocus={startFocus} />)
              : <EmptyState title="Keine weiteren Aktionen" text="Die aktuelle Warteschlange besteht nur aus den Top-Aktionen." />}
          </div>
        </Card>

        <div className="page-stack">
          <Card>
            <SectionHeader title="Bevorstehende Termine" subtitle="Vergangene Termine werden nicht als aktuelle Dringlichkeit gewertet" />
            <div className="execution-compact-list">
              {plan.upcomingAppointments.length > 0 ? plan.upcomingAppointments.map((appointment) => {
                const contact = appointment.contactId ? contactsById.get(appointment.contactId) : undefined;
                return <div key={appointment.id}><span className="summary-icon blue"><Clock3 size={16} /></span><span><strong>{appointment.title}</strong><small>{formatDateTime(appointment.startsAt)}{contact ? ` · ${contact.firstName} ${contact.lastName}` : ''}</small></span><Badge tone={appointment.status === 'now' ? 'red' : 'blue'}>{appointment.status === 'now' ? 'JETZT' : 'GEPLANT'}</Badge></div>;
              }) : <EmptyState title="Keine Termine innerhalb 48 Stunden" text="Aktuell ist kein zukünftiger Termin im Priorisierungsfenster vorhanden." />}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Kontakte ohne nächste Aktion" subtitle="Potenzial darf nicht ohne verbindlichen nächsten Schritt liegen bleiben" />
            <div className="execution-compact-list">
              {plan.contactsWithoutNextAction.length > 0 ? plan.contactsWithoutNextAction.slice(0, 8).map((contact) => {
                const action = plan.actions.find((item) => item.contactId === contact.id);
                return <button type="button" key={contact.id} onClick={() => action && startFocus(action.id)}><span className={`initials priority-${contact.priority}`}>{contact.firstName[0]}{contact.lastName[0]}</span><span><strong>{contact.firstName} {contact.lastName}</strong><small>{contact.role} · Potenzial {contact.potential}/100</small></span><ArrowRight size={16} /></button>;
              }) : <EmptyState title="Alle Kontakte abgesichert" text="Jeder relevante Kontakt besitzt ein offenes Follow-up, eine zukünftige Aktion oder einen Termin." />}
            </div>
          </Card>
        </div>
      </div>

      {focusActionId && <FocusMode actions={plan.actions} initialActionId={focusActionId} onClose={() => setFocusActionId(undefined)} />}
    </div>
  );
}
