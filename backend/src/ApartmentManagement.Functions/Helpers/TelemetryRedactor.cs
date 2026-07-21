using System.Text;
using System.Text.Json.Nodes;

namespace ApartmentManagement.Functions.Helpers;

/// <summary>
/// Redaction rules applied to every request/response body before it is attached to an
/// OpenTelemetry span/log attribute — see requirements/telemetry_observability.md §8.
/// Used by both <see cref="TelemetryEnrichmentMiddleware"/> (server-side capture) and the
/// client telemetry relay endpoint (web/mobile-forwarded spans), so the same redaction
/// guarantee applies regardless of where a body was captured.
/// </summary>
public static class TelemetryRedactor
{
    /// <summary>Bodies larger than this are summarized, never inlined, to bound span/log size.</summary>
    public const int MaxBodyBytes = 8 * 1024;

    private const string Redacted = "***REDACTED***";

    // Recursive, case-insensitive JSON property-name match. Value is fully replaced.
    private static readonly HashSet<string> NeverLogFieldNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "newpassword", "currentpassword", "confirmpassword",
        "otp", "code", "token", "accesstoken", "refreshtoken", "idtoken",
        "jwtsecret", "authorization", "secret", "apikey", "sastoken", "connectionstring",
    };

    // Recursive, case-insensitive JSON property-name match. Value is masked, not dropped —
    // same shape as the resident-directory masking in Application/Common/Mappings.cs, kept as
    // an independent copy here since Functions has no reason to depend on the Application layer
    // for two small string helpers.
    private static readonly HashSet<string> MaskedFieldNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "phone", "phonenumber", "visitorphone", "vehiclenumber",
        "email", "visitoremail", "contactemail",
    };

    /// <summary>
    /// Redacts a captured HTTP body before it is safe to attach to telemetry. Multipart and
    /// oversized payloads are summarized rather than inlined; JSON bodies are recursively
    /// redacted field-by-field; non-JSON bodies under the size cap pass through unchanged
    /// (e.g. the visitor-log CSV export).
    /// </summary>
    public static string RedactBody(string? body, string? contentType, long? contentLength = null)
    {
        if (string.IsNullOrEmpty(body))
            return string.Empty;

        if (!string.IsNullOrEmpty(contentType) &&
            contentType.Contains("multipart/form-data", StringComparison.OrdinalIgnoreCase))
        {
            return Summarize(contentType, contentLength ?? Encoding.UTF8.GetByteCount(body));
        }

        var byteCount = Encoding.UTF8.GetByteCount(body);
        if (byteCount > MaxBodyBytes)
            return Summarize(contentType ?? "unknown", byteCount);

        try
        {
            var node = JsonNode.Parse(body);
            if (node is null) return body;
            RedactNode(node);
            return node.ToJsonString();
        }
        catch (System.Text.Json.JsonException)
        {
            // Not JSON — already passed the size cap above, so it's safe to pass through as-is.
            return body;
        }
    }

    private static string Summarize(string contentType, long size) =>
        $"<omitted: {contentType}, {size} bytes>";

    private static void RedactNode(JsonNode node)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(kv => kv.Key).ToList())
                {
                    var child = obj[key];
                    if (child is null) continue;

                    if (NeverLogFieldNames.Contains(key))
                    {
                        obj[key] = Redacted;
                        continue;
                    }
                    if (MaskedFieldNames.Contains(key) && TryGetString(child, out var maskable))
                    {
                        obj[key] = MaskContact(key, maskable);
                        continue;
                    }
                    if (TryGetString(child, out var strVal) && LooksLikeSasUrl(strVal))
                    {
                        obj[key] = StripQueryString(strVal);
                        continue;
                    }

                    RedactNode(child);
                }
                break;

            case JsonArray arr:
                for (var i = 0; i < arr.Count; i++)
                {
                    var item = arr[i];
                    if (item is null) continue;
                    if (TryGetString(item, out var strVal) && LooksLikeSasUrl(strVal))
                    {
                        arr[i] = StripQueryString(strVal);
                        continue;
                    }
                    RedactNode(item);
                }
                break;
        }
    }

    private static bool TryGetString(JsonNode node, out string value)
    {
        value = string.Empty;
        if (node is JsonValue jv && jv.TryGetValue<string>(out var s))
        {
            value = s;
            return true;
        }
        return false;
    }

    private static string MaskContact(string fieldName, string value) =>
        fieldName.Contains("email", StringComparison.OrdinalIgnoreCase)
            ? MaskEmail(value)
            : MaskPhone(value);

    private static bool LooksLikeSasUrl(string value) =>
        value.Contains("://", StringComparison.Ordinal) &&
        (value.Contains("sig=", StringComparison.OrdinalIgnoreCase) || value.Contains("&se=", StringComparison.OrdinalIgnoreCase));

    private static string StripQueryString(string url)
    {
        var idx = url.IndexOf('?');
        return idx >= 0 ? url[..idx] : url;
    }

    /// <summary>Same algorithm as Application/Common/Mappings.cs MaskPhone — mirrored here intentionally.</summary>
    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone)) return phone;

        var runStart = -1;
        var runEnd = -1;
        var i = 0;
        while (i < phone.Length)
        {
            if (!char.IsDigit(phone[i])) { i++; continue; }
            var start = i;
            while (i < phone.Length && char.IsDigit(phone[i])) i++;
            runStart = start;
            runEnd = i;
        }
        if (runStart < 0) return phone;

        var runLength = runEnd - runStart;
        var chars = phone.ToCharArray();
        if (runLength <= 4)
        {
            for (var j = runStart; j < runEnd; j++) chars[j] = 'X';
            return new string(chars);
        }

        for (var j = runStart + 2; j < runEnd - 2; j++) chars[j] = 'X';
        return new string(chars);
    }

    /// <summary>Same algorithm as Application/Common/Mappings.cs MaskEmail — mirrored here intentionally.</summary>
    private static string MaskEmail(string email)
    {
        if (string.IsNullOrEmpty(email)) return email;

        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "***";

        var local = email[..atIndex];
        var visibleLocal = local.Length <= 2 ? local : local[..2];
        var domain = email[(atIndex + 1)..];
        var lastDot = domain.LastIndexOf('.');
        var tld = lastDot >= 0 ? domain[lastDot..] : string.Empty;
        return $"{visibleLocal}***@***{tld}";
    }
}
