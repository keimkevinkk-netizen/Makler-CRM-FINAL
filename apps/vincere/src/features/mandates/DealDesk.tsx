import { AlertTriangle, CalendarClock, CheckCircle2, FileQuestion, House, Phone, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import type { MandateOpportunity, PipelineCapabilities } from '../../domain/pipeline/engine';
import type { ContactStage } from '../../types/domain';

const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Nicht vorhanden';

const formatMoney = (value: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(value);

const nextStage: Partial<Record<ContactStage, ContactStage>> = {
  lead: 'qualified',
  qualified: 'appointment',
  appointment: 'mandate',
  mandate: 'sold',
};

export function DealDesk({
  opportunity,
  capabilities,
  onCreateFollowUp,
  onCompleteFollowUp,
  onMoveStage,
}: {
  opportunity?: MandateOpportunity;
  capabilities: PipelineCapabilities;
  onCreateFollowUp: (contactId: string) => void;
  onCompleteFollowUp: (followUpId: string) => void;
  onMoveStage: (contactId: string, stage: ContactStage) => void;
}) {
  if (!opportunity) {
    return <Card className="deal-desk"><SectionHeader title="Deal Desk" subtitle="Eine Mandatschance auswählen" /><div className="mandate-empty">Keine Chance ausgewählt.</div></Card>;
  }

  const advanceTo = opportunity.stage === 'inactive' ? undefined : nextStage[opportunity.stage];

  return (
    <Card className="deal-desk">
      <SectionHeader
        title="Deal Desk"
        subtitle="Eine Chance vollständig vorbereiten, Risiken schließen und das Gespräch auf ein Ziel ausrichten"
        action={<Badge tone={opportunity.isOverdue ? 'red' : opportunity.stage === 'mandate' ? 'gold' : 'neutral'}>{opportunity.stageLabel}</Badge>}
      />

      <div className="deal-desk-hero">
        <div className={`initials priority-${opportunity.contact.priority}`}>{opportunity.contact.firstName[0]}{opportunity.contact.lastName[0]}</div>
        <div>
          <span className="eyebrow">Mandatschance</span>
          <h2>{opportunity.contact.firstName} {opportunity.contact.lastName}</h2>
          <p>{opportunity.contact.role} · {opportunity.contact.city} · {opportunity.contact.source}</p>
        </div>
        <div className="action-value"><small>Handlungswert</small><strong>{opportunity.actionValue}</strong><span>keine Wahrscheinlichkeit</span></div>
      </div>

      <div className="deal-desk-goals">
        <article><Target size={18} /><div><small>Mindestziel</small><strong>{opportunity.minimumGoal}</strong></div></article>
        <article><CheckCircle2 size={18} /><div><small>Idealziel</small><strong>{opportunity.idealGoal}</strong></div></article>
      </div>

      <div className="deal-desk-grid">
        <section>
          <h3>Letzte Gespräche</h3>
          {opportunity.calls.length === 0 && <p className="muted-copy">Keine Gespräche dokumentiert.</p>}
          {opportunity.calls.slice(0, 4).map((call) => <article className="deal-line" key={call.id}><span>{formatDateTime(call.createdAt)}</span><strong>{call.outcome === 'appointment' ? 'Termin vereinbart' : call.outcome === 'conversation' ? 'Gespräch geführt' : call.outcome === 'no_answer' ? 'Nicht erreicht' : 'Kein Interesse'}</strong><p>{call.note || 'Keine Gesprächsnotiz vorhanden.'}</p></article>)}
        </section>

        <section>
          <h3>Offene Follow-ups</h3>
          {opportunity.openFollowUps.length === 0 && <p className="muted-copy">Keine offene Folgeaktion.</p>}
          {opportunity.openFollowUps.map((followUp) => <article className="deal-line" key={followUp.id}><span>{formatDateTime(followUp.dueAt)}</span><strong>{followUp.title}</strong><p>{followUp.channel === 'phone' ? 'Telefon' : followUp.channel === 'email' ? 'E-Mail' : 'Termin'}</p>{capabilities.canManageFollowUps && <Button variant="ghost" onClick={() => onCompleteFollowUp(followUp.id)}><CheckCircle2 size={15} /> Erledigen</Button>}</article>)}
        </section>

        <section>
          <h3>Termine</h3>
          {opportunity.appointments.length === 0 && <p className="muted-copy">Keine Termine verknüpft.</p>}
          {opportunity.appointments.slice(0, 4).map((appointment) => <article className="deal-line" key={appointment.id}><span>{formatDateTime(appointment.startsAt)}</span><strong>{appointment.title}</strong><p>{appointment.subtitle}</p></article>)}
        </section>

        <section>
          <h3>Immobilien</h3>
          {opportunity.properties.length === 0 && <p className="muted-copy">Keine Immobilie sicher verknüpft.</p>}
          {opportunity.properties.map((property) => <article className="deal-line" key={property.id}><span>{property.status}</span><strong>{property.title}</strong><p><House size={13} /> {property.address}, {property.city} · {formatMoney(property.estimatedValue)}</p></article>)}
        </section>

        <section>
          <h3>Bekannte Einwände</h3>
          {opportunity.knownObjections.length === 0 && <p className="muted-copy">Keine Einwände aus vorhandenen Notizen sicher ableitbar.</p>}
          {opportunity.knownObjections.map((objection) => <article className="risk-line" key={objection}><FileQuestion size={16} /><span>{objection}</span></article>)}
        </section>

        <section>
          <h3>Risikoübersicht</h3>
          {opportunity.risks.length === 0 && <p className="muted-copy">Keine akuten Risiken aus vorhandenen Signalen abgeleitet.</p>}
          {opportunity.risks.map((risk) => <article className="risk-line" key={risk}><AlertTriangle size={16} /><span>{risk}</span></article>)}
        </section>

        <section>
          <h3>Offene Fragen & Datenlücken</h3>
          {opportunity.missingData.length === 0 && <p className="muted-copy">Keine wesentlichen Datenlücken erkannt.</p>}
          {opportunity.missingData.map((item) => <article className="risk-line neutral-risk" key={item}><FileQuestion size={16} /><span>{item}</span></article>)}
        </section>

        <section>
          <h3>Nächste beste Aktion</h3>
          <article className="recommended-action"><CalendarClock size={20} /><div><strong>{opportunity.recommendedAction}</strong><p>{opportunity.reason}</p><small>Letzte Aktivität: {opportunity.lastActivityLabel} · {formatDateTime(opportunity.lastActivityAt)}</small></div></article>
        </section>
      </div>

      <div className="deal-desk-actions">
        <Link className="button button-primary" to={`/phone?contact=${opportunity.contact.id}`}><Phone size={16} /> Gespräch vorbereiten</Link>
        {capabilities.canManageFollowUps && opportunity.openFollowUps.length === 0 && <Button variant="secondary" onClick={() => onCreateFollowUp(opportunity.contact.id)}><CalendarClock size={16} /> Follow-up anlegen</Button>}
        {capabilities.canMovePipeline && advanceTo && <Button variant="secondary" onClick={() => onMoveStage(opportunity.contact.id, advanceTo)}>In nächste Stufe</Button>}
        {capabilities.readOnly && <Badge>Nur Lesezugriff</Badge>}
      </div>
    </Card>
  );
}
