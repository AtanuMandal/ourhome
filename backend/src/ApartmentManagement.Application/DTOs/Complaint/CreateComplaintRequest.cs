using System.Collections.Generic;
using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.Complaint;

public record CreateComplaintRequest(
    string Title,
    string Description,
    ComplaintCategory Category,
    ComplaintPriority Priority,
    List<string> AttachmentUrls
);
