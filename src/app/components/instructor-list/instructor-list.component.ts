// src/app/components/instructor-list/instructor-list.component.ts
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { InstructorBulkImportComponent } from '../instructor-bulk-import/instructor-bulk-import.component';

interface Instructor {
  id: number;
  instructorId: string;
  userId?: number;
  fullName: string;
  email: string;
  departmentId: number;
  departmentName: string;
  office: string;
  phone: string;
  hireDate: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

@Component({
  selector: 'app-instructor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InstructorBulkImportComponent],
  templateUrl: './instructor-list.component.html',
  styleUrls: ['./instructor-list.component.css']
})
export class InstructorListComponent implements OnInit {
  instructors: Instructor[] = [];
  departments: Department[] = [];
  loading = false;  // Start with false – no spinner
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingInstructorId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';
  showBulkImport = false;

  titles = ['Mr.', 'Ms.', 'Dr.', 'Prof.', 'Mrs.'];

  fieldErrors: { [key: string]: string } = {};

  newInstructor = {
    fullName: '',
    email: '',
    password: '',
    departmentId: null as number | null,
    office: '',
    phone: '',
    hireDate: '',
    title: ''
  };

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  get filteredInstructors(): Instructor[] {
    if (!this.searchTerm.trim()) return this.instructors;
    const term = this.searchTerm.toLowerCase().trim();
    return this.instructors.filter(i =>
      i.fullName.toLowerCase().includes(term) ||
      i.email.toLowerCase().includes(term) ||
      i.instructorId.toLowerCase().includes(term) ||
      i.departmentName.toLowerCase().includes(term) ||
      i.office.toLowerCase().includes(term) ||
      i.phone.includes(term)
    );
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // No loading spinner – just fetch and update
    const instructorsReq = this.api.get('instructors?page=0&size=100');
    const deptsReq = this.api.get('departments?page=0&size=100');

    forkJoin([instructorsReq, deptsReq]).subscribe({
      next: ([instructorsRes, deptsRes]: [any, any]) => {
        this.instructors = instructorsRes.content || instructorsRes;
        this.departments = deptsRes.content || deptsRes;
        this.error = '';
        this.cdr.detectChanges();
        console.log('Instructors loaded:', this.instructors.length);
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
    this.api.getBlob('reports/instructors/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'instructors.xlsx';
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
    this.api.getBlob('reports/instructors/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'instructors.pdf';
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

  viewInstructor(id: number) {
    this.router.navigate(['/instructors', id]);
  }

  openBulkImport() {
    this.showBulkImport = true;
  }

  onBulkImportComplete(result: { created: number; errors: string[] }) {
    this.loadData();
    const { created, errors } = result;
    if (created > 0) {
      let message = `✅ Bulk import completed! ${created} instructor(s) added.`;
      if (errors && errors.length > 0) {
        message += `\n⚠️ ${errors.length} row(s) failed: ${errors.join(', ')}`;
      }
      this.showMessage(message, 'success');
    } else {
      this.showMessage(`❌ Bulk import failed:\n${errors.join('\n') || 'Unknown error'}`, 'error');
    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  resetForm() {
    this.modalError = '';
    this.isEditing = false;
    this.editingInstructorId = null;
    this.fieldErrors = {};
    this.newInstructor = {
      fullName: '',
      email: '',
      password: '',
      departmentId: null,
      office: '',
      phone: '',
      hireDate: '',
      title: ''
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

  editInstructor(instructor: Instructor) {
    this.showForm = true;
    this.isEditing = true;
    this.editingInstructorId = instructor.id;
    this.newInstructor = {
      fullName: instructor.fullName,
      email: instructor.email,
      password: '',
      departmentId: instructor.departmentId,
      office: instructor.office,
      phone: instructor.phone,
      hireDate: instructor.hireDate ? instructor.hireDate.substring(0, 10) : '',
      title: instructor.title
    };
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.newInstructor.fullName) this.fieldErrors['fullName'] = 'Full name is required';
    if (!this.newInstructor.email) this.fieldErrors['email'] = 'Email is required';
    if (!this.isEditing && !this.newInstructor.password) this.fieldErrors['password'] = 'Password is required for new instructor';
    if (!this.newInstructor.departmentId) this.fieldErrors['departmentId'] = 'Department is required';
    if (!this.newInstructor.office) this.fieldErrors['office'] = 'Office is required';
    if (!this.newInstructor.phone) this.fieldErrors['phone'] = 'Phone is required';
    if (!this.newInstructor.hireDate) this.fieldErrors['hireDate'] = 'Hire date is required';
    if (!this.newInstructor.title) this.fieldErrors['title'] = 'Title is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  addInstructor() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newInstructor };
    if (payload.hireDate) payload.hireDate = new Date(payload.hireDate).toISOString();

    this.api.post('instructors', payload).pipe(timeout(30000)).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Instructor registered!\nID: ${response.instructorId}\nName: ${response.fullName}`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to add instructor.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Registration failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateInstructor() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newInstructor };
    if (payload.hireDate) payload.hireDate = new Date(payload.hireDate).toISOString();
    delete (payload as any).password;

    this.api.put(`instructors/${this.editingInstructorId}`, payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Instructor updated!\n${this.newInstructor.fullName}`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.error?.error || err.error?.message || 'Failed to update instructor';
          this.modalError = errorMsg;
          this.showMessage(`❌ Update failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteInstructor(id: number) {
    this.showConfirm('Are you sure you want to delete this instructor?', () => {
      this.api.delete(`instructors/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Instructor deleted successfully!', 'success');
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
    if (this.isEditing) this.updateInstructor();
    else this.addInstructor();
  }
}
