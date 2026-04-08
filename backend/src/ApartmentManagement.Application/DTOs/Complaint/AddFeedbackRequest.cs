namespace ApartmentManagement.Application.DTOs.Complaint;

public record AddFeedbackRequest(
    int Rating,
    string Comment
);
