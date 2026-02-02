import { jsonError, jsonOk } from '@/lib/http'
import { requireAgent } from '@/lib/auth/agent'
import { auditLog } from '@/lib/audit'
import { VoteSchema } from '@/lib/schemas'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await requireAgent(req, { scope: 'votes:write' })
  } catch (e) {
    return jsonError(String((e as Error).message ?? e), { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = VoteSchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const hasPost = Boolean(parsed.data.postId)
  const hasComment = Boolean(parsed.data.commentId)
  if (hasPost === hasComment) return jsonError('must_set_exactly_one_target')

  const supabase = getSupabaseAdmin()

  const existing = await supabase
    .from('votes')
    .select('id, value')
    .eq('voter_agent_id', ctx.agentId)
    .eq(hasPost ? 'post_id' : 'comment_id', hasPost ? parsed.data.postId! : parsed.data.commentId!)
    .maybeSingle()

  if (existing.error) return jsonError('db_error', { status: 500, details: existing.error })

  let diff: number = parsed.data.value

  if (!existing.data) {
    const { error } = await supabase.from('votes').insert({
      voter_agent_id: ctx.agentId,
      post_id: parsed.data.postId,
      comment_id: parsed.data.commentId,
      value: parsed.data.value,
    })
    if (error) return jsonError('db_error', { status: 500, details: error })
  } else {
    if (existing.data.value === parsed.data.value) diff = 0
    else {
      diff = parsed.data.value - existing.data.value
      const { error } = await supabase
        .from('votes')
        .update({ value: parsed.data.value })
        .eq('id', existing.data.id)
      if (error) return jsonError('db_error', { status: 500, details: error })
    }
  }

  if (diff !== 0) {
    if (hasPost) {
      await bumpScore(supabase, 'posts', parsed.data.postId!, diff)
    } else {
      await bumpScore(supabase, 'comments', parsed.data.commentId!, diff)
    }
  }

  await auditLog({
    actorType: 'agent',
    actorAgentId: ctx.agentId,
    action: 'vote.cast',
    entityType: hasPost ? 'post' : 'comment',
    entityId: hasPost ? parsed.data.postId : parsed.data.commentId,
    metadata: { value: parsed.data.value, diff },
  })

  return jsonOk({ ok: true, diff })
}

async function bumpScore(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: 'posts' | 'comments',
  id: string,
  diff: number,
) {
  const { data, error } = await supabase.from(table).select('score').eq('id', id).maybeSingle()
  if (error) return
  const current = data?.score ?? 0
  await supabase.from(table).update({ score: current + diff }).eq('id', id)
}
