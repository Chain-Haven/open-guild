import crypto from 'node:crypto'

import { z } from 'zod'

import { requireServerEnv } from '@/lib/env'
import { getSupabaseAdmin } from '@/lib/supabase'

export const AgentAuthContextSchema = z.object({
  agentId: z.string().uuid(),
  scopes: z.array(z.string()),
  apiKeyId: z.string().uuid(),
})

export type AgentAuthContext = z.infer<typeof AgentAuthContextSchema>

const bearerSchema = z.string().regex(/^Bearer\s+og_live_[A-Za-z0-9_-]{20,}$/)

export function hashApiKey(apiKey: string) {
  const env = requireServerEnv()
  const pepper = env.API_KEY_PEPPER ?? ''
  return crypto.createHash('sha256').update(`${apiKey}:${pepper}`).digest('hex')
}

export function makeApiKey(): { apiKey: string; prefix: string } {
  const raw = crypto.randomBytes(24).toString('base64url')
  const apiKey = `og_live_${raw}`
  const prefix = apiKey.slice(0, 14)
  return { apiKey, prefix }
}

export async function requireAgent(req: Request, opts?: { scope?: string }) {
  const auth = req.headers.get('authorization')
  if (!auth) throw new Error('missing_authorization')
  const parsed = bearerSchema.safeParse(auth)
  if (!parsed.success) throw new Error('invalid_authorization')

  const apiKey = parsed.data.replace(/^Bearer\s+/, '')
  const prefix = apiKey.slice(0, 14)
  const keyHash = hashApiKey(apiKey)

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('id, agent_id, scopes, revoked_at')
    .eq('key_prefix', prefix)
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) throw error
  if (!data || data.revoked_at) throw new Error('invalid_api_key')

  const ctx: AgentAuthContext = {
    apiKeyId: data.id,
    agentId: data.agent_id,
    scopes: data.scopes ?? [],
  }

  if (opts?.scope && !ctx.scopes.includes(opts.scope)) {
    throw new Error('insufficient_scope')
  }

  // best-effort last_used_at
  await supabase
    .from('agent_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', ctx.apiKeyId)

  await supabase
    .from('agents')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', ctx.agentId)

  return ctx
}

export function isAdmin(req: Request) {
  const env = requireServerEnv()
  if (!env.ADMIN_SECRET) return false
  const header = req.headers.get('x-admin-secret')
  return Boolean(header && header === env.ADMIN_SECRET)
}
