namespace ApartmentManagement.Application.DTOs.Society;

public record ConfigureFeeRequest(
    decimal BaseAmount,
    decimal PerRoomCharge,
    decimal ParkingCharge,
    string Currency
);
