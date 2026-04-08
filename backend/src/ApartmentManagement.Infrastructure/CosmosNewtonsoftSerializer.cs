using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Reflection;

namespace ApartmentManagement.Infrastructure;

/// <summary>
/// Custom Cosmos DB serializer using Newtonsoft.Json so that domain entities with
/// private setters can be round-tripped without modifying their encapsulation.
/// </summary>
public sealed class CosmosNewtonsoftSerializer : CosmosSerializer
{
    private static readonly JsonSerializer _serializer = JsonSerializer.Create(new JsonSerializerSettings
    {
        ContractResolver = new PrivateSetterCamelCaseContractResolver(),
        NullValueHandling = NullValueHandling.Ignore,
        DateFormatHandling = DateFormatHandling.IsoDateFormat,
        DateTimeZoneHandling = DateTimeZoneHandling.Utc,
    });

    public override T FromStream<T>(Stream stream)
    {
        if (typeof(Stream).IsAssignableFrom(typeof(T)))
            return (T)(object)stream;

        using var sr = new StreamReader(stream);
        using var jr = new JsonTextReader(sr);
        return _serializer.Deserialize<T>(jr)
            ?? throw new JsonSerializationException($"Failed to deserialize {typeof(T).Name} from Cosmos stream.");
    }

    public override Stream ToStream<T>(T input)
    {
        var ms = new MemoryStream();
        using var sw = new StreamWriter(ms, leaveOpen: true);
        using var jw = new JsonTextWriter(sw);
        _serializer.Serialize(jw, input);
        sw.Flush();
        ms.Position = 0;
        return ms;
    }
}

/// <summary>
/// Camel-case contract resolver that additionally allows Newtonsoft to write
/// to properties that have private setters — preserving DDD encapsulation.
/// </summary>
internal sealed class PrivateSetterCamelCaseContractResolver : CamelCasePropertyNamesContractResolver
{
    protected override JsonProperty CreateProperty(MemberInfo member, MemberSerialization memberSerialization)
    {
        var property = base.CreateProperty(member, memberSerialization);

        if (!property.Writable && member is PropertyInfo propInfo)
        {
            var setter = propInfo.GetSetMethod(nonPublic: true);
            if (setter != null)
                property.Writable = true;
        }

        return property;
    }
}
