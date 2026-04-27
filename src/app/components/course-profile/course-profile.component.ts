// src/app/components/course-profile/course-profile.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

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

@Component({
  selector: 'app-course-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './course-profile.component.html',
  styleUrls: ['./course-profile.component.css']
})
export class CourseProfileComponent implements OnInit {
  course: Course | null = null;
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
      this.loadCourse(+id);
    } else {
      this.error = 'No course ID provided';
      this.loading = false;
    }
  }

  loadCourse(id: number) {
    this.api.get(`courses/${id}`).subscribe({
      next: (data: any) => {
        this.course = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = `Failed to load course: ${err.status} - ${err.statusText}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
