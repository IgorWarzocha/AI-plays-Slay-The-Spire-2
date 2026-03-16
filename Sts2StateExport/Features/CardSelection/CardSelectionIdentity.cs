using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.Nodes.Cards;

namespace Sts2StateExport;

// Card grids often contain duplicate titles, so exported ids use a slugged
// title plus an occurrence count within the currently visible grid.
public static partial class CardSelectionIdentity
{
    public static string Create(string label, int occurrence)
    {
        string normalizedLabel = Slugify(label);
        return $"{normalizedLabel}-{occurrence:D2}";
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

public sealed class CardSelectionOption
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required object Holder { get; init; }
    public required NCard CardNode { get; init; }
}
