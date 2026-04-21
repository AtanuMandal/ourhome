# Add Maintenance Fee Management

## Overview
Apartment society SUAdmin must be able to configure and manage maintenance fees for apartments with flexible frequency, amount types, and area-based rates. The system should post recurring maintenance charges automatically and allow SUAdmin to mark payments as received.

## Requirements

### Fee Schedule Configuration
- SUAdmin can create maintenance fee schedules for a society.
- Schedules support the following frequencies:
  - Monthly
  - Quarterly
  - Yearly
- Fees can be defined as:
  - Fixed amount per apartment
  - Per square foot rate based on apartment area
- When using per-square-foot fees, the administrator must choose an area basis:
  - Carpet area
  - Built-up area
  - Super built-up area
- Fees may optionally be specific to a single apartment or apply at the society level.
- SUAdmin can update schedule rates over time.
- Each schedule update must store a change history entry with:
  - previous amount
  - new amount
  - area basis (if applicable)
  - changed by user
  - timestamp
  - change reason

### Recurring Fee Posting
- The system must generate maintenance charges automatically according to the selected frequency for upcoming six month.
- Generated charges should be visible in the resident payment history view.
- When a fee is created or updated, the correct apartment charge should be calculated using the  selected frequency schedules.
- The schedule should include a due day for each charge.

### Resident View
- Resident can view their maintenance fee year and month wise , with a option to pay
- Resident can upload payment proof for single and multiple payments for their apartment specific maintenance fees.
- Once uplaoded admin will get notification for approval for the payment request.
- Residents can view their maintenance fee payment history.
- Payment records should show due date, amount, status, and overdue state.
- Overdue amounts must be highlighted using society-specific overdue threshold settings.

### Administrator Controls
- SUAdmin can create and modify fee schedules from the fee schedule list page.
- SUAdmin can see society-wide fee payments for all apartment and overdue status for all apartments in a grid view month/quarter/year wise , where month will be in X axis and apartments with owner name will be in Y axis . Make a separate page for this .
- SUAdmin can mark apartment maintenance payments as paid by viewing the uploaded file and other parameters from the same grid view of maintenance. There should be option to view the payment supported documents (should be in a popup).
- The society configuration must include an overdue threshold in days for late fee identification.SUAdmin should be able to control this.
- Overdue threshold should be between 1 to 90 days . 
- SUAdmin can introduce a penalty charge per apartment wise in case of late payment.

## Acceptance Criteria
- A fee schedule can be created with monthly, quarterly, or yearly recurrence.
- Fees support both fixed and per-square-foot pricing.
- Per-square-foot fees use the selected carpet, built-up, or super built-up area to calculate the total charge.
- Change history is stored whenever a fee schedule is updated.
- Residents can see their payment history with overdue highlighting.
- SUAdmin can manage fee schedules and mark payments as paid.
- Society settings expose a maintenance overdue threshold.
