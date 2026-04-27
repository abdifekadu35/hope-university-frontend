// src/app/components/instructor-profile/instructor-profile.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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

@Component({
  selector: 'app-instructor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './instructor-profile.component.html',
  styleUrls: ['./instructor-profile.component.css']
})
export class InstructorProfileComponent implements OnInit {
  instructor: Instructor | null = null;
  loading = true;
  error = '';
  activeTab = 'info';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInstructor(+id);
    } else {
      this.error = 'No instructor ID provided';
      this.loading = false;
    }
  }

  loadInstructor(id: number) {
    this.api.get(`instructors/${id}`).subscribe({
      next: (data: any) => {
        this.instructor = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = `Failed to load instructor: ${err.status} - ${err.statusText}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
