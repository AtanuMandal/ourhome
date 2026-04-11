# UI and API Fixes

Date: 2026-04-11

This file summarizes the follow-up fixes made after the initial onboarding/auth delivery.

## Issues addressed

1. Apartment detail page was showing resident history directly on the same screen
2. Owner transfer, tenant transfer, and household-member actions needed separate pages
3. Apartment edit navigation was incorrect
4. Resident add action placement was not correct in the residents UI
5. Add Resident page was broken because enum values were not deserializing correctly in the API

## Backend / API changes

- Fixed Functions request deserialization to support string enums in:
  - `backend\src\ApartmentManagement.Functions\HttpHelpers.cs`
- Added explicit enum JSON conversion attributes for request DTOs in:
  - `backend\src\ApartmentManagement.Application\ApplicationDtos.cs`
- Added a dedicated apartment resident-history response model in:
  - `backend\src\ApartmentManagement.Application\ApplicationDtos.cs`
- Added resident-history mapping in:
  - `backend\src\ApartmentManagement.Application\Mappings.cs`
- Added apartment resident-history query in:
  - `backend\src\ApartmentManagement.Application\ApartmentModule.cs`
- Added resident-history endpoint in:
  - `backend\src\ApartmentManagement.Functions\ApartmentUserFunctions.cs`

### New API

- `GET /societies/{societyId}/apartments/{id}/resident-history`

## Frontend changes

- Refactored apartment detail page so it now shows apartment summary only, with admin links to dedicated pages:
  - `frontend\apartment-management\src\app\features\apartments\apartment-detail.component.ts`
- Fixed apartment routes ordering and added dedicated pages in:
  - `frontend\apartment-management\src\app\features\apartments\apartments.routes.ts`

### New apartment admin pages

- `frontend\apartment-management\src\app\features\apartments\apartment-resident-history.component.ts`
- `frontend\apartment-management\src\app\features\apartments\apartment-transfer-resident.component.ts`
- `frontend\apartment-management\src\app\features\apartments\apartment-household-member.component.ts`

### Routing fixes

- Fixed apartment edit navigation so the edit button goes to:
  - `/apartments/:id/edit`
- Added separate links for:
  - resident history
  - transfer owner
  - add / transfer tenant
  - add family member / co-occupant

### Resident page fixes

- Moved **Add Resident** action into the page header actions area in:
  - `frontend\apartment-management\src\app\features\residents\resident-list.component.ts`
- Fixed resident form behavior and validation sync for:
  - role
  - resident type
  - apartment requirement
  in:
  - `frontend\apartment-management\src\app\features\residents\resident-form.component.ts`
- Improved header action alignment in:
  - `frontend\apartment-management\src\app\shared\components\page-header\page-header.component.scss`

### Service / model updates

- Added resident-history API call in:
  - `frontend\apartment-management\src\app\core\services\apartment.service.ts`
- Added resident-history response typing in:
  - `frontend\apartment-management\src\app\core\models\apartment.model.ts`

## Validation

- Backend Functions build passed
- Frontend Angular build passed
- L2 backend tests passed

## Summary

The apartment detail page is now cleaner, resident-management admin actions live on separate pages, apartment edit routing works correctly, the resident add action is placed correctly, and the resident APIs now accept enum values from the frontend without serialization failures.
