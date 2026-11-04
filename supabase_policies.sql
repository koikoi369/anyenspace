-- AN YÊN SPACE 2.0 · Realtime policy for anonymous-authenticated visitors.
-- Run in Supabase SQL Editor. This is a public community beta, not private invitations.
-- Anonymous sign-in creates authenticated users. Restrict to fixed room topics.
create policy "anyen_room_read" on realtime.messages
for select to authenticated
using ((select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc','anyen:room:private-demo')
 and realtime.messages.extension in ('presence','broadcast'));
create policy "anyen_room_write" on realtime.messages
for insert to authenticated
with check ((select realtime.topic()) in ('anyen:room:lobby','anyen:room:sen','anyen:room:truc','anyen:room:private-demo')
 and realtime.messages.extension in ('presence','broadcast'));
-- NOTE: These policies do NOT enforce room capacity, moderation, or invitation-only rooms.
-- Disable the "Allow public access" setting in Supabase Realtime settings.
