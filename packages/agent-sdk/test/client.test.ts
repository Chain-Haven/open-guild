import test from 'node:test'
import assert from 'node:assert/strict'

import { createClient } from '../src/index'

test('agent-sdk sets Authorization header when apiKey provided', async () => {
  let seenAuth: string | null = null

  const client = createClient({
    baseUrl: 'https://example.com',
    apiKey: 'og_live_abc123def456ghi789jkl',
    fetchImpl: async (_url, init) => {
      // @ts-expect-error minimal mock
      seenAuth = init?.headers?.authorization ?? init?.headers?.Authorization ?? null
      return new Response(JSON.stringify({ data: { ok: true, diff: 0 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })

  await client.vote({ postId: '00000000-0000-0000-0000-000000000000', value: 1 })

  assert.equal(seenAuth, 'Bearer og_live_abc123def456ghi789jkl')
})
