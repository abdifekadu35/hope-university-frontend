import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getAuthHeaders() });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getAuthHeaders() });
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body, { headers: this.getAuthHeaders() });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getAuthHeaders() });
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, formData, { headers: this.getAuthHeaders() });
  }

  getBlob(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${endpoint}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  // ---------- Enrollments ----------
  getEnrollments(): Observable<any> {
    return this.get('enrollments?page=0&size=100');
  }
  createEnrollment(data: any): Observable<any> {
    return this.post('enrollments', data);
  }
  deleteEnrollment(id: number): Observable<any> {
    return this.delete(`enrollments/${id}`);
  }
  exportEnrollmentsExcel(): Observable<Blob> {
    return this.getBlob('reports/enrollments/excel');
  }
  exportEnrollmentsPdf(): Observable<Blob> {
    return this.getBlob('reports/enrollments/pdf');
  }

  // ---------- Attendance ----------
  getAttendance(): Observable<any> {
    return this.get('attendance?page=0&size=100');
  }
  getClassSessions(): Observable<any> {
    return this.get('class-sessions?page=0&size=100');
  }
  createAttendance(data: any): Observable<any> {
    return this.post('attendance', data);
  }
  deleteAttendance(id: number): Observable<any> {
    return this.delete(`attendance/${id}`);
  }
  exportAttendanceExcel(): Observable<Blob> {
    return this.getBlob('reports/attendance/excel');
  }
  exportAttendancePdf(): Observable<Blob> {
    return this.getBlob('reports/attendance/pdf');
  }

  // ---------- Class Sessions ----------
  createClassSession(data: any): Observable<any> {
    return this.post('class-sessions', data);
  }
  updateClassSession(id: number, data: any): Observable<any> {
    return this.put(`class-sessions/${id}`, data);
  }
  deleteClassSession(id: number): Observable<any> {
    return this.delete(`class-sessions/${id}`);
  }
  exportClassSessionsExcel(): Observable<Blob> {
    return this.getBlob('reports/class-sessions/excel');
  }
  exportClassSessionsPdf(): Observable<Blob> {
    return this.getBlob('reports/class-sessions/pdf');
  }

  // ---------- Rooms & Time Slots (for dropdowns) ----------
  getRooms(): Observable<any> {
    return this.get('rooms?page=0&size=100');
  }
  getTimeSlots(): Observable<any> {
    return this.get('time-slots?page=0&size=100');
  }
}
