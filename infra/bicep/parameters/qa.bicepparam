using '../main.bicep'

// ─── QA Environment Parameters ────────────────────────────────────────────────
// Deploy with:
//   az deployment group create \
//     --resource-group rg-aptmgmt-qa \
//     --template-file ../main.bicep \
//     --parameters qa.bicepparam
//
// ⚠  SECURITY: Replace this placeholder with a real 32+ character secret.
// For CI/CD pipelines, inject via a pipeline secret variable:
//   --parameters jwtSecret=$JWT_SECRET_QA
// Never commit a real secret value to source control.

param environment = 'qa'
param location = 'eastus'
param appName = 'aptmgmt'

// Inject this value from your CI/CD pipeline secret store at deploy time.
param jwtSecret = 'REPLACE_THIS_WITH_A_SECURE_32CHAR_JWT_SECRET_QA00'
