# Deploying StockPilot

## Deploy to Vercel

1. **Push your code to GitHub** (if not already).
2. Go to [vercel.com](https://vercel.com) and sign in.
3. **Import** your repository → New Project.
4. **Environment variables** (Settings → Environment Variables). Add:
   - `QUICKBOOKS_CLIENT_ID` — your Intuit app Client ID
   - `QUICKBOOKS_CLIENT_SECRET` — your Intuit app Client Secret
   - `NEXT_PUBLIC_APP_URL` — your app URL, e.g. `https://your-project.vercel.app`
5. **Deploy.** Vercel will run `npm run build` and deploy.

**If the build fails with “No Output Directory named `public`”:** In Vercel → Project → **Settings** → **General** → **Build & Development Settings**, set **Framework Preset** to **Next.js**, clear **Output Directory** (leave it empty), and save. Next.js builds to `.next`; `public` is only for static assets, not the build output.

After deploy, use your Vercel URL in Intuit:
- **Redirect URI:** `https://your-project.vercel.app/api/auth/quickbooks/callback`
- **EULA:** `https://your-project.vercel.app/legal/eula`
- **Privacy:** `https://your-project.vercel.app/legal/privacy`

---

## Important: QuickBooks tokens and sync on Vercel

On Vercel (serverless), the **file-based** token store (`.data/qb-tokens.json`) and synced data (`.data/*.json`) **do not persist** between requests. So:

- **Connect** and **Sync** may work once, but after a new deployment or cold start, tokens and data can be lost.
- For **production** with QuickBooks, plan to store tokens and synced data in a **database** (e.g. Vercel Postgres, Supabase) or another persistent store. The current file-based implementation is best for local or a single long-running server.

Until then, the deployed app will:
- Run correctly with **mock data**.
- Give you a stable **public URL** for Intuit (redirect, EULA, privacy).
- Allow you to test the UI and flows; for reliable QB sync in production, add a DB later.
