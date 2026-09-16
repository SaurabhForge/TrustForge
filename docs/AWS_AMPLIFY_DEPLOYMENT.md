# TrustForge — AWS Amplify Deployment Guide

This guide walks you through deploying the **TrustForge Frontend Web Application** to **AWS Amplify Hosting** using your AWS account (**@saurabhkr**).

---

## Architecture on AWS Amplify

```
                                 ┌─────────────────────────────────┐
                                 │       Client Web Browser        │
                                 └───────────────┬─────────────────┘
                                                 │
                                                 │ HTTPS
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │       AWS CloudFront CDN        │
                                 │     (AWS Amplify Hosting)       │
                                 │   Global Low-Latency Edge       │
                                 └───────────────┬─────────────────┘
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         │                                               │
                         ▼                                               ▼
         ┌───────────────────────────────┐               ┌───────────────────────────────┐
         │ Static SPA Assets             │               │ REST API Requests             │
         │ HTML, JS, CSS, Media Assets   │               │ (VITE_API_URL)                │
         │ Served from S3 + CloudFront   │               │ https://trustforge-backend... │
         └───────────────────────────────┘               └───────────────────────────────┘
```

---

## Method 1: Deploying via AWS Amplify Console (Recommended)

### Step 1: Open AWS Amplify Console
1. Sign in to the AWS Console with your **@saurabhkr** account.
2. Navigate to [AWS Amplify Console](https://console.aws.amazon.com/amplify/home).
3. Click **Create new app** (or **Host web app**).

### Step 2: Connect GitHub Repository
1. Select **GitHub** as the source repository and click **Next**.
2. Authorize AWS Amplify to access your GitHub account.
3. Select:
   - **Repository**: `SaurabhForge/TrustForge`
   - **Branch**: `main`
4. If asked whether this is a monorepo, AWS Amplify will automatically detect [`amplify.yml`](../amplify.yml) with `appRoot: trustforge`.

### Step 3: Configure Build Settings
AWS Amplify will automatically detect the build specification from `amplify.yml`:
```yaml
version: 1
applications:
  - appRoot: trustforge
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci || npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

### Step 4: Add Environment Variables
Under **Advanced settings** -> **Environment variables**:
* **Variable**: `VITE_API_URL`
* **Value**: `https://trustforge-backend.onrender.com` (your deployed backend API)

Click **Save and deploy**.

### Step 5: Configure SPA Rewrites (Critical for React Router)
To ensure routes like `/overview`, `/identity-management`, `/access-control`, etc., reload without 404 errors:
1. In the left menu, select **Hosting** -> **Rewrites and redirects**.
2. Click **Edit**.
3. Add the Single Page App (SPA) rewrite rule:
   - **Source address**: `/<*>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
4. Click **Save**.

---

## Method 2: Deploying via AWS CLI (Profile: `saurabhkr`)

You already have the AWS CLI installed and configured with profile `saurabhkr`. To configure your credentials:

### 1. Configure AWS CLI Credentials
Run in PowerShell:
```powershell
aws configure --profile saurabhkr
```
Enter:
* **AWS Access Key ID**: *[Your Access Key]*
* **AWS Secret Access Key**: *[Your Secret Key]*
* **Default region name**: `us-east-1` (or your preferred region)
* **Default output format**: `json`

### 2. Create the Amplify App
```powershell
aws amplify create-app `
  --name "trustforge-frontend" `
  --repository "https://github.com/SaurabhForge/TrustForge" `
  --platform "WEB" `
  --environment-variables VITE_API_URL=https://trustforge-backend.onrender.com `
  --profile saurabhkr
```

### 3. Connect the `main` Branch
```powershell
aws amplify create-branch `
  --app-id "<YOUR_APP_ID>" `
  --branch-name "main" `
  --framework "React" `
  --stage "PRODUCTION" `
  --profile saurabhkr
```

### 4. Trigger Deployment
```powershell
aws amplify start-job `
  --app-id "<YOUR_APP_ID>" `
  --branch-name "main" `
  --job-type "RELEASE" `
  --profile saurabhkr
```

---

## Verification Checklist

Once deployed on AWS Amplify:
- [ ] Open the Amplify-generated URL (e.g. `https://main.dXXXXXXXXX.amplifyapp.com`).
- [ ] Confirm the TrustForge login screen loads.
- [ ] Sign in as **Saurabh Kumar** (Super Admin).
- [ ] Confirm all API metrics load from `https://trustforge-backend.onrender.com/api/dashboard/overview`.
- [ ] Refresh the page on `/identity-management` to verify the SPA rewrite is working properly.
