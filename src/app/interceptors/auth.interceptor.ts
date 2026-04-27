import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding token for login and refresh endpoints
    if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
      return next.handle(req);
    }

    const token = this.authService.getAccessToken();
    console.log('[AuthInterceptor] Token for', req.url, ':', token ? 'present' : 'null');
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth/login')) {
          return this.handle401Error(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      const refreshToken = this.authService.getRefreshToken();
      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response: any) => {
            this.isRefreshing = false;
            localStorage.setItem('access_token', response.accessToken);
            const newRequest = request.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` }
            });
            return next.handle(newRequest);
          }),
          catchError((err) => {
            this.isRefreshing = false;
            this.authService.logout();
            this.router.navigate(['/login']);
            return throwError(() => err);
          })
        );
      }
      this.authService.logout();
      this.router.navigate(['/login']);
    }
    return throwError(() => new Error('Unauthorized'));
  }
}
