using System.Reflection;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

internal static class BrowseCardMapper
{
    public static ExportBrowseCard Build(CardModel card, bool upgraded)
    {
        return new ExportBrowseCard
        {
            Id = CardBrowseIdentity.FromCard(card),
            Title = AgentText.SafeText(card.TitleLocString) ?? card.Title,
            Description = ModelTextResolver.ResolveCardDescription(card),
            CostText = ReadCanonicalCost(card),
            Upgraded = upgraded
        };
    }

    public static string? ReadCanonicalCost(CardModel card)
    {
        PropertyInfo? property = card.GetType().GetProperty(
            "CanonicalEnergyCost",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (property?.GetValue(card) is not int canonicalCost || canonicalCost < 0)
        {
            return null;
        }

        return canonicalCost.ToString();
    }

    public static bool ReadIsUpgraded(CardModel card)
    {
        PropertyInfo? property = card.GetType().GetProperty(
            "IsUpgraded",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return property?.GetValue(card) as bool? ?? false;
    }
}
