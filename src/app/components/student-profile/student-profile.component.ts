import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import html2canvas from 'html2canvas';

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  fatherName: string;
  lastName: string;
  email: string;
  departmentName: string;
  enrollmentYear: number;
  phone: string;
  address?: string;
  nationalId?: string;
  placeOfBirth?: string;
  gender?: string;
  dateOfBirth?: string;
  currentAddress?: string;
  country?: string;
  city?: string;
  postalCode?: string;
  faculty?: string;
  program?: string;
  modeOfStudy?: string;
  academicStatus?: string;
  guardianFullName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  profilePictureUrl?: string;
}

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  description: string;
  isVerified: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.css']
})
export class StudentProfileComponent implements OnInit {
  student: Student | null = null;
  documents: Document[] = [];
  loading = true;
  error = '';

  activeTab = 'info';
  showIdCardModal = false;
  frontCardImage: string | null = null;
  renderingCard = false;
  today: string = new Date().toISOString().split('T')[0];

  selectedFile: File | null = null;
  documentType = '';
  documentDescription = '';
  uploadMessage = '';
  uploadError = '';
  uploading = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadStudent(+id);
      this.loadDocuments(+id);
    } else {
      this.error = 'No student ID provided';
      this.loading = false;
    }
  }

  loadStudent(id: number) {
    this.api.get(`students/${id}`).subscribe({
      next: (data: any) => {
        this.student = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = `Failed to load student: ${err.status} - ${err.statusText}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDocuments(studentId: number) {
    this.api.get(`documents/student/${studentId}`).subscribe({
      next: (data: any) => {
        this.documents = data.content || data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading documents:', err)
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.uploadMessage = '';
      this.uploadError = '';
    }
  }

  uploadDocument() {
    if (!this.selectedFile) {
      this.uploadError = 'Please select a file';
      return;
    }
    if (!this.student) return;

    this.uploading = true;
    this.uploadMessage = '';
    this.uploadError = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    let fullDescription = '';
    if (this.documentType) {
      fullDescription = this.documentType;
      if (this.documentDescription) fullDescription += ': ' + this.documentDescription;
    } else {
      fullDescription = this.documentDescription;
    }
    formData.append('description', fullDescription);

    this.api.postFormData(`documents/upload/${this.student.id}`, formData).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadMessage = 'Document uploaded successfully!';
        setTimeout(() => {
          if (this.uploadMessage === 'Document uploaded successfully!') {
            this.uploadMessage = '';
          }
        }, 3000);
        this.selectedFile = null;
        this.documentType = '';
        this.documentDescription = '';
        this.loadDocuments(this.student!.id);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.uploading = false;
        this.uploadError = err.error?.error || err.message || 'Upload failed';
        setTimeout(() => {
          this.uploadError = '';
        }, 3000);
        this.cdr.detectChanges();
      }
    });
  }

  viewDocument(doc: Document) {
    this.api.getBlob(`documents/download/${doc.id}`).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('View error:', err)
    });
  }

  downloadDocument(doc: Document) {
    this.api.getBlob(`documents/download/${doc.id}`).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Download error:', err)
    });
  }

  deleteDocument(doc: Document) {
    if (confirm(`Delete "${doc.fileName}"?`)) {
      this.api.delete(`documents/${doc.id}`).subscribe({
        next: () => {
          this.loadDocuments(this.student!.id);
        },
        error: (err: any) => console.error('Delete error:', err)
      });
    }
  }

  async captureIdCardImage(): Promise<string | null> {
    const element = document.getElementById('id-card-template') as HTMLElement;
    if (!element) return null;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#f8fafc' });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture ID card image:', err);
      return null;
    }
  }

  async openIdCardModal() {
    this.showIdCardModal = true;
    this.frontCardImage = null;
    this.renderingCard = true;

    const imgData = await this.captureIdCardImage();
    if (imgData) {
      this.frontCardImage = imgData;
    } else {
      alert('Could not generate ID card image.');
    }
    this.renderingCard = false;
  }

  closeIdCardModal() {
    this.showIdCardModal = false;
    this.frontCardImage = null;
    this.renderingCard = false;
  }

  downloadIdCard() {
    const studentId = this.student?.id;
    if (!studentId) return;
    this.api.getBlob(`students/${studentId}/id-card`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student_id_card_${studentId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Download failed:', err);
        alert('Could not download ID card.');
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }


}
