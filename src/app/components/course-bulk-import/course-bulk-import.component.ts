// course-bulk-import.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-course-bulk-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-bulk-import.component.html',
  styleUrls: ['./course-bulk-import.component.css']
})
export class CourseBulkImportComponent {
  @Output() close = new EventEmitter<void>();
  @Output() importComplete = new EventEmitter<{ created: number; errors: string[] }>();

  selectedFile: File | null = null;
  uploading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private api: ApiService) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  upload() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }
    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.api.postFormData('courses/bulk', formData).subscribe({
      next: (response: any) => {
        this.uploading = false;
        // Expect response: { created: number, errors: string[] }
        const created = response.created || 0;
        const errors = response.errors || [];
        this.importComplete.emit({ created, errors });
        this.closeModal();
      },
      error: (err) => {
        console.error('Bulk import error:', err);
        this.uploading = false;
        let errorMsg = err.error?.message || err.message || 'Unknown error';
        // If backend returns errors array in response body:
        if (err.error && err.error.errors) {
          errorMsg = err.error.errors.join(', ');
        }
        this.importComplete.emit({ created: 0, errors: [errorMsg] });
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.close.emit();
  }
}
