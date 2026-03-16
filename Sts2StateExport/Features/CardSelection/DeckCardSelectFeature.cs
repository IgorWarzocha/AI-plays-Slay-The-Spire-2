using Godot;
using System.Collections;
using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.Cards;

namespace Sts2StateExport;

// Deck-card selection screens are a distinct control surface from generic
// events. Keeping them isolated lets us evolve remove/transform/upgrade flows
// without entangling the event-room feature.
public sealed class DeckCardSelectFeature : IAgentFeature
{
    public int Order => 440;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        CardSelectionScreenBinding? binding = CardSelectionScreenResolver.TryResolve(context);
        if (binding is null)
        {
            return false;
        }

        List<CardSelectionOption> options = BuildOptions(binding.Screen);

        state.ScreenType = "deck_card_select";
        state.MenuItems = options
            .Select(
                option => new ExportMenuItem
                {
                    Id = option.Id,
                    Label = option.Label,
                    Description = option.Description,
                    Visible = true,
                    Enabled = true,
                    Selected = false
                })
            .ToList();
        state.Actions =
        [
            .. state.MenuItems.Select(item => $"deck_card_select.select:{item.Id}")
        ];

        if (binding.CanConfirm)
        {
            state.Actions.Add("deck_card_select.confirm");
        }

        if (binding.CanClose)
        {
            state.Actions.Add("deck_card_select.close");
        }

        List<string> notes =
        [
            $"Programmatic deck-card selection is active for this overlay screen ({binding.Kind})."
        ];
        if (!string.IsNullOrWhiteSpace(binding.Prompt))
        {
            notes.Add($"Prompt: {binding.Prompt}");
        }

