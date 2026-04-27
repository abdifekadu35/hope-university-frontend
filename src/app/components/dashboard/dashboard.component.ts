import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats = {
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalRevenueCollected: 0,
    totalBooks: 0,
    activeEnrollments: 0,
    attendancePresentLast30Days: 0,
    attendanceAbsentLast30Days: 0
  };
  loading = false;
  error = '';
  userEmail = ''; // public property for welcome message

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userEmail = this.authService.getUserEmail() || 'User';
    this.waitForTokenAndLoad(0);
  }

  private waitForTokenAndLoad(retryCount: number) {
    const token = this.authService.getAccessToken();
    if (token) {
      this.loadDashboardData();
    } else if (retryCount < 50) {
      setTimeout(() => this.waitForTokenAndLoad(retryCount + 1), 100);
    }
  }

  private loadDashboardData() {
    this.loading = true;
    this.api.get<any>('dashboard/stats').subscribe({
      next: (data) => {
        this.stats = {
          totalStudents: data.totalStudents ?? 0,
          totalInstructors: data.totalInstructors ?? 0,
          totalCourses: data.totalCourses ?? 0,
          totalRevenueCollected: data.totalRevenueCollected ?? 0,
          totalBooks: data.totalBooks ?? 0,
          activeEnrollments: data.activeEnrollments ?? 0,
          attendancePresentLast30Days: data.attendancePresentLast30Days ?? 0,
          attendanceAbsentLast30Days: data.attendanceAbsentLast30Days ?? 0
        };
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderAttendanceChart(), 100);
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load data';
        this.loading = false;
      }
    });
  }

  private renderAttendanceChart() {
    const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!canvas) return;
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          label: 'Last 30 Days',
          data: [this.stats.attendancePresentLast30Days, this.stats.attendanceAbsentLast30Days],
          backgroundColor: ['#4caf50', '#f44336'],
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }

  retryLoad() {
    this.waitForTokenAndLoad(0);
  }
}
