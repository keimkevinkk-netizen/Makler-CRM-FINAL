import type { AppState } from '../types/domain';

const todayAt = (hours: number, minutes = 0) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const offsetHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

export const seedState: AppState = {
  contacts: [
    {
      id: 'c-thomas', firstName: 'Thomas', lastName: 'Berger', phone: '+49 171 2345678',
      email: 'thomas.berger@example.de', city: 'Bruchköbel', source: 'Empfehlung', role: 'Eigentümer',
      stage: 'qualified', priority: 'high', potential: 91, lastContactAt: offsetHours(-48),
      nextActionAt: offsetHours(-24), notes: 'Eigentümergespräch geführt. Interesse an diskreter Bewertung.', createdAt: offsetHours(-400),
    },
    {
      id: 'c-claudia', firstName: 'Claudia', lastName: 'Weber', phone: '+49 160 3322110',
      city: 'Hanau', source: 'Marktbericht', role: 'Eigentümer', stage: 'appointment', priority: 'high', potential: 86,
      lastContactAt: offsetHours(-30), nextActionAt: todayAt(15, 30), notes: 'Bewertung angefragt.', createdAt: offsetHours(-250),
    },
    {
      id: 'c-julia', firstName: 'Julia', lastName: 'Reinhard', phone: '+49 151 8899221',
      city: 'Nidderau', source: 'Website', role: 'Käufer', stage: 'lead', priority: 'medium', potential: 64,
      nextActionAt: offsetHours(24), notes: 'Finanzierung angefragt.', createdAt: offsetHours(-80),
    },
    {
      id: 'c-martin', firstName: 'Martin', lastName: 'Seidel', phone: '+49 176 4488112',
      city: 'Maintal', source: 'Netzwerk', role: 'Eigentümer', stage: 'qualified', priority: 'medium', potential: 74,
      nextActionAt: offsetHours(48), notes: 'Altbau, mögliche Investment-Strategie.', createdAt: offsetHours(-300),
    },
    {
      id: 'c-markus', firstName: 'Markus', lastName: 'Huber', phone: '+49 172 5004433',
      city: 'Schöneck', source: 'Tippgeber', role: 'Eigentümer', stage: 'appointment', priority: 'low', potential: 58,
      nextActionAt: offsetHours(72), notes: 'Grundstücksanfrage.', createdAt: offsetHours(-140),
    },
  ],
  followUps: [
    { id: 'f-1', contactId: 'c-thomas', title: 'Rückruf zur diskreten Bewertung', dueAt: offsetHours(-24), priority: 'high', status: 'open', channel: 'phone' },
    { id: 'f-2', contactId: 'c-claudia', title: 'Bewertungsunterlagen nachfassen', dueAt: todayAt(15, 30), priority: 'high', status: 'open', channel: 'phone' },
    { id: 'f-3', contactId: 'c-julia', title: 'Finanzierungsstatus prüfen', dueAt: offsetHours(24), priority: 'medium', status: 'open', channel: 'phone' },
    { id: 'f-4', contactId: 'c-martin', title: 'Investment-Strategie senden', dueAt: offsetHours(36), priority: 'medium', status: 'open', channel: 'email' },
  ],
  properties: [
    { id: 'p-1', title: 'Einfamilienhaus Berger', address: 'Hauptstraße 12', city: 'Bruchköbel', type: 'Einfamilienhaus', status: 'Bewertung', estimatedValue: 625000, ownerContactId: 'c-thomas' },
    { id: 'p-2', title: 'Wohnung Weber', address: 'Nürnberger Straße 44', city: 'Hanau', type: 'Eigentumswohnung', status: 'Akquise', estimatedValue: 335000, ownerContactId: 'c-claudia' },
    { id: 'p-3', title: 'Altbau Seidel', address: 'Frankfurter Straße 82', city: 'Maintal', type: 'Mehrfamilienhaus', status: 'Vermarktung', estimatedValue: 980000, ownerContactId: 'c-martin' },
  ],
  appointments: [
    { id: 'a-1', contactId: 'c-thomas', title: 'Rückruf: Thomas Berger', subtitle: 'Eigentümergespräch · Stadtvilla', startsAt: todayAt(9, 30), status: 'now' },
    { id: 'a-2', title: 'Besichtigung: Familie Roth', subtitle: 'Einfamilienhaus · Bruchköbel', startsAt: todayAt(11), status: 'today' },
    { id: 'a-3', contactId: 'c-claudia', title: 'Nachfassen: Claudia Weber', subtitle: 'Bewertung angefordert', startsAt: todayAt(13, 15), status: 'today' },
    { id: 'a-4', contactId: 'c-martin', title: 'Beratung: Martin Seidel', subtitle: 'Investment-Strategie · Altbau', startsAt: todayAt(13, 30), status: 'tomorrow' },
    { id: 'a-5', contactId: 'c-markus', title: 'Nachfassen: Dr. Markus Huber', subtitle: 'Grundstücksanfrage · Schöneck', startsAt: todayAt(17), status: 'tomorrow' },
  ],
  callEvents: [],
};
