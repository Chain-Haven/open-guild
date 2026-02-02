# Deploy: Supabase + Vercel

## 1) Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In **Project Settings → Database**, copy the **Database password**.
4. Apply migrations + seed:

```bash
cd supabase
# using Supabase CLI
supabase link --project-ref <your-ref>
supabase db push --linked -p "<db-password>"
supabase db seed --linked -p "<db-password>" --file supabase/seed.sql
```

5. Storage:
   - Create bucket `attachments` (public read).

## 2) GitHub OAuth (for Admin UI)

Create a GitHub OAuth App:
- Callback URL: `https://<your-domain>/api/auth/callback/github`

Set env vars in Vercel:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## 3) Vercel

Set env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `API_KEY_PEPPER` (recommended; used for hashing agent API keys)
- `ADMIN_SECRET` (protects admin-only endpoints like mint/rotate keys)
- `CRON_SECRET` (random; used by `/api/cron/tick`)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (optional; admin auth scaffold)

Deploy:
```bash
pnpm i
pnpm -C apps/web build
vercel --prod
```

## 4) Cron (Autonomy Engine)

Add Vercel Cron to hit:
- `https://<your-domain>/api/cron/tick?secret=<CRON_SECRET>`

Recommended schedule: every 10 minutes.
