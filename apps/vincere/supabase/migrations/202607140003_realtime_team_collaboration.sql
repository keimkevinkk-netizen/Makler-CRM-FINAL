begin;

alter table public.workspace_members
  add column if not exists email text,
  add column if not exists is_active boolean not null default true,
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_by uuid references auth.users(id) on delete restrict;

update public.workspace_members membership
set email = auth_user.email
from auth.users auth_user
where membership.user_id = auth_user.id
  and (membership.email is null or trim(membership.email) = '');

create index if not exists workspace_members_workspace_active_idx
  on public.workspace_members(workspace_id, is_active, role);

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = auth.uid()
      and membership.is_active
  );
$$;

create or replace function public.has_workspace_role(
  p_workspace_id uuid,
  p_roles public.vincere_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = auth.uid()
      and membership.is_active
      and membership.role = any(p_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.vincere_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.vincere_role[]) to authenticated;

drop policy if exists workspace_members_select_scoped on public.workspace_members;
create policy workspace_members_select_scoped
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_manage_admin on public.workspace_members;

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role public.vincere_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  check (expires_at > created_at),
  check (not (accepted_at is not null and revoked_at is not null))
);

create index if not exists workspace_invitations_workspace_status_idx
  on public.workspace_invitations(workspace_id, accepted_at, revoked_at, expires_at);

create unique index if not exists workspace_invitations_pending_email_idx
  on public.workspace_invitations(workspace_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.workspace_invitations enable row level security;

drop policy if exists workspace_invitations_select_manager on public.workspace_invitations;
create policy workspace_invitations_select_manager
on public.workspace_invitations for select
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.vincere_role[]));

