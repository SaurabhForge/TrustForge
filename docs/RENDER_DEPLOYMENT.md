# TrustForge — Render Deployment Guide

This guide explains how to deploy both the **TrustForge Backend API** and the **TrustForge Frontend SPA** to [Render](https://render.com).

---

## 🌟 Live Production Services

| Component | Status | Production URL | Render Dashboard |
|---|---|---|---|
| **Frontend Web App (SPA)** | 🟢 **Live** (200 OK) | [https://trustforge-frontend-bk6d.onrender.com](https://trustforge-frontend-bk6d.onrender.com) | [srv-dal1iqv40ujc7397dro0](https://dashboard.render.com/static/srv-dal1iqv40ujc7397dro0) |
| **Backend REST API** | 🟢 **Live** (200 OK) | [https://trustforge-backend-wpib.onrender.com](https://trustforge-backend-wpib.onrender.com) | [srv-dal1iodg1s2s73dtlo80](https://dashboard.render.com/web/srv-dal1iodg1s2s73dtlo80) |

---

## Architecture Overview on Render

```
                               ┌────────────────────────────────────────┐
                               │       Client Web Browser               │
                               └───────┬────────────────────────┬───────┘
                                       │                        │
                    Static SPA Assets  │                        │ REST API & Auth
                    (HTML, JS, CSS)    │                        │ (/api/*)
                                       ▼                        ▼
               ┌───────────────────────────────┐        ┌──────────────────────────────┐
               │ trustforge-frontend           │        │ trustforge-backend           │
               │ (Render Static Site)          │        │ (Render Web Service)         │
               │ Runtime: Static (Vite React)  │        │ Runtime: Node.js (Express)   │
               └───────────────────────────────┘        └──────────────┬───────────────┘
                                                                       │
                                                                       │ SQL Queries
                                                                       ▼
                                                        ┌──────────────────────────────┐
                                                        │ trustforge-db                │
                                                        │ (Render PostgreSQL Database) │
                                                        └──────────────────────────────┘
```

---

## Method 1: Automatic Blueprint Deployment (Recommended)

Render provides Infrastructure-as-Code via `render.yaml`. This is already configured in the root of the TrustForge repository.

### Steps:

1. **Push Changes to GitHub**:
   Ensure all changes are committed and pushed to your repository:
   ```bash
   git add .
   git commit -m "Configure project for Render deployment"
   git push origin main
   ```

2. **Log into Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Sign in with your GitHub account.

3. **Deploy the Blueprint**:
   - Click the **New +** button in the top right.
   - Select **Blueprint**.
   - Connect your repository: `SaurabhForge/TrustForge`.
   - Render will read `render.yaml` and display the blueprint plan:
     - **Database**: `trustforge-db` (PostgreSQL Free tier)
     - **Web Service**: `trustforge-backend` (Node API)
     - **Static Site**: `trustforge-frontend` (Vite SPA)
   - When prompted for `VITE_API_URL`, you can either:
     - Leave it blank during the first run, let the backend deploy to obtain its URL (e.g., `https://trustforge-backend.onrender.com`), then set `VITE_API_URL` in the frontend settings.
     - Or enter your desired backend service URL if known.
   - Click **Apply**.

4. **Link Frontend to Backend**:
   - Once `trustforge-backend` finishes deploying, copy its public URL (e.g. `https://trustforge-backend.onrender.com`).
   - Go to your `trustforge-frontend` service in Render.
   - Go to **Environment** tab.
   - Set `VITE_API_URL = https://trustforge-backend.onrender.com` (no trailing slash).
   - Click **Save Changes** (Render will automatically re-build and publish the frontend).

---

## Method 2: Manual Dashboard Setup

If you prefer configuring the services manually via the Render UI:

### Step 1: Create the PostgreSQL Database
1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. Settings:
   - **Name**: `trustforge-db`
   - **Database**: `trustforge`
   - **User**: `trustforge`
   - **Plan**: Free
3. Click **Create Database**.
4. Copy the **Internal Database URL** (for connecting from Render services).

### Step 2: Create the Backend Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository `SaurabhForge/TrustForge`.
3. Configure settings:
   - **Name**: `trustforge-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run db:generate && npm run build`
   - **Start Command**: `npx prisma db push --skip-generate && npm start`
   - **Health Check Path**: `/health`
   - **Plan**: Free
4. Add **Environment Variables**:
   | Key | Value / Source |
   |-----|----------------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DATABASE_URL` | *Paste your database Internal Connection String* |
   | `JWT_SECRET` | *Generate a secure random string (e.g. 32+ characters)* |
   | `JWT_EXPIRES_IN` | `24h` |
   | `CORS_ORIGIN` | `*` (or your frontend Render URL once known) |
   | `RPC_URL` | `https://rpc.ankr.com/eth_sepolia` |
   | `CHAIN_ID` | `11155111` |
5. Click **Create Web Service**.
6. Note your backend URL: `https://trustforge-backend.onrender.com`.

### Step 3: Create the Frontend Static Site
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Select your repository `SaurabhForge/TrustForge`.
3. Configure settings:
   - **Name**: `trustforge-frontend`
   - **Root Directory**: `trustforge`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL`: `https://trustforge-backend.onrender.com`
5. Configure **Redirects / Rewrites** (under settings):
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
   *(This ensures client-side routing like `/identities`, `/assets`, `/audit` works when refreshing the page).*
6. Click **Create Static Site**.

---

## Method 3: Unified Full-Stack Service (Single Free Service)

If you wish to use only **one** web service instance on Render:
1. The Express backend has built-in support to serve the built frontend assets from `trustforge/dist`.
2. Build Command in root:
   ```bash
   npm run build:frontend && npm run build:backend
   ```
3. Start Command:
   ```bash
   npm start
   ```
4. In this mode, both the frontend UI and the backend API are served from the same domain with **zero CORS configuration needed**.

---

## Verification & Testing Checklist

After deployment, test the following endpoints and flows:

- [ ] **Backend Health Check**:
  ```bash
  curl https://trustforge-backend.onrender.com/health
  ```
  Expected Response: `{"status":"ok","service":"TrustForge Enterprise API","version":"1.0.0",...}`

- [ ] **Frontend Loading**:
  Visit `https://trustforge-frontend.onrender.com` in your browser. The login screen or persona selector should render immediately.

- [ ] **Persona Sign-In**:
  Click on **Saurabh Kumar** (Super Admin) or **Marcus Vance** (Security Admin).
  Verify that the dashboard loads live metrics, identity counts, and recent audit trails.

- [ ] **Identity Management**:
  Navigate to `/identities` and verify DID list loads. Click any identity to inspect its W3C DID Document and Verifiable Credentials.

- [ ] **Verification Center**:
  Run an instant or ZK-STARK verification test to verify real-time cryptographic validation.

---

## Troubleshooting

### 1. Render Free Tier Spin-Down (Cold Start)
- Render's free Web Services sleep after 15 minutes of inactivity.
- The first request may take ~30–50 seconds while the container boots up. Subsequent requests will be fast.

### 2. Database Auto-Seeding
- TrustForge includes an automatic seeder. When the backend connects to an empty database for the first time, it automatically creates the standard roles, permissions, identities, and sample audit records without any manual CLI commands.
- If PostgreSQL is temporarily unreachable, TrustForge automatically falls back to an embedded in-memory persistence layer so your demo continues working without throwing 500 errors.

### 3. Updating the Frontend API URL
- Because Vite compiles environment variables into JavaScript bundle assets at **build time**, whenever you change `VITE_API_URL`, trigger a **Manual Deploy -> Clear build cache & deploy** on the Static Site in Render.
