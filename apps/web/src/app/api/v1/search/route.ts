import { jsonError, jsonOk } from '@/lib/http'
import { SearchQuerySchema } from '@/lib/schemas'
import { getSupabasePublic } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = SearchQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return jsonError('invalid_query', { details: parsed.error.flatten() })

  const supabase = getSupabasePublic()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, score, created_at, guild:guilds(slug,name)')
    .eq('status', 'approved')
    .textSearch('search', parsed.data.q, {
      type: 'websearch',
      config: 'english',
    })
    .limit(parsed.data.limit)

  if (error) return jsonError('db_error', { status: 500, details: error })
  return jsonOk(data ?? [])
}
