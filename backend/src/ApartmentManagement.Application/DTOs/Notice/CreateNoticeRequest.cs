using System;
using System.Collections.Generic;
using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.Notice;

public record CreateNoticeRequest(
    string Title,
    string Content,
    NoticeCategory Category,
    DateTime PublishAt,
    DateTime? ExpiresAt,
    List<string> TargetApartmentIds
);
