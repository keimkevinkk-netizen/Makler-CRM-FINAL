import { BarChart3, Mail, Megaphone, Plus, Send } from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';

const campaigns = [
  ['Marktbericht Bruchköbel Q3', 'Eigentümer · Bruchköbel', 'Aktiv', '42%', '8 Antworten'],
  ['Bewertungsaktion Hanau', 'Eigentümer · Hanau', 'Entwurf', '–', '–'],
  ['Netzwerk-Update Juli', 'Partner & Tippgeber', 'Beendet', '68%', '12 Antworten'],
];

export function CampaignsPage() {
  return <div className="page-stack"><Card className="hero-card"><div><span className="eyebrow">Aktivierung</span><h1>Relevante Botschaften statt beliebiger Massenkommunikation.</h1><p>Kampagnen werden nach Gebiet, Beziehung, Anlass und nächstem sinnvollen Schritt segmentiert.</p></div><Button><Plus size={17} /> Kampagne starten</Button></Card><Card><SectionHeader title="Kampagnen" subtitle="Status, Resonanz und vertriebliche Wirkung" /><div className="campaign-list">{campaigns.map(([title, audience, status, open, replies]) => <article key={title}><span className="campaign-icon"><Megaphone /></span><div><strong>{title}</strong><span>{audience}</span></div><Badge tone={status === 'Aktiv' ? 'green' : status === 'Entwurf' ? 'gold' : 'neutral'}>{status}</Badge><div><small>Öffnungen</small><strong>{open}</strong></div><div><small>Resonanz</small><strong>{replies}</strong></div><button className="icon-button"><Send size={16} /></button></article>)}</div></Card><div className="three-card-grid"><Card><Mail /><strong>1.248</strong><span>Kontakte erreicht</span></Card><Card><BarChart3 /><strong>51%</strong><span>Durchschnittliche Öffnung</span></Card><Card><Send /><strong>7,2%</strong><span>Antwortquote</span></Card></div></div>;
}
