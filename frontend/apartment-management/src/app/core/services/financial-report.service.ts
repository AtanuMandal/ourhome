import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  ApartmentLedger,
  CashFlow,
  FinancialDashboard,
  PersonalStatement,
  SocietySummary,
} from '../models/financial-report.model';

@Injectable({ providedIn: 'root' })
export class FinancialReportService {
  private readonly api = inject(ApiService);

  getDashboard(societyId: string) {
    return this.api.get<FinancialDashboard>(
      `societies/${societyId}/financial-report/dashboard`
    );
  }

  getCashFlow(
    societyId: string,
    fromMonth: number,
    fromYear: number,
    toMonth: number,
    toYear: number
  ) {
    return this.api.get<CashFlow>(
      `societies/${societyId}/financial-report/cash-flow`,
      { fromMonth, fromYear, toMonth, toYear }
    );
  }

  getApartmentLedger(
    societyId: string,
    apartmentId: string,
    fromYear?: number,
    toYear?: number
  ) {
    const params: Record<string, string | number> = {};
    if (fromYear) params['fromYear'] = fromYear;
    if (toYear)   params['toYear']   = toYear;
    return this.api.get<ApartmentLedger>(
      `societies/${societyId}/apartments/${apartmentId}/financial-report/ledger`,
      params
    );
  }

  getSocietySummary(societyId: string) {
    return this.api.get<SocietySummary>(
      `societies/${societyId}/financial-report/society-summary`
    );
  }

  getPersonalStatement(societyId: string, apartmentId: string, year?: number) {
    const params: Record<string, string | number> = {};
    if (year) params['year'] = year;
    return this.api.get<PersonalStatement>(
      `societies/${societyId}/apartments/${apartmentId}/financial-report/statement`,
      params
    );
  }
}
