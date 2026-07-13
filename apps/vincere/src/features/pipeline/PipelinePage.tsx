import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Card, SectionHeader } from '../../components/ui';
import type { ContactStage } from '../../types/domain';

const stages: { id: ContactStage; label: string; subtitle: string }[] = [
  { id: 'lead', label: 'Neue Chancen', subtitle: 'Noch nicht qualifiziert' },
  { id: 'qualified', label: 'Qualifiziert', subtitle: 'Bedarf bestätigt' },
  { id: 'appointment', label: 'Termin', subtitle: 'Bewertung oder Beratung' },
  { id: 'mandate', label: 'Auftrag', subtitle: 'Maklervertrag aktiv' },
  { id: 'sold', label: 'Verkauft', subtitle: 'Erfolgreich abgeschlossen' },
];

export function PipelinePage() {
  const store = useAppStore();
  return <div className="page-stack"><Card><SectionHeader title="Vertriebspipeline" subtitle="Jede Chance besitzt eine klare Phase und einen nächsten Schritt" /><div className="pipeline-board">{stages.map((stage, index) => <div className="pipeline-column" key={stage.id}><div className="pipeline-column-head"><div><strong>{stage.label}</strong><small>{stage.subtitle}</small></div><Badge>{store.contacts.filter((c) => c.stage === stage.id).length}</Badge></div><div className="pipeline-cards">{store.contacts.filter((contact) => contact.stage === stage.id).map((contact) => <article key={contact.id}><div className="pipeline-card-top"><span className={`initials priority-${contact.priority}`}>{contact.firstName[0]}{contact.lastName[0]}</span><Badge tone={contact.potential >= 80 ? 'red' : contact.potential >= 65 ? 'gold' : 'neutral'}>{contact.potential}%</Badge></div><strong>{contact.firstName} {contact.lastName}</strong><span>{contact.role} · {contact.city}</span><p>{contact.notes}</p><div className="pipeline-actions"><Link to={`/phone?contact=${contact.id}`} className="icon-button"><Phone size={16} /></Link>{index < stages.length - 1 && <button className="button button-secondary" onClick={() => store.moveContactStage(contact.id, stages[index + 1].id)}>Weiter <ArrowRight size={15} /></button>}</div></article>)}</div></div>)}</div></Card></div>;
}
