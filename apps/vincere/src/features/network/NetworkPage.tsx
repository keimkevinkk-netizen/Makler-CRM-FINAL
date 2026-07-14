import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Handshake,
  History,
  Phone,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { can } from '../../auth/permissions';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, EmptyState, Modal, SectionHeader } from '../../components/ui';
import {
  buildNetworkCockpit,
  getNetworkCapabilities,
  networkSegmentOptions,
  type NetworkRelationshipModel,
  type NetworkSegment,
} from '../../domain/referrals/referralNetwork';
import './network.css';

const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Nicht dokumentiert';

const channelLabel = { phone: 'Telefon', email: 'E-Mail', meeting: 'Termin' } as const;

function RelationshipCard({ model, active, onSelect }: { model: NetworkRelationshipModel; active?: boolean; onSelect: () => void }) {
  return <button type="button" className={`network-relationship-card ${active ? 'is-active' : ''}`} onClick={onSelect}>
    <span className="network-avatar">{model.contact.firstName[0] || '?'}{model.contact.lastName[0] || '?'}</span>
    <span className="network-card-main">
      <small>{model.segmentLabel}</small>
      <strong>{model.fullName}</strong>
      <span>{model.nextBestAction}</span>
    </span>
    <span className="network-card-value"><strong>{model.relationshipValue}</strong><small>Beziehungswert</small></span>
    <ChevronRight size={18} />
  </button>;
}

function FollowUpModal({ model, initialDueAt, onClose, onCreate }: { model: NetworkRelationshipModel; initialDueAt: string; onClose: () => void; onCreate: (input: { title: string; dueAt: string; channel: 'phone' | 'email' | 'meeting' }) => void }) {
  const [title, setTitle] = useState(`Netzwerkpflege: ${model.fullName}`);
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [channel, setChannel] = useState<'phone' | 'email' | 'meeting'>('phone');

  return <Modal title="Netzwerk-Follow-up anlegen" onClose={onClose}>
    <form className="network-followup-form" onSubmit={(event) => {
      event.preventDefault();
      onCreate({ title: title.trim(), dueAt: new Date(dueAt).toISOString(), channel });
    }}>
      <label><span>Titel</span><input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>Fällig</span><input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
      <label><span>Kanal</span><select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}><option value="phone">Telefon</option><option value="email">E-Mail</option><option value="meeting">Termin</option></select></label>
      <div className="network-modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button><Button type="submit">Follow-up anlegen</Button></div>
    </form>
  </Modal>;
}

