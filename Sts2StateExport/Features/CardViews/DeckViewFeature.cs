using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Screens;

namespace Sts2StateExport;

// The deck overlay sits on top of other primary screens, so it gets its own
// feature and exports the actual currently displayed card order from the grid.
public sealed class DeckViewFeature : IAgentFeature
{
    private static readonly IReadOnlyList<ExportBrowseSort> Sorts =
    [
        new() { Id = "obtained", Label = "Obtained" },
        new() { Id = "type", Label = "Card Type" },
        new() { Id = "cost", Label = "Cost" },
        new() { Id = "alphabet", Label = "A-Z" }
    ];

    public int Order => 420;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NDeckViewScreen? screen = SceneTraversal.FindFirstVisible<NDeckViewScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        List<ExportBrowseCard> cards = ReadVisibleCards(screen);
        state.ScreenType = "deck_view";
        state.CardBrowse = new ExportCardBrowseState
        {
            Kind = "deck_view",
            Title = "Deck",
            PileType = "Deck",
            CardCount = cards.Count,
            CanClose = true,
            Sorts = Sorts.ToList(),
            Cards = cards
        };
        state.MenuItems = Sorts
            .Select(
                sort => new ExportMenuItem
                {
                    Id = sort.Id,
                    Label = sort.Label,
                    Description = $"Sort deck by {sort.Label.ToLowerInvariant()}.",
                    Visible = true,
                    Enabled = true,
                    Selected = false
                })
            .ToList();
        state.Actions =
        [
            .. Sorts.Select(sort => $"deck_view.sort:{sort.Id}")
        ];
        state.Notes =
        [
            "Deck view overlay is open.",
            "Cards are exported in the currently displayed grid order."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "deck_view" || command.Verb != "sort" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        NDeckViewScreen screen = context.RequireVisible<NDeckViewScreen>();
        (FieldInfo? field, MethodInfo? method) = command.Argument switch
        {
            "obtained" => (context.Reflection.DeckViewObtainedSorterField, context.Reflection.DeckViewOnObtainedSortMethod),
            "type" => (context.Reflection.DeckViewTypeSorterField, context.Reflection.DeckViewOnCardTypeSortMethod),
            "cost" => (context.Reflection.DeckViewCostSorterField, context.Reflection.DeckViewOnCostSortMethod),
            "alphabet" => (context.Reflection.DeckViewAlphabetSorterField, context.Reflection.DeckViewOnAlphabetSortMethod),
            _ => throw new InvalidOperationException($"Unsupported deck sort '{command.Argument}'.")
        };

        Node sorter = context.Reflection.ReadField<Node>(screen, field)
            ?? throw new InvalidOperationException($"Deck sorter '{command.Argument}' is unavailable.");
        RuntimeInvoker.Invoke(screen, method, sorter);
        return true;
    }

    private static List<ExportBrowseCard> ReadVisibleCards(NDeckViewScreen screen)
    {
        return SceneTraversal.FindAllVisible<NGridCardHolder>(screen)
            .Where(static holder => holder.CardModel is not null)
            .Select(holder => BuildBrowseCard(holder.CardModel!, holder.IsShowingUpgradedCard))
            .ToList();
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
}
