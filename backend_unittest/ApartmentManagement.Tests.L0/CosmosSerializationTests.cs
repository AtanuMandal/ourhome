using System.Linq;
using System.Text;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Infrastructure;
using FluentAssertions;
using Newtonsoft.Json.Linq;

namespace ApartmentManagement.Tests.L0.Infrastructure;

/// <summary>
/// BaseEntity.ETag is an in-memory-only optimistic-concurrency token, populated from the Cosmos
/// SDK's per-call response headers (see CosmosDbRepository.GetByIdAsync/CreateAsync/UpdateAsync).
/// It must never round-trip through the document JSON body: a query-based read
/// (CosmosDbRepository.ExecuteQueryAsync) has no per-item response header to source it from, so
/// if it round-tripped, a query fetch would rehydrate a stale ETag left over from a prior
/// single-item write, and a later single-item UpdateAsync would send that stale value as
/// If-Match — failing with 412 Precondition Failed against the document's real, since-bumped
/// system `_etag`. This is exactly what broke a user's second OTP-login request after their
/// first one had already done a single-item read-modify-write (e.g. VerifyOtpCommand).
/// </summary>
public class CosmosSerializationTests
{
    private readonly CosmosNewtonsoftSerializer _serializer = new();

    [Fact]
    public void ToStream_DoesNotWriteAnEtagFieldIntoTheDocumentBody()
    {
        var user = User.Create("society-1", "Alice", "alice@example.com", "+91-9876543210",
            UserRole.SUUser, ResidentType.Owner);
        user.ETag = "stale-etag-from-a-prior-single-item-write";

        using var stream = _serializer.ToStream(user);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var json = JObject.Parse(reader.ReadToEnd());

        json.Properties().Select(p => p.Name)
            .Should().NotContain(name => name.Equals("etag", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void FromStream_IgnoresAnEtagFieldPresentInTheDocumentBody()
    {
        const string json = """
            {
              "id": "user-1",
              "societyId": "society-1",
              "fullName": "Alice",
              "email": "alice@example.com",
              "phone": "+91-9876543210",
              "eTag": "stale-etag-that-must-not-be-rehydrated"
            }
            """;
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        var user = _serializer.FromStream<User>(stream);

        user.ETag.Should().BeNull();
    }
}
