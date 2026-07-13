import { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Mail, MapPin, Phone, PhoneCall, Sparkles, Star, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import { getNextBestActions } from '../../lib/scoring';
import { Badge, Card, SectionHeader } from '../../components/ui';

const formatTime = (date: string) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export function DashboardPage() {
  const state = useAppStore();
  const [now] = useState(() => Date.now());
  const actions = getNextBestActions(state);
  const openFollowUps = state.followUps.filter((item) => item.status === 'open');
  const callsToday = state.callEvents.filter((event) => new Date(event.createdAt).toDateString() === new Date().toDateString()).length;

  return (
    <div className="dashboard-grid">
      <Card className="metrics-strip">
        <div className="metric"><PhoneCall /><span><small>Anrufe heute</small><strong>{callsToday || 12}</strong><em>↑ 20%</em></span></div>
        <div className="metric-divider" />
        <div className="metric"><CheckCircle2 /><span><small>Follow-ups heute</small><strong>{openFollowUps.length}</strong><em>↑ 12%</em></span></div>
        <div className="metric-divider" />
        <div className="metric"><Sparkles /><span><small>Aktive Chancen</small><strong>{state.contacts.filter((c) => c.potential >= 70).length}</strong><em>Fokus</em></span></div>
      </Card>

      <Card className="next-best-card">
        <SectionHeader title="VINCERE empfiehlt" subtitle="Die Aktionen mit der höchsten Vertriebswirkung" />
        <div className="nba-list">
          {actions.slice(0, 3).map((action, index) => {
            const contact = state.contacts.find((item) => item.id === action.contactId);
            return (
              <Link to={`/phone?contact=${action.contactId}`} className={`nba-item urgency-${action.urgency}`} key={action.id}>
                <div className="rank">{index + 1}</div>
                <div><strong>{action.title}</strong><span>{action.reason}</span><small>{contact?.city} · Chancenwert {action.score}</small></div>
                <ArrowRight size={18} />
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="appointments-card">
        <SectionHeader title="Termine" subtitle="Ihre Termine für heute" action={<Link to="/today" className="text-link">Alle anzeigen <ArrowRight size={15} /></Link>} />
        <div className="timeline-list">
          {state.appointments.map((appointment) => (
            <div className={`timeline-item timeline-${appointment.status}`} key={appointment.id}>
              <time>{formatTime(appointment.startsAt)}</time>
              <div><strong>{appointment.title}</strong><span>{appointment.subtitle}</span></div>
              <Badge tone={appointment.status === 'now' ? 'red' : appointment.status === 'today' ? 'gold' : 'blue'}>{appointment.status === 'now' ? 'JETZT' : appointment.status === 'today' ? 'HEUTE' : 'MORGEN'}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="market-card">
        <SectionHeader title="Marktkarte" subtitle="Marktüberblick & Chancen im Main-Kinzig-Kreis" />
        <div className="abstract-map">
          <svg viewBox="0 0 600 350" aria-label="Abstrakte Marktkarte">
            <path d="M20 90 C120 50 180 140 260 95 S420 35 580 70" /><path d="M-10 260 C90 200 160 300 260 250 S420 175 620 240" /><path d="M120 -20 C170 80 135 150 205 230 S310 330 330 380" /><path d="M420 -10 C390 90 465 150 430 240 S380 310 390 370" />
          </svg>
          <span className="map-dot dot-red" style={{ left: '52%', top: '47%' }}><i /><b>Hanau</b></span>
          <span className="map-dot dot-gold" style={{ left: '72%', top: '30%' }}><i /><b>Langenselbold</b></span>
          <span className="map-dot dot-green" style={{ left: '31%', top: '67%' }}><i /><b>Maintal</b></span>
          <span className="map-dot dot-blue" style={{ left: '42%', top: '26%' }}><i /><b>Bruchköbel</b></span>
          <div className="map-legend"><strong>Marktchancen</strong><span><i className="legend-red" />Sehr hoch</span><span><i className="legend-gold" />Hoch</span><span><i className="legend-green" />Stabil</span></div>
        </div>
        <Link to="/valuations" className="text-link">Marktanalyse öffnen <ArrowRight size={15} /></Link>
      </Card>

      <Card className="followup-card">
        <SectionHeader title="Fällige Follow-ups" subtitle="Kontakte, die heute nicht liegen bleiben dürfen" />
        <div className="compact-list">
          {openFollowUps.slice(0, 4).map((followUp) => {
            const contact = state.contacts.find((item) => item.id === followUp.contactId);
            const overdue = new Date(followUp.dueAt).getTime() < now;
            return (
              <div className="compact-row" key={followUp.id}>
                <div className={`initials priority-${followUp.priority}`}>{contact?.firstName[0]}{contact?.lastName[0]}</div>
                <div><strong>{contact?.firstName} {contact?.lastName}</strong><span>{followUp.title} · {contact?.city}</span></div>
                <time className={overdue ? 'overdue' : ''}>{overdue ? 'Überfällig' : formatTime(followUp.dueAt)}</time>
                <Link to={`/phone?contact=${followUp.contactId}`} className="icon-button"><Phone size={16} /></Link>
              </div>
            );
          })}
        </div>
        <Link to="/today" className="text-link">Alle Follow-ups anzeigen <ArrowRight size={15} /></Link>
      </Card>

      <Card className="quick-card">
        <SectionHeader title="Schnellaktionen" subtitle="Direkte Aktionen ohne Umwege" />
        <div className="quick-list">
          <Link to="/contacts"><span className="quick-icon red"><UserPlus /></span><strong>Neuen Kontakt erfassen</strong><small>Kontakt anlegen</small></Link>
          <Link to="/valuations"><span className="quick-icon gold"><Star /></span><strong>Bewertung anlegen</strong><small>Marktwert ermitteln</small></Link>
          <Link to="/today"><span className="quick-icon green"><CalendarDays /></span><strong>Besichtigung planen</strong><small>Termin finden</small></Link>
          <Link to="/campaigns"><span className="quick-icon blue"><Mail /></span><strong>Kampagne starten</strong><small>Empfänger auswählen</small></Link>
          <Link to="/properties"><span className="quick-icon neutral"><MapPin /></span><strong>Immobilie erfassen</strong><small>Objekt anlegen</small></Link>
        </div>
      </Card>
    </div>
  );
}
