namespace Sts2StateExport;

internal static class CombatIntentSummaryBuilder
{
    public static string? Build(string? title, string? description, string? label, string? intentTypeName)
    {
        if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(description))
        {
            return $"{title}: {description}";
        }

        if (!string.IsNullOrWhiteSpace(description))
        {
            return description;
        }

        if (!string.IsNullOrWhiteSpace(label))
        {
            return label;
        }

        return intentTypeName;
    }
}
