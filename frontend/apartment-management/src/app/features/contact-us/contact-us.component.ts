import { Component, inject, signal, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [MatIconModule, MatDividerModule, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Contact Us"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (!society()) {
        <app-empty-state icon="contact_support" title="Not available" message="Society contact information is not available."></app-empty-state>
      } @else {
        <div class="card">
          <div class="soc-brand">
            <div class="soc-icon"><span class="material-icons">location_city</span></div>
            <h2>{{ society()!.nm }}</h2>
          </div>

          @if (society()!.ce || society()!.cp) {
            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Society Office</div>
            @if (society()!.ce) {
              <a class="contact-row" [href]="'mailto:' + society()!.ce">
                <mat-icon>email</mat-icon><span>{{ society()!.ce }}</span>
              </a>
            }
            @if (society()!.cp) {
              <a class="contact-row" [href]="'tel:' + society()!.cp">
                <mat-icon>phone</mat-icon><span>{{ society()!.cp }}</span>
              </a>
            }
          }

          @if (society()!.cm.length) {
            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Committees</div>
            @for (committee of society()!.cm; track committee.nm) {
              <div class="committee-card">
                <div class="committee-card__title">{{ committee.nm }}</div>
                @for (member of committee.mem; track member.uid + member.rt) {
                  <div class="committee-member">
                    <span class="committee-member__name">{{ member.fn }}</span>
                    <span class="committee-member__role">{{ member.rt }}</span>
                  </div>
                }
              </div>
            }
          } @else {
            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Committees</div>
            <p class="empty-copy">No committees have been published yet.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .soc-brand { text-align:center; padding-bottom:8px; }
    .soc-icon { width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#1565c0,#009688);
      display:flex;align-items:center;justify-content:center;margin:0 auto 10px; }
    .soc-icon .material-icons { font-size:32px;color:white; }
    .soc-brand h2 { font-size:20px;font-weight:700;margin:0; }
    .section-title { font-size:15px; font-weight:600; margin-bottom:8px; }
    .contact-row { display:flex; align-items:center; gap:10px; padding:10px 0; font-size:14px;
      color:var(--text-primary); text-decoration:none; }
    .contact-row mat-icon { color:var(--primary-light); }
    .committee-card { border:1px solid var(--border); border-radius:12px; padding:12px; background:#fafafa; margin-top:12px; }
    .committee-card__title { font-weight:600; }
    .committee-member { display:flex; justify-content:space-between; gap:12px; padding-top:10px; font-size:13px; }
    .committee-member__role { color:var(--primary-light); font-weight:600; }
    .empty-copy { color:var(--text-secondary); font-size:13px; }
  `],
})
export class ContactUsComponent implements OnInit {
  private readonly svc = inject(SocietyService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly society = signal<Society | null>(null);

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) {
      this.loading.set(false);
      return;
    }

    this.svc.get(sid).subscribe({
      next: society => {
        this.society.set(society);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
