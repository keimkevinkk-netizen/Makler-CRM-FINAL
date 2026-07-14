begin;

-- Direkte Browser-Schreibzugriffe auf Mitgliedschaften werden vollständig gesperrt.
-- Die initiale Owner-Mitgliedschaft wird weiterhin ausschließlich durch
-- create_vincere_workspace() als SECURITY DEFINER angelegt.
drop policy if exists workspace_members_manage_admin on public.workspace_members;

revoke insert, update, delete on table public.workspace_members from anon;
revoke insert, update, delete on table public.workspace_members from authenticated;

create or replace function public.manage_vincere_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role public.vincere_role default 'agent',
  p_display_name text default '',
  p_remove boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_role public.vincere_role;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.has_workspace_role(
    p_workspace_id,
    array['owner']::public.vincere_role[]
  ) then
    raise exception 'owner permission required';
  end if;

  if p_user_id is null then
    raise exception 'target user required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'owner cannot modify own membership through this operation';
  end if;

  select membership.role
  into existing_role
  from public.workspace_members membership
  where membership.workspace_id = p_workspace_id
    and membership.user_id = p_user_id;

  if existing_role = 'owner' then
    raise exception 'owner memberships require a separate controlled ownership-transfer procedure';
  end if;

  if p_remove then
    delete from public.workspace_members membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = p_user_id
      and membership.role <> 'owner';

    if not found then
      raise exception 'removable workspace membership not found';
    end if;
    return;
  end if;

  if p_role = 'owner' then
    raise exception 'owner role cannot be assigned through this operation';
  end if;

  insert into public.workspace_members(
    workspace_id,
    user_id,
    role,
    display_name,
    created_at
  )
  values (
    p_workspace_id,
    p_user_id,
    p_role,
    left(trim(coalesce(p_display_name, '')), 120),
    now()
  )
  on conflict (workspace_id, user_id) do update
  set role = excluded.role,
      display_name = excluded.display_name;
end;
$$;

revoke all on function public.manage_vincere_workspace_member(
  uuid,
  uuid,
  public.vincere_role,
  text,
  boolean
) from public;

grant execute on function public.manage_vincere_workspace_member(
  uuid,
  uuid,
  public.vincere_role,
  text,
  boolean
) to authenticated;

commit;
