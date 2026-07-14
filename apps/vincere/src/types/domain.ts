export type ContactStage = 'lead' | 'qualified' | 'appointment' | 'mandate' | 'sold';
export type Priority = 'high' | 'medium' | 'low';
export type FollowUpStatus = 'open' | 'done';
export type UserRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  region: string;
  createdAt: string;
}

export interface WorkspaceUser {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: UserRole;
}

export type AuditEntity = 'workspace' | 'contact' | 'followup' | 'property' | 'call' | 'backup';

export interface AuditEvent {
  id: string;
  actorId: string;
  workspaceId: string;
  entity: AuditEntity;
  entityId?: string;
  action: string;
  summary: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city: string;
  source: string;
  role: 'Eigentümer' | 'Käufer' | 'Tippgeber' | 'Netzwerk';
  stage: ContactStage;
  priority: Priority;
  potential: number;
  lastContactAt?: string;
  nextActionAt?: string;
  notes?: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  contactId: string;
  title: string;
  dueAt: string;
  priority: Priority;
  status: FollowUpStatus;
  channel: 'phone' | 'email' | 'meeting';
}

export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  type: string;
  status: 'Akquise' | 'Bewertung' | 'Vermarktung' | 'Verkauft';
  estimatedValue: number;
  ownerContactId?: string;
}

export interface Appointment {
  id: string;
  contactId?: string;
  title: string;
  subtitle: string;
  startsAt: string;
  status: 'now' | 'today' | 'tomorrow';
}

export interface CallEvent {
  id: string;
  contactId: string;
  outcome: 'no_answer' | 'conversation' | 'appointment' | 'not_interested';
  note?: string;
  createdAt: string;
}

export interface AppState {
  schemaVersion: number;
  workspace: Workspace;
  currentUser: WorkspaceUser;
  contacts: Contact[];
  followUps: FollowUp[];
  properties: Property[];
  appointments: Appointment[];
  callEvents: CallEvent[];
  auditEvents: AuditEvent[];
}
