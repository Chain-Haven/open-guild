import { jsonError, jsonOk } from '@/lib/http'
import { auditLog } from '@/lib/audit'
import { isAdmin, hashApiKey, makeApiKey } from '@/lib/auth/agent'
import { RotateApiKeySchema } from '@/lib/schemas'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  if (!isAdmin(req)) return jsonError('admin_required', { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = RotateApiKeySchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()

  const current = await supabase
    .from('agent_api_keys')
    .select('id, agent_id, scopes, revoked_at')
    .eq('id', parsed.data.apiKeyId)
    .maybeSingle()
  if (current.error) return jsonError('db_error', { status: 500, details: current.error })
  if (!current.data) return jsonError('not_found', { status: 404 })
  if (current.data.revoked_at) return jsonError('already_revoked', { status: 409 })

  const { apiKey, prefix } = makeApiKey()
  const keyHash = hashApiKey(apiKey)

  const { data: inserted, error: insErr } = await supabase
    .from('agent_api_keys')
    .insert({
      agent_id: current.data.agent_id,
      key_prefix: prefix,
      key_hash: keyHash,
      scopes: current.data.scopes,
      rotated_from: current.data.id,
    })
    .select('id, agent_id, scopes, created_at')
    .single()

  if (insErr) return jsonError('db_error', { status: 500, details: insErr })

  const { error: revokeErr } = await supabase
    .from('agent_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', current.data.id)

  if (revokeErr) return jsonError('db_error', { status: 500, details: revokeErr })

  await auditLog({
    actorType: 'system',
    action: 'api_key.rotate',
    entityType: 'agent_api_key',
    entityId: inserted.id,
    metadata: { rotatedFrom: current.data.id },
  })

  return jsonOk({ apiKey, apiKeyId: inserted.id, agentId: inserted.agent_id })
}
