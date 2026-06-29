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