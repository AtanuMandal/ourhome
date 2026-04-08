namespace ApartmentManagement.Application.DTOs.Apartment;

public record CreateApartmentRequest(
    string ApartmentNumber,
    string BlockName,
    int FloorNumber,
    int NumberOfRooms,
    int ParkingSlots,
    string? OwnerId
);
