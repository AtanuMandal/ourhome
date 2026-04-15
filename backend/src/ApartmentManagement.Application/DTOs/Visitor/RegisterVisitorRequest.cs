namespace ApartmentManagement.Application.DTOs.Visitor;

public record RegisterVisitorRequest(
    string VisitorName,
    string VisitorPhone,
    string? VisitorEmail,
    string Purpose,
    string? HostApartmentId,
    string? HostUserId,
    string? VehicleNumber
);
