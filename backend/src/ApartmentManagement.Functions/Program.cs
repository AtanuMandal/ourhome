using ApartmentManagement.Application;
using ApartmentManagement.Infrastructure;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using System.Text.Json.Serialization;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddApplication();
        services.AddInfrastructure(context.Configuration);

        // Ensure all HTTP responses use camelCase JSON
        services.ConfigureHttpJsonOptions(o =>
            { o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
              o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

        services.AddAuthentication("Bearer")
            .AddJwtBearer("Bearer", options =>
            {
                options.Authority = context.Configuration["AzureAdB2C:Authority"];
                options.Audience = context.Configuration["AzureAdB2C:ClientId"];
            });
        services.AddAuthorization();
    })
    .Build();

host.Run();
