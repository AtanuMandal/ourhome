# ApartmentHub — Angular 17 PWA Frontend

A mobile-first Progressive Web App for Apartment Society Management.

## Tech Stack
- **Angular 17+** standalone components, signals-based state
- **Angular Material 17** (MDC components)
- **@angular/service-worker** (PWA, offline support)
- **Backend**: Azure Functions (.NET 8) — see `../../backend`

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm start
# Open http://localhost:4200
```

## Build

```bash
# Development
npm run watch

# Production (includes Service Worker)
npm run build:prod
```

## PWA Features
- Service Worker registered on production builds
- Manifest at `src/manifest.webmanifest`
- SW cache config at `ngsw-config.json`
  - API calls: **network-first** with 3-day fallback
  - Assets: **cache-first** (prefetched at install)
- App shell pattern — instant load on return visits

## Architecture

```
src/app/
├── core/
│   ├── models/          # TypeScript interfaces for all API types
│   ├── services/        # Feature services (api, auth, society, etc.)
│   ├── guards/          # authGuard, adminGuard, guestGuard
│   └── interceptors/    # JWT auth + global error handler
├── features/
│   ├── auth/            # Login + OTP verify
│   ├── dashboard/       # Role-aware home
│   ├── apartments/      # List, detail, form
│   ├── residents/       # List, profile
│   ├── amenities/       # List + booking form with time slots
│   ├── complaints/      # List, detail (timeline), form
│   ├── notices/         # Board, detail, post form
│   ├── visitors/        # Log, register
│   ├── fees/            # Schedules, payment history
│   ├── gamification/    # Leaderboard, points history
│   ├── services/        # Service providers, request form
│   └── society/         # Society detail & edit (admin)
└── shared/
    └── components/      # bottom-nav, page-header, loading-spinner,
                         # empty-state, status-chip
```

## Environment Config

Edit `src/environments/environment.ts` for local dev:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:7071/api',
};
```

Edit `src/environments/environment.prod.ts` for production:
```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://<your-function-app>.azurewebsites.net/api',
};
```

## Navigation

| Route | Feature |
|---|---|
| `/auth/login` | Email + OTP sign-in |
| `/dashboard` | Role-based home |
| `/apartments` | Apartment list & management |
| `/residents` | Resident directory |
| `/amenities` | Amenity booking |
| `/complaints` | Raise & track complaints |
| `/notices` | Society notice board |
| `/visitors` | Visitor log & register |
| `/fees` | Fee schedules & payment history |
| `/rewards` | Gamification leaderboard |
| `/services` | Service provider requests |
| `/society` | Society details (admin) |

## Icons
Run `node generate-icons.js` then convert the SVG files in
`src/assets/icons/` to PNG using Inkscape or a similar tool.

