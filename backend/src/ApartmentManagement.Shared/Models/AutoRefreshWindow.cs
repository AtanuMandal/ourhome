namespace ApartmentManagement.Shared.Models;

/// <summary>
/// Server-side enforcement for delta ("what changed recently") list queries — see
/// requirements/auto_refresh.md. A client may pass an `updatedSince` timestamp to ask for only
/// records created/updated after it, but the server never honors a window wider than
/// <see cref="MaxWindow"/> regardless of what the client requests. This is what actually caps
/// auto-refresh traffic to "last 10 minutes only" — it is not client-side discipline alone.
/// </summary>
public static class AutoRefreshWindow
{
    public static readonly TimeSpan MaxWindow = TimeSpan.FromMinutes(10);

    /// <summary>Clamps a client-supplied `updatedSince` to at most <see cref="MaxWindow"/> before <paramref name="nowUtc"/>.</summary>
    public static DateTime Clamp(DateTime requestedSinceUtc, DateTime nowUtc)
    {
        var earliestAllowed = nowUtc - MaxWindow;
        return requestedSinceUtc > earliestAllowed ? requestedSinceUtc : earliestAllowed;
    }
}
