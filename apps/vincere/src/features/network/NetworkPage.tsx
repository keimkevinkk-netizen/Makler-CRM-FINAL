import { Handshake, Network, Star, Users } from 'lucide-react';
import { Card, SectionHeader } from '../../components/ui';

const partners = [
  ['Finanzierung', 'Sebastian König', 'Baufinanzierung · Hanau', 8],
  ['Notariat', 'Dr. Lena Busch', 'Immobilienrecht · Frankfurt', 4],
  ['Handwerk', 'Markus Stahl', 'Sanierung · Bruchköbel', 6],
  ['Tippgeber', 'Nina Schneider', 'Lokales Netzwerk · Nidderau', 5],
];

export function NetworkPage() {
  return <div className="page-stack"><div className="three-card-grid"><Card><Users /><strong>23</strong><span>Aktive Partner</span></Card><Card><Handshake /><strong>11</strong><span>Empfehlungen dieses Jahr</span></Card><Card><Star /><strong>4,8</strong><span>Netzwerkqualität</span></Card></div><Card><SectionHeader title="Netzwerk & Tippgeber" subtitle="Beziehungen systematisch aufbauen, pflegen und aktivieren" /><div className="partner-grid">{partners.map(([type, name, detail, score]) => <article key={name}><span className="partner-icon"><Network /></span><small>{type}</small><strong>{name}</strong><p>{detail}</p><div className="partner-score"><span>{score} Empfehlungen</span><button className="button button-secondary">Kontaktieren</button></div></article>)}</div></Card></div>;
}
