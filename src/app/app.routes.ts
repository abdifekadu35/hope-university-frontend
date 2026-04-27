import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/auth/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentListComponent } from './components/student-list/student-list.component';
import { StudentProfileComponent } from './components/student-profile/student-profile.component';
import { InstructorListComponent } from './components/instructor-list/instructor-list.component';
import { InstructorProfileComponent } from './components/instructor-profile/instructor-profile.component';   // ADD THIS
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseProfileComponent } from './components/course-profile/course-profile.component';
import { EnrollmentListComponent } from './components/enrollment-list/enrollment-list.component';
import { AttendanceListComponent } from './components/attendance-list/attendance-list.component';
import { ClassSessionListComponent } from './components/class-session-list/class-session-list.component';

// ... other commented imports ...

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'students', component: StudentListComponent },
      { path: 'students/:id', component: StudentProfileComponent },
      { path: 'teachers', component: InstructorListComponent },
      { path: 'instructors/:id', component: InstructorProfileComponent },   // ADD THIS LINE
      { path: 'courses', component: CourseListComponent },
      { path: 'courses/:id', component: CourseProfileComponent },
      { path: 'enrollments', component: EnrollmentListComponent },
      { path: 'attendance', component: AttendanceListComponent },
      { path: 'class-sessions', component: ClassSessionListComponent },

      // ... other routes
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
