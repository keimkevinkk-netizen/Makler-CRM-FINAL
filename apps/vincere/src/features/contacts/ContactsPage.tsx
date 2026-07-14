import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownUp, Building2, Clock3, Filter, Plus, Search, ShieldAlert, Target, X } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, Modal, SectionHeader } from '../../components/ui';
import type { Contact, ContactStage, Priority } from '../../types/domain';
import { ContactCockpitPanel } from './ContactCockpitPanel';
import { ContactForm } from './ContactForm';
import { buildContactCockpitModels, filterAndSortContacts, validateContactRelations, type ContactFilters, type ContactSortKey, type FollowUpFilter } from './contactCockpit';
import './contacts.css';

const defaults: ContactFilters = { query: '', role: 'all', stage: 'all', priority: 'all', followUp: 'all', minPotential: 0 };
const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const stageLabel: Record<ContactStage, string> = { lead: 'Lead', qualified: 'Qualifiziert', appointment: 'Termin', mandate: 'Mandat', sold: 'Abgeschlossen' };
const priorityLabel: Record<Priority, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };

export function ContactsPage() {
  const { contacts, followUps, properties, appointments, callEvents, auditEvents } = useAppStore();
  const [filters, setFilters] = useState<ContactFilters>(defaults);
  const [sort, setSort] = useState<ContactSortKey>('priority');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const source = useMemo(() => ({ contacts, followUps, properties, appointments, callEvents, auditEvents }), [contacts, followUps, properties, appointments, callEvents, auditEvents]);
  const now = useMemo(() => new Date(), [source]);
  const models = useMemo(() => buildContactCockpitModels(source, now), [source, now]);
  const visible = useMemo(() => filterAndSortContacts(models, filters, sort), [models, filters, sort]);
  const active = visible.find((item) => item.contact.id === selectedId) ?? visible[0];
  const diagnostics = useMemo(() => validateContactRelations(source), [source]);
  const metrics = {
    overdue: models.filter((item) => item.overdueFollowUps.length).length,
    unplanned: models.filter((item) => item.insights.some((insight) => insight.code === 'high_potential_without_action')).length,
    owners: models.filter((item) => item.ownerIndex >= 60).length,
    gaps: models.filter((item) => item.dataQuality.score < 60).length,
  };
  const set = <K extends keyof ContactFilters>(key: K, value: ContactFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const filtered = filters.role !== 'all' || filters.stage !== 'all' || filters.priority !== 'all' || filters.followUp !== 'all' || filters.minPotential > 0;

  return <div className="page-stack contact-workspace">
    <Card className="contact-overview-card">
      <SectionHeader title="Kontakte" subtitle={`${contacts.length} Beziehungen · ${visible.length} im aktuellen Fokus`} action={<Button onClick={() => setShowForm(true)}><Plus size={17} /> Kontakt</Button>} />
      <div className="contact-kpi-strip" aria-label="Kontaktkennzahlen">
        <div className={metrics.overdue ? 'is-critical' : ''}><Clock3 /><span><strong>{metrics.overdue}</strong><small>überfällige Kontakte</small></span></div>
        <div className={metrics.unplanned ? 'is-warning' : ''}><Target /><span><strong>{metrics.unplanned}</strong><small>hohes Potenzial ohne Aktion</small></span></div>
        <div><Building2 /><span><strong>{metrics.owners}</strong><small>klare Eigentümersignale</small></span></div>
        <div className={metrics.gaps ? 'is-warning' : ''}><ShieldAlert /><span><strong>{metrics.gaps}</strong><small>lückenhafte Datensätze</small></span></div>
      </div>
      {diagnostics.total > 0 && <div className="contact-diagnostics" role="alert"><AlertTriangle size={17} /><div><strong>{diagnostics.total} ungültige Verknüpfungen erkannt</strong><span>Verwaiste Relationen werden keinem Kontakt ungeprüft zugeordnet.</span></div></div>}
      <div className="contact-toolbar">
        <div className="search-field contact-search"><Search size={17} /><input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="Name, Ort, Quelle, Rolle, Telefon oder Notiz suchen" aria-label="Kontakte durchsuchen" />{filters.query && <button type="button" onClick={() => set('query', '')} aria-label="Suche leeren"><X size={15} /></button>}</div>
        <label className="contact-sort"><ArrowDownUp size={16} /><span>Sortierung</span><select value={sort} onChange={(event) => setSort(event.target.value as ContactSortKey)}><option value="priority">Priorität</option><option value="potential">Potenzial</option><option value="lastActivity">Letzte Aktivität</option><option value="nextAction">Nächste Aktion</option><option value="ownerIndex">Eigentümerindex</option><option value="dataQuality">Datenqualität</option><option value="name">Name</option></select></label>
        <Button variant={showFilters || filtered ? 'primary' : 'secondary'} onClick={() => setShowFilters((value) => !value)}><Filter size={17} /> Filter{filtered && <span className="contact-filter-dot" />}</Button>
      </div>
      {showFilters && <div className="contact-filter-panel">
        <label><span>Rolle</span><select value={filters.role} onChange={(e) => set('role', e.target.value as Contact['role'] | 'all')}><option value="all">Alle Rollen</option><option>Eigentümer</option><option>Käufer</option><option>Tippgeber</option><option>Netzwerk</option></select></label>
        <label><span>Pipeline</span><select value={filters.stage} onChange={(e) => set('stage', e.target.value as ContactStage | 'all')}><option value="all">Alle Stufen</option>{Object.entries(stageLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Priorität</span><select value={filters.priority} onChange={(e) => set('priority', e.target.value as Priority | 'all')}><option value="all">Alle Prioritäten</option><option value="high">Hoch</option><option value="medium">Mittel</option><option value="low">Niedrig</option></select></label>
        <label><span>Follow-ups</span><select value={filters.followUp} onChange={(e) => set('followUp', e.target.value as FollowUpFilter)}><option value="all">Alle</option><option value="overdue">Überfällig</option><option value="open">Offen</option><option value="none">Ohne offene Aktion</option></select></label>
        <label><span>Mindestpotenzial</span><select value={filters.minPotential} onChange={(e) => set('minPotential', Number(e.target.value))}><option value="0">Alle</option><option value="60">Ab 60</option><option value="75">Ab 75</option><option value="90">Ab 90</option></select></label>
        <Button variant="ghost" onClick={() => setFilters((current) => ({ ...defaults, query: current.query }))}>Filter zurücksetzen</Button>
      </div>}
      <div className="contact-list-head" aria-hidden="true"><span>Kontakt</span><span>Priorität / Rolle</span><span>Pipeline / Potenzial</span><span>Letzte Aktivität</span><span>Nächste Aktion</span><span>Eigentümer</span><span>Datenqualität</span></div>
      <div className="contact-list" aria-label="Kontaktübersicht">
        {visible.map((model) => <button type="button" key={model.contact.id} className={`contact-list-row ${active?.contact.id === model.contact.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(model.contact.id)} aria-pressed={active?.contact.id === model.contact.id}>
          <span className="contact-list-person" data-label="Kontakt"><i className={`initials priority-${model.contact.priority}`}>{model.contact.firstName[0] || '?'}{model.contact.lastName[0] || '?'}</i><span><strong>{model.fullName}</strong><small>{model.contact.city || 'Ort fehlt'} · {model.contact.source || 'Quelle fehlt'}</small></span>{model.overdueFollowUps.length > 0 && <Badge tone="red">{model.overdueFollowUps.length} überfällig</Badge>}</span>
          <span data-label="Priorität / Rolle"><strong>{priorityLabel[model.contact.priority]}</strong><small>{model.contact.role}</small></span>
          <span data-label="Pipeline / Potenzial"><Badge tone={model.contact.stage === 'appointment' || model.contact.stage === 'mandate' ? 'gold' : 'neutral'}>{stageLabel[model.contact.stage]}</Badge><small>Potenzial {model.contact.potential}</small></span>
          <span data-label="Letzte Aktivität"><strong>{formatDate(model.lastActivityAt)}</strong><small>{model.callEvents.length} Anrufe</small></span>
          <span className={model.nextActionAt && Date.parse(model.nextActionAt) < now.getTime() ? 'is-overdue' : ''} data-label="Nächste Aktion"><strong>{model.nextActionLabel}</strong><small>{formatDate(model.nextActionAt)}</small></span>
          <span data-label="Eigentümer"><strong>{model.ownerIndex}/100</strong><small>Regelwert</small></span>
          <span data-label="Datenqualität"><strong>{model.dataQuality.score}%</strong><small className={`quality-${model.dataQuality.label.toLowerCase()}`}>{model.dataQuality.label}</small></span>
        </button>)}
        {visible.length === 0 && <EmptyState title="Keine Kontakte gefunden" text="Passe Suche oder Filter an." />}
      </div>
    </Card>
    {active ? <ContactCockpitPanel model={active} /> : <Card className="contact-no-selection"><EmptyState title="Kein Kontakt im Fokus" text="Entferne Filter oder lege einen Kontakt an." /></Card>}
    {showForm && <Modal title="Neuen Kontakt erfassen" onClose={() => setShowForm(false)}><ContactForm onDone={() => setShowForm(false)} /></Modal>}
  </div>;
}
