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
        services.PostConfigure<InfrastructureSettings>(settings =>
        {
            if (string.IsNullOrWhiteSpace(settings.BlobStorageConnectionString))
                settings.BlobStorageConnectionString = configuration["AzureWebJobsStorage"] ?? string.Empty;
        });
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

        // Resolves the database name for a given container group — one Cosmos account/connection
        // string, split into several databases so no single database exceeds ~10 containers.
        static string DbName(IServiceProvider sp, CosmosDatabaseGroup group) =>
            sp.GetRequiredService<IOptions<InfrastructureSettings>>().Value.GetDatabaseName(group);

        // Repositories — Identity database (societies, apartments, users)
        services.AddScoped<ISocietyRepository>(sp => new SocietyRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Identity),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<SocietyRepository>>()));

        services.AddScoped<IApartmentRepository>(sp => new ApartmentRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Identity),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ApartmentRepository>>()));

        services.AddScoped<IUserRepository>(sp => new UserRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Identity),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<UserRepository>>()));

        // Repositories — Operations database (amenities, complaints, notices, visitors)
        services.AddScoped<IAmenityRepository>(sp => new AmenityRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<AmenityRepository>>()));

        services.AddScoped<IAmenityBookingRepository>(sp => new AmenityBookingRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<AmenityBookingRepository>>()));

        services.AddScoped<IComplaintRepository>(sp => new ComplaintRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ComplaintRepository>>()));

        services.AddScoped<INoticeRepository>(sp => new NoticeRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<NoticeRepository>>()));

        services.AddScoped<IVisitorLogRepository>(sp => new VisitorLogRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VisitorLogRepository>>()));

        services.AddScoped<ISosAlertRepository>(sp => new SosAlertRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Operations),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<SosAlertRepository>>()));

        // Repositories — Staff database (shifts, staff roster, attendance)
        services.AddScoped<IShiftRepository>(sp => new ShiftRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Staff),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ShiftRepository>>()));

        services.AddScoped<IStaffRepository>(sp => new StaffRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Staff),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<StaffRepository>>()));

        services.AddScoped<IStaffAttendanceRepository>(sp => new StaffAttendanceRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Staff),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<StaffAttendanceRepository>>()));

        // Repositories — Finance database (maintenance billing, fees, vendor expenses)
        services.AddScoped<IMaintenanceScheduleRepository>(sp => new MaintenanceScheduleRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MaintenanceScheduleRepository>>()));

        services.AddScoped<IMaintenanceChargeRepository>(sp => new MaintenanceChargeRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MaintenanceChargeRepository>>()));

        services.AddScoped<IMaintenanceChargeGridViewRepository>(sp => new MaintenanceChargeGridViewRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MaintenanceChargeGridViewRepository>>()));

        services.AddScoped<IVendorRepository>(sp => new VendorRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorRepository>>()));

        services.AddScoped<IVendorRecurringScheduleRepository>(sp => new VendorRecurringScheduleRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorRecurringScheduleRepository>>()));

        services.AddScoped<IVendorChargeRepository>(sp => new VendorChargeRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Finance),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<VendorChargeRepository>>()));

        // Repositories — Engagement database (competitions, rewards, service marketplace)
        services.AddScoped<ICompetitionRepository>(sp => new CompetitionRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<CompetitionRepository>>()));

        services.AddScoped<ICompetitionEntryRepository>(sp => new CompetitionEntryRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<CompetitionEntryRepository>>()));

        services.AddScoped<IRewardPointsRepository>(sp => new RewardPointsRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<RewardPointsRepository>>()));

        services.AddScoped<IServiceProviderRepository>(sp => new ServiceProviderRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ServiceProviderRepository>>()));

        services.AddScoped<IServiceProviderRequestRepository>(sp => new ServiceProviderRequestRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ServiceProviderRequestRepository>>()));

        services.AddScoped<IPollRepository>(sp => new PollRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<PollRepository>>()));

        services.AddScoped<IPollVoteRepository>(sp => new PollVoteRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<PollVoteRepository>>()));

        services.AddScoped<IAgmSessionRepository>(sp => new AgmSessionRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Engagement),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<AgmSessionRepository>>()));

        // Repositories — Platform database (outbox, push/mobile notification registrations)
        services.AddScoped<IOutboxRepository>(sp => new OutboxRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Platform),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<OutboxRepository>>()));

        // Push subscriptions (Cosmos container: push-subscriptions)
        services.AddScoped<IPushSubscriptionStore>(sp => new PushSubscriptionRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Platform),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<PushSubscriptionRepository>>()));

        // Mobile push tokens (Cosmos container: mobile-push-tokens)
        services.AddScoped<IMobilePushTokenStore>(sp => new MobilePushTokenRepository(
            sp.GetRequiredService<CosmosClient>(),
            DbName(sp, CosmosDatabaseGroup.Platform),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<MobilePushTokenRepository>>()));

        // Services
        services.AddScoped<IAuthService, JwtAuthService>();
        services.AddScoped<INotificationService>(sp => new NotificationService(
            sp.GetRequiredService<IOptions<InfrastructureSettings>>(),
            sp.GetRequiredService<IPushSubscriptionStore>(),
            sp.GetRequiredService<IMobilePushTokenStore>(),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<NotificationService>>()));
        services.AddScoped<IEventPublisher, OutboxEventPublisher>();
        services.AddScoped<IFileStorageService, BlobFileStorageService>();
        services.AddSingleton<IQrCodeService, QrCodeService>();
        services.AddSingleton<IRateLimitService, InMemoryRateLimitService>();
        services.AddSingleton<ICacheService, InMemoryCacheService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }
}
