using System.Reflection;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

internal static class ModelTextResolver
{
    private static readonly Type? PileTypeType = Type.GetType("MegaCrit.Sts2.Core.Entities.Cards.PileType, sts2");
    private static readonly object? DeckPile = PileTypeType is null ? null : Enum.Parse(PileTypeType, "Deck");

    public static string? ResolveCardDescription(CardModel card)
    {
        try
        {
            MethodInfo? pileDescriptionMethod = card.GetType().GetMethod(
                "GetDescriptionForPile",
                BindingFlags.Instance | BindingFlags.Public,
                null,
                [PileTypeType!, Type.GetType("MegaCrit.Sts2.Core.Entities.Creatures.Creature, sts2")!],
                null);
            if (pileDescriptionMethod is not null && DeckPile is not null)
            {
                string? rendered = pileDescriptionMethod.Invoke(card, [DeckPile, null]) as string;
                if (!string.IsNullOrWhiteSpace(rendered))
                {
                    return rendered;
                }
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
}
