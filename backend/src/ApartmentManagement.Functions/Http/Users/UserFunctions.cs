using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class UserFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("RegisterUser")]
    public async Task<IActionResult> RegisterUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var body = await req.DeserializeAsync<CreateUserRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(
            new CreateUserCommand(societyId, body.FullName, body.Email, body.Phone, body.Role, body.ResidentType, body.ApartmentId, body.InvitedByUserId), ct);
        return result.ToActionResult(201);
    }

    [Function("ListUsers")]
    public async Task<IActionResult> ListUsers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var search = req.Query["search"].ToString();
        var result = await mediator.Send(
            new GetUsersBySocietyQuery(societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }, null,
                string.IsNullOrWhiteSpace(search) ? null : search), ct);
        return result.ToActionResult();
    }

    [Function("DeleteUser")]
    public async Task<IActionResult> DeleteUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "societies/{societyId}/users/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ForbidResult();
        var result = await mediator.Send(new DeleteUserCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("FindUserByEmail")]
    public async Task<IActionResult> FindUserByEmail(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users/by-email")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var email = req.Query["email"].ToString();
        if (string.IsNullOrWhiteSpace(email))
            return new BadRequestObjectResult(new { error = "Query string must contain an email value." });

        var result = await mediator.Send(new FindUserByEmailQuery(societyId, email), ct);
        return result.ToActionResult();
    }

    [Function("RequestOtpByEmail")]
    public async Task<IActionResult> RequestOtpByEmail(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/auth/request-otp")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<RequestOtpByEmailRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(new RequestOtpByEmailCommand(societyId, body.Email), ct);
        return result.ToActionResult();
    }

    [Function("PasswordLogin")]
    public async Task<IActionResult> PasswordLogin(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/login")] HttpRequest req,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<LoginRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(new LoginCommand(body.Email, body.Password, body.SelectedUserId), ct);
        return result.ToActionResult();
    }

    [Function("RequestPhoneLoginOtp")]
    public async Task<IActionResult> RequestPhoneLoginOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/otp-login/request")] HttpRequest req,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<PhoneLoginOtpRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(new RequestPhoneLoginOtpCommand(body.Phone, body.SelectedUserId), ct);
        return result.ToActionResult();
    }

    [Function("RequestPasswordReset")]
    public async Task<IActionResult> RequestPasswordReset(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/password-reset/request")] HttpRequest req,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<PasswordResetRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(new RequestPasswordResetCommand(body.Email, body.SelectedUserId), ct);
        return result.ToActionResult();
    }

    [Function("ConfirmPasswordReset")]
    public async Task<IActionResult> ConfirmPasswordReset(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/password-reset/confirm")] HttpRequest req,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<ConfirmPasswordResetRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new ConfirmPasswordResetCommand(body.SocietyId, body.UserId, body.OtpCode, body.NewPassword), ct);
        return result.ToActionResult();
    }

    [Function("GetUser")]
    public async Task<IActionResult> GetUser(
        // Constrained to :guid so literal sibling routes (by-email/pending-join-requests) never bind here as "id".
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetUserQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("AttachResidentApartment")]
    public async Task<IActionResult> AttachResidentApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/apartments")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<AttachResidentApartmentRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new AssignUserApartmentCommand(societyId, id, body.ApartmentId, body.ResidentType), ct);
        return result.ToActionResult();
    }

    [Function("RemoveResidentApartment")]
    public async Task<IActionResult> RemoveResidentApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "societies/{societyId}/users/{id}/apartments/{apartmentId}")] HttpRequest req,
        string societyId, string id, string apartmentId, CancellationToken ct)
    {
        var result = await mediator.Send(new RemoveUserApartmentCommand(societyId, id, apartmentId), ct);
        return result.ToActionResult();
    }

    [Function("SendOtp")]
    public async Task<IActionResult> SendOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/send-otp")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new SendOtpCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("VerifyOtp")]
    public async Task<IActionResult> VerifyOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/verify-otp")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<OtpCodeBody>(ct);
        if (body is null || string.IsNullOrWhiteSpace(body.OtpCode))
            return new BadRequestObjectResult("Request body must contain { \"otpCode\": \"...\" }");
        var result = await mediator.Send(new VerifyOtpCommand(societyId, id, body.OtpCode), ct);
        return result.ToActionResult();
    }

    [Function("TransferApartmentOwnership")]
    public async Task<IActionResult> TransferApartmentOwnership(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/apartments/{apartmentId}/ownership-transfer")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<TransferApartmentOwnershipRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new TransferApartmentOwnershipCommand(societyId, apartmentId, body.FullName, body.Email, body.Phone), ct);
        return result.ToActionResult(201);
    }

    [Function("TransferApartmentTenancy")]
    public async Task<IActionResult> TransferApartmentTenancy(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/apartments/{apartmentId}/tenancy-transfer")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<TransferApartmentTenancyRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new TransferApartmentTenancyCommand(societyId, apartmentId, body.FullName, body.Email, body.Phone), ct);
        return result.ToActionResult(201);
    }

    [Function("AddHouseholdMember")]
    public async Task<IActionResult> AddHouseholdMember(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/apartments/{apartmentId}/household-members")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<AddHouseholdMemberRequest>(ct);
        if (body is null)
            return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new AddHouseholdMemberCommand(societyId, apartmentId, body.FullName, body.Email, body.Phone, body.ResidentType), ct);
        return result.ToActionResult(201);
    }

    [Function("UpdateUser")]
    public async Task<IActionResult> UpdateUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/users/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var body = await req.DeserializeAsync<UpdateUserRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(new UpdateUserCommand(societyId, id, body.FullName, body.Phone), ct);
        return result.ToActionResult();
    }

    [Function("DeactivateUser")]
    public async Task<IActionResult> DeactivateUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/deactivate")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var result = await mediator.Send(new DeactivateUserCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ActivateUser")]
    public async Task<IActionResult> ActivateUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/activate")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var result = await mediator.Send(new ActivateUserCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ChangePassword")]
    public async Task<IActionResult> ChangePassword(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/users/{id}/password")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var body = await req.DeserializeAsync<ChangePasswordRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(new ChangePasswordCommand(societyId, id, body.CurrentPassword, body.NewPassword), ct);
        return result.ToActionResult();
    }

    [Function("GenerateInviteLink")]
    public async Task<IActionResult> GenerateInviteLink(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/invite-link")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin", "SUUser")) return new ForbidResult();
        var body = await req.DeserializeAsync<GenerateInviteLinkRequest>(ct);
        var result = await mediator.Send(new GenerateInviteLinkCommand(societyId, body?.ApartmentId), ct);
        return result.ToActionResult(201);
    }

    [Function("ValidateInviteToken")]
    public async Task<IActionResult> ValidateInviteToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "invite/validate")] HttpRequest req,
        CancellationToken ct)
    {
        var token = req.Query["token"].ToString();
        if (string.IsNullOrWhiteSpace(token))
            return new BadRequestObjectResult(new { error = "token query parameter is required." });
        var result = await mediator.Send(new ValidateInviteTokenQuery(token), ct);
        return result.ToActionResult();
    }

    [Function("SelfRegister")]
    public async Task<IActionResult> SelfRegister(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/auth/register")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<SelfRegisterRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new SelfRegisterCommand(societyId, body.FullName, body.Email, body.Phone, body.Password), ct);
        return result.ToActionResult(201);
    }

    [Function("RequestApartmentJoin")]
    public async Task<IActionResult> RequestApartmentJoin(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/apartment-join-request")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var body = await req.DeserializeAsync<RequestApartmentJoinRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(new RequestApartmentJoinCommand(societyId, id, body.ApartmentId, body.ResidentType), ct);
        return result.ToActionResult();
    }

    [Function("ApproveApartmentJoin")]
    public async Task<IActionResult> ApproveApartmentJoin(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/apartment-join-request/approve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ForbidResult();
        var result = await mediator.Send(new ApproveApartmentJoinCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("DenyApartmentJoin")]
    public async Task<IActionResult> DenyApartmentJoin(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/apartment-join-request/deny")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ForbidResult();
        var result = await mediator.Send(new DenyApartmentJoinCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("GetPendingApartmentJoinRequests")]
    public async Task<IActionResult> GetPendingApartmentJoinRequests(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users/pending-join-requests")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ForbidResult();
        var result = await mediator.Send(new GetUsersWithPendingJoinRequestsQuery(societyId), ct);
        return result.ToActionResult();
    }
}
