import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private idleTimer: any;
  private warningTimer: any;
  private readonly IDLE_LIMIT = 1 * 60 * 1000;      // 1 minute for testing
  private readonly WARNING_DURATION = 30 * 1000;

  private warningShown = false;
  private warningCallback: (() => void) | null = null;

  constructor(
    private zone: NgZone,
    private router: Router,
    private authService: AuthService
  ) {}

  startWatching() {
    console.log('IdleService started');
    if (typeof window === 'undefined') return;
    this.resetTimer();
    const boundReset = this.resetTimer.bind(this);
    window.addEventListener('mousemove', boundReset);
    window.addEventListener('click', boundReset);
    window.addEventListener('keypress', boundReset);
    window.addEventListener('scroll', boundReset);
    window.addEventListener('touchstart', boundReset);
  }

  stopWatching() {
    console.log('IdleService stopped');
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.warningShown = false;
  }

  resetTimer() {
    console.log('Timer reset');
    if (this.warningShown) {
      this.cancelWarning();
    }
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.onIdle(), this.IDLE_LIMIT);
  }

  private onIdle() {
    console.log('Idle detected – showing warning');
    if (this.warningShown) return;
    this.warningShown = true;
    if (this.warningCallback) {
      this.warningCallback();
    }
    this.warningTimer = setTimeout(() => this.logout(), this.WARNING_DURATION);
  }

  cancelWarning() {
    console.log('Warning cancelled');
    this.warningShown = false;
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.resetTimer();
  }

  setWarningCallback(cb: () => void) {
    this.warningCallback = cb;
  }

  public forceLogout() {
    this.logout();
  }

  private logout() {
    console.log('Logging out due to inactivity');
    this.stopWatching();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
