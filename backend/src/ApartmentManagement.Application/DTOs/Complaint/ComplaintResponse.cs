using System;
using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.Complaint;

public record ComplaintResponse(
    string Id,
    string SocietyId,
    string ApartmentId,
    string RaisedByUserId,
    string Title,
    string Description,
    string Category,
    string Status,
    string Priority,
    string? AssignedToUserId,
    IReadOnlyList<string> AttachmentUrls,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt,
    int? FeedbackRating,
    string? FeedbackComment
);
