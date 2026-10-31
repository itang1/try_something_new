-- The server copy of what the app keeps in SQLite (SYNCED_TABLES in src/data/storage.ts), for opt-in sync.
--
-- Each table matches its SQLite table column for column, plus:
--   owner_id    the signed-in account. Filled in from the session, and row-level security only shows a row to its owner.
--   updated_at  set by the server on every write. Pulling is "rows with updated_at at or after my cursor".
-- `seq` stays on the phone. `at` is the time the user did it on the phone, and decides which event wins.
--
-- The logs only ever get new rows, so they need no tombstones: undoing something is a newer row
-- (done = false, visited = false, added = false, a plan with no day). Custom activities are one row per activity,
-- where deleted = true is the tombstone and a newer `at` replaces an older one.
--
-- Ids are made on the phone, so the key is (owner_id, id): one account can never collide with, or find out about,
-- another account's ids.

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A log row never changes once written. Only custom activities can be replaced, and only by a newer version.
create function public.keep_newer_custom_activity() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.at <= old.at then
    return null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create table public.completion_events (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  device_id uuid not null,
  activity_id text not null,
  done boolean not null,
  earlier boolean not null default false,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.place_visits (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  device_id uuid not null,
  place_id text not null,
  activity_id text not null,
  visited boolean not null,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- photo is the path in the photos bucket ("<owner_id>/<file>") once the photo is backed up, or null.
create table public.reflections (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  device_id uuid not null,
  entry_id text not null,
  place_id text,
  place_name text,
  rating text check (rating in ('loved', 'fine', 'not-for-me')),
  note text,
  photo text,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.plans (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  device_id uuid not null,
  entry_id text not null,
  city_id text not null,
  place_id text,
  place_name text,
  day date,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- Ids here are "custom-<uuid>", or older ones from before version 7, so they stay text.
create table public.custom_activities (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  device_id uuid not null,
  city_id text not null,
  name text not null,
  subcategory text not null,
  duration text not null,
  cost text not null,
  deleted boolean not null default false,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.list_events (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  device_id uuid not null,
  list text not null check (list in ('saved', 'hidden')),
  entry_id text not null,
  added boolean not null,
  at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- Pulling reads one account's rows by updated_at.
create index completion_events_pull on public.completion_events (owner_id, updated_at);
create index place_visits_pull on public.place_visits (owner_id, updated_at);
create index reflections_pull on public.reflections (owner_id, updated_at);
create index plans_pull on public.plans (owner_id, updated_at);
create index custom_activities_pull on public.custom_activities (owner_id, updated_at);
create index list_events_pull on public.list_events (owner_id, updated_at);

create trigger set_updated_at before insert on public.completion_events for each row execute function public.set_updated_at();
create trigger set_updated_at before insert on public.place_visits for each row execute function public.set_updated_at();
create trigger set_updated_at before insert on public.reflections for each row execute function public.set_updated_at();
create trigger set_updated_at before insert on public.plans for each row execute function public.set_updated_at();
create trigger set_updated_at before insert on public.custom_activities for each row execute function public.set_updated_at();
create trigger set_updated_at before insert on public.list_events for each row execute function public.set_updated_at();
create trigger keep_newer before update on public.custom_activities for each row execute function public.keep_newer_custom_activity();

-- Row-level security: a signed-in account sees and writes only its own rows. Signed-out requests see nothing.
-- Logs can be added to and read, never changed. Custom activities can also be updated. Deleting happens only
-- through account deletion, which cascades from auth.users.
do $$
declare
  t text;
begin
  foreach t in array array['completion_events', 'place_visits', 'reflections', 'plans', 'custom_activities', 'list_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert on public.%I to authenticated', t);
    execute format(
      'create policy "Owners read their rows" on public.%I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format(
      'create policy "Owners add their rows" on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
  end loop;
end;
$$;

grant update (device_id, city_id, name, subcategory, duration, cost, deleted, at) on public.custom_activities to authenticated;
create policy "Owners update their custom activities" on public.custom_activities for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.keep_newer_custom_activity() from public, anon, authenticated;

-- Memory photos. Private, and each account can only reach files under a folder named after its own id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']);

create policy "Owners read their photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners upload their photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners replace their photos" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners delete their photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
