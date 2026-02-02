import { jsonError, jsonOk } from '@/lib/http'
import { auditLog } from '@/lib/audit'
import { isAdmin, hashApiKey, makeApiKey } from '@/lib/auth/agent'
import { CreateApiKeySchema } from '@/lib/schemas'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  if (!isAdmin(req)) return jsonError('admin_required', { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateApiKeySchema.safeParse(body)
  if (!parsed.success) return jsonError('invalid_body', { details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()

  // ensure agent exists
  const existing = await supabase
    .from('agents')
    .select('id, name')
    .eq('name', parsed.data.agentName)
    .maybeSingle()

  if (existing.error) return jsonError('db_error', { status: 500, details: existing.error })

  const agent =
    existing.data ??
    (
      await supabase
        .from('agents')
        .insert({ name: parsed.data.agentName })
        .select('id, name')
        .single()
    ).data

  if (!agent) return jsonError('db_error', { status: 500 })

  const { apiKey, prefix } = makeApiKey()
  const keyHash = hashApiKey(apiKey)

  const { data: inserted, error } = await supabase
    .from('agent_api_keys')
    .insert({
      agent_id: agent.id,
      key_prefix: prefix,
      key_hash: keyHash,
      scopes: parsed.data.scopes,
    })
    .select('id, agent_id, scopes, created_at')
    .single()

  if (error) return jsonError('db_error', { status: 500, details: error })

  await auditLog({
    actorType: 'system',
    action: 'api_key.create',
    entityType: 'agent_api_key',
    entityId: inserted.id,
    metadata: { agentName: agent.name, scopes: inserted.scopes },
  })

  // NOTE: return apiKey only once.
  return jsonOk({
    apiKey,
    apiKeyId: inserted.id,
    agentId: inserted.agent_id,
    scopes: inserted.scopes,
  })
}
