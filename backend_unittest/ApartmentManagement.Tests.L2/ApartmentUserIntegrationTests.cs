using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class ApartmentUserIntegrationTests : IntegrationTestBase
{
    private const string SocietyId = "society-001";

    // ─── Helper factories ─────────────────────────────────────────────────────

    private static CreateApartmentCommand AptCmd(
        string number = "101", string block = "A", int floor = 1,
        int rooms = 2, int parking = 1, string? ownerId = null) =>
        new(SocietyId, number, block, floor, rooms, parking, ownerId);

    private static CreateUserCommand UserCmd(
        string email = "resident@test.com",
        UserRole role = UserRole.Owner,
        string? apartmentId = null) =>
        new(SocietyId, "John Resident", email, "+91-9876543210", role, apartmentId);

    // ─── Apartment: create → retrieve ────────────────────────────────────────

    [Fact]
    public async Task CreateApartment_ThenGetById_ReturnsApartment()
    {
        var createResult = await Mediator.Send(AptCmd());

        createResult.IsSuccess.Should().BeTrue();
        var apt = createResult.Value!;
        apt.ApartmentNumber.Should().Be("101");
        apt.BlockName.Should().Be("A");
        apt.FloorNumber.Should().Be(1);
        apt.NumberOfRooms.Should().Be(2);
        apt.Status.Should().Be("Available");
        apt.OwnerId.Should().BeNull();

        var getResult = await Mediator.Send(new GetApartmentQuery(SocietyId, apt.Id));
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(apt.Id);
    }

    [Fact]
    public async Task CreateApartment_WithOwner_OwnerIdIsSet()
    {
        var result = await Mediator.Send(AptCmd("102", "A", 1, 3, 0, "owner-user-id"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.OwnerId.Should().Be("owner-user-id");
    }

    [Fact]
    public async Task CreateApartment_DuplicateUnitNumber_ReturnsFailure()
    {
        await Mediator.Send(AptCmd("201", "B"));

        var duplicate = await Mediator.Send(AptCmd("201", "B"));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.ApartmentNumberDuplicate);
    }

    // ─── Apartment: update ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateApartment_ChangesArePersisted()
    {
        var apt = (await Mediator.Send(AptCmd("301", "C", 2, 2, 0))).Value!;

        var updateResult = await Mediator.Send(new UpdateApartmentCommand(SocietyId, apt.Id, "C", 3, 4, 2));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.FloorNumber.Should().Be(3);
        updateResult.Value.NumberOfRooms.Should().Be(4);
    }

    // ─── Apartment: change status ─────────────────────────────────────────────

    [Fact]
    public async Task ChangeApartmentStatus_ToUnderMaintenance_Succeeds()
    {
        var apt = (await Mediator.Send(AptCmd("401", "D", 4, 3, 0))).Value!;

        var statusResult = await Mediator.Send(new ChangeApartmentStatusCommand(
            SocietyId, apt.Id, ApartmentStatus.UnderMaintenance, "Annual maintenance"));

        statusResult.IsSuccess.Should().BeTrue();

        var getResult = await Mediator.Send(new GetApartmentQuery(SocietyId, apt.Id));
        getResult.Value!.Status.Should().Be("UnderMaintenance");
    }

    // ─── GetApartmentsBySociety ───────────────────────────────────────────────

    [Fact]
    public async Task GetApartmentsBySociety_ReturnsAllCreatedApartments()
    {
        await Mediator.Send(AptCmd("501", "E", 1, 2, 0));
        await Mediator.Send(AptCmd("502", "E", 1, 2, 0));

        var listResult = await Mediator.Send(new GetApartmentsBySocietyQuery(
            SocietyId, new PaginationParams { Page = 1, PageSize = 50 }, null, null));

        listResult.IsSuccess.Should().BeTrue();
        listResult.Value!.Items.Should().HaveCountGreaterThanOrEqualTo(2);
    }

    // ─── User: create → retrieve ─────────────────────────────────────────────

    [Fact]
    public async Task CreateUser_ThenGetById_ReturnsUser()
    {
        var createResult = await Mediator.Send(UserCmd("alice@test.com"));

        createResult.IsSuccess.Should().BeTrue();
        var user = createResult.Value!;
        user.Email.Should().Be("alice@test.com");
        user.Role.Should().Be("Owner");
        user.IsActive.Should().BeTrue();
        user.IsVerified.Should().BeFalse();

        var getResult = await Mediator.Send(new GetUserQuery(SocietyId, user.Id));
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(user.Id);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_ReturnsFailure()
    {
        await Mediator.Send(UserCmd("bob@test.com"));

        var duplicate = await Mediator.Send(UserCmd("bob@test.com"));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.UserAlreadyExists);
    }

    [Fact]
    public async Task CreateUser_OtpSmsIsSent()
    {
        await Mediator.Send(UserCmd("carol@test.com"));

        NotificationService.SentSms.Should().ContainSingle(s => s.Message.Contains("OTP"));
    }

    // ─── User: update profile ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateUser_ChangesArePersisted()
    {
        var user = (await Mediator.Send(UserCmd("dave@test.com"))).Value!;

        var updateResult = await Mediator.Send(new UpdateUserCommand(SocietyId, user.Id, "Dave Updated", "+91-1112223333"));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.FullName.Should().Be("Dave Updated");
    }

    // ─── User: send OTP / verify OTP workflow ────────────────────────────────

    [Fact]
    public async Task SendOtp_ThenVerify_UserBecomesVerified()
    {
        var user = (await Mediator.Send(UserCmd("eve@test.com"))).Value!;

        // Trigger OTP send
        var sendResult = await Mediator.Send(new SendOtpCommand(SocietyId, user.Id));
        sendResult.IsSuccess.Should().BeTrue();

        // Retrieve the OTP from the fake repository (the entity stores it)
        var storedUser = UserRepo.Store[user.Id];
        storedUser.OtpCode.Should().NotBeNullOrEmpty();

        // Verify the OTP
        var verifyResult = await Mediator.Send(new VerifyOtpCommand(SocietyId, user.Id, storedUser.OtpCode!));
        verifyResult.IsSuccess.Should().BeTrue();

        // User should now be verified
        var getResult = await Mediator.Send(new GetUserQuery(SocietyId, user.Id));
        getResult.Value!.IsVerified.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyOtp_WithWrongCode_ReturnsFailure()
    {
        var user = (await Mediator.Send(UserCmd("frank@test.com"))).Value!;
        await Mediator.Send(new SendOtpCommand(SocietyId, user.Id));

        var result = await Mediator.Send(new VerifyOtpCommand(SocietyId, user.Id, "000000"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.OtpInvalid);
    }

    // ─── User: deactivate ─────────────────────────────────────────────────────

    [Fact]
    public async Task DeactivateUser_SetsIsActiveFalse()
    {
        var user = (await Mediator.Send(UserCmd("grace@test.com"))).Value!;

        var result = await Mediator.Send(new DeactivateUserCommand(SocietyId, user.Id));
        result.IsSuccess.Should().BeTrue();

        var stored = UserRepo.Store[user.Id];
        stored.IsActive.Should().BeFalse();
    }

    // ─── User: assign role ────────────────────────────────────────────────────

    [Fact]
    public async Task AssignRole_ChangesUserRole()
    {
        var user = (await Mediator.Send(UserCmd("henry@test.com"))).Value!;

        var result = await Mediator.Send(new AssignRoleCommand(SocietyId, user.Id, UserRole.Tenant));
        result.IsSuccess.Should().BeTrue();

        var stored = UserRepo.Store[user.Id];
        stored.Role.Should().Be(UserRole.Tenant);
    }

    // ─── Full workflow: create apartment + user → link user to apartment ──────

    [Fact]
    public async Task FullWorkflow_CreateApartmentAndUser_AssignUserAsOwner()
    {
        // Create apartment
        var apt = (await Mediator.Send(AptCmd("601", "F", 6, 3, 1))).Value!;

        // Create user with reference to that apartment
        var user = (await Mediator.Send(UserCmd("iris@test.com", UserRole.Owner, apt.Id))).Value!;

        // Verify user is linked
        user.ApartmentId.Should().Be(apt.Id);

        // Retrieve users by apartment
        var usersResult = await Mediator.Send(new GetUsersByApartmentQuery(SocietyId, apt.Id));
        usersResult.IsSuccess.Should().BeTrue();
        usersResult.Value!.Should().ContainSingle(u => u.Id == user.Id);
    }

    // ─── GetUsersBySociety ────────────────────────────────────────────────────

    [Fact]
    public async Task GetUsersBySociety_WithRoleFilter_ReturnsOnlyMatchingRoles()
    {
        await Mediator.Send(UserCmd("tenant1@test.com", UserRole.Tenant));
        await Mediator.Send(UserCmd("owner1@test.com", UserRole.Owner));

        var tenantsResult = await Mediator.Send(new GetUsersBySocietyQuery(
            SocietyId, new PaginationParams { Page = 1, PageSize = 50 }, UserRole.Tenant));

        tenantsResult.IsSuccess.Should().BeTrue();
        tenantsResult.Value!.Items.Should().OnlyContain(u => u.Role == "Tenant");
    }
}
