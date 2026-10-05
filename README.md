# Operix AI — Setup & Run Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

## 1. Database Setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE operix;
```

Then copy and run `operix-backend/src/db/schema.sql` against the `operix` database.

Or use the setup script (after configuring .env):
```bash
cd operix-backend
node src/db/setup.js
```

## 2. Backend

```bash
cd operix-backend

# Configure environment (already created with defaults):
# Edit .env — update DATABASE_URL with your PostgreSQL credentials

npm install   # (already done)
npm run dev   # Starts on http://localhost:5000
```

**Default .env values:**
```
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/operix
JWT_SECRET=operix-super-secret-jwt-key-change-in-production-2024
```
Update `postgres:password` with your actual PostgreSQL username/password.

## 3. Frontend

```bash
cd operix-frontend
npm install   # (already done)
npm run dev   # Starts on http://localhost:5173
```

## 4. Full User Journey

1. Open http://localhost:5173
2. Click **Get Started** → Create account → Set up business
3. Go to **Data** → Click **Load Demo Data** (loads 6 months of realistic retail data)
4. Explore: Dashboard → Sales → Inventory → Forecasts → Risks → AI Recommendations → Operix Assistant

Or click **Explore Demo** on the landing page for instant demo access.

## Architecture

```
operix-frontend/     React + TypeScript (Vite) — port 5173
operix-backend/      Node.js + Express — port 5000
  src/
    routes/          auth, business, sales, inventory, analytics,
                     forecast, risks, recommendations, assistant,
                     data, demo
    db/              PostgreSQL schema + connection pool
    middleware/      JWT authentication
```

## Features Built
- ✅ JWT Authentication (signup, login, logout)
- ✅ Business setup (name, type, category)
- ✅ Demo data: 10 products × 180 days of realistic sales
- ✅ CSV/Excel upload with column mapping & validation
- ✅ Dashboard: Health Score, KPIs, Revenue chart, Priority Actions
- ✅ Sales Intelligence: trend charts, period filters, top/poor products
- ✅ Inventory Intelligence: status cards, reorder suggestions
- ✅ AI Demand Forecasting: linear regression, 7/30/90-day, confidence levels
- ✅ Risk Detection: stockout, overstock, sales decline, demand change
- ✅ AI Recommendations: data-driven, prioritized, explainable
- ✅ Operix Assistant: NLP-style Q&A using actual business data
- ✅ Landing page with demo launch
- ✅ Settings page
- ✅ Responsive dark UI
