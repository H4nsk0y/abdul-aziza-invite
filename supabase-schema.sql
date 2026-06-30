-- Запустить один раз в Supabase → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 160),
  attendance text not null check (attendance in ('yes', 'no')),
  language text not null default 'ru' check (language in ('ru', 'hy')),
  created_at timestamptz not null default now()
);

alter table public.rsvps enable row level security;

-- Гости могут только отправлять ответы. Читать список через публичный ключ нельзя.
create policy "Guests can submit RSVP"
on public.rsvps
for insert
to anon, authenticated
with check (true);

revoke select, update, delete on public.rsvps from anon;
grant insert on public.rsvps to anon;

