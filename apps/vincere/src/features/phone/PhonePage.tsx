import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, PhoneCall, Save, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import type { CallEvent } from '../../types/domain';

const steps = [
  { title: 'Eröffnung', text: 'Guten Tag Herr/Frau [Name], Kevin Keim hier. Ich melde mich kurz, weil ich Ihre Situation besser verstehen möchte – passt es gerade für zwei Minuten?' },
  { title: 'Situation', text: 'Was ist aktuell der wichtigste Grund, warum Sie sich mit dem Thema Immobilie beschäftigen?' },
  { title: 'Motivation', text: 'Was müsste ein Makler konkret leisten, damit Sie sagen: Genau diese Unterstützung brauche ich?' },
  { title: 'Verdichtung', text: 'Wenn ich Sie richtig verstehe, sind Ihnen Sicherheit, ein realistischer Preis und ein klarer Ablauf besonders wichtig.' },
  { title: 'Abschluss', text: 'Der sinnvollste nächste Schritt wäre eine unverbindliche Einschätzung vor Ort. Passt Ihnen eher Dienstag oder Donnerstag?' },
];

const objections = [
  ['Wir wollen erst einmal selbst verkaufen.', 'Das ist nachvollziehbar. Genau deshalb lohnt sich eine kurze Markt- und Strategieeinschätzung, bevor Sie Zeit oder Preispositionierung verlieren.'],
  ['Wir haben schon einen Makler.', 'Verstanden. Dann geht es nicht darum, etwas zu verdrängen, sondern sicherzustellen, dass Strategie, Preis und Nachfrage sauber zusammenpassen.'],
  ['Wir haben noch keine Eile.', 'Das ist sogar eine gute Ausgangslage. Ohne Zeitdruck können wir den Marktwert und den idealen Verkaufszeitpunkt deutlich strategischer vorbereiten.'],
];

export function PhonePage() {
  const store = useAppStore();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('contact') ?? store.contacts[0]?.id;
  const contact = store.contacts.find((item) => item.id === selectedId);
  const [step, setStep] = useState(0);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<CallEvent['outcome']>('conversation');
  const [saved, setSaved] = useState(false);
  const script = useMemo(() => steps[step].text.replace('[Name]', contact?.lastName ?? ''), [contact, step]);

  const save = () => {
    if (!contact) return;
    store.logCall({ contactId: contact.id, outcome, note });
    if (outcome === 'appointment') store.moveContactStage(contact.id, 'appointment');
    setSaved(true);
  };

  return <div className="phone-layout">
    <Card className="contact-context"><SectionHeader title="Gesprächskontext" subtitle="Alle relevanten Informationen vor dem Anruf" /><label className="select-label">Kontakt<select value={selectedId} onChange={(event) => setParams({ contact: event.target.value })}>{store.contacts.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></label>{contact && <div className="context-profile"><span className={`initials priority-${contact.priority}`}>{contact.firstName[0]}{contact.lastName[0]}</span><h2>{contact.firstName} {contact.lastName}</h2><p>{contact.role} · {contact.city}</p><Badge tone={contact.potential >= 80 ? 'red' : 'gold'}>{contact.potential}% Chancenwert</Badge><dl><div><dt>Telefon</dt><dd>{contact.phone}</dd></div><div><dt>Quelle</dt><dd>{contact.source}</dd></div><div><dt>Phase</dt><dd>{contact.stage}</dd></div><div><dt>Notiz</dt><dd>{contact.notes}</dd></div></dl><a href={`tel:${contact.phone}`} className="button button-primary full-width"><PhoneCall size={18} /> Jetzt anrufen</a></div>}</Card>
    <Card className="call-workspace"><SectionHeader title="Geführtes Verkaufsgespräch" subtitle="Struktur gibt Sicherheit – Wirkung entsteht durch echtes Zuhören" /><div className="stepper">{steps.map((item, index) => <button key={item.title} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <CheckCircle2 size={15} /> : index + 1}</span>{item.title}</button>)}</div><div className="script-card"><span className="eyebrow"><Sparkles size={15} /> Gesprächsschritt {step + 1}</span><h2>{steps[step].title}</h2><blockquote>{script}</blockquote><div className="script-controls"><Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Zurück</Button><Button onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Weiter <ChevronRight size={16} /></Button></div></div><div className="objection-grid">{objections.map(([title, answer]) => <details key={title}><summary>{title}</summary><p>{answer}</p></details>)}</div></Card>
    <Card className="call-result"><SectionHeader title="Ergebnis sichern" subtitle="Kein Gespräch endet ohne dokumentierten nächsten Schritt" /><label>Gesprächsergebnis<select value={outcome} onChange={(event) => setOutcome(event.target.value as CallEvent['outcome'])}><option value="conversation">Gespräch geführt</option><option value="appointment">Termin vereinbart</option><option value="no_answer">Nicht erreicht</option><option value="not_interested">Kein Interesse</option></select></label><label>Notiz<textarea rows={8} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Motivation, Einwände, Signale und nächster Schritt …" /></label><Button onClick={save}><Save size={16} /> Ergebnis speichern</Button>{saved && <div className="success-message"><CheckCircle2 size={17} /> Gespräch wurde dokumentiert.</div>}</Card>
  </div>;
}
