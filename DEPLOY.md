# Operix AI — Deployment

## Frontend → Vercel
## Backend + DB → Railway

---

## 1. Deploy Backend to Railway

1. Go to https://railway.app → Sign up (free)
2. Click **New Project → Deploy from GitHub repo**
3. Connect your GitHub and push this folder, OR use **Empty Project → Add Service → GitHub Repo**
4. Select the `operix-backend` folder as the **root directory**
5. Railway auto-detects Node.js

### Set Environment Variables in Railway:
```
PORT=5000
DATABASE_URL=<Railway provides this automatically when you add PostgreSQL>
JWT_SECRET=operix-super-secret-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

### Add PostgreSQL to Railway:
- In your Railway project → **New Service → Database → PostgreSQL**
- Railway automatically sets `DATABASE_URL` in your backend service

### Run DB Setup:
- In Railway → your backend service → **Settings → Deploy → Start Command**
- Set start command to: `node src/db/setup.js && node src/index.js`
- After first deploy, change it back to: `node src/index.js`

---

## 2. Deploy Frontend to Vercel

1. Go to https://vercel.com → Sign up (free)
2. **New Project → Import Git Repository** (push code to GitHub first)
3. Set **Root Directory** to `operix-frontend`
4. Framework preset: **Vite**

### Set Environment Variable in Vercel:
```
VITE_API_URL=https://your-backend.railway.app/api
```
(Get this URL from Railway after backend deploys)

### Build settings (Vercel auto-detects these):
- Build command: `npm run build`
- Output directory: `dist`

---

## 3. Update CORS

After deploying, update Railway env variable:
```
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
```

---

## Alternative: Deploy on Render (also free)

Backend: https://render.com → New Web Service → connect repo → root dir: `operix-backend`
DB: Render → New PostgreSQL (free tier)
Frontend: Render → New Static Site → root dir: `operix-frontend`

---

## Local to GitHub (prerequisite)

```bash
git init
git add .
git commit -m "Initial Operix AI commit"
git remote add origin https://github.com/YOUR_USERNAME/operix-ai.git
git push -u origin main
```
