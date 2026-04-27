import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

interface Department {
  id: number;
  name: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private departmentsSubject = new BehaviorSubject<Department[]>([]);
  public departments$ = this.departmentsSubject.asObservable();
  private departmentsLoaded = false;

  constructor(private api: ApiService) {}

  loadDepartments(): void {
    if (this.departmentsLoaded) {
      return;
    }

    this.api.get('departments?page=0&size=100').subscribe({
      next: (response: any) => {
        const departments = response.content || response;
        this.departmentsSubject.next(departments);
        this.departmentsLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load departments:', err);
      }
    });
  }

  getDepartments(): Observable<Department[]> {
    return this.departments$;
  }
}
