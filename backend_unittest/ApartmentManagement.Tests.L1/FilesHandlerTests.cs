using System.Text;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Files;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class GetFileQueryHandlerTests
{
    private readonly Mock<IFileStorageService> _fileStorageMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<GetFileQueryHandler>> _loggerMock = new();

    private GetFileQueryHandler CreateHandler() =>
        new(_fileStorageMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_AuthenticatedForOwnSociety_StreamsBytes()
    {
        var bytes = Encoding.UTF8.GetBytes("proof-bytes");
        _currentUserMock.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUserMock.SetupGet(c => c.SocietyId).Returns("soc-001");
        _fileStorageMock
            .Setup(s => s.DownloadAsync("maintenance-proofs", "soc-001/user-1/abc.jpg", It.IsAny<CancellationToken>()))
            .ReturnsAsync((new MemoryStream(bytes), "image/jpeg"));

        var result = await CreateHandler().Handle(
            new GetFileQuery("maintenance-proofs", "soc-001/user-1/abc.jpg"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Content.Should().Equal(bytes);
        result.Value!.ContentType.Should().Be("image/jpeg");
    }

    [Fact]
    public async Task Handle_AuthenticatedForDifferentSociety_ReturnsForbidden()
    {
        _currentUserMock.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUserMock.SetupGet(c => c.SocietyId).Returns("soc-002");

        var result = await CreateHandler().Handle(
            new GetFileQuery("maintenance-proofs", "soc-001/user-1/abc.jpg"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
        _fileStorageMock.Verify(s => s.DownloadAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_UnauthenticatedForNonPublicContainer_ReturnsForbidden()
    {
        _currentUserMock.SetupGet(c => c.IsAuthenticated).Returns(false);

        var result = await CreateHandler().Handle(
            new GetFileQuery("vendor-payments", "soc-001/receipts/abc.pdf"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_UnauthenticatedForVisitorImages_StreamsBytesAnyway()
    {
        // Visitor images back the existing unauthenticated public visitor-pass share link.
        var bytes = Encoding.UTF8.GetBytes("visitor-photo-bytes");
        _currentUserMock.SetupGet(c => c.IsAuthenticated).Returns(false);
        _fileStorageMock
            .Setup(s => s.DownloadAsync("visitor-images", "soc-001/abc.jpg", It.IsAny<CancellationToken>()))
            .ReturnsAsync((new MemoryStream(bytes), "image/jpeg"));

        var result = await CreateHandler().Handle(
            new GetFileQuery("visitor-images", "soc-001/abc.jpg"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Content.Should().Equal(bytes);
    }

    [Fact]
    public async Task Handle_MissingBlob_ReturnsNotFound()
    {
        _currentUserMock.SetupGet(c => c.IsAuthenticated).Returns(true);
        _currentUserMock.SetupGet(c => c.SocietyId).Returns("soc-001");
        _fileStorageMock
            .Setup(s => s.DownloadAsync("maintenance-proofs", "soc-001/missing.jpg", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new FileNotFoundException("not found"));

        var result = await CreateHandler().Handle(
            new GetFileQuery("maintenance-proofs", "soc-001/missing.jpg"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NotFound);
    }
}
