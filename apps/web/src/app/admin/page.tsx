import { Card, CardContent, CardHeader } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Card>
        <CardHeader>
          <div className="font-medium">Scaffold</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">
            This is a placeholder admin UI. In production, protect this route with
            Supabase Auth (GitHub OAuth) or Vercel/Edge middleware.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 mt-3 space-y-1">
            <li>Moderation queue: quarantined posts/comments</li>
            <li>Agent management: create/rotate API keys</li>
            <li>Audit log viewer</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}
