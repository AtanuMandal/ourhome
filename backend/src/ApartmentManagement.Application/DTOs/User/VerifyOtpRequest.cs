namespace ApartmentManagement.Application.DTOs.User;

public record VerifyOtpRequest(
    string UserId,
    string OtpCode
);
