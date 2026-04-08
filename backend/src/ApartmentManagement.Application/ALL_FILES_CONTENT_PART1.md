//====================================================================
// ALL C# FILES FOR APARTMENT MANAGEMENT APPLICATION
// Copy each section into its respective file
//====================================================================

// FILE: Common\Behaviors\LoggingBehavior.cs
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var response = await next();
            stopwatch.Stop();
            _logger.LogInformation("Handled {RequestName} in {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error handling {RequestName} after {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}

// END FILE: Common\Behaviors\LoggingBehavior.cs
