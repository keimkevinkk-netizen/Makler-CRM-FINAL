import { useState, type FormEvent } from 'react';
import { AlertTriangle, Building2, CalendarClock, Check, Clock3, Mail, MessageSquareText, Phone, PhoneCall, Route, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, EmptyState, Modal } from '../../components/ui';
import type { CallEvent, ContactStage, FollowUp, Priority, Property } from '../../types/domain';
import type { ContactCockpitModel } from './contactCockpit';

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
type Action = 'followup' | 'note' | 'pipeline' | 'property' | 'call' | 'prep' | null;

function formatDate(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? dateTime.format(new Date(value)) : 'Nicht dokumentiert';
}

function localDateTime(days = 1) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(9, 0, 0, 0);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function ActionForm({ action, model, close }: { action: Exclude<Action, null>; model: ContactCockpitModel; close: () => void }) {
  const store = useAppStore();
  const [title, setTitle] = useState(`Nachfassen: ${model.fullName}`);
  const [dueAt, setDueAt] = useState(localDateTime());
  const [priority, setPriority] = useState<Priority>(model.contact.priority);
  const [channel, setChannel] = useState<FollowUp['channel']>(model.contact.phone ? 'phone' : 'email');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<ContactStage>(model.contact.stage);
  const [outcome, setOutcome] = useState<CallEvent['outcome']>('conversation');
  const [property, setProperty] = useState<Omit<Property, 'id' | 'ownerContactId'>>({ title: `Immobilie ${model.contact.lastName}`, address: '', city: model.contact.city, type: 'Einfamilienhaus', status: 'Akquise', estimatedValue: 0 });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (action === 'followup') {
      const due = new Date(dueAt).toISOString();
      store.addFollowUp({ contactId: model.contact.id, title: title.trim(), dueAt: due, priority, status: 'open', channel });
      store.updateContact(model.contact.id, { nextActionAt: due });
    }
    if (action === 'note') {
      const stamp = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date());
      store.updateContact(model.contact.id, { notes: [model.contact.notes?.trim(), `${stamp}: ${note.trim()}`].filter(Boolean).join('\n\n') });
    }
    if (action === 'pipeline') store.moveContactStage(model.contact.id, stage);
    if (action === 'property') store.addProperty({ ...property, estimatedValue: Number(property.estimatedValue), ownerContactId: model.contact.id });
    if (action === 'call') store.logCall({ contactId: model.contact.id, outcome, note: note.trim() || undefined });
    close();
  };

  if (action === 'prep') return <div className="contact-prep"><p>Vor dem nächsten Termin prüfen:</p><ul><li>Ziel und gewünschtes Ergebnis festlegen</li><li>Immobilien- und Kontaktdaten kontrollieren</li><li>Offene Einwände und Interessen aus den Notizen übernehmen</li><li>Verbindlichen nächsten Schritt vorbereiten</li></ul><Button onClick={close}>Verstanden</Button></div>;

  return <form className="form-grid contact-action-form" onSubmit={submit}>
    {action === 'followup' && <><label className="form-span">Aufgabe<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Fällig<input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><label>Priorität<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="high">Hoch</option><option value="medium">Mittel</option><option value="low">Niedrig</option></select></label><label>Kanal<select value={channel} onChange={(event) => setChannel(event.target.value as FollowUp['channel'])}><option value="phone">Telefon</option><option value="email">E-Mail</option><option value="meeting">Termin</option></select></label></>}
    {(action === 'note' || action === 'call') && <label className="form-span">{action === 'note' ? 'Notiz' : 'Gesprächsnotiz'}<textarea required={action === 'note'} rows={5} value={note} onChange={(event) => setNote(event.target.value)} /></label>}
    {action === 'call' && <label className="form-span">Ergebnis<select value={outcome} onChange={(event) => setOutcome(event.target.value as CallEvent['outcome'])}><option value="conversation">Gespräch geführt</option><option value="appointment">Termin vereinbart</option><option value="no_answer">Nicht erreicht</option><option value="not_interested">Aktuell kein Interesse</option></select></label>}
    {action === 'pipeline' && <label className="form-span">Pipeline-Stufe<select value={stage} onChange={(event) => setStage(event.target.value as ContactStage)}><option value="lead">Lead</option><option value="qualified">Qualifiziert</option><option value="appointment">Termin</option><option value="mandate">Mandat</option><option value="sold">Abgeschlossen</option></select></label>}
    {action === 'property' && <><label className="form-span">Bezeichnung<input required value={property.title} onChange={(event) => setProperty({ ...property, title: event.target.value })} /></label><label className="form-span">Adresse<input required value={property.address} onChange={(event) => setProperty({ ...property, address: event.target.value })} /></label><label>Ort<input required value={property.city} onChange={(event) => setProperty({ ...property, city: event.target.value })} /></label><label>Objektart<input required value={property.type} onChange={(event) => setProperty({ ...property, type: event.target.value })} /></label><label>Status<select value={property.status} onChange={(event) => setProperty({ ...property, status: event.target.value as Property['status'] })}><option>Akquise</option><option>Bewertung</option><option>Vermarktung</option><option>Verkauft</option></select></label><label>Schätzwert<input type="number" min="0" value={property.estimatedValue} onChange={(event) => setProperty({ ...property, estimatedValue: Number(event.target.value) })} /></label></>}
    <div className="form-actions form-span"><Button variant="secondary" type="button" onClick={close}>Abbrechen</Button><Button type="submit">Speichern</Button></div>
  </form>;
}

