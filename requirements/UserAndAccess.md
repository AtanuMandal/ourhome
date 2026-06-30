## Role hierarchy

| Category | Role | Description |
|----------|------|-------------|
| **HQ** (HeadQuarters) | `HQAdmin` | Platform admin — creates societies, manages platform |
| **HQ** | `HQUser` | Platform viewer — read-only access to society list |
| **SU** (Society Users) | `SUAdmin` | Housing Officer — manages their society (residents, fees, complaints…) |
| **SU** | `SUUser` | Regular resident within a society |
| **SU** | `SUSecurity` | Regular Security personal within a socity | Manages Visitor access and can view residents

## User Creation 
- SUAdmin should be able to create SUUser and SUSecurity user .
- SUAdmin should have a option to manage those users , like manage password update info.
- Each user would have a place where they can update name and phone , Update password 

## User Addition
- SUAdmin should be able to generate a Socity specific encripted link for User registration .
- Once user navigate to the link they will have the user creation screen where they can add their details .
- Once User added and logged in they can see all the apartment under the socity and can choose which apartment they are belongs to .
- After user apartment selection SUAdmin can review the request and approve them .
- SUUser can add another user as owner /Tenent for their appartment by creating a secure link and send that to ph no or email address.
- After SUUser add another user SUAdmin shold be able to approve/Deny the request .
- All this can be done via User management for SUAdmin and 'My Apartment' for SUUser
- Same User can have multiple apartment under same socity .
- All notification will be forwared to all owner /tenent for a apartment .
- While User Registration if the same user exists in system(for another socity ) then user should be able to log into for both of the socity .
- In case SUUser have multiple socity under it, then after login they have to select which socity they are currently logging in before procedding any further.

## Aceptance Criteria
- After registering from socity unique link user should not go for reset Password Page , it should directly be taken
  to Login Page , also Confirm Password is required during user registration . 
- After registering user not able to add apartmnet to their Name , 
- SUUser user should not get Admin action under Apartments.
- SUUser should be able to see  other Residents Name only in Residents Page , Ph and email will be masked .