import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface ClassSession {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  instructorId: number;
  instructorName: string;
  roomId: number | null;
  roomNumber: string | null;
  timeSlotId: number;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  semester: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Course {
  id: number;
  code: string;
  name: string;
}

interface Instructor {
  id: number;
  fullName: string;
  instructorId: string;
}

interface Room {
  id: number;
  roomNumber: string;
  capacity?: number;
}

// Static time slots (must match IDs in your database)
const STATIC_TIME_SLOTS = [
  { id: 1, startTime: '09:00', endTime: '10:30', dayOfWeek: 'Monday' },
  { id: 2, startTime: '11:00', endTime: '12:30', dayOfWeek: 'Monday' },
  { id: 3, startTime: '14:00', endTime: '15:30', dayOfWeek: 'Monday' },
];

@Component({
  selector: 'app-class-session-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-session-list.component.html',
  styleUrls: ['./class-session-list.component.css']
})
export class ClassSessionListComponent implements OnInit {
  sessions: ClassSession[] = [];
  courses: Course[] = [];
  instructors: Instructor[] = [];
  rooms: Room[] = [];
  timeSlots = STATIC_TIME_SLOTS; // use static list
  loading = false;
  error = '';

  showForm = false;
  isSubmitting = false;
  modalError = '';
  isEditing = false;
  editingSessionId: number | null = null;

  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' = 'success';

  showConfirmPopup = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  searchTerm = '';

  fieldErrors: { [key: string]: string } = {};

  newSession = {
    courseId: null as number | null,
    instructorId: null as number | null,
    roomId: null as number | null,
    timeSlotId: null as number | null,
    semester: ''
  };

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  get filteredSessions(): ClassSession[] {
    if (!this.searchTerm.trim()) return this.sessions;
    const term = this.searchTerm.toLowerCase().trim();
    return this.sessions.filter(s =>
      s.courseCode.toLowerCase().includes(term) ||
      s.courseName.toLowerCase().includes(term) ||
      s.instructorName.toLowerCase().includes(term) ||
      (s.roomNumber && s.roomNumber.toLowerCase().includes(term)) ||
      s.semester.toLowerCase().includes(term)
    );
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const sessionsReq = this.api.get('class-sessions?page=0&size=100').pipe(catchError(err => of({ content: [] })));
    const coursesReq = this.api.get('courses?page=0&size=100').pipe(catchError(err => of({ content: [] })));
    const instructorsReq = this.api.get('instructors?page=0&size=100').pipe(catchError(err => of({ content: [] })));
    const roomsReq = this.api.get('rooms?page=0&size=100').pipe(catchError(err => of({ content: [] })));

    forkJoin([sessionsReq, coursesReq, instructorsReq, roomsReq]).subscribe({
      next: ([sessRes, coursesRes, instructorsRes, roomsRes]: [any, any, any, any]) => {
        this.sessions = sessRes.content || sessRes || [];
        this.courses = coursesRes.content || coursesRes || [];
        this.instructors = instructorsRes.content || instructorsRes || [];
        this.rooms = roomsRes.content || roomsRes || [];
        this.error = '';
        this.cdr.detectChanges();
        console.log('Class sessions loaded:', this.sessions.length);
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
    this.api.getBlob('reports/class-sessions/excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'class_sessions.xlsx';
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
    this.api.getBlob('reports/class-sessions/pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'class_sessions.pdf';
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
    this.editingSessionId = null;
    this.fieldErrors = {};
    this.newSession = {
      courseId: null,
      instructorId: null,
      roomId: null,
      timeSlotId: null,
      semester: ''
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

  editSession(session: ClassSession) {
    this.showForm = true;
    this.isEditing = true;
    this.editingSessionId = session.id;
    this.newSession = {
      courseId: session.courseId,
      instructorId: session.instructorId,
      roomId: session.roomId,
      timeSlotId: session.timeSlotId,
      semester: session.semester
    };
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    if (!this.newSession.courseId) this.fieldErrors['courseId'] = 'Course is required';
    if (!this.newSession.instructorId) this.fieldErrors['instructorId'] = 'Instructor is required';
    if (!this.newSession.timeSlotId) this.fieldErrors['timeSlotId'] = 'Time slot is required';
    if (!this.newSession.semester) this.fieldErrors['semester'] = 'Semester is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.modalError = 'Please correct the errors below.';
      isValid = false;
    } else {
      this.modalError = '';
    }
    return isValid;
  }

  addSession() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newSession };

    this.api.post('class-sessions', payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Class session created successfully!`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.name === 'TimeoutError' ? 'Request timed out.' : (err.error?.error || err.error?.message || err.message || 'Failed to create class session.');
          this.modalError = errorMsg;
          this.showMessage(`❌ Creation failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateSession() {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.modalError = '';
    this.fieldErrors = {};
    this.cdr.detectChanges();

    const payload = { ...this.newSession };

    this.api.put(`class-sessions/${this.editingSessionId}`, payload).pipe(timeout(30000)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.resetForm();
          this.showForm = false;
          this.loadData();
          this.showMessage(`✅ Class session updated!`, 'success');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          let errorMsg = err.error?.error || err.error?.message || 'Failed to update class session';
          this.modalError = errorMsg;
          this.showMessage(`❌ Update failed:\n${errorMsg}`, 'error');
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteSession(id: number) {
    this.showConfirm('Are you sure you want to delete this class session?', () => {
      this.api.delete(`class-sessions/${id}`).subscribe({
        next: () => {
          this.loadData();
          setTimeout(() => {
            this.showMessage('✅ Class session deleted!', 'success');
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
    if (this.isEditing) this.updateSession();
    else this.addSession();
  }
}
