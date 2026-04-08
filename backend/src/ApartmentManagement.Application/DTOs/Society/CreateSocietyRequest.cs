namespace ApartmentManagement.Application.DTOs.Society;

public record CreateSocietyRequest(
    string Name,
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    string ContactEmail,
    string ContactPhone,
    int TotalBlocks,
    int TotalApartments
);
