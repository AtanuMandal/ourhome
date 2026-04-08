namespace ApartmentManagement.Shared.Models;

/// <summary>
/// Discriminated union result type. Represents either a successful value or a failure with an error code.
/// </summary>
public sealed class Result<T>
{
    private readonly T? _value;

    /// <summary>Whether this result represents a success.</summary>
    public bool IsSuccess { get; }

    /// <summary>Whether this result represents a failure.</summary>
    public bool IsFailure => !IsSuccess;

    /// <summary>The result value. Only valid when <see cref="IsSuccess"/> is true.</summary>
    public T? Value => IsSuccess ? _value : default;

    /// <summary>Machine-readable error code (see <see cref="Constants.ErrorCodes"/>).</summary>
    public string ErrorCode { get; }

    /// <summary>Human-readable error message.</summary>
    public string ErrorMessage { get; }

    private Result(T value)
    {
        IsSuccess = true;
        _value = value;
        ErrorCode = string.Empty;
        ErrorMessage = string.Empty;
    }

    private Result(string errorCode, string errorMessage)
    {
        IsSuccess = false;
        _value = default;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    /// <summary>Creates a successful result wrapping <paramref name="value"/>.</summary>
    public static Result<T> Success(T value) => new(value);

    /// <summary>Creates a failure result with the given error information.</summary>
    public static Result<T> Failure(string errorCode, string message) => new(errorCode, message);

    /// <summary>Implicitly wraps a value in a successful result.</summary>
    public static implicit operator Result<T>(T value) => Success(value);
}

/// <summary>Non-generic result for void operations.</summary>
public sealed class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string ErrorCode { get; }
    public string ErrorMessage { get; }

    private Result(bool isSuccess, string errorCode, string message)
    {
        IsSuccess = isSuccess;
        ErrorCode = errorCode;
        ErrorMessage = message;
    }

    public static Result Success() => new(true, string.Empty, string.Empty);
    public static Result Failure(string errorCode, string message) => new(false, errorCode, message);
}
