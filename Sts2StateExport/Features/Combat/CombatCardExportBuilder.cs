using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;

namespace Sts2StateExport;

internal static class CombatCardExportBuilder
{
    public static List<ExportCombatCard> BuildHandCards(PlayerCombatState playerCombatState, CombatHandSnapshot handSnapshot)
    {
        Dictionary<string, NHandCardHolder> holdersByCardId = handSnapshot.AllHolders
            .Where(static holder => holder.CardModel is not null)
            .GroupBy(static holder => CombatCardIdentity.FromCard(holder.CardModel!))
            .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);

        return playerCombatState.Hand.Cards
            .Select(
                card =>
                {
                    holdersByCardId.TryGetValue(CombatCardIdentity.FromCard(card), out NHandCardHolder? holder);
                    return BuildHandCard(card, holder);
                })
            .ToList();
    }

    private static ExportCombatCard BuildHandCard(CardModel card, NHandCardHolder? holder)
    {
        List<string> validTargetIds = card.TargetType.ToString() == "None"
            ? []
            : card.CombatState?.HittableEnemies
                .Where(card.IsValidTarget)
                .Select(CombatCardIdentity.FromCreature)
                .ToList()
                ?? [];

        return CombatCardExportMapper.Build(card, holder, validTargetIdsOverride: validTargetIds);
    }
}
