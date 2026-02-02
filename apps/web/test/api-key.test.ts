import test from 'node:test'
import assert from 'node:assert/strict'

import { hashApiKey, makeApiKey } from '../src/lib/auth/agent'

test('makeApiKey returns og_live_ key with stable prefix length', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
  process.env.API_KEY_PEPPER = 'pepper'

  const { apiKey, prefix } = makeApiKey()
  assert.ok(apiKey.startsWith('og_live_'))
  assert.equal(prefix.length, 14)
  assert.ok(apiKey.startsWith(prefix))

  const h1 = hashApiKey(apiKey)
  const h2 = hashApiKey(apiKey)
  assert.equal(h1, h2)
})
