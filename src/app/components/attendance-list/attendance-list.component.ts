import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface Attendance {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  classSessionId: number;
  courseCode: string;
  courseName: string;
  instructorName: string;
  status: string;
  date: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Student {
  id: number;
  fullName: string;
  studentId: string;
  email: string;
}

interface ClassSession {
  id: number;
  courseCode: string;
  courseName: string;
  date?: string;
  timeSlot?: string;
  room?: string;
}

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.css']
})
export class AttendanceListComponent implements OnInit {
  attendances: Attendance[] = [];
  students: Student[] = [];
  classSessions: ClassSession[] = [];
  loading = false;
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingAttendanceId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';

  fieldErrors: { [key: string]: string } = {};

  newAttendance = {
    studentId: null as number | null,
    classSessionId: null as number | null,
    status: 'PRESENT',
    date: new Date().toISOString().split('T')[0],
    remarks: ''
  };

  statusOptions = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  get filteredAttendances(): Attendance[] {
    if (!this.searchTerm.trim()) return this.attendances;
    const term = this.searchTerm.toLowerCase().trim();
    return this.attendances.filter(a =>
      a.studentName.toLowerCase().includes(term) ||
      a.studentEmail.toLowerCase().includes(term) ||
      a.courseCode.toLowerCase().includes(term) ||
      a.courseName.toLowerCase().includes(term) ||
      a.status.toLowerCase().includes(term)
    );
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const attendancesReq = this.api.get('attendance?page=0&size=100');
    const studentsReq = this.api.get('students?page=0&size=100');
    const sessionsReq = this.api.get('class-sessions?page=0&size=100');

    forkJoin([attendancesReq, studentsReq, sessionsReq]).subscribe({
      next: ([attRes, studRes, sessRes]: [any, any, any]) => {
        this.attendances = attRes.content || attRes;
        let studentsData = studRes.content || studRes;
        this.students = studentsData.map((s: any) => ({
          id: s.id,
          fullName: s.firstName + ' ' + s.fatherName + ' ' + s.lastName,
          studentId: s.studentId,
          email: s.email
        }));
        let sessionsData = sessRes.content || sessRes;
        this.classSessions = sessionsData.map((cs: any) => ({
          id: cs.id,
          courseCode: cs.courseCode,
          courseName: cs.courseName,
          date: cs.date,
          timeSlot: cs.timeSlot,
          room: cs.room
        }));
        this.error = '';
        this.cdr.detectChanges();
        console.log('Attendance loaded:', this.attendances.length);
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
    this.api.getBlob('reports/attendance/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance.xlsx';
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
    this.api.getBlob('reports/attendance/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance.pdf';
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
    this.editingAttendanceId = null;
    this.fieldErrors = {};
    this.newAttendance = {
      studentId: null,
      classSessionId: null,
      status: 'PRESENT',
      date: new Date().toISOString().split('T')[0],
      remarks: ''
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

    if (!this.newAttendance.studentId) this.fieldErrors['studentId'] = 'Student is required';
    if (!this.newAttendance.classSessionId) this.fieldErrors['classSessionId'] = 'Class session is required';
    if (!this.newAttendance.status) this.fieldErrors['status'] = 'Status is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  addAttendance() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newAttendance };
    // Send date as YYYY-MM-DD (already in that format)
    this.api.post('attendance', payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Attendance marked successfully!`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to mark attendance.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Attendance marking failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteAttendance(id: number) {
    this.showConfirm('Are you sure you want to delete this attendance record?', () => {
      this.api.delete(`attendance/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Attendance record deleted!', 'success');
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

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PRESENT': return 'status-present';
      case 'ABSENT': return 'status-absent';
      case 'LATE': return 'status-late';
      case 'EXCUSED': return 'status-excused';
      default: return '';
    }
  }
}
