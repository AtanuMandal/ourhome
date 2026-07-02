using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Queries.Notice;
using ApartmentManagement.Application.Queries.ServiceProvider;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class NoticeVisitorServiceProviderIntegrationTests : IntegrationTestBase
{
    private const string SocietyId = "society-nvs-001";
    private const string UserId = "user-nvs-001";
    private const string ApartmentId = "apt-nvs-001";

    [Fact]
    public async Task NoticeLifecycle_CreateUpdateArchiveDelete_WorksEndToEnd()
    {
        var create = await Mediator.Send(new CreateNoticeCommand(
            SocietyId,
            UserId,
            "Water Shutdown",
            "Water supply will be off for maintenance.",
            NoticeCategory.Maintenance,
            DateTime.UtcNow,
            DateTime.UtcNow.AddDays(2),
            [ApartmentId]));

        create.IsSuccess.Should().BeTrue();
        EventPublisher.PublishedEvents.Should().Contain(e => e.GetType().Name == "NoticePostedEvent");

        var noticeId = create.Value!.Id;
        var update = await Mediator.Send(new UpdateNoticeCommand(
            SocietyId,
            noticeId,
            "Water Shutdown Updated",
            "Maintenance moved by one hour.",
            DateTime.UtcNow.AddDays(3)));

        update.IsSuccess.Should().BeTrue();
        update.Value!.Title.Should().Be("Water Shutdown Updated");

        var archive = await Mediator.Send(new ArchiveNoticeCommand(SocietyId, noticeId));
        archive.IsSuccess.Should().BeTrue();

        var archived = await Mediator.Send(new GetArchivedNoticesQuery(
            SocietyId,
            new PaginationParams { Page = 1, PageSize = 20 }));
        archived.IsSuccess.Should().BeTrue();
        archived.Value!.Items.Should().ContainSingle(n => n.Id == noticeId);

        var delete = await Mediator.Send(new DeleteNoticeCommand(SocietyId, noticeId));
        delete.IsSuccess.Should().BeTrue();

        var missing = await Mediator.Send(new GetNoticeQuery(SocietyId, noticeId));
        missing.IsFailure.Should().BeTrue();
        missing.ErrorCode.Should().Be(ErrorCodes.NoticeNotFound);
    }

    [Fact]
    public async Task GetActiveNotices_WithCategoryFilter_ReturnsOnlyMatchingNotices()
    {
        await Mediator.Send(new CreateNoticeCommand(
            SocietyId,
            UserId,
            "General FYI",
            "General notice",
            NoticeCategory.General,
            DateTime.UtcNow,
            null,
            []));

        await Mediator.Send(new CreateNoticeCommand(
            SocietyId,
            UserId,
            "Emergency Alert",
            "Emergency notice",
            NoticeCategory.Emergency,
            DateTime.UtcNow,
            null,
            []));

        var filtered = await Mediator.Send(new GetActiveNoticesQuery(
            SocietyId,
            NoticeCategory.Emergency,
            new PaginationParams { Page = 1, PageSize = 20 }));

        filtered.IsSuccess.Should().BeTrue();
        filtered.Value!.Items.Should().NotBeEmpty();
        filtered.Value.Items.Should().OnlyContain(n => n.Category == "Emergency");
    }

    [Fact]
    public async Task ArchiveExpiredNoticesCommand_ReturnsSuccess()
    {
        var result = await Mediator.Send(new ArchiveExpiredNoticesCommand());

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(0);
    }

    [Fact]
    public async Task VisitorLifecycle_RegisterApproveCheckInCheckOut_UpdatesStatusAndQueries()
    {
        var (apartmentId, residentUserId, residentName) = await SeedVisitorContextAsync();

        var register = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Alex Visitor",
            "+91-9900011111",
            "alex@test.com",
            "Delivery",
            apartmentId,
            "Amazon",
            "WB12AB1234",
            false));

        register.IsSuccess.Should().BeTrue();
        register.Value!.Status.Should().Be("Pending");
        register.Value.QrCode.Should().StartWith("fake-qr-");
        register.Value.HostResidentName.Should().Be(residentName);
        NotificationService.SentPushNotifications.Should().Contain(n => n.UserId == residentUserId && n.Title == "Visitor Request");

        var visitor = register.Value;
        var approve = await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, residentUserId));
        approve.IsSuccess.Should().BeTrue();

        var checkIn = await Mediator.Send(new CheckInVisitorCommand(SocietyId, visitor.PassCode));
        checkIn.IsSuccess.Should().BeTrue();

        var active = await Mediator.Send(new GetActiveVisitorsQuery(SocietyId));
        active.IsSuccess.Should().BeTrue();
        active.Value!.Should().ContainSingle(v => v.Id == visitor.Id);

        var checkOut = await Mediator.Send(new CheckOutVisitorCommand(SocietyId, visitor.Id));
        checkOut.IsSuccess.Should().BeTrue();

        var byApartment = await Mediator.Send(new GetVisitorsByApartmentQuery(
            SocietyId,
            apartmentId,
            null,
            null,
            null,
            null,
            null,
            new PaginationParams { Page = 1, PageSize = 20 }));
        byApartment.IsSuccess.Should().BeTrue();
        byApartment.Value!.Items.Should().ContainSingle(v => v.Id == visitor.Id && v.Status == "CheckedOut");

        EventPublisher.PublishedEvents.Should().Contain(e => e.GetType().Name == "VisitorArrivedEvent");
    }

    [Fact]
    public async Task CheckInVisitor_WithInvalidPassCode_ReturnsFailure()
    {
        var (apartmentId, residentUserId, _) = await SeedVisitorContextAsync();

        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Jordan Visitor",
            "+91-9900022222",
            null,
            "Guest",
            apartmentId,
            null,
            null,
            false))).Value!;

        await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, residentUserId));

        var invalid = await Mediator.Send(new CheckInVisitorCommand(SocietyId, "000000"));
        invalid.IsFailure.Should().BeTrue();
        invalid.ErrorCode.Should().Be(ErrorCodes.InvalidPassCode);
    }

    [Fact]
    public async Task ApproveVisitor_WhenNotHostOrAdmin_ReturnsForbidden()
    {
        var (apartmentId, _, _) = await SeedVisitorContextAsync();

        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Casey Visitor",
            "+91-9900033333",
            null,
            "Friend visit",
            apartmentId,
            null,
            null,
            false))).Value!;

        CurrentUserService.Role = "SUUser";
        var forbidden = await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, "another-user"));

        forbidden.IsFailure.Should().BeTrue();
        forbidden.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task ApproveVisitor_BySUSecurity_Succeeds()
    {
        var (apartmentId, _, _) = await SeedVisitorContextAsync();

        CurrentUserService.Role = "SUAdmin";
        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Security Test Visitor",
            "+91-9800011111",
            null,
            "Delivery",
            apartmentId,
            null,
            null,
            false))).Value!;

        CurrentUserService.Role = "SUSecurity";
        var approve = await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, "security-guard-001"));

        approve.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task DenyVisitor_BySUSecurity_Succeeds()
    {
        var (apartmentId, _, _) = await SeedVisitorContextAsync();

        CurrentUserService.Role = "SUAdmin";
        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Security Deny Visitor",
            "+91-9800022222",
            null,
            "Suspicious",
            apartmentId,
            null,
            null,
            false))).Value!;

        CurrentUserService.Role = "SUSecurity";
        var deny = await Mediator.Send(new DenyVisitorCommand(SocietyId, visitor.Id, "security-guard-001"));

        deny.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task VisitorQueries_PreApprovedFilterVerifyAndExport_Work()
    {
        var (apartmentId, residentUserId, _) = await SeedVisitorContextAsync();
        CurrentUserService.Role = "SUUser";
        CurrentUserService.UserId = residentUserId;

        var preApproved = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Sam Delivery",
            "+91-9012345678",
            null,
            "Groceries",
            apartmentId,
            "Swiggy",
            "WB11AA1111",
            true));

        preApproved.IsSuccess.Should().BeTrue();
        preApproved.Value!.Status.Should().Be("Approved");
        preApproved.Value.IsPreApproved.Should().BeTrue();

        var verified = await Mediator.Send(new GetVisitorByPassCodeQuery(SocietyId, preApproved.Value.PassCode));
        verified.IsSuccess.Should().BeTrue();
        verified.Value!.VisitorName.Should().Be("Sam Delivery");

        var filtered = await Mediator.Send(new GetVisitorsBySocietyQuery(
            SocietyId,
            apartmentId,
            "Sam",
            null,
            "Approved",
            null,
            null,
            new PaginationParams { Page = 1, PageSize = 20 }));

        filtered.IsSuccess.Should().BeTrue();
        filtered.Value!.Items.Should().ContainSingle(v => v.Id == preApproved.Value.Id);

        var exported = await Mediator.Send(new ExportVisitorsQuery(
            SocietyId,
            apartmentId,
            "Sam",
            null,
            null,
            null,
            null));

        exported.IsSuccess.Should().BeTrue();
        exported.Value!.ContentType.Should().Be("text/csv");
        System.Text.Encoding.UTF8.GetString(exported.Value.Content).Should().Contain("Sam Delivery");
    }

    [Fact]
    public async Task GetPublicVisitorPass_WithValidPreApprovedPass_ReturnsPublicInfoWithoutSensitiveData()
    {
        var (apartmentId, residentUserId, _) = await SeedVisitorContextAsync();
        CurrentUserService.UserId = residentUserId;
        CurrentUserService.Role = "SUUser";

        var registered = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId, "Public Pass Visitor", "+91-9800033333", "visitor@private.com",
            "Guest Visit", apartmentId, null, null, true, ValidityHours: 4));

        registered.IsSuccess.Should().BeTrue();
        var passCode = registered.Value!.PassCode;

        var publicPass = await Mediator.Send(new GetPublicVisitorPassQuery(passCode));

        publicPass.IsSuccess.Should().BeTrue();
        publicPass.Value!.VisitorName.Should().Be("Public Pass Visitor");
        publicPass.Value.IsPassExpired.Should().BeFalse();
        publicPass.Value.ValidUntil.Should().NotBeNull();
    }

    [Fact]
    public async Task GetPublicVisitorPass_WithInvalidPassCode_ReturnsFailure()
    {
        var publicPass = await Mediator.Send(new GetPublicVisitorPassQuery("000000"));

        publicPass.IsFailure.Should().BeTrue();
        publicPass.ErrorCode.Should().Be(ErrorCodes.InvalidPassCode);
    }

    private async Task<(string ApartmentId, string ResidentUserId, string ResidentName)> SeedVisitorContextAsync()
    {
        var apartment = ApartmentRepo.Store.Values.FirstOrDefault(existing => existing.SocietyId == SocietyId)
            ?? Apartment.Create(SocietyId, "A-101", "A", 1, 3, [], 500, 600, 700);

        if (!ApartmentRepo.Store.ContainsKey(apartment.Id))
            await ApartmentRepo.CreateAsync(apartment, CancellationToken.None);

        var resident = UserRepo.Store.Values.FirstOrDefault(existing => existing.SocietyId == SocietyId && existing.ApartmentId == apartment.Id)
            ?? User.Create(SocietyId, "Resident User", "resident@example.com", "+91-9999999999", UserRole.SUUser, ResidentType.Owner, apartment.Id);

        if (!UserRepo.Store.ContainsKey(resident.Id))
            await UserRepo.CreateAsync(resident, CancellationToken.None);

        if (!apartment.GetResidentsForRead().Any(existing => existing.UserId == resident.Id))
        {
            apartment.AssignOwner(resident.Id, resident.FullName);
            await ApartmentRepo.UpdateAsync(apartment, CancellationToken.None);
        }

        return (apartment.Id, resident.Id, resident.FullName);
    }

    [Fact]
    public async Task RegisterAndApproveProvider_ThenGetProvidersByType_ReturnsApprovedProvider()
    {
        var register = await Mediator.Send(new RegisterServiceProviderCommand(
            "FixIt Services",
            "Ravi Kumar",
            "+91-9888800000",
            "ravi@fixit.com",
            ["Plumbing"],
            "Plumbing and maintenance",
            null));

        register.IsSuccess.Should().BeTrue();
        register.Value!.Status.Should().Be("Pending");

        var approve = await Mediator.Send(new ApproveServiceProviderCommand(register.Value.Id));
        approve.IsSuccess.Should().BeTrue();

        var providers = await Mediator.Send(new GetServiceProvidersQuery(
            "Plumbing",
            new PaginationParams { Page = 1, PageSize = 20 }));

        providers.IsSuccess.Should().BeTrue();
        providers.Value!.Items.Should().ContainSingle(p => p.Id == register.Value.Id && p.Status == "Approved");
    }

    [Fact]
    public async Task ServiceRequestLifecycle_CreateAcceptCompleteReviewAndQuery_Works()
    {
        var register = await Mediator.Send(new RegisterServiceProviderCommand(
            "Society Electrician",
            "Anil Sharma",
            "+91-9777700000",
            "anil@electric.com",
            ["Electrical"],
            "Electrical maintenance",
            SocietyId));
        register.IsSuccess.Should().BeTrue();

        var provider = ServiceProviderRepo.Store[register.Value!.Id];
        provider.Approve();
        await ServiceProviderRepo.UpdateAsync(provider, CancellationToken.None);

        var createdRequest = await Mediator.Send(new CreateServiceRequestCommand(
            SocietyId,
            ApartmentId,
            UserId,
            "Electrical",
            "Switch board issue",
            DateTime.UtcNow.AddDays(1)));

        createdRequest.IsSuccess.Should().BeTrue();
        createdRequest.Value!.Status.Should().Be("Open");
        NotificationService.SentEmails.Should().Contain(e => e.To == "anil@electric.com" && e.Subject == "New Service Request");

        var accept = await Mediator.Send(new AcceptServiceRequestCommand(
            SocietyId,
            createdRequest.Value.Id,
            register.Value.Id));
        accept.IsSuccess.Should().BeTrue();

        var complete = await Mediator.Send(new CompleteServiceRequestCommand(SocietyId, createdRequest.Value.Id));
        complete.IsSuccess.Should().BeTrue();

        var review = await Mediator.Send(new AddServiceReviewCommand(
            SocietyId,
            createdRequest.Value.Id,
            UserId,
            5,
            "Resolved quickly"));
        review.IsSuccess.Should().BeTrue();

        var openRequests = await Mediator.Send(new GetServiceRequestsQuery(
            SocietyId,
            ServiceRequestStatus.Open,
            new PaginationParams { Page = 1, PageSize = 20 }));
        openRequests.IsSuccess.Should().BeTrue();
        openRequests.Value!.Items.Should().BeEmpty();

        var myRequests = await Mediator.Send(new GetMyServiceRequestsQuery(
            SocietyId,
            ApartmentId,
            new PaginationParams { Page = 1, PageSize = 20 }));
        myRequests.IsSuccess.Should().BeTrue();
        myRequests.Value!.Items.Should().ContainSingle(r =>
            r.Id == createdRequest.Value.Id &&
            r.Status == "Completed" &&
            r.Rating == 5 &&
            r.ReviewComment == "Resolved quickly");
    }

    [Fact]
    public async Task AcceptServiceRequest_WithPendingProvider_ReturnsNotApproved()
    {
        var pendingProvider = (await Mediator.Send(new RegisterServiceProviderCommand(
            "Pending Provider",
            "Mohan",
            "+91-9666600000",
            "mohan@pending.com",
            ["Carpentry"],
            "Carpentry work",
            SocietyId))).Value!;

        var createdRequest = (await Mediator.Send(new CreateServiceRequestCommand(
            SocietyId,
            ApartmentId,
            UserId,
            "Carpentry",
            "Fix wardrobe",
            DateTime.UtcNow.AddDays(1)))).Value!;

        var result = await Mediator.Send(new AcceptServiceRequestCommand(
            SocietyId,
            createdRequest.Id,
            pendingProvider.Id));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ServiceProviderNotApproved);
    }
}
