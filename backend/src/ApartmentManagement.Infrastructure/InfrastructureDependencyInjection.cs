using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Infrastructure.Repositories;
using ApartmentManagement.Infrastructure.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure;

public static class InfrastructureDependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<InfrastructureSettings>(configuration.GetSection("Infrastructure"));
       // services.ConfigureFunctionsWebApplication(ChainedBuilderExtensions=>)
        services.AddHttpContextAccessor();
        services.AddSingleton<CosmosClient>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value;
            return new CosmosClient(settings.CosmosDbConnectionString, new CosmosClientOptions
            {
                Serializer = new CosmosNewtonsoftSerializer(),
                MaxRetryAttemptsOnRateLimitedRequests = 9,
                MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30)
            });
        });

        // Repositories
        services.AddScoped<ISocietyRepository>(sp => new SocietyRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<SocietyRepository>>()));

        services.AddScoped<IApartmentRepository>(sp => new ApartmentRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ApartmentRepository>>()));

        services.AddScoped<IUserRepository>(sp => new UserRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<UserRepository>>()));

        services.AddScoped<IAmenityRepository>(sp => new AmenityRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<AmenityRepository>>()));

        services.AddScoped<IAmenityBookingRepository>(sp => new AmenityBookingRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<AmenityBookingRepository>>()));

        services.AddScoped<IComplaintRepository>(sp => new ComplaintRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ComplaintRepository>>()));

        services.AddScoped<INoticeRepository>(sp => new NoticeRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<NoticeRepository>>()));

        services.AddScoped<IVisitorLogRepository>(sp => new VisitorLogRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VisitorLogRepository>>()));

        services.AddScoped<IMaintenanceScheduleRepository>(sp => new MaintenanceScheduleRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MaintenanceScheduleRepository>>()));

        services.AddScoped<IMaintenanceChargeRepository>(sp => new MaintenanceChargeRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MaintenanceChargeRepository>>()));

        services.AddScoped<ICompetitionRepository>(sp => new CompetitionRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<CompetitionRepository>>()));

        services.AddScoped<ICompetitionEntryRepository>(sp => new CompetitionEntryRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<CompetitionEntryRepository>>()));

        services.AddScoped<IRewardPointsRepository>(sp => new RewardPointsRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RewardPointsRepository>>()));

        services.AddScoped<IServiceProviderRepository>(sp => new ServiceProviderRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ServiceProviderRepository>>()));

        services.AddScoped<IServiceProviderRequestRepository>(sp => new ServiceProviderRequestRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ServiceProviderRequestRepository>>()));

        services.AddScoped<IVendorRepository>(sp => new VendorRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorRepository>>()));

        services.AddScoped<IVendorRecurringScheduleRepository>(sp => new VendorRecurringScheduleRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorRecurringScheduleRepository>>()));

        services.AddScoped<IVendorChargeRepository>(sp => new VendorChargeRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorChargeRepository>>()));

        services.AddScoped<IOutboxRepository>(sp => new OutboxRepository(
            sp.GetRequiredService<CosmosClient>(),
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.CosmosDbDatabaseName,
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<OutboxRepository>>()));

        // Services
        services.AddScoped<IAuthService, JwtAuthService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IEventPublisher, OutboxEventPublisher>();
        services.AddScoped<IFileStorageService, BlobFileStorageService>();
        services.AddSingleton<IQrCodeService, QrCodeService>();
        services.AddSingleton<IRateLimitService, InMemoryRateLimitService>();
        services.AddSingleton<ICacheService, InMemoryCacheService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        

        return services;
    }
}
