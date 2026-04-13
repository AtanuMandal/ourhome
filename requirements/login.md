# Login Requirements

## Overview
The login module will handle user authentication and ensure secure access to the application. It will support multi-tenancy and role-based access control.

## Features

1. **User Login**
   - Residents can log in using their email and password. Currently login is implemented with OTP.
   - Support for multi-tenancy by identifying the apartment/society during login.

   
1.1 . While login email id would be used. A user can have multiple societies and mutliple apartments in multiple societies and can have multiple roles in a society, the have to choose society, apartment and role. If there is only one society, or role or apartment no need to choose that information. if the role is society admin, no need to choose apartment.


<!-- 2. **Social Login**
   - Option to log in using social accounts (e.g., Google, Microsoft). -->

3. **Forgot Password**
   - Allow users to reset their password via email and otp.
   - Secure token-based password reset mechanism.

<!-- 4. **Role-Based Access Control (RBAC)**
   - Assign roles to users (e.g., Admin, Owner, Tenant).
   - Restrict access to features based on roles. -->

<!-- 5. **Session Management**
   - Secure session handling with token-based authentication (e.g., JWT).
   - Support for session expiration and refresh tokens.

6. **Multi-Factor Authentication (Optional)**
   - Add an extra layer of security with MFA (e.g., OTP via email or SMS).

7. **Admin Features**
   - Manage user accounts (e.g., deactivate, reset passwords).
   - View login history and failed login attempts.

8. **Security**
   - Use Azure AD B2C for authentication and user management.
   - Encrypt sensitive data (e.g., passwords) using industry-standard algorithms. -->