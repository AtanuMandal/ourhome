using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>A notice or announcement posted by society management.</summary>
public sealed class Notice : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public NoticeCategory Category { get; private set; }
    public string PostedByUserId { get; private set; } = string.Empty;
    public List<string> AttachmentUrls { get; private set; } = [];
    public bool IsArchived { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public DateTime PublishAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public List<string> TargetApartmentIds { get; private set; } = [];

    /// <summary>True when the notice is published and not archived or expired.</summary>
    public bool IsActive =>
        !IsArchived &&
        DateTime.UtcNow >= PublishAt &&
        (ExpiresAt is null || DateTime.UtcNow < ExpiresAt);

    private Notice() { }

    public static Notice Create(string societyId, string postedByUserId, string title, string content,
        NoticeCategory category, DateTime publishAt, DateTime? expiresAt = null,
        IEnumerable<string>? targetApartmentIds = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        ArgumentException.ThrowIfNullOrWhiteSpace(content, nameof(content));

        var notice = new Notice
        {
            SocietyId = societyId,
            PostedByUserId = postedByUserId,
            Title = title.Trim(),
            Content = content,
            Category = category,
            PublishAt = publishAt,
            ExpiresAt = expiresAt,
            TargetApartmentIds = [.. (targetApartmentIds ?? [])]
        };
        notice.AddDomainEvent(new NoticePostedEvent(notice.Id, societyId, category.ToString(), title));
        return notice;
    }

    public void Archive()
    {
        IsArchived = true;
        ArchivedAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    public void UpdateContent(string title, string content, DateTime? expiresAt)
    {
        if (!string.IsNullOrWhiteSpace(title)) Title = title.Trim();
        if (!string.IsNullOrWhiteSpace(content)) Content = content;
        ExpiresAt = expiresAt;
        TouchUpdatedAt();
    }
}
