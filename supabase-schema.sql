-- Supabase SQL Editor에서 실행하세요

-- 1. 일정 테이블
create table schedules (
  id                uuid primary key default gen_random_uuid(),
  child_name        text not null,
  title             text not null,
  scheduled_at      timestamptz not null,
  notification_sent boolean not null default false,
  created_at        timestamptz not null default now()
);

create index schedules_scheduled_at_idx on schedules (scheduled_at);

-- 2. FCM 토큰 테이블 (자녀 기기 등록)
create table fcm_tokens (
  id          uuid primary key default gen_random_uuid(),
  child_name  text not null,
  token       text not null,
  created_at  timestamptz not null default now(),
  unique (token)
);

create index fcm_tokens_child_name_idx on fcm_tokens (child_name);
