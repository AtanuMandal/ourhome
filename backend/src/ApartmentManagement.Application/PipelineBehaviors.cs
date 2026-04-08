using ApartmentManagement.Shared.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
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
