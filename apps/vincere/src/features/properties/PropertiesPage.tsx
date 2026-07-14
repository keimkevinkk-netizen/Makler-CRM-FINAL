import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  Phone,
  Plus,
  Search,
  Target,
  UserRound,
} from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { can } from '../../auth/permissions';
import { Badge, Button, Card, EmptyState, Modal, SectionHeader } from '../../components/ui';
import type { Property } from '../../types/domain';
import {
  buildPropertyOpportunities,
  filterPropertyOpportunities,
  summarizePropertyPortfolio,
  type PropertyFilters,
  type PropertyOpportunity,
} from './propertyIntelligence';
import './property-cockpit.css';

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const statusTone = (status: Property['status']) => {
  if (status === 'Vermarktung') return 'green' as const;
  if (status === 'Bewertung') return 'gold' as const;
  if (status === 'Akquise') return 'red' as const;
  return 'neutral' as const;
};

interface PropertyForm {
  title: string;
  address: string;
  city: string;
  type: string;
  status: Property['status'];
  estimatedValue: number;
  ownerContactId: string;
}

const initialForm: PropertyForm = {
  title: '',
  address: '',
  city: '',
  type: 'Einfamilienhaus',
  status: 'Akquise',
  estimatedValue: 0,
  ownerContactId: '',
};

const initialFilters: PropertyFilters = {
  query: '',
  status: 'all',
  type: 'all',
  city: 'all',
  sort: 'action',
};

function nextBusinessFollowUp() {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(9, 0, 0, 0);
  return due.toISOString();
}

