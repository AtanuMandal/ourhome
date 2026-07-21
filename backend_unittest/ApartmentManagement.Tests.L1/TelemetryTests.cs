using System.Diagnostics;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Functions.Http.Telemetry;
using ApartmentManagement.Shared.Models;
using FluentAssertions;

namespace ApartmentManagement.Tests.L1.Telemetry;

// ─── TelemetryRedactor Tests ────────────────────────────────────────────────────
// See requirements/telemetry_observability.md §8 "Redaction & PII Rules" — every rule
// documented there has a corresponding case here.

public class TelemetryRedactorTests
{
    [Theory]
    [InlineData("password")]
    [InlineData("newPassword")]
    [InlineData("otp")]
    [InlineData("token")]
    [InlineData("accessToken")]
    [InlineData("refreshToken")]
    [InlineData("jwtSecret")]
    [InlineData("connectionString")]
    public void RedactBody_WithNeverLogField_ReplacesValueEntirely(string fieldName)
    {
        var body = $$"""{"{{fieldName}}":"super-secret-value","title":"ok"}""";

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().NotContain("super-secret-value");
        redacted.Should().Contain("***REDACTED***");
        redacted.Should().Contain("\"title\":\"ok\"", "non-sensitive fields must survive untouched");
    }

    [Fact]
    public void RedactBody_WithPhoneField_MasksRatherThanDrops()
    {
        var body = """{"visitorPhone":"+91-9876543210"}""";

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().NotContain("9876543210", "the full number must not survive");
        redacted.Should().Contain("98", "the masking pattern keeps some digits visible for identification");
        redacted.Should().Contain("visitorPhone");
    }

    [Fact]
    public void RedactBody_WithEmailField_MasksRatherThanDrops()
    {
        var body = """{"email":"resident@example.com"}""";

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().NotContain("resident@example.com");
        redacted.Should().Contain("re***@***.com");
    }

    [Fact]
    public void RedactBody_WithNestedObjectsAndArrays_RedactsRecursively()
    {
        var body = """
            {
              "user": { "email": "a@b.com", "nested": { "password": "hunter2" } },
              "items": [ { "token": "abc123" }, { "title": "fine" } ]
            }
            """;

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().NotContain("a@b.com");
        redacted.Should().NotContain("hunter2");
        redacted.Should().NotContain("abc123");
        redacted.Should().Contain("fine");
    }

    [Fact]
    public void RedactBody_WithMultipartContentType_SummarizesRegardlessOfSize()
    {
        var body = "a"; // tiny, but multipart bodies are never inlined regardless of size

        var redacted = TelemetryRedactor.RedactBody(body, "multipart/form-data; boundary=xyz", 2_400_000);

        redacted.Should().StartWith("<omitted:");
        redacted.Should().Contain("2400000");
    }

    [Fact]
    public void RedactBody_OverSizeCap_IsSummarizedNotInlined()
    {
        var big = "{\"title\":\"" + new string('x', TelemetryRedactor.MaxBodyBytes + 1) + "\"}";

        var redacted = TelemetryRedactor.RedactBody(big, "application/json");

        redacted.Should().StartWith("<omitted:");
        redacted.Should().NotContain("xxxx");
    }

    [Fact]
    public void RedactBody_NonJsonUnderSizeCap_PassesThroughUnchanged()
    {
        const string csv = "name,phone\nJane,555-1234";

        var redacted = TelemetryRedactor.RedactBody(csv, "text/csv");

        redacted.Should().Be(csv);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void RedactBody_NullOrEmpty_ReturnsEmpty(string? body)
    {
        TelemetryRedactor.RedactBody(body, "application/json").Should().BeEmpty();
    }

    [Fact]
    public void RedactBody_WithSasLikeUrl_StripsQueryString()
    {
        var body = """{"contractUrl":"https://blob.example.com/c/file.pdf?sig=abc123&se=2026-01-01"}""";

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().NotContain("sig=abc123");
        redacted.Should().Contain("https://blob.example.com/c/file.pdf");
    }

    [Fact]
    public void RedactBody_WithOnlyNonSensitiveFields_IsUnchanged()
    {
        var body = """{"title":"Leaking tap","category":"Maintenance","priority":"Medium"}""";

        var redacted = TelemetryRedactor.RedactBody(body, "application/json");

        redacted.Should().Contain("Leaking tap").And.Contain("Maintenance").And.Contain("Medium");
    }
}

// ─── ErrorIdProvider Tests ──────────────────────────────────────────────────────

public class ErrorIdProviderTests
{
    [Fact]
    public void Current_AlwaysReturnsA32CharLowercaseHexString()
    {
        // Whether or not an Activity is active (real trace id vs. GUID("N") fallback), the
        // contract clients/support rely on is the SHAPE: a 32-char lowercase hex string that's
        // valid to paste into a trace-ID search box.
        var id = ErrorIdProvider.Current;

        id.Should().MatchRegex("^[0-9a-f]{32}$");
    }

