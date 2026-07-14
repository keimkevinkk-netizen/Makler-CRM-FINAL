import { useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  LockKeyhole,
  Mail,
  Phone,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button } from '../../components/ui';
import {
  getExecutionCapabilities,
  type PrioritizedAction,
} from '../../domain/next-best-action/engine';
import type { CallEvent, FollowUp } from '../../types/domain';

interface FocusModeProps {
  actions: PrioritizedAction[];
  initialActionId?: string;
  onClose: () => void;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Keine Fälligkeit';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ungültige Fälligkeit';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function toLocalInputValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toneForUrgency(urgency: PrioritizedAction['urgency']): 'red' | 'gold' | 'blue' | 'neutral' {
  if (urgency === 'critical') return 'red';
  if (urgency === 'high') return 'gold';
  if (urgency === 'normal') return 'blue';
  return 'neutral';
}

function channelIcon(channel: PrioritizedAction['channel']) {
  if (channel === 'phone') return <Phone size={17} />;
  if (channel === 'email') return <Mail size={17} />;
  return <CalendarClock size={17} />;
}

export function FocusMode({ actions, initialActionId, onClose }: FocusModeProps) {
  const store = useAppStore();
  const capabilities = getExecutionCapabilities(store.currentUser.role);
  const [dismissedActionIds, setDismissedActionIds] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [outcome, setOutcome] = useState<CallEvent['outcome']>('conversation');
  const [note, setNote] = useState('');
  const [rescheduleAt, setRescheduleAt] = useState(() => toLocalInputValue(new Date(Date.now() + 86_400_000)));
  const [error, setError] = useState<string | undefined>(undefined);

  const orderedActions = useMemo(() => {
    if (!initialActionId) return actions;
    const selected = actions.find((action) => action.id === initialActionId);
    if (!selected) return actions;
    return [selected, ...actions.filter((action) => action.id !== initialActionId)];
  }, [actions, initialActionId]);

  const action = orderedActions.find((item) => !dismissedActionIds.includes(item.id));
  const contact = action ? store.contacts.find((item) => item.id === action.contactId) : undefined;
  const remaining = orderedActions.filter((item) => !dismissedActionIds.includes(item.id)).length;

  const advance = (actionId: string) => {
    setDismissedActionIds((current) => [...current, actionId]);
    setStarted(false);
    setOutcome('conversation');
    setNote('');
    setError(undefined);
  };

  const saveOutcome = () => {
    if (!action || !contact || !capabilities.canLogCalls) return;
    try {
      store.logCall({ contactId: contact.id, outcome, note: note.trim() || undefined });
      if (outcome === 'appointment' && capabilities.canMovePipeline) {
        store.moveContactStage(contact.id, 'appointment');
      }
      if (action.followUpId && capabilities.canManageFollowUps) {
        store.completeFollowUp(action.followUpId);
      }
      advance(action.id);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Das Ergebnis konnte nicht gespeichert werden.');
    }
  };

  const completeFollowUp = () => {
    if (!action?.followUpId || !capabilities.canManageFollowUps) return;
    try {
      store.completeFollowUp(action.followUpId);
      advance(action.id);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Das Follow-up konnte nicht erledigt werden.');
    }
  };

  const reschedule = () => {
    if (!action || !contact || !capabilities.canManageFollowUps) return;
    const dueAt = new Date(rescheduleAt);
    if (Number.isNaN(dueAt.getTime())) {
      setError('Bitte einen gültigen Zeitpunkt wählen.');
      return;
    }

    try {
      if (action.followUpId) {
        store.rescheduleFollowUp(action.followUpId, dueAt.toISOString());
      } else {
        const channel: FollowUp['channel'] = action.channel === 'email'
          ? 'email'
          : action.channel === 'meeting'
            ? 'meeting'
            : 'phone';
        store.addFollowUp({
          contactId: contact.id,
          title: `Nächster Kontakt: ${contact.firstName} ${contact.lastName}`,
          dueAt: dueAt.toISOString(),
          priority: contact.priority,
          status: 'open',
          channel,
        });
      }
      advance(action.id);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Das Follow-up konnte nicht neu terminiert werden.');
    }
  };

  return (
    <div className="focus-mode-backdrop" role="presentation">
      <section className="focus-mode" role="dialog" aria-modal="true" aria-label="VINCERE Fokusmodus">
        <header className="focus-mode-header">
          <div>
            <span className="eyebrow">Fokusmodus</span>
            <strong>{remaining > 0 ? `${remaining} priorisierte ${remaining === 1 ? 'Aktion' : 'Aktionen'} verbleiben` : 'Tagesfokus abgeschlossen'}</strong>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fokusmodus schließen"><X size={19} /></button>
        </header>

        {!action ? (
          <div className="focus-complete-state">
            <CheckCircle2 size={48} />
            <h2>Die priorisierte Warteschlange ist abgearbeitet.</h2>
            <p>Neue Aktionen entstehen ausschließlich aus den vorhandenen Kontakt-, Follow-up-, Termin- und Gesprächsdaten.</p>
            <Button onClick={onClose}>Fokusmodus schließen</Button>
          </div>
        ) : (
          <div className="focus-mode-content">
            <div className="focus-action-summary">
              <div className="focus-action-topline">
                <Badge tone={toneForUrgency(action.urgency)}>{action.score} Prioritätspunkte</Badge>
                <span>{formatDateTime(action.dueAt)}</span>
              </div>
              <div className="focus-channel-icon">{channelIcon(action.channel)}</div>
              <span className="eyebrow">Nächste beste Aktion</span>
              <h1>{action.title}</h1>
              <p>{action.reason}</p>

              {contact && (
                <dl className="focus-contact-data">
                  <div><dt>Kontakt</dt><dd>{contact.firstName} {contact.lastName}</dd></div>
                  <div><dt>Rolle</dt><dd>{contact.role}</dd></div>
                  <div><dt>Ort</dt><dd>{contact.city}</dd></div>
                  <div><dt>Kanal</dt><dd>{action.channel === 'phone' ? 'Telefon' : action.channel === 'email' ? 'E-Mail' : action.channel === 'meeting' ? 'Termin' : 'Planung'}</dd></div>
                </dl>
              )}

              {action.blockedReason && <div className="focus-warning"><LockKeyhole size={17} /> {action.blockedReason}</div>}
              {capabilities.readOnly && <div className="focus-warning"><LockKeyhole size={17} /> Lesezugriff: Aktionen können geprüft, aber nicht verändert werden.</div>}

              <details className="priority-explanation" open>
                <summary>Warum diese Aktion?</summary>
                <div className="score-factor-list">
                  {action.factors.map((factor) => (
                    <div key={factor.key}>
                      <span><strong>{factor.label}</strong><small>{factor.detail}</small></span>
                      <b className={factor.points < 0 ? 'negative' : ''}>{factor.points > 0 ? '+' : ''}{factor.points}</b>
                    </div>
                  ))}
                </div>
                {action.missingSignals.length > 0 && (
                  <div className="explanation-block"><strong>Fehlende Signale</strong><ul>{action.missingSignals.map((signal) => <li key={signal}>{signal}</li>)}</ul></div>
                )}
                <div className="explanation-columns">
                  <div><strong>Würde nach oben verschieben</strong><ul>{action.movesUp.map((hint) => <li key={hint}>{hint}</li>)}</ul></div>
                  <div><strong>Würde nach unten verschieben</strong><ul>{action.movesDown.map((hint) => <li key={hint}>{hint}</li>)}</ul></div>
                </div>
              </details>
            </div>

            <div className="focus-execution-panel">
              {!started ? (
                <>
                  <span className="eyebrow">Ausführung</span>
                  <h2>{action.actionLabel}</h2>
                  <p>Der Fokusmodus hält den Kontext offen und führt nach Abschluss direkt zur nächsten priorisierten Aktion.</p>
                  <div className="focus-primary-actions">
                    {action.channel === 'phone' && contact?.phone && (capabilities.readOnly
                      ? <Button disabled><Phone size={17} /> {contact.phone}</Button>
                      : <a className="button button-primary" href={`tel:${contact.phone}`} onClick={() => setStarted(true)}><Phone size={17} /> {contact.phone}</a>)}
                    {action.channel === 'email' && contact?.email && (capabilities.readOnly
                      ? <Button disabled><Mail size={17} /> E-Mail öffnen</Button>
                      : <a className="button button-primary" href={`mailto:${contact.email}`} onClick={() => setStarted(true)}><Mail size={17} /> E-Mail öffnen</a>)}
                    {(action.channel === 'meeting' || action.channel === 'planning') && <Button disabled={Boolean(action.blockedReason) || capabilities.readOnly} onClick={() => setStarted(true)}>{channelIcon(action.channel)} Aktion starten</Button>}
                    {(action.channel === 'phone' || action.channel === 'email') && (
                      <Button variant="secondary" disabled={Boolean(action.blockedReason) || capabilities.readOnly} onClick={() => setStarted(true)}>Ergebnis erfassen <ArrowRight size={16} /></Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="eyebrow">Gesprächsergebnis</span>
                  <h2>Ergebnis sichern</h2>
                  <label>Ergebnis
                    <select value={outcome} onChange={(event: ChangeEvent<HTMLSelectElement>) => setOutcome(event.target.value as CallEvent['outcome'])}>
                      <option value="conversation">Gespräch geführt</option>
                      <option value="appointment">Termin vereinbart</option>
                      <option value="no_answer">Nicht erreicht</option>
                      <option value="not_interested">Kein Interesse</option>
                    </select>
                  </label>
                  <label>Notiz
                    <textarea rows={5} value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder="Motivation, Einwand, Signal und nächster Schritt …" />
                  </label>
                  <Button disabled={!capabilities.canLogCalls} onClick={saveOutcome}><Save size={16} /> Speichern und nächste Aktion</Button>
                </>
              )}

              <div className="focus-secondary-actions">
                {action.followUpId && <Button variant="secondary" disabled={!capabilities.canManageFollowUps} onClick={completeFollowUp}><Check size={16} /> Ohne Gespräch erledigen</Button>}
                <label>Neu terminieren
                  <input type="datetime-local" value={rescheduleAt} onChange={(event: ChangeEvent<HTMLInputElement>) => setRescheduleAt(event.target.value)} />
                </label>
                <Button variant="ghost" disabled={!capabilities.canManageFollowUps || Boolean(action.blockedReason)} onClick={reschedule}><RotateCcw size={16} /> Verschieben und weiter</Button>
              </div>

              {action.relatedFollowUpIds.length > 1 && <small className="focus-note">Diese Kontaktaktion bündelt {action.relatedFollowUpIds.length} offene Follow-ups. Erledigt oder verschoben wird nur das primäre Follow-up.</small>}
              {error && <div className="focus-error">{error}</div>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
