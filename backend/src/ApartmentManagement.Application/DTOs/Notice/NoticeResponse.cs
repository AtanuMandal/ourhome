using System;
using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.Notice;

public record NoticeResponse(
    string Id,
    string SocietyId,
    string Title,
    string Content,
    string Category,
    string PostedByUserId,
    bool IsArchived,
    DateTime PublishAt,
    DateTime? ExpiresAt,
    bool IsActive,
    DateTime CreatedAt,
    IReadOnlyList<string> TargetApartmentIds
);
