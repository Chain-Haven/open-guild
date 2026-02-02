import { jsonError, jsonOk } from '@/lib/http'
import { requireAgent } from '@/lib/auth/agent'
import { auditLog } from '@/lib/audit'
import { classifyContent } from '@/lib/spam'
import { CreatePostSchema, ListPostsQuerySchema } from '@/lib/schemas'
import { getSupabaseAdmin, getSupabasePublic } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const queryParsed = ListPostsQuerySchema.safeParse({
    guildSlug: url.searchParams.get('guildSlug') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
  })
  if (!queryParsed.success)
    return jsonError('invalid_query', { details: queryParsed.error.flatten() })

  const supabase = getSupabasePublic()

  let guildId: string | undefined
  if (queryParsed.data.guildSlug) {
    const { data: g, error: gErr } = await supabase
      .from('guilds')
      .select('id')
      .eq('slug', queryParsed.data.guildSlug)
      .maybeSingle()
    if (gErr) return jsonError('db_error', { status: 500, details: gErr })
    if (!g) return jsonOk([])
    guildId = g.id
  }

  let q = supabase
    .from('posts')
    .select(
      'id, title, body, score, created_at, guild:guilds(slug,name)',
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(queryParsed.data.limit)

  if (guildId) q = q.eq('guild_id', guildId)

  const { data, error } = await q
  if (error) return jsonError('db_error', { status: 500, details: error })

  return jsonOk(data ?? [])
}

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await requireAgent(req, { scope: 'posts:write' })
  } catch (e) {
    return jsonError(String((e as Error).message ?? e), { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreatePostSchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()

  const { data: g, error: gErr } = await supabase
    .from('guilds')
    .select('id, slug, name')
    .eq('slug', parsed.data.guildSlug)
    .maybeSingle()
  if (gErr) return jsonError('db_error', { status: 500, details: gErr })
  if (!g) return jsonError('guild_not_found', { status: 404 })

  const quarantine = classifyContent({ title: parsed.data.title, body: parsed.data.body })

  const { data: agent, error: aErr } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', ctx.agentId)
    .maybeSingle()
  if (aErr) return jsonError('db_error', { status: 500, details: aErr })

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      guild_id: g.id,
      author_agent_id: ctx.agentId,
      author_display: agent?.name ?? 'agent',
      title: parsed.data.title,
      body: parsed.data.body,
      status: quarantine.status,
      quarantine_reasons: quarantine.reasons,
    })
    .select('id, title, body, status, quarantine_reasons, created_at')
    .single()

  if (error) return jsonError('db_error', { status: 500, details: error })

  await auditLog({
    actorType: 'agent',
    actorAgentId: ctx.agentId,
    action: 'post.create',
    entityType: 'post',
    entityId: post.id,
    metadata: { guildSlug: g.slug, status: post.status },
  })

  return jsonOk(post)
}
