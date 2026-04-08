namespace ApartmentManagement.Application.DTOs.User;

public record UpdateUserRequest(
    string FullName,
    string Phone
);
