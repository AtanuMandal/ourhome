using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>A complaint or issue raised by a resident.</summary>
public sealed class Complaint : BaseEntity
{
    public string ApartmentId { get; private set; } = string.Empty;
    public string RaisedByUserId { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public ComplaintCategory Category { get; private set; }
    public ComplaintStatus Status { get; private set; }
    public ComplaintPriority Priority { get; private set; }
    public string? AssignedToUserId { get; private set; }
    public List<string> AttachmentUrls { get; private set; } = [];
    public DateTime? ResolvedAt { get; private set; }
    public int? FeedbackRating { get; private set; }
    public string? FeedbackComment { get; private set; }

    private Complaint() { }

    public static Complaint Create(string societyId, string apartmentId, string raisedByUserId,
        string title, string description, ComplaintCategory category, ComplaintPriority priority,
        IEnumerable<string>? attachmentUrls = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        ArgumentException.ThrowIfNullOrWhiteSpace(description, nameof(description));

        var complaint = new Complaint
        {
            SocietyId = societyId,
            ApartmentId = apartmentId,
            RaisedByUserId = raisedByUserId,
            Title = title.Trim(),
            Description = description.Trim(),
            Category = category,
            Priority = priority,
            Status = ComplaintStatus.Open,
            AttachmentUrls = [.. (attachmentUrls ?? [])]
        };
        complaint.AddDomainEvent(new ComplaintCreatedEvent(complaint.Id, societyId, apartmentId, category.ToString()));
        return complaint;
    }

    /// <summary>Assigns the complaint to a staff member and transitions to InProgress.</summary>
    public void Assign(string assignedToUserId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(assignedToUserId, nameof(assignedToUserId));
        AssignedToUserId = assignedToUserId;
        if (Status == ComplaintStatus.Open) Status = ComplaintStatus.InProgress;
        TouchUpdatedAt();
        AddDomainEvent(new ComplaintStatusChangedEvent(Id, SocietyId, Status.ToString(), assignedToUserId));
    }

    public void Resolve()
    {
        Status = ComplaintStatus.Resolved;
        ResolvedAt = DateTime.UtcNow;
        TouchUpdatedAt();
        AddDomainEvent(new ComplaintStatusChangedEvent(Id, SocietyId, Status.ToString(), AssignedToUserId));
    }

    public void Close() { Status = ComplaintStatus.Closed; TouchUpdatedAt(); }

    public void Reject(string notes)
    {
        Status = ComplaintStatus.Rejected;
        TouchUpdatedAt();
        AddDomainEvent(new ComplaintStatusChangedEvent(Id, SocietyId, Status.ToString(), null));
    }

    /// <summary>Adds resident feedback after resolution. Rating must be between 1 and 5.</summary>
    public void AddFeedback(int rating, string? comment)
    {
        if (rating < 1 || rating > 5) throw new ArgumentOutOfRangeException(nameof(rating), "Rating must be between 1 and 5.");
        FeedbackRating = rating;
        FeedbackComment = comment;
        TouchUpdatedAt();
    }

    public void AddAttachment(string url)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url, nameof(url));
        AttachmentUrls.Add(url);
        TouchUpdatedAt();
    }
}
