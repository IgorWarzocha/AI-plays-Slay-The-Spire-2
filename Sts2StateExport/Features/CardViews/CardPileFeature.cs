using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Screens;

namespace Sts2StateExport;

// Card-pile popups reuse one runtime screen for draw, discard, exhaust, and
// similar views, so this feature exposes that surface generically.
public sealed class CardPileFeature : IAgentFeature
{
    public int Order => 421;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NCardPileScreen? screen = SceneTraversal.FindFirstVisible<NCardPileScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        CardPile pile = screen.Pile;
        List<ExportBrowseCard> cards = ReadVisibleCards(screen, pile);
        string pileType = pile.Type.ToString();

        state.ScreenType = "card_pile";
        state.CardBrowse = new ExportCardBrowseState
        {
            Kind = "card_pile",
            Title = $"{pileType} Pile",
            PileType = pileType,
            CardCount = cards.Count,
            CanClose = true,
            Cards = cards
        };
        state.MenuItems =
        [
            new ExportMenuItem
            {
                Id = "close",
                Label = "Close",
                Description = $"Return from the {pileType.ToLowerInvariant()} pile.",
                Visible = true,
                Enabled = true,
                Selected = false
            }
        ];
        state.Actions = ["card_pile.close"];
        state.Notes =
        [
            $"{pileType} pile overlay is open.",
            "Cards are exported in the currently displayed grid order."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "card_pile" || command.Verb != "close")
        {
            return false;
        }

        NCardPileScreen screen = context.RequireVisible<NCardPileScreen>();
        Node backButton = context.Reflection.ReadField<Node>(screen, context.Reflection.CardPileBackButtonField)
            ?? throw new InvalidOperationException("Card pile back button is unavailable.");
        RuntimeInvoker.Invoke(screen, context.Reflection.CardPileReturnMethod, backButton);
        return true;
    }

    private static List<ExportBrowseCard> ReadVisibleCards(NCardPileScreen screen, CardPile pile)
    {
        List<ExportBrowseCard> visibleCards = SceneTraversal.FindAllVisible<NGridCardHolder>(screen)
            .Where(static holder => holder.CardModel is not null)
            .Select(holder => BuildBrowseCard(holder.CardModel!, holder.IsShowingUpgradedCard))
            .ToList();
        if (visibleCards.Count > 0)
        {
            return visibleCards;
        }

        return pile.Cards.Select(card => BuildBrowseCard(card, ReadIsUpgraded(card))).ToList();
    }

    private static ExportBrowseCard BuildBrowseCard(CardModel card, bool upgraded)
    {
        return new ExportBrowseCard
        {
            Id = CardBrowseIdentity.FromCard(card),
            Title = AgentText.SafeText(card.TitleLocString) ?? card.Title,
            Description = AgentText.SafeText(card.Description),
            CostText = ReadCanonicalCost(card),
            Upgraded = upgraded
        };
    }

    private static string? ReadCanonicalCost(CardModel card)
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

    private static bool ReadIsUpgraded(CardModel card)
    {
        PropertyInfo? property = card.GetType().GetProperty(
            "IsUpgraded",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return property?.GetValue(card) as bool? ?? false;
    }
}
