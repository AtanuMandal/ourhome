using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Queries.Notice;
using ApartmentManagement.Application.Queries.ServiceProvider;
using ApartmentManagement.Application.Queries.Visitor;
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
        var register = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Alex Visitor",
            "+91-9900011111",
            "alex@test.com",
            "Delivery",
            ApartmentId,
            UserId,
            "WB12AB1234"));

        register.IsSuccess.Should().BeTrue();
        register.Value!.Status.Should().Be("Pending");
        register.Value.QrCode.Should().StartWith("fake-qr-");
        NotificationService.SentPushNotifications.Should().Contain(n => n.UserId == UserId && n.Title == "Visitor Request");

        var visitor = register.Value;
        var approve = await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, UserId));
        approve.IsSuccess.Should().BeTrue();

        var checkIn = await Mediator.Send(new CheckInVisitorCommand(SocietyId, visitor.Id, visitor.PassCode));
        checkIn.IsSuccess.Should().BeTrue();

        var active = await Mediator.Send(new GetActiveVisitorsQuery(SocietyId));
        active.IsSuccess.Should().BeTrue();
        active.Value!.Should().ContainSingle(v => v.Id == visitor.Id);

        var checkOut = await Mediator.Send(new CheckOutVisitorCommand(SocietyId, visitor.Id));
        checkOut.IsSuccess.Should().BeTrue();

        var byApartment = await Mediator.Send(new GetVisitorsByApartmentQuery(
            SocietyId,
            ApartmentId,
            new PaginationParams { Page = 1, PageSize = 20 }));
        byApartment.IsSuccess.Should().BeTrue();
        byApartment.Value!.Items.Should().ContainSingle(v => v.Id == visitor.Id && v.Status == "CheckedOut");

        EventPublisher.PublishedEvents.Should().Contain(e => e.GetType().Name == "VisitorArrivedEvent");
    }

    [Fact]
    public async Task CheckInVisitor_WithInvalidPassCode_ReturnsFailure()
    {
        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Jordan Visitor",
            "+91-9900022222",
            null,
            "Guest",
            ApartmentId,
            UserId,
            null))).Value!;

        await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, UserId));

        var invalid = await Mediator.Send(new CheckInVisitorCommand(SocietyId, visitor.Id, "000000"));
        invalid.IsFailure.Should().BeTrue();
        invalid.ErrorCode.Should().Be(ErrorCodes.InvalidPassCode);
    }

    [Fact]
    public async Task ApproveVisitor_WhenNotHostOrAdmin_ReturnsForbidden()
    {
        var visitor = (await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Casey Visitor",
            "+91-9900033333",
            null,
            "Friend visit",
            ApartmentId,
            UserId,
            null))).Value!;

        CurrentUserService.Role = "SUUser";
        var forbidden = await Mediator.Send(new ApproveVisitorCommand(SocietyId, visitor.Id, "another-user"));

        forbidden.IsFailure.Should().BeTrue();
        forbidden.ErrorCode.Should().Be(ErrorCodes.Forbidden);
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
