import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  PhoneMissed,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../../components/ui';
import {
  createMockCommunicationHubSnapshot,
  type CommunicationHubSnapshot,
  type CommunicationProviderStatus,
} from '../../services/communications/hub';
import type { CommunicationTimelineItem } from '../../services/communications/timeline';
import {
  COMMUNICATION_DRAFT_TEMPLATES,
  createLocalCommunicationDraft,
  type CommunicationDraftTemplateId,
  type LocalCommunicationDraft,
} from './drafts';
import './communication-hub.css';

export type CommunicationHubRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface CommunicationHubPageProps {
  snapshot?: CommunicationHubSnapshot;
  role?: CommunicationHubRole;
}

const DEMO_DRAFT_CONTEXT = {
  contactName: 'Synthetischer Kontakt',
  appointmentDate: '15.07.2026',
  appointmentTime: '11:00',
  propertyAddress: 'Beispielstraße 1, 00000 Musterstadt',
  senderName: 'VINCERE Demo',
  callbackNumber: '+49 000 0000000',
  reason: 'interne Terminüberschneidung',
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Berlin',
}).format(new Date(value));

const formatTime = (value: string) => new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
}).format(new Date(value));

const channelLabel: Record<CommunicationTimelineItem['channel'], string> = {
  email: 'E-Mail',
  message: 'Nachricht',
  phone: 'Telefon',
  appointment: 'Termin',
  crm: 'CRM',
};

const statusTone = (status: CommunicationTimelineItem['status']) => {
  if (status === 'missed' || status === 'cancelled') return 'red' as const;
  if (status === 'unread' || status === 'open') return 'gold' as const;
  if (status === 'scheduled' || status === 'sent') return 'blue' as const;
  return 'green' as const;
};

const matchLabel = (item: CommunicationTimelineItem) => {
  if (item.contactMatchCategory === 'definite') return 'Eindeutig zugeordnet';
  if (item.contactMatchCategory === 'probable') return 'Wahrscheinlich';
  if (item.contactMatchCategory === 'manual_review') return 'Manuelle Prüfung';
  return 'Unbekannt';
};

const providerTone = (provider: CommunicationProviderStatus) => {
  if (provider.connectionState === 'offline' || provider.connectionState === 'expired') return 'red' as const;
  if (provider.connectionState === 'degraded' || provider.rateLimit.status === 'limited') return 'gold' as const;
  return 'green' as const;
};

function ChannelIcon({ channel }: { channel: CommunicationTimelineItem['channel'] }) {
  if (channel === 'email') return <Mail size={17} />;
  if (channel === 'message') return <MessageSquare size={17} />;
  if (channel === 'phone') return <PhoneMissed size={17} />;
  if (channel === 'appointment') return <CalendarDays size={17} />;
  return <FileText size={17} />;
}

