import { z } from 'zod'

export const GuildSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string(),
})

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  score: z.number().int().optional().default(0),
  created_at: z.string(),
  guild: z
    .object({
      slug: z.string(),
      name: z.string(),
    })
    .optional(),
})

export const CommentSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  score: z.number().int().optional().default(0),
  created_at: z.string(),
})

export type Guild = z.infer<typeof GuildSchema>
export type Post = z.infer<typeof PostSchema>
export type Comment = z.infer<typeof CommentSchema>

export type ClientOptions = {
  baseUrl: string
  apiKey?: string
  fetchImpl?: typeof fetch
}

function joinUrl(baseUrl: string, path: string) {
  return baseUrl.replace(/\/+$/, '') + path
}

async function parseEnvelope<S extends z.ZodTypeAny>(
  res: Response,
  schema: S,
): Promise<z.infer<S>> {
  const json = (await res.json()) as unknown
  const parsed = z.object({ data: schema }).safeParse(json)
  if (!parsed.success) throw new Error('invalid_api_response')
  return parsed.data.data
}

export function createClient(opts: ClientOptions) {
  const fetcher = opts.fetchImpl ?? fetch
  const authHeader: Record<string, string> = opts.apiKey
    ? { authorization: `Bearer ${opts.apiKey}` }
    : {}

  return {
    async listGuilds() {
      const res = await fetcher(joinUrl(opts.baseUrl, '/api/v1/guilds'))
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.array(GuildSchema))
    },

    async trending() {
      const res = await fetcher(joinUrl(opts.baseUrl, '/api/v1/feed/trending'))
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.array(PostSchema))
    },

    async search(q: string) {
      const res = await fetcher(
        joinUrl(opts.baseUrl, `/api/v1/search?q=${encodeURIComponent(q)}`),
      )
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.array(PostSchema))
    },

    async listPosts(input?: { guildSlug?: string }) {
      const qs = input?.guildSlug
        ? `?guildSlug=${encodeURIComponent(input.guildSlug)}`
        : ''
      const res = await fetcher(joinUrl(opts.baseUrl, `/api/v1/posts${qs}`))
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.array(PostSchema))
    },

    async getPost(id: string) {
      const res = await fetcher(joinUrl(opts.baseUrl, `/api/v1/posts/${id}`))
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, PostSchema)
    },

    async createPost(input: { guildSlug: string; title: string; body: string }) {
      const res = await fetcher(joinUrl(opts.baseUrl, '/api/v1/posts'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, PostSchema.partial({ guild: true }))
    },

    async listComments(postId: string) {
      const res = await fetcher(
        joinUrl(opts.baseUrl, `/api/v1/comments?postId=${encodeURIComponent(postId)}`),
      )
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.array(CommentSchema))
    },

    async createComment(input: { postId: string; body: string; parentId?: string }) {
      const res = await fetcher(joinUrl(opts.baseUrl, '/api/v1/comments'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, CommentSchema.partial())
    },

    async vote(input: { postId?: string; commentId?: string; value: 1 | -1 }) {
      const res = await fetcher(joinUrl(opts.baseUrl, '/api/v1/votes'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return parseEnvelope(res, z.object({ ok: z.boolean(), diff: z.number() }))
    },
  }
}
