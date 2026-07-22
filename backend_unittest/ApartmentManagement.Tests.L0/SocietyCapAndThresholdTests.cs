using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.ValueObjects;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class SocietyCapAndThresholdTests
{
    private static Address ValidAddress() =>
        new("123 Main St", "Mumbai", "Maharashtra", "400001", "India");

    private static Society CreateSociety() =>
        Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

    [Fact]
    public void Create_DefaultsMaxUsersPerApartmentAndVisitorOverstayThreshold()
    {
        var society = CreateSociety();

        society.MaxUsersPerApartment.Should().Be(Society.DefaultMaxUsersPerApartment);
        society.VisitorOverstayThresholdHours.Should().Be(Society.DefaultVisitorOverstayThresholdHours);
    }

    [Fact]
    public void SetMaxUsersPerApartment_WithValidValue_UpdatesCap()
    {
        var society = CreateSociety();

        society.SetMaxUsersPerApartment(4);

        society.MaxUsersPerApartment.Should().Be(4);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void SetMaxUsersPerApartment_OutOfRange_Throws(int cap)
    {
        var society = CreateSociety();

        var act = () => society.SetMaxUsersPerApartment(cap);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void SetVisitorOverstayThreshold_WithValidValue_UpdatesThreshold()
    {
        var society = CreateSociety();

        society.SetVisitorOverstayThreshold(8);

        society.VisitorOverstayThresholdHours.Should().Be(8);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(25)]
    public void SetVisitorOverstayThreshold_OutOfRange_Throws(int hours)
    {
        var society = CreateSociety();

        var act = () => society.SetVisitorOverstayThreshold(hours);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_DefaultsLogoAndSidenavBackgroundToNull()
    {
        var society = CreateSociety();

        society.LogoUrl.Should().BeNull();
        society.SidenavBackgroundUrl.Should().BeNull();
    }

    [Fact]
    public void SetLogoUrl_WithValue_SetsLogoUrl()
    {
        var society = CreateSociety();

        society.SetLogoUrl("files/society-logos/soc-1/abc.jpg");

        society.LogoUrl.Should().Be("files/society-logos/soc-1/abc.jpg");
    }

    [Fact]
    public void SetLogoUrl_WithNullOrBlank_ClearsLogoUrl()
    {
        var society = CreateSociety();
        society.SetLogoUrl("files/society-logos/soc-1/abc.jpg");

        society.SetLogoUrl("   ");

        society.LogoUrl.Should().BeNull();
    }

    [Fact]
    public void SetSidenavBackgroundUrl_WithValue_SetsSidenavBackgroundUrl()
    {
        var society = CreateSociety();

        society.SetSidenavBackgroundUrl("files/society-backgrounds/soc-1/abc.jpg");

        society.SidenavBackgroundUrl.Should().Be("files/society-backgrounds/soc-1/abc.jpg");
    }

    [Fact]
    public void SetSidenavBackgroundUrl_WithNullOrBlank_ClearsSidenavBackgroundUrl()
    {
        var society = CreateSociety();
        society.SetSidenavBackgroundUrl("files/society-backgrounds/soc-1/abc.jpg");

        society.SetSidenavBackgroundUrl(null);

        society.SidenavBackgroundUrl.Should().BeNull();
    }
}
