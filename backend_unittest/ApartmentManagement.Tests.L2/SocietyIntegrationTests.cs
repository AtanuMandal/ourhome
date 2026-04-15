using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.Society;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class SocietyIntegrationTests : IntegrationTestBase
{
    // ─── Helper factories ─────────────────────────────────────────────────────

    private static CreateSocietyCommand ValidCreateSocietyCommand(string name = "Green Valley") =>
        new(name, "123 Main St", "Mumbai", "Maharashtra", "400001", "India",
            "admin@greenvalley.com", "+91-9876543210", 3, 60,
            "Raj Kumar", "raj@greenvalley.com", "+91-9000000001");

    // ─── CreateSociety → GetSociety roundtrip ─────────────────────────────────

    [Fact]
    public async Task CreateSociety_ThenGetById_ReturnsSameSociety()
    {
        // Act – create
        var createResult = await Mediator.Send(ValidCreateSocietyCommand());

        // Assert – creation succeeded
        createResult.IsSuccess.Should().BeTrue();
        var society = createResult.Value!.Society;
        society.Id.Should().NotBeNullOrEmpty();
        society.Name.Should().Be("Green Valley");
        society.Status.Should().Be("Draft");

        // Act – query
        var getResult = await Mediator.Send(new GetSocietyQuery(society.Id));

        // Assert – query returns same data
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(society.Id);
        getResult.Value.Name.Should().Be("Green Valley");
    }

    [Fact]
    public async Task CreateSociety_DomainEventIsPublished()
    {
        await Mediator.Send(ValidCreateSocietyCommand());

        EventPublisher.PublishedEvents.Should().ContainSingle(e =>
            e.GetType().Name == "SocietyCreatedEvent");
    }

    // ─── GetSociety – not found ───────────────────────────────────────────────

    [Fact]
    public async Task GetSociety_WhenNotFound_ReturnsFailure()
    {
        var result = await Mediator.Send(new GetSocietyQuery("non-existent-id"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().NotBeNullOrEmpty();
    }

    // ─── UpdateSociety ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSociety_ChangesArePersisted()
    {
        // Arrange – create first
        var created = (await Mediator.Send(ValidCreateSocietyCommand())).Value!.Society;
        var createdAdmin = UserRepo.Store.Values.Single(u => u.SocietyId == created.Id && u.Role == UserRole.SUAdmin);
        CurrentUserService.UserId = createdAdmin.Id;

        // Act – update
        var updateCmd = new UpdateSocietyCommand(
            created.Id, "Updated Valley", "updated@valley.com", "+91-1234567890", 5, 100, [], []);
        var updateResult = await Mediator.Send(updateCmd);

        // Assert
        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.Name.Should().Be("Updated Valley");
        updateResult.Value.TotalBlocks.Should().Be(5);
        updateResult.Value.TotalApartments.Should().Be(100);

        // Verify persisted via query
        var getResult = await Mediator.Send(new GetSocietyQuery(created.Id));
        getResult.Value!.Name.Should().Be("Updated Valley");
    }

    [Fact]
    public async Task UpdateSociety_WhenNotFound_ReturnsFailure()
    {
        var cmd = new UpdateSocietyCommand("bad-id", "X", "x@x.com", "+1", 1, 1, [], []);
        var result = await Mediator.Send(cmd);

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateSociety_PersistsSocietyUsersAndCommittees()
    {
        var created = (await Mediator.Send(ValidCreateSocietyCommand("Community Plaza"))).Value!;
        CurrentUserService.UserId = created.Admin.Id;

        var resident = await UserRepo.CreateAsync(
            ApartmentManagement.Domain.Entities.User.Create(
                created.Society.Id,
                "Priya Resident",
                "priya@community.com",
                "9988776655",
                UserRole.SUUser,
                ResidentType.SocietyAdmin),
            CancellationToken.None);

        var updateResult = await Mediator.Send(new UpdateSocietyCommand(
            created.Society.Id,
            created.Society.Name,
            created.Society.ContactEmail,
            created.Society.ContactPhone,
            created.Society.TotalBlocks,
            created.Society.TotalApartments,
            [new SocietyUserAssignmentRequest(created.Admin.Email, "President")],
            [new SocietyCommitteeRequest("Finance Committee", [
                new SocietyUserAssignmentRequest(created.Admin.Email, "Chairman"),
                new SocietyUserAssignmentRequest(resident.Email, "Member")
            ])]));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.SocietyUsers.Should().ContainSingle(user =>
            user.Email == created.Admin.Email && user.RoleTitle == "President");
        updateResult.Value.Committees.Should().ContainSingle(committee =>
            committee.Name == "Finance Committee" &&
            committee.Members.Any(member => member.Email == resident.Email && member.RoleTitle == "Member"));
    }

    // ─── Publish (Activate) Society ───────────────────────────────────────────

    [Fact]
    public async Task PublishSociety_ChangesStatusToActive()
    {
        var created = (await Mediator.Send(ValidCreateSocietyCommand())).Value!.Society;
        created.Status.Should().Be("Draft");

        var publishResult = await Mediator.Send(new PublishSocietyCommand(created.Id));
        publishResult.IsSuccess.Should().BeTrue();

        var getResult = await Mediator.Send(new GetSocietyQuery(created.Id));
        getResult.Value!.Status.Should().Be("Active");
    }

    // ─── GetAllSocieties ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllSocieties_AfterCreatingAndActivating_ReturnsSociety()
    {
        var created = (await Mediator.Send(ValidCreateSocietyCommand("Sunrise Heights"))).Value!.Society;
        await Mediator.Send(new PublishSocietyCommand(created.Id)); // make it Active

        var result = await Mediator.Send(new GetAllSocietiesQuery(new Shared.Models.PaginationParams { Page = 1, PageSize = 20 }));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle(s => s.Id == created.Id);
    }

    // ─── Full workflow: create society → create apartment ─────────────────────

    [Fact]
    public async Task FullWorkflow_CreateSocietyThenApartment_ApartmentBelongsToSociety()
    {
        // Step 1 – create society
        var society = (await Mediator.Send(ValidCreateSocietyCommand("Maple Gardens"))).Value!.Society;

        // Step 2 – create apartment in that society
        var aptCmd = new CreateApartmentCommand(
            society.Id, "101", "A", 1, 3, ["P1"], null, 500, 600, 700);
        var aptResult = await Mediator.Send(aptCmd);

        // Assert
        aptResult.IsSuccess.Should().BeTrue();
        var apt = aptResult.Value!;
        apt.SocietyId.Should().Be(society.Id);
        apt.ApartmentNumber.Should().Be("101");
        apt.BlockName.Should().Be("A");

        // Verify apartment is retrievable via query
        var getAptResult = await Mediator.Send(new GetApartmentQuery(society.Id, apt.Id));
        getAptResult.IsSuccess.Should().BeTrue();
        getAptResult.Value!.SocietyId.Should().Be(society.Id);
    }

    // ─── ConfigureFeeStructure ────────────────────────────────────────────────

    [Fact]
    public async Task ConfigureFeeStructure_OnExistingSociety_Succeeds()
    {
        var society = (await Mediator.Send(ValidCreateSocietyCommand())).Value!.Society;

        var cmd = new ConfigureFeeStructureCommand(society.Id, 1500m, 200m, 300m, "INR");
        var result = await Mediator.Send(cmd);

        result.IsSuccess.Should().BeTrue();
    }

    // ─── Validation: missing required fields ──────────────────────────────────

    [Fact]
    public async Task CreateSociety_WithEmptyName_ThrowsValidationException()
    {
        var cmd = new CreateSocietyCommand(
            "", "123 Main St", "Mumbai", "Maharashtra", "400001", "India",
            "admin@test.com", "+91-9876543210", 1, 1,
            "Raj Kumar", "raj@test.com", "+91-9000000001");

        var act = () => Mediator.Send(cmd);

        await act.Should().ThrowAsync<ApartmentManagement.Shared.Exceptions.ValidationException>();
    }
}
