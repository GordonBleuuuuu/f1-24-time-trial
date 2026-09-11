-- Run this once in Supabase Dashboard -> SQL Editor -> New query.
-- It creates accounts, short-lived relay links, protected lap records and live updates.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Driver',
  gamertag text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.telemetry_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  driver_name text not null,
  gamertag text not null,
  input_setup text not null default 'Unspecified',
  assist_preset text not null default 'Unspecified',
  platform text not null default 'PC',
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists telemetry_sessions_token_idx on public.telemetry_sessions (session_token, expires_at);

create table if not exists public.laps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  telemetry_session_id uuid references public.telemetry_sessions(id) on delete set null,
  game_session_uid text,
  lap_number smallint,
  driver_name text not null,
  gamertag text not null,
  car text not null,
  track_id smallint not null,
  track_name text not null,
  lap_time_ms integer not null check (lap_time_ms > 0),
  sector1_ms integer,
  sector2_ms integer,
  sector3_ms integer,
  input_setup text not null default 'Unspecified',
  assist_preset text not null default 'Unspecified',
  weather text not null default 'Unknown weather',
  platform text not null default 'PC',
  valid boolean not null default true,
  source_verified boolean not null default false,
  recorded_at timestamptz not null default now(),
  constraint unique_telemetry_lap unique nulls not distinct (telemetry_session_id, game_session_uid, lap_number)
);

create index if not exists laps_track_time_idx on public.laps (track_id, lap_time_ms) where valid;
create index if not exists laps_user_track_time_idx on public.laps (user_id, track_id, lap_time_ms) where valid;

alter table public.profiles enable row level security;
alter table public.telemetry_sessions enable row level security;
alter table public.laps enable row level security;
drop policy if exists "public profiles are readable" on public.profiles;
drop policy if exists "users create their profile" on public.profiles;
drop policy if exists "users update their profile" on public.profiles;
drop policy if exists "valid laps are readable" on public.laps;
drop policy if exists "users submit own laps" on public.laps;
create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update their profile" on public.profiles for update using (auth.uid() = id);
create policy "valid laps are readable" on public.laps for select using (valid);
-- Browser clients intentionally cannot insert lap records. Vercel's verified relay does.

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gamertag)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Driver'), coalesce(new.raw_user_meta_data ->> 'gamertag', 'driver-' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.laps replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.laps;
exception when duplicate_object then null;
end $$;
