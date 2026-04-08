using '../main.bicep'

// ─── Prod Environment Parameters ──────────────────────────────────────────────
// Deploy with:
//   az deployment group create \
//     --resource-group rg-aptmgmt-prod \
//     --template-file ../main.bicep \
//     --parameters prod.bicepparam
//
// ⚠  SECURITY: NEVER hardcode a real jwtSecret here and commit to source control.
// Recommended approach: store the secret in Azure Key Vault or a CI/CD secret
// store and pass it at deploy time:
//   az deployment group create ... --parameters jwtSecret="$PROD_JWT_SECRET"

param environment = 'prod'
param location = 'eastus'
param appName = 'aptmgmt'

// Inject this value from your CI/CD pipeline secret store at deploy time.
param jwtSecret = 'REPLACE_THIS_WITH_A_SECURE_32CHAR_JWT_SECRET_PROD'
