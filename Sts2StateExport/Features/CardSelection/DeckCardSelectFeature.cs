using Godot;
using System.Collections;
using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

namespace Sts2StateExport;

// Deck-card selection screens are a distinct control surface from generic
// events. Keeping them isolated lets us evolve remove/transform/upgrade flows
// without entangling the event-room feature.
public sealed class DeckCardSelectFeature : IAgentFeature
{
    public int Order => 440;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NDeckCardSelectScreen? screen = SceneTraversal.FindFirstVisible<NDeckCardSelectScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        List<NCard> cards = SceneTraversal.FindAllVisible<NCard>(screen);
        Node? confirmButton = context.Reflection.ReadField<Node>(screen, context.Reflection.CardGridConfirmButtonField);

        state.ScreenType = "deck_card_select";
        state.MenuItems = cards
            .Select(
                (card, index) =>
                {
                    List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(card);
                    string label = ReadCardText(card, "_titleLabel")
                        ?? visibleTexts.FirstOrDefault()
                        ?? $"Card {index + 1}";
                    string? description = ReadCardText(card, "_descriptionLabel")
                        ?? visibleTexts.FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));

                    return new ExportMenuItem
                    {
                        Id = index.ToString(),
                        Label = label,
                        Description = description,
                        Visible = true,
                        Enabled = true,
                        Selected = false
                    };
                })
            .ToList();
        state.Actions =
        [
            .. state.MenuItems.Select(item => $"deck_card_select.select:{item.Id}")
        ];

        if (confirmButton is not null && SceneTraversal.IsNodeVisible(confirmButton))
        {
            state.Actions.Add("deck_card_select.confirm");
        }

        state.Notes = ["Programmatic deck-card selection is active for this overlay screen."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "deck_card_select")
        {
            return false;
        }

        NDeckCardSelectScreen screen = context.RequireVisible<NDeckCardSelectScreen>();
        List<NCard> cards = SceneTraversal.FindAllVisible<NCard>(screen);

        switch (command.Verb)
        {
            case "select":
                if (!int.TryParse(command.Argument, out int cardIndex))
                {
                    throw new InvalidOperationException($"Card selection argument '{command.Argument}' is not a valid integer index.");
                }

                if (cardIndex < 0 || cardIndex >= cards.Count)
                {
                    throw new InvalidOperationException($"Card index {cardIndex} is out of range.");
                }

                RuntimeInvoker.Invoke(screen, context.Reflection.CardGridOnCardClickedMethod, new object?[] { ReadSelectableCardModel(cards[cardIndex]) });
                return true;
            case "confirm":
                RuntimeInvoker.Invoke(screen, context.Reflection.CardGridConfirmSelectionMethod);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported deck card select action '{command.RawAction}'.");
        }
    }

    private static object ReadSelectableCardModel(NCard card)
    {
        foreach (string propertyName in new[] { "Model", "CardModel", "Card", "card" })
        {
            PropertyInfo? property = card.GetType().GetProperty(
                propertyName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            object? value = property?.GetValue(card);
            if (value is not null)
            {
                return value;
            }
        }

        foreach (string fieldName in new[] { "_model", "_cardModel", "_card", "card" })
        {
            FieldInfo? field = card.GetType().GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            object? value = field?.GetValue(card);
            if (value is not null)
            {
                return value;
            }
        }

        string properties = string.Join(
            ", ",
            card.GetType()
                .GetProperties(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .Select(static property => property.Name)
                .OrderBy(static name => name));
        string fields = string.Join(
            ", ",
            card.GetType()
                .GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .Select(static field => field.Name)
                .OrderBy(static name => name));

        throw new InvalidOperationException(
            $"Visible card node does not expose a selectable card model. Properties=[{properties}] Fields=[{fields}]");
    }

    private static string? ReadCardText(NCard card, string fieldName)
    {
        FieldInfo? field = card.GetType().GetField(
            fieldName,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (field?.GetValue(card) is not Node node)
        {
            return null;
        }

        return NodeTextReader.ReadVisibleTexts(node, 1).FirstOrDefault();
    }
}
