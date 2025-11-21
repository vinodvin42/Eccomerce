# Vercel Build Cache Issue

## Problem
Vercel is still seeing the old `angular.json` with budgets configuration, even though the file has been fixed locally.

## Solution

### Option 1: Clear Vercel Build Cache (Recommended)

1. **Via Vercel Dashboard**:
   - Go to your project → Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Build Cache"
   - Redeploy

2. **Via Vercel CLI**:
   ```bash
   vercel --force
   ```

3. **Manual Cache Clear**:
   - Go to Deployments tab
   - Click on latest deployment
   - Click "Redeploy"
   - **Uncheck** "Use existing Build Cache"

### Option 2: Verify Git Commit

Make sure `angular.json` changes are committed and pushed:

```bash
cd e-commerce/frontend
git status
git add angular.json
git commit -m "Fix: Remove budgets config for Angular 17"
git push
```

### Option 3: Force Rebuild

In Vercel Dashboard:
1. Go to your project
2. Settings → General
3. Under "Build & Development Settings"
4. Temporarily change "Build Command" to:
   ```
   rm -rf node_modules .angular && npm run build:prod
   ```
5. Redeploy
6. Change it back to `npm run build:prod` after successful deploy

## Verification

The `angular.json` file should have:
- ✅ No `budgets` array in production configuration
- ✅ No `defaultProject` property
- ✅ Only `outputHashing: "all"` in production config

Current file is correct - the issue is Vercel's cache.

