// src/app/components/course-list/course-list.component.ts
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CourseBulkImportComponent } from '../course-bulk-import/course-bulk-import.component';

interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  departmentId?: number;
  departmentName?: string;
  instructorId?: number;
  instructorName?: string;
  enrolledStudentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Instructor {
  id: number;
  fullName: string;
  instructorId: string;
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CourseBulkImportComponent],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  departments: Department[] = [];
  instructors: Instructor[] = [];
  loading = false;
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingCourseId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';
  showBulkImport = false;

  fieldErrors: { [key: string]: string } = {};

  newCourse = {
    name: '',
    description: '',
    credits: null as number | null,
    departmentId: null as number | null,
    instructorId: null as number | null
  };

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  get filteredCourses(): Course[] {
    if (!this.searchTerm.trim()) return this.courses;
    const term = this.searchTerm.toLowerCase().trim();
    return this.courses.filter(c =>
      c.code.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.departmentName?.toLowerCase().includes(term) ||
      c.instructorName?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    );
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const coursesReq = this.api.get('courses?page=0&size=100');
    const deptsReq = this.api.get('departments?page=0&size=100');
    const instructorsReq = this.api.get('instructors?page=0&size=100');

    forkJoin([coursesReq, deptsReq, instructorsReq]).subscribe({
      next: ([coursesRes, deptsRes, instructorsRes]: [any, any, any]) => {
        this.courses = coursesRes.content || coursesRes;
        this.departments = deptsRes.content || deptsRes;
        this.instructors = instructorsRes.content || instructorsRes;
        this.error = '';
        this.cdr.detectChanges();
        console.log('Courses loaded:', this.courses.length);
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
    this.api.getBlob('reports/courses/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses.xlsx';
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
    this.api.getBlob('reports/courses/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses.pdf';
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

  viewCourse(id: number) {
    this.router.navigate(['/courses', id]);
  }

  openBulkImport() {
    this.showBulkImport = true;
  }

  onBulkImportComplete(result: { created: number; errors: string[] }) {
    console.log('Bulk import result:', result);
    this.loadData();
    const { created, errors } = result;
    if (created > 0) {
      let message = `✅ Bulk import completed! ${created} course(s) added.`;
      if (errors && errors.length > 0) {
        message += `\n⚠️ ${errors.length} row(s) failed: ${errors.join(', ')}`;
      }
      this.showMessage(message, 'success');
    } else {
      this.showMessage(`❌ Bulk import failed:\n${errors.join('\n') || 'Unknown error'}`, 'error');
    }
    this.cdr.detectChanges();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  resetForm() {
    this.modalError = '';
    this.isEditing = false;
    this.editingCourseId = null;
    this.fieldErrors = {};
    this.newCourse = {
      name: '',
      description: '',
      credits: null,
      departmentId: null,
      instructorId: null
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

  editCourse(course: Course) {
    this.showForm = true;
    this.isEditing = true;
    this.editingCourseId = course.id;
    this.newCourse = {
      name: course.name,
      description: course.description || '',
      credits: course.credits || null,
      departmentId: course.departmentId || null,
      instructorId: course.instructorId || null
    };
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.newCourse.name) this.fieldErrors['name'] = 'Course name is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  addCourse() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newCourse };

    this.api.post('courses', payload).pipe(timeout(30000)).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Course registered!\nCode: ${response.code}\nName: ${response.name}`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to add course.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Registration failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateCourse() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newCourse };

    this.api.put(`courses/${this.editingCourseId}`, payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Course updated!\n${this.newCourse.name}`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.error?.error || err.error?.message || 'Failed to update course';
          this.modalError = errorMsg;
          this.showMessage(`❌ Update failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteCourse(id: number) {
    this.showConfirm('Are you sure you want to delete this course?', () => {
      this.api.delete(`courses/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Course deleted successfully!', 'success');
            this.cdr.detectChanges();
          }, 300);
        },
        error: (err) => {
          console.error('Delete error:', err);
          setTimeout(() => {
            this.showMessage('❌ Delete failed', 'error');
            this.cdr.detectChanges();
          }, 300);
        }
      });
    });
  }

  onSubmit() {
    if (this.isEditing) this.updateCourse();
    else this.addCourse();
  }
}
