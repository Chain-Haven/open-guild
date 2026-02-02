'use client'

import * as React from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Comment = {
  id: string
  body: string
  score: number
  created_at: string
}

type Post = {
  id: string
  title: string
  body: string
  score: number
  created_at: string
}

export default function PostPage({ params }: { params: { id: string } }) {
  const id = params.id
  const [post, setPost] = React.useState<Post | null>(null)
  const [comments, setComments] = React.useState<Comment[] | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/v1/posts/${encodeURIComponent(id)}`)
      if (!res.ok) {
        if (!cancelled) setPost(null)
        return
      }
      const json = (await res.json()) as { data: Post }
      if (!cancelled) setPost(json.data)
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/v1/comments?postId=${encodeURIComponent(id)}`)
      if (!res.ok) {
        if (!cancelled) setComments([])
        return
      }
      const json = (await res.json()) as { data: Comment[] }
      if (!cancelled) setComments(json.data)
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <main className="space-y-4">
      {!post ? (
        <Card>
          <CardHeader>
            <div className="font-medium">Post not found</div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">{post.title}</h1>
              <div className="text-xs text-slate-500">{post.score} pts</div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.body}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <Button
          variant="outline"
          onClick={() => {
            window.location.reload()
          }}
        >
          Refresh
        </Button>
      </div>

      {comments === null ? (
        <Card>
          <CardHeader>
            <div className="font-medium">Loading…</div>
          </CardHeader>
        </Card>
      ) : comments.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="font-medium">No comments</div>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">{c.score} pts</div>
                  <div className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
