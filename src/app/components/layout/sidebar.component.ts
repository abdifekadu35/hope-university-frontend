import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="logo">
        <h2>Hope University</h2>
      </div>
      <ul class="menu">
        <li *ngFor="let item of visibleMenuItems"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{exact: true}">
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
        </li>
      </ul>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: #0d2b4d;
      color: white;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      overflow-y: auto;
      z-index: 100;
    }

    .logo {
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 20px;
    }

    .logo h2 {
      font-size: 20px;
      font-weight: 600;
      color: #ffcc00;
      margin: 0;
    }

    .menu {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .menu li {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: rgba(255,255,255,0.8);
    }

    .menu li:hover {
      background: #1e3a5f;
      color: white;
    }

    .menu li.active {
      background: #1e3a5f;
      color: #ffcc00;
      border-left: 4px solid #ffcc00;
    }

    .icon {
      font-size: 20px;
      width: 24px;
    }

    .label {
      font-size: 14px;
    }
  `]
})
export class SidebarComponent implements OnInit {
  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT'] },
    { label: 'Students', route: '/students', icon: '👨‍🎓', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR'] },
    { label: 'Teachers', route: '/teachers', icon: '👩‍🏫', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR'] },
    { label: 'Courses', route: '/courses', icon: '📚', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR', 'TEACHER', 'STUDENT'] },
    { label: 'Enrollments', route: '/enrollments', icon: '📝', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR'] },
    { label: 'Attendance', route: '/attendance', icon: '✅', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'TEACHER'] },
    { label: 'Class Sessions', route: '/class-sessions', icon: '📅', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'REGISTRAR'] },
    { label: 'Exams', route: '/exams', icon: '📖', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'TEACHER', 'EXAM_OFFICER'] },
    { label: 'Fees', route: '/fees', icon: '💰', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'STUDENT', 'PARENT'] },
    { label: 'Library', route: '/library', icon: '📕', roles: ['SYSTEM_ADMIN', 'PRINCIPAL', 'LIBRARIAN', 'STUDENT'] },
    { label: 'Users', route: '/users', icon: '👥', roles: ['SYSTEM_ADMIN'] }
  ];

  visibleMenuItems: MenuItem[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const userRole = this.authService.getUserRole();
    this.visibleMenuItems = this.menuItems.filter(item =>
      item.roles.includes(userRole || '')
    );
  }
}
