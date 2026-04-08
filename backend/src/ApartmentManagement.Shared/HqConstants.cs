namespace ApartmentManagement.Shared.Constants;

/// <summary>
/// Reserved partition key used for HQ (HeadQuarters) platform-level users.
/// HQ users are not scoped to any society; they are stored in the users container
/// under this sentinel societyId so the Cosmos partition model is preserved.
/// </summary>
public static class HqConstants
{
    public const string PartitionKey = "hq";
}
