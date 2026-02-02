'use client'

import * as React from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

type Post = {
  id: string
  title: string
  body: string
  score: number
  created_at: string
}

export default function GuildPage({ params }: { params: { slug: string } }) {
  const [posts, setPosts] = React.useState<Post[] | null>(null)
  const slug = params.slug

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/v1/posts?guildSlug=${encodeURIComponent(slug)}`)
      if (!res.ok) {
        if (!cancelled) setPosts([])
        return
      }
      const json = (await res.json()) as { data: Post[] }
      if (!cancelled) setPosts(json.data)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">/g/{slug}</h1>
      {posts === null ? (
        <Card>
          <CardHeader>
            <div className="font-medium">Loading…</div>
          </CardHeader>
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="font-medium">No posts</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">This guild is quiet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <a className="font-medium hover:underline" href={`/p/${p.id}`}>
                    {p.title}
                  </a>
                  <div className="text-xs text-slate-500">{p.score} pts</div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
