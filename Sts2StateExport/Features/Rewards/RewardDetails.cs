using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Rewards;

namespace Sts2StateExport;

// Reward buttons often render only the title, while the reward models already
// know the concrete payload. This helper lifts those payload details into the
// exported state so reward choices are never made blindly.
internal static class RewardDetails
{
    public static string BuildLabel(Reward reward, string? fallbackLabel)
    {
        return reward switch
        {
            GoldReward goldReward => $"{goldReward.Amount} Gold",
            PotionReward potionReward => AgentText.SafeText(potionReward.Potion?.Title) ?? fallbackLabel ?? reward.GetType().Name,
            RelicReward relicReward => AgentText.SafeText(ReadRelic(relicReward)?.Title) ?? fallbackLabel ?? reward.GetType().Name,
            SpecialCardReward specialCardReward => AgentText.SafeText(ReadCard(specialCardReward)?.TitleLocString) ?? fallbackLabel ?? reward.GetType().Name,
            _ => fallbackLabel ?? reward.GetType().Name
        };
    }

    public static string? BuildDescription(Reward reward, string? baseDescription)
    {
        List<string> parts = [];
        HashSet<string> seen = new(StringComparer.Ordinal);

        AddPart(parts, seen, baseDescription);

        switch (reward)
        {
            case GoldReward goldReward:
                AddPart(parts, seen, $"{goldReward.Amount} Gold");
                break;
            case PotionReward potionReward:
                AddPart(parts, seen, DescribePotion(potionReward.Potion));
                break;
            case RelicReward relicReward:
                AddPart(parts, seen, DescribeRelic(ReadRelic(relicReward)));
                break;
            case SpecialCardReward specialCardReward:
                AddPart(parts, seen, DescribeCard(ReadCard(specialCardReward)));
                break;
        }

        foreach (IHoverTip hoverTip in ReadHoverTips(reward))
        {
            AddPart(parts, seen, DescribeHoverTip(hoverTip));
        }

        return parts.Count == 0 ? null : string.Join(" ", parts);
    }

    private static IEnumerable<IHoverTip> ReadHoverTips(Reward reward)
    {
        return reward.GetType()
            .GetProperty(
                "ExtraHoverTips",
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic)
            ?.GetValue(reward) as IEnumerable<IHoverTip>
            ?? [];
    }

    private static RelicModel? ReadRelic(RelicReward reward)
    {
        return reward.GetType()
            .GetField("_relic", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
            ?.GetValue(reward) as RelicModel;
    }

    private static CardModel? ReadCard(SpecialCardReward reward)
    {
        return reward.GetType()
            .GetField("_card", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
            ?.GetValue(reward) as CardModel;
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

    private static string? DescribeRelic(RelicModel? relic)
    {
        if (relic is null)
        {
            return null;
        }

        string title = AgentText.SafeText(relic.Title) ?? relic.GetType().Name;
        string? description = ModelTextResolver.ResolveRelicDescription(relic);
        return JoinParts($"Relic: {title}.", description) ?? $"Relic: {title}.";
    }

    private static string? DescribePotion(PotionModel? potion)
    {
        if (potion is null)
        {
            return null;
        }

        string title = AgentText.SafeText(potion.Title) ?? potion.GetType().Name;
        string? description = ModelTextResolver.ResolvePotionDescription(potion);
        return JoinParts($"Potion: {title}.", description) ?? $"Potion: {title}.";
    }

    private static string? DescribeCard(CardModel? card)
    {
        if (card is null)
        {
            return null;
        }

        string title = AgentText.SafeText(card.TitleLocString) ?? card.Title;
        string? description = ModelTextResolver.ResolveCardDescription(card);
        return JoinParts($"Card: {title}.", description) ?? $"Card: {title}.";
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
