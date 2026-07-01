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
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebPush;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        builder.UseMiddleware<HttpContextAccessorMiddleware>();
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

// Ensure Cosmos DB database and all containers exist before accepting requests.
// using (var scope = host.Services.CreateScope())
// {
//     var cosmosClient = scope.ServiceProvider.GetRequiredService<CosmosClient>();
//     var settings     = scope.ServiceProvider.GetRequiredService<IOptions<InfrastructureSettings>>().Value;
//     var logger       = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
//                             .CreateLogger(nameof(CosmosDbInitializer));
//     await CosmosDbInitializer.InitializeAsync(cosmosClient, settings.CosmosDbDatabaseName, logger);
// }

await host.RunAsync();
