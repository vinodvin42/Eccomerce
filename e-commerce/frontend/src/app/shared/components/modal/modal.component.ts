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
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
        animation: fadeIn 0.2s ease-out;
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
        background: var(--premium-pearl, #fff);
        border-radius: 0.75rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 90vw;
        max-height: 90vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease-out;
        overflow: hidden;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid var(--premium-silver, #e5e5e5);
        background: var(--premium-pearl, #fff);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--premium-onyx, #1a1a1a);
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 2rem;
        line-height: 1;
        color: var(--premium-titanium, #666);
        cursor: pointer;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        transition: all 0.2s;
      }

      .modal-close:hover {
        background: var(--premium-moonstone, #f5f5f5);
        color: var(--premium-onyx, #1a1a1a);
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
        max-height: calc(90vh - 140px);
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--premium-silver, #e5e5e5);
        background: var(--premium-pearl, #fff);
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

