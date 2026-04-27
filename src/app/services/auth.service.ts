import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  role: string;
  mustChangePassword?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap(response => {
        this.setSession(response);
        // Pre‑warm both student and instructor endpoints
        const authHeader = { 'Authorization': `Bearer ${response.accessToken}` };
        fetch(`${this.apiUrl}/students?page=0&size=1`, { headers: authHeader }).catch(() => {});
        fetch(`${this.apiUrl}/instructors?page=0&size=1`, { headers: authHeader }).catch(() => {});
      }));
  }

  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${refreshToken}` }
    }).pipe(tap((response: any) => {
      if (response.accessToken) {
        localStorage.setItem('access_token', response.accessToken);
      }
    }));
  }

  private setSession(authResult: LoginResponse) {
    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('refresh_token', authResult.refreshToken);
    localStorage.setItem('user_role', authResult.role);
    localStorage.setItem('user_email', authResult.email);
    localStorage.setItem('user_id', authResult.userId.toString());
    if (authResult.mustChangePassword !== undefined) {
      localStorage.setItem('must_change_password', String(authResult.mustChangePassword));
    }
  }

  logout() {
    localStorage.clear();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  getUserEmail(): string | null {
    return localStorage.getItem('user_email');
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return token !== null;
  }

  mustChangePassword(): boolean {
    return localStorage.getItem('must_change_password') === 'true';
  }
}
