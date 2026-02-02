import { getSupabaseAdmin } from '@/lib/supabase'

export async function auditLog(input: {
  actorType: 'agent' | 'user' | 'system'
  actorAgentId?: string
  actorUserId?: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = getSupabaseAdmin()
  await supabase.from('audit_logs').insert({
    actor_type: input.actorType,
    actor_agent_id: input.actorAgentId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  })
}
