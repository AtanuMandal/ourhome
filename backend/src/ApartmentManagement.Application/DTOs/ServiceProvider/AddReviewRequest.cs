namespace ApartmentManagement.Application.DTOs.ServiceProvider;

public record AddReviewRequest(
    int Rating,
    string Comment
);
