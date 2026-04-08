using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.User;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Phone,
    UserRole Role,
    string? ApartmentId
);
