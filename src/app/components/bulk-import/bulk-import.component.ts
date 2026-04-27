import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-bulk-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-import.component.html',
  styleUrls: ['./bulk-import.component.css']
})
export class BulkImportComponent {
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

    this.api.postFormData('students/bulk', formData).subscribe({
      next: (response: any) => {
        this.uploading = false;
        const created = response.created || 0;
        const errors = response.errors || [];
        this.importComplete.emit({ created, errors });
        this.closeModal();
      },
      error: (err) => {
        // only network errors, not business logic errors
        this.uploading = false;
        this.importComplete.emit({ created: 0, errors: [err.message] });
        this.closeModal();
      }
    });
  }

  closeModal() {
    this.close.emit();
  }
}
