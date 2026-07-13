import { BookOpen, Brain, ChevronRight, GraduationCap, PhoneCall } from 'lucide-react';
import { Card, SectionHeader } from '../../components/ui';

const modules = [
  ['Telefonakquise', 'Eröffnung, Diagnose, Einwandbehandlung und Abschluss', PhoneCall, 72],
  ['Eigentümergespräch', 'Bedarf, Vertrauen, Preisstrategie und Auftrag', GraduationCap, 48],
  ['MKK-Marktkenntnis', 'Orte, Mikrolagen, Zielgruppen und Marktbewegungen', BookOpen, 61],
  ['Unternehmerdenken', 'Priorisierung, Systeme, Kennzahlen und Wachstum', Brain, 35],
];

export function KnowledgePage() {
  return <div className="page-stack"><Card><SectionHeader title="VINCERE Academy" subtitle="Wissen wird nur dann wertvoll, wenn es das nächste Gespräch verbessert" /><div className="learning-grid">{modules.map(([title, description, Icon, progress]) => { const IconComponent = Icon as typeof BookOpen; return <article key={String(title)}><span className="learning-icon"><IconComponent /></span><div><strong>{String(title)}</strong><p>{String(description)}</p></div><div className="progress"><i style={{ width: `${Number(progress)}%` }} /><span>{String(progress)}%</span></div><button className="icon-button"><ChevronRight /></button></article>; })}</div></Card></div>;
}
