import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { IdleService } from '../../services/idle.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="app-wrapper">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-header></app-header>
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>

    <!-- Idle Warning Modal -->
    <div class="custom-toast-overlay" *ngIf="showWarning">
      <div class="custom-toast">
        <div class="icon warning">⏰</div>
        <h2>SESSION TIMEOUT</h2>
        <p>You will be logged out in 30 seconds due to inactivity.</p>
        <p>Press "Stay Logged In" to continue working.</p>
        <div class="confirm-buttons">
          <button class="btn confirm-yes" (click)="stayLoggedIn()">Stay Logged In</button>
          <button class="btn confirm-no" (click)="logoutNow()">Logout Now</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-wrapper {
      display: flex;
      height: 100vh;
      width: 100%;
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow-y: auto;
    }

    .content-area {
      padding: 24px;
      background: #f5f6fa;
      min-height: calc(100vh - 70px);
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 0;
      }
    }

    /* Modal styles (ensure they match your existing popups) */
    .custom-toast-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-toast {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      min-width: 300px;
      max-width: 90%;
      padding: 16px 24px;
      text-align: center;
    }
    .icon.warning {
      font-size: 48px;
    }
    .confirm-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
    }
    .confirm-yes {
      background: #4f7d9c !important;
      color: white;
    }
    .confirm-no {
      background: #dc3545 !important;
      color: white;
    }
    .btn {
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  showWarning = false;

  constructor(private idleService: IdleService) {}

  ngOnInit() {
    this.idleService.setWarningCallback(() => this.showWarningModal());
    this.idleService.startWatching();
  }

  showWarningModal() {
    this.showWarning = true;
  }

  stayLoggedIn() {
    this.showWarning = false;
    this.idleService.cancelWarning();
  }

  logoutNow() {
    this.showWarning = false;
    this.idleService.stopWatching();
    // Force logout (clear session and redirect)
    this.idleService['logout'](); // calls private logout method; we can also duplicate logic here
  }
}
