using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Queries.Files;

public record FileContentDto(byte[] Content, string ContentType);

/// <summary>
/// Containers whose blobs may be read without authentication. Visitor images back the
/// existing public visitor-pass share link, which has never required a login — everything
/// else (maintenance proofs, vendor documents) is authenticated-only.
/// </summary>
public static class FileContainers
{
    public const string VisitorImages = "visitor-images";

    private static readonly HashSet<string> PubliclyReadable = new(StringComparer.OrdinalIgnoreCase) { VisitorImages };

    public static bool IsPubliclyReadable(string containerName) => PubliclyReadable.Contains(containerName);
}

public record GetFileQuery(string ContainerName, string BlobPath) : IRequest<Result<FileContentDto>>;

public sealed class GetFileQueryHandler(
    IFileStorageService fileStorageService,
    ICurrentUserService currentUser,
    ILogger<GetFileQueryHandler> logger)
    : IRequestHandler<GetFileQuery, Result<FileContentDto>>
{
    public async Task<Result<FileContentDto>> Handle(GetFileQuery request, CancellationToken ct)
    {
        try
        {
            // Every blob path is written as "{societyId}/...' by the upload handlers — the leading
            // segment doubles as the tenant boundary check for this shared container.
            var societyId = request.BlobPath.Split('/', 2)[0];
            var isPublic = FileContainers.IsPubliclyReadable(request.ContainerName);
            var isAuthorizedForSociety = currentUser.IsAuthenticated && currentUser.SocietyId == societyId;

            if (!isPublic && !isAuthorizedForSociety)
                return Result<FileContentDto>.Failure(ErrorCodes.Forbidden, "You are not authorized to access this file.");

            var (stream, contentType) = await fileStorageService.DownloadAsync(request.ContainerName, request.BlobPath, ct);
            using var _ = stream;
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, ct);

            return Result<FileContentDto>.Success(new FileContentDto(buffer.ToArray(), contentType));
        }
        catch (FileNotFoundException)
        {
            return Result<FileContentDto>.Failure(ErrorCodes.NotFound, "File not found.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to read file {Container}/{BlobPath}", request.ContainerName, request.BlobPath);
            return Result<FileContentDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
