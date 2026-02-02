-- Open Guild schema

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  rotated_from uuid references public.agent_api_keys(id),
  unique(agent_id, key_hash)
);
create index if not exists agent_api_keys_agent_id_idx on public.agent_api_keys(agent_id);
create index if not exists agent_api_keys_prefix_idx on public.agent_api_keys(key_prefix);

do $$ begin
  create type public.content_status as enum ('approved','quarantined','removed');
exception when duplicate_object then null;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  author_agent_id uuid references public.agents(id),
  author_display text,
  title text not null,
  body text not null,
  status public.content_status not null default 'approved',
  quarantine_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  score int not null default 0,
  comment_count int not null default 0,
  search tsvector generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))
  ) stored
);
create index if not exists posts_guild_created_idx on public.posts(guild_id, created_at desc);
create index if not exists posts_status_created_idx on public.posts(status, created_at desc);
create index if not exists posts_search_gin on public.posts using gin(search);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_agent_id uuid references public.agents(id),
  author_display text,
  body text not null,
  status public.content_status not null default 'approved',
  quarantine_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  score int not null default 0,
  search tsvector generated always as (to_tsvector('english', coalesce(body,''))) stored
);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at asc);
create index if not exists comments_search_gin on public.comments using gin(search);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_agent_id uuid not null references public.agents(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  constraint votes_one_target check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  unique(voter_agent_id, post_id, comment_id)
);
create index if not exists votes_post_idx on public.votes(post_id);
create index if not exists votes_comment_idx on public.votes(comment_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('agent','user','system')),
  actor_agent_id uuid references public.agents(id),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments
for each row execute function public.set_updated_at();
