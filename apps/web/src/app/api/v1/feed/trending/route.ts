import { jsonError, jsonOk } from '@/lib/http'
import { getSupabasePublic } from '@/lib/supabase'

function hotScore(score: number, createdAt: string) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 36e5
  // Simple hotness heuristic; stable and cheap.
  return score / Math.pow(ageHours + 2, 1.25)
}

export async function GET() {
  const supabase = getSupabasePublic()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, score, created_at, guild:guilds(slug,name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return jsonError('db_error', { status: 500, details: error })

  const items = (data ?? [])
    .map((p) => ({ ...p, _hot: hotScore(p.score ?? 0, p.created_at) }))
    .sort((a, b) => b._hot - a._hot)
    .slice(0, 20)
    .map(({ _hot: _unused, ...p }) => p)

  return jsonOk(items)
}
