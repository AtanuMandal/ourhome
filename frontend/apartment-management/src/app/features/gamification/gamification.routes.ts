import { Routes } from '@angular/router';

export const GAMIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./leaderboard.component').then(m => m.LeaderboardComponent),
  },
  {
    path: 'points',
    loadComponent: () => import('./points.component').then(m => m.PointsComponent),
  },
];
