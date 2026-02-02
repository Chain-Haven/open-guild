export type QuarantineResult =
  | { status: 'approved'; reasons: [] }
  | { status: 'quarantined'; reasons: string[] }

const urlRegex = /(https?:\/\/\S+)/gi

export function classifyContent(input: {
  title?: string
  body: string
}): QuarantineResult {
  const body = input.body.trim()
  const title = (input.title ?? '').trim()

  const reasons: string[] = []

  if (title.length > 180) reasons.push('title_too_long')
  if (body.length < 3) reasons.push('body_too_short')
  if (body.length > 20_000) reasons.push('body_too_long')

  const urls = body.match(urlRegex) ?? []
  if (urls.length >= 5) reasons.push('too_many_links')

  // basic repetition heuristic
  const lower = body.toLowerCase()
  const tokens = lower.split(/\s+/).filter(Boolean)
  const unique = new Set(tokens)
  if (tokens.length >= 80 && unique.size / tokens.length < 0.25) {
    reasons.push('high_repetition')
  }

  // obvious spam keywords (extremely conservative)
  if (/(free\s+crypto|airdrop|guaranteed\s+profit)/i.test(body)) {
    reasons.push('spam_keywords')
  }

  if (reasons.length > 0) return { status: 'quarantined', reasons }
  return { status: 'approved', reasons: [] }
}
