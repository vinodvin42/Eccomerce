import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { AuditService } from '../../core/services/audit.service';
import type { AuditLog, AuditLogListResponse } from '../../shared/models/audit';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe, FormsModule, DatePipe],
  template: `
    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>Audit Logs</h2>
          <p>View audit trail of all system changes and activities.</p>
        </div>
      </header>

      <div class="filters">
        <select [(ngModel)]="selectedEntityType" (change)="loadLogs()">
          <option value="">All Entity Types</option>
          <option value="Product">Product</option>
          <option value="Order">Order</option>
          <option value="User">User</option>
          <option value="Tenant">Tenant</option>
        </select>

        <select [(ngModel)]="selectedAction" (change)="loadLogs()">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="VIEW">View</option>
        </select>

        <button class="btn-refresh" (click)="loadLogs()">Refresh</button>
      </div>

      <div *ngIf="auditLogs$ | async as logs" class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Changes</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs.items">
              <td>{{ log.created_date | date : 'short' }}</td>
              <td>
                <code>{{ log.entity_type }}</code>
                <br />
                <small>{{ log.entity_id | slice : 0 : 8 }}...</small>
              </td>
              <td>
                <span [class]="'badge badge-' + log.action.toLowerCase()">
                  {{ log.action }}
                </span>
              </td>
              <td>
                <small>{{ log.actor_id | slice : 0 : 8 }}...</small>
              </td>
              <td>
                <details *ngIf="log.changes" class="changes-details">
                  <summary>View Changes</summary>
                  <pre>{{ log.changes | json }}</pre>
                </details>
                <span *ngIf="!log.changes" class="no-changes">-</span>
              </td>
              <td>
                <small>{{ log.ip_address || '-' }}</small>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination">
          <span>Total: {{ logs.total }} entries</span>
          <span>Page: {{ logs.page }} of {{ Math.ceil(logs.total / logs.pageSize) }}</span>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        padding: 1.5rem;
        border-radius: 1rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 20px 40px var(--premium-shadow);
        border: 1px solid var(--premium-silver);
      }
      .panel__header {
        margin-bottom: 1rem;
      }
      .panel__header h2 {
        color: var(--premium-onyx);
      }
      .panel__header p {
        color: var(--premium-titanium);
      }
      .filters {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        align-items: center;
      }
      select {
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
      }
      select:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }
      .btn-refresh {
        padding: 0.5rem 1rem;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(183, 110, 121, 0.3);
        transition: all 0.2s;
      }
      .btn-refresh:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .table-wrapper {
        overflow-x: auto;
        margin-top: 1rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background: var(--premium-moonstone);
        text-align: left;
        padding: 0.75rem;
        border-bottom: 2px solid var(--premium-silver);
        color: var(--premium-titanium);
        font-weight: 600;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      td {
        text-align: left;
        padding: 0.75rem;
        border-bottom: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }
      tbody tr:hover {
        background: var(--premium-moonstone);
      }
      code {
        background: rgba(183, 110, 121, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--premium-rose-gold);
      }
      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.875rem;
        font-weight: 600;
      }
      .badge-create {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      .badge-update {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }
      .badge-delete {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      .badge-view {
        background: var(--premium-moonstone);
        color: var(--premium-titanium);
      }
      .changes-details {
        cursor: pointer;
      }
      .changes-details pre {
        background: var(--premium-moonstone);
        padding: 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        max-width: 300px;
        overflow-x: auto;
        border: 1px solid var(--premium-silver);
        color: var(--premium-onyx);
      }
      .no-changes {
        color: var(--premium-titanium);
      }
      small {
        color: var(--premium-titanium);
        font-size: 0.75rem;
      }
      .pagination {
        display: flex;
        justify-content: space-between;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--premium-silver);
        color: var(--premium-titanium);
      }
    `,
  ],
})
export class AuditLogsComponent implements OnInit {
  auditLogs$!: Observable<AuditLogListResponse>;
  selectedEntityType = signal<string>('');
  selectedAction = signal<string>('');
  Math = Math;

  constructor(private readonly auditService: AuditService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.auditLogs$ = this.auditService.listAuditLogs(
      1,
      50,
      undefined,
      this.selectedEntityType() || undefined,
      undefined,
      this.selectedAction() || undefined
    );
  }
}

