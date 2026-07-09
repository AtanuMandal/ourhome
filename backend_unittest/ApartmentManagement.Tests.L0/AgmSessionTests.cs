using ApartmentManagement.Domain.Entities;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class AgmSessionTests
{
    [Fact]
    public void Create_WithValidParameters_ReturnsSession()
    {
        var sessionDate = new DateTime(2026, 4, 15, 10, 0, 0, DateTimeKind.Utc);
        var session = AgmSession.Create("soc-001", "admin-001", "Annual General Meeting 2026", "Yearly resolutions", sessionDate);

        session.Id.Should().NotBeNullOrEmpty();
        session.SocietyId.Should().Be("soc-001");
        session.CreatedByUserId.Should().Be("admin-001");
        session.Title.Should().Be("Annual General Meeting 2026");
        session.Description.Should().Be("Yearly resolutions");
        session.SessionDate.Should().Be(sessionDate);
    }

    [Fact]
    public void Create_WithEmptyTitle_ThrowsArgumentException()
    {
        var act = () => AgmSession.Create("soc-001", "admin-001", "", "desc", DateTime.UtcNow);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithNoDescription_LeavesDescriptionEmpty()
    {
        var session = AgmSession.Create("soc-001", "admin-001", "AGM", null!, DateTime.UtcNow);
        session.Description.Should().Be(string.Empty);
    }
}
