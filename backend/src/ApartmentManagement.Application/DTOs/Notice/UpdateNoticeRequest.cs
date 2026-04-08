using System;

namespace ApartmentManagement.Application.DTOs.Notice;

public record UpdateNoticeRequest(
    string Title,
    string Content,
    DateTime? ExpiresAt
);
