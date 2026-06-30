-- Простая админка без Supabase Auth.
--
-- Запустите этот файл в Supabase SQL Editor один раз.
-- Он разрешает публичному publishable/anon ключу читать и удалять ответы RSVP.
-- Защита остаётся только на фронте: вход в админку по списку email в src/admin/AdminPage.tsx.
-- Это небезопасно для чувствительных данных, но подходит для выбранного упрощённого сценария.

alter table public.rsvps enable row level security;

drop policy if exists "Admins can read RSVPs" on public.rsvps;
drop policy if exists "Admins can delete RSVPs" on public.rsvps;
drop policy if exists "Anyone can read RSVPs" on public.rsvps;
drop policy if exists "Anyone can delete RSVPs" on public.rsvps;

create policy "Anyone can read RSVPs"
on public.rsvps
for select
to anon, authenticated
using (true);

create policy "Anyone can delete RSVPs"
on public.rsvps
for delete
to anon, authenticated
using (true);

grant select, delete on public.rsvps to anon, authenticated;
