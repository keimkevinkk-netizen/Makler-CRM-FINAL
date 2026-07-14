import {
  BarChart3, BookOpen, Building2, CalendarCheck2, ContactRound, House, LayoutDashboard,
  Megaphone, Network, PhoneCall, Settings, ShieldAlert, Sparkles, Target, UsersRound,
} from 'lucide-react';

export const navigation = [
  { path: '/', label: 'Übersicht', icon: LayoutDashboard },
  { path: '/today', label: 'Heute', icon: CalendarCheck2 },
  { path: '/contacts', label: 'Kontakte', icon: ContactRound },
  { path: '/pipeline', label: 'Pipeline', icon: Target },
  { path: '/phone', label: 'Telefon-Assistent', icon: PhoneCall },
  { path: '/properties', label: 'Immobilien', icon: House },
  { path: '/valuations', label: 'Bewertungen', icon: BarChart3 },
  { path: '/network', label: 'Netzwerk', icon: Network },
  { path: '/campaigns', label: 'Kampagnen', icon: Megaphone },
  { path: '/knowledge', label: 'Wissen', icon: BookOpen },
  { path: '/conflicts', label: 'Konfliktzentrale', icon: ShieldAlert },
  { path: '/team', label: 'Teamverwaltung', icon: UsersRound },
  { path: '/settings', label: 'Einstellungen', icon: Settings },
] as const;

export const quickActions = [
  { label: 'Kontakt erfassen', path: '/contacts', icon: ContactRound },
  { label: 'Bewertung anlegen', path: '/valuations', icon: Sparkles },
  { label: 'Immobilie erfassen', path: '/properties', icon: Building2 },
];
