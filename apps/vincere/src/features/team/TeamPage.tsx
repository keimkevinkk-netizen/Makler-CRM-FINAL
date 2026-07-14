import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Ban, Check, Clock3, Copy, KeyRound, RefreshCw, ShieldCheck, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { useAppStore } from '../../app/AppStore';
import { useAuth } from '../../auth/AuthContext';
import { supabaseConfig } from '../../config/runtime';
import { Badge, Button, Card, EmptyState, Modal, SectionHeader } from '../../components/ui';
import {
  SupabaseTeamRepository,
  canChangeMemberRole,
  canManageTeam,
  canSetMemberActive,
  roleLabels,
  type CreatedInvitation,
  type TeamMember,
  type WorkspaceInvitation,
} from '../../team/teamRepository';
import type { UserRole } from '../../types/domain';

const invitationLabels = {
  pending: 'Ausstehend',
  accepted: 'Angenommen',
  expired: 'Abgelaufen',
  revoked: 'Widerrufen',
} as const;

const formatDate = (value: string) => new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export function TeamPage() {
  const store = useAppStore();
  const auth = useAuth();
  const repository = useMemo(() => new SupabaseTeamRepository(supabaseConfig), []);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation | null>(null);
  const [invite, setInvite] = useState({ email: '', role: 'agent' as UserRole, expiresHours: 168 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const manager = canManageTeam(store.currentUser.role);
  const activeOwners = members.filter((member) => member.isActive && member.role === 'owner').length;

  const refresh = async () => {
    if (!auth.session || !auth.membership) return;
    setLoading(true);
    setMessage('');
    try {
      const loadedMembers = await repository.listMembers(auth.membership.workspaceId, auth.session);
      setMembers(loadedMembers);
      setInvitations(manager ? await repository.listInvitations(auth.membership.workspaceId, auth.session) : []);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Die Teamdaten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
    // The authenticated workspace and role are the intentional refresh boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.membership?.workspaceId, auth.session?.userId, manager]);

  const submitInvitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.session || !auth.membership) return;
    setLoading(true);
    setMessage('');
    try {
      const created = await repository.createInvitation({
        workspaceId: auth.membership.workspaceId,
        email: invite.email,
        role: invite.role,
        expiresHours: invite.expiresHours,
      }, auth.session);
      setCreatedInvitation(created);
      setInviteOpen(false);
      setInvite({ email: '', role: 'agent', expiresHours: 168 });
      await refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Die Einladung konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (member: TeamMember, role: UserRole) => {
    if (!auth.session) return;
    const decision = canChangeMemberRole({
      actorRole: store.currentUser.role,
      actorUserId: store.currentUser.id,
      targetUserId: member.userId,
      targetRole: member.role,
      nextRole: role,
      activeOwnerCount: activeOwners,
    });
    if (!decision.allowed) { setMessage(decision.reason ?? 'Rollenänderung nicht erlaubt.'); return; }
    setLoading(true);
    try {
      await repository.changeRole(store.workspace.id, member.userId, role, auth.session);
      setMessage('Rolle wurde sicher aktualisiert.');
      await refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Die Rolle konnte nicht geändert werden.');
    } finally { setLoading(false); }
  };

  const setActive = async (member: TeamMember, active: boolean) => {
    if (!auth.session) return;
    const decision = canSetMemberActive({
      actorRole: store.currentUser.role,
      actorUserId: store.currentUser.id,
      targetUserId: member.userId,
      targetRole: member.role,
      nextActive: active,
      activeOwnerCount: activeOwners,
    });
    if (!decision.allowed) { setMessage(decision.reason ?? 'Mitgliedsänderung nicht erlaubt.'); return; }
    setLoading(true);
    try {
      await repository.setMemberActive(store.workspace.id, member.userId, active, auth.session);
      setMessage(active ? 'Mitglied wurde reaktiviert.' : 'Mitglied wurde deaktiviert.');
      await refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Das Mitglied konnte nicht aktualisiert werden.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-stack">
      <Card className="hero-card collaboration-hero">
        <div><span className="eyebrow"><UsersRound size={15} /> Zusammenarbeit</span><h1>Klare Rollen. Sichere Grenzen. Ein gemeinsamer Workspace.</h1><p>Owner, Administratoren, Makler und Leser arbeiten auf derselben Datenbasis. Schreibrechte werden nicht nur in der Oberfläche, sondern durch PostgreSQL Row Level Security und geprüfte Datenbankfunktionen erzwungen.</p></div>
        {manager && <Button onClick={() => setInviteOpen(true)}><UserPlus size={17} /> Mitglied einladen</Button>}
      </Card>

      <Card>
        <SectionHeader title="Mitgliederübersicht" subtitle={`${members.filter((member) => member.isActive).length} aktive Mitglieder · ${activeOwners} aktive Owner`} action={<Button variant="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} /> Aktualisieren</Button>} />
        {members.length === 0 && !loading && <EmptyState title="Keine Teamdaten" text="Die Teamliste ist in der lokalen Entwicklungsumgebung nicht mit einem Supabase-Workspace verbunden." />}
        <div className="team-list">
          {members.map((member) => {
            const roleDecision = canChangeMemberRole({
              actorRole: store.currentUser.role,
              actorUserId: store.currentUser.id,
              targetUserId: member.userId,
              targetRole: member.role,
              nextRole: member.role,
              activeOwnerCount: activeOwners,
            });
            return (
              <article className={!member.isActive ? 'is-disabled' : ''} key={member.userId}>
                <span className="team-avatar">{member.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                <div className="team-identity"><strong>{member.displayName}</strong><span>{member.email || member.userId}</span><small>Seit {formatDate(member.createdAt)}</small></div>
                <Badge tone={member.isActive ? 'green' : 'neutral'}>{member.isActive ? 'Aktiv' : 'Deaktiviert'}</Badge>
                <label className="role-control">Rolle<select value={member.role} disabled={!manager || !roleDecision.allowed || !member.isActive || loading} onChange={(event) => void changeRole(member, event.target.value as UserRole)}>{(['owner', 'admin', 'agent', 'viewer'] as UserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
                {manager && <Button variant={member.isActive ? 'danger' : 'secondary'} disabled={loading} onClick={() => void setActive(member, !member.isActive)}>{member.isActive ? <><UserMinus size={16} /> Deaktivieren</> : <><Check size={16} /> Reaktivieren</>}</Button>}
              </article>
            );
          })}
        </div>
        {message && <div className="team-message" role="status">{message}</div>}
      </Card>

      <Card>
        <SectionHeader title="Einladungen" subtitle="Tokenbasiert, zeitlich begrenzt und fest an diesen Workspace gebunden" />
        {!manager && <EmptyState title="Nur lesender Zugriff" text="Einladungen und Rollenänderungen sind ausschließlich für Owner und Administratoren verfügbar." />}
        {manager && invitations.length === 0 && <EmptyState title="Keine Einladungen" text="Es bestehen keine offenen oder historischen Einladungen für diesen Workspace." />}
        <div className="invitation-list">
          {invitations.map((invitation) => (
            <article key={invitation.id}>
              <span className="invitation-icon">{invitation.status === 'pending' ? <Clock3 /> : invitation.status === 'accepted' ? <ShieldCheck /> : <Ban />}</span>
              <div><strong>{invitation.email}</strong><span>{roleLabels[invitation.role]} · gültig bis {formatDate(invitation.expiresAt)}</span></div>
              <Badge tone={invitation.status === 'pending' ? 'gold' : invitation.status === 'accepted' ? 'green' : 'neutral'}>{invitationLabels[invitation.status]}</Badge>
              {invitation.status === 'pending' && <Button variant="ghost" disabled={loading} onClick={async () => { if (!auth.session) return; await repository.revokeInvitation(store.workspace.id, invitation.id, auth.session); await refresh(); }}>Widerrufen</Button>}
            </article>
          ))}
        </div>
      </Card>

      {inviteOpen && (
        <Modal title="Workspace-Einladung erstellen" onClose={() => setInviteOpen(false)}>
          <form className="form-grid" onSubmit={(event) => void submitInvitation(event)}>
            <label className="form-span">E-Mail-Adresse<input type="email" required value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /></label>
            <label>Rolle<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as UserRole })}>{store.currentUser.role === 'owner' && <option value="owner">Owner</option>}<option value="admin">Administrator</option><option value="agent">Makler</option><option value="viewer">Lesezugriff</option></select></label>
            <label>Gültigkeit<select value={invite.expiresHours} onChange={(event) => setInvite({ ...invite, expiresHours: Number(event.target.value) })}><option value={24}>24 Stunden</option><option value={72}>3 Tage</option><option value={168}>7 Tage</option><option value={336}>14 Tage</option></select></label>
            <div className="invitation-warning form-span"><KeyRound /><p>Es wird keine E-Mail versendet. Das einmalig angezeigte Token muss über einen sicheren Kanal an die eingeladene Person übergeben werden.</p></div>
            <div className="form-actions form-span"><Button variant="secondary" type="button" onClick={() => setInviteOpen(false)}>Abbrechen</Button><Button type="submit" disabled={loading}>Token erzeugen</Button></div>
          </form>
        </Modal>
      )}

      {createdInvitation && (
        <Modal title="Einladungstoken – nur einmal anzeigen" onClose={() => setCreatedInvitation(null)}>
          <div className="created-token-panel">
            <p>Für <strong>{createdInvitation.email}</strong> als <strong>{roleLabels[createdInvitation.role]}</strong>. Gültig bis {formatDate(createdInvitation.expiresAt)}.</p>
            <code>{createdInvitation.token}</code>
            <Button onClick={() => void navigator.clipboard.writeText(createdInvitation.token)}><Copy size={16} /> Token kopieren</Button>
            <small>In der Datenbank wird ausschließlich der SHA-256-Hash gespeichert. Das Klartexttoken kann später nicht erneut ausgelesen werden.</small>
          </div>
        </Modal>
      )}
    </div>
  );
}
