import { computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { interval } from 'rxjs';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import {
  MaintenanceAreaBasis,
  MaintenanceCharge,
  MaintenanceChargeStatus,
  MaintenanceSchedule,
} from '../../core/models/maintenance.model';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import {
  apartmentLabel,
  buildChargeSections,
  CHARGE_STATUS_OPTIONS,
  formatAreaBasisLabel,
  MONTH_OPTIONS,
  sortCharges,
} from './maintenance-shared';

export abstract class MaintenancePageBase {
  protected readonly auth = inject(AuthService);
  protected readonly maintenance = inject(MaintenanceService);
  protected readonly apartmentsService = inject(ApartmentService);
  protected readonly fb = inject(FormBuilder);
  protected readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly chargesLoading = signal(false);
  // Set only by the 10s auto-refresh timer when charges are already loaded — keeps whatever is
  // on screen (no spinner, no cleared form state) while the background fetch is in flight. This
  // is what makes a resident's newly (re)submitted proof, or an admin's approve/deny, show up on
  // the other party's already-open page without a manual reload.
  readonly backgroundRefreshingCharges = signal(false);
  readonly apartments = signal<Apartment[]>([]);
  readonly schedules = signal<MaintenanceSchedule[]>([]);
  readonly charges = signal<MaintenanceCharge[]>([]);

  readonly monthOptions = MONTH_OPTIONS;
  readonly chargeStatusOptions = CHARGE_STATUS_OPTIONS;

  readonly filterForm = this.fb.group({
    year: [new Date().getFullYear() as number | null],
    month: [null as number | null],
    status: [null as MaintenanceChargeStatus | null],
  });

  readonly yearOptions = computed(() => {
    const years = new Set<number>([
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      ...this.charges().map(charge => charge.cy),
    ]);
    return Array.from(years).sort((a, b) => b - a);
  });

  readonly yearSelectOptions = computed(() => [
    { value: null as number | null, label: 'All years' },
    ...this.yearOptions().map(y => ({ value: y as number | null, label: String(y) })),
  ]);

  readonly monthSelectOptions = [
    { value: null as number | null, label: 'All months' },
    ...MONTH_OPTIONS.map(m => ({ value: m.value as number | null, label: m.label })),
  ];

  readonly chargeStatusSelectOptions = [
    { value: null as MaintenanceChargeStatus | null, label: 'All statuses' },
    ...CHARGE_STATUS_OPTIONS.map(s => ({ value: s as MaintenanceChargeStatus | null, label: s })),
  ];

  readonly apartmentSelectOptions = computed(() => [
    { value: null as string | null, label: 'All apartments' },
    ...this.apartments().map(a => ({ value: a.id as string | null, label: formatApartmentLabel(a) })),
  ]);

  readonly chargeSections = computed(() => buildChargeSections(this.charges()));

  protected abstract get isAdminView(): boolean;

  protected initializePage(loadApartments: boolean) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      this.loading.set(false);
      return;
    }

    this.loadInitialData(societyId, loadApartments);

    // Auto-refresh charges every 10s so a resubmitted proof (or an admin's approve/deny) shows
    // up — and is actionable via the normal buttons — without a manual reload or filter touch.
    interval(10_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.chargesLoading() && !this.backgroundRefreshingCharges()) {
          this.refreshCharges(true);
        }
      });
  }

  refreshCharges(isBackgroundRefresh = false) {
    const societyId = this.auth.societyId();
    if (!societyId) return;

    // A background tick with charges already loaded never blanks the list or disturbs an
    // in-progress selection — only a manual/initial load or filter change does that.
    const useBackgroundFlag = isBackgroundRefresh && this.charges().length > 0;
    if (useBackgroundFlag) this.backgroundRefreshingCharges.set(true);
    else this.chargesLoading.set(true);

    const request = this.createChargeRequest(societyId);

    if (!request) {
      this.charges.set([]);
      this.chargesLoading.set(false);
      this.backgroundRefreshingCharges.set(false);
      return;
    }

    request.subscribe({
      next: result => {
        this.charges.set(sortCharges(result.items ?? []));
        this.chargesLoading.set(false);
        this.backgroundRefreshingCharges.set(false);
      },
      error: () => {
        this.chargesLoading.set(false);
        this.backgroundRefreshingCharges.set(false);
      },
    });
  }

  isSelectableCharge(charge: MaintenanceCharge) {
    return charge.st === 'Pending' || charge.st === 'Rejected' || charge.st === 'Overdue';
  }

  apartmentLabel(apartmentId: string) {
    return apartmentLabel(this.apartments(), apartmentId);
  }

  formatApartmentLabel(apartment: Apartment) {
    return formatApartmentLabel(apartment);
  }

  formatAreaBasis(areaBasis: MaintenanceAreaBasis) {
    return formatAreaBasisLabel(areaBasis);
  }

  scheduleStatus(schedule: MaintenanceSchedule) {
    const today = new Date();
    const activeFrom = new Date(schedule.afd);
    const inactiveFrom = schedule.ifd ? new Date(schedule.ifd) : null;

    if (activeFrom > today) {
      return 'Upcoming';
    }

    if (inactiveFrom && inactiveFrom <= today) {
      return 'Inactive';
    }

    return 'Active';
  }

  protected currentApartmentId() {
    const user = this.auth.user();
    return user?.aid ?? user?.apts?.[0]?.aid ?? null;
  }

  protected loadSchedules(societyId: string, done?: () => void) {
    this.maintenance.listSchedules(societyId, this.isAdminView ? undefined : this.currentApartmentId() ?? undefined).subscribe({
      next: schedules => {
        this.schedules.set(schedules ?? []);
        done?.();
      },
      error: () => done?.(),
    });
  }

  private loadInitialData(societyId: string, loadApartments: boolean) {
    const pendingRequests = loadApartments ? 3 : 2;
    let completed = 0;
    const done = () => {
      completed += 1;
      if (completed >= pendingRequests) this.loading.set(false);
    };

    if (loadApartments) {
      this.apartmentsService.list(societyId, 1, 500).subscribe({
        next: result => {
          this.apartments.set((result.items ?? []).slice().sort((left, right) =>
            formatApartmentLabel(left).localeCompare(formatApartmentLabel(right), undefined, { numeric: true, sensitivity: 'base' })
          ));
          done();
        },
        error: () => done(),
      });
    }

    this.loadSchedules(societyId, done);
    this.loadChargesWithCallback(societyId, done);
  }

  private loadChargesWithCallback(societyId: string, done?: () => void) {
    this.chargesLoading.set(true);
    const request = this.createChargeRequest(societyId);

    if (!request) {
      this.charges.set([]);
      this.chargesLoading.set(false);
      done?.();
      return;
    }

    request.subscribe({
      next: result => {
        this.charges.set(sortCharges(result.items ?? []));
        this.chargesLoading.set(false);
        done?.();
      },
      error: () => {
        this.chargesLoading.set(false);
        done?.();
      },
    });
  }

  private createChargeRequest(societyId: string) {
    const apartmentId = this.currentApartmentId();
    const filters = {
      year: this.filterForm.controls.year.value ?? undefined,
      month: this.filterForm.controls.month.value ?? undefined,
      status: this.isAdminView ? (this.filterForm.controls.status.value ?? undefined) : undefined,
      apartmentId: this.isAdminView ? undefined : apartmentId ?? undefined,
    };

    return this.isAdminView
      ? this.maintenance.listCharges(societyId, filters)
      : apartmentId
        ? this.maintenance.getApartmentHistory(societyId, apartmentId, filters)
        : null;
  }
}
