using System.Text.RegularExpressions;

namespace Sts2StateExport;

// Merchant entries can repeat by title, so ids include a compact kind/name
// slug plus the visible slot index to stay stable within one room instance.
public static partial class MerchantEntryIdentity
{
    public static string Create(string kind, string label, int index)
    {
        string normalizedKind = Slugify(kind);
        string normalizedLabel = Slugify(label);
        return $"{normalizedKind}-{index:D2}-{normalizedLabel}";
    }

    private static string Slugify(string value)
    {
        string lowered = value.Trim().ToLowerInvariant();
        string collapsed = NonAlphanumericRegex().Replace(lowered, "-").Trim('-');
        return string.IsNullOrWhiteSpace(collapsed) ? "unknown" : collapsed;
    }

    [GeneratedRegex("[^a-z0-9]+", RegexOptions.Compiled)]
    private static partial Regex NonAlphanumericRegex();
}
