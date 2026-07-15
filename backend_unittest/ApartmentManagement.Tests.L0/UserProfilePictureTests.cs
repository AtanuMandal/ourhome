using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class UserProfilePictureTests
{
    private static User CreateUser() =>
        User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210",
            UserRole.SUUser, ResidentType.Owner);

    [Fact]
    public void Create_HasNoProfilePicture()
    {
        var user = CreateUser();

        user.ProfilePictureUrl.Should().BeNull();
    }

    [Fact]
    public void SetProfilePicture_StoresTrimmedUrl()
    {
        var user = CreateUser();

        user.SetProfilePicture("  files/profile-pictures/soc-001/abc.jpg  ");

        user.ProfilePictureUrl.Should().Be("files/profile-pictures/soc-001/abc.jpg");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void SetProfilePicture_WithBlankUrl_Throws(string url)
    {
        var user = CreateUser();

        var act = () => user.SetProfilePicture(url);

        act.Should().Throw<ArgumentException>();
    }
}
