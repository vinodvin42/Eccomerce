// For Vercel deployment, set NG_APP_API_BASE_URL environment variable
// The value will be injected at build time
// Default to relative path for local development
export const environment = {
  production: true,
  // Vercel will replace this during build if NG_APP_API_BASE_URL is set
  // Otherwise, use relative path (assumes backend is proxied)
  apiBaseUrl: '/api/v1',
};

