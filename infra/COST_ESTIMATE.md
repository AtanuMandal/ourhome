# Azure Infrastructure Cost Estimate
## Apartment Management System — East US (2026)

> **Scenario:** Multi-tenant SaaS platform, ~4,000 HTTP requests/day (~120,000/month),
> fully serverless/consumption-tier, single region (East US).
> **Pricing assumption:** No free-tier credits applied — all consumption billed at full pay-as-you-go rates.

---

## Azure Components Deployed

| # | Component | Resource Type | SKU / Tier |
|---|-----------|--------------|------------|
| 1 | Azure Functions | `Microsoft.Web/sites` (functionapp) | Consumption (Y1 / Dynamic) |
| 2 | Azure Cosmos DB | `Microsoft.DocumentDB/databaseAccounts` | Serverless |
| 3 | Azure Event Grid | `Microsoft.EventGrid/topics` | Custom Topic (CloudEvents 1.0) |
| 4 | Application Insights | `Microsoft.Insights/components` | Workspace-based |
| 5 | Log Analytics Workspace | `Microsoft.OperationalInsights/workspaces` | Pay-As-You-Go (PerGB2018) |
| 6 | Azure Storage Account | `Microsoft.Storage/storageAccounts` | Standard LRS (StorageV2) |
| 7 | Azure Key Vault | `Microsoft.KeyVault/vaults` | Standard |
| 8 | Azure Communication Services | `Microsoft.Communication/communicationServices` | Consumption |
| 9 | Azure AD B2C | External identity platform | Pay-per-MAU |

> **Note:** Azure Service Bus has been replaced by the **Transactional Outbox + Event Grid** pattern.
> Domain events are written atomically to a Cosmos DB `outbox` container; the Cosmos Change Feed
> triggers an Azure Function which publishes to Event Grid. Saves ~$10/month vs Service Bus Standard.

---

## Assumptions

| Assumption | Value |
|-----------|-------|
| Daily HTTP requests | 4,000 |
| Monthly HTTP requests | ~120,000 |
| Total function executions/month (HTTP + outbox + timers) | ~250,000 |
| Average function execution duration | 500 ms |
| Average function memory allocation | 256 MB |
| Cosmos DB RU per HTTP request (avg read + write + outbox) | ~70 RU |
| Cosmos DB outbox Change Feed reads + updates | ~25 RU/event |
| Cosmos DB background ops (timers, indexing overhead) | +500,000 RU/month |
| Total estimated Cosmos DB RU/month | ~11.5M RU |
| Cosmos DB storage | ~2 GB (dev) / ~3 GB (prod) |
| Log Analytics data ingested | ~1 GB/month (dev) / ~1.5 GB/month (prod) |
| Storage account capacity | ~1 GB (dev) / ~2 GB (prod) |
| Key Vault operations | ~150,000/month (runtime caches refs for 30 min) |
| Outbound ACS emails (OTP + notifications) | ~10,000/month (dev) / ~20,000/month (prod) |
| Outbound ACS SMS (US, critical alerts only) | ~500/month (dev) / ~1,000/month (prod) |
| Azure AD B2C MAU | ~500 (dev) / ~1,000 (prod) |
| Event Grid events/month | ~120,000 |

---

## Monthly Cost Breakdown

### Dev Environment

| Service | Pricing Basis | Calculation | Est. Monthly Cost (USD) |
|---------|--------------|-------------|------------------------|
| **Azure Functions — Executions** | $0.20 / million executions | 250,000 exec × $0.20/M | **$0.05** |
| **Azure Functions — GB-s** | $0.000016 / GB-s | 250,000 × 0.5s × 0.25 GB = 31,250 GB-s × $0.000016 | **$0.50** |
| **Cosmos DB — RU** | $0.25 / million RU | 11.5M RU × $0.25/M | **$2.88** |
| **Cosmos DB — Storage** | $0.25 / GB/month | 2 GB × $0.25 | **$0.50** |
| **Event Grid** | $0.60 / million events | 120,000 events × $0.60/M | **$0.07** |
| **Log Analytics + App Insights** | $2.76 / GB ingested | 1 GB × $2.76 | **$2.76** |
| **Storage Account** | $0.018/GB + ops | 1 GB + 5M ops × $0.0000004 | **$0.04** |
| **Key Vault** | $0.03 / 10,000 operations | 150K ops × $0.03/10K | **$0.45** |
| **ACS — Email** | $0.00025/email | 10,000 emails × $0.00025 | **$2.50** |
| **ACS — SMS (US)** | $0.0075/outbound SMS | 500 SMS × $0.0075 | **$3.75** |
| **Azure AD B2C** | $0.0016/MAU | 500 MAU × $0.0016 | **$0.80** |
| | | | |
| **Total (Dev)** | | | **~$14.30 / month** |

---

### Prod Environment