export function NetworkPage() {
  const store = useAppStore();
  const { contacts, followUps, properties, appointments, callEvents, auditEvents, currentUser, addFollowUp, logCall } = store;
  const source = useMemo(() => ({
    schemaVersion: store.schemaVersion,
    workspace: store.workspace,
    currentUser,
    contacts,
    followUps,
    properties,
    appointments,
    callEvents,
    auditEvents,
  }), [store.schemaVersion, store.workspace, currentUser, contacts, followUps, properties, appointments, callEvents, auditEvents]);
  const [now] = useState(() => new Date());
  const cockpit = useMemo(() => buildNetworkCockpit(source, now), [source, now]);
  const capabilities = getNetworkCapabilities(currentUser.role);
  const [selectedId, setSelectedId] = useState<string>();
  const [focusIndex, setFocusIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<NetworkSegment | 'all'>('all');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDefaultAt, setFollowUpDefaultAt] = useState('');
  const [feedback, setFeedback] = useState<string>();

  const visible = cockpit.relationships.filter((item) => {
    const search = query.trim().toLocaleLowerCase('de-DE');
    const matchesSearch = !search || `${item.fullName} ${item.contact.city} ${item.contact.source} ${item.segmentLabel}`.toLocaleLowerCase('de-DE').includes(search);
    return matchesSearch && (segment === 'all' || item.segment === segment);
  });
  const active = visible.find((item) => item.contact.id === selectedId) ?? visible[0];
  const focus = cockpit.focusQueue[focusIndex % Math.max(cockpit.focusQueue.length, 1)];

  const openFollowUp = (contactId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setSelectedId(contactId);
    setFollowUpDefaultAt(tomorrow.toISOString().slice(0, 16));
    setShowFollowUp(true);
  };

  const nextFocus = (message: string) => {
    setFeedback(message);
    if (cockpit.focusQueue.length > 1) setFocusIndex((index) => (index + 1) % cockpit.focusQueue.length);
  };

  const documentCall = (model: NetworkRelationshipModel, outcome: 'conversation' | 'no_answer') => {
    if (!can(currentUser, 'calls:write')) return;
    logCall({ contactId: model.contact.id, outcome, note: outcome === 'conversation' ? 'Netzwerkpflege: Gespräch geführt.' : 'Netzwerkpflege: nicht erreicht.' });
    nextFocus(outcome === 'conversation' ? `Gespräch mit ${model.fullName} dokumentiert.` : `Kontaktversuch bei ${model.fullName} dokumentiert.`);
  };

  return <div className="page-stack network-workspace">
    <Card className="network-hero">
      <SectionHeader title="Netzwerk, Tippgeber & Empfehlungen" subtitle="Beziehungen nach nachvollziehbaren Signalen pflegen, entwickeln und aktivieren" />
      <div className="network-kpis">
        <div><Users /><span><strong>{cockpit.relationships.length}</strong><small>relevante Beziehungen</small></span></div>
        <div><Target /><span><strong>{cockpit.todayCare.length}</strong><small>heute zu pflegen</small></span></div>
        <div><Sparkles /><span><strong>{cockpit.opportunities.length}</strong><small>offene Gelegenheiten</small></span></div>
        <div><Handshake /><span><strong>{cockpit.activeReferrers.length}</strong><small>aktive Tippgeber</small></span></div>
      </div>
      <p className="network-value-note"><CircleAlert size={16} /> Der Beziehungswert ist ein transparenter Regelwert aus vorhandenen CRM-Daten und keine Erfolgswahrscheinlichkeit.</p>
    </Card>

    {focus ? <Card className="network-focus-card">
      <div className="network-focus-heading"><div><span className="section-kicker">Netzwerk-Fokusmodus</span><h2>{focus.fullName}</h2><p>{focus.segmentLabel} · {focus.contact.city || 'Ort fehlt'}</p></div><div className="network-focus-score"><strong>{focus.relationshipValue}</strong><span>Beziehungswert</span></div></div>
      <div className="network-focus-grid">
        <div><small>Warum jetzt?</small><ul>{focus.prioritizationReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
        <div><small>Letzter Kontakt</small><strong>{formatDate(focus.lastActivityAt)}</strong><span>{focus.daysSinceActivity === undefined ? 'Keine Aktivität dokumentiert' : `vor ${focus.daysSinceActivity} Tagen`}</span></div>
        <div><small>Realistisches Gesprächsziel</small><strong>{focus.conversationGoal}</strong></div>
        <div><small>Nächste beste Aktion</small><strong>{focus.nextBestAction}</strong></div>
      </div>
      {feedback && <div className="network-feedback"><CheckCircle2 size={16} /> {feedback}</div>}
      <div className="network-focus-actions">
        {capabilities.canLogCalls && <><Button onClick={() => documentCall(focus, 'conversation')}><Phone size={16} /> Gespräch geführt</Button><Button variant="secondary" onClick={() => documentCall(focus, 'no_answer')}>Nicht erreicht</Button></>}
        {capabilities.canCreateFollowUps && <Button variant="secondary" onClick={() => openFollowUp(focus.contact.id)}><CalendarClock size={16} /> Follow-up</Button>}
        <Button variant="ghost" onClick={() => nextFocus('Kontakt übersprungen.')}>Nächster Kontakt <ArrowRight size={16} /></Button>
        {!capabilities.canWrite && <span className="network-readonly">Viewer-Modus: Schreibaktionen sind ausgeblendet.</span>}
      </div>
    </Card> : <Card><EmptyState title="Kein Kontakt im Fokus" text="Sobald relevante Netzwerkbeziehungen vorhanden sind, erscheint hier die priorisierte Pflegeaktion." /></Card>}

    <div className="network-dashboard-grid">
      <Card className="network-list-card">
        <SectionHeader title="Beziehungsportfolio" subtitle={`${visible.length} von ${cockpit.relationships.length} Beziehungen`} />
        <div className="network-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Ort, Quelle oder Segment" /></label><select value={segment} onChange={(event) => setSegment(event.target.value as NetworkSegment | 'all')}><option value="all">Alle Segmente</option>{networkSegmentOptions().map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="network-relationship-list">{visible.map((model) => <RelationshipCard key={model.contact.id} model={model} active={active?.contact.id === model.contact.id} onSelect={() => setSelectedId(model.contact.id)} />)}{visible.length === 0 && <EmptyState title="Keine Beziehungen gefunden" text="Passe Suche oder Segmentfilter an." />}</div>
      </Card>

      <Card className="network-detail-card">
        {active ? <>
          <div className="network-detail-header"><div><small>{active.segmentLabel}</small><h2>{active.fullName}</h2><p>{active.contact.source || 'Quelle fehlt'} · {active.contact.city || 'Ort fehlt'}</p></div><span className={`network-value-pill value-${active.relationshipValueLabel}`}><strong>{active.relationshipValue}</strong><small>{active.relationshipValueLabel}</small></span></div>
          <div className="network-next-action"><Target size={18} /><div><small>Nächste beste Netzwerkaktion</small><strong>{active.nextBestAction}</strong><p>{active.conversationGoal}</p></div></div>
          <div className="network-mini-grid"><div><span>Letzte Aktivität</span><strong>{formatDate(active.lastActivityAt)}</strong></div><div><span>Offene Follow-ups</span><strong>{active.openFollowUps.length}</strong></div><div><span>Bevorstehende Termine</span><strong>{active.upcomingAppointments.length}</strong></div><div><span>Immobilienbezug</span><strong>{active.linkedProperties.length}</strong></div></div>

          <details className="network-factor-panel" open><summary>Beziehungswert erklärt <Badge tone="gold">{active.relationshipValue}/100</Badge></summary><div>{active.factors.map((factor) => <article key={factor.code}><span><strong>{factor.label}</strong><small>{factor.explanation}</small></span><b>{factor.points}/{factor.maxPoints}</b><ul>{factor.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></article>)}</div></details>

          <div className="network-detail-sections">
            <section><h3><Sparkles size={17} /> Empfehlungsgelegenheiten</h3>{active.opportunities.length ? active.opportunities.map((item) => <article key={item.id} className={`network-opportunity urgency-${item.urgency}`}><strong>{item.title}</strong><p>{item.reason}</p><span>{item.recommendedAction}</span></article>) : <EmptyState title="Keine offene Gelegenheit" text="Die aktuellen Regeln erkennen keinen offenen Empfehlungsanlass." />}</section>
            <section><h3><CalendarClock size={17} /> Offene Follow-ups & Termine</h3>{active.openFollowUps.map((item) => <article className="network-line-item" key={item.id}><span><strong>{item.title}</strong><small>{formatDate(item.dueAt)} · {channelLabel[item.channel]}</small></span>{active.overdueFollowUps.some((overdue) => overdue.id === item.id) && <Badge tone="red">Überfällig</Badge>}</article>)}{active.upcomingAppointments.map((item) => <article className="network-line-item" key={item.id}><span><strong>{item.title}</strong><small>{formatDate(item.startsAt)} · {item.subtitle}</small></span><Badge tone="gold">Termin</Badge></article>)}{!active.openFollowUps.length && !active.upcomingAppointments.length && <EmptyState title="Keine nächste Aktion" text="Für diese Beziehung ist weder Follow-up noch Termin geplant." />}</section>
            <section><h3><History size={17} /> Beziehungshistorie</h3>{active.history.slice(0, 12).map((item) => <article className="network-history-item" key={item.id}><span className={item.positive ? 'is-positive' : 'is-neutral'} /><div><time>{formatDate(item.occurredAt)}</time><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}{active.history.length === 0 && <EmptyState title="Keine Historie" text="Es wurden noch keine echten Interaktionen dokumentiert." />}</section>
          </div>
          {capabilities.canCreateFollowUps && <Button className="network-detail-cta" onClick={() => openFollowUp(active.contact.id)}><CalendarClock size={16} /> Pflegeaktion anlegen</Button>}
        </> : <EmptyState title="Keine Beziehung ausgewählt" text="Wähle links einen Kontakt aus." />}
      </Card>
    </div>

    <div className="network-secondary-grid">
      <Card><SectionHeader title="Heute pflegen" subtitle="Priorisierte Kontakte mit konkretem Handlungsbedarf" /><div className="network-ranking">{cockpit.todayCare.slice(0, 6).map((item) => <button key={item.contact.id} type="button" onClick={() => setSelectedId(item.contact.id)}><Target /><strong>{item.fullName}</strong><small>{item.prioritizationReasons[0]}</small><b>{item.relationshipValue}</b></button>)}{cockpit.todayCare.length === 0 && <EmptyState title="Keine akute Pflegeaktion" text="Aktuell liegt kein priorisierter Netzwerkbedarf vor." />}</div></Card>
      <Card><SectionHeader title="Offene Empfehlungsgelegenheiten" subtitle="Deterministische Anlässe, keine Erfolgsprognosen" /><div className="network-opportunity-list">{cockpit.opportunities.slice(0, 6).map((opportunity) => { const relationship = cockpit.relationships.find((item) => item.contact.id === opportunity.contactId); return <button key={opportunity.id} type="button" onClick={() => setSelectedId(opportunity.contactId)}><Sparkles /><span><strong>{opportunity.title}</strong><small>{relationship?.fullName || 'Kontakt'}</small></span><ChevronRight size={16} /></button>; })}{cockpit.opportunities.length === 0 && <EmptyState title="Keine offene Gelegenheit" text="Die aktuellen Regeln erkennen keinen offenen Empfehlungsanlass." />}</div></Card>
      <Card><SectionHeader title="Aktive Tippgeber" subtitle="Zuletzt gepflegt oder mit positiven Interaktionen" /><div className="network-ranking">{cockpit.activeReferrers.slice(0, 6).map((item) => <button key={item.contact.id} type="button" onClick={() => setSelectedId(item.contact.id)}><Handshake /><strong>{item.fullName}</strong><small>{item.successfulInteractions} positive Interaktionen</small><b>{item.relationshipValue}</b></button>)}{cockpit.activeReferrers.length === 0 && <EmptyState title="Keine aktiven Tippgeber" text="Tippgeber werden nach realen Aktivitäten und Gesprächen ausgewiesen." />}</div></Card>
      <Card><SectionHeader title="Top-Beziehungen" subtitle="Nach transparentem Beziehungswert" /><div className="network-ranking">{cockpit.topRelationships.map((item, index) => <button key={item.contact.id} type="button" onClick={() => setSelectedId(item.contact.id)}><span>{index + 1}</span><strong>{item.fullName}</strong><small>{item.segmentLabel}</small><b>{item.relationshipValue}</b></button>)}</div></Card>
      <Card><SectionHeader title="Lange Kontaktpause" subtitle="Mehr als 60 Tage oder keine Aktivität" /><div className="network-ranking">{cockpit.longPauses.slice(0, 6).map((item) => <button key={item.contact.id} type="button" onClick={() => setSelectedId(item.contact.id)}><Clock3 /><strong>{item.fullName}</strong><small>{item.daysSinceActivity === undefined ? 'Nie gepflegt' : `${item.daysSinceActivity} Tage`}</small><b>{item.relationshipValue}</b></button>)}{cockpit.longPauses.length === 0 && <EmptyState title="Keine lange Pause" text="Alle relevanten Beziehungen wurden zuletzt innerhalb von 60 Tagen gepflegt." />}</div></Card>
      <Card><SectionHeader title="Netzwerksegmentierung" subtitle="View-Modell auf vorhandenen Kontaktdaten" /><div className="network-segments">{cockpit.segmentation.map((item) => <div key={item.segment}><span>{item.label}</span><strong>{item.count}</strong></div>)}{cockpit.segmentation.length === 0 && <EmptyState title="Keine Segmente" text="Es sind noch keine relevanten Netzwerkbeziehungen vorhanden." />}</div></Card>
    </div>

    {showFollowUp && active && <FollowUpModal model={active} initialDueAt={followUpDefaultAt} onClose={() => setShowFollowUp(false)} onCreate={(input) => {
      if (!can(currentUser, 'followups:write')) return;
      addFollowUp({ contactId: active.contact.id, title: input.title, dueAt: input.dueAt, priority: active.contact.priority, status: 'open', channel: input.channel });
      setShowFollowUp(false);
      nextFocus(`Follow-up für ${active.fullName} angelegt.`);
    }} />}
  </div>;
}
