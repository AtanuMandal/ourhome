using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.Complaint;

public record UpdateComplaintStatusRequest(
    ComplaintStatus Status,
    string? AssignedToUserId,
    string? Notes
);
