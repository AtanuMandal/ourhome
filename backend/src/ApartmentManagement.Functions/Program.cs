using ApartmentManagement.Application;
using ApartmentManagement.Functions;
using ApartmentManagement.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebPush;

// Azure SDK clients (Cosmos DB, Blob Storage, Event Grid, ACS) emit their own Activity spans
// once this switch is on — enables Cosmos/Blob/etc. dependency spans under every request trace
// with zero extra instrumentation code. Must be set before any Azure SDK client is constructed.
AppContext.SetSwitch("Azure.Experimental.EnableActivitySource", true);

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        // Outermost: maps pipeline exceptions (validation, forbidden, not-found) to
        // structured HTTP responses instead of unhandled 500s.
        builder.UseMiddleware<ExceptionHandlingMiddleware>();
        builder.UseMiddleware<HttpContextAccessorMiddleware>();
        // Runs after the caller identity is populated (so it can stamp it onto the span) and
        // inside the exception handler (so a bug here still yields a clean error response).
        builder.UseMiddleware<TelemetryEnrichmentMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        var jwtSecret = context.Configuration["Infrastructure:JwtSecret"] ?? new InfrastructureSettings().JwtSecret;
        var jwtIssuer = context.Configuration["Infrastructure:JwtIssuer"] ?? new InfrastructureSettings().JwtIssuer;
        var jwtAudience = context.Configuration["Infrastructure:JwtAudience"] ?? new InfrastructureSettings().JwtAudience;

        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddApplication();
        services.AddInfrastructure(context.Configuration);

        // ── OpenTelemetry (see requirements/telemetry_observability.md) ────────────────────
        // Additive to the Application Insights Worker Service SDK above — that keeps shipping
        // host-level function/trigger telemetry unchanged. This pipeline is for our own spans:
        // request/response body capture, errorId correlation, and Cosmos/Blob/EventGrid/ACS
        // dependency spans (via the Activity source switch above). Exported via OTLP only —
        // never directly to Azure Monitor from the app, which would double-report telemetry
        // against the same App Insights resource the classic SDK already writes to. OTLP
        // targets the local dev container (infra/observability/docker-compose.yml) or a
        // production Collector, which is the one place that then fans out to Azure Monitor.
        var otlpEndpoint = context.Configuration["Infrastructure:OtelExporterOtlpEndpoint"];
        var otelServiceName = context.Configuration["Infrastructure:OtelServiceName"] ?? "ourhome-functions";

        // Two things must both be right for the OTLP/HTTP exporter to actually deliver
        // anything — verified against a real running collector (infra/observability), since
        // both failure modes are completely silent (no exception, no log, nothing):
        //   1. Protocol: the SDK defaults to gRPC regardless of the port in Endpoint. Port 4318
        //      is the collector's HTTP receiver (4317 is gRPC) — HttpProtobuf is the correct
        //      pairing for it.
        //   2. Path: the SDK only auto-appends the per-signal path (/v1/traces, /v1/logs,
        //      /v1/metrics) when the endpoint comes from the OTEL_EXPORTER_OTLP_ENDPOINT *env
        //      var*. Setting Endpoint explicitly in code (as below) requires appending the
        //      signal-specific path yourself, or every export 404s against the collector root.
        Uri OtlpUri(string signalPath) => new(new Uri(otlpEndpoint!), signalPath);

        services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService(
                serviceName: otelServiceName,
                serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString()))
            .WithTracing(tracing =>
            {
                tracing
                    .AddSource("Azure.*")
                    .AddSource("OurHome.ClientRelay")
                    .AddAspNetCoreInstrumentation()
                    // Excludes the OTLP exporter's own outbound POSTs to the collector from
                    // being instrumented as HttpClient spans. Without this, each export call
                    // generates a new Activity that feeds back into the same trace pipeline
                    // it's draining — observed in this environment as exactly one successful
                    // export per host start, then silence (logs/metrics, which don't use
                    // HttpClientInstrumentation, kept flowing normally the whole time).
                    .AddHttpClientInstrumentation(o =>
                        o.FilterHttpRequestMessage = req =>
                            string.IsNullOrWhiteSpace(otlpEndpoint) ||
                            !req.RequestUri!.ToString().StartsWith(otlpEndpoint, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                    tracing.AddOtlpExporter(o =>
                    {
                        o.Endpoint = OtlpUri("v1/traces");
                        o.Protocol = OtlpExportProtocol.HttpProtobuf;
                    });
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddRuntimeInstrumentation();
                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                    metrics.AddOtlpExporter(o =>
                    {
                        o.Endpoint = OtlpUri("v1/metrics");
                        o.Protocol = OtlpExportProtocol.HttpProtobuf;
                    });
            })
            .WithLogging(logging =>
            {
                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                    logging.AddOtlpExporter(o =>
                    {
                        o.Endpoint = OtlpUri("v1/logs");
                        o.Protocol = OtlpExportProtocol.HttpProtobuf;
                    });
            });

        // Ensure all HTTP responses use camelCase JSON
        services.ConfigureHttpJsonOptions(o =>
            {
                o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        services.AddAuthorization();
    })
    .Build();

// If VAPID keys are missing or both are the same value (misconfigured), generate and print valid ones.
var config = host.Services.GetRequiredService<IConfiguration>();
var pubKey  = config["Infrastructure:VapidPublicKey"]  ?? string.Empty;
var privKey = config["Infrastructure:VapidPrivateKey"] ?? string.Empty;
if (string.IsNullOrWhiteSpace(pubKey) || string.IsNullOrWhiteSpace(privKey) || pubKey == privKey)
{
    var keys = VapidHelper.GenerateVapidKeys();
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║   VAPID keys are not configured or invalid. Generated new keys:  ║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════════════╣");
    Console.WriteLine($"║  VapidPublicKey : {keys.PublicKey,-49}║");
    Console.WriteLine($"║  VapidPrivateKey: {keys.PrivateKey,-49}║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════════════╣");
    Console.WriteLine("║  Paste both values into local.settings.json under the           ║");
    Console.WriteLine("║  Infrastructure:VapidPublicKey / VapidPrivateKey keys.          ║");
    Console.WriteLine("║  Also copy VapidPublicKey to the Angular environment files.     ║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════════════╝");
    Console.WriteLine();
    Console.ResetColor();
}

// Ensure the Cosmos DB database and all containers exist before accepting requests.
using (var scope = host.Services.CreateScope())
{
    var cosmosClient = scope.ServiceProvider.GetRequiredService<CosmosClient>();
    var settings     = scope.ServiceProvider.GetRequiredService<IOptions<InfrastructureSettings>>().Value;
    var logger       = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
                            .CreateLogger(nameof(CosmosDbInitializer));
    await CosmosDbInitializer.InitializeAsync(cosmosClient, settings, logger);
}

await host.RunAsync();
