using ApartmentManagement.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace ApartmentManagement.Functions.Helpers;

internal static class ApartmentCsvParser
{
    private static readonly string[] ApartmentNumberAliases = ["apartmentnumber", "apartmentid", "unitnumber", "unit"];
    private static readonly string[] BlockNameAliases = ["blockname", "block", "buildingname", "building"];
    private static readonly string[] FloorNumberAliases = ["floornumber", "floor"];
    private static readonly string[] RoomAliases = ["numberofrooms", "rooms", "roomcount"];
    private static readonly string[] ParkingAliases = ["parkingslots", "parking", "parkingslotids"];
    private static readonly string[] OwnerIdAliases = ["ownerid", "owner"];
    private static readonly string[] CarpetAreaAliases = ["carpetarea", "carpet"];
    private static readonly string[] BuildUpAreaAliases = ["builduparea", "buildup"];
    private static readonly string[] SuperBuildAreaAliases = ["superbuildarea", "superbuild"];

    public static async Task<List<CreateApartmentRequest>> ParseAsync(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
            throw new InvalidDataException("The uploaded CSV file is empty.");

        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        var csv = await reader.ReadToEndAsync(ct);
        return Parse(csv);
    }

    public static List<CreateApartmentRequest> Parse(string csv)
    {
        if (string.IsNullOrWhiteSpace(csv))
            throw new InvalidDataException("The uploaded CSV file is empty.");

        var lines = csv.Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n');

        var rows = lines
            .Select((line, index) => new { Line = line, RowNumber = index + 1 })
            .Where(x => !string.IsNullOrWhiteSpace(x.Line))
            .ToList();

        if (rows.Count < 2)
            throw new InvalidDataException("The CSV file must contain a header row and at least one apartment row.");

        var headers = SplitCsvLine(rows[0].Line);
        var headerMap = BuildHeaderMap(headers);

        var apartments = new List<CreateApartmentRequest>();
        foreach (var row in rows.Skip(1))
        {
            var values = SplitCsvLine(row.Line);
            if (values.Count != headers.Count)
            {
                throw new InvalidDataException(
                    $"Row {row.RowNumber} has {values.Count} column(s); expected {headers.Count} based on the header.");
            }

            var apartmentNumber = GetRequiredValue(values, headerMap, ApartmentNumberAliases, row.RowNumber, "Apartment Number");
            var blockName = GetRequiredValue(values, headerMap, BlockNameAliases, row.RowNumber, "Block Name");
            var floorNumber = GetRequiredInt(values, headerMap, FloorNumberAliases, row.RowNumber, "Floor Number");
            var numberOfRooms = GetRequiredInt(values, headerMap, RoomAliases, row.RowNumber, "Number of Rooms");
            var parkingSlots = GetParkingSlots(values, headerMap);
            var ownerId = GetOptionalValue(values, headerMap, OwnerIdAliases);
            var carpetArea = GetOptionalDouble(values, headerMap, CarpetAreaAliases, row.RowNumber, "Carpet Area", 0);
            var buildUpArea = GetOptionalDouble(values, headerMap, BuildUpAreaAliases, row.RowNumber, "Build Up Area", 0);
            var superBuildArea = GetOptionalDouble(values, headerMap, SuperBuildAreaAliases, row.RowNumber, "Super Build Area", 0);

            apartments.Add(new CreateApartmentRequest(
                apartmentNumber,
                blockName,
                floorNumber,
                numberOfRooms,
                parkingSlots,
                string.IsNullOrWhiteSpace(ownerId) ? null : ownerId,
                carpetArea,
                buildUpArea,
                superBuildArea));
        }

        return apartments;
    }

    private static Dictionary<string, int> BuildHeaderMap(IReadOnlyList<string> headers)
    {
        var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < headers.Count; index++)
        {
            var normalized = NormalizeHeader(headers[index]);
            if (!string.IsNullOrWhiteSpace(normalized) && !headerMap.ContainsKey(normalized))
                headerMap[normalized] = index;
        }

        EnsureHeaderExists(headerMap, ApartmentNumberAliases, "Apartment Number");
        EnsureHeaderExists(headerMap, BlockNameAliases, "Block Name");
        EnsureHeaderExists(headerMap, FloorNumberAliases, "Floor Number");
        EnsureHeaderExists(headerMap, RoomAliases, "Number of Rooms");
        EnsureHeaderExists(headerMap, ParkingAliases, "Parking Slots");

        return headerMap;
    }

    private static void EnsureHeaderExists(
        IReadOnlyDictionary<string, int> headerMap,
        IEnumerable<string> aliases,
        string displayName)
    {
        if (!aliases.Any(headerMap.ContainsKey))
            throw new InvalidDataException($"The CSV header is missing the required '{displayName}' column.");
    }

    private static string GetRequiredValue(
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, int> headerMap,
        IEnumerable<string> aliases,
        int rowNumber,
        string displayName)
    {
        var value = GetOptionalValue(values, headerMap, aliases);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidDataException($"Row {rowNumber} is missing a value for '{displayName}'.");

        return value.Trim();
    }

    private static int GetRequiredInt(
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, int> headerMap,
        IEnumerable<string> aliases,
        int rowNumber,
        string displayName)
    {
        var raw = GetRequiredValue(values, headerMap, aliases, rowNumber, displayName);
        if (!int.TryParse(raw, out var parsed))
            throw new InvalidDataException($"Row {rowNumber} has an invalid integer value for '{displayName}': '{raw}'.");

        return parsed;
    }

    private static double GetOptionalDouble(
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, int> headerMap,
        IEnumerable<string> aliases,
        int rowNumber,
        string displayName,
        double defaultValue)
    {
        var raw = GetOptionalValue(values, headerMap, aliases);
        if (string.IsNullOrWhiteSpace(raw))
            return defaultValue;

        if (!double.TryParse(raw, out var parsed))
            throw new InvalidDataException($"Row {rowNumber} has an invalid decimal value for '{displayName}': '{raw}'.");

        return parsed;
    }

    private static IReadOnlyList<string> GetParkingSlots(
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, int> headerMap)
    {
        var raw = GetOptionalValue(values, headerMap, ParkingAliases);
        if (string.IsNullOrWhiteSpace(raw))
            return [];

        return raw
            .Split(['|', ';', ','], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();
    }

    private static string? GetOptionalValue(
        IReadOnlyList<string> values,
        IReadOnlyDictionary<string, int> headerMap,
        IEnumerable<string> aliases)
    {
        foreach (var alias in aliases)
        {
            if (headerMap.TryGetValue(alias, out var index))
                return index < values.Count ? values[index].Trim() : null;
        }

        return null;
    }

    private static string NormalizeHeader(string value)
    {
        return new string(value.Where(c => char.IsLetterOrDigit(c)).ToArray()).ToLowerInvariant();
    }

    private static List<string> SplitCsvLine(string line)
    {
        var values = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;

        for (var index = 0; index < line.Length; index++)
        {
            var ch = line[index];
            if (ch == '"')
            {
                if (inQuotes && index + 1 < line.Length && line[index + 1] == '"')
                {
                    current.Append('"');
                    index++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }

                continue;
            }

            if (ch == ',' && !inQuotes)
            {
                values.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(ch);
        }

        if (inQuotes)
            throw new InvalidDataException("The CSV file contains an unmatched quote.");

        values.Add(current.ToString());
        return values;
    }
}
