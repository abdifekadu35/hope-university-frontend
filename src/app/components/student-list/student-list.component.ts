// src/app/components/student-list/student-list.component.ts
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BulkImportComponent } from '../bulk-import/bulk-import.component';

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

interface Department {
  id: number;
  name: string;
  code: string;
}

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BulkImportComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  students: Student[] = [];
  departments: Department[] = [];
  loading = false; // Start with false – no spinner
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingStudentId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';
  showBulkImport = false;

  faculties = [
    'Faculty of Computing',
    'Faculty of Engineering',
    'Faculty of Business',
    'Faculty of Science',
    'Faculty of Humanities',
    'Faculty of Law'
  ];
  modesOfStudy = ['REGULAR', 'EXTENSION', 'DISTANCE'];
  academicStatuses = ['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'WITHDRAWN'];
  genders = ['MALE', 'FEMALE', 'OTHER'];

  fieldErrors: { [key: string]: string } = {};

  countryCodes = [
    { code: '+251', name: 'Ethiopia' },
    { code: '+1', name: 'USA' },
    { code: '+44', name: 'UK' },
    { code: '+91', name: 'India' },
    { code: '+86', name: 'China' }
  ];
  selectedCountryCode = '+251';
  localPhoneNumber = '';
  minAge = 18;

  newStudent = {
    firstName: '',
    fatherName: '',
    lastName: '',
    email: '',
    departmentId: null as number | null,
    enrollmentYear: new Date().getFullYear(),
    phone: '+251',
    address: '',
    dateOfBirth: '',
    profilePictureUrl: '',
    nationalId: '',
    placeOfBirth: '',
    gender: '',
    currentAddress: '',
    country: '',
    city: '',
    postalCode: '',
    faculty: '',
    program: '',
    modeOfStudy: '',
    academicStatus: '',
    guardianFullName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: ''
  };

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  get filteredStudents(): Student[] {
    if (!this.searchTerm.trim()) return this.students;
    const term = this.searchTerm.toLowerCase().trim();
    return this.students.filter(s => {
      const fullName = `${s.firstName} ${s.fatherName} ${s.lastName}`.toLowerCase();
      return fullName.includes(term) ||
        s.firstName?.toLowerCase().includes(term) ||
        s.fatherName?.toLowerCase().includes(term) ||
        s.lastName?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.studentId?.toLowerCase().includes(term) ||
        s.departmentName?.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term) ||
        s.nationalId?.toLowerCase().includes(term) ||
        s.placeOfBirth?.toLowerCase().includes(term) ||
        s.currentAddress?.toLowerCase().includes(term) ||
        s.faculty?.toLowerCase().includes(term) ||
        s.program?.toLowerCase().includes(term);
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const studentsReq = this.api.get('students?page=0&size=100');
    const deptsReq = this.api.get('departments?page=0&size=100');

    forkJoin([studentsReq, deptsReq]).subscribe({
      next: ([studentsRes, deptsRes]: [any, any]) => {
        this.students = studentsRes.content || studentsRes;
        this.departments = deptsRes.content || deptsRes;
        this.error = '';
        this.cdr.detectChanges();
        console.log('Students loaded:', this.students.length);
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
    this.api.getBlob('reports/students/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.xlsx';
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
    this.api.getBlob('reports/students/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.pdf';
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

  viewStudent(id: number) {
    this.router.navigate(['/students', id]);
  }

  openBulkImport() {
    this.showBulkImport = true;
  }

  onBulkImportComplete(result: { created: number; errors: string[] }) {
    this.loadData();
    const { created, errors } = result;
    if (created > 0) {
      let message = `✅ Bulk import completed! ${created} student(s) added.`;
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
    this.editingStudentId = null;
    this.fieldErrors = {};
    this.selectedCountryCode = '+251';
    this.localPhoneNumber = '';
    this.newStudent = {
      firstName: '',
      fatherName: '',
      lastName: '',
      email: '',
      departmentId: null,
      enrollmentYear: new Date().getFullYear(),
      phone: '+251',
      address: '',
      dateOfBirth: '',
      profilePictureUrl: '',
      nationalId: '',
      placeOfBirth: '',
      gender: '',
      currentAddress: '',
      country: '',
      city: '',
      postalCode: '',
      faculty: '',
      program: '',
      modeOfStudy: '',
      academicStatus: '',
      guardianFullName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianEmail: ''
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.newStudent.profilePictureUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  editStudent(student: Student) {
    this.showForm = true;
    this.isEditing = true;
    this.editingStudentId = student.id;
    this.newStudent = {
      firstName: student.firstName,
      fatherName: student.fatherName,
      lastName: student.lastName,
      email: student.email,
      departmentId: null,
      enrollmentYear: student.enrollmentYear,
      phone: student.phone || '+251',
      address: student.address || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.substring(0,10) : '',
      profilePictureUrl: student.profilePictureUrl || '',
      nationalId: student.nationalId || '',
      placeOfBirth: student.placeOfBirth || '',
      gender: student.gender || '',
      currentAddress: student.currentAddress || '',
      country: student.country || '',
      city: student.city || '',
      postalCode: student.postalCode || '',
      faculty: student.faculty || '',
      program: student.program || '',
      modeOfStudy: student.modeOfStudy || '',
      academicStatus: student.academicStatus || '',
      guardianFullName: student.guardianFullName || '',
      guardianRelationship: student.guardianRelationship || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || ''
    };
    const dept = this.departments.find(d => d.name === student.departmentName);
    if (dept) this.newStudent.departmentId = dept.id;

    const phone = student.phone || '+251';
    let matchedCode = this.countryCodes.find(c => phone.startsWith(c.code));
    if (matchedCode) {
      this.selectedCountryCode = matchedCode.code;
      this.localPhoneNumber = phone.substring(matchedCode.code.length);
    } else {
      this.selectedCountryCode = '+251';
      this.localPhoneNumber = phone;
    }
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.newStudent.firstName) this.fieldErrors['firstName'] = 'First name is required';
    if (!this.newStudent.fatherName) this.fieldErrors['fatherName'] = 'Father name is required';
    if (!this.newStudent.lastName) this.fieldErrors['lastName'] = 'Last name is required';
    if (!this.newStudent.email) this.fieldErrors['email'] = 'Email is required';
    if (!this.newStudent.departmentId) this.fieldErrors['departmentId'] = 'Department is required';
    if (!this.localPhoneNumber) this.fieldErrors['phone'] = 'Phone number is required';
    if (!this.newStudent.placeOfBirth) this.fieldErrors['placeOfBirth'] = 'Place of birth is required';
    if (!this.newStudent.gender) this.fieldErrors['gender'] = 'Gender is required';
    if (!this.newStudent.dateOfBirth) this.fieldErrors['dateOfBirth'] = 'Date of birth is required';
    else {
      const birthDate = new Date(this.newStudent.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < this.minAge) this.fieldErrors['dateOfBirth'] = `Student must be at least ${this.minAge} years old`;
    }
    if (!this.newStudent.currentAddress) this.fieldErrors['currentAddress'] = 'Current address is required';
    if (!this.newStudent.country) this.fieldErrors['country'] = 'Country is required';
    if (!this.newStudent.city) this.fieldErrors['city'] = 'City is required';
    if (!this.newStudent.faculty) this.fieldErrors['faculty'] = 'Faculty is required';
    if (!this.newStudent.program) this.fieldErrors['program'] = 'Program is required';
    if (!this.newStudent.modeOfStudy) this.fieldErrors['modeOfStudy'] = 'Mode of study is required';
    if (!this.newStudent.academicStatus) this.fieldErrors['academicStatus'] = 'Academic status is required';
    if (!this.newStudent.guardianFullName) this.fieldErrors['guardianFullName'] = 'Guardian full name is required';
    if (!this.newStudent.guardianRelationship) this.fieldErrors['guardianRelationship'] = 'Guardian relationship is required';
    if (!this.newStudent.guardianPhone) this.fieldErrors['guardianPhone'] = 'Guardian phone is required';
    if (!this.newStudent.enrollmentYear) this.fieldErrors['enrollmentYear'] = 'Enrollment year is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  getFullPhoneNumber(): string {
    return this.selectedCountryCode + this.localPhoneNumber;
  }

  addStudent() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newStudent };
    if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
    payload.phone = this.getFullPhoneNumber();
    const { profilePictureUrl, ...payloadWithoutPhoto } = payload;

    this.api.post('students', payloadWithoutPhoto).pipe(timeout(30000)).subscribe({
      next: (response: any) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Student registered!\nID: ${response.studentId}\nName: ${response.firstName} ${response.fatherName} ${response.lastName}`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to add student.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Registration failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateStudent() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newStudent };
    if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
    payload.phone = this.getFullPhoneNumber();
    const { profilePictureUrl, ...payloadWithoutPhoto } = payload;

    this.api.put(`students/${this.editingStudentId}`, payloadWithoutPhoto).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          const fullName = `${this.newStudent.firstName} ${this.newStudent.fatherName} ${this.newStudent.lastName}`;
          this.showMessage(`✅ Student updated!\n${fullName} (ID: ${this.editingStudentId})`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.error?.error || err.error?.message || 'Failed to update student';
          this.modalError = errorMsg;
          this.showMessage(`❌ Update failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteStudent(id: number) {
    this.showConfirm('Are you sure you want to delete this student?', () => {
      this.api.delete(`students/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Student deleted successfully!', 'success');
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
    if (this.isEditing) this.updateStudent();
    else this.addStudent();
  }
}
