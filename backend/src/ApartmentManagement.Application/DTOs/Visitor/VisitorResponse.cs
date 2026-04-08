using System;

namespace ApartmentManagement.Application.DTOs.Visitor;

public record VisitorResponse(
    string Id,
    string SocietyId,
    string VisitorName,
    string VisitorPhone,
    string Purpose,
    string HostApartmentId,
    string Status,
    string? QrCode,
    string PassCode,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    double? Duration,
    DateTime CreatedAt
);
