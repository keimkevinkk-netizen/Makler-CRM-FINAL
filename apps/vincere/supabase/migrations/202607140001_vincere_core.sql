begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vincere_role') then
    create type public.vincere_role as enum ('owner', 'admin', 'agent', 'viewer');
  end if;
end
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  region text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.vincere_role not null default 'agent',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members(user_id);

create table if not exists public.workspace_snapshots (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  payload jsonb not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_snapshots enable row level security;

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
      and membership.role = any(p_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.vincere_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.vincere_role[]) to authenticated;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists workspace_members_select_scoped on public.workspace_members;
create policy workspace_members_select_scoped
on public.workspace_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.vincere_role[])
);

drop policy if exists workspace_members_manage_admin on public.workspace_members;
create policy workspace_members_manage_admin
on public.workspace_members for all
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.vincere_role[]))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.vincere_role[]));

drop policy if exists workspace_snapshots_select_member on public.workspace_snapshots;
create policy workspace_snapshots_select_member
on public.workspace_snapshots for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_snapshots_insert_writer on public.workspace_snapshots;
create policy workspace_snapshots_insert_writer
on public.workspace_snapshots for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.vincere_role[])
  and updated_by = auth.uid()
);

drop policy if exists workspace_snapshots_update_writer on public.workspace_snapshots;
create policy workspace_snapshots_update_writer
on public.workspace_snapshots for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.vincere_role[]))
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.vincere_role[])
  and updated_by = auth.uid()
);

create or replace function public.create_vincere_workspace(
  p_name text,
  p_region text default ''
)
returns table(workspace_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    raise exception 'user already belongs to a workspace';
  end if;

  insert into public.workspaces(name, region, created_by)
  values (trim(p_name), trim(coalesce(p_region, '')), auth.uid())
  returning id into created_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role, display_name)
  values (
    created_workspace_id,
    auth.uid(),
    'owner',
    coalesce(auth.jwt() ->> 'email', '')
  );

  return query select created_workspace_id;
end;
$$;

revoke all on function public.create_vincere_workspace(text, text) from public;
grant execute on function public.create_vincere_workspace(text, text) to authenticated;

create or replace function public.save_workspace_snapshot(
  p_workspace_id uuid,
  p_expected_version bigint,
  p_payload jsonb
)
returns table(version bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.has_workspace_role(
    p_workspace_id,
    array['owner', 'admin', 'agent']::public.vincere_role[]
  ) then
    raise exception 'insufficient workspace permission';
  end if;

  if p_expected_version = 0 then
    insert into public.workspace_snapshots(workspace_id, payload, version, updated_at, updated_by)
    values (p_workspace_id, p_payload, 1, now(), auth.uid())
    on conflict (workspace_id) do nothing;

    get diagnostics affected = row_count;
    if affected = 0 then
      raise exception 'version conflict';
    end if;
  else
    update public.workspace_snapshots
    set payload = p_payload,
        version = workspace_snapshots.version + 1,
        updated_at = now(),
        updated_by = auth.uid()
    where workspace_id = p_workspace_id
      and workspace_snapshots.version = p_expected_version;

    get diagnostics affected = row_count;
    if affected = 0 then
      raise exception 'version conflict';
    end if;
  end if;

  return query
  select snapshot.version, snapshot.updated_at
  from public.workspace_snapshots snapshot
  where snapshot.workspace_id = p_workspace_id;
end;
$$;

revoke all on function public.save_workspace_snapshot(uuid, bigint, jsonb) from public;
grant execute on function public.save_workspace_snapshot(uuid, bigint, jsonb) to authenticated;

commit;
