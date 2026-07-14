begin;

create table if not exists public.workspace_sync_revisions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete restrict
);

create table if not exists public.contacts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  check (related_contact_id is null)
);

create table if not exists public.follow_ups (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  foreign key (workspace_id, related_contact_id)
    references public.contacts(workspace_id, id) on delete cascade deferrable initially deferred
);

create table if not exists public.properties (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  foreign key (workspace_id, related_contact_id)
    references public.contacts(workspace_id, id) on delete set null deferrable initially deferred
);

create table if not exists public.appointments (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  foreign key (workspace_id, related_contact_id)
    references public.contacts(workspace_id, id) on delete set null deferrable initially deferred
);

create table if not exists public.call_events (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  foreign key (workspace_id, related_contact_id)
    references public.contacts(workspace_id, id) on delete cascade deferrable initially deferred
);

create table if not exists public.audit_events (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  related_contact_id text,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  primary key (workspace_id, id),
  check (related_contact_id is null)
);

create index if not exists follow_ups_workspace_contact_idx on public.follow_ups(workspace_id, related_contact_id);
create index if not exists properties_workspace_contact_idx on public.properties(workspace_id, related_contact_id);
create index if not exists appointments_workspace_contact_idx on public.appointments(workspace_id, related_contact_id);
create index if not exists call_events_workspace_contact_idx on public.call_events(workspace_id, related_contact_id);

alter table public.workspace_sync_revisions enable row level security;
alter table public.contacts enable row level security;
alter table public.follow_ups enable row level security;
alter table public.properties enable row level security;
alter table public.appointments enable row level security;
alter table public.call_events enable row level security;
alter table public.audit_events enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'workspace_sync_revisions', 'contacts', 'follow_ups', 'properties',
    'appointments', 'call_events', 'audit_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_member', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',
      table_name || '_select_member', table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert_writer', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.vincere_role[]) and (updated_by is null or updated_by = auth.uid()))',
      table_name || '_insert_writer', table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update_writer', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.vincere_role[])) with check (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.vincere_role[]) and (updated_by is null or updated_by = auth.uid()))',
      table_name || '_update_writer', table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_delete_writer', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.vincere_role[]))',
      table_name || '_delete_writer', table_name
    );
  end loop;
end
$$;

create or replace function public.vincere_collection_table(p_collection text)
returns text
language plpgsql
immutable
as $$
begin
  return case p_collection
    when 'contacts' then 'contacts'
    when 'followUps' then 'follow_ups'
    when 'properties' then 'properties'
    when 'appointments' then 'appointments'
    when 'callEvents' then 'call_events'
    when 'auditEvents' then 'audit_events'
    else null
  end;
end;
$$;

revoke all on function public.vincere_collection_table(text) from public;
grant execute on function public.vincere_collection_table(text) to authenticated;

create or replace function public.sync_vincere_records(
  p_workspace_id uuid,
  p_expected_revision bigint,
  p_mutations jsonb
)
returns table(revision bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_revision bigint;
  mutation jsonb;
  table_name text;
  operation text;
  record_id text;
  expected_version bigint;
  related_contact_id text;
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

  insert into public.workspace_sync_revisions(workspace_id, revision, updated_at, updated_by)
  values (p_workspace_id, 0, now(), auth.uid())
  on conflict (workspace_id) do nothing;

  select sync.revision into current_revision
  from public.workspace_sync_revisions sync
  where sync.workspace_id = p_workspace_id
  for update;

  if current_revision <> p_expected_revision then
    raise exception 'workspace revision conflict';
  end if;

  for mutation in select value from jsonb_array_elements(coalesce(p_mutations, '[]'::jsonb)) loop
    table_name := public.vincere_collection_table(mutation ->> 'collection');
    operation := mutation ->> 'operation';
    record_id := mutation ->> 'id';
    expected_version := coalesce((mutation ->> 'expectedVersion')::bigint, 0);
    related_contact_id := nullif(mutation ->> 'relatedContactId', '');

    if table_name is null or record_id is null or operation not in ('upsert', 'delete') then
      raise exception 'invalid relational mutation';
    end if;

    if operation = 'upsert' and expected_version = 0 then
      execute format(
        'insert into public.%I(workspace_id, id, payload, related_contact_id, version, updated_at, updated_by) values ($1, $2, $3, $4, 1, now(), auth.uid()) on conflict (workspace_id, id) do nothing',
        table_name
      ) using p_workspace_id, record_id, mutation -> 'payload', related_contact_id;
      get diagnostics affected = row_count;
    elsif operation = 'upsert' then
      execute format(
        'update public.%I set payload = $1, related_contact_id = $2, version = version + 1, updated_at = now(), updated_by = auth.uid() where workspace_id = $3 and id = $4 and version = $5',
        table_name
      ) using mutation -> 'payload', related_contact_id, p_workspace_id, record_id, expected_version;
      get diagnostics affected = row_count;
    else
      execute format(
        'delete from public.%I where workspace_id = $1 and id = $2 and version = $3',
        table_name
      ) using p_workspace_id, record_id, expected_version;
      get diagnostics affected = row_count;
    end if;

    if affected = 0 then
      raise exception 'record version conflict: %.%', mutation ->> 'collection', record_id;
    end if;
  end loop;

  if jsonb_array_length(coalesce(p_mutations, '[]'::jsonb)) > 0 then
    update public.workspace_sync_revisions
    set revision = workspace_sync_revisions.revision + 1,
        updated_at = now(),
        updated_by = auth.uid()
    where workspace_id = p_workspace_id;
  end if;

  return query
  select sync.revision, sync.updated_at
  from public.workspace_sync_revisions sync
  where sync.workspace_id = p_workspace_id;
end;
$$;

revoke all on function public.sync_vincere_records(uuid, bigint, jsonb) from public;
grant execute on function public.sync_vincere_records(uuid, bigint, jsonb) to authenticated;

commit;
