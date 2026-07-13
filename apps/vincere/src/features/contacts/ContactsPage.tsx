import { useMemo, useState } from 'react';
import { Mail, Phone, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, Modal, SectionHeader } from '../../components/ui';
import { ContactForm } from './ContactForm';

export function ContactsPage() {
  const { contacts } = useAppStore();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const filtered = useMemo(() => contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.city} ${contact.role}`.toLowerCase().includes(query.toLowerCase())), [contacts, query]);

  return <div className="page-stack">
    <Card>
      <SectionHeader title="Kontakte" subtitle={`${contacts.length} zentrale Beziehungen im Vertriebssystem`} action={<Button onClick={() => setFormOpen(true)}><Plus size={17} /> Kontakt</Button>} />
      <div className="table-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Ort oder Rolle suchen" /></div><Button variant="secondary"><SlidersHorizontal size={17} /> Filter</Button></div>
      <div className="data-table contacts-table">
        <div className="table-head"><span>Kontakt</span><span>Rolle</span><span>Phase</span><span>Potenzial</span><span>Ort</span><span>Aktion</span></div>
        {filtered.map((contact) => <div className="table-row" key={contact.id}><span className="contact-cell"><i className={`initials priority-${contact.priority}`}>{contact.firstName[0]}{contact.lastName[0]}</i><span><strong>{contact.firstName} {contact.lastName}</strong><small>{contact.source}</small></span></span><span>{contact.role}</span><span><Badge tone={contact.stage === 'appointment' ? 'gold' : contact.stage === 'qualified' ? 'blue' : 'neutral'}>{contact.stage}</Badge></span><span><strong>{contact.potential}%</strong></span><span>{contact.city}</span><span className="row-actions"><a className="icon-button" href={`tel:${contact.phone}`}><Phone size={16} /></a>{contact.email && <a className="icon-button" href={`mailto:${contact.email}`}><Mail size={16} /></a>}<Link className="button button-secondary" to={`/phone?contact=${contact.id}`}>Öffnen</Link></span></div>)}
      </div>
    </Card>
    {formOpen && <Modal title="Neuen Kontakt erfassen" onClose={() => setFormOpen(false)}><ContactForm onDone={() => setFormOpen(false)} /></Modal>}
  </div>;
}
