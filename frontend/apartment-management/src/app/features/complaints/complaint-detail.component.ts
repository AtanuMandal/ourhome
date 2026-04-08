import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ComplaintService } from '../../core/services/complaint.service';
import { AuthService } from '../../core/services/auth.service';
import { Complaint } from '../../core/models/complaint.model';

@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatDividerModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Complaint Detail" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (item()) {
        <div class="card detail-card">
          <div class="detail-header">
            <h2>{{ item()!.title }}</h2>
            <app-status-chip [status]="item()!.status"></app-status-chip>
          </div>
          <p class="detail-category"><span class="material-icons">category</span>{{ item()!.category }}</p>
          <p class="detail-desc">{{ item()!.description }}</p>
          <mat-divider></mat-divider>

          <div class="meta-row">
            <span class="material-icons">schedule</span>
            Raised {{ item()!.createdAt | date:'medium' }}
          </div>
          @if (item()!.assignedToName) {
            <div class="meta-row">
              <span class="material-icons">person</span>
              Assigned to {{ item()!.assignedToName }}
            </div>
          }

          @if (isAdmin() && item()!.status !== 'Resolved') {
            <button mat-raised-button color="primary" style="margin-top:16px" (click)="resolve()">
              Mark Resolved
            </button>
          }
        </div>

        <!-- Timeline -->
        @if (item()!.timeline?.length) {
          <div class="card" style="margin-top:12px">
            <h3 class="timeline-title">Activity Timeline</h3>
            <div class="timeline">
              @for (event of item()!.timeline; track event.at) {
                <div class="timeline-item">
                  <div class="tl-dot"></div>
                  <div class="tl-body">
                    <span class="tl-event">{{ event.event }}</span>
                    @if (event.note) { <p class="tl-note">{{ event.note }}</p> }
                    <span class="tl-time">{{ event.at | date:'medium' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styleUrl: './complaint-detail.scss',
})
export class ComplaintDetailComponent implements OnInit {
  private readonly svc   = inject(ComplaintService);
  private readonly auth  = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading  = signal(true);
  readonly item     = signal<Complaint | null>(null);
  readonly isAdmin  = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const id  = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(sid, id).subscribe({
      next: c => { this.item.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resolve() {
    const sid = this.auth.societyId()!;
    const id  = this.item()!.id;
    this.svc.resolve(sid, id, { resolution: 'Resolved by admin', resolvedBy: this.auth.user()!.id }).subscribe({
      next: c => this.item.set(c),
    });
  }
}
