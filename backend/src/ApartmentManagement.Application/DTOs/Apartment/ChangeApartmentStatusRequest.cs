using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.Apartment;

public record ChangeApartmentStatusRequest(
    ApartmentStatus Status,
    string Reason
);