| Service | Pricing Basis | Calculation | Est. Monthly Cost (USD) |
|---------|--------------|-------------|------------------------|
| **Azure Functions — Executions** | $0.20 / million executions | 250,000 exec × $0.20/M | **$0.05** |
| **Azure Functions — GB-s** | $0.000016 / GB-s | 31,250 GB-s × $0.000016 | **$0.50** |
| **Cosmos DB — RU** | $0.25 / million RU | 11.5M RU × $0.25/M | **$2.88** |
| **Cosmos DB — Storage** | $0.25 / GB/month | 3 GB × $0.25 (more history) | **$0.75** |
| **Event Grid** | $0.60 / million events | 120,000 events × $0.60/M | **$0.07** |
| **Log Analytics + App Insights** | $2.76 / GB ingested | 1.5 GB × $2.76 | **$4.14** |
| **Storage Account** | $0.018/GB + ops | 2 GB + ops | **$0.07** |
| **Key Vault** | $0.03 / 10,000 operations | 150K ops × $0.03/10K | **$0.45** |
| **ACS — Email** | $0.00025/email | 20,000 emails × $0.00025 | **$5.00** |
| **ACS — SMS (US)** | $0.0075/outbound SMS | 1,000 SMS × $0.0075 | **$7.50** |
| **Azure AD B2C** | $0.0016/MAU | 1,000 MAU × $0.0016 | **$1.60** |
| | | | |
| **Total (Prod)** | | | **~$23.01 / month** |

---

## Cost Breakdown by Category (Prod)

```
ACS SMS              $7.50  ████████████████████  33%
ACS Email            $5.00  █████████████         22%
Log Analytics        $4.14  ███████████           18%
Cosmos DB (RU)       $2.88  ████████               13%
Azure AD B2C         $1.60  ████                    7%
Cosmos DB (Storage)  $0.75  ██                      3%
Azure Functions      $0.55  █                       2%
Key Vault            $0.45  █                       2%
Event Grid           $0.07  ▌                       0%
Storage Account      $0.07  ▌                       0%
```

> **Key insight:** Communication costs (SMS + Email) account for ~55% of prod cost.
> If SMS OTP is replaced by TOTP (e.g., Google Authenticator), SMS cost drops to ~$0.

---

## Cost Scaling Projections

| Daily Requests | Monthly Requests | Cosmos DB RU | Functions GB-s | Approx. Total (prod) |
|---------------|-----------------|-------------|----------------|----------------------|
| 4,000 (baseline) | ~120,000 | ~11.5M | ~31,250 | **~$23/month** |
| 10,000 | ~300,000 | ~28M | ~78,000 | **~$34/month** |
| 40,000 | ~1,200,000 | ~112M (~$28) | ~312,000 (~$5) | **~$65/month** |
| 100,000 | ~3,000,000 | ~280M (~$70) | ~781,000 (~$12) | **~$130/month** |

> At ~40K req/day, switch Cosmos DB from serverless to **autoscale provisioned** (e.g., 4,000 RU/s autoscale = ~$24/month). That keeps costs flat as throughput grows.

---

## Cost Optimisation Tips

1. **SMS is the biggest variable cost lever.**
   Replace SMS OTP with TOTP-based MFA (Microsoft/Google Authenticator) to cut ~$7.50/month prod.
   Alternatively, use email-only OTP — ACS email is 30× cheaper than SMS.

2. **Log Analytics sampling** via Application Insights adaptive sampling (enabled by default) can
   reduce ingestion by 50–80% at high volume without losing exception/failure data.

3. **Cosmos DB serverless vs. provisioned autoscale** crossover:
   - Serverless: $0.25/M RU — best under ~30M RU/month
   - Autoscale 4,000 RU/s: ~$24/month flat — better above ~96M RU/month
   - At 4K req/day you're at ~11.5M RU/month → **serverless is optimal**.

4. **Event Grid is essentially free** at this scale. First 100K events are included in the
   standard pricing tier. At 120K events/month the bill is under $0.10.

5. **Key Vault reference caching**: The Functions runtime caches Key Vault references for
   ~30 minutes, keeping operation counts well below billing thresholds.

6. **Azure AD B2C TOTP MFA** is free; only SMS/Phone MFA incurs additional charges.

7. **ACS Email scaling**: 10–20K emails/month at $0.00025 = $2.50–$5.00 — very economical.
   Consider batching digest emails instead of per-event emails to reduce count.

---

## References

| Resource | Pricing Page |
|----------|-------------|
| Azure Functions | https://azure.microsoft.com/pricing/details/functions/ |
| Azure Cosmos DB | https://azure.microsoft.com/pricing/details/cosmos-db/serverless/ |
| Azure Event Grid | https://azure.microsoft.com/pricing/details/event-grid/ |
| Azure Monitor / Log Analytics | https://azure.microsoft.com/pricing/details/monitor/ |
| Azure Key Vault | https://azure.microsoft.com/pricing/details/key-vault/ |
| Azure Communication Services | https://azure.microsoft.com/pricing/details/communication-services/ |
| Azure Storage | https://azure.microsoft.com/pricing/details/storage/blobs/ |
| Azure AD B2C | https://azure.microsoft.com/pricing/details/active-directory/external-identities/ |

> Prices are estimates based on Azure public pricing for East US as of Q1 2026.
> Actual costs may vary. Use the [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
> to model your specific workload before committing.