    [Fact]
    public void Current_WithActiveActivity_ReturnsTheActivitysTraceId()
    {
        using var listener = new ActivityListener
        {
            ShouldListenTo = _ => true,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
        };
        ActivitySource.AddActivityListener(listener);

        using var source = new ActivitySource("Test.ErrorIdProvider");
        using var activity = source.StartActivity("test-request");

        activity.Should().NotBeNull("the listener above makes the source sampled");
        ErrorIdProvider.Current.Should().Be(activity!.TraceId.ToHexString());
    }
}

// ─── HttpHelpers.ToActionResult errorId Tests ───────────────────────────────────

public class HttpHelpersErrorIdTests
{
    private static string ExtractErrorId(Microsoft.AspNetCore.Mvc.IActionResult result)
    {
        var value = ((Microsoft.AspNetCore.Mvc.ObjectResult)result).Value;
        var prop = value!.GetType().GetProperty("errorId");
        prop.Should().NotBeNull("every error payload must carry an errorId");
        return (string)prop!.GetValue(value)!;
    }

    [Theory]
    [InlineData("NOT_FOUND", 404)]
    [InlineData("FORBIDDEN", 403)]
    [InlineData("SOCIETY_NOT_ACTIVE", 403)]
    [InlineData("UNAUTHORIZED", 401)]
    [InlineData("VALIDATION_FAILED", 400)]
    [InlineData("OUTSIDE_OPERATING_HOURS", 400)]
    [InlineData("BOOKING_WINDOW_EXCEEDED", 400)]
    [InlineData("AMENITY_UNAVAILABLE", 400)]
    [InlineData("USER_HAS_NO_APARTMENT", 400)]
    [InlineData("BOOKING_CONFLICT", 409)]
    [InlineData("SOS_ALERT_ALREADY_SETTLED", 409)]
    [InlineData("SOME_UNMAPPED_CODE", 500)]
    public void ToActionResult_OnFailure_CarriesErrorIdAndExpectedStatus(string errorCode, int expectedStatus)
    {
        var result = Result<string>.Failure(errorCode, "something went wrong");

        var actionResult = result.ToActionResult();

        var objectResult = actionResult.Should().BeAssignableTo<Microsoft.AspNetCore.Mvc.ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(expectedStatus);
        ExtractErrorId(actionResult).Should().MatchRegex("^[0-9a-f]{32}$");
    }

    [Fact]
    public void ToActionResult_OnSuccess_DoesNotIncludeErrorId()
    {
        var result = Result<string>.Success("ok");

        var actionResult = result.ToActionResult();

        var objectResult = (Microsoft.AspNetCore.Mvc.OkObjectResult)actionResult;
        objectResult.Value.Should().Be("ok", "success payloads are the raw value, not wrapped");
    }
}

// ─── TelemetryFunctions relay parsing Tests ─────────────────────────────────────
// TryParseContext/IsHex/SanitizeName are `internal` specifically so untrusted-client-input
// parsing can be verified directly (InternalsVisibleTo covers this test project).

public class TelemetryFunctionsParsingTests
{
    private const string ValidTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    private const string ValidSpanId = "00f067aa0ba902b7";

    [Fact]
    public void TryParseContext_WithValidIds_ReturnsContext()
    {
        var context = TelemetryFunctions.TryParseContext(ValidTraceId, ValidSpanId);

        context.Should().NotBeNull();
        context!.Value.TraceId.ToHexString().Should().Be(ValidTraceId);
        context.Value.SpanId.ToHexString().Should().Be(ValidSpanId);
    }

    [Theory]
    [InlineData(null, ValidSpanId)]
    [InlineData("", ValidSpanId)]
    [InlineData("too-short", ValidSpanId)]
    [InlineData("4BF92F3577B34DA6A3CE929D0E0E4736", ValidSpanId)] // uppercase — W3C requires lowercase
    [InlineData(ValidTraceId, null)]
    [InlineData(ValidTraceId, "")]
    [InlineData(ValidTraceId, "short")]
    [InlineData("not-hex-at-all-not-hex-at-all!!", ValidSpanId)]
    public void TryParseContext_WithMalformedInput_ReturnsNull(string? traceId, string? spanId)
    {
        TelemetryFunctions.TryParseContext(traceId, spanId).Should().BeNull();
    }

    [Theory]
    [InlineData("0123456789abcdef", true)]
    [InlineData("0123456789ABCDEF", false)] // uppercase not accepted
    [InlineData("zzzz", false)]
    [InlineData("", true)] // vacuously true — length is validated separately by the caller
    public void IsHex_ClassifiesCorrectly(string input, bool expected)
    {
        TelemetryFunctions.IsHex(input).Should().Be(expected);
    }

    [Fact]
    public void SanitizeName_WithEmptyName_ReturnsDefaultEventName()
    {
        TelemetryFunctions.SanitizeName("").Should().Be("client.event");
        TelemetryFunctions.SanitizeName("   ").Should().Be("client.event");
    }

    [Fact]
    public void SanitizeName_WithOverlongName_TruncatesTo200Chars()
    {
        var longName = new string('a', 500);

        var sanitized = TelemetryFunctions.SanitizeName(longName);

        sanitized.Length.Should().Be(200);
    }

    [Fact]
    public void SanitizeName_WithNormalName_IsUnchanged()
    {
        TelemetryFunctions.SanitizeName("mobile.api.request POST /amenity-bookings")
            .Should().Be("mobile.api.request POST /amenity-bookings");
    }
}
