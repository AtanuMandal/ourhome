using ApartmentManagement.Shared.Models;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Shared;

/// <summary>Server-side 10-minute enforcement for delta/auto-refresh queries — see requirements/auto_refresh.md.</summary>
public class AutoRefreshWindowTests
{
    [Fact]
    public void Clamp_RequestedSinceWithinWindow_ReturnsRequestedValueUnchanged()
    {
        // Arrange
        var now = new DateTime(2026, 7, 22, 12, 0, 0, DateTimeKind.Utc);
        var requested = now.AddMinutes(-5);

        // Act
        var clamped = AutoRefreshWindow.Clamp(requested, now);

        // Assert
        clamped.Should().Be(requested);
    }

    [Fact]
    public void Clamp_RequestedSinceOlderThanTenMinutes_ClampsToTenMinutesAgo()
    {
        // Arrange
        var now = new DateTime(2026, 7, 22, 12, 0, 0, DateTimeKind.Utc);
        var requested = now.AddHours(-2);

        // Act
        var clamped = AutoRefreshWindow.Clamp(requested, now);

        // Assert — a client cannot widen the delta window past 10 minutes, however old a value it sends.
        clamped.Should().Be(now.AddMinutes(-10));
    }

    [Fact]
    public void Clamp_RequestedSinceExactlyTenMinutesAgo_ReturnsRequestedValueUnchanged()
    {
        // Arrange
        var now = new DateTime(2026, 7, 22, 12, 0, 0, DateTimeKind.Utc);
        var requested = now.AddMinutes(-10);

        // Act
        var clamped = AutoRefreshWindow.Clamp(requested, now);

        // Assert
        clamped.Should().Be(requested);
    }

    [Fact]
    public void Clamp_RequestedSinceInTheFuture_ReturnsRequestedValueUnchanged()
    {
        // Arrange — clock skew between client and server should never widen the window; a
        // future timestamp simply means the delta result set will be empty, which is safe.
        var now = new DateTime(2026, 7, 22, 12, 0, 0, DateTimeKind.Utc);
        var requested = now.AddMinutes(5);

        // Act
        var clamped = AutoRefreshWindow.Clamp(requested, now);

        // Assert
        clamped.Should().Be(requested);
    }
}
