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
import { mergeById } from '../../shared/utils/merge-by-id.util';
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
      ...this.charges().map(charge => charge.chargeYear),
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

  // Delta/auto-refresh window (see requirements/auto_refresh.md) — a background tick asks the
  // backend for only charges created/updated in the last 10 minutes instead of the whole list.
  private static readonly AUTO_REFRESH_WINDOW_MS = 10 * 60 * 1000;

  refreshCharges(isBackgroundRefresh = false) {
    const societyId = this.auth.societyId();
    if (!societyId) return;

    // A background tick with charges already loaded never blanks the list or disturbs an
    // in-progress selection — only a manual/initial load or filter change does that. A
    // background tick also switches to a small delta fetch instead of re-fetching everything.
    const useBackgroundFlag = isBackgroundRefresh && this.charges().length > 0;
    if (useBackgroundFlag) this.backgroundRefreshingCharges.set(true);
    else this.chargesLoading.set(true);

    const updatedSince = useBackgroundFlag
      ? new Date(Date.now() - MaintenancePageBase.AUTO_REFRESH_WINDOW_MS).toISOString()
      : undefined;

    const request = this.createChargeRequest(societyId, updatedSince);

    if (!request) {
      this.charges.set([]);
      this.chargesLoading.set(false);
      this.backgroundRefreshingCharges.set(false);
      return;
    }

    request.subscribe({
      next: result => {
        this.applyCharges(result.items ?? [], useBackgroundFlag);
        this.chargesLoading.set(false);
        this.backgroundRefreshingCharges.set(false);
      },
      error: () => {
        this.chargesLoading.set(false);
        this.backgroundRefreshingCharges.set(false);
      },
    });
  }

  /**
   * A manual/initial load (or filter change) replaces the list outright. A background refresh
   * instead receives only the delta (charges changed in the last 10 minutes) and merges it into
   * what's already on screen, evicting anything that no longer matches an active Status filter.
   */
  private applyCharges(next: MaintenanceCharge[], wasBackgroundRefresh: boolean) {
    if (!wasBackgroundRefresh) {
      this.charges.set(sortCharges(next));
      return;
    }

    if (next.length === 0) return;

    const merged = mergeById(this.charges(), next, { stillVisible: this.buildChargeStillVisiblePredicate() });
    this.charges.set(sortCharges(merged));
  }

  /**
   * A charge's Status is the only filterable field that changes from the charge's own updates
   * (year/month/apartment are fixed at creation). "Overdue" is never a persisted status (see
   * backend MappingExtensions.IsOverdue) — it's matched against the computed isOverdue flag,
   * mirroring the backend's own convention. Undefined when no status filter is active (or on
   * the resident view, which has none), so a delta merge never evicts anything.
   */
  private buildChargeStillVisiblePredicate(): ((charge: MaintenanceCharge) => boolean) | undefined {
    if (!this.isAdminView) return undefined;
    const status = this.filterForm.controls.status.value;
    if (!status) return undefined;
    return status === 'Overdue'
      ? (charge: MaintenanceCharge) => charge.isOverdue
      : (charge: MaintenanceCharge) => charge.status === status;
  }

  isSelectableCharge(charge: MaintenanceCharge) {
    return charge.status === 'Pending' || charge.status === 'Rejected' || charge.status === 'Overdue';
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
    const activeFrom = new Date(schedule.activeFromDate);
    const inactiveFrom = schedule.inactiveFromDate ? new Date(schedule.inactiveFromDate) : null;

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
    return user?.apartmentId ?? user?.apartments?.[0]?.apartmentId ?? null;
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

  private createChargeRequest(societyId: string, updatedSince?: string) {
    const apartmentId = this.currentApartmentId();
    const filters = {
      year: this.filterForm.controls.year.value ?? undefined,
      month: this.filterForm.controls.month.value ?? undefined,
      status: this.isAdminView ? (this.filterForm.controls.status.value ?? undefined) : undefined,
      apartmentId: this.isAdminView ? undefined : apartmentId ?? undefined,
    };

    return this.isAdminView
      ? this.maintenance.listCharges(societyId, filters, updatedSince)
      : apartmentId
        ? this.maintenance.getApartmentHistory(societyId, apartmentId, filters, updatedSince)
        : null;
  }
}
