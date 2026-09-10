# BUSSID Ventures Community - Render + Supabase Deployment

This project is a Vite React TypeScript frontend using Supabase for authentication, database, storage, RPC functions, likes, ratings, comments, notifications, moderation, analytics, and downloads.

## 1. Supabase setup

1. Open the Supabase project used by the app.
2. Open SQL Editor.
3. Run the SQL files in `supabase/migrations/` in chronological order, or use the Supabase CLI migration workflow.
4. In Storage, verify the buckets used by the application exist and their policies allow the intended public/read and authenticated/admin operations.
5. Configure Authentication -> URL Configuration:
   - Site URL: your final Render URL.
   - Redirect URLs: add the final Render URL and any local development URL you use.
6. Never put a Supabase `service_role` key in this frontend. Only the public anon/publishable key belongs in Vite environment variables.

## 2. Local verification

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open the local URL shown by Vite and test login, livery browsing, upload, download, likes, ratings, comments, notifications, admin moderation, and analytics.

## 3. Render deployment

The repository contains `render.yaml` for a Render Static Site.

Recommended Render settings if creating the service manually:

- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment Variables:
  - `VITE_SUPABASE_URL` = your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` = your Supabase public anon/publishable key

The SPA rewrite in `render.yaml` sends all routes to `/index.html`, so React Router routes continue working after refresh.

## 4. Important Vite rule

`VITE_*` values are bundled into the browser build. They are not secrets. Never put database passwords or Supabase `service_role` credentials in them.

## 5. After the first Render deploy

Copy the Render production URL into Supabase Authentication -> URL Configuration -> Site URL and Redirect URLs, save, then test authentication again.

## 6. Production checklist

- [ ] Supabase migrations applied
- [ ] Storage buckets and policies verified
- [ ] Authentication Site URL updated
- [ ] Authentication Redirect URLs updated
- [ ] Render environment variables added
- [ ] Build succeeds
- [ ] Home/Livery routes load directly
- [ ] User login/register works
- [ ] Livery images load
- [ ] Livery downloads work
- [ ] Community uploads enter moderation
- [ ] Likes/ratings/comments persist after refresh
- [ ] Notifications work
- [ ] Admin routes are protected
- [ ] Analytics and moderation work
