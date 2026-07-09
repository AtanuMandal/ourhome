using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Reflection;
using ValidationException = ApartmentManagement.Shared.Exceptions.ValidationException;

namespace ApartmentManagement.Application.Behaviors;

public sealed class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger,
    ApartmentManagement.Application.Interfaces.ICurrentUserService currentUser)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName} | UserId={UserId} SocietyId={SocietyId}",
            requestName, currentUser.UserId, currentUser.SocietyId);
        var sw = Stopwatch.StartNew();
        try
        {
            var response = await next();
            sw.Stop();
            logger.LogInformation("Handled {RequestName} successfully in {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogError(ex, "Request {RequestName} failed after {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
            throw;
        }
    }
}

public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var failures = results.SelectMany(r => r.Errors).Where(f => f != null).ToList();

        if (failures.Count > 0)
        {
            var errors = failures
                .GroupBy(f => f.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(f => f.ErrorMessage).ToArray());
            throw new ApartmentManagement.Shared.Exceptions.ValidationException(errors);
        }

        return await next();
    }
}

public interface IAuthorizedRequest
{
    IReadOnlyList<string> RequiredRoles { get; }
}

public sealed class AuthorizationBehavior<TRequest, TResponse>(
    ApartmentManagement.Application.Interfaces.ICurrentUserService currentUser)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is IAuthorizedRequest authRequest)
        {
            var requiredRoles = authRequest.RequiredRoles;
            if (requiredRoles.Count > 0 && !requiredRoles.Any(currentUser.IsInRole))
                throw new ForbiddenException("Insufficient permissions.");
        }
        return await next();
    }
}

/// <summary>
/// Blocks every request from a caller whose home society has been disabled (deactivated) by
/// HQAdmin. HQ users (partitioned under <see cref="HqConstants.PartitionKey"/>) are never scoped
/// to a single society and are exempt. A society in "Draft" (not yet published) is NOT blocked —
/// only an explicitly deactivated ("Inactive") society locks out its own users.
/// Runs for every <see cref="IRequest{TResponse}"/> uniformly; short-circuits to a failure result
/// via reflection since every command/query in this app returns <c>Result&lt;T&gt;</c>, which
/// exposes a matching static <c>Failure(string,string)</c> factory. Requests whose response type
/// has no such factory are left untouched (defensive no-op rather than a hard failure).
/// </summary>
public sealed class SocietyActiveBehavior<TRequest, TResponse>(
    ApartmentManagement.Application.Interfaces.ICurrentUserService currentUser,
    ISocietyRepository societyRepository)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly MethodInfo? FailureFactory = typeof(TResponse).GetMethod(
        "Failure", BindingFlags.Public | BindingFlags.Static, null, [typeof(string), typeof(string)], null);

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (FailureFactory is not null
            && currentUser.IsAuthenticated
            && !string.IsNullOrWhiteSpace(currentUser.SocietyId)
            && !string.Equals(currentUser.SocietyId, HqConstants.PartitionKey, StringComparison.OrdinalIgnoreCase))
        {
            var society = await societyRepository.GetByIdAsync(currentUser.SocietyId, currentUser.SocietyId, cancellationToken);
            if (society is not null && society.Status == SocietyStatus.Inactive)
            {
                return (TResponse)FailureFactory.Invoke(null, [
                    ErrorCodes.SocietyNotActive,
                    "Your society has been disabled by the platform administrator. Please contact your housing society for assistance."
                ])!;
            }
        }
        return await next();
    }
}
