import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="welcome">
        <h3>Welcome to Hope University Management System</h3>
      </div>
      <div class="user-info">
        <span class="user-email">{{ userEmail }}</span>
        <button class="logout-btn" (click)="logout()">Logout</button>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      background: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0;
      z-index: 99;
    }

    .welcome h3 {
      font-size: 18px;
      color: #2c3e50;
      margin: 0;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-email {
      color: #4f7d9c;
      font-size: 14px;
    }

    .logout-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s ease;
    }

    .logout-btn:hover {
      background: #c82333;
    }
  `]
})
export class HeaderComponent {
  userEmail: string;

  constructor(private authService: AuthService, private router: Router) {
    this.userEmail = this.authService.getUserEmail() || 'User';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
