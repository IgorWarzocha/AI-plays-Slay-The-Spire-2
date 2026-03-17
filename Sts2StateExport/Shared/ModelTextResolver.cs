using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

internal static class ModelTextResolver
{
    public static string? ResolveCardDescription(CardModel card)
    {
        if (TryResolveMadScienceDescription(card) is { } madScienceDescription)
        {
            return madScienceDescription;
        }

        try
        {
            PrimeCardPreview(card);

            string? rendered = card.GetDescriptionForPile(PileType.Deck, (Creature?)null);
            if (!string.IsNullOrWhiteSpace(rendered))
            {
                return rendered;
            }
        }
        catch
        {
            // Fall through to LocString-backed descriptions.
        }

        return AgentText.SafeText(card.Description);
    }

    public static string? ResolveRelicDescription(RelicModel relic)
    {
        return AgentText.SafeText(relic.DynamicDescription)
            ?? AgentText.SafeText(relic.Description);
    }

    public static string? ResolvePotionDescription(PotionModel potion)
    {
        return AgentText.SafeText(potion.DynamicDescription)
            ?? AgentText.SafeText(potion.Description)
            ?? AgentText.SafeText(potion.StaticDescription);
    }

    private static void PrimeCardPreview(CardModel card)
    {
        card.DynamicVars.InitializeWithOwner(card);
        card.DynamicVars.RecalculateForUpgradeOrEnchant();
        card.UpdateDynamicVarPreview(CardPreviewMode.Normal, null, card.DynamicVars);
    }

    private static string? TryResolveMadScienceDescription(CardModel card)
    {
        Type type = card.GetType();
        if (!string.Equals(type.Name, "MadScience", StringComparison.Ordinal))
        {
            return null;
        }

        string? cardType = NormalizeEnumName(type.GetProperty("TinkerTimeType")?.GetValue(card)?.ToString())
            ?? NormalizeEnumName(type.GetProperty("Type")?.GetValue(card)?.ToString());
        string? rider = NormalizeEnumName(type.GetProperty("TinkerTimeRider")?.GetValue(card)?.ToString());

        string? baseEffect = cardType switch
        {
            "attack" => $"Deal {ReadStaticInt(type, "attackDamage")} damage.",
            "skill" => $"Gain {ReadStaticInt(type, "skillBlock")} [gold]Block[/gold].",
            "power" => null,
            _ => null
        };

        string? riderEffect = rider switch
        {
            null or "" or "none" => "???",
            "sapping" => $"Apply {ReadStaticInt(type, "sappingWeakValue")} [gold]Weak[/gold]. Apply {ReadStaticInt(type, "sappingVulnerableValue")} [gold]Vulnerable[/gold].",
            "choking" => $"Whenever you play a card this turn, the enemy loses {ReadStaticInt(type, "chokingDamageValue")} HP.",
            "energized" => $"Gain {ReadStaticInt(type, "energizedEnergyValue")} energy.",
            "wisdom" => $"Draw {ReadStaticInt(type, "wisdomCardsValue")} cards.",
            "chaos" => "Add a random card into your [gold]Hand[/gold]. It costs 0 this turn.",
            "expertise" => $"Gain {ReadStaticInt(type, "expertiseStrengthValue")} [gold]Strength[/gold]. Gain {ReadStaticInt(type, "expertiseDexterityValue")} [gold]Dexterity[/gold].",
            "curious" => $"Powers cost {ReadStaticInt(type, "curiousReductionValue")} less.",
            "improvement" => "At the end of combat, [gold]Upgrade[/gold] a random card.",
            "violence" => $"{ReadStaticInt(type, "violenceHitsValue")} times.",
            _ => "???"
        };

        return string.Join(
            " ",
            new[] { baseEffect, riderEffect }.Where(static part => !string.IsNullOrWhiteSpace(part)));
    }

    private static int ReadStaticInt(Type type, string fieldName)
    {
        return type.GetField(fieldName)?.GetValue(null) as int? ?? 0;
    }

    private static string? NormalizeEnumName(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
    }
}
