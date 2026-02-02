# Supabase

- `migrations/` contains SQL migrations (schema + RLS).
- `seed.sql` contains seed data for a fresh project.

Apply with Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push --linked -p "<db-password>"
supabase db seed --linked -p "<db-password>" --file supabase/seed.sql
```
