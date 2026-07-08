namespace ApartmentManagement.Domain.Entities;

/// <summary>A named duty shift (e.g. "Morning Security") that staff members are assigned to.</summary>
public sealed class Shift : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public TimeSpan StartTime { get; private set; }
    public TimeSpan EndTime { get; private set; }

    /// <summary>Minutes after <see cref="StartTime"/> before a check-in is considered late / missing.</summary>
    public int GraceMinutes { get; private set; } = 30;

    private Shift() { }

    public static Shift Create(string societyId, string name, TimeSpan startTime, TimeSpan endTime, int graceMinutes = 30)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        if (graceMinutes < 0)
            throw new ArgumentOutOfRangeException(nameof(graceMinutes), "Grace minutes cannot be negative.");

        return new Shift
        {
            SocietyId = societyId,
            Name = name.Trim(),
            StartTime = startTime,
            EndTime = endTime,
            GraceMinutes = graceMinutes,
        };
    }

    public void Update(string name, TimeSpan startTime, TimeSpan endTime, int graceMinutes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        if (graceMinutes < 0)
            throw new ArgumentOutOfRangeException(nameof(graceMinutes), "Grace minutes cannot be negative.");

        Name = name.Trim();
        StartTime = startTime;
        EndTime = endTime;
        GraceMinutes = graceMinutes;
        TouchUpdatedAt();
    }
}
