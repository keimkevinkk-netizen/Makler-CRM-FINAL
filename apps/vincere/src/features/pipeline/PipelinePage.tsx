import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CalendarClock, CircleDollarSign, Clock3, Phone, ShieldAlert, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { Badge, Card, EmptyState, SectionHeader } from '../../components/ui';
import { buildPipelineCockpit, getPipelineCapabilities, type MandateOpportunity, type PipelineViewStage } from '../../domain/pipeline/engine';
import { DealDesk } from '../mandates/DealDesk';
import { MandateFocusMode } from '../mandates/MandateFocusMode';
import type { ContactStage } from '../../types/domain';

const formatMoney = (value: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(value);

const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Keine Aktion';

const stageTone = (stage: PipelineViewStage): 'red' | 'gold' | 'green' | 'blue' | 'neutral' => {
  if (stage === 'mandate') return 'gold';
  if (stage === 'sold') return 'green';
  if (stage === 'appointment') return 'blue';
  if (stage === 'inactive') return 'neutral';
  return 'neutral';
};

export function PipelinePage() {
  const store = useAppStore();
  const [now] = useState(() => Date.now());
  const model = useMemo(() => buildPipelineCockpit(store, now), [store, now]);
  const capabilities = getPipelineCapabilities(store.currentUser.role);
  const [selectedId, setSelectedId] = useState<string>();
  const [focusIndex, setFocusIndex] = useState(0);
  const selectedOpportunity = model.opportunities.find((opportunity) => opportunity.id === selectedId)
    ?? model.focusOpportunities[0]
    ?? model.opportunities[0];
  const focusOpportunity = model.focusOpportunities[focusIndex % Math.max(1, model.focusOpportunities.length)];

  const createFollowUp = (contactId: string) => {
    const contact = store.contacts.find((item) => item.id === contactId);
    const dueAt = new Date(now + 24 * 3_600_000);
    dueAt.setHours(10, 0, 0, 0);
    store.addFollowUp({
      contactId,
      title: contact?.stage === 'appointment' ? 'Mandatsnachbereitung verbindlich durchführen' : 'Nächsten Mandatsschritt klären',
      dueAt: dueAt.toISOString(),
      priority: contact?.priority ?? 'medium',
      status: 'open',
      channel: 'phone',
    });
  };

  const completeFollowUp = (followUpId: string) => store.completeFollowUp(followUpId);
  const moveStage = (contactId: string, stage: ContactStage) => store.moveContactStage(contactId, stage);
  const showNextFocus = () => setFocusIndex((current) => model.focusOpportunities.length > 0 ? (current + 1) % model.focusOpportunities.length : 0);

  return (
    <div className="page-stack mandate-pipeline-page">
      <Card className="pipeline-command-hero">
        <div>
          <span className="eyebrow">Mandats- und Abschlusssteuerung</span>
          <h1>Jede Chance braucht ein klares Ziel, eine nächste Aktion und sichtbare Risiken.</h1>
          <p>VINCERE priorisiert deterministisch aus vorhandenen Kontakten, Gesprächen, Terminen, Follow-ups und Immobilien. Der Handlungswert ist keine Abschlusswahrscheinlichkeit.</p>
        </div>
        <div className="pipeline-hero-metrics">
          <article><Target size={18} /><strong>{model.health.activeOpportunities}</strong><span>aktive Chancen</span></article>
          <article><CalendarClock size={18} /><strong>{model.health.opportunitiesWithoutNextAction}</strong><span>ohne nächste Aktion</span></article>
          <article><ShieldAlert size={18} /><strong>{model.health.overdueOpportunities}</strong><span>überfällig</span></article>
        </div>
      </Card>

      <MandateFocusMode
        opportunity={focusOpportunity}
        position={focusIndex % Math.max(1, model.focusOpportunities.length)}
        total={model.focusOpportunities.length}
        capabilities={capabilities}
        onNext={showNextFocus}
        onCreateFollowUp={createFollowUp}
        onCompleteFollowUp={completeFollowUp}
      />

      <Card className="pipeline-health-card">
        <SectionHeader title="Pipeline-Gesundheit" subtitle="Nachvollziehbare Bestandsaufnahme ohne erfundene Übergänge oder Quoten" />
        <div className="health-metrics">
          <article><BarChart3 size={19} /><small>Kontakte ohne Fortschritt</small><strong>{model.health.contactsWithoutProgress}</strong></article>
          <article><CircleDollarSign size={19} /><small>Bekannter Objektwert</small><strong>{formatMoney(model.health.knownPropertyValue)}</strong></article>
          <article><Clock3 size={19} /><small>Früh : fortgeschritten</small><strong>{model.health.earlyToAdvancedRatio === undefined ? 'Nicht ableitbar' : `${model.health.earlyToAdvancedRatio}:1`}</strong></article>
          <article><CalendarClock size={19} /><small>Bevorstehende Termine</small><strong>{model.health.upcomingAppointments}</strong></article>
        </div>
        <div className="stage-health-grid">
          {model.health.stages.map((stage) => <article key={stage.stage}>
            <div><Badge tone={stageTone(stage.stage)}>{stage.label}</Badge><strong>{stage.count}</strong></div>
            <dl>
              <div><dt>Bekannter Wert</dt><dd>{formatMoney(stage.knownPropertyValue)}</dd></div>
              <div><dt>Ohne nächste Aktion</dt><dd>{stage.contactsWithoutNextAction}</dd></div>
              <div><dt>Stagnierend</dt><dd>{stage.contactsWithoutProgress}</dd></div>
              <div><dt>Ø beobachtete Inaktivität</dt><dd>{stage.averageObservedInactivityDays === undefined ? 'Keine Daten' : `${stage.averageObservedInactivityDays} Tage`}</dd></div>
              <div><dt>Ø Verweildauer</dt><dd>Nicht rekonstruierbar</dd></div>
            </dl>
          </article>)}
        </div>
        <div className="pipeline-diagnostics">
          <section><h3>Mögliche Engpässe</h3>{model.health.bottlenecks.length === 0 ? <p>Keine akuten Engpässe aus vorhandenen Daten ableitbar.</p> : model.health.bottlenecks.map((item) => <span key={item}><AlertTriangle size={15} /> {item}</span>)}</section>
          <section><h3>Daten- und Methodengrenzen</h3>{model.health.limitations.map((item) => <span key={item}>{item}</span>)}</section>
          {model.health.relationshipErrors.length > 0 && <section><h3>Fehlerhafte Beziehungen</h3>{model.health.relationshipErrors.map((item) => <span key={item}><ShieldAlert size={15} /> {item}</span>)}</section>}
        </div>
      </Card>

      <Card className="mandate-board-card">
        <SectionHeader title="Mandatspipeline" subtitle="Klare Stufen, bekannte Werte, nächste Aktionen und Risiken auf einen Blick" />
        {model.opportunities.length === 0 ? <EmptyState title="Leere Pipeline" text="Sobald Kontakte vorhanden sind, wird die Mandatssteuerung aus den bestehenden Daten aufgebaut." /> : (
          <div className="mandate-board">
            {model.stages.map((stage) => {
              const opportunities = model.opportunities.filter((opportunity) => opportunity.stage === stage.id);
              return <section className="mandate-stage" key={stage.id}>
                <header><div><Badge tone={stageTone(stage.id)}>{stage.label}</Badge><small>{stage.subtitle}</small></div><strong>{opportunities.length}</strong></header>
                <div className="mandate-stage-list">
                  {opportunities.length === 0 && <span className="stage-empty">Keine Kontakte</span>}
                  {opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} selected={selectedOpportunity?.id === opportunity.id} onSelect={() => setSelectedId(opportunity.id)} />)}
                </div>
              </section>;
            })}
          </div>
        )}
      </Card>

      <DealDesk
        opportunity={selectedOpportunity}
        capabilities={capabilities}
        onCreateFollowUp={createFollowUp}
        onCompleteFollowUp={completeFollowUp}
        onMoveStage={moveStage}
      />
    </div>
  );
}

