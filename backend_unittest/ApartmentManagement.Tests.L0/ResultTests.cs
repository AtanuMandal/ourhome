using ApartmentManagement.Shared.Models;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Shared;

public class ResultTests
{
    [Fact]
    public void Success_SetsIsSuccessTrue()
    {
        // Arrange & Act
        var result = Result<string>.Success("hello");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
    }

    [Fact]
    public void Success_ExposesValue()
    {
        // Arrange & Act
        var result = Result<int>.Success(42);

        // Assert
        result.Value.Should().Be(42);
    }

    [Fact]
    public void Failure_SetsIsFailureTrue()
    {
        // Arrange & Act
        var result = Result<string>.Failure("ERR_001", "Something went wrong");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.IsSuccess.Should().BeFalse();
    }

    [Fact]
    public void Failure_SetsErrorCodeAndMessage()
    {
        // Arrange & Act
        var result = Result<string>.Failure("SOCIETY_001", "Society not found");

        // Assert
        result.ErrorCode.Should().Be("SOCIETY_001");
        result.ErrorMessage.Should().Be("Society not found");
    }

    [Fact]
    public void Failure_ValueIsDefault()
    {
        // Arrange & Act
        var result = Result<string>.Failure("ERR", "msg");

        // Assert
        result.Value.Should().BeNull();
    }

    [Fact]
    public void ImplicitConversion_FromValue_ReturnsSuccessResult()
    {
        // Arrange & Act
        Result<int> result = 99;

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(99);
    }

    [Fact]
    public void NonGenericResult_Success_SetsIsSuccessTrue()
    {
        // Arrange & Act
        var result = Result.Success();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.ErrorCode.Should().BeEmpty();
    }

    [Fact]
    public void NonGenericResult_Failure_SetsErrorCode()
    {
        // Arrange & Act
        var result = Result.Failure("ERR_GENERIC", "generic error");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be("ERR_GENERIC");
    }
}

public class PagedResultTests
{
    private static PagedResult<string> CreatePagedResult(
        IReadOnlyList<string> items, int total, int page, int pageSize) =>
        new(items, total, page, pageSize);

    [Fact]
    public void TotalPages_CalculatesCorrectly()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a", "b"], 25, 1, 10);

        // Assert
        result.TotalPages.Should().Be(3); // ceil(25/10) = 3
    }

    [Fact]
    public void TotalPages_WhenExactMultiple_CalculatesCorrectly()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a"], 20, 1, 10);

        // Assert
        result.TotalPages.Should().Be(2);
    }

    [Fact]
    public void HasNextPage_WhenOnFirstOfMultiplePages_ReturnsTrue()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a"], 25, 1, 10);

        // Assert
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public void HasNextPage_WhenOnLastPage_ReturnsFalse()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a"], 10, 1, 10);

        // Assert
        result.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public void HasPreviousPage_OnFirstPage_ReturnsFalse()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a"], 25, 1, 10);

        // Assert
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public void HasPreviousPage_OnSecondPage_ReturnsTrue()
    {
        // Arrange & Act
        var result = CreatePagedResult(["a"], 25, 2, 10);

        // Assert
        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public void Items_ExposesProvidedList()
    {
        // Arrange
        var items = new[] { "x", "y", "z" }.ToList();

        // Act
        var result = CreatePagedResult(items, 100, 1, 10);

        // Assert
        result.Items.Should().HaveCount(3);
        result.Items.Should().Contain("y");
    }
}
