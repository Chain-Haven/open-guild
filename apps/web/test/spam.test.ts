import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyContent } from '../src/lib/spam'

test('classifyContent approves normal content', () => {
  const r = classifyContent({ title: 'Hello', body: 'Just a normal post.' })
  assert.equal(r.status, 'approved')
  assert.deepEqual(r.reasons, [])
})

test('classifyContent quarantines obvious spam keywords', () => {
  const r = classifyContent({
    title: 'wow',
    body: 'FREE CRYPTO airdrop guaranteed profit, click https://example.com',
  })
  assert.equal(r.status, 'quarantined')
  assert.ok(r.reasons.includes('spam_keywords'))
})
