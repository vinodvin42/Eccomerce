## E-Commerce Platform Documentation

### 1. Executive Summary
- Build a cloud-agnostic, production-ready e-commerce platform with a Python backend (FastAPI recommended for async performance) and an Angular 17 front-end.
- Architecture must be multi-tenant from authentication through data storage; every table/entity includes `CreatedBy`, `CreatedDate`, `ModifiedBy`, `ModifiedDate`.
- APIs are contract-first: define or update `swagger.json` before implementation; keep backend/services in sync automatically by generating server/client stubs.
- Design for horizontal scalability, automated testing, and continuous delivery; never ship features without integration, load, and security validation.

### 2. Technology Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, PostgreSQL 15, Redis (caching/session), Celery+RabbitMQ (async jobs), pytest, mypy, Ruff, Poetry.
- **Frontend**: Angular 17 + TypeScript, NgRx state, Angular Material, Nx workspace, Jest + Cypress, ESLint + Prettier.
- **DevOps**: Docker/Podman, Kubernetes, Helm, GitHub Actions, OpenTelemetry, Prometheus, Grafana, Loki, Vault-like custom secrets service (per user guidance).
- **Identity**: Okta/OAuth2/OIDC plus local DB users, MFA-capable, SCIM provisioning.

### 3. High-Level Architecture
1. **Edge**: Cloud load balancer → API Gateway (rate limiting, JWT validation, tenant routing).
2. **Frontend**: Angular SPA served via CDN with SSR fallback; communicates via REST/GraphQL; websockets for realtime order status.
3. **Backend Services**:
   - `catalog-service`: manages products, categories, inventory.
   - `order-service`: carts, checkout, payments, shipments.
   - `user-service`: accounts, roles, tenants, audit fields.
   - `payment-service`: tokenized payments, PSP webhooks.
   - `notification-service`: email/SMS/push via async jobs.
4. **Shared Resources**: PostgreSQL single cluster (multi-tenant schema), Redis, object storage (images, invoices), message bus.
5. **Observability**: OpenTelemetry traces, structured logs, metrics, alert rules (APDEX, error budgets).

### 4. Multi-Tenancy & Data Modeling
- Prefer schema-per-tenant or row-level security; enforce tenant isolation in middleware and DB policies.
- Base entity mixin:
  ```
  class AuditedEntity(Base):
      __abstract__ = True
      id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
      tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
      created_by = Column(UUID(as_uuid=True), nullable=False)
      created_date = Column(DateTime, default=func.now(), nullable=False)
      modified_by = Column(UUID(as_uuid=True), nullable=False)
      modified_date = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
  ```
- Apply optimistic locking (`version_id`), soft deletes, and history tables for compliance (GDPR, PCI DSS).

### 5. API Design Guidelines
- Maintain `docs/swagger.json` as the single source of truth; use semantic versioning and include examples/error schemas.
- Every request carries `X-Tenant-ID`, correlation ID, locale, and timezone headers.
- Implement pagination, filtering, HATEOAS links, and 429 backoffs.
- Enforce validation via Pydantic models; map errors to RFC 9457 `application/problem+json`.
- Document auth flows (client credentials for services, authorization code + PKCE for users).

### 6. Frontend Architecture (Angular)
- Structure using Nx libraries: `apps/web`, `libs/ui`, `libs/data-access`, `libs/shared`.
- Use NgRx feature stores per bounded context, lazy-loaded routes, standalone components, and signals where beneficial.
- Implement responsive design, internationalization (ngx-translate), accessibility (WCAG 2.1 AA), and offline caching via Angular Service Worker.
- Consume generated API clients (OpenAPI); centralize error handling, retry, and tenant-aware headers in HTTP interceptors.
- Apply strict TypeScript config, ESLint rulesets, and Storybook for components.

### 7. Backend Implementation Notes
- FastAPI routers per service; dependency-injected services with unit-of-work patterns.
- Central middleware stack: correlation IDs, tenant resolution, RBAC enforcement, rate limiting, logging, exception mapping.
- Background tasks via Celery: inventory sync, email notifications, analytics aggregation.
- Use SQLAlchemy `sessionmaker` with async engine; connection pooling tuned per service (e.g., 20 connections, overflow 10).
- Transactions wrap business workflows; saga pattern for cross-service operations (orders + payments + fulfillment).

### 8. Security & Compliance
- Enforce OWASP ASVS Level 2, PCI DSS, GDPR/CCPA.
- Secrets pulled from custom secrets service via short-lived tokens; never store plaintext secrets in env vars.
- TLS 1.3 end-to-end, HSTS, CSP, CSRF tokens, content validation, file AV scanning.
- Continuous SAST (CodeQL), DAST (OWASP ZAP), dependency scanning (pip-audit, npm audit), container scan (Trivy).

### 9. Testing & Quality Gates
- **Backend**: pytest unit + contract tests, integration suites in Docker, load tests with Locust, chaos engineering via Litmus.
- **Frontend**: Jest unit + snapshot, Cypress e2e, Lighthouse budgets.
- **Pipelines**: pre-commit hooks (format, lint, tests), branch protections requiring green CI, code coverage ≥ 85%, canary deployments.

### 10. Deployment & Operations
- GitOps workflow (Argo CD/Flux) for Kubernetes manifests; Helm charts parameterized per env (dev/stage/prod).
- Blue/green or canary rollouts with automated rollback on failed SLOs.
- Autoscaling rules based on CPU, memory, and custom metrics (orders/minute).
- Disaster recovery: daily encrypted DB backups, PITR, multi-region failover, runbooks documented in `docs/runbooks`.

### 11. Monitoring & Support
- Dashboards: checkout conversion, error rates, latency, inventory sync lag.
- Alerting: paging for P1 (auth, checkout, payment failures), Slack for P2/P3.
- Incident response includes blameless postmortems, root cause PDFs stored in `docs/incidents`.

### 12. Future Enhancements
- ML-based recommendations, vector search, headless commerce API for marketplaces, composable commerce integrations.
- Introduce event-driven schema registry, domain graph API, and plug-in marketplace for tenants.

This document should be kept alongside code changes; update it every sprint when architecture, APIs, or operational practices evolve.

