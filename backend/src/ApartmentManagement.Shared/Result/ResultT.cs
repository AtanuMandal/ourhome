namespace ApartmentManagement.Shared.Result;

public class Result<T> : Result
{
    private readonly T? _value;

    private Result(bool isSuccess, T? value, string errorCode, string errorMessage)
        : base(isSuccess, errorCode, errorMessage)
    {
        _value = value;
    }

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot access Value on a failed result.");

    public static Result<T> Success(T value) => new(true, value, string.Empty, string.Empty);
    public static new Result<T> Failure(string errorCode, string errorMessage) => new(false, default, errorCode, errorMessage);
}
