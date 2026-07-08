using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Mappings;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Application;

public class ContactMaskingTests
{
    private static UserResponse BuildResponse(string id = "user-002", string email = "ranadip.bec@gmail.com", string phone = "+91-9876543210") =>
        new(id, "society-001", "Bob Jones", email, phone, "SUUser", "Owner", "apt-001", null,
            true, true, true, [], [], DateTime.UtcNow);

    [Fact]
    public void ApplyContactMasking_SUUserViewingOtherResident_MasksPhoneAndEmailToDocumentedFormat()
    {
        var response = BuildResponse();

        var masked = response.ApplyContactMasking(viewerUserId: "viewer-alice-id", viewerRole: "SUUser");

        masked.Phone.Should().Be("+91-98XXXXXX10");
        masked.Email.Should().Be("ra***@***.com");
    }

    [Fact]
    public void ApplyContactMasking_SUUserViewingOwnRecord_ReturnsUnmasked()
    {
        var response = BuildResponse(id: "user-002");

        var masked = response.ApplyContactMasking(viewerUserId: "user-002", viewerRole: "SUUser");

        masked.Phone.Should().Be(response.Phone);
        masked.Email.Should().Be(response.Email);
    }

    [Theory]
    [InlineData("SUAdmin")]
    [InlineData("SUSecurity")]
    [InlineData("HQAdmin")]
    [InlineData("HQUser")]
    public void ApplyContactMasking_NonSUUserViewer_ReturnsUnmasked(string viewerRole)
    {
        var response = BuildResponse();

        var masked = response.ApplyContactMasking(viewerUserId: "some-other-id", viewerRole: viewerRole);

        masked.Phone.Should().Be(response.Phone);
        masked.Email.Should().Be(response.Email);
    }

    [Fact]
    public void ApplyContactMasking_NullOrEmptyViewerRole_ReturnsUnmasked()
    {
        var response = BuildResponse();

        var masked = response.ApplyContactMasking(viewerUserId: null, viewerRole: null);

        masked.Phone.Should().Be(response.Phone);
        masked.Email.Should().Be(response.Email);
    }

    [Fact]
    public void ApplyContactMasking_ShortPhoneNumber_MasksAllDigits()
    {
        var response = BuildResponse(phone: "1234");

        var masked = response.ApplyContactMasking(viewerUserId: "someone-else", viewerRole: "SUUser");

        masked.Phone.Should().Be("XXXX");
    }
}
