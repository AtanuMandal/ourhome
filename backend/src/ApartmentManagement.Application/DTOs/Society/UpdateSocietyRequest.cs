namespace ApartmentManagement.Application.DTOs.Society;

public record UpdateSocietyRequest(
    string Name,
    string ContactEmail,
    string ContactPhone,
    int TotalBlocks,
    int TotalApartments
);
