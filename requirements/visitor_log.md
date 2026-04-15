# Visitor Log

## Overview
The visitor log module will maintain a record of all visitors entering and exiting the society premises. This will enhance security and provide a way to track visitor activity.

## Features

1. **Visitor Registration**
   - Security personnel can register visitors at the gate.
   - Record visitor details (e.g., name, contact, purpose of visit).
   - If a visitor registration is done by security, it will go for approval of the respective resident
   - if the visitor is not visiting an apartment, then the approval needs to be done by the designated approver. for now lets consider no approval is needed

2. **Pre approved visior pass**
 - If a apartment resident is creating a visitor pre approved pass then QR code will be created.
 - the app will show a option to check in the visitor and visitor entry time will be logged
 - residents should checkout the visitors once the visit is complete

   
2. **Visitor Pass** - DO NOT DO NOW (there will be a role in the application -> security who would be able to see scan the QR code and check in)
   - Generate a digital or physical visitor pass.
   - QR code-based entry for quick verification.

3. **Resident Notifications**
   - Notify residents when a visitor arrives for them.
   - Option for residents to approve or deny visitor entry.

4. **Visitor History**
   - Maintain a log of all visitors.
   - Search and filter visitor records by date, name, or resident.

5. **Reports**
   - Generate visitor reports for a specific period.
   - Export visitor logs for record-keeping.

6. Super users will have to search using date and apartment numbers ... by default the page would be blank... default date would be today... 