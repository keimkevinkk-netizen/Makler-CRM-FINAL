import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, ClipboardCheck, MapPin, Save, UserRound } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '../../components/ui';
import type { AppointmentBriefing } from '../../domain/appointments/appointmentOperations';

interface FieldOpsInspectionModeProps {
  briefing?: AppointmentBriefing;
  canWrite: boolean;
  onCreateFollowUp: (title: string, dueAt: string) => void;
}

function defaultFollowUpDate(briefing: AppointmentBriefing): string {
  const base = briefing.startsAt ? new Date(briefing.startsAt) : new Date();
  base.setDate(base.getDate() + 1);
  const offset = base.getTimezoneOffset() * 60_000;
  return new Date(base.getTime() - offset).toISOString().slice(0, 16);
}

export function FieldOpsInspectionMode({ briefing, canWrite, onCreateFollowUp }: FieldOpsInspectionModeProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCheckedItems({});
    setNotes('');
    setResult('');
    setNextAction('');
    setMessage('');
    setDueAt(briefing ? defaultFollowUpDate(briefing) : '');
  }, [briefing]);

  const completed = useMemo(
    () => briefing?.checklist.filter((_, index) => checkedItems[index]).length ?? 0,
    [briefing, checkedItems],
  );

  if (!briefing) {
    return <EmptyState title="Kein Termin ausgewählt" text="Wähle einen Termin aus, um den mobilen Außendienstmodus zu öffnen." />;
  }

  const createFollowUp = () => {
    if (!canWrite) {
      setMessage('Lesezugriff: Es werden keine Schreibaktionen angeboten.');
      return;
    }
    if (!briefing.contact) {
      setMessage('Ein Follow-up kann erst nach eindeutiger Kontaktzuordnung angelegt werden.');
      return;
    }
    if (!nextAction.trim() || !dueAt) {
      setMessage('Nächste Aktion und Fälligkeit sind erforderlich.');
      return;
    }
    onCreateFollowUp(nextAction.trim(), new Date(dueAt).toISOString());
    setMessage('Follow-up wurde über das vorhandene Store-Kommando angelegt. Notizen und Ergebnis bleiben lokale Entwürfe.');
  };

  return (
    <div className="field-ops-mode">
      <Card className="field-ops-goal-card">
        <div className="field-ops-kicker"><ClipboardCheck size={18} /> Mobiler Besichtigungsmodus <Badge tone="gold">lokaler Entwurf</Badge></div>
        <h2>{briefing.goals.conversationGoal ?? 'Kein ausdrückliches Terminziel dokumentiert'}</h2>
        <p>{briefing.goals.minimumGoal ? `Mindestziel: ${briefing.goals.minimumGoal}` : 'Mindestziel fehlt.'}</p>
        <div className="field-ops-progress"><span>{completed} / {briefing.checklist.length} vorbereitet</span><progress max={Math.max(briefing.checklist.length, 1)} value={completed} /></div>
      </Card>

      <div className="field-ops-grid">
        <Card>
          <div className="field-ops-fact"><UserRound size={18} /><div><small>Kontakt</small><strong>{briefing.contact ? `${briefing.contact.firstName} ${briefing.contact.lastName}` : 'Nicht zugeordnet'}</strong><span>{briefing.contact?.role ?? 'Rolle unbekannt'}</span></div></div>
          <div className="field-ops-fact"><Building2 size={18} /><div><small>Objekt</small><strong>{briefing.propertyResolution.property?.title ?? 'Nicht eindeutig verknüpft'}</strong><span>{briefing.propertyResolution.status === 'ambiguous' ? `${briefing.propertyResolution.candidates.length} mögliche Objekte` : briefing.propertyResolution.property?.status ?? 'Status unbekannt'}</span></div></div>
          <div className="field-ops-fact"><MapPin size={18} /><div><small>Ort</small><strong>{briefing.location ?? 'Nicht dokumentiert'}</strong><span>Keine Karten- oder Navigationsdaten angebunden</span></div></div>
        </Card>

        <Card>
          <h3>Vor-Ort-Checkliste</h3>
          <div className="field-ops-checklist">
            {briefing.checklist.map((item, index) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={Boolean(checkedItems[index])}
                  onChange={(event) => setCheckedItems((current) => ({ ...current, [index]: event.target.checked }))}
                />
                <span className="field-ops-checkbox"><Check size={14} /></span>
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="field-ops-grid">
        <Card>
          <h3>Offene Fragen</h3>
          {briefing.goals.openQuestions.length > 0
            ? <ul className="appointment-ops-list">{briefing.goals.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
            : <p className="appointment-ops-muted">Keine ausdrücklich gekennzeichneten offenen Fragen vorhanden.</p>}
          <label className="appointment-ops-field">
            <span>Vor-Ort-Notizen</span>
            <textarea rows={7} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Lokaler Arbeitsentwurf – wird nicht automatisch gespeichert" />
          </label>
        </Card>

        <Card>
          <h3>Ergebnis und nächste Aktion</h3>
          <label className="appointment-ops-field">
            <span>Ergebnis</span>
            <textarea rows={3} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Was wurde konkret erreicht?" />
          </label>
          <label className="appointment-ops-field">
            <span>Nächste Aktion</span>
            <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Konkreter nächster Schritt" />
          </label>
          <label className="appointment-ops-field">
            <span>Fälligkeit</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>
          <Button onClick={createFollowUp} disabled={!canWrite || !briefing.contact}><Save size={17} /> Follow-up anlegen</Button>
          {!canWrite && <p className="appointment-ops-readonly">Viewer bleiben vollständig lesend.</p>}
          {message && <p className="appointment-ops-feedback">{message}</p>}
        </Card>
      </div>
    </div>
  );
}