        state.Notes = notes.ToArray();
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "deck_card_select")
        {
            return false;
        }

        CardSelectionScreenBinding binding = CardSelectionScreenResolver.TryResolve(context)
            ?? throw new InvalidOperationException("No supported card-selection screen is currently visible.");
        List<CardSelectionOption> options = BuildOptions(binding.Screen);

        switch (command.Verb)
        {
            case "select":
                CardSelectionOption? option = options.FirstOrDefault(
                    option => string.Equals(option.Id, command.Argument, StringComparison.Ordinal));
                if (option is null)
                {
                    string knownIds = string.Join(", ", options.Select(static option => option.Id));
                    throw new InvalidOperationException($"Card option '{command.Argument}' was not found. Known ids: {knownIds}");
                }

                SelectCard(binding, option);
                return true;
            case "confirm":
                if (!binding.CanConfirm || binding.ConfirmSelectionMethod is null)
                {
                    throw new InvalidOperationException("This card-selection screen does not currently expose a confirm action.");
                }

                InvokeButtonHandler(binding.Screen, binding.ConfirmSelectionMethod);
                return true;
            case "close":
                if (!binding.CanClose || binding.CloseSelectionMethod is null)
                {
                    throw new InvalidOperationException("This card-selection screen does not currently expose a close action.");
                }

                InvokeButtonHandler(binding.Screen, binding.CloseSelectionMethod);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported deck card select action '{command.RawAction}'.");
        }
    }

    private static List<CardSelectionOption> BuildOptions(Control screen)
    {
        Dictionary<string, int> titleCounts = new(StringComparer.Ordinal);
        return ReadDisplayedGridEntries(screen)
            .Select(
                entry =>
                {
                    NCard card = entry.CardNode;
                    List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(card);
                    string label = ReadCardText(card, "_titleLabel")
                        ?? visibleTexts.FirstOrDefault()
                        ?? "Unknown Card";
                    string? description = ReadCardText(card, "_descriptionLabel")
                        ?? visibleTexts.FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));
                    int occurrence = titleCounts.GetValueOrDefault(label, 0) + 1;
                    titleCounts[label] = occurrence;

                    return new CardSelectionOption
                    {
                        Id = CardSelectionIdentity.Create(label, occurrence),
                        Label = label,
                        Description = description,
                        Holder = entry.Holder,
                        CardNode = card
                    };
                })
            .ToList();
    }

    private static List<CardSelectionEntry> ReadDisplayedGridEntries(Control screen)
    {
        object? grid = GetFieldValue(screen, "_grid");
        if (grid is not null)
        {
            PropertyInfo? holdersProperty = grid.GetType().GetProperty(
                "CurrentlyDisplayedCardHolders",
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (holdersProperty?.GetValue(grid) is IEnumerable holders)
            {
                List<CardSelectionEntry> entries = [];
                foreach (object holder in holders)
                {
                    PropertyInfo? cardNodeProperty = holder.GetType().GetProperty(
                        "CardNode",
                        BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                    if (cardNodeProperty?.GetValue(holder) is NCard card && SceneTraversal.IsNodeVisible(card))
                    {
                        entries.Add(new CardSelectionEntry(holder, card));
                    }
                }

                if (entries.Count > 0)
                {
                    return entries;
                }
            }
        }

        return SceneTraversal.FindAllVisible<NCard>(screen)
            .Select(card => new CardSelectionEntry(card, card))
            .ToList();
    }

    private static object? GetFieldValue(object instance, string fieldName)
    {
        Type? currentType = instance.GetType();
        while (currentType is not null)
        {
            FieldInfo? field = currentType.GetField(
                fieldName,
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (field is not null)
            {
                return field.GetValue(instance);
            }

            currentType = currentType.BaseType;
        }

        return null;
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

    private static void SelectCard(CardSelectionScreenBinding binding, CardSelectionOption option)
    {
        object selectableCardModel = ReadSelectableCardModel(option.CardNode);
        if (TryCompleteSelectionThroughState(binding, selectableCardModel))
        {
            return;
        }

        object? grid = GetFieldValue(binding.Screen, "_grid");
        if (grid is not null && !ReferenceEquals(option.Holder, option.CardNode))
        {
            MethodInfo? emitSignalPressedMethod = option.Holder.GetType().GetMethods(
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .SingleOrDefault(method => method.Name == "EmitSignalPressed" && method.GetParameters().Length == 1);
            if (emitSignalPressedMethod is not null)
            {
                RuntimeInvoker.Invoke(option.Holder, emitSignalPressedMethod, [option.Holder]);
                return;
            }

            MethodInfo? onHolderPressedMethod = grid.GetType().GetMethods(
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                .SingleOrDefault(method => method.Name == "OnHolderPressed" && method.GetParameters().Length == 1);
            if (onHolderPressedMethod is not null)
            {
                RuntimeInvoker.Invoke(grid, onHolderPressedMethod, [option.Holder]);
                return;
            }
        }

        RuntimeInvoker.Invoke(
            binding.Screen,
            binding.OnCardClickedMethod,
            new object?[] { selectableCardModel });
    }

    private static bool TryCompleteSelectionThroughState(CardSelectionScreenBinding binding, object selectableCardModel)
    {
        object? selectedCards = GetFieldValue(binding.Screen, "_selectedCards");
        if (selectedCards is null)
        {
            return false;
        }

        MethodInfo? addMethod = selectedCards.GetType().GetMethods(
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .SingleOrDefault(method => method.Name == "Add" && method.GetParameters().Length == 1);
        if (addMethod is null)
        {
            return false;
        }

        addMethod.Invoke(selectedCards, [selectableCardModel]);

        MethodInfo? checkIfSelectionCompleteMethod = binding.Screen.GetType().GetMethods(
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .SingleOrDefault(method => method.Name == "CheckIfSelectionComplete" && method.GetParameters().Length == 0);
        if (checkIfSelectionCompleteMethod is not null)
        {
            RuntimeInvoker.Invoke(binding.Screen, checkIfSelectionCompleteMethod);
        }

        if (binding.ConfirmSelectionMethod is not null && !binding.CanConfirm)
        {
            InvokeButtonHandler(binding.Screen, binding.ConfirmSelectionMethod);
        }

        return true;
    }

    private sealed record CardSelectionEntry(object Holder, NCard CardNode);

    private static void InvokeButtonHandler(Control screen, MethodInfo methodInfo)
    {
        ParameterInfo[] parameters = methodInfo.GetParameters();
        object?[]? args = parameters.Length switch
        {
            0 => [],
            1 => [null],
            _ => throw new InvalidOperationException(
                $"Selection handler '{screen.GetType().Name}.{methodInfo.Name}' had an unsupported arity of {parameters.Length}.")
        };

        RuntimeInvoker.Invoke(screen, methodInfo, args);
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
