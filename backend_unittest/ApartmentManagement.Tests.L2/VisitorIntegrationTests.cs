using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class VisitorIntegrationTests : IntegrationTestBase
{
    private const string SocietyId = "society-visitor-001";

    [Fact]
    public async Task AdminRegisteredVisitor_RequiresResidentApproval_ThenCanCheckInAndCheckOut()
    {
        var apartment = (await Mediator.Send(new CreateApartmentCommand(
            SocietyId, "A-101", "A", 1, 2, ["P1"], null, 900, 1000, 1100))).Value!;

        var resident = (await Mediator.Send(new CreateUserCommand(
            SocietyId, "Owner Resident", "owner.visitor@test.com", "+91-9000000001",
            UserRole.SUUser, ResidentType.Owner, apartment.Id))).Value!;

        CurrentUserService.UserId = "security-user";
        CurrentUserService.Role = UserRole.SUAdmin.ToString();

        var registerResult = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Gate Visitor",
            "+91-9111111111",
            "gate.visitor@test.com",
            "Delivery",
            apartment.Id,
            null,
            null));

        registerResult.IsSuccess.Should().BeTrue();
        registerResult.Value!.Status.Should().Be("Pending");
        registerResult.Value.RequiresApproval.Should().BeTrue();
        registerResult.Value.HostUserId.Should().Be(resident.Id);
        NotificationService.SentPushNotifications.Should().Contain(notification => notification.UserId == resident.Id);

        CurrentUserService.UserId = resident.Id;
        CurrentUserService.Role = UserRole.SUUser.ToString();

        var pendingApprovals = await Mediator.Send(new GetPendingVisitorApprovalsQuery(
            SocietyId,
            new PaginationParams { Page = 1, PageSize = 20 }));

        pendingApprovals.IsSuccess.Should().BeTrue();
        pendingApprovals.Value!.Items.Should().ContainSingle(item => item.Id == registerResult.Value.Id);

        var approveResult = await Mediator.Send(new ApproveVisitorCommand(SocietyId, registerResult.Value.Id));
        approveResult.IsSuccess.Should().BeTrue();
        approveResult.Value!.Status.Should().Be("Approved");

        var checkInResult = await Mediator.Send(new CheckInVisitorCommand(SocietyId, registerResult.Value.Id));
        checkInResult.IsSuccess.Should().BeTrue();
        checkInResult.Value!.Status.Should().Be("CheckedIn");

        var checkOutResult = await Mediator.Send(new CheckOutVisitorCommand(SocietyId, registerResult.Value.Id));
        checkOutResult.IsSuccess.Should().BeTrue();
        checkOutResult.Value!.Status.Should().Be("CheckedOut");
    }

    [Fact]
    public async Task ResidentCreatedVisitorPass_IsPreApproved_AndAppearsInMyVisitors()
    {
        var apartment = (await Mediator.Send(new CreateApartmentCommand(
            SocietyId, "B-202", "B", 2, 3, ["P2"], null, 950, 1100, 1200))).Value!;

        var resident = (await Mediator.Send(new CreateUserCommand(
            SocietyId, "Tenant Resident", "tenant.visitor@test.com", "+91-9000000002",
            UserRole.SUUser, ResidentType.Tenant, apartment.Id))).Value!;

        CurrentUserService.UserId = resident.Id;
        CurrentUserService.Role = UserRole.SUUser.ToString();

        var registerResult = await Mediator.Send(new RegisterVisitorCommand(
            SocietyId,
            "Family Guest",
            "+91-9222222222",
            null,
            "Family visit",
            apartment.Id,
            resident.Id,
            "WB-12-AB-1234"));

        registerResult.IsSuccess.Should().BeTrue();
        registerResult.Value!.Status.Should().Be("Approved");
        registerResult.Value.RequiresApproval.Should().BeFalse();
        registerResult.Value.CanCheckIn.Should().BeTrue();
        registerResult.Value.HostApartmentNumber.Should().Be("B-202");

        var myVisitors = await Mediator.Send(new GetMyVisitorsQuery(
            SocietyId,
            DateOnly.FromDateTime(DateTime.UtcNow.Date),
            DateOnly.FromDateTime(DateTime.UtcNow.Date),
            apartment.Id,
            null,
            null,
            new PaginationParams { Page = 1, PageSize = 20 }));

        myVisitors.IsSuccess.Should().BeTrue();
        myVisitors.Value!.Items.Should().ContainSingle(item => item.Id == registerResult.Value.Id);
    }
}
