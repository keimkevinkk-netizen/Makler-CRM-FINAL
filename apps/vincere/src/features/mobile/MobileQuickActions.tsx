import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  ContactRound,
  FilePlus2,
  ListChecks,
  NotebookPen,
  PhoneCall,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import type { OfflineActionType, OfflineQueueItem } from '../offline/offlineQueue';

export interface MobileDraftInput {
  id: string;
  actionType: OfflineActionType;
  recordId: string;
  title: string;
  detail: string;
}

export interface MobileQuickActionsProps {
  open: boolean;
  drafts: MobileDraftInput[];
  pendingActions: OfflineQueueItem[];
  onClose: () => void;
  onStageDraft: (draft: MobileDraftInput) => void;
  onCancelDraft: (id: string) => void;
}

type CaptureMode = 'menu' | 'call' | 'followup' | 'result' | 'appointment' | 'note';

function draftId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MobileQuickActions({
  open,
  drafts,
  pendingActions,
  onClose,
  onStageDraft,
  onCancelDraft,
}: MobileQuickActionsProps) {
  const navigate = useNavigate();
  const { contacts, appointments, properties } = useAppStore();
  const [mode, setMode] = useState<CaptureMode>('menu');
  const [contactId, setContactId] = useState('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [dueAt, setDueAt] = useState('');

  const selectedContact = contacts.find((contact) => contact.id === contactId);
  const nextAppointment = useMemo(() => [...appointments].sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0], [appointments]);
  const appointmentContact = contacts.find((contact) => contact.id === nextAppointment?.contactId);

  if (!open) return null;

  const close = () => {
    setMode('menu');
    onClose();
  };

  const stageDraft = (actionType: OfflineActionType, fallbackTitle: string, extraDetail = detail) => {
    const id = draftId();
    onStageDraft({
      id,
      actionType,
      recordId: contactId || 'workspace',
      title: title.trim() || fallbackTitle,
      detail: extraDetail.trim(),
    });
    setTitle('');
    setDetail('');
    setDueAt('');
    setMode('menu');
  };

  const openRoute = (path: string) => {
    navigate(path);
    close();
  };

  return (
    <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={close}>
      <section className="mobile-sheet mobile-action-sheet" role="dialog" aria-modal="true" aria-label="Mobile Schnellaktionen" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><strong>Schnellaktionen</strong><small>Mit einer Hand erreichbar</small></div>
          <button type="button" onClick={close} aria-label="Schnellaktionen schließen"><X /></button>
        </header>

        {mode === 'menu' && (
          <>
            <div className="mobile-action-grid">
              <button type="button" onClick={() => openRoute('/contacts?mobileAction=search')}><Search /><span>Kontakt suchen</span></button>
              <button type="button" onClick={() => setMode('call')}><PhoneCall /><span>Kontakt anrufen</span></button>
              <button type="button" onClick={() => setMode('followup')}><FilePlus2 /><span>Follow-up anlegen</span></button>
              <button type="button" onClick={() => setMode('result')}><ListChecks /><span>Gesprächsergebnis</span></button>
              <button type="button" onClick={() => setMode('appointment')}><CalendarCheck /><span>Terminbriefing</span></button>
              <button type="button" onClick={() => openRoute('/properties')}><Building2 /><span>Immobilie anzeigen</span></button>
              <button type="button" onClick={() => setMode('note')}><NotebookPen /><span>Notiz vorbereiten</span></button>
              <button type="button" onClick={() => openRoute('/today?mobile=next-action')}><ContactRound /><span>Nächste Aktion</span></button>
            </div>

            {pendingActions.length > 0 && (
              <div className="mobile-pending-list">
                <strong>Temporäre Entwürfe</strong>
                <p>Nur im Arbeitsspeicher dieser Sitzung. Keine automatische Cloudübertragung.</p>
                {pendingActions.map((item) => {
                  const draft = drafts.find((candidate) => candidate.id === item.id);
                  return (
                    <article key={item.id}>
                      <span><strong>{draft?.title ?? item.actionType.replaceAll('_', ' ')}</strong><small>{draft?.detail || 'Keine zusätzlichen Details'}</small></span>
                      <time>{new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}</time>
                      <button type="button" onClick={() => onCancelDraft(item.id)} aria-label="Temporären Entwurf verwerfen"><Trash2 size={16} /></button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {mode === 'call' && (
          <div className="mobile-capture-panel">
            <button type="button" className="mobile-back-link" onClick={() => setMode('menu')}>Zurück</button>
            <h3>Kontakt anrufen</h3>
            <div className="mobile-contact-list">
              {contacts.filter((contact) => contact.phone).map((contact) => (
                <a key={contact.id} href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>
                  <span><strong>{contact.firstName} {contact.lastName}</strong><small>{contact.role} · {contact.city}</small></span>
                  <PhoneCall size={18} />
                </a>
              ))}
              {contacts.every((contact) => !contact.phone) && <p>Kein Kontakt mit Telefonnummer vorhanden.</p>}
            </div>
          </div>
        )}

        {mode === 'appointment' && (
          <div className="mobile-capture-panel">
            <button type="button" className="mobile-back-link" onClick={() => setMode('menu')}>Zurück</button>
            <h3>Nächstes Terminbriefing</h3>
            {nextAppointment ? (
              <article className="mobile-briefing-card">
                <time>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(nextAppointment.startsAt))}</time>
                <strong>{nextAppointment.title}</strong>
                <span>{nextAppointment.subtitle}</span>
                <small>{appointmentContact ? `${appointmentContact.firstName} ${appointmentContact.lastName} · ${appointmentContact.phone || 'Keine Telefonnummer'}` : 'Kein Kontakt verknüpft'}</small>
                <button type="button" className="button button-primary" onClick={() => openRoute('/today?mobile=appointments')}>Terminmodus öffnen</button>
              </article>
            ) : <p>Kein Termin vorhanden.</p>}
          </div>
        )}

        {(mode === 'followup' || mode === 'result' || mode === 'note') && (
          <form className="mobile-capture-panel" onSubmit={(event) => {
            event.preventDefault();
            if (mode === 'followup') {
              stageDraft('create_followup', 'Follow-up', `${detail}${dueAt ? ` · Fällig: ${dueAt}` : ''}`);
            } else if (mode === 'result') {
              stageDraft('record_call_outcome', 'Gesprächsergebnis');
            } else {
              stageDraft('prepare_note', 'Temporäre Notiz');
            }
          }}>
            <button type="button" className="mobile-back-link" onClick={() => setMode('menu')}>Zurück</button>
            <h3>{mode === 'followup' ? 'Follow-up vorbereiten' : mode === 'result' ? 'Gesprächsergebnis vorbereiten' : 'Notiz vorbereiten'}</h3>
            <p className="mobile-security-note">Der Entwurf bleibt ausschließlich im Arbeitsspeicher. Er gilt nicht als gespeichert oder synchronisiert.</p>
            <label>Kontakt<select value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">Ohne Kontaktbezug</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}</select></label>
            <label>Titel<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={mode === 'followup' ? 'Rückruf vereinbaren' : selectedContact ? `Notiz zu ${selectedContact.firstName}` : 'Kurze Bezeichnung'} /></label>
            {mode === 'followup' && <label>Fällig am<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>}
            <label>Details<textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={4} placeholder="Nur notwendige Informationen erfassen" /></label>
            <button type="submit" className="button button-primary">Temporär vormerken</button>
          </form>
        )}

        <footer className="mobile-sheet-footer">
          <span>{properties.length} Immobilien · {contacts.length} Kontakte</span>
          <span>Keine produktive Offline-Datenbank</span>
        </footer>
      </section>
    </div>
  );
}
