-- Growth tables: the beta waitlist, anonymous counts for invite links, and opt-in anonymous app counts.
--
-- None of these hold anything that identifies a person except `waitlist.email`, which someone typed in to be emailed.
-- Anyone with the publishable key can add a row (the web page and the app are public), and nobody can read, change
-- or delete rows through the API. Read them in the dashboard's SQL editor, which runs as the database owner.

create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  -- Free text from the signup form, like "Pasadena". Optional.
  city text check (city is null or char_length(city) <= 80),
  -- Where the signup came from, like "landing" or "activity". Optional.
  source text check (source is null or char_length(source) <= 40),
  created_at timestamptz not null default now()
);
-- One row per address, compared without case. A repeat signup is a harmless conflict.
create unique index waitlist_email_key on public.waitlist (lower(email));

-- One row per visit to a shared link's web page, or per tap on a button there. Never who shared or who visited.
create table public.link_events (
  id bigint generated always as identity primary key,
  -- visit, app_store, play_store, open_app, waitlist
  event text not null check (event in ('visit', 'app_store', 'play_store', 'open_app', 'waitlist')),
  -- The kind of share the link came from: tried (the "tried it" card), invite, bucket (bucket list), partner, or other.
  share_kind text not null default 'other' check (share_kind in ('tried', 'invite', 'bucket', 'partner', 'other')),
  activity_id text check (activity_id is null or char_length(activity_id) <= 80),
  created_at timestamptz not null default now()
);

-- Opt-in app counts. No device id, account or location: an event name, the platform, the app version and how many
-- days since the app was first opened (so week 2 and week 4 retention can be counted without following anyone).
create table public.app_events (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z_]{1,40}$'),
  platform text not null check (platform in ('ios', 'android', 'other')),
  app_version text not null check (char_length(app_version) <= 20),
  days_since_install integer not null check (days_since_install between 0 and 100000),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
alter table public.link_events enable row level security;
alter table public.app_events enable row level security;

create policy "Anyone can join the waitlist" on public.waitlist for insert to anon, authenticated with check (true);
create policy "Anyone can count a link event" on public.link_events for insert to anon, authenticated with check (true);
create policy "Anyone can count an app event" on public.app_events for insert to anon, authenticated with check (true);

-- Insert only. Without select, a client can't read back even its own row, so inserts must not ask for the row back
-- (supabase-js: no `.select()` after `.insert()`).
revoke all on public.waitlist, public.link_events, public.app_events from anon, authenticated;
grant insert on public.waitlist, public.link_events, public.app_events to anon, authenticated;
