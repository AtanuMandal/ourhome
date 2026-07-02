import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const FINANCIAL_REPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./financial-report.component').then(m => m.FinancialReportComponent),
  },
  {
    path: 'my-statement',
    loadComponent: () =>
      import('./personal-statement.component').then(m => m.PersonalStatementComponent),
  },
  {
    path: 'society-summary',
    loadComponent: () =>
      import('./society-summary.component').then(m => m.SocietySummaryComponent),
  },
];
