import { useMemo, useState } from 'react';
import { Calculator, Info, Target } from 'lucide-react';
import { calculateSalesScenario } from '../../domain/forecast/engine';
import type { ScenarioInput } from '../../domain/forecast/model';

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

interface ScenarioActuals {
  contacts: number;
  conversations: number;
  appointments: number;
}

function percentValue(value: number) {
  return Math.round(value * 1000) / 10;
}

function NumberField({ label, value, onChange, suffix, min = 0, step = 1 }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="forecast-field">
      <span>{label}</span>
      <div>
        <input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event: { target: { value: string } }) => onChange(Number(event.target.value))}
        />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

export function ScenarioPlanner({ actuals }: { actuals: ScenarioActuals }) {
  const [input, setInput] = useState<ScenarioInput>({
    annualGoal: 100_000,
    monthlyGoal: 8_333,
    averagePropertyValue: 400_000,
    effectiveCommissionRate: 0.021,
    contactToConversationRate: 0.35,
    conversationToAppointmentRate: 0.3,
    appointmentToMandateRate: 0.45,
    mandateToSaleRate: 0.5,
    availableWorkDays: 20,
  });
  const result = useMemo(() => calculateSalesScenario(input), [input]);
  const update = <K extends keyof ScenarioInput,>(key: K, value: ScenarioInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };
  const gaps = {
    contacts: Math.max(0, result.contacts - actuals.contacts),
    conversations: Math.max(0, result.conversations - actuals.conversations),
    appointments: Math.max(0, result.appointments - actuals.appointments),
  };

  return (
    <div className="scenario-planner">
      <div className="scenario-heading">
        <div>
          <span className="scenario-icon"><Calculator size={18} /></span>
          <div><strong>Ziel- und Szenarioplanung</strong><small>Nur lokaler UI-Zustand · keine Speicherung</small></div>
        </div>
        <span className="method-chip"><Info size={14} /> Annahmen, keine Prognose</span>
      </div>

      <div className="scenario-input-grid">
        <NumberField label="Jahresziel" value={input.annualGoal} onChange={(value) => update('annualGoal', value)} suffix="€" step={1_000} />
        <NumberField label="Monatsziel" value={input.monthlyGoal} onChange={(value) => update('monthlyGoal', value)} suffix="€" step={500} />
        <NumberField label="Ø Objektwert" value={input.averagePropertyValue} onChange={(value) => update('averagePropertyValue', value)} suffix="€" step={10_000} />
        <NumberField label="Effektiver Provisionsanteil" value={percentValue(input.effectiveCommissionRate)} onChange={(value) => update('effectiveCommissionRate', value / 100)} suffix="%" step={0.1} />
        <NumberField label="Kontakt → Gespräch" value={percentValue(input.contactToConversationRate)} onChange={(value) => update('contactToConversationRate', value / 100)} suffix="%" step={1} />
        <NumberField label="Gespräch → Termin" value={percentValue(input.conversationToAppointmentRate)} onChange={(value) => update('conversationToAppointmentRate', value / 100)} suffix="%" step={1} />
        <NumberField label="Termin → Mandat" value={percentValue(input.appointmentToMandateRate)} onChange={(value) => update('appointmentToMandateRate', value / 100)} suffix="%" step={1} />
        <NumberField label="Mandat → Abschluss" value={percentValue(input.mandateToSaleRate)} onChange={(value) => update('mandateToSaleRate', value / 100)} suffix="%" step={1} />
        <NumberField label="Arbeitstage / Monat" value={input.availableWorkDays} onChange={(value) => update('availableWorkDays', value)} suffix="Tage" min={1} />
      </div>

      {result.issues.length > 0 ? (
        <div className="scenario-errors">{result.issues.map((issue) => <span key={issue}>{issue}</span>)}</div>
      ) : (
        <>
          <div className="scenario-summary">
            <div><small>Erlös je Abschluss</small><strong>{euro.format(result.revenuePerClosing)}</strong></div>
            <div><small>Abschlüsse / Monat</small><strong>{result.closings}</strong></div>
            <div><small>Mandate / Monat</small><strong>{result.mandates}</strong></div>
            <div><small>Termine / Monat</small><strong>{result.appointments}</strong></div>
            <div><small>Gespräche / Monat</small><strong>{result.conversations}</strong></div>
            <div><small>Kontakte / Monat</small><strong>{result.contacts}</strong></div>
          </div>

          <div className="activity-gap-grid">
            <div className="activity-gap-title">
              <Target size={18} />
              <span><strong>Aktivitätslücke im laufenden Monat</strong><small>Ist-Werte aus dokumentierten Kontakten, Gesprächen und Terminen</small></span>
            </div>
            <div><small>Fehlende Kontakte</small><strong>{gaps.contacts}</strong><span>{actuals.contacts} von {result.contacts}</span></div>
            <div><small>Fehlende Gespräche</small><strong>{gaps.conversations}</strong><span>{actuals.conversations} von {result.conversations}</span></div>
            <div><small>Fehlende Termine</small><strong>{gaps.appointments}</strong><span>{actuals.appointments} von {result.appointments}</span></div>
          </div>

          <div className="scenario-cadence">
            <div><strong>Tagesbedarf</strong><span>{number.format(result.daily.contacts)} Kontakte · {number.format(result.daily.conversations)} Gespräche · {number.format(result.daily.appointments)} Termine</span></div>
            <div><strong>Wochenbedarf</strong><span>{number.format(result.weekly.contacts)} Kontakte · {number.format(result.weekly.conversations)} Gespräche · {number.format(result.weekly.appointments)} Termine</span></div>
          </div>
        </>
      )}

      <details className="method-details">
        <summary>Formeln der Szenariorechnung</summary>
        {result.formulas.map((formula) => <p key={formula}>{formula}</p>)}
      </details>
    </div>
  );
}
