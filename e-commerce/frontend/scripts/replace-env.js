/**
 * Script to replace environment variables in environment.prod.ts
 * This is used for Vercel deployments where we need to inject the API URL
 */

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '../src/environments/environment.prod.ts');
const apiBaseUrl = process.env.NG_APP_API_BASE_URL || process.env.API_BASE_URL || '/api/v1';

// Read the current environment file
let content = fs.readFileSync(envFile, 'utf8');

// Replace the apiBaseUrl value
const newContent = content.replace(
  /apiBaseUrl:\s*['"`][^'"`]*['"`]/,
  `apiBaseUrl: '${apiBaseUrl}'`
);

// Write back to file
fs.writeFileSync(envFile, newContent, 'utf8');

console.log(`✅ Environment file updated with apiBaseUrl: ${apiBaseUrl}`);

