import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import type { MandateOpportunity, PipelineCapabilities } from '../../domain/pipeline/engine';

const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Nicht vorhanden';

export function MandateFocusMode({
  opportunity,
  position,
  total,
  capabilities,
  onNext,
  onCreateFollowUp,
  onCompleteFollowUp,
}: {
  opportunity?: MandateOpportunity;
  position: number;
  total: number;
  capabilities: PipelineCapabilities;
  onNext: () => void;
  onCreateFollowUp: (contactId: string) => void;
  onCompleteFollowUp: (followUpId: string) => void;
}) {
  if (!opportunity) {
    return <Card className="mandate-focus-card"><SectionHeader title="Mandatsfokus" subtitle="Die drei bis fünf wichtigsten Chancen des Tages" /><div className="mandate-empty">Aktuell ist keine priorisierte Mandatschance aus den vorhandenen Daten ableitbar.</div></Card>;
  }

  const primaryFollowUp = opportunity.openFollowUps[0];
  const finishAndAdvance = () => {
    if (primaryFollowUp) onCompleteFollowUp(primaryFollowUp.id);
    else onCreateFollowUp(opportunity.contact.id);
    onNext();
  };

  return (
    <Card className="mandate-focus-card">
      <SectionHeader
        title="Mandatsfokus"
        subtitle="Nur eine Chance. Ein klares Ziel. Danach direkt zur nächsten."
        action={<Badge tone="gold">{position + 1} / {total}</Badge>}
      />
      <div className="mandate-focus-grid">
        <section className="mandate-focus-primary">
          <div className="mandate-focus-person">
            <div className={`initials priority-${opportunity.contact.priority}`}>{opportunity.contact.firstName[0]}{opportunity.contact.lastName[0]}</div>
            <div><span className="eyebrow"><Sparkles size={14} /> Heute priorisiert</span><strong>{opportunity.contact.firstName} {opportunity.contact.lastName}</strong><span>{opportunity.contact.role} · {opportunity.contact.city} · {opportunity.stageLabel}</span></div>
            <div className="focus-score"><small>Handlungswert</small><strong>{opportunity.actionValue}</strong><span>keine Wahrscheinlichkeit</span></div>
          </div>
          <div className="mandate-focus-reason"><strong>Warum diese Chance?</strong><p>{opportunity.reason}</p></div>
          <div className="focus-facts">
            <div><small>Letzte Aktivität</small><strong>{opportunity.lastActivityLabel}<br />{formatDateTime(opportunity.lastActivityAt)}</strong></div>
            <div><small>Nächste Aktion</small><strong>{opportunity.nextAction?.title || 'Nicht geplant'}<br />{formatDateTime(opportunity.nextActionAt)}</strong></div>
          </div>
        </section>
        <section className="mandate-focus-context">
          <h3>Offene Risiken</h3>
          <div className="focus-risk-list">
            {opportunity.risks.length === 0
              ? <span className="risk-clear"><CheckCircle2 size={15} /> Keine akuten Risiken erkannt.</span>
              : opportunity.risks.slice(0, 4).map((risk) => <span key={risk}><AlertTriangle size={15} /> {risk}</span>)}
          </div>
          <div className="mandate-focus-goal"><small>Mindestziel</small><strong>{opportunity.minimumGoal}</strong></div>
          <div className="mandate-focus-goal"><small>Idealziel</small><strong>{opportunity.idealGoal}</strong></div>
        </section>
      </div>
      <div className="mandate-focus-actions">
        <Link className="button button-primary" to={`/phone?contact=${opportunity.contact.id}`}><Phone size={16} /> Gespräch starten</Link>
        {capabilities.canManageFollowUps && <Button variant="secondary" onClick={finishAndAdvance}>{primaryFollowUp ? <CheckCircle2 size={16} /> : <CalendarClock size={16} />}{primaryFollowUp ? 'Aktion erledigen' : 'Follow-up sichern'}</Button>}
        <Button variant="ghost" onClick={onNext}>Nächste Chance <ArrowRight size={16} /></Button>
        {capabilities.readOnly && <Badge>Schreibaktionen ausgeblendet</Badge>}
      </div>
    </Card>
  );
}
