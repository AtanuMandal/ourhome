using ApartmentManagement.Infrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Infrastructure;

public class MobilePushTokenDocumentTests
{
    [Fact]
    public void MobilePushTokenDocument_HasCorrectDefaults()
    {
        // Arrange & Act
        var before = DateTime.UtcNow;
        var doc = new MobilePushTokenDocument();
        var after = DateTime.UtcNow;

        // Assert
        doc.Id.Should().NotBeNullOrWhiteSpace();
        doc.CreatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
        doc.UpdatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
        doc.SocietyId.Should().Be(string.Empty);
        doc.UserId.Should().Be(string.Empty);
        doc.Platform.Should().Be(string.Empty);
        doc.Token.Should().Be(string.Empty);
        doc.AppVersion.Should().BeNull();
    }

    [Fact]
    public void MobilePushTokenDocument_PlatformAndTokenSet()
    {
        // Arrange
        var doc = new MobilePushTokenDocument
        {
            Platform = "android",
            Token    = "abc"
        };

        // Assert
        doc.Platform.Should().Be("android");
        doc.Token.Should().Be("abc");
    }
}
