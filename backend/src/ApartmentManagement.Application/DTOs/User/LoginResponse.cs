using System;

namespace ApartmentManagement.Application.DTOs.User;

public record LoginResponse(
    string Token,
    string RefreshToken,
    DateTime ExpiresAt,
    UserResponse User
);
