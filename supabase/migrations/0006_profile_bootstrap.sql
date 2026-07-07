-- Profile bootstrap: every auth user needs a profiles row (the app locks out
-- anyone without one). Auto-create it on signup, and make the FIRST user the
-- owner so a solo operator needs zero manual setup; everyone after is a client
-- (promote to collaborator/owner later as needed). Idempotent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.profiles (id, email, global_role)
  values (
    new.id,
    new.email,
    case
      when not exists (select 1 from public.profiles where global_role = 'owner')
        then 'owner'::user_role
      else 'client'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any pre-existing auth users that have no profile yet. The earliest
-- account becomes owner if none exists.
do $$
declare r record;
begin
  for r in
    select u.id, u.email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
    order by u.created_at
  loop
    insert into public.profiles (id, email, global_role)
    values (
      r.id, r.email,
      case when not exists (select 1 from public.profiles where global_role = 'owner')
        then 'owner'::user_role else 'client'::user_role end
    )
    on conflict (id) do nothing;
  end loop;
end $$;
