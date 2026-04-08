using System;

namespace ApartmentManagement.Application.DTOs.User;

public record UserResponse(
    string Id,
    string SocietyId,
    string FullName,
    string Email,
    string Phone,
    string Role,
    string? ApartmentId,
    bool IsActive,
    bool IsVerified,
    DateTime CreatedAt
);
