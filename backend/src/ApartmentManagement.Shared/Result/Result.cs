namespace ApartmentManagement.Shared.Result;

public class Result
{
    protected Result(bool isSuccess, string errorCode, string errorMessage)
    {
        IsSuccess = isSuccess;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string ErrorCode { get; } = string.Empty;
    public string ErrorMessage { get; } = string.Empty;

    public static Result Success() => new(true, string.Empty, string.Empty);
    public static Result Failure(string errorCode, string errorMessage) => new(false, errorCode, errorMessage);
}
