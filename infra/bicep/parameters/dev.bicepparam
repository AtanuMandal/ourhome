using '../main.bicep'

// ─── Dev Environment Parameters ───────────────────────────────────────────────
// Deploy with:
//   az deployment group create \
//     --resource-group rg-aptmgmt-dev \
//     --template-file ../main.bicep \
//     --parameters dev.bicepparam
//
// Or with Azure Developer CLI:
//   azd provision  (uses azure.yaml to pick the right param file)

param environment = 'dev'
param location = 'eastus'
param appName = 'aptmgmt'

// ⚠  SECURITY: Replace this placeholder with a real 32+ character secret.
// For CI/CD pipelines, inject via a pipeline secret variable:
//   --parameters jwtSecret=$JWT_SECRET_DEV
// Never commit a real secret value to source control.
param jwtSecret = 'REPLACE_THIS_WITH_A_SECURE_32CHAR_JWT_SECRET_DEV0'
