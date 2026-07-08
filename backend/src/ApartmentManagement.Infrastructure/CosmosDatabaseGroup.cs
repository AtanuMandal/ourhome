namespace ApartmentManagement.Infrastructure;

/// <summary>
/// Logical grouping of Cosmos containers into separate databases (same Cosmos account,
/// same connection string — Serverless billing is per-request, not per-database, so this
/// costs nothing extra while keeping each database under ~10 containers).
/// </summary>
public enum CosmosDatabaseGroup
{
    /// <summary>Core multi-tenancy identity: societies, apartments, users.</summary>
    Identity,

    /// <summary>Day-to-day resident-facing activity: amenities, complaints, notices, visitors.</summary>
    Operations,

    /// <summary>Workforce management: shifts, staff roster, attendance.</summary>
    Staff,

    /// <summary>Money in/out: maintenance billing, fees, vendor expenses.</summary>
    Finance,

    /// <summary>Community engagement and the local services marketplace.</summary>
    Engagement,

    /// <summary>Cross-cutting platform infrastructure: outbox, push/mobile notification registrations.</summary>
    Platform,
}
