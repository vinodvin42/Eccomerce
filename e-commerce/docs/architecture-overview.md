## Architecture Overview

### 1. Context & Goals
- Deliver a production-grade, multi-tenant e-commerce solution with Python (FastAPI) backend services and Angular 17 frontend.
- Support web, mobile, and CLI clients via unified APIs defined in `docs/swagger.json`.
- Keep all services cloud-agnostic, leverage a single shared PostgreSQL cluster (multi-tenant schema), and integrate external IdPs (Okta/AD) plus local DB auth.

### 2. Layered View
1. **Edge & Routing**
   - Global DNS → CDN/WAF → API Gateway.
   - Handles TLS termination, rate limiting, tenant header enforcement (`X-Tenant-ID`), JWT verification, and request tracing IDs.
2. **Presentation**
   - Angular SPA (SSR-enabled) deployed via CDN; uses generated OpenAPI clients.
   - CLI (Python Typer) for admin/batch tasks sharing the same API contracts.
3. **Domain Services (FastAPI)**
   - `user-service`: tenants, roles, user lifecycle, audit logging.
   - `catalog-service`: products, categories, SKUs, search indexes.
   - `order-service`: carts, checkout, fulfillment, sagas.
   - `payment-service`: tokenization, PSP integrations, webhook ingestion.
   - `notification-service`: email/SMS/push templating, async jobs.
4. **Data & Integration**
   - PostgreSQL 15 with row-level security per tenant.
   - Redis for caching/sessions, RabbitMQ for Celery jobs, object storage for media, secrets service for credentials.
   - Observability stack (OpenTelemetry → Tempo, Prometheus, Loki, Grafana).

### 3. Deployment Topology
- Containerized services orchestrated via Kubernetes.
- Separate namespaces per environment (dev/stage/prod); tenants isolated logically within shared clusters.
- Helm charts define pods, HPAs (CPU 65%, memory 70%), PodDisruptionBudgets, and network policies.
- GitOps (Argo CD) watches `deploy/helm` for declarative rollout; blue/green or canary depending on service criticality.

### 4. Data Model Highlights
- Base mixin ensures `CreatedBy`, `CreatedDate`, `ModifiedBy`, `ModifiedDate`.
- `tenant_id` indexed on every table; composite keys when referencing multi-tenant joins.
- Soft delete columns and event tables for compliance (GDPR “right to be forgotten” handled via anonymization jobs).

### 5. Cross-Cutting Concerns
- **Security**: OAuth2/OIDC, MFA, RBAC, dynamic scopes, secrets fetched at runtime with short TTL.
- **Resilience**: Circuit breakers (Tenacity), retries with exponential backoff, idempotent APIs (use request IDs).
- **Observability**: Structured logging (JSON), traces per request, metrics exported via `/metrics`.
- **Internationalization**: Locale-aware pricing, timezone normalization, currency conversion via FX microservice (future).

### 6. Service Interaction Patterns
- **Checkout flow** (happy path):
  1. `web` calls `order-service` `POST /orders` (OpenAPI `orders.v1.yaml` in `docs/swagger.json#/orders`).
  2. `order-service` reserves inventory via `catalog-service` gRPC call (defined in `services/catalog/proto/inventory.proto`).
  3. `order-service` emits `order.pending_payment` event → `payment-service` picks up, tokenizes card, confirms with PSP webhook.
  4. `notification-service` listens to `order.confirmed` to send receipts.
- **Failure handling**: sagas stored in `order_service.saga_instances`; compensating actions triggered when payment or inventory fails.

### 7. Diagram References
- System-level Context (C4) diagram stored at `docs/diagrams/c4-context.mmd` (Mermaid). Update when adding external dependencies.
- Container diagram `docs/diagrams/c4-container.mmd` illustrates each FastAPI service, PostgreSQL, Redis, RabbitMQ, and CDN.
- Sequence diagrams for checkout, returns, and tenant provisioning located in `docs/diagrams/sequences/*.mmd`. Add new sequences for any net-new workflow before coding.

### 8. Infrastructure Capacity Baseline
- **API Gateway**: 4 pods (2 vCPU/4 GiB) autoscaling to 12 on >60% CPU.
- **FastAPI services**: default 3 replicas (1 vCPU/2 GiB) with HPA min/max 3/15; p99 latency target <150 ms for read, <350 ms for write.
- **PostgreSQL**: HA pair (primary + read replica) on 8 vCPU/32 GiB; provisioned IOPS 15k; PITR enabled with 7-day retention.
- **Redis**: 3-node cluster (cache + session) 2 vCPU/4 GiB each, eviction policy `allkeys-lru`.
- Update `deploy/helm/values/*.yaml` when capacity changes and document rationale here.

### 9. Contracts & Repositories
- OpenAPI spec lives in `docs/swagger.json`; REST clients generated into `apps/web/src/generated` and `services/*/generated`.
- Async schemas governed by `docs/events/registry.yaml`; validate via CI job `ci-validate-contracts`.
- Infrastructure as code under `infra/terraform`; network/security baselines referenced in `infra/terraform/modules/network`.

### 10. Future Architecture Considerations
- Event-driven extensions via Kafka and schema registry.
- GraphQL federation for omnichannel experiences.
- Pluggable recommendation engine using vector DBs.

Keep this document updated whenever adding new bounded contexts, deployment targets, or cross-cutting capabilities.

