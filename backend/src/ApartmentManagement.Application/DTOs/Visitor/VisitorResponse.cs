using System;

namespace ApartmentManagement.Application.DTOs.Visitor;

public record VisitorResponse(
    string Id,
    string SocietyId,
    string VisitorName,
    string VisitorPhone,
    string? VisitorEmail,
    string Purpose,
    string? HostApartmentId,
    string? HostApartmentNumber,
    string? HostUserId,
    string? HostResidentName,
    string Status,
    string? QrCode,
    string PassCode,
    string? VehicleNumber,
    string RegisteredByUserId,
    bool RequiresApproval,
    bool CanApprove,
    bool CanCheckIn,
    bool CanCheckOut,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    double? Duration,
    DateTime CreatedAt
);
