import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, ClipboardList, MapPinned, Target } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { Badge, Card, EmptyState, SectionHeader } from '../../components/ui';
import type { Property } from '../../types/domain';
import { buildPropertyOpportunities, summarizePropertyPortfolio } from '../properties/propertyIntelligence';
import '../properties/property-cockpit.css';

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const statusTone = (status: Property['status']) => {
  if (status === 'Vermarktung') return 'green' as const;
  if (status === 'Bewertung') return 'gold' as const;
  if (status === 'Akquise') return 'red' as const;
  return 'neutral' as const;
};

export function ValuationsPage() {
  const store = useAppStore();
  const [selectedId, setSelectedId] = useState<string>();

  const opportunities = useMemo(() => buildPropertyOpportunities(store.properties, {
    contacts: store.contacts,
    followUps: store.followUps,
    appointments: store.appointments,
  }), [store.appointments, store.contacts, store.followUps, store.properties]);
  const summary = useMemo(() => summarizePropertyPortfolio(opportunities), [opportunities]);
  const valuationItems = useMemo(() => [...opportunities]
    .filter((item) => item.property.status !== 'Verkauft')
    .sort((left, right) => left.readiness - right.readiness || right.actionScore - left.actionScore), [opportunities]);
  const selected = valuationItems.find((item) => item.property.id === selectedId) ?? valuationItems[0];
  const missingValues = valuationItems.filter((item) => item.property.estimatedValue <= 0).length;
  const readyForReview = valuationItems.filter((item) => item.readiness >= 85).length;

  return (
    <div className="page-stack pv-page">
      <Card className="pv-hero">
        <div>
          <span className="eyebrow">Bewertungssteuerung</span>
          <h1>Bewertungsreife vor falscher Präzision.</h1>
          <p>VINCERE zeigt, welche Objekt- und Eigentümerinformationen vorliegen, welche Lücken bestehen und welcher nächste Schritt eine belastbare Bewertung vorbereitet.</p>
        </div>
        <div className="pv-hero-note"><Calculator size={18} /><span><strong>Keine Scheingenauigkeit</strong><small>Marktdatenanbieter folgen in einem getrennten, serverseitigen Arbeitspaket.</small></span></div>
      </Card>

      <div className="pv-metrics" aria-label="Bewertungskennzahlen">
        <Card><ClipboardList /><span>Offene Bewertungsfälle</span><strong>{valuationItems.length}</strong><small>{summary.active} aktive Objekte</small></Card>
        <Card><CheckCircle2 /><span>Prüfbereit</span><strong>{readyForReview}</strong><small>Mindestens 85% Datenreife</small></Card>
        <Card><AlertTriangle /><span>Ohne Arbeitswert</span><strong>{missingValues}</strong><small>Bewertungsgrundlage ergänzen</small></Card>
        <Card><MapPinned /><span>Erfasste Orte</span><strong>{new Set(valuationItems.map((item) => item.property.city).filter(Boolean)).size}</strong><small>Keine externen Marktwerte simuliert</small></Card>
      </div>

      <Card>
        <SectionHeader title="Bewertungs-Workbench" subtitle="Fälle nach Datenlücken und vertrieblichem Handlungsbedarf bearbeiten" />
        {valuationItems.length === 0 ? (
          <EmptyState title="Keine offenen Bewertungsfälle" text="Aktive Immobilien erscheinen hier automatisch." />
        ) : (
          <div className="pv-valuation-layout">
            <div className="pv-valuation-list" role="list">
              {valuationItems.map((item) => (
                <button
                  key={item.property.id}
                  type="button"
                  role="listitem"
                  className={selected?.property.id === item.property.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(item.property.id)}
                >
                  <span><strong>{item.property.title}</strong><small>{item.property.type} · {item.property.city}</small></span>
                  <span className="pv-readiness-bar"><i style={{ width: `${item.readiness}%` }} /><small>{item.readiness}% Reife</small></span>
                  <Badge tone={statusTone(item.property.status)}>{item.property.status}</Badge>
                </button>
              ))}
            </div>

            {selected && (
              <aside className="pv-valuation-detail" aria-label={`Bewertung ${selected.property.title}`}>
                <div className="pv-valuation-title">
                  <div><Badge tone={statusTone(selected.property.status)}>{selected.property.status}</Badge><h2>{selected.property.title}</h2><p>{selected.property.address}, {selected.property.city}</p></div>
                  <strong>{selected.readiness}%<small>Datenreife</small></strong>
                </div>

                <div className="pv-next-action"><Target size={19} /><div><small>Nächster Vorbereitungsschritt</small><strong>{selected.recommendedAction}</strong></div></div>

                <div className="pv-valuation-values">
                  <article><span>Hinterlegter Arbeitswert</span><strong>{selected.property.estimatedValue > 0 ? currency.format(selected.property.estimatedValue) : 'Nicht vorhanden'}</strong></article>
                  <article><span>Interner Orientierungsrahmen</span><strong>{selected.internalRange ? `${currency.format(selected.internalRange.min)} – ${currency.format(selected.internalRange.max)}` : 'Nicht berechenbar'}</strong><small>{selected.internalRange ? `± ${Math.round(selected.internalRange.spread * 100)}% aus Datenreife` : 'Zuerst Arbeitswert erfassen'}</small></article>
                  <article><span>Eigentümerkontakt</span><strong>{selected.owner ? `${selected.owner.firstName} ${selected.owner.lastName}` : 'Nicht verknüpft'}</strong><small>{selected.owner ? `${selected.owner.city} · Potenzial ${selected.owner.potential}` : 'Vertriebliche Historie fehlt'}</small></article>
                  <article><span>Vertriebssignal</span><strong>{selected.actionScore}/100</strong><small>Regelbasierter Handlungswert, keine Abschlusswahrscheinlichkeit</small></article>
                </div>

                <div className="pv-readiness-checklist">
                  <h3>Datenprüfung</h3>
                  {selected.dataGaps.length === 0
                    ? <p className="is-complete"><CheckCircle2 size={15} /> Die im aktuellen Datenmodell verfügbaren Pflichtangaben sind vollständig.</p>
                    : selected.dataGaps.map((gap) => <p key={gap}><AlertTriangle size={15} /> {gap}</p>)}
                </div>

                <div className="pv-method-note">
                  <h3>Methodische Grenze</h3>
                  <p>Der Orientierungsrahmen wird ausschließlich aus dem manuell hinterlegten Arbeitswert und der Datenreife abgeleitet. Lage-, Vergleichs-, Bodenrichtwert-, Zustands- und Marktdaten sind noch nicht angebunden. Die Anzeige ist deshalb keine Verkehrswert- oder Marktwertermittlung.</p>
                </div>
              </aside>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
