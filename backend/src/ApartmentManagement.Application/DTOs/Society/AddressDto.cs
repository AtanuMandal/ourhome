namespace ApartmentManagement.Application.DTOs.Society;

public record AddressDto(
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country
);
