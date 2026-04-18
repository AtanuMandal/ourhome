using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Constants;
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
        int rooms = 2, params string[] parkingSlots) =>
        new(SocietyId, number, block, floor, rooms, parkingSlots, null, 500, 600, 700);

    private static CreateUserCommand UserCmd(
        string email = "resident@test.com",
        UserRole role = UserRole.SUUser,
        ResidentType residentType = ResidentType.SocietyAdmin,
        string? apartmentId = null) =>
        new(SocietyId, "John Resident", email, "9876543210", role, residentType, apartmentId);

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
        apt.Residents.Should().BeEmpty();

        var getResult = await Mediator.Send(new GetApartmentQuery(SocietyId, apt.Id));
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(apt.Id);
    }

    [Fact]
    public async Task CreateApartment_WithInitialTenantDetails_AddsResidentAndMarksApartmentOccupied()
    {
        var result = await Mediator.Send(
            new CreateApartmentCommand(
                SocietyId,
                "102",
                "A",
                1,
                3,
                ["P1"],
                null,
                500,
                600,
                700,
                new CreateApartmentResidentRequest("Taylor Tenant", "taylor@test.com", "+91-9988776655", ResidentType.Tenant)));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Residents.Should().ContainSingle(r =>
            r.ResidentType == "Tenant" && r.UserName == "Taylor Tenant");
        result.Value.Status.Should().Be("Occupied");
    }

    [Fact]
    public async Task CreateApartment_DuplicateUnitNumber_ReturnsFailure()
    {
        await Mediator.Send(AptCmd("201", "B"));

        var duplicate = await Mediator.Send(AptCmd("201", "B"));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.ApartmentNumberDuplicate);
    }

    [Fact]
    public async Task CreateApartment_SameUnitNumberAcrossBlocks_Succeeds()
    {
        await Mediator.Send(AptCmd("202", "A"));

        var duplicate = await Mediator.Send(AptCmd("202", "B"));

        duplicate.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task CreateApartment_DuplicateLocation_ReturnsFailure()
    {
        await Mediator.Send(AptCmd("203", "A", 2));

        var duplicate = await Mediator.Send(AptCmd("203", "A", 2));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.ApartmentNumberDuplicate);
    }

    // ─── Apartment: update ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateApartment_ChangesArePersisted()
    {
        var apt = (await Mediator.Send(AptCmd("301", "C", 2, 2))).Value!;

        var updateResult = await Mediator.Send(new UpdateApartmentCommand(SocietyId, apt.Id, "C", 3, 4, ["P2", "P3"], 500, 600, 700));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.FloorNumber.Should().Be(3);
        updateResult.Value.NumberOfRooms.Should().Be(4);
    }

    [Fact]
    public async Task UpdateApartment_ToExistingLocation_ReturnsFailure()
    {
        var first = (await Mediator.Send(AptCmd("302", "C", 2, 2))).Value!;
        await Mediator.Send(AptCmd("302", "D", 3, 2));

        var updateResult = await Mediator.Send(new UpdateApartmentCommand(SocietyId, first.Id, "D", 3, 4, ["P2"], 500, 600, 700));

        updateResult.IsFailure.Should().BeTrue();
        updateResult.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.ApartmentNumberDuplicate);
    }

    // ─── Apartment: change status ─────────────────────────────────────────────

    [Fact]
    public async Task ChangeApartmentStatus_ToUnderMaintenance_Succeeds()
    {
        var apt = (await Mediator.Send(AptCmd("401", "D", 4, 3))).Value!;

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
        await Mediator.Send(AptCmd("501", "E", 1, 2));
        await Mediator.Send(AptCmd("502", "E", 1, 2));

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
        user.Role.Should().Be("SUUser");
        user.ResidentType.Should().Be("SocietyAdmin");
        user.IsActive.Should().BeTrue();
        user.IsVerified.Should().BeFalse();
        user.Apartments.Should().BeEmpty();

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

        var result = await Mediator.Send(new AssignRoleCommand(SocietyId, user.Id, UserRole.SUUser));
        result.IsSuccess.Should().BeTrue();

        var stored = UserRepo.Store[user.Id];
        stored.Role.Should().Be(UserRole.SUUser);
    }

    // ─── Full workflow: create apartment + user → link user to apartment ──────

    [Fact]
    public async Task FullWorkflow_CreateApartmentAndUser_AssignUserAsOwner()
    {
        // Create apartment
        var apt = (await Mediator.Send(AptCmd("601", "F", 6, 3, "P1"))).Value!;

        // Create user with reference to that apartment
        var user = (await Mediator.Send(UserCmd("iris@test.com", UserRole.SUUser, ResidentType.Owner, apt.Id))).Value!;

        // Verify user is linked
        user.ApartmentId.Should().Be(apt.Id);
        user.Apartments.Should().ContainSingle(a => a.ApartmentId == apt.Id && a.Name == apt.ApartmentNumber);

        // Retrieve users by apartment
        var usersResult = await Mediator.Send(new GetUsersByApartmentQuery(SocietyId, apt.Id));
        usersResult.IsSuccess.Should().BeTrue();
        usersResult.Value!.Should().ContainSingle(u => u.Id == user.Id);
    }

    [Fact]
    public async Task AssignUserApartment_LinksExistingResidentToAnotherApartment()
    {
        var primaryApartment = (await Mediator.Send(AptCmd("611", "F", 6, 3, "P1"))).Value!;
        var secondaryApartment = (await Mediator.Send(AptCmd("612", "F", 6, 3, "P2"))).Value!;
        var user = (await Mediator.Send(UserCmd("multiapt@test.com", UserRole.SUUser, ResidentType.Owner, primaryApartment.Id))).Value!;

        var attachResult = await Mediator.Send(new AssignUserApartmentCommand(SocietyId, user.Id, secondaryApartment.Id, ResidentType.Owner));

        attachResult.IsSuccess.Should().BeTrue();
        attachResult.Value!.Apartments.Should().Contain(a => a.ApartmentId == primaryApartment.Id);
        attachResult.Value.Apartments.Should().Contain(a => a.ApartmentId == secondaryApartment.Id);

        var updatedApartment = await Mediator.Send(new GetApartmentQuery(SocietyId, secondaryApartment.Id));
        updatedApartment.Value!.Residents.Should().ContainSingle(r =>
            r.UserId == user.Id && r.ResidentType == "Owner");
    }

    [Fact]
    public async Task RemoveUserApartment_WhenActorIsSuAdmin_UnlinksResidentAndApartment()
    {
        var admin = await UserRepo.CreateAsync(
            ApartmentManagement.Domain.Entities.User.Create(
                SocietyId,
                "Society Admin",
                "admin@test.com",
                "+91-9999999999",
                UserRole.SUAdmin,
                ResidentType.SocietyAdmin),
            CancellationToken.None);
        CurrentUserService.UserId = admin.Id;

        var apartment = (await Mediator.Send(AptCmd("613", "F", 6, 3, "P3"))).Value!;
        var resident = (await Mediator.Send(UserCmd("remove-link@test.com", UserRole.SUUser, ResidentType.Owner, apartment.Id))).Value!;

        var removeResult = await Mediator.Send(new RemoveUserApartmentCommand(SocietyId, resident.Id, apartment.Id));

        removeResult.IsSuccess.Should().BeTrue();
        removeResult.Value!.Apartments.Should().NotContain(a => a.ApartmentId == apartment.Id);

        var updatedApartment = await Mediator.Send(new GetApartmentQuery(SocietyId, apartment.Id));
        updatedApartment.Value!.Residents.Should().NotContain(r => r.UserId == resident.Id);
        updatedApartment.Value.Status.Should().Be("Available");
    }

    [Fact]
    public async Task RemoveUserApartment_WhenActorIsNotSuAdmin_ReturnsForbidden()
    {
        var nonAdmin = await UserRepo.CreateAsync(
            ApartmentManagement.Domain.Entities.User.Create(
                SocietyId,
                "Resident User",
                "resident-admin@test.com",
                "+91-9888888888",
                UserRole.SUUser,
                ResidentType.Owner),
            CancellationToken.None);
        CurrentUserService.UserId = nonAdmin.Id;

        var apartment = (await Mediator.Send(AptCmd("614", "F", 6, 3, "P4"))).Value!;
        var resident = (await Mediator.Send(UserCmd("remove-forbidden@test.com", UserRole.SUUser, ResidentType.Tenant, apartment.Id))).Value!;

        var removeResult = await Mediator.Send(new RemoveUserApartmentCommand(SocietyId, resident.Id, apartment.Id));

        removeResult.IsFailure.Should().BeTrue();
        removeResult.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.Forbidden);
    }

    // ─── GetUsersBySociety ────────────────────────────────────────────────────

    [Fact]
    public async Task GetUsersBySociety_WithRoleFilter_ReturnsOnlyMatchingRoles()
    {
        await Mediator.Send(UserCmd("tenant1@test.com", UserRole.SUUser));
        await Mediator.Send(UserCmd("owner1@test.com", UserRole.SUUser));

        var tenantsResult = await Mediator.Send(new GetUsersBySocietyQuery(
            SocietyId, new PaginationParams { Page = 1, PageSize = 50 }, UserRole.SUUser));

        tenantsResult.IsSuccess.Should().BeTrue();
        tenantsResult.Value!.Items.Should().OnlyContain(u => u.Role == "SUUser");
    }

    [Fact]
    public async Task CreateUser_WithInvalidEmail_ReturnsValidationFailure()
    {
        var action = () => Mediator.Send(new CreateUserCommand(
            SocietyId, "Invalid Email", "invalid-email", "9876543210", UserRole.SUUser, ResidentType.Owner, "apt-1"));

        await action.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
    }

    [Fact]
    public async Task CreateUser_WithMissingNameOrPhone_ReturnsValidationFailure()
    {
        var missingName = () => Mediator.Send(new CreateUserCommand(
            SocietyId, string.Empty, "missingname@test.com", "9876543210", UserRole.SUUser, ResidentType.Owner, "apt-1"));
        var missingPhone = () => Mediator.Send(new CreateUserCommand(
            SocietyId, "Missing Phone", "missingphone@test.com", string.Empty, UserRole.SUUser, ResidentType.Owner, "apt-1"));

        await missingName.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
        await missingPhone.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
    }

    [Fact]
    public async Task CreateUser_WithNonTenDigitPhone_ReturnsValidationFailure()
    {
        var shortPhone = () => Mediator.Send(new CreateUserCommand(
            SocietyId, "Short Phone", "short-phone@test.com", "12345", UserRole.SUUser, ResidentType.Owner, "apt-1"));
        var alphaPhone = () => Mediator.Send(new CreateUserCommand(
            SocietyId, "Alpha Phone", "alpha-phone@test.com", "12345AB890", UserRole.SUUser, ResidentType.Owner, "apt-1"));

        await shortPhone.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
        await alphaPhone.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
    }

    [Fact]
    public async Task CreateUser_CannotAddSecondOwnerForApartment()
    {
        var apartment = (await Mediator.Send(AptCmd("701", "G"))).Value!;
        var first = await Mediator.Send(new CreateUserCommand(SocietyId, "First Owner", "first-owner@test.com", "9876543210", UserRole.SUUser, ResidentType.Owner, apartment.Id));
        var second = await Mediator.Send(new CreateUserCommand(SocietyId, "Second Owner", "second-owner@test.com", "9876543211", UserRole.SUUser, ResidentType.Owner, apartment.Id));

        first.IsSuccess.Should().BeTrue();
        second.IsFailure.Should().BeTrue();
        second.ErrorCode.Should().Be(ErrorCodes.Conflict);
    }

    [Fact]
    public async Task CreateUser_CannotAddSecondTenantForApartment()
    {
        var apartment = (await Mediator.Send(AptCmd("702", "G"))).Value!;
        var first = await Mediator.Send(new CreateUserCommand(SocietyId, "First Tenant", "first-tenant@test.com", "9876543210", UserRole.SUUser, ResidentType.Tenant, apartment.Id));
        var second = await Mediator.Send(new CreateUserCommand(SocietyId, "Second Tenant", "second-tenant@test.com", "9876543211", UserRole.SUUser, ResidentType.Tenant, apartment.Id));

        first.IsSuccess.Should().BeTrue();
        second.IsFailure.Should().BeTrue();
        second.ErrorCode.Should().Be(ErrorCodes.Conflict);
    }

    [Fact]
    public async Task AddHouseholdMember_AllowsMultipleFamilyMembersForApartment()
    {
        var apartment = (await Mediator.Send(AptCmd("703", "G"))).Value!;
        var owner = await Mediator.Send(new CreateUserCommand(SocietyId, "Owner", "owner-multi-family@test.com", "9876543200", UserRole.SUUser, ResidentType.Owner, apartment.Id));
        CurrentUserService.UserId = owner.Value!.Id;

        var firstFamily = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Family One", "family-one@test.com", "9876543201", ResidentType.FamilyMember));
        var secondFamily = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Family Two", "family-two@test.com", "9876543202", ResidentType.FamilyMember));

        firstFamily.IsSuccess.Should().BeTrue();
        secondFamily.IsSuccess.Should().BeTrue();

        var updatedApartment = await Mediator.Send(new GetApartmentQuery(SocietyId, apartment.Id));
        updatedApartment.Value!.Residents.Count(r => r.ResidentType == "FamilyMember").Should().Be(2);
    }

    [Fact]
    public async Task AssignUserApartment_CannotMakeSameResidentBothOwnerAndTenant()
    {
        var apartment = (await Mediator.Send(AptCmd("704", "G"))).Value!;
        var owner = (await Mediator.Send(new CreateUserCommand(SocietyId, "Owner Resident", "owner-tenant-conflict@test.com", "9876543210", UserRole.SUUser, ResidentType.Owner, apartment.Id))).Value!;

        var conflict = await Mediator.Send(new AssignUserApartmentCommand(SocietyId, owner.Id, apartment.Id, ResidentType.Tenant));

        conflict.IsFailure.Should().BeTrue();
        conflict.ErrorCode.Should().Be(ErrorCodes.Conflict);
    }

    [Fact]
    public async Task TransferApartmentOwnership_RemovesPreviousOwnerAndFamilyButKeepsTenant()
    {
        var apartment = (await Mediator.Send(AptCmd("705", "G"))).Value!;
        var owner = (await Mediator.Send(new CreateUserCommand(SocietyId, "Old Owner", "old-owner@test.com", "9876543200", UserRole.SUUser, ResidentType.Owner, apartment.Id))).Value!;
        var tenant = (await Mediator.Send(new CreateUserCommand(SocietyId, "Tenant", "tenant-stays@test.com", "9876543201", UserRole.SUUser, ResidentType.Tenant, apartment.Id))).Value!;
        CurrentUserService.UserId = owner.Id;
        var family = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Owner Family", "owner-family@test.com", "9876543202", ResidentType.FamilyMember));
        family.IsSuccess.Should().BeTrue();

        var transfer = await Mediator.Send(new TransferApartmentOwnershipCommand(SocietyId, apartment.Id, "New Owner", "new-owner@test.com", "9876543203"));

        transfer.IsSuccess.Should().BeTrue();
        var apartmentAfter = await Mediator.Send(new GetApartmentQuery(SocietyId, apartment.Id));
        apartmentAfter.Value!.Residents.Should().Contain(r => r.ResidentType == "Tenant" && r.UserId == tenant.Id);
        apartmentAfter.Value.Residents.Should().NotContain(r => r.ResidentType == "FamilyMember");

        var previousOwner = await Mediator.Send(new GetUserQuery(SocietyId, owner.Id));
        previousOwner.Value!.Apartments.Should().NotContain(a => a.ApartmentId == apartment.Id);
    }

    [Fact]
    public async Task HouseholdMemberCommands_EnforceOwnerAndTenantOnlyRules()
    {
        var apartment = (await Mediator.Send(AptCmd("706", "G"))).Value!;
        var suAdminApartment = (await Mediator.Send(AptCmd("707", "G"))).Value!;
        var ownerApartment = (await Mediator.Send(AptCmd("708", "G"))).Value!;
        var owner = (await Mediator.Send(new CreateUserCommand(SocietyId, "Owner", "rule-owner@test.com", "9876543200", UserRole.SUUser, ResidentType.Owner, ownerApartment.Id))).Value!;
        var tenant = (await Mediator.Send(new CreateUserCommand(SocietyId, "Tenant", "rule-tenant@test.com", "9876543201", UserRole.SUUser, ResidentType.Tenant, apartment.Id))).Value!;
        var suAdmin = await UserRepo.CreateAsync(
            ApartmentManagement.Domain.Entities.User.Create(SocietyId, "SU Admin", "rule-admin@test.com", "9876543202", UserRole.SUAdmin, ResidentType.SocietyAdmin),
            CancellationToken.None);

        CurrentUserService.UserId = suAdmin.Id;
        var suAdminOwner = await Mediator.Send(new CreateUserCommand(SocietyId, "Admin Owner", "admin-owner@test.com", "9876543203", UserRole.SUUser, ResidentType.Owner, suAdminApartment.Id));
        var suAdminTenant = await Mediator.Send(new CreateUserCommand(SocietyId, "Admin Tenant", "admin-tenant@test.com", "9876543204", UserRole.SUUser, ResidentType.Tenant, apartment.Id));
        var suAdminFamily = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Admin Family", "admin-family@test.com", "9876543205", ResidentType.FamilyMember));

        suAdminOwner.IsSuccess.Should().BeTrue();
        suAdminTenant.IsFailure.Should().BeTrue();
        suAdminFamily.IsFailure.Should().BeTrue();

        CurrentUserService.UserId = owner.Id;
        var ownerAddsTenant = await Mediator.Send(new CreateUserCommand(SocietyId, "Owner Added Tenant", "owner-adds-tenant@test.com", "9876543206", UserRole.SUUser, ResidentType.Tenant, ownerApartment.Id));
        var ownerAddsFamily = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, ownerApartment.Id, "Owner Family", "owner-family-2@test.com", "9876543207", ResidentType.FamilyMember));
        var ownerAddsCoOccupant = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, ownerApartment.Id, "Owner Co", "owner-co@test.com", "9876543208", ResidentType.CoOccupant));

        ownerAddsTenant.IsSuccess.Should().BeTrue();
        ownerAddsFamily.IsSuccess.Should().BeTrue();
        ownerAddsCoOccupant.IsFailure.Should().BeTrue();

        CurrentUserService.UserId = tenant.Id;
        var tenantAddsCoOccupant = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Tenant Co", "tenant-co@test.com", "9876543209", ResidentType.CoOccupant));
        var tenantAddsFamily = await Mediator.Send(new AddHouseholdMemberCommand(SocietyId, apartment.Id, "Tenant Family", "tenant-family@test.com", "9876543212", ResidentType.FamilyMember));

        tenantAddsCoOccupant.IsSuccess.Should().BeTrue();
        tenantAddsFamily.IsFailure.Should().BeTrue();
    }
}