create or replace function public.audit_vincere_team_change(
  p_workspace_id uuid,
  p_entity text,
  p_entity_id text,
  p_action text,
  p_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id text := gen_random_uuid()::text;
begin
  insert into public.audit_events(workspace_id, id, payload, related_contact_id, version, updated_at, updated_by)
  values (
    p_workspace_id,
    event_id,
    jsonb_build_object(
      'id', event_id,
      'actorId', auth.uid()::text,
      'workspaceId', p_workspace_id::text,
      'entity', p_entity,
      'entityId', p_entity_id,
      'action', p_action,
      'summary', p_summary,
      'createdAt', now()
    ),
    null,
    1,
    now(),
    auth.uid()
  );
end;
$$;

revoke all on function public.audit_vincere_team_change(uuid, text, text, text, text) from public;

create or replace function public.protect_last_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.is_active and not exists (
      select 1 from public.workspace_members other
      where other.workspace_id = old.workspace_id
        and other.user_id <> old.user_id
        and other.role = 'owner'
        and other.is_active
    ) then
      raise exception 'the last active workspace owner cannot be removed';
    end if;
    return old;
  end if;

  if old.role = 'owner' and old.is_active
     and (new.role <> 'owner' or not new.is_active)
     and not exists (
       select 1 from public.workspace_members other
       where other.workspace_id = old.workspace_id
         and other.user_id <> old.user_id
         and other.role = 'owner'
         and other.is_active
     ) then
    if old.user_id = auth.uid() then
      raise exception 'a user cannot remove their own last owner permission';
    end if;
    raise exception 'the last active workspace owner cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_last_workspace_owner_trigger on public.workspace_members;
create trigger protect_last_workspace_owner_trigger
before update of role, is_active or delete on public.workspace_members
for each row execute function public.protect_last_workspace_owner();

create or replace function public.create_workspace_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role public.vincere_role,
  p_expires_hours integer default 168
)
returns table(
  id uuid,
  workspace_id uuid,
  email text,
  role public.vincere_role,
  expires_at timestamptz,
  created_at timestamptz,
  invited_by uuid,
  accepted_at timestamptz,
  revoked_at timestamptz,
  token text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role public.vincere_role;
  normalized_email text := lower(trim(p_email));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  created_invitation public.workspace_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_expires_hours < 1 or p_expires_hours > 720 then raise exception 'invitation lifetime must be between 1 and 720 hours'; end if;

  select membership.role into actor_role
  from public.workspace_members membership
  where membership.workspace_id = p_workspace_id
    and membership.user_id = auth.uid()
    and membership.is_active;

  if actor_role not in ('owner', 'admin') then raise exception 'insufficient workspace permission'; end if;
  if p_role = 'owner' and actor_role <> 'owner' then raise exception 'only an owner may invite another owner'; end if;

  update public.workspace_invitations invitation
  set revoked_at = now(), revoked_by = auth.uid()
  where invitation.workspace_id = p_workspace_id
    and invitation.email = normalized_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null;

  insert into public.workspace_invitations(
    workspace_id, email, role, token_hash, expires_at, invited_by
  ) values (
    p_workspace_id,
    normalized_email,
    p_role,
    encode(digest(raw_token, 'sha256'), 'hex'),
    now() + make_interval(hours => p_expires_hours),
    auth.uid()
  ) returning * into created_invitation;

  perform public.audit_vincere_team_change(
    p_workspace_id,
    'invitation',
    created_invitation.id::text,
    'created',
    format('Workspace invitation created for %s with role %s', normalized_email, p_role)
  );

  return query select
    created_invitation.id,
    created_invitation.workspace_id,
    created_invitation.email,
    created_invitation.role,
    created_invitation.expires_at,
    created_invitation.created_at,
    created_invitation.invited_by,
    created_invitation.accepted_at,
    created_invitation.revoked_at,
    raw_token;
end;
$$;

create or replace function public.accept_workspace_invitation(
  p_token text,
  p_display_name text default ''
)
returns table(workspace_id uuid, role public.vincere_role)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation public.workspace_invitations%rowtype;
  authenticated_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(p_token)) < 32 then raise exception 'invalid invitation token'; end if;

  select candidate.* into invitation
  from public.workspace_invitations candidate
  where candidate.token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if invitation.id is null then raise exception 'invalid invitation token'; end if;
  if invitation.accepted_at is not null then raise exception 'invitation already accepted'; end if;
  if invitation.revoked_at is not null then raise exception 'invitation revoked'; end if;
  if invitation.expires_at <= now() then raise exception 'invitation expired'; end if;
  if authenticated_email = '' or authenticated_email <> invitation.email then
    raise exception 'invitation email does not match authenticated user';
  end if;
  if exists (
    select 1 from public.workspace_members existing
    where existing.user_id = auth.uid()
      and existing.workspace_id <> invitation.workspace_id
      and existing.is_active
  ) then
    raise exception 'user already belongs to another active workspace';
  end if;

  insert into public.workspace_members(workspace_id, user_id, role, display_name, email, is_active, disabled_at, disabled_by)
  values (
    invitation.workspace_id,
    auth.uid(),
    invitation.role,
    coalesce(nullif(trim(p_display_name), ''), authenticated_email),
    authenticated_email,
    true,
    null,
    null
  )
  on conflict (workspace_id, user_id) do update
  set role = excluded.role,
      display_name = excluded.display_name,
      email = excluded.email,
      is_active = true,
      disabled_at = null,
      disabled_by = null;

  update public.workspace_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;

  perform public.audit_vincere_team_change(
    invitation.workspace_id,
    'invitation',
    invitation.id::text,
    'accepted',
    format('Workspace invitation accepted by %s', authenticated_email)
  );

  return query select invitation.workspace_id, invitation.role;
end;
$$;

