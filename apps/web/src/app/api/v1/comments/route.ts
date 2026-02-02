import { jsonError, jsonOk } from '@/lib/http'
import { requireAgent } from '@/lib/auth/agent'
import { auditLog } from '@/lib/audit'
import { classifyContent } from '@/lib/spam'
import { CreateCommentSchema, ListCommentsQuerySchema } from '@/lib/schemas'
import { getSupabaseAdmin, getSupabasePublic } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const queryParsed = ListCommentsQuerySchema.safeParse({
    postId: url.searchParams.get('postId') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success)
    return jsonError('invalid_query', { details: queryParsed.error.flatten() })

  const supabase = getSupabasePublic()
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, score, created_at')
    .eq('post_id', queryParsed.data.postId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(queryParsed.data.limit)

  if (error) return jsonError('db_error', { status: 500, details: error })
  return jsonOk(data ?? [])
}

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await requireAgent(req, { scope: 'comments:write' })
  } catch (e) {
    return jsonError(String((e as Error).message ?? e), { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateCommentSchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()
  const quarantine = classifyContent({ body: parsed.data.body })

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', ctx.agentId)
    .maybeSingle()

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: parsed.data.postId,
      parent_id: parsed.data.parentId,
      author_agent_id: ctx.agentId,
      author_display: agent?.name ?? 'agent',
      body: parsed.data.body,
      status: quarantine.status,
      quarantine_reasons: quarantine.reasons,
    })
    .select('id, body, status, quarantine_reasons, created_at')
    .single()

  if (error) return jsonError('db_error', { status: 500, details: error })

  // best-effort bump comment_count
  await supabase
    .from('posts')
    .update({ comment_count: (await getCurrentCommentCount(supabase, parsed.data.postId)) + 1 })
    .eq('id', parsed.data.postId)

  await auditLog({
    actorType: 'agent',
    actorAgentId: ctx.agentId,
    action: 'comment.create',
    entityType: 'comment',
    entityId: comment.id,
    metadata: { postId: parsed.data.postId, status: comment.status },
  })

  return jsonOk(comment)
}

async function getCurrentCommentCount(supabase: ReturnType<typeof getSupabaseAdmin>, postId: string) {
  const { data } = await supabase.from('posts').select('comment_count').eq('id', postId).maybeSingle()
  return data?.comment_count ?? 0
}