export function ContactCockpitPanel({ model }: { model: ContactCockpitModel }) {
  const { completeFollowUp } = useAppStore();
  const [action, setAction] = useState<Action>(null);
  const primary = model.insights[0];
  const modalTitle: Record<Exclude<Action, null>, string> = { followup: 'Follow-up anlegen', note: 'Notiz erfassen', pipeline: 'Pipeline-Status', property: 'Immobilie verknüpfen', call: 'Telefonergebnis erfassen', prep: 'Termin vorbereiten' };

  return <section className="contact-cockpit" aria-label={`Kontaktcockpit ${model.fullName}`}>
    <header className="contact-hero">
      <div><span className="eyebrow">Vertriebs- und Eigentümercockpit</span><h1>{model.fullName}</h1><p>{model.contact.role} · {model.contact.city || 'Ort fehlt'} · Quelle {model.contact.source || 'fehlt'}</p></div>
      <div className="contact-quick-actions">
        {model.contact.phone ? <a className="button button-primary" href={`tel:${model.contact.phone}`}><Phone size={16} /> Anrufen</a> : <button className="button button-secondary" disabled aria-label="Telefonnummer fehlt"><Phone size={16} /> Telefonnummer fehlt</button>}
        {model.contact.email && <a className="button button-secondary" href={`mailto:${model.contact.email}`}><Mail size={16} /> E-Mail</a>}
        <Button variant="secondary" onClick={() => setAction('call')}><PhoneCall size={16} /> Ergebnis</Button>
        <Button variant="secondary" onClick={() => setAction('followup')}><Clock3 size={16} /> Follow-up</Button>
        <Button variant="secondary" onClick={() => setAction('note')}><MessageSquareText size={16} /> Notiz</Button>
        <Button variant="secondary" onClick={() => setAction('property')}><Building2 size={16} /> Immobilie</Button>
        <Button variant="secondary" onClick={() => setAction('pipeline')}><Target size={16} /> Pipeline</Button>
      </div>
    </header>

    <div className="contact-score-grid">
      <div><Target /><span>Potenzial</span><strong>{model.contact.potential}</strong><small>vorhandener Wert</small></div>
      <div><Building2 /><span>Eigentümerindex</span><strong>{model.ownerIndex}</strong><small>regelbasiert</small></div>
      <div><ShieldCheck /><span>Datenqualität</span><strong>{model.dataQuality.score}%</strong><small>{model.dataQuality.label}</small></div>
      <div><Clock3 /><span>Letzte Aktivität</span><strong>{formatDate(model.lastActivityAt)}</strong><small>{model.callEvents.length} Anrufe</small></div>
    </div>

    <div className={`contact-next-step ${primary?.severity === 'critical' ? 'critical' : ''}`}><Sparkles /><div><small>Nächster bester Schritt</small><strong>{primary?.recommendedAction ?? model.nextActionLabel}</strong><p>{primary?.detail ?? `Geplant: ${formatDate(model.nextActionAt)}`}</p></div><Button onClick={() => setAction('followup')}>Planen</Button></div>

    <div className="contact-cockpit-grid">
      <main>
        <article className="contact-panel"><h2>Vertriebszusammenfassung</h2><p>{model.salesSummary}</p><dl><div><dt>Telefon</dt><dd>{model.contact.phone || 'Fehlt'}</dd></div><div><dt>E-Mail</dt><dd>{model.contact.email || 'Fehlt'}</dd></div><div><dt>Pipeline</dt><dd>{model.contact.stage}</dd></div><div><dt>Priorität</dt><dd>{model.contact.priority}</dd></div></dl></article>
        <article className="contact-panel"><h2><AlertTriangle size={17} /> Vertriebliche Hinweise <Badge tone={model.insights.length ? 'red' : 'green'}>{model.insights.length}</Badge></h2>{model.insights.length ? <div className="contact-insights">{model.insights.map((item) => <details key={item.code}><summary><strong>{item.title}</strong><span>{item.detail}</span></summary><p><b>Empfehlung:</b> {item.recommendedAction}</p><ul>{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></details>)}</div> : <EmptyState title="Keine akute Warnung" text="Aktuell liegt kein Regelverstoß vor." />}</article>
        <article className="contact-panel"><h2><Clock3 size={17} /> Offene Follow-ups <Badge tone={model.overdueFollowUps.length ? 'red' : 'neutral'}>{model.openFollowUps.length}</Badge></h2>{model.openFollowUps.length ? <div className="contact-items">{model.openFollowUps.map((item) => <div key={item.id} className={model.overdueFollowUps.some((overdue) => overdue.id === item.id) ? 'overdue' : ''}><span><strong>{item.title}</strong><small>{formatDate(item.dueAt)} · {item.channel}</small></span><Button variant="ghost" onClick={() => completeFollowUp(item.id)}><Check size={14} /> Erledigt</Button></div>)}</div> : <EmptyState title="Kein Follow-up geplant" text="Sichere den nächsten Schritt verbindlich ab." />}</article>
        <article className="contact-panel"><h2><Route size={17} /> Aktivitätsachse <Badge>{model.timeline.length}</Badge></h2>{model.timeline.length ? <div className="contact-timeline">{model.timeline.slice(0, 30).map((item) => <div key={item.id}><time>{formatDate(item.occurredAt)}</time><strong>{item.title}</strong><p>{item.detail}</p></div>)}</div> : <EmptyState title="Noch keine Aktivität" text="Die Historie bleibt leer, bis echte Aktivitäten vorliegen." />}</article>
      </main>
      <aside>
        <article className="contact-panel"><h2><PhoneCall size={17} /> Telefonhistorie</h2>{model.callEvents.length ? <div className="contact-items">{model.callEvents.slice(0, 8).map((item) => <div key={item.id}><span><strong>{item.outcome}</strong><small>{item.note || 'Keine Notiz'}</small></span><time>{formatDate(item.createdAt)}</time></div>)}</div> : <EmptyState title="Keine Anrufe dokumentiert" text="Ergebnisse können direkt erfasst werden." />}</article>
        <article className="contact-panel"><h2><CalendarClock size={17} /> Termine</h2>{model.appointments.length ? <><div className="contact-items">{model.appointments.map((item) => <div key={item.id}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><time>{formatDate(item.startsAt)}</time></div>)}</div><Button variant="secondary" onClick={() => setAction('prep')}>Termin vorbereiten</Button></> : <EmptyState title="Kein Termin verknüpft" text="Termine werden aus der vorhandenen Terminquelle gelesen." />}</article>
        <article className="contact-panel"><h2><Building2 size={17} /> Immobilien <Badge tone="gold">{model.properties.length}</Badge></h2>{model.properties.length ? <div className="contact-properties">{model.properties.map((item) => <div key={item.id}><strong>{item.title}</strong><small>{item.address}, {item.city}</small><span>{item.status} · {money.format(item.estimatedValue)}</span></div>)}</div> : <EmptyState title="Keine Immobilie verknüpft" text="Eigentümerbezug und Bewertungsmöglichkeit früh klären." />}</article>
        <article className="contact-panel"><h2><MessageSquareText size={17} /> Notizen und Interessen</h2><p className="contact-notes">{model.contact.notes || 'Noch keine Notizen vorhanden.'}</p></article>
        <article className="contact-panel"><h2><ShieldCheck size={17} /> Datenqualität</h2><div className="quality-bar"><span style={{ width: `${model.dataQuality.score}%` }} /></div><p>{model.dataQuality.missingFields.length ? `Fehlt: ${model.dataQuality.missingFields.join(', ')}` : 'Alle geprüften Felder vorhanden.'}</p><details><summary>Eigentümerindex erklären</summary><p>Transparenter Regelwert aus Rolle, Pipeline, Objektverknüpfung, Quelle und Notizen. Keine KI-Wahrscheinlichkeit.</p><ul>{model.ownerIndexReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details></article>
      </aside>
    </div>

    {action && <Modal title={modalTitle[action]} onClose={() => setAction(null)}><ActionForm action={action} model={model} close={() => setAction(null)} /></Modal>}
  </section>;
}
