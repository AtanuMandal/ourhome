using ApartmentManagement.Application.Queries.Files;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

/// <summary>
/// Serves previously-uploaded files (visitor photos, maintenance/vendor proofs) through the
/// application instead of handing out raw, long-lived Azure Blob Storage / SAS URLs. Requests
/// require a valid session for the file's society, except for the visitor-images container
/// which also backs the existing unauthenticated public visitor-pass share link — see
/// FileContainers.IsPubliclyReadable.
/// </summary>
public class FileFunctions(ISender mediator)
{
    [Function("GetFile")]
    public async Task<IActionResult> GetFile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "files/{containerName}/{*blobPath}")] HttpRequest req,
        string containerName, string blobPath, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
            return new BadRequestObjectResult("A file path is required.");

        var result = await mediator.Send(new GetFileQuery(containerName, blobPath), ct);
        if (result.IsFailure)
        {
            return result.ErrorCode switch
            {
                "NOT_FOUND" => new NotFoundObjectResult(new { error = result.ErrorMessage }),
                "FORBIDDEN" => new ObjectResult(new { error = result.ErrorMessage }) { StatusCode = 403 },
                _ => new ObjectResult(new { error = result.ErrorMessage }) { StatusCode = 500 },
            };
        }

        return new FileContentResult(result.Value!.Content, result.Value!.ContentType);
    }
}
