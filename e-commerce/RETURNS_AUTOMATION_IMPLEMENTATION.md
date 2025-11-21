# Returns Automation Implementation ✅

## Overview

Celery-based automation system for return request management, including auto-approval, SLA monitoring, and refund verification.

## Implemented Components

### 1. Celery Tasks (`backend/app/tasks/returns.py`)

#### `returns.auto_approval`
- **Schedule**: Every 15 minutes (via Celery Beat)
- **Queue**: `returns.auto`
- **Purpose**: Auto-approves return requests based on configurable rules
- **Rules Evaluated**:
  - Order value < $300 (configurable)
  - Order age < 14 days (configurable)
  - No previous rejected returns for customer
- **Actions**:
  - Updates return status to `Approved`
  - Creates audit log entry (`RETURN_AUTO_APPROVED`)
  - Publishes events for downstream services

#### `returns.sla_reminder`
- **Schedule**: Every hour (via Celery Beat)
- **Queue**: `returns.sla`
- **Purpose**: Monitors return requests for SLA breaches
- **SLAs Monitored**:
  - **Acknowledgement**: 24 hours (pending returns)
  - **Resolution**: 72 hours (approved returns awaiting refund)
- **Actions**:
  - Sends reminders at 80% of SLA threshold
  - Publishes `return.sla_breach` events when breached
  - Updates resolution notes with SLA tracking

#### `returns.refund_verification`
- **Trigger**: Event-driven (via `return.completed` events) or periodic
- **Queue**: `returns.refund`
- **Purpose**: Verifies refund transaction status with payment providers
- **Actions**:
  - Checks payment transaction status
  - Updates return status to `Refunded` when confirmed
  - Logs verification results

#### `returns.periodic_refund_check`
- **Schedule**: Every hour (via Celery Beat)
- **Queue**: `returns.refund`
- **Purpose**: Periodically checks all approved returns awaiting refund verification
- **Actions**:
  - Scans approved returns with refund transactions
  - Triggers verification task for each return

### 2. Event System

#### New Events
- **`return.sla_breach`**: Published when SLA thresholds are breached
  - Includes: returnId, tenantId, orderId, slaType, elapsedHours
  - Consumers: notification-service, analytics-service

#### Updated Events
- **`return.completed`**: Already implemented, triggers refund verification

### 3. Celery Configuration

Updated `backend/app/celery_app.py`:
- Added `app.tasks.returns` to included modules
- Configured Celery Beat schedule:
  - `returns-auto-approval`: Every 15 minutes
  - `returns-sla-reminder`: Every hour
  - `returns-periodic-refund-check`: Every hour

## Usage

### Starting Celery Workers

```bash
# Start worker for returns.auto queue
celery -A app.celery_app worker --loglevel=info --queues=returns.auto

# Start worker for returns.sla queue
celery -A app.celery_app worker --loglevel=info --queues=returns.sla

# Start worker for returns.refund queue
celery -A app.celery_app worker --loglevel=info --queues=returns.refund

# Or start a worker for all queues
celery -A app.celery_app worker --loglevel=info --queues=returns.auto,returns.sla,returns.refund
```

### Starting Celery Beat (Scheduler)

```bash
celery -A app.celery_app beat --loglevel=info
```

### Manual Task Execution

```python
from app.tasks.returns import (
    return_auto_approval_task,
    return_sla_reminder_task,
    return_refund_verification_task,
    return_periodic_refund_check_task,
)

# Run auto-approval manually
return_auto_approval_task.delay()

# Check SLA for a specific return
return_refund_verification_task.delay("return-uuid-here")

# Run periodic checks
return_periodic_refund_check_task.delay()
```

## Configuration

### Auto-Approval Rules

Currently hardcoded in `_evaluate_auto_approval_rules()`:
- `max_amount`: $300.00
- `days_threshold`: 14 days

**Future Enhancement**: Store rules in database table `return_rules` (tenant-scoped)

### SLA Thresholds

Currently hardcoded:
- `ack_sla_hours`: 24 hours (acknowledgement)
- `resolution_sla_hours`: 72 hours (resolution)

**Future Enhancement**: Store per-tenant SLA configuration

## Monitoring & Logging

All tasks use structured logging with `structlog`:
- Task start/completion
- Rule evaluation results
- SLA breach detection
- Refund verification status
- Error handling

### Key Log Events
- `return_auto_approved`: Return was auto-approved
- `auto_approval_rule_failed`: Rule evaluation failed (with reason)
- `return_sla_reminder`: SLA reminder sent
- `return_sla_breach`: SLA threshold breached
- `return_refund_verified`: Refund verified successfully
- `return_refund_pending`: Refund still processing

## Audit Trail

All automated actions create audit log entries:
- **`RETURN_AUTO_APPROVED`**: When return is auto-approved
- Resolution notes updated with SLA tracking information

## Error Handling

- All tasks include try/except blocks with rollback on errors
- Errors are logged with context (return_id, tenant_id, etc.)
- Failed tasks can be retried via Celery's retry mechanism
- Database sessions are properly closed in finally blocks

## Testing

To test the automation:

1. **Create a test return request** via API
2. **Wait 15 minutes** or manually trigger `return_auto_approval_task`
3. **Check return status** - should be `Approved` if rules match
4. **Monitor logs** for SLA reminders and breaches
5. **Verify refund** status after approval

## Next Steps

1. **Configuration Management**: Move rules to database/configuration service
2. **Feature Flags**: Add tenant-level feature flags for automation
3. **Metrics**: Add Prometheus metrics for:
   - Auto-approval rate
   - SLA breach count
   - Refund verification success rate
4. **Notifications**: Integrate with email/Slack for SLA breaches
5. **Advanced Rules**: Add customer tier, fraud score, category-based rules

## Files Modified/Created

- ✅ `backend/app/tasks/returns.py` - New automation tasks
- ✅ `backend/app/celery_app.py` - Added Beat schedule and task includes
- ✅ `backend/app/core/events.py` - Added `publish_return_sla_breach()`
- ✅ `docs/events/registry.yaml` - Added `return.sla_breach` event schema

