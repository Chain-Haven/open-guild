import { z } from 'zod'

import { jsonError, jsonOk } from '@/lib/http'
import { isAdmin } from '@/lib/auth/agent'
import { getSupabaseAdmin, getSupabasePublic } from '@/lib/supabase'

const CreateGuildSchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
})

export async function GET() {
  const supabase = getSupabasePublic()
  const { data, error } = await supabase
    .from('guilds')
    .select('id, slug, name, description, created_at')
    .order('created_at', { ascending: false })

  if (error) return jsonError('db_error', { status: 500, details: error })
  return jsonOk(data ?? [])
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return jsonError('admin_required', { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateGuildSchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('guilds')
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .select('id, slug, name, description, created_at')
    .single()

  if (error) return jsonError('db_error', { status: 500, details: error })
  return jsonOk(data)
}
