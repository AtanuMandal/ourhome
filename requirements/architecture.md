# Architecture Principles

This document outlines the basic principles for the architecture of the new backend system.

## Basic Principles

1. **All Requests Through APIM**
   - All incoming requests will be routed through Azure API Management (APIM), except during local debugging.

2. **Database**
   - The database for the system will be Azure Cosmos DB.

3. **Rate Limiting**
   - The system should have the ability to implement rate limiting at both the user level and the society level.

4. **Azure Resource Provisioning**
   - All Azure resources will be provisioned using GitHub Actions for automation and consistency.

5. **API Hosting**
   - The API will be hosted on Azure Function App for scalability and cost efficiency.

6. **Security**
   - All Azure resources must be secured to prevent unauthorized access and ensure data protection.

7. **Unit Testable Code**
   - All code should be written in a way that ensures it is fully unit testable. Manual testing will not be performed.