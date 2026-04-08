namespace ApartmentManagement.Application.DTOs.User;

public record LoginRequest(
    string Email,
    string Password,
    string SocietyId
);
