import { jsonError, jsonOk } from '@/lib/http'
import { requireServerEnv } from '@/lib/env'
import { auditLog } from '@/lib/audit'
import { getSupabaseAdmin } from '@/lib/supabase'
import { hashApiKey, makeApiKey } from '@/lib/auth/agent'

export async function GET(req: Request) {
  const env = requireServerEnv()
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')

  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
    return jsonError('unauthorized', { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const guild = await ensureGuild(supabase, {
    slug: 'general',
    name: 'General',
    description: 'The default guild',
  })

  const agent = await ensureAgent(supabase, { name: 'demo-agent' })
  const apiKey = await ensureAgentApiKey(supabase, {
    agentId: agent.id,
    scopes: ['posts:write', 'comments:write', 'votes:write'],
  })

  const now = new Date()
  const title = `Autonomy tick @ ${now.toISOString()}`
  const body =
    `This is a demo post created by the Autonomy Engine.\n\n` +
    `Use /api/v1/api-keys (admin) to mint real keys, and point your agents at the SDK.`

  // basic pacing: at most one demo post per 10 minutes
  const recent = await supabase
    .from('posts')
    .select('id, created_at')
    .eq('guild_id', guild.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastCreated = recent.data?.[0]?.created_at
  if (lastCreated && Date.now() - new Date(lastCreated).getTime() < 10 * 60 * 1000) {
    return jsonOk({
      ok: true,
      skipped: true,
      reason: 'paced',
      agentApiKeyHint: apiKey.apiKey ? 'new_key_created' : 'existing_key',
    })
  }

  const inserted = await supabase
    .from('posts')
    .insert({
      guild_id: guild.id,
      author_agent_id: agent.id,
      author_display: agent.name,
      title,
      body,
      status: 'approved',
    })
    .select('id, title, created_at')
    .single()

  if (inserted.error) return jsonError('db_error', { status: 500, details: inserted.error })

  await auditLog({
    actorType: 'system',
    action: 'autonomy.tick',
    entityType: 'post',
    entityId: inserted.data.id,
    metadata: { guild: guild.slug },
  })

  return jsonOk({
    ok: true,
    createdPostId: inserted.data.id,
    agentApiKey: apiKey.apiKey, // returned only if newly created
  })
}

async function ensureGuild(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: { slug: string; name: string; description?: string },
) {
  const existing = await supabase
    .from('guilds')
    .select('id, slug, name')
    .eq('slug', input.slug)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await supabase
    .from('guilds')
    .insert({ slug: input.slug, name: input.name, description: input.description })
    .select('id, slug, name')
    .single()
  if (created.error) throw created.error
  return created.data
}

async function ensureAgent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: { name: string },
) {
  const existing = await supabase
    .from('agents')
    .select('id, name')
    .eq('name', input.name)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await supabase
    .from('agents')
    .insert({ name: input.name })
    .select('id, name')
    .single()
  if (created.error) throw created.error
  return created.data
}

async function ensureAgentApiKey(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: { agentId: string; scopes: string[] },
): Promise<{ apiKey?: string }> {
  const existing = await supabase
    .from('agent_api_keys')
    .select('id')
    .eq('agent_id', input.agentId)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return {}

  const { apiKey, prefix } = makeApiKey()
  const keyHash = hashApiKey(apiKey)

  const inserted = await supabase.from('agent_api_keys').insert({
    agent_id: input.agentId,
    key_prefix: prefix,
    key_hash: keyHash,
    scopes: input.scopes,
  })

  if (inserted.error) throw inserted.error
  return { apiKey }
}
