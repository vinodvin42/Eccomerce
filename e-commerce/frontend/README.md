# Angular Frontend

Angular 17 standalone SPA consuming the FastAPI backend via the documented swagger contracts.

## Prerequisites
- Node.js 20+
- npm 10+

## Getting Started
```bash
cd e-commerce/frontend
npm install
npm start
```

The dev server proxies `/api` calls to `http://localhost:8000` (configurable in `proxy.conf.json`).

## Production Build
```bash
npm run build
```

Outputs static assets to `dist/web`.

## Testing & Linting
```bash
npm run test
npm run lint
```

## Configuration Highlights
- `src/app/core/interceptors/tenant.interceptor.ts` injects mandatory multi-tenant headers (`X-Tenant-ID`, `X-Actor-ID`, `X-Correlation-ID`).
- `CatalogService` and `OrderService` respect the contract-first APIs defined in `docs/swagger.json`.
- Standalone feature components (`dashboard`, `products`, `orders`) showcase listing, creation, and order orchestration workflows.

Extend by adding NgRx stores and OpenAPI-generated clients once the automation pipeline is wired.