export function PropertiesPage() {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string>();
  const [message, setMessage] = useState('');
  const canWrite = can(store.currentUser, 'properties:write');

  const opportunities = useMemo(() => buildPropertyOpportunities(store.properties, {
    contacts: store.contacts,
    followUps: store.followUps,
    appointments: store.appointments,
  }), [store.appointments, store.contacts, store.followUps, store.properties]);

  const summary = useMemo(() => summarizePropertyPortfolio(opportunities), [opportunities]);
  const filtered = useMemo(() => filterPropertyOpportunities(opportunities, filters), [filters, opportunities]);
  const selected = filtered.find((item) => item.property.id === selectedId) ?? filtered[0];
  const cities = useMemo(() => [...new Set(opportunities.map((item) => item.property.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')), [opportunities]);
  const types = useMemo(() => [...new Set(opportunities.map((item) => item.property.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')), [opportunities]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      store.addProperty({
        title: form.title.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        type: form.type,
        status: form.status,
        estimatedValue: Math.max(0, form.estimatedValue),
        ownerContactId: form.ownerContactId || undefined,
      });
      setForm(initialForm);
      setOpen(false);
      setMessage('Immobilie wurde angelegt und in die Vertriebssteuerung aufgenommen.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Die Immobilie konnte nicht angelegt werden.');
    }
  };

  const createFollowUp = (item: PropertyOpportunity) => {
    if (!item.owner) {
      setMessage('Vor einem Follow-up muss ein Eigentümer verknüpft sein.');
      return;
    }
    if (item.openFollowUps.length > 0) {
      setMessage('Für diesen Eigentümer existiert bereits ein offenes Follow-up.');
      return;
    }
    try {
      store.addFollowUp({
        contactId: item.owner.id,
        title: `${item.property.title}: ${item.recommendedAction}`,
        dueAt: nextBusinessFollowUp(),
        priority: item.actionScore >= 70 ? 'high' : 'medium',
        status: 'open',
        channel: 'phone',
      });
      setMessage('Eigentümer-Follow-up wurde für morgen um 09:00 Uhr angelegt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Das Follow-up konnte nicht angelegt werden.');
    }
  };

  return (
    <div className="page-stack pv-page">
      <Card className="pv-hero">
        <div>
          <span className="eyebrow">Objektvertrieb</span>
          <h1>Immobilien werden nach Handlungswert gesteuert.</h1>
          <p>VINCERE verbindet Objektphase, Eigentümerkontakt, Follow-ups, Termine und Datenqualität zu einer nachvollziehbaren Arbeitsreihenfolge.</p>
        </div>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus size={17} /> Immobilie erfassen</Button>}
      </Card>

      <div className="pv-metrics" aria-label="Immobilienkennzahlen">
        <Card><Building2 /><span>Aktive Objekte</span><strong>{summary.active}</strong><small>{summary.total} insgesamt</small></Card>
        <Card><CircleDollarSign /><span>Aktives Volumen</span><strong>{currency.format(summary.pipelineValue)}</strong><small>Interne Arbeitswerte</small></Card>
        <Card><Target /><span>Dringender Handlungsbedarf</span><strong>{summary.urgent}</strong><small>{summary.withoutNextAction} ohne nächste Aktion</small></Card>
        <Card><CheckCircle2 /><span>Ø Bewertungsreife</span><strong>{summary.averageReadiness}%</strong><small>{summary.withoutOwner} ohne Eigentümer</small></Card>
      </div>

      <Card>
        <SectionHeader title="Objektportfolio" subtitle="Filtern, priorisieren und den nächsten vertrieblichen Schritt erkennen" />
        <div className="pv-toolbar">
          <label className="pv-search"><Search size={16} /><input aria-label="Immobilien durchsuchen" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Objekt, Ort, Adresse oder Eigentümer" /></label>
          <select aria-label="Status filtern" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as PropertyFilters['status'] })}>
            <option value="all">Alle Phasen</option>
            <option value="Akquise">Akquise</option>
            <option value="Bewertung">Bewertung</option>
            <option value="Vermarktung">Vermarktung</option>
            <option value="Verkauft">Verkauft</option>
          </select>
          <select aria-label="Objektart filtern" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
            <option value="all">Alle Objektarten</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select aria-label="Ort filtern" value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })}>
            <option value="all">Alle Orte</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select aria-label="Sortierung" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as PropertyFilters['sort'] })}>
            <option value="action">Höchster Handlungswert</option>
            <option value="value">Höchster Arbeitswert</option>
            <option value="readiness">Höchste Bewertungsreife</option>
            <option value="name">Name</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Keine Immobilien gefunden" text="Passe die Filter an oder erfasse ein neues Objekt." />
        ) : (
          <div className="pv-cockpit">
            <div className="pv-list" role="list">
              {filtered.map((item) => (
                <button
                  className={`pv-list-item ${selected?.property.id === item.property.id ? 'is-selected' : ''}`}
                  key={item.property.id}
                  onClick={() => setSelectedId(item.property.id)}
                  type="button"
                  role="listitem"
                >
                  <span className="pv-property-icon"><Building2 size={20} /></span>
                  <span className="pv-list-copy">
                    <span><strong>{item.property.title}</strong><Badge tone={statusTone(item.property.status)}>{item.property.status}</Badge></span>
                    <small><MapPin size={13} /> {item.property.address}, {item.property.city}</small>
                    <small><UserRound size={13} /> {item.owner ? `${item.owner.firstName} ${item.owner.lastName}` : 'Kein Eigentümer verknüpft'}</small>
                  </span>
                  <span className="pv-score"><strong>{item.actionScore}</strong><small>Handlungswert</small></span>
                </button>
              ))}
            </div>

            {selected && (
              <aside className="pv-detail" aria-label={`Objektdetails ${selected.property.title}`}>
                <div className="pv-detail-head">
                  <div><Badge tone={statusTone(selected.property.status)}>{selected.property.status}</Badge><h2>{selected.property.title}</h2><p>{selected.property.type} · {selected.property.address}, {selected.property.city}</p></div>
                  <div className="pv-ring" style={{ '--pv-progress': `${selected.readiness * 3.6}deg` } as React.CSSProperties}><span>{selected.readiness}%</span><small>Reife</small></div>
                </div>

                <div className="pv-next-action">
                  <Target size={19} />
                  <div><small>Nächster sinnvoller Schritt</small><strong>{selected.recommendedAction}</strong></div>
                </div>

                <div className="pv-detail-grid">
                  <article><span>Interner Arbeitswert</span><strong>{selected.property.estimatedValue > 0 ? currency.format(selected.property.estimatedValue) : 'Nicht erfasst'}</strong>{selected.internalRange && <small>Arbeitskorridor {currency.format(selected.internalRange.min)} – {currency.format(selected.internalRange.max)}</small>}</article>
                  <article><span>Eigentümer</span><strong>{selected.owner ? `${selected.owner.firstName} ${selected.owner.lastName}` : 'Nicht verknüpft'}</strong><small>{selected.owner ? `${selected.owner.role} · Potenzial ${selected.owner.potential}` : 'Kontaktbeziehung fehlt'}</small></article>
                  <article><span>Nächster Termin</span><strong>{selected.nextAppointment ? dateTime.format(new Date(selected.nextAppointment.startsAt)) : 'Nicht geplant'}</strong><small>{selected.nextAppointment?.title ?? 'Kein bevorstehender Termin'}</small></article>
                  <article><span>Offene Follow-ups</span><strong>{selected.openFollowUps.length}</strong><small>{selected.overdueFollowUps.length > 0 ? `${selected.overdueFollowUps.length} überfällig` : 'Keine Überfälligkeit'}</small></article>
                </div>

                <div className="pv-explanation">
                  <h3>Warum dieser Handlungswert?</h3>
                  <div>{selected.actionFactors.map((factor) => <span key={`${factor.label}-${factor.points}`}><i>+{factor.points}</i>{factor.label}</span>)}</div>
                </div>

                {(selected.risks.length > 0 || selected.dataGaps.length > 0) && (
                  <div className="pv-alerts">
                    <h3><AlertTriangle size={16} /> Offene Punkte</h3>
                    {[...selected.risks, ...selected.dataGaps.filter((gap) => !selected.risks.some((risk) => risk.includes(gap)))].map((risk) => <p key={risk}>{risk}</p>)}
                  </div>
                )}

                <div className="pv-actions">
                  {selected.owner?.phone && <a className="button button-secondary" href={`tel:${selected.owner.phone}`}><Phone size={16} /> Eigentümer anrufen</a>}
                  {canWrite && <Button onClick={() => createFollowUp(selected)} disabled={!selected.owner || selected.openFollowUps.length > 0}><CalendarClock size={16} /> Follow-up planen</Button>}
                </div>
                <p className="pv-disclaimer">Arbeitskorridor und Handlungswert sind interne, regelbasierte Vertriebsinformationen. Sie ersetzen keine belastbare Marktwertermittlung.</p>
              </aside>
            )}
          </div>
        )}
      </Card>

      {message && <div className="pv-message" role="status">{message}</div>}

      {open && (
        <Modal title="Immobilie erfassen" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={submit}>
            <label className="form-span">Bezeichnung<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Adresse<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label>Ort<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>Objektart<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Einfamilienhaus</option><option>Eigentumswohnung</option><option>Mehrfamilienhaus</option><option>Grundstück</option><option>Gewerbeimmobilie</option></select></label>
            <label>Phase<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Property['status'] })}><option>Akquise</option><option>Bewertung</option><option>Vermarktung</option><option>Verkauft</option></select></label>
            <label>Interner Arbeitswert<input min="0" step="1000" type="number" value={form.estimatedValue} onChange={(event) => setForm({ ...form, estimatedValue: Number(event.target.value) })} /></label>
            <label>Eigentümer<select value={form.ownerContactId} onChange={(event) => setForm({ ...form, ownerContactId: event.target.value })}><option value="">Noch nicht verknüpft</option>{store.contacts.filter((contact) => contact.role === 'Eigentümer').map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName} · {contact.city}</option>)}</select></label>
            <div className="form-actions form-span"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit">Speichern</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
