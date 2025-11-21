import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface UploadResponse {
  url: string;
  filename?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private readonly baseUrl = `${environment.apiBaseUrl}/uploads`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Upload a single image file to the server
   */
  uploadImage(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.baseUrl}/images`, formData, {
      reportProgress: true,
    }).pipe(
      map((response) => response),
      catchError((error) => {
        // If endpoint doesn't exist (404) or any other error, fallback to base64
        console.warn('Upload endpoint not available, using base64 fallback:', error.status || error);
        return this.convertToBase64(file);
      })
    );
  }

  /**
   * Upload multiple image files
   */
  uploadImages(files: File[]): Observable<UploadResponse[]> {
    if (files.length === 0) {
      return of([]);
    }

    const uploads = files.map((file) => this.uploadImage(file));
    // Use forkJoin for parallel uploads
    return new Observable((observer) => {
      const results: UploadResponse[] = [];
      let completed = 0;
      
      uploads.forEach((upload, index) => {
        upload.subscribe({
          next: (response) => {
            results[index] = response;
            completed++;
            if (completed === files.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            // Try base64 fallback for failed uploads
            this.convertToBase64(files[index]).subscribe({
              next: (response) => {
                results[index] = response;
                completed++;
                if (completed === files.length) {
                  observer.next(results);
                  observer.complete();
                }
              },
              error: () => {
                completed++;
                if (completed === files.length) {
                  observer.next(results.filter((r): r is UploadResponse => r !== undefined));
                  observer.complete();
                }
              },
            });
          },
        });
      });
    });
  }

  /**
   * Convert file to base64 data URL (fallback when upload endpoint is not available)
   */
  convertToBase64(file: File): Observable<UploadResponse> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        observer.next({
          url: reader.result as string,
          filename: file.name,
        });
        observer.complete();
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    return { valid: true };
  }
}

