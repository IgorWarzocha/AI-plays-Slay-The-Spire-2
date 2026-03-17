using MegaCrit.Sts2.Core.Events;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

// Event options often expose only generic room text ("obtain a relic"), while
// the runtime model already knows the concrete reward. This helper lifts that
// resolved payload into the exported description so the agent can make the
// choice on actual game state instead of blind heuristics.
internal static class EventOptionDetails
{
    public static string? BuildDescription(EventOption option, string? baseDescription)
    {
        List<string> parts = [];
        HashSet<string> seen = new(StringComparer.Ordinal);

        AddPart(parts, seen, baseDescription);

        if (option.Relic is not null)
        {
            AddPart(parts, seen, DescribeRelic(option.Relic));
        }

        foreach (IHoverTip hoverTip in option.HoverTips ?? [])
        {
            AddPart(parts, seen, DescribeHoverTip(hoverTip));
        }

        return parts.Count == 0 ? null : string.Join(" ", parts);
    }

    private static void AddPart(ICollection<string> parts, ISet<string> seen, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        string normalized = value.Trim();
        if (!seen.Add(normalized))
        {
            return;
        }

        parts.Add(normalized);
    }

    private static string? DescribeHoverTip(IHoverTip hoverTip)
    {
        if (hoverTip.CanonicalModel is RelicModel relic)
        {
            return DescribeRelic(relic);
        }

        if (hoverTip.CanonicalModel is PotionModel potion)
        {
            return DescribePotion(potion);
        }

        if (hoverTip.CanonicalModel is CardModel card)
        {
            return DescribeCard(card);
        }

        return hoverTip switch
        {
            HoverTip textTip => JoinParts(textTip.Title, textTip.Description),
            CardHoverTip cardTip => DescribeCard(cardTip.Card),
            _ => null
        };
    }

    private static string DescribeRelic(RelicModel relic)
    {
        string title = AgentText.SafeText(relic.Title) ?? relic.GetType().Name;
        string? description = AgentText.SafeText(relic.Description);
        return JoinParts($"Relic: {title}.", description) ?? $"Relic: {title}.";
    }

    private static string DescribePotion(PotionModel potion)
    {
        string title = AgentText.SafeText(potion.Title) ?? potion.GetType().Name;
        string? description = AgentText.SafeText(potion.DynamicDescription)
            ?? AgentText.SafeText(potion.Description);
        return JoinParts($"Potion: {title}.", description) ?? $"Potion: {title}.";
    }

    private static string DescribeCard(CardModel card)
    {
        string title = AgentText.SafeText(card.TitleLocString) ?? card.Title;
        string? description = AgentText.SafeText(card.Description);
        return JoinParts($"Card: {title}.", description) ?? $"Card: {title}.";
    }

    private static string? JoinParts(string? left, string? right)
    {
        bool hasLeft = !string.IsNullOrWhiteSpace(left);
        bool hasRight = !string.IsNullOrWhiteSpace(right);

        return (hasLeft, hasRight) switch
        {
            (true, true) => $"{left!.Trim()} {right!.Trim()}",
            (true, false) => left!.Trim(),
            (false, true) => right!.Trim(),
            _ => null
        };
    }
}
