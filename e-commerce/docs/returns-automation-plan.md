# Returns Automation & SLA Plan

## Goals

1. **Reduce manual effort** for low-risk returns by auto-approving based on configurable rules (order value, customer tier, fraud score, time since delivery).
2. **Guard SLAs** by nudging CX agents before a return request breaches promised turnaround (e.g., 24h acknowledgement, 72h resolution).
3. **Create consistent audit trails** so finance, CX, and compliance teams can trace every automated decision.

## Celery Architecture

| Component | Purpose | Schedule/Trigger | Queue |
| --- | --- | --- | --- |
| `return_auto_approval` task | Evaluate new `ReturnRequest` rows flagged as `Pending` and auto-approve when rules match (e.g., order value < $300, delivered < 14 days, customer tier Gold+). | Every 15 minutes via Celery Beat; idempotent lookup by `return_id`. | `returns.auto` |
| `return_sla_reminder` task | Scan pending/approved returns nearing SLA breach; enqueue notification/Slack alert + update `resolution_notes`. | Every hour via Beat. | `returns.sla` |
| `return_refund_verification` task | Poll payment providers to ensure refunds succeeded; retry failures and update state. | Event-driven (RabbitMQ event `return.completed`) or hourly sweep. | `returns.refund` |

## Data & Config

- Store automation rules in `return_rules` table (tenant-scoped) with fields: `max_amount`, `allowed_categories`, `customer_tiers`, `auto_refund` flag.
- SLA thresholds per tenant (e.g., `ack_sla_hours`, `resolution_sla_hours`).
- Feature flags (`returns.auto.enabled`, `returns.sla.enabled`) managed via secrets service.

## Workflow Outline

1. **Auto-Approval**
   - Celery task pulls pending requests created within last N hours.
   - For each, hydrate order + customer context; evaluate rule set.
   - If approved, update status, optionally trigger refund via `PaymentService.refund_payment`, publish `return.completed`.
   - Log audit entry (`AuditAction.RETURN_AUTO_APPROVED`).

2. **SLA Reminder**
   - Join `return_requests` with `audit_log` to compute elapsed time since last state change.
   - If `now - created_date > ack_sla` and status still pending, enqueue `notifications.send_return_alert`.
   - Repeat for resolution SLA when status `Approved` but not `Refunded`.

3. **Refund Verification**
   - Consume `return.completed` events; fetch payment provider metadata.
   - If provider status not `succeeded`, schedule retry/backoff.
   - Update `return_requests.refund_amount/refund_transaction_id` once success confirmed.

## Implementation Notes

- Use **distributed locks** (e.g., Redis) in tasks to avoid duplicate processing.
- Persist task outcomes in `return_automation_log` (return_id, task_type, decision, metadata).
- Expose metrics (Prometheus) for auto-approval rate, SLA breaches, refund retries.
- Extend `docs/events/registry.yaml` with `return.sla_breach` event for downstream analytics.

## Next Steps

1. Add configuration models + admin UI to manage automation rules per tenant.
2. Implement Celery Beat schedule entries and workers (`returns_auto`, `returns_sla`, `returns_refund`).
3. Backfill unit tests + integration tests covering rule evaluation and SLA detection.
4. Update runbooks to include new alert channels and remediation steps.