create or replace function public.change_workspace_member_role(
  p_workspace_id uuid,
  p_target_user_id uuid,
  p_role public.vincere_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role public.vincere_role;
  target_role public.vincere_role;
  target_active boolean;
  active_owner_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select role into actor_role from public.workspace_members
  where workspace_id = p_workspace_id and user_id = auth.uid() and is_active;
  select role, is_active into target_role, target_active from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_target_user_id;

  if actor_role not in ('owner', 'admin') then raise exception 'insufficient workspace permission'; end if;
  if target_role is null or not target_active then raise exception 'active workspace member not found'; end if;
  if actor_role = 'admin' and (target_role = 'owner' or p_role = 'owner') then
    raise exception 'only an owner may manage owner permissions';
  end if;

  select count(*) into active_owner_count from public.workspace_members
  where workspace_id = p_workspace_id and role = 'owner' and is_active;
  if target_role = 'owner' and p_role <> 'owner' and active_owner_count <= 1 then
    if p_target_user_id = auth.uid() then raise exception 'a user cannot remove their own last owner permission'; end if;
    raise exception 'the last active workspace owner is protected';
  end if;

  update public.workspace_members set role = p_role
  where workspace_id = p_workspace_id and user_id = p_target_user_id;

  perform public.audit_vincere_team_change(
    p_workspace_id, 'team', p_target_user_id::text, 'role_changed',
    format('Member role changed from %s to %s', target_role, p_role)
  );
end;
$$;

create or replace function public.set_workspace_member_active(
  p_workspace_id uuid,
  p_target_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role public.vincere_role;
  target_role public.vincere_role;
  target_active boolean;
  active_owner_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select role into actor_role from public.workspace_members
  where workspace_id = p_workspace_id and user_id = auth.uid() and is_active;
  select role, is_active into target_role, target_active from public.workspace_members
  where workspace_id = p_workspace_id and user_id = p_target_user_id;

  if actor_role not in ('owner', 'admin') then raise exception 'insufficient workspace permission'; end if;
  if target_role is null then raise exception 'workspace member not found'; end if;
  if actor_role = 'admin' and target_role = 'owner' then raise exception 'only an owner may deactivate an owner'; end if;

  select count(*) into active_owner_count from public.workspace_members
  where workspace_id = p_workspace_id and role = 'owner' and is_active;
  if not p_active and target_role = 'owner' and target_active and active_owner_count <= 1 then
    if p_target_user_id = auth.uid() then raise exception 'a user cannot remove their own last owner permission'; end if;
    raise exception 'the last active workspace owner is protected';
  end if;

  update public.workspace_members
  set is_active = p_active,
      disabled_at = case when p_active then null else now() end,
      disabled_by = case when p_active then null else auth.uid() end
  where workspace_id = p_workspace_id and user_id = p_target_user_id;

  perform public.audit_vincere_team_change(
    p_workspace_id, 'team', p_target_user_id::text,
    case when p_active then 'reactivated' else 'deactivated' end,
    case when p_active then 'Workspace member reactivated' else 'Workspace member deactivated' end
  );
end;
$$;

create or replace function public.revoke_workspace_invitation(
  p_workspace_id uuid,
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.has_workspace_role(p_workspace_id, array['owner', 'admin']::public.vincere_role[]) then
    raise exception 'insufficient workspace permission';
  end if;

  update public.workspace_invitations
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_invitation_id
    and workspace_id = p_workspace_id
    and accepted_at is null
    and revoked_at is null;

  if not found then raise exception 'pending invitation not found'; end if;
  perform public.audit_vincere_team_change(
    p_workspace_id, 'invitation', p_invitation_id::text, 'revoked', 'Workspace invitation revoked'
  );
end;
$$;

revoke all on function public.create_workspace_invitation(uuid, text, public.vincere_role, integer) from public;
revoke all on function public.accept_workspace_invitation(text, text) from public;
revoke all on function public.change_workspace_member_role(uuid, uuid, public.vincere_role) from public;
revoke all on function public.set_workspace_member_active(uuid, uuid, boolean) from public;
revoke all on function public.revoke_workspace_invitation(uuid, uuid) from public;
grant execute on function public.create_workspace_invitation(uuid, text, public.vincere_role, integer) to authenticated;
grant execute on function public.accept_workspace_invitation(text, text) to authenticated;
grant execute on function public.change_workspace_member_role(uuid, uuid, public.vincere_role) to authenticated;
grant execute on function public.set_workspace_member_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid, uuid) to authenticated;

alter table public.contacts replica identity full;
alter table public.follow_ups replica identity full;
alter table public.properties replica identity full;
alter table public.appointments replica identity full;
alter table public.call_events replica identity full;

do $$
declare
  realtime_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table in array array['contacts', 'follow_ups', 'properties', 'appointments', 'call_events'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = realtime_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table);
      end if;
    end loop;
  end if;
end
$$;

commit;
