using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

/// <summary>
/// End-to-end coverage for the "disabled society locks out its users" rule: a society user must
/// not be able to log in — by any method — once HQAdmin has deactivated their society, and must
/// regain access once it is re-activated.
/// </summary>
public class LoginIntegrationTests : IntegrationTestBase
{
    private async Task<(Society Society, User User)> SeedActiveSocietyWithLoginableUserAsync(string password = "secret123")
    {
        var society = Society.Create("Green Valley", new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@gv.com", "+91-9876543210", 1, 10);
        await SocietyRepo.CreateAsync(society);
        society.Activate();
        await SocietyRepo.UpdateAsync(society);

        var user = User.Create(society.Id, "Alice Owner", "alice@gv.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.SetPasswordHash($"hashed-{password}");
        await UserRepo.CreateAsync(user);

        return (society, user);
    }

    [Fact]
    public async Task Login_ForActiveSocietyUser_Succeeds()
    {
        var (_, user) = await SeedActiveSocietyWithLoginableUserAsync();

        var result = await Mediator.Send(new LoginCommand(user.Email, "secret123"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_AfterSocietyIsDisabled_FailsWithSocietyNotActive()
    {
        var (society, user) = await SeedActiveSocietyWithLoginableUserAsync();

        CurrentUserService.SocietyId = HqConstants.PartitionKey;
        CurrentUserService.Role = "HQAdmin";
        (await Mediator.Send(new DeactivateSocietyCommand(society.Id))).IsSuccess.Should().BeTrue();

        var result = await Mediator.Send(new LoginCommand(user.Email, "secret123"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SocietyNotActive);
    }

    [Fact]
    public async Task Login_AfterSocietyIsReactivated_SucceedsAgain()
    {
        var (society, user) = await SeedActiveSocietyWithLoginableUserAsync();

        CurrentUserService.SocietyId = HqConstants.PartitionKey;
        CurrentUserService.Role = "HQAdmin";
        await Mediator.Send(new DeactivateSocietyCommand(society.Id));
        await Mediator.Send(new PublishSocietyCommand(society.Id));

        var result = await Mediator.Send(new LoginCommand(user.Email, "secret123"));

        result.IsSuccess.Should().BeTrue();
    }

    /// <summary>
    /// Phone+OTP login is an alternate authentication method, not a password reset — a user who
    /// already has a password must keep being able to use it after logging in via OTP one or
    /// more times. Also covers the regression where a second OTP-login request failed with a
    /// Cosmos "412 Precondition Failed" (see BaseEntity.ETag / CosmosSerializationTests).
    /// </summary>
    [Fact]
    public async Task OtpLogin_RepeatedlyThenTwice_DoesNotAffectExistingPasswordLogin()
    {
        var (_, user) = await SeedActiveSocietyWithLoginableUserAsync();

        var firstRequest = await Mediator.Send(new RequestPhoneLoginOtpCommand(user.Phone));
        firstRequest.IsSuccess.Should().BeTrue();

        var seededUser = await UserRepo.GetByIdAsync(user.Id, user.SocietyId);
        var firstVerify = await Mediator.Send(new VerifyOtpCommand(user.SocietyId, user.Id, seededUser!.OtpCode!));
        firstVerify.IsSuccess.Should().BeTrue();

        // Second OTP login for the same user — this is the request that used to 412.
        var secondRequest = await Mediator.Send(new RequestPhoneLoginOtpCommand(user.Phone));
        secondRequest.IsSuccess.Should().BeTrue();

        var reseededUser = await UserRepo.GetByIdAsync(user.Id, user.SocietyId);
        var secondVerify = await Mediator.Send(new VerifyOtpCommand(user.SocietyId, user.Id, reseededUser!.OtpCode!));
        secondVerify.IsSuccess.Should().BeTrue();

        var passwordLogin = await Mediator.Send(new LoginCommand(user.Email, "secret123"));
        passwordLogin.IsSuccess.Should().BeTrue();
    }
}
