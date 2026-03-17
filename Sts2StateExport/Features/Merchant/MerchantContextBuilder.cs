using MegaCrit.Sts2.Core.Runs;

namespace Sts2StateExport;

internal static class MerchantContextBuilder
{
    public static void PopulateRuntimeContext(ExportState state)
    {
        ExportCardBrowseState? deckSnapshot = BuildDeckSnapshot();
        if (deckSnapshot is not null)
        {
            state.CardBrowse = deckSnapshot;
        }
    }

    private static ExportCardBrowseState? BuildDeckSnapshot()
    {
        RunManager? runManager = RunManager.Instance;
        if (runManager is null)
        {
            return null;
        }

        var player = runManager.DebugOnlyGetState()?.Players?.FirstOrDefault();
        if (player?.Deck?.Cards is null)
        {
            return null;
        }

        List<ExportBrowseCard> cards = player.Deck.Cards
            .Select(card => BrowseCardMapper.Build(card, BrowseCardMapper.ReadIsUpgraded(card)))
            .ToList();

        return new ExportCardBrowseState
        {
            Kind = "deck_snapshot",
            Title = "Current Deck",
            PileType = "Deck",
            CardCount = cards.Count,
            CanClose = false,
            Cards = cards
        };
    }
}
