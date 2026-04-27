// src/app/components/enrollment-list/enrollment-list.component.ts
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface Enrollment {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  status: string;
  enrollmentDate: string;
  grade: number | null;
  letterGrade: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface Student {
  id: number;
  fullName: string;
  studentId: string;
  email: string;
}

interface Course {
  id: number;
  code: string;
  name: string;
}

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-list.component.html',
  styleUrls: ['./enrollment-list.component.css']
})
export class EnrollmentListComponent implements OnInit {
  enrollments: Enrollment[] = [];
  students: Student[] = [];
  courses: Course[] = [];
  loading = false;
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingEnrollmentId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';

  fieldErrors: { [key: string]: string } = {};

  newEnrollment = {
    studentId: null as number | null,
    courseId: null as number | null
  };

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  get filteredEnrollments(): Enrollment[] {
    if (!this.searchTerm.trim()) return this.enrollments;
    const term = this.searchTerm.toLowerCase().trim();
    return this.enrollments.filter(e =>
      e.studentName.toLowerCase().includes(term) ||
      e.studentEmail.toLowerCase().includes(term) ||
      e.courseCode.toLowerCase().includes(term) ||
      e.courseName.toLowerCase().includes(term) ||
      (e.status && e.status.toLowerCase().includes(term))
    );
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const enrollmentsReq = this.api.get('enrollments?page=0&size=100');
    const studentsReq = this.api.get('students?page=0&size=100');
    const coursesReq = this.api.get('courses?page=0&size=100');

    forkJoin([enrollmentsReq, studentsReq, coursesReq]).subscribe({
      next: ([enrollmentsRes, studentsRes, coursesRes]: [any, any, any]) => {
        this.enrollments = enrollmentsRes.content || enrollmentsRes;
        // For students and courses, we need to map to our interfaces
        let studentsData = studentsRes.content || studentsRes;
        let coursesData = coursesRes.content || coursesRes;
        this.students = studentsData.map((s: any) => ({
          id: s.id,
          fullName: s.firstName + ' ' + s.fatherName + ' ' + s.lastName,
          studentId: s.studentId,
          email: s.email
        }));
        this.courses = coursesData.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name
        }));
        this.error = '';
        this.cdr.detectChanges();
        console.log('Enrollments loaded:', this.enrollments.length);
      },
      error: (err) => {
        console.error('Load error:', err);
        this.error = `Error: ${err.status} - ${err.statusText}`;
        this.showMessage(this.error, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  exportToExcel() {
    this.api.getBlob('reports/enrollments/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enrollments.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Export error:', err);
        this.showMessage('Failed to export to Excel', 'error');
      }
    });
  }

  exportToPDF() {
    this.api.getBlob('reports/enrollments/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enrollments.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Export error:', err);
        this.showMessage('Failed to export to PDF', 'error');
      }
    });
  }

  retryLoad() {
    this.loadData();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  resetForm() {
    this.modalError = '';
    this.isEditing = false;
    this.editingEnrollmentId = null;
    this.fieldErrors = {};
    this.newEnrollment = {
      studentId: null,
      courseId: null
    };
    this.cdr.detectChanges();
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    this.cdr.detectChanges();
  }

  closeNotification() {
    this.showNotification = false;
    this.cdr.detectChanges();
  }

  showConfirm(message: string, onConfirm: () => void) {
    this.confirmMessage = message;
    this.confirmCallback = onConfirm;
    this.showConfirmPopup = true;
    this.cdr.detectChanges();
  }

  closeConfirmPopup(confirmed: boolean) {
    this.showConfirmPopup = false;
    if (confirmed && this.confirmCallback) {
      this.confirmCallback();
    }
    this.confirmCallback = null;
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.newEnrollment.studentId) this.fieldErrors['studentId'] = 'Student is required';
    if (!this.newEnrollment.courseId) this.fieldErrors['courseId'] = 'Course is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  addEnrollment() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newEnrollment };

    this.api.post('enrollments', payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Enrollment completed!`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to enroll.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Enrollment failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteEnrollment(id: number) {
    this.showConfirm('Are you sure you want to drop this enrollment?', () => {
      this.api.delete(`enrollments/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Enrollment dropped successfully!', 'success');
            this.cdr.detectChanges();
          }, 300);
        },
        error: (err) => {
          console.error('Delete error:', err);
          setTimeout(() => {
            this.showMessage('❌ Failed to drop enrollment', 'error');
            this.cdr.detectChanges();
          }, 300);
        }
      });
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ENROLLED': return 'status-enrolled';
      case 'DROPPED': return 'status-dropped';
      case 'COMPLETED': return 'status-completed';
      case 'WITHDRAWN': return 'status-withdrawn';
      default: return '';
    }
  }
}
