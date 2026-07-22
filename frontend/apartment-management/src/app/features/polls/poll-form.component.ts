import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PollService } from '../../core/services/poll.service';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionSummary, PollAnonymity, PollEligibilityUnit, PollTargetAudience, PollType, PollVisibility } from '../../core/models/poll.model';

@Component({
  selector: 'app-poll-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatCheckboxModule, MatButtonModule, PageHeaderComponent],
  template: `
    <app-page-header title="Create Poll" [showBack]="true"></app-page-header>
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title">
            @if (form.controls.title.invalid && form.controls.title.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Poll Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="SingleChoice">Single Choice</mat-option>
              <mat-option value="MultipleChoice">Multiple Choice</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Options (one per line, at least 2)</mat-label>
            <textarea matInput rows="4" formControlName="optionsText" placeholder="Yes&#10;No"></textarea>
            @if (optionCountError()) {
              <mat-error>{{ optionCountError() }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Opens At</mat-label>
            <input matInput type="datetime-local" formControlName="opensAt">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Closes At</mat-label>
            <input matInput type="datetime-local" formControlName="closesAt">
            @if (form.errors?.['closesBeforeOpens'] && form.controls.closesAt.touched) {
              <mat-error>Closes At must be after Opens At</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Target Audience</mat-label>
            <mat-select formControlName="targetAudience">
              <mat-option value="FullSociety">Full Society (all apartments)</mat-option>
              <mat-option value="PerBlock">Per Block (one block)</mat-option>
              <mat-option value="MultipleBlock">Multiple Blocks</mat-option>
            </mat-select>
          </mat-form-field>

          @if (form.controls.targetAudience.value !== 'FullSociety') {
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>{{ form.controls.targetAudience.value === 'PerBlock' ? 'Block' : 'Blocks' }}</mat-label>
              <mat-select formControlName="targetBlockNames" multiple>
                @for (b of blockOptions(); track b) {
                  <mat-option [value]="b">{{ b }}</mat-option>
                }
              </mat-select>
              @if (targetBlockError()) {
                <mat-error>{{ targetBlockError() }}</mat-error>
              }
            </mat-form-field>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Eligibility</mat-label>
            <mat-select formControlName="eligibilityUnit">
              <mat-option value="PerApartment">Per Apartment (owner votes)</mat-option>
              <mat-option value="PerResident">Per Resident</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Anonymity</mat-label>
            <mat-select formControlName="anonymity">
              <mat-option value="Anonymous">Anonymous</mat-option>
              <mat-option value="Identified">Identified (audit trail)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Results Visibility</mat-label>
            <mat-select formControlName="visibility">
              <mat-option value="Immediately">Immediately (live tally)</mat-option>
              <mat-option value="AfterClose">After Close</mat-option>
              <mat-option value="AdminOnly">Admin Only (until published)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Quorum Threshold % (optional)</mat-label>
            <input matInput type="number" min="0" max="100" formControlName="quorumThresholdPercent">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Linked Notice ID (optional)</mat-label>
            <input matInput formControlName="linkedNoticeId">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>AGM Session (optional)</mat-label>
            <mat-select formControlName="agmSessionId">
              <mat-option value="">None — standalone poll</mat-option>
              @for (s of agmSessions(); track s.id) {
                <mat-option [value]="s.id">{{ s.tt }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-checkbox formControlName="isAgmResolution" class="full-width">AGM Resolution</mat-checkbox>
          <mat-checkbox formControlName="allowVoteChange" class="full-width">Allow residents to change their vote before close</mat-checkbox>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:16px"
                  [disabled]="saving() || form.invalid || !!optionCountError() || !!targetBlockError()">
            Create Poll
          </button>
        </form>
      </div>
    </div>
  `,
})
export class PollFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly pollSvc = inject(PollService);
  private readonly agmSessionSvc = inject(AgmSessionService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly agmSessions = signal<AgmSessionSummary[]>([]);
  readonly blockOptions = signal<string[]>([]);

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    type: ['SingleChoice' as PollType, Validators.required],
    optionsText: ['Yes\nNo', Validators.required],
    opensAt: ['', Validators.required],
    closesAt: ['', Validators.required],
    targetAudience: ['FullSociety' as PollTargetAudience, Validators.required],
    targetBlockNames: [[] as string[]],
    eligibilityUnit: ['PerResident' as PollEligibilityUnit, Validators.required],
    anonymity: ['Anonymous' as PollAnonymity, Validators.required],
    visibility: ['Immediately' as PollVisibility, Validators.required],
    quorumThresholdPercent: [null as number | null],
    linkedNoticeId: [''],
    agmSessionId: [''],
    isAgmResolution: [false],
    allowVoteChange: [true],
  }, { validators: [closesAfterOpensValidator] });

  ngOnInit() {
    const sid = this.auth.societyId();
    if (sid) {
      this.agmSessionSvc.list(sid, 1, 100).subscribe({
        next: response => this.agmSessions.set(response.items ?? []),
        error: () => {},
      });
      this.apartmentSvc.list(sid, 1, 500).subscribe({
        next: response => {
          const blocks = new Set((response.items ?? []).map(a => a.blk).filter(Boolean));
          this.blockOptions.set([...blocks].sort());
        },
        error: () => {},
      });
    }

    const agmSessionId = this.route.snapshot.queryParamMap.get('agmSessionId');
    if (agmSessionId) {
      this.form.patchValue({ agmSessionId, isAgmResolution: true });
    }
  }

  targetBlockError(): string | null {
    const audience = this.form.controls.targetAudience.value;
    const count = this.form.controls.targetBlockNames.value.length;
    if (audience === 'PerBlock' && count !== 1) return 'Select exactly one block.';
    if (audience === 'MultipleBlock' && count < 1) return 'Select at least one block.';
    return null;
  }

  optionCountError(): string | null {
    const count = this.parsedOptions().length;
    return count < 2 ? 'At least 2 options are required.' : null;
  }

  private parsedOptions(): string[] {
    return (this.form.controls.optionsText.value ?? '')
      .split('\n')
      .map(o => o.trim())
      .filter(o => o.length > 0);
  }

  submit() {
    if (this.form.invalid || this.optionCountError() || this.targetBlockError()) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.saving.set(true);
    const value = this.form.getRawValue();

    this.pollSvc.create(sid, {
      title: value.title.trim(),
      description: value.description.trim(),
      type: value.type,
      options: this.parsedOptions(),
      opensAt: new Date(value.opensAt).toISOString(),
      closesAt: new Date(value.closesAt).toISOString(),
      targetAudience: value.targetAudience,
      targetBlockNames: value.targetAudience === 'FullSociety' ? undefined : value.targetBlockNames,
      eligibilityUnit: value.eligibilityUnit,
      anonymity: value.anonymity,
      visibility: value.visibility,
      linkedNoticeId: value.linkedNoticeId?.trim() || undefined,
      quorumThresholdPercent: value.quorumThresholdPercent ?? undefined,
      isAgmResolution: value.isAgmResolution,
      allowVoteChange: value.allowVoteChange,
      agmSessionId: value.agmSessionId || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Poll created.', 'Dismiss', { duration: 3000 });
        const agmSessionId = value.agmSessionId;
        this.router.navigate(agmSessionId ? ['/agm-sessions', agmSessionId] : ['/polls']);
      },
      error: () => this.saving.set(false),
    });
  }
}

function closesAfterOpensValidator(group: AbstractControl): ValidationErrors | null {
  const opensAt = group.get('opensAt')?.value;
  const closesAt = group.get('closesAt')?.value;
  if (!opensAt || !closesAt) return null;
  return new Date(closesAt) > new Date(opensAt) ? null : { closesBeforeOpens: true };
}
