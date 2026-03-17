using MegaCrit.Sts2.Core.Nodes.Combat;

namespace Sts2StateExport;

internal static class CombatMenuCatalog
{
    public static List<ExportMenuItem> BuildMenuItems(IEnumerable<ExportCombatCard> handCards)
    {
        return handCards
            .Select(
                card => new ExportMenuItem
                {
                    Id = card.Id,
                    Label = $"{card.Title} ({card.CostText ?? "?"})",
                    Description = card.Description,
                    Visible = true,
                    Enabled = card.IsPlayable,
                    Selected = false
                })
            .ToList();
    }

    public static List<string> BuildActions(
        IEnumerable<ExportCombatCard> handCards,
        IEnumerable<string> potionActions,
        IEnumerable<string> pileActions)
    {
        List<ExportCombatCard> cards = handCards.ToList();
        return
        [
            .. potionActions,
            .. cards.Where(static card => card.IsPlayable).Select(card => $"combat.play:{card.Id}"),
            .. cards.Where(static card => card.IsPlayable && card.ValidTargetIds.Count > 0)
                .SelectMany(card => card.ValidTargetIds.Select(targetId => $"combat.play:{card.Id}@{targetId}")),
            .. pileActions,
            "combat.end_turn"
        ];
    }

    public static IEnumerable<string> BuildPileActions(NCombatUi ui)
    {
        if (ui.DrawPile is not null && SceneTraversal.IsNodeVisible(ui.DrawPile))
        {
            yield return "combat.open_pile:draw";
        }

        if (ui.DiscardPile is not null && SceneTraversal.IsNodeVisible(ui.DiscardPile))
        {
            yield return "combat.open_pile:discard";
        }

        if (ui.ExhaustPile is not null && SceneTraversal.IsNodeVisible(ui.ExhaustPile))
        {
            yield return "combat.open_pile:exhaust";
        }
    }
}
