namespace Sts2StateExport;

internal static class MerchantEntryDescriptionBuilder
{
    public static string Compose(string? primary, int cost, bool isStocked, bool affordable, string? extra)
    {
        List<string> parts = [];
        if (!string.IsNullOrWhiteSpace(primary))
        {
            parts.Add(primary.Trim());
        }

        parts.Add($"Cost: {cost} gold.");

        if (!isStocked)
        {
            parts.Add("Sold out.");
        }
        else if (!affordable)
        {
            parts.Add("Not enough gold.");
        }

        if (!string.IsNullOrWhiteSpace(extra))
        {
            parts.Add(extra.Trim());
        }

        return string.Join(" ", parts);
    }
}
