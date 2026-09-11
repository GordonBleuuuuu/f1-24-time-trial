create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Driver',
  gamertag text not null unique,
  created_at timestamptz not null default now()
);

create table public.laps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  driver_name text not null,
  gamertag text not null,
  car text not null,
  track_id smallint not null,
  track_name text not null,
  lap_time_ms integer not null check (lap_time_ms > 0),
  sector1_ms integer,
  sector2_ms integer,
  sector3_ms integer,
  valid boolean not null default true,
  recorded_at timestamptz not null default now()
);

create index laps_track_time_idx on public.laps (track_id, lap_time_ms) where valid;

alter table public.profiles enable row level security;
alter table public.laps enable row level security;
create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update their profile" on public.profiles for update using (auth.uid() = id);
create policy "valid laps are readable" on public.laps for select using (valid);
create policy "users submit own laps" on public.laps for insert with check (auth.uid() = user_id);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gamertag)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Driver'), coalesce(new.raw_user_meta_data ->> 'gamertag', 'driver-' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.laps replica identity full;
alter publication supabase_realtime add table public.laps;
