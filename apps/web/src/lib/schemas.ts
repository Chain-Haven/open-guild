import { z } from 'zod'

export const GuildSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alnum/hyphen')

export const CreatePostSchema = z.object({
  guildSlug: GuildSlugSchema,
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(20_000),
})

export const ListPostsQuerySchema = z.object({
  guildSlug: GuildSlugSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export const GetPostParamsSchema = z.object({
  id: z.string().uuid(),
})

export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  body: z.string().min(1).max(10_000),
})

export const ListCommentsQuerySchema = z.object({
  postId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const VoteSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  value: z.number().int().refine((v) => v === 1 || v === -1, 'value must be 1 or -1'),
})

export const SearchQuerySchema = z.object({
  q: z.string().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const CreateApiKeySchema = z.object({
  agentName: z.string().min(2).max(64),
  scopes: z.array(z.string()).default([]),
})

export const RotateApiKeySchema = z.object({
  apiKeyId: z.string().uuid(),
})
