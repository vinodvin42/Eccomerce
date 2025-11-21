import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [NgIf],
  template: `
    <div *ngIf="isOpen" class="modal-overlay" (click)="onOverlayClick()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button type="button" class="modal-close" (click)="close()" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
        <div class="modal-footer" *ngIf="showFooter">
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 17, 17, 0.75);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-container {
        background: #fff;
        border: 1px solid var(--premium-silver);
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(212, 175, 55, 0.1);
        max-width: 90vw;
        max-height: 90vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }

      @keyframes slideUp {
        from {
          transform: translateY(30px) scale(0.95);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.75rem 2rem;
        border-bottom: 1px solid var(--premium-silver);
        background: linear-gradient(120deg, rgba(212, 175, 55, 0.05), rgba(183, 110, 121, 0.05));
        position: relative;
      }

      .modal-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, var(--premium-gold), var(--premium-rose-gold));
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--premium-onyx);
        letter-spacing: -0.01em;
      }

      .modal-close {
        background: var(--premium-moonstone);
        border: 1px solid var(--premium-silver);
        font-size: 1.5rem;
        line-height: 1;
        color: var(--premium-titanium);
        cursor: pointer;
        padding: 0;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .modal-close:hover {
        background: rgba(183, 110, 121, 0.1);
        border-color: var(--premium-rose-gold);
        color: var(--premium-rose-gold);
        transform: rotate(90deg) scale(1.1);
      }

      .modal-body {
        padding: 2rem;
        overflow-y: auto;
        flex: 1;
        max-height: calc(90vh - 180px);
        background: #fff;
      }

      .modal-footer {
        padding: 1.5rem 2rem;
        border-top: 1px solid var(--premium-silver);
        background: var(--premium-moonstone);
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }

      @media (max-width: 768px) {
        .modal-container {
          max-width: 95vw;
          max-height: 95vh;
        }

        .modal-header,
        .modal-body,
        .modal-footer {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showFooter = true;
  @Input() closeOnOverlayClick = true;
  @Output() closeModal = new EventEmitter<void>();

  close(): void {
    this.closeModal.emit();
  }

  onOverlayClick(): void {
    if (this.closeOnOverlayClick) {
      this.close();
    }
  }
}

