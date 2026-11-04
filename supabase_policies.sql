-- LÀNG YÊN beta. Run once in Supabase SQL Editor.
-- Enable Authentication > Providers > Anonymous sign-ins first.
-- Disable "Allow public access" in Realtime Settings.
-- Authenticated anonymous users may enter ONLY these public beta rooms.
-- "Phòng Riêng" is deliberately excluded until invitation access is implemented.
drop policy if exists "anyen_room_read" on realtime.messages;
drop policy if exists "anyen_room_write" on realtime.messages;
create policy "anyen_room_read" on realtime.messages
for select to authenticated using (
 (select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc')
 and realtime.messages.extension in ('presence','broadcast')
);
create policy "anyen_room_write" on realtime.messages
for insert to authenticated with check (
 (select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc')
 and realtime.messages.extension in ('presence','broadcast')
);
-- This is NOT an enforcement of 10/20 room capacity, anti-spam, or moderation.
