Architecture -> serverless on Azure

Infrastructure provisioning should be done with IaC need complete automation for deployment

Use Azure PAAS services with aim to reduce cost
Security, observability, operational efficiency should be primary concern

scale in  scale out should built in

for database use cosmos. index the database properly for low cost

backend in .NET

front end in Angular

Multitenancy should be built in

standard security architecture features like rate limiting, retry mechanism, even driven architecture needs to be established

need eventual consistency but data should not get stale. We should be able to complete transactions or rollback from all services eventually

architecture should be extensible so that it becomes easy to add another layer like redis or api gateway easy

try to separate out database from code so that it is possible to swap databases if needed



-----------------

Write unit tests that can be executed for all business logics with out external depenacies. this would L0 tests

then we should have L1 tests which requires mocking external dependancies

then we should have L2 tests which are intergration tests

and finally limited set of UI tests with playwright
backend code should be in backend folder. backend unit tests should be under backend_unittest folder
frontend code should be under frontend folder.



