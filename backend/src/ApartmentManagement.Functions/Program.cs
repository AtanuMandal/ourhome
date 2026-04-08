using ApartmentManagement.Application;
using ApartmentManagement.Infrastructure;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddApplication();
        services.AddInfrastructure(context.Configuration);
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
