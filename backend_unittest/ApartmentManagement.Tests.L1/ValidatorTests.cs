using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Validators;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L1.Validators;

public class CreateSocietyCommandValidatorTests
{
    private readonly CreateSocietyCommandValidator _validator = new();

    private static CreateSocietyCommand ValidCommand() => new(
        "Green Valley", "123 Main St", "Mumbai", "Maharashtra", "400001", "India",
        "admin@gv.com", "+91-9876543210", 3, 60,
        "Raj Kumar", "raj@gv.com", "+91-9000000001");

    [Fact]
    public void Validate_WithValidCommand_PassesValidation()
    {
        // Arrange
        var command = ValidCommand();

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyName_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { Name = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Fact]
    public void Validate_WithInvalidEmail_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { ContactEmail = "not-an-email" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ContactEmail");
    }

    [Fact]
    public void Validate_WithZeroTotalBlocks_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { TotalBlocks = 0 };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "TotalBlocks");
    }

    [Fact]
    public void Validate_WithZeroTotalApartments_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { TotalApartments = 0 };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "TotalApartments");
    }

    [Fact]
    public void Validate_WithEmptyStreet_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { Street = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Street");
    }
}

public class BookAmenityCommandValidatorTests
{
    private readonly BookAmenityCommandValidator _validator = new();

    private static BookAmenityCommand ValidCommand()
    {
        var start = DateTime.UtcNow.AddHours(2);
        return new BookAmenityCommand("soc-001", "amenity-001", "user-001", "apt-001", start, start.AddHours(1));
    }

    [Fact]
    public void Validate_WithValidCommand_PassesValidation()
    {
        // Arrange
        var command = ValidCommand();

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WhenStartTimeInPast_FailsValidation()
    {
        // Arrange
        var past = DateTime.UtcNow.AddHours(-1);
        var command = ValidCommand() with { StartTime = past, EndTime = past.AddHours(1) };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "StartTime");
    }

    [Fact]
    public void Validate_WhenEndBeforeStart_FailsValidation()
    {
        // Arrange
        var start = DateTime.UtcNow.AddHours(3);
        var command = ValidCommand() with { StartTime = start, EndTime = start.AddMinutes(-30) };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "EndTime");
    }

    [Fact]
    public void Validate_WhenDurationExceeds8Hours_FailsValidation()
    {
        // Arrange
        var start = DateTime.UtcNow.AddHours(2);
        var command = ValidCommand() with { StartTime = start, EndTime = start.AddHours(9) };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage.Contains("8 hours"));
    }

    [Fact]
    public void Validate_WithEmptyAmenityId_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { AmenityId = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "AmenityId");
    }
}

public class CreateComplaintCommandValidatorTests
{
    private readonly CreateComplaintCommandValidator _validator = new();

    private static CreateComplaintCommand ValidCommand() => new(
        "soc-001", "apt-001", "user-001",
        "Leaking Pipe", "Water is leaking from the bathroom pipe",
        ComplaintCategory.Maintenance, ComplaintPriority.High, []);

    [Fact]
    public void Validate_WithValidData_PassesValidation()
    {
        // Arrange
        var command = ValidCommand();

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyTitle_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { Title = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Title");
    }

    [Fact]
    public void Validate_WithTitleTooLong_FailsValidation()
    {
        // Arrange
        var longTitle = new string('A', 201);
        var command = ValidCommand() with { Title = longTitle };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Title");
    }

    [Fact]
    public void Validate_WithEmptyDescription_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { Description = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Description");
    }

    [Fact]
    public void Validate_WithEmptySocietyId_FailsValidation()
    {
        // Arrange
        var command = ValidCommand() with { SocietyId = "" };

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "SocietyId");
    }
}

public class ResidentCommandValidatorTests
{
    [Fact]
    public void CreateUserValidator_WithInvalidPhone_FailsValidation()
    {
        var validator = new CreateUserCommandValidator();
        var command = new CreateUserCommand("soc-001", "Resident", "resident@test.com", "12345AB789", UserRole.SUUser, ResidentType.Owner, "apt-1");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Phone");
    }

    [Fact]
    public void TransferOwnershipValidator_WithMissingName_FailsValidation()
    {
        var validator = new TransferApartmentOwnershipCommandValidator();
        var command = new TransferApartmentOwnershipCommand("soc-001", "apt-1", string.Empty, "owner@test.com", "9876543210");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "FullName");
    }

    [Fact]
    public void AddHouseholdMemberValidator_WithInvalidResidentType_FailsValidation()
    {
        var validator = new AddHouseholdMemberCommandValidator();
        var command = new AddHouseholdMemberCommand("soc-001", "apt-1", "Resident", "member@test.com", "9876543210", ResidentType.Owner);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ResidentType");
    }
}

public class UpdateSocietyCommandValidatorTests
{
    private readonly UpdateSocietyCommandValidator _validator = new();

    private static UpdateSocietyCommand ValidCommand() => new(
        "soc-001",
        "Green Valley",
        "admin@gv.com",
        "+91-9876543210",
        3,
        60,
        7,
        null,
        null);

    [Theory]
    [InlineData(0)]
    [InlineData(91)]
    public void Validate_WithOutOfRangeMaintenanceThreshold_FailsValidation(int thresholdDays)
    {
        var command = ValidCommand() with { MaintenanceOverdueThresholdDays = thresholdDays };

        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "MaintenanceOverdueThresholdDays");
    }
}

public class MaintenanceScheduleCommandValidatorTests
{
    private readonly CreateMaintenanceScheduleCommandValidator _createValidator = new();
    private readonly UpdateMaintenanceScheduleCommandValidator _updateValidator = new();
    private readonly DeleteMaintenanceScheduleCommandValidator _deleteValidator = new();

    [Fact]
    public void CreateSchedule_WithValidLifecycleFields_PassesValidation()
    {
        var command = new CreateMaintenanceScheduleCommand(
            "soc-001",
            "Monthly Maintenance",
            null,
            null,
            1200m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            2026);

        var result = _createValidator.Validate(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateSchedule_WithInvalidStartMonth_FailsValidation()
    {
        var command = new CreateMaintenanceScheduleCommand(
            "soc-001",
            "Monthly Maintenance",
            null,
            null,
            1200m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            13,
            2026);

        var result = _createValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "StartMonth");
    }

    [Fact]
    public void UpdateSchedule_WithInvalidEffectiveYear_FailsValidation()
    {
        var command = new UpdateMaintenanceScheduleCommand(
            "soc-001",
            "schedule-001",
            false,
            6,
            1999,
            "Deactivating old schedule");

        var result = _updateValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "EffectiveYear");
    }

    [Fact]
    public void DeleteSchedule_WithoutReason_FailsValidation()
    {
        var command = new DeleteMaintenanceScheduleCommand("soc-001", "schedule-001", "");

        var result = _deleteValidator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == "ChangeReason");
    }
}