function OpportunityCard({ opportunity, selected, onSelect }: { opportunity: MandateOpportunity; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`mandate-card ${selected ? 'selected' : ''}`}>
      <button className="mandate-card-main" onClick={onSelect}>
        <div className="mandate-card-top">
          <span className={`initials priority-${opportunity.contact.priority}`}>{opportunity.contact.firstName[0]}{opportunity.contact.lastName[0]}</span>
          <div><strong>{opportunity.contact.firstName} {opportunity.contact.lastName}</strong><span>{opportunity.contact.role} · {opportunity.contact.city}</span></div>
          <em>{opportunity.actionValue}</em>
        </div>
        <p>{opportunity.reason}</p>
        <div className="mandate-card-meta"><span><Clock3 size={13} /> {formatDateTime(opportunity.lastActivityAt)}</span><span className={opportunity.isOverdue ? 'overdue' : ''}><CalendarClock size={13} /> {formatDateTime(opportunity.nextActionAt)}</span></div>
        <div className="mandate-card-risks">
          {opportunity.risks.slice(0, 2).map((risk) => <span key={risk}><AlertTriangle size={13} /> {risk}</span>)}
          {opportunity.risks.length === 0 && <span className="risk-clear">Keine akuten Risiken</span>}
        </div>
      </button>
      <div className="mandate-card-actions"><Link className="icon-button" to={`/phone?contact=${opportunity.contact.id}`} aria-label={`${opportunity.contact.firstName} ${opportunity.contact.lastName} anrufen`}><Phone size={15} /></Link><button className="button button-ghost" onClick={onSelect}>Deal Desk <ArrowRight size={14} /></button></div>
    </article>
  );
}
