import { z } from 'zod'

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1).optional(),
  ADMIN_SECRET: z.string().min(1).optional(),
  API_KEY_PEPPER: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function requireServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      `Missing/invalid server env vars: ${parsed.error.issues
        .map((i) => i.path.join('.'))
        .join(', ')}`,
    )
  }
  return parsed.data
}
