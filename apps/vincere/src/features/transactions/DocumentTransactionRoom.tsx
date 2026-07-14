import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FileWarning,
  FolderLock,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { UserRole } from '../../types/domain';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import {
  TRANSACTION_PHASES,
  buildDemoTransactionRoom,
  calculateChecklistProgress,
  calculateDocumentProgress,
  deriveTransactionRisks,
  getDocumentStatusDefinition,
  getDocumentTypeDefinition,
  type DocumentRecord,
  type TransactionChecklistItem,
  type TransactionPhase,
  type TransactionRoomViewModel,
  type TransactionTask,
} from '../../domain/documents/documentModel';
import './transaction-room.css';

export interface DocumentTransactionRoomProps {
  model?: TransactionRoomViewModel;
  role?: UserRole;
}

const statusTone = (status: DocumentRecord['status']) => getDocumentStatusDefinition(status).tone;
const checklistLabel = (status: TransactionChecklistItem['status']) => ({
  open: 'Offen',
  complete: 'Erledigt',
  blocked: 'Blockiert',
  not_required: 'Nicht erforderlich',
})[status];

export function DocumentTransactionRoom({ model, role = 'agent' }: DocumentTransactionRoomProps) {
  const initial = useMemo(() => model ?? buildDemoTransactionRoom(), [model]);
  const [phase, setPhase] = useState<TransactionPhase>(initial.phase);
  const [documents, setDocuments] = useState(initial.documents);
  const [checklist, setChecklist] = useState(initial.checklist);
  const [tasks, setTasks] = useState(initial.tasks);
  const canWrite = role !== 'viewer';

  const currentPhase = TRANSACTION_PHASES.find((item) => item.id === phase)!;
  const currentChecklist = checklist.filter((item) => item.phase === phase);
  const checklistProgress = calculateChecklistProgress(currentChecklist);
  const documentProgress = calculateDocumentProgress(documents);
  const risks = deriveTransactionRisks({ property: initial.property, documents, checklist, tasks });
  const missingDocuments = documents.filter((document) => ['fehlt', 'veraltet', 'unvollstaendig', 'pruefung_notwendig'].includes(document.status));
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const overallProgress = Math.round((checklistProgress.percent + documentProgress.percent) / 2);

  const requestDocument = (documentId: string) => {
    setDocuments((current) => current.map((document) => document.id === documentId
      ? { ...document, status: 'angefordert', requestedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : document));
  };

  const markChecklistItem = (itemId: string) => {
    setChecklist((current) => current.map((item) => item.id === itemId
      ? { ...item, status: item.status === 'complete' ? 'open' : 'complete' }
      : item));
  };

  const completeTask = (taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'done' } : task));
  };

  return (
    <div className="transaction-room page-stack">
      <Card className="transaction-room-hero">
        <div>
          <span className="eyebrow"><FolderLock size={15} /> Geschützter Demo-Transaktionsraum</span>
          <h1>{initial.property.title}</h1>
          <p>{initial.property.address}, {initial.property.city} · Eigentümer: {initial.owner.name}</p>
          <div className="transaction-room-flags">
            <Badge tone="gold">{currentPhase.label}</Badge>
            <Badge tone={risks.some((risk) => risk.severity === 'critical') ? 'red' : 'gold'}>{risks.length} Risiken</Badge>
            <Badge tone={canWrite ? 'green' : 'neutral'}>{canWrite ? 'Bearbeitung erlaubt' : 'Nur Lesezugriff'}</Badge>
          </div>
        </div>
        <div className="transaction-room-overall">
          <span>Gesamtfortschritt</span>
          <strong>{overallProgress}%</strong>
          <div className="transaction-progress"><i style={{ width: `${overallProgress}%` }} /></div>
          <small>Deterministisch aus Dokument- und Checklistenstand</small>
        </div>
      </Card>

      {!canWrite && (
        <div className="transaction-readonly-notice" role="status">
          <ShieldCheck size={18} /> Viewer sehen den vollständigen Transaktionsstand, erhalten aber keine schreibenden Aktionen.
        </div>
      )}

      <div className="transaction-summary-grid">
        <Card><FileCheck2 /><span>Dokumente bereit</span><strong>{documentProgress.ready}/{documentProgress.total}</strong><small>{documentProgress.percent}% operativ verwendbar</small></Card>
        <Card><ClipboardCheck /><span>Phase erledigt</span><strong>{checklistProgress.completed}/{checklistProgress.total}</strong><small>{currentPhase.label}</small></Card>
        <Card><CalendarClock /><span>Offene Aufgaben</span><strong>{openTasks.length}</strong><small>{initial.deadlines.length} dokumentierte Fristen</small></Card>
        <Card><AlertTriangle /><span>Fehlende Unterlagen</span><strong>{missingDocuments.length}</strong><small>inklusive veraltet oder prüfbedürftig</small></Card>
      </div>

      <Card>
        <SectionHeader title="Transaktionsphasen" subtitle="Jede Phase besitzt eine eigene, deterministische Checkliste" />
        <div className="transaction-phase-strip" aria-label="Transaktionsphasen">
          {TRANSACTION_PHASES.map((item, index) => {
            const progress = calculateChecklistProgress(checklist.filter((entry) => entry.phase === item.id));
            return (
              <button key={item.id} className={item.id === phase ? 'active' : ''} onClick={() => setPhase(item.id)}>
                <span>{index + 1}</span>
                <strong>{item.label}</strong>
                <small>{progress.percent}%</small>
              </button>
            );
          })}
        </div>
        <div className="transaction-phase-objective"><ChevronRight size={16} /><span>{currentPhase.objective}</span></div>
      </Card>

      <div className="transaction-main-grid">
        <Card className="transaction-documents-card">
          <SectionHeader title="Dokumentenstatus" subtitle="Es werden ausschließlich Metadaten und Demo-Zustände dargestellt" />
          <div className="transaction-document-list">
            {documents.map((document) => {
              const type = getDocumentTypeDefinition(document.type);
              const status = getDocumentStatusDefinition(document.status);
              const actionable = ['fehlt', 'veraltet', 'unvollstaendig'].includes(document.status);
              return (
                <article key={document.id} className={`transaction-document transaction-document-${status.tone}`}>
                  <span className="transaction-document-icon">
                    {document.status === 'geprueft' ? <FileCheck2 /> : document.status === 'veraltet' ? <FileClock /> : <FileWarning />}
                  </span>
                  <div>
                    <strong>{type.label}</strong>
                    <span>{document.title}</span>
                    <small>Version {document.version} · {document.fileName ?? 'Keine Datei hinterlegt'} · {status.meaning}</small>
                  </div>
                  <Badge tone={statusTone(document.status)}>{status.label}</Badge>
                  {canWrite && actionable && (
                    <Button data-testid="write-action" variant="secondary" onClick={() => requestDocument(document.id)}>Anforderung simulieren</Button>
                  )}
                </article>
              );
            })}
          </div>
        </Card>

        <Card className="transaction-checklist-card">
          <SectionHeader title={`${currentPhase.label}-Checkliste`} subtitle={`${checklistProgress.percent}% der anwendbaren Punkte erledigt`} />
          <div className="transaction-checklist">
            {currentChecklist.map((item) => (
              <article key={item.id} className={`checklist-${item.status}`}>
                <span>{item.status === 'complete' ? <CheckCircle2 /> : item.status === 'blocked' ? <AlertTriangle /> : <ClipboardCheck />}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  {(item.responsible || item.dueAt) && <small>{item.responsible ?? 'Noch nicht zugeordnet'} · {item.dueAt ?? 'Keine Frist'}</small>}
                </div>
                <Badge tone={item.status === 'complete' ? 'green' : item.status === 'blocked' ? 'red' : 'neutral'}>{checklistLabel(item.status)}</Badge>
                {canWrite && item.status !== 'not_required' && (
                  <Button data-testid="write-action" variant="ghost" onClick={() => markChecklistItem(item.id)}>
                    {item.status === 'complete' ? 'Wieder öffnen' : 'Erledigt markieren'}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </Card>
      </div>

      <div className="transaction-bottom-grid">
        <Card>
          <SectionHeader title="Offene Aufgaben" subtitle="Verantwortliche, Fristen und Prioritäten" />
          <div className="transaction-task-list">
            {tasks.map((task: TransactionTask) => (
              <article key={task.id} className={task.status === 'done' ? 'done' : ''}>
                <span className={`task-priority task-priority-${task.priority}`} />
                <div><strong>{task.title}</strong><small>{task.responsible} · fällig {task.dueAt}</small></div>
                <Badge tone={task.status === 'done' ? 'green' : task.status === 'blocked' ? 'red' : 'gold'}>{task.status === 'done' ? 'Erledigt' : task.status === 'blocked' ? 'Blockiert' : 'Offen'}</Badge>
                {canWrite && task.status !== 'done' && <Button data-testid="write-action" variant="secondary" onClick={() => completeTask(task.id)}>Abschließen</Button>}
              </article>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Risiken und nächste Aktion" subtitle="Keine versteckten Annahmen oder erfundenen Wahrscheinlichkeiten" />
          <div className="transaction-next-action">
            <strong>Nächste Aktion</strong>
            <p>{initial.nextAction}</p>
          </div>
          <div className="transaction-risk-list">
            {risks.slice(0, 6).map((risk) => (
              <article key={risk.id}>
                <AlertTriangle />
                <div><strong>{risk.title}</strong><p>{risk.reason}</p></div>
                <Badge tone={risk.severity === 'critical' || risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'gold' : 'neutral'}>{risk.severity}</Badge>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <Card className="transaction-security-card">
        <SectionHeader title="Sicherheitsgrenze dieses Arbeitspakets" subtitle="Keine produktive Speicherung und keine öffentlichen Datei-URLs" />
        <div className="transaction-security-grid">
          <span><FolderLock /> Providerunabhängiger Vertrag</span>
          <span><ShieldCheck /> Workspace- und Objekt-Scope</span>
          <span><UserRound /> Rollenabhängige Schreibaktionen</span>
          <span><FileWarning /> Keine echten Kundendokumente</span>
        </div>
      </Card>
    </div>
  );
}
