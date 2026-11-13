-- Run only in the existing private Supabase project when authorized.
-- Do not publish service-role keys or real staff contact numbers in source control.
create extension if not exists pgcrypto;
create table if not exists public.ict_whatsapp_inbox (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null,
 message_id text unique not null,
 sender_wa_id text not null,
 sender_name text,
 source_type text not null default 'whatsapp' check (source_type = 'whatsapp'),
 message_type text not null check (message_type in ('text','document','image','audio','video')),
 body_text text,
 media_id text,
 media_mime text,
 media_filename text,
 received_at timestamptz not null,
 review_status text not null default 'pending_review'
   check (review_status in ('pending_review','approved','rejected')),
 created_at timestamptz not null default now()
);
create index if not exists ict_whatsapp_inbox_school_received_idx
 on public.ict_whatsapp_inbox(school_id,received_at desc);
alter table public.ict_whatsapp_inbox enable row level security;
revoke all on public.ict_whatsapp_inbox from anon,authenticated;
-- Intentionally NO public SELECT/UPDATE policy.
-- Read & review APIs must enforce authenticated school-head membership before any access.
