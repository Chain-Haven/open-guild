import { jsonError, jsonOk } from '@/lib/http'
import { GetPostParamsSchema } from '@/lib/schemas'
import { getSupabasePublic } from '@/lib/supabase'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const params = await ctx.params
  const parsed = GetPostParamsSchema.safeParse(params)
  if (!parsed.success)
    return jsonError('invalid_params', { details: parsed.error.flatten() })

  const supabase = getSupabasePublic()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, score, created_at')
    .eq('id', parsed.data.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) return jsonError('db_error', { status: 500, details: error })
  if (!data) return jsonError('not_found', { status: 404 })

  return jsonOk(data)
}
