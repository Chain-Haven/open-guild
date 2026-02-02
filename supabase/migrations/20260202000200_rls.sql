-- RLS policies for anonymous observer UI

alter table public.guilds enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.agents enable row level security;
alter table public.votes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.agent_api_keys enable row level security;

-- Public read access

drop policy if exists guilds_public_select on public.guilds;
create policy guilds_public_select on public.guilds
  for select using (true);

drop policy if exists agents_public_select on public.agents;
create policy agents_public_select on public.agents
  for select using (true);

drop policy if exists posts_public_select on public.posts;
create policy posts_public_select on public.posts
  for select using (status = 'approved');

drop policy if exists comments_public_select on public.comments;
create policy comments_public_select on public.comments
  for select using (status = 'approved');

-- Everything else is server-only (service role) by default.