function CommunicationList({ items, emptyTitle, emptyText }: {
  items: CommunicationTimelineItem[];
  emptyTitle: string;
  emptyText: string;
}) {
  if (!items.length) return <EmptyState title={emptyTitle} text={emptyText} />;
  return (
    <div className="communication-list">
      {items.map((item) => (
        <article className="communication-row" key={item.id}>
          <div className={`communication-channel channel-${item.channel}`}><ChannelIcon channel={item.channel} /></div>
          <div className="communication-copy">
            <div className="communication-row-head"><strong>{item.title}</strong><span>{formatDateTime(item.occurredAt)}</span></div>
            <p>{item.summary}</p>
            <div className="communication-meta">
              <span>{channelLabel[item.channel]} · {item.contactLabel}</span>
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              <Badge tone={item.contactMatchCategory === 'definite' ? 'green' : item.contactMatchCategory === 'unknown' ? 'red' : 'gold'}>{matchLabel(item)}</Badge>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CommunicationHubPage({ snapshot, role = 'viewer' }: CommunicationHubPageProps) {
  const model = useMemo(() => snapshot ?? createMockCommunicationHubSnapshot(), [snapshot]);
  const [templateId, setTemplateId] = useState<CommunicationDraftTemplateId>('appointment_confirmation');
  const [draft, setDraft] = useState<LocalCommunicationDraft>(() => createLocalCommunicationDraft(
    'appointment_confirmation',
    DEMO_DRAFT_CONTEXT,
    new Date('2026-07-14T08:00:00.000Z'),
  ));
  const canEditDrafts = role !== 'viewer';

  const previewTemplate = () => setDraft(createLocalCommunicationDraft(templateId, DEMO_DRAFT_CONTEXT));

  return (
    <div className="page-stack communication-hub-page">
      <Card className="hero-card communication-hero">
        <div>
          <span className="eyebrow"><ShieldCheck size={15} /> Providerunabhängiger Mock-Modus</span>
          <h1>Alle Kommunikationssignale in einer sicheren Arbeitsansicht.</h1>
          <p>E-Mail, Kalender, Telefonie, Messaging und CRM-Aktivitäten werden vereinheitlicht dargestellt. Es bestehen keine produktiven Verbindungen, keine echten Webhooks und keine Versandaktion.</p>
          <div className="communication-hero-badges">
            <Badge tone="green">Nur synthetische Daten</Badge>
            <Badge tone="blue">Serverzugriff vorbereitet</Badge>
            <Badge tone="gold">Entwürfe bleiben lokal</Badge>
          </div>
        </div>
        <div className="communication-health-score">
          <small>Verbindungen ohne Handlungsbedarf</small>
          <strong>{model.connectionSummary.connected}/{model.connectionSummary.total}</strong>
          <span>{model.failedSynchronizations.length} Synchronisationszustände prüfen</span>
        </div>
      </Card>

      <div className="communication-metrics">
        <Card className="communication-metric"><Mail /><span>Ungelesen</span><strong>{model.unreadMessages.length}</strong><small>E-Mail und Messaging</small></Card>
        <Card className="communication-metric"><PhoneMissed /><span>Verpasste Anrufe</span><strong>{model.missedCalls.length}</strong><small>Rückrufpotenzial</small></Card>
        <Card className="communication-metric"><CalendarDays /><span>Termine heute</span><strong>{model.todayAppointments.length}</strong><small>inklusive Absagen</small></Card>
        <Card className="communication-metric"><Clock /><span>Antwort ausstehend</span><strong>{model.awaitingResponse.length}</strong><small>letztes Signal eingehend</small></Card>
      </div>

      <div className="communication-dashboard-grid">
        <Card>
          <SectionHeader title="Offene Kommunikation" subtitle="Ungelesene Nachrichten und verpasste Anrufe" />
          <CommunicationList items={[...model.unreadMessages, ...model.missedCalls]} emptyTitle="Keine offenen Eingänge" emptyText="Im Mock-Datensatz liegt aktuell kein unbearbeitetes Eingangssignal vor." />
        </Card>
        <Card>
          <SectionHeader title="Heutige Termine" subtitle="Bestätigte und abgesagte Kalendereinträge" />
          <div className="appointment-list">
            {model.todayAppointments.map((item) => (
              <article key={item.id} className={item.status === 'cancelled' ? 'is-cancelled' : ''}>
                <span>{formatTime(item.occurredAt)}</span>
                <div><strong>{item.title}</strong><small>{item.contactLabel}</small></div>
                <Badge tone={item.status === 'cancelled' ? 'red' : 'blue'}>{item.status === 'cancelled' ? 'Abgesagt' : 'Geplant'}</Badge>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <div className="communication-dashboard-grid">
        <Card>
          <SectionHeader title="Kontakte mit ausstehender Antwort" subtitle="Das letzte relevante Signal kam vom Kontakt" />
          <CommunicationList items={model.awaitingResponse} emptyTitle="Keine Antwort ausstehend" emptyText="Alle bekannten Konversationen enden aktuell mit einem ausgehenden Signal." />
        </Card>
        <Card>
          <SectionHeader title="Nicht eindeutig zuordenbar" subtitle="Keine automatische Vermutung und keine Kontaktzusammenführung" />
          <CommunicationList items={model.unassignedCommunication} emptyTitle="Alle Signale zugeordnet" emptyText="Es gibt keine unbekannte oder widersprüchliche Kommunikation." />
        </Card>
      </div>

      <Card>
        <SectionHeader title="Provider- und Synchronisationsstatus" subtitle="Verbindung, Authentifizierung, Rate Limit, Cursor und letzter Sync" />
        <div className="provider-grid">
          {model.providersByRecentSync.map((provider) => (
            <article className="provider-card" key={provider.providerKey}>
              <div className="provider-card-head">
                <span className={`provider-icon provider-${provider.connectionState}`}>{provider.connectionState === 'offline' || provider.connectionState === 'expired' ? <Unplug size={18} /> : <RefreshCw size={18} />}</span>
                <div><strong>{provider.displayName}</strong><small>{provider.channelLabel}</small></div>
                <Badge tone={providerTone(provider)}>{provider.connectionState}</Badge>
              </div>
              <dl>
                <div><dt>Authentifizierung</dt><dd>{provider.authentication.state}</dd></div>
                <div><dt>Rate Limit</dt><dd>{provider.rateLimit.status}</dd></div>
                <div><dt>Sync-Cursor</dt><dd>{provider.syncCursor ?? 'Kein Cursor'}</dd></div>
                <div><dt>Letzter Sync</dt><dd>{provider.lastSyncedAt ? formatDateTime(provider.lastSyncedAt) : 'Noch nie'}</dd></div>
              </dl>
              {provider.failureMessage && <p className="provider-failure"><AlertTriangle size={15} /> {provider.failureMessage}</p>}
            </article>
          ))}
        </div>
      </Card>

      <div className="communication-dashboard-grid">
        <Card>
          <SectionHeader title="Lokale Entwürfe und Vorlagen" subtitle="Nur Vorschau – keine Provideraktion, kein Versand" action={<Badge tone={canEditDrafts ? 'blue' : 'neutral'}>{canEditDrafts ? 'Bearbeitbar' : 'Viewer: nur lesen'}</Badge>} />
          <div className="draft-workbench">
            <label>
              Vorlage
              <select value={templateId} onChange={(event) => setTemplateId(event.target.value as CommunicationDraftTemplateId)} disabled={!canEditDrafts}>
                {COMMUNICATION_DRAFT_TEMPLATES.map((template) => <option value={template.id} key={template.id}>{template.label}</option>)}
              </select>
            </label>
            <Button variant="secondary" onClick={previewTemplate} disabled={!canEditDrafts}><Eye size={16} /> Vorschau erzeugen</Button>
            <div className="draft-preview">
              <div><Badge tone="gold">Lokaler Entwurf</Badge><span>{draft.channel}</span></div>
              {draft.subject && <strong>{draft.subject}</strong>}
              <pre>{draft.body}</pre>
              <small><ShieldCheck size={14} /> Versand technisch gesperrt · Speicherung: {draft.storage}</small>
            </div>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Sicherheitsregeln" subtitle="Verbindliche Grenzen dieses Arbeitspakets" />
          <div className="security-rule-list">
            <div><CheckCircle2 /><span><strong>Keine Zugangsdaten im Browser</strong><small>Providerzugriffe bleiben als serverseitiger Vertrag markiert.</small></span></div>
            <div><CheckCircle2 /><span><strong>Keine automatische Zuordnung bei Unsicherheit</strong><small>Wahrscheinliche und widersprüchliche Treffer bleiben prüfpflichtig.</small></span></div>
            <div><CheckCircle2 /><span><strong>Doppelte Ereignisse werden abgefangen</strong><small>Idempotenzschlüssel verhindern die wiederholte Verarbeitung.</small></span></div>
            <div><CheckCircle2 /><span><strong>Keine automatische Nachricht</strong><small>Vorlagen sind ausschließlich lokale Vorschauen.</small></span></div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Gemeinsame Kommunikationshistorie" subtitle="Ein deterministisches View-Modell für Kontaktcockpit und spätere Integrationen" action={<Badge tone="neutral"><Users size={13} /> {model.timeline.length} Ereignisse</Badge>} />
        <CommunicationList items={model.timeline} emptyTitle="Noch keine Kommunikationshistorie" emptyText="Nach einer sicheren Synchronisation werden normalisierte Ereignisse hier zusammengeführt." />
      </Card>
    </div>
  );
}
