import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ImageUploadService } from '../../../core/services/image-upload.service';

interface ImageItem {
  url: string;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true,
    },
  ],
  template: `
    <div class="images-container">
      <!-- Image Items -->
      <div class="image-item" *ngFor="let imageItem of imageItems; let i = index">
        <div class="image-preview" *ngIf="imageItem.preview">
          <img [src]="imageItem.preview" [alt]="'Preview ' + (i + 1)" />
          <button type="button" class="btn-remove-preview" (click)="removeImage(i)" title="Remove image">×</button>
        </div>
        <div class="image-input-group">
          <input
            type="url"
            [value]="imageItem.url"
            (input)="updateImageUrl(i, $event)"
            placeholder="https://example.com/image.jpg"
            class="image-url-input"
          />
          <label class="btn-upload">
            📤 Upload
            <input
              type="file"
              accept="image/*"
              (change)="onFileSelected(i, $event)"
              style="display: none"
            />
          </label>
          <button type="button" class="btn-remove-image" (click)="removeImage(i)" title="Remove image">×</button>
        </div>
        <div class="upload-progress" *ngIf="imageItem.uploading">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="imageItem.progress || 0"></div>
          </div>
          <small>Uploading... {{ imageItem.progress || 0 }}%</small>
        </div>
        <small class="error-message" *ngIf="imageItem.error">{{ imageItem.error }}</small>
      </div>
      
      <!-- Add Buttons -->
      <div class="add-buttons">
        <button type="button" class="btn-add-image" (click)="addImageUrl()">
          + Add Image URL
        </button>
        <label class="btn-upload-image">
          📤 Upload Image
          <input
            type="file"
            accept="image/*"
            multiple
            (change)="onFilesSelected($event)"
            style="display: none"
          />
        </label>
      </div>
    </div>
  `,
  styles: [
    `
      .images-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .image-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .image-preview {
        position: relative;
        width: 100%;
        max-width: 200px;
        height: 150px;
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        overflow: hidden;
        background: var(--premium-moonstone);
      }

      .image-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .btn-remove-preview {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: rgba(239, 68, 68, 0.9);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1;
        transition: all 0.2s;
      }

      .btn-remove-preview:hover {
        background: #ef4444;
        transform: scale(1.1);
      }

      .image-input-group {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .image-url-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--premium-silver);
        background: #fff;
        color: var(--premium-onyx);
        font-size: 1rem;
        transition: all 0.2s;
      }

      .image-url-input:focus {
        outline: none;
        border-color: var(--premium-gold);
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
      }

      .btn-remove-image {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 0.5rem;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.5rem;
        line-height: 1;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .btn-remove-image:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
        transform: scale(1.1);
      }

      .btn-upload,
      .btn-upload-image {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px solid var(--premium-silver);
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .btn-upload:hover,
      .btn-upload-image:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
      }

      .btn-upload-image {
        background: linear-gradient(120deg, var(--premium-gold), var(--premium-rose-gold));
        color: #fff;
        border: none;
        padding: 0.75rem 1.25rem;
        box-shadow: 0 4px 12px rgba(183, 110, 121, 0.2);
      }

      .btn-upload-image:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(183, 110, 121, 0.3);
      }

      .btn-add-image {
        background: var(--premium-moonstone);
        color: var(--premium-onyx);
        border: 1px dashed var(--premium-silver);
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        align-self: flex-start;
      }

      .btn-add-image:hover {
        background: var(--premium-silver);
        border-color: var(--premium-gold);
        border-style: solid;
      }

      .add-buttons {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .upload-progress {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--premium-moonstone);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--premium-gold), var(--premium-rose-gold));
        transition: width 0.3s ease;
      }

      .upload-progress small {
        color: var(--premium-titanium);
        font-size: 0.75rem;
      }

      .error-message {
        color: #ef4444;
        font-size: 0.75rem;
        font-weight: 500;
      }
    `,
  ],
})
export class ImageUploadComponent implements ControlValueAccessor {
  @Input() multiple = true;
  @Output() imagesChange = new EventEmitter<string[]>();

  imageItems: ImageItem[] = [{ url: '' }];
  private onChange = (value: string[]) => {};
  private onTouched = () => {};

  constructor(private readonly imageUploadService: ImageUploadService) {}

  writeValue(value: string[]): void {
    if (value && value.length > 0) {
      this.imageItems = value.map((url) => ({
        url,
        preview: url.startsWith('data:') || url.startsWith('http') ? url : undefined,
      }));
    } else {
      this.imageItems = [{ url: '' }];
    }
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  addImageUrl(): void {
    this.imageItems.push({ url: '' });
  }

  removeImage(index: number): void {
    if (this.imageItems.length > 1) {
      this.imageItems.splice(index, 1);
    } else {
      this.imageItems[0] = { url: '' };
    }
    this.updateValue();
  }

  updateImageUrl(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.imageItems[index] = {
      ...this.imageItems[index],
      url: value,
      preview: value.startsWith('data:') || value.startsWith('http') ? value : undefined,
      error: undefined,
    };
    this.updateValue();
  }

  onFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleFileUpload(index, file);
      input.value = '';
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length > 0) {
      files.forEach((file, idx) => {
        const targetIndex = this.imageItems.length;
        if (idx === 0 && this.imageItems[this.imageItems.length - 1]?.url === '') {
          this.handleFileUpload(this.imageItems.length - 1, file);
        } else {
          this.imageItems.push({ url: '', uploading: true });
          this.handleFileUpload(targetIndex, file);
        }
      });
    }
    input.value = '';
  }

  handleFileUpload(index: number, file: File): void {
    const validation = this.imageUploadService.validateImageFile(file);
    if (!validation.valid) {
      this.imageItems[index] = {
        ...this.imageItems[index],
        error: validation.error,
        uploading: false,
      };
      return;
    }

    this.imageItems[index] = {
      ...this.imageItems[index],
      uploading: true,
      progress: 0,
      error: undefined,
    };

    this.imageUploadService.uploadImage(file).subscribe({
      next: (response) => {
        this.imageItems[index] = {
          url: response.url,
          preview: response.url,
          uploading: false,
          progress: 100,
        };
        this.updateValue();
      },
      error: () => {
        this.imageUploadService.convertToBase64(file).subscribe({
          next: (response) => {
            this.imageItems[index] = {
              url: response.url,
              preview: response.url,
              uploading: false,
              progress: 100,
            };
            this.updateValue();
          },
          error: () => {
            this.imageItems[index] = {
              ...this.imageItems[index],
              error: 'Failed to process image. Please try again.',
              uploading: false,
            };
          },
        });
      },
    });
  }

  updateValue(): void {
    const validUrls = this.imageItems.map((item) => item.url).filter((url) => url.trim() !== '');
    this.onChange(validUrls);
    this.imagesChange.emit(validUrls);
    this.onTouched();
  }
}

