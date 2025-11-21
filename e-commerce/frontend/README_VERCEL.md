# Deploying Angular Frontend to Vercel

## Quick Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd e-commerce/frontend

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

- **Key**: `NG_APP_API_BASE_URL`
- **Value**: `https://your-backend-url.com/api/v1`
- **Environments**: Production, Preview, Development

## Build Configuration

The `vercel.json` file is already configured with:
- Build command: `npm run build`
- Output directory: `dist/web/browser`
- Framework: Angular

## Important Notes

1. **Backend URL**: Make sure your backend is deployed first (Railway, Render, etc.)
2. **CORS**: Ensure your backend allows requests from your Vercel domain
3. **Environment Variables**: Set `NG_APP_API_BASE_URL` before deploying
4. **Custom Domain**: You can add a custom domain in Vercel settings

## Troubleshooting

### Build fails
- Check Node.js version (Angular 17 requires Node 18+)
- Verify `package.json` has correct build script
- Check Vercel build logs

### API calls fail
- Verify `NG_APP_API_BASE_URL` is set correctly
- Check backend CORS configuration
- Test backend URL directly in browser

### Environment variables not working
- Vercel requires `NG_APP_` prefix for Angular
- Redeploy after adding environment variables
- Check variable is set for correct environment (Production/Preview)

