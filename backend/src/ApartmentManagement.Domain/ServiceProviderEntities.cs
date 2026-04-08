using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Entities;

/// <summary>A registered local service provider (plumber, electrician, etc.).</summary>
public sealed class ServiceProvider : BaseEntity
{
    public string ProviderName { get; private set; } = string.Empty;
    public string ContactName { get; private set; } = string.Empty;
    public string ContactPhone { get; private set; } = string.Empty;
    public string ContactEmail { get; private set; } = string.Empty;
    public List<string> ServiceTypes { get; private set; } = [];
    public string Description { get; private set; } = string.Empty;
    public ServiceProviderStatus Status { get; private set; }
    public decimal Rating { get; private set; }
    public int ReviewCount { get; private set; }

    private ServiceProvider() { }

    /// <summary>
    /// Creates a provider. <paramref name="societyId"/> is null for global providers available across societies.
    /// </summary>
    public static ServiceProvider Create(string providerName, string contactName, string contactPhone,
        string contactEmail, IEnumerable<string> serviceTypes, string description, string? societyId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(providerName, nameof(providerName));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactPhone, nameof(contactPhone));

        var types = serviceTypes?.ToList() ?? [];
        if (types.Count == 0) throw new ArgumentException("At least one service type is required.", nameof(serviceTypes));

        return new ServiceProvider
        {
            SocietyId = societyId ?? string.Empty,
            ProviderName = providerName.Trim(),
            ContactName = contactName.Trim(),
            ContactPhone = contactPhone.Trim(),
            ContactEmail = contactEmail.Trim().ToLowerInvariant(),
            ServiceTypes = types,
            Description = description,
            Status = ServiceProviderStatus.Pending,
            Rating = 0m,
            ReviewCount = 0
        };
    }

    public void Approve() { Status = ServiceProviderStatus.Approved; TouchUpdatedAt(); }
    public void Reject() { Status = ServiceProviderStatus.Rejected; TouchUpdatedAt(); }
    public void Suspend() { Status = ServiceProviderStatus.Suspended; TouchUpdatedAt(); }

    /// <summary>Updates the provider's cumulative rating using a running weighted average.</summary>
    public void UpdateRating(decimal newRating)
    {
        if (newRating < 1 || newRating > 5) throw new ArgumentOutOfRangeException(nameof(newRating));
        Rating = ReviewCount == 0
            ? newRating
            : (Rating * ReviewCount + newRating) / (ReviewCount + 1);
        ReviewCount++;
        TouchUpdatedAt();
    }
}

/// <summary>A resident's request for a local service.</summary>
public sealed class ServiceProviderRequest : BaseEntity
{
    public string ApartmentId { get; private set; } = string.Empty;
    public string RequestedByUserId { get; private set; } = string.Empty;
    public string ServiceType { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTime PreferredDateTime { get; private set; }
    public ServiceRequestStatus Status { get; private set; }
    public string? AcceptedByProviderId { get; private set; }
    public int? Rating { get; private set; }
    public string? ReviewComment { get; private set; }

    private ServiceProviderRequest() { }

    public static ServiceProviderRequest Create(string societyId, string apartmentId, string requestedByUserId,
        string serviceType, string description, DateTime preferredDateTime)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(serviceType, nameof(serviceType));
        ArgumentException.ThrowIfNullOrWhiteSpace(description, nameof(description));

        return new ServiceProviderRequest
        {
            SocietyId = societyId,
            ApartmentId = apartmentId,
            RequestedByUserId = requestedByUserId,
            ServiceType = serviceType.Trim(),
            Description = description,
            PreferredDateTime = preferredDateTime,
            Status = ServiceRequestStatus.Open
        };
    }

    public void Accept(string providerId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(providerId, nameof(providerId));
        AcceptedByProviderId = providerId;
        Status = ServiceRequestStatus.Accepted;
        TouchUpdatedAt();
    }

    public void StartWork() { Status = ServiceRequestStatus.InProgress; TouchUpdatedAt(); }
    public void Complete() { Status = ServiceRequestStatus.Completed; TouchUpdatedAt(); }
    public void Cancel() { Status = ServiceRequestStatus.Cancelled; TouchUpdatedAt(); }

    public void AddReview(int rating, string? comment)
    {
        if (rating < 1 || rating > 5) throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be 1–5.");
        Rating = rating;
        ReviewComment = comment;
        TouchUpdatedAt();
    }
}
