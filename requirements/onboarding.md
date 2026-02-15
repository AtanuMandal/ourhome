# Onboarding Apartments and Residents

## Overview
The onboarding module will allow society management to register new apartments and their residents into the system. This is essential for managing the multi-tenant structure of the application.

## Features

### Apartment Onboarding
1. **Add New Apartments**
   - Society management can add new apartments with details such as:
     - Apartment ID
     - Block/Building Name
     - Floor Number
     - Number of Rooms
     - Parking Slots
   - Option to upload a CSV file for bulk apartment onboarding.

2. **Edit/Delete Apartments**
   - Update apartment details (e.g., change owner, update number of rooms).
   - Delete apartments if they are no longer part of the society.

3. **Apartment Status**
   - Mark apartments as vacant, occupied, or under maintenance.

### Resident Onboarding
1. **Add New Residents**
   - Add residents to an apartment with details such as:
     - Name
     - Contact Information
     - Email Address
     - Role (Owner, Tenant, Family Member, etc.)
   - Option to upload a CSV file for bulk resident onboarding.

2. **Edit/Delete Residents**
   - Update resident details (e.g., contact information, role).
   - Remove residents when they move out.

3. **Resident Roles and Permissions**
   - Define roles for residents (e.g., Owner, Tenant, Admin).
   - Assign permissions based on roles (e.g., Owners can view financials, Tenants cannot).

4. **Verification Process**
   - Verify residents' identities using email or phone OTP.
   - Option for society management to manually approve new residents.

5. **Notifications**
   - Notify residents when they are added to the system.
   - Send reminders for incomplete onboarding processes.

---

# Login Requirements

## Overview
The login module will handle user authentication and ensure secure access to the application. It will support multi-tenancy and role-based access control.

## Features

1. **User Login**
   - Residents can log in using their email and password.
   - Support for multi-tenancy by identifying the apartment/society during login.

2. **Social Login**
   - Option to log in using social accounts (e.g., Google, Microsoft).

3. **Forgot Password**
   - Allow users to reset their password via email.
   - Secure token-based password reset mechanism.

4. **Role-Based Access Control (RBAC)**
   - Assign roles to users (e.g., Admin, Owner, Tenant).
   - Restrict access to features based on roles.

5. **Session Management**
   - Secure session handling with token-based authentication (e.g., JWT).
   - Support for session expiration and refresh tokens.

6. **Multi-Factor Authentication (Optional)**
   - Add an extra layer of security with MFA (e.g., OTP via email or SMS).

7. **Admin Features**
   - Manage user accounts (e.g., deactivate, reset passwords).
   - View login history and failed login attempts.

8. **Security**
   - Use Azure AD B2C for authentication and user management.
   - Encrypt sensitive data (e.g., passwords) using industry-standard algorithms.

---

These requirements will ensure a robust onboarding and login system for your application. Let me know if you want to proceed with setting up the API structure for these features.