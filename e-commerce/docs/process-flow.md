## Process Flow & Development Playbook

### 1. Idea to Deployment Workflow
1. **Discovery & Design**
   - Capture feature requests in Jira; define acceptance criteria, tenant impacts, and compliance considerations.
   - Update `docs/swagger.json` with new/changed endpoints before coding; review via API guild.
   - Exit criteria: UX mocks approved, threat model updated, non-functional budgets defined.
2. **Implementation**
   - Backend: scaffold FastAPI routers/services using OpenAPI-generated stubs, implement domain logic with SQLAlchemy unit-of-work and audited entities.
   - Frontend: create Angular feature libs, NgRx slices, and shared UI components; consume regenerated API clients.
   - All code must include unit tests (pytest/Jest), Storybook stories, and database migrations when models change.
   - Exit criteria: unit tests green, coverage ≥85%, static analysis clean (ruff/mypy/eslint).
3. **Verification**
   - Run pre-commit (ruff, mypy, pytest, eslint, jest). Maintain performance budgets (p95 API <250 ms, UI LCP <2.5s).
   - Execute integration tests via Docker Compose (PostgreSQL, Redis, RabbitMQ) and Cypress E2E in CI.
   - Exit criteria: integration suite pass, security scans clean, load test (Locust) meets throughput target (500 RPS baseline).
4. **Release**
   - GitHub Actions pipeline builds Docker images, runs security scans (Trivy, pip-audit, npm audit), signs containers.
   - Argo CD promotes to staging, triggers smoke + load testing, then canary to production with auto-rollback on SLO breach.
   - Exit criteria: change ticket approved, on-call informed, monitoring dashboards updated.

### 2. Request Lifecycle (Runtime)
1. Client sends request with `Authorization` bearer token, `X-Tenant-ID`, correlation ID.
2. API Gateway authenticates, enriches headers, forwards to appropriate service via service mesh (Linkerd/Istio).
3. FastAPI middleware resolves tenant context, validates payload via Pydantic, applies RBAC, and passes to domain service.
4. Domain service executes business logic:
   - Queries PostgreSQL using tenant-scoped session.
   - Emits domain events to RabbitMQ for async workflows (e.g., order placed → send email, adjust inventory).
5. Response serialized with audited metadata; traces/logs emitted; metrics incremented.

### 3. Incident Response Flow
1. Alerts (Prometheus/Grafana) notify on-call via PagerDuty for P1 incidents.
2. Runbooks in `docs/runbooks` guide immediate mitigation (scale out pods, failover DB, disable feature flag).
3. Incident bridge established; timeline logged in incident tracker.
4. Post-incident, complete blameless postmortem within 48h, update documentation/tests, and create follow-up tasks.

### 4. Change Management & Governance
- Feature toggles managed via LaunchDarkly (or open-source equivalent) for safe launches.
- All migrations versioned (Alembic) and reviewed by data team; backward-compatible changes only during active deployments.
- Security review required for endpoints touching payments or PII.
- Quarterly architecture review ensures alignment with multi-tenant, audit, and resilience standards.
- RACI snapshot (sample):
  | Activity | Responsible | Accountable | Consulted | Informed |
  | --- | --- | --- | --- | --- |
  | API design updates | Tech Lead | Architect | Security, QA | Product |
  | Production deploy | DevOps | SRE Manager | Feature Team | Support |
  | Incident postmortem | Incident Lead | CTO | Affected Teams | All Eng |

### 5. Developer Environment Setup (Reference)
1. Clone repo, run `poetry install` (backend) and `npm install` (frontend).
2. Start local stack: `docker compose up postgres redis rabbitmq`.
3. Launch backend via `poetry run uvicorn app.main:app --reload`; frontend via `nx serve web`.
4. Seed tenants/users using CLI command `poetry run manage bootstrap --tenant default`.

### 6. Metrics & Reporting
- **Quality**: coverage ≥85%, mutation score ≥70% (mutmut reports), lint debt <5 warnings per module.
- **Performance**: backend p95 latency <250 ms, Angular Lighthouse performance score ≥90 in staging.
- **Reliability**: error budget of 0.1% per rolling 30 days, change failure rate <10%, MTTR <30 min.
- Publish weekly scorecard in `docs/reports/quality-dashboard.md` and link to Grafana dashboards.

Maintain this document as the authoritative source for how work moves from ideation to production and how runtime requests flow through the platform.

