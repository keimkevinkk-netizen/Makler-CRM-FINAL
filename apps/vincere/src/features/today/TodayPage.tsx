import { useState } from 'react';
import { Check, Clock3, Phone, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { getNextBestActions } from '../../lib/scoring';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';

export function TodayPage() {
  const state = useAppStore();
  const [now] = useState(() => Date.now());
  const actions = getNextBestActions(state);

  return (
    <div className="page-stack">
      <Card className="hero-card">
        <div><span className="eyebrow">Tagesführung</span><h1>Heute gewinnen Sie durch konsequente Ausführung.</h1><p>VINCERE priorisiert nicht nach Lautstärke, sondern nach Abschlusswahrscheinlichkeit, Dringlichkeit und strategischem Wert.</p></div>
        <div className="hero-score"><small>Tagesfokus</small><strong>{Math.min(100, 42 + state.callEvents.length * 8)}%</strong><span>{state.callEvents.length} Gespräche dokumentiert</span></div>
      </Card>

      <div className="two-column-layout">
        <Card>
          <SectionHeader title="Nächste beste Aktionen" subtitle="In dieser Reihenfolge abarbeiten" />
          <div className="action-queue">
            {actions.map((action, index) => {
              const contact = state.contacts.find((item) => item.id === action.contactId);
              return <div className="action-card" key={action.id}><span className="rank">{index + 1}</span><div><strong>{action.title}</strong><p>{action.reason}</p><small>{contact?.phone} · {contact?.city}</small></div><Link className="button button-primary" to={`/phone?contact=${action.contactId}`}><Phone size={16} /> Gespräch starten</Link></div>;
            })}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Follow-up-Zentrale" subtitle="Überfällig, heute und demnächst" />
          <div className="followup-board">
            {state.followUps.filter((item) => item.status === 'open').map((item) => {
              const contact = state.contacts.find((c) => c.id === item.contactId);
              const overdue = new Date(item.dueAt).getTime() < now;
              return <div className="followup-item" key={item.id}><div><strong>{item.title}</strong><span>{contact?.firstName} {contact?.lastName} · {contact?.city}</span></div><Badge tone={overdue ? 'red' : 'gold'}>{overdue ? 'Überfällig' : 'Geplant'}</Badge><div className="row-actions"><Button variant="ghost" title="Morgen" onClick={() => state.rescheduleFollowUp(item.id, new Date(Date.now() + 86_400_000).toISOString())}><RotateCcw size={16} /></Button><Button variant="secondary" onClick={() => state.completeFollowUp(item.id)}><Check size={16} /> Erledigt</Button></div></div>;
            })}
          </div>
        </Card>
      </div>
      <Card>
        <SectionHeader title="Zeitblöcke" subtitle="Vorgeschlagene Arbeitsstruktur" />
        <div className="time-blocks"><div><Clock3 /><strong>08:30–10:30</strong><span>Akquise & Rückrufe</span></div><div><Clock3 /><strong>10:45–12:00</strong><span>Eigentümergespräche</span></div><div><Clock3 /><strong>13:00–15:00</strong><span>Termine & Bewertungen</span></div><div><Clock3 /><strong>15:15–17:00</strong><span>Follow-ups & Netzwerk</span></div></div>
      </Card>
    </div>
  );
}
