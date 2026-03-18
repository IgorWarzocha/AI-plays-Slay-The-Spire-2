using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

// Some combat cards open a hand-selection submode instead of a standalone
// overlay screen. Keeping that state in its own feature prevents the normal
// combat surface from pretending the turn can continue when the game is
// actually waiting for a card choice.
public sealed class CombatHandSelectFeature : IAgentFeature
{
    public int Order => 455;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        if (!TryGetSelectionState(context, out NCombatUi? ui, out NPlayerHand? hand))
        {
            return false;
        }

        CombatState combatState = ReadCombatState(hand!);
        CombatRuntimePhase runtimePhase = CombatStateReader.ReadRuntimePhase();
        CombatHandSnapshot handSnapshot = CombatHandSnapshotReader.Capture(hand!, runtimePhase);
        List<ExportCombatCard> handCards = BuildSelectableHandCards(handSnapshot.ActiveHolders);
        CardSelectionPrefsSnapshot prefs = ReadSelectionPrefs(hand!);
        int selectedCount = ReadSelectedCount(hand!);
        bool canConfirm = CanConfirmSelection(hand!, selectedCount, prefs.MinSelect);

        state.ScreenType = "combat_card_select";
        state.MenuItems = handCards
            .Select(
                card => new ExportMenuItem
                {
                    Id = card.Id,
                    Label = card.Title,
                    Description = card.Description,
                    Visible = true,
                    Enabled = true,
                    Selected = false
                })
            .ToList();
        state.Actions = handCards
            .Select(card => $"combat_card_select.select:{card.Id}")
            .ToList();
        if (canConfirm)
        {
            state.Actions.Add("combat_card_select.confirm");
        }

        state.Actions.AddRange(
        [
            "top_bar.map",
            "top_bar.deck",
            "top_bar.pause"
        ]);
        state.Combat = new ExportCombatState
        {
            RoundNumber = combatState.RoundNumber,
            CurrentSide = combatState.CurrentSide.ToString(),
            Energy = ResolvePlayerCombatState(combatState).Energy,
            HandIsSettled = handSnapshot.IsSettled,
            ActiveHandCount = handSnapshot.ActiveHolders.Count,
            TotalHandCount = handSnapshot.AllHolders.Count,
            ModelHandCount = handSnapshot.ModelHandCount,
            PendingHandHolderCount = handSnapshot.PendingHolderCount,
            HandAnimationActive = handSnapshot.HandAnimationActive,
            CardPlayInProgress = handSnapshot.CardPlayInProgress,
            DrawPileCount = ReadPileCount(ui!.DrawPile),
            DiscardPileCount = ReadPileCount(ui.DiscardPile),
            ExhaustPileCount = ReadPileCount(ui.ExhaustPile),
            CanEndTurn = false,
            SelectionMode = hand!.CurrentMode.ToString(),
            SelectionPrompt = ReadSelectionPrompt(hand),
            Hand = handCards,
            Creatures = []
        };
        List<string> notes =
        [
            "Combat is waiting on a hand-card choice.",
            $"Prompt: {state.Combat.SelectionPrompt ?? "Unknown"}",
            $"Mode: {state.Combat.SelectionMode}",
            $"Selection progress: {selectedCount}/{prefs.MaxSelect} selected (min {prefs.MinSelect})."
        ];
        if (!handSnapshot.IsSettled)
        {
            notes.Add(
                $"Combat hand is still settling: active {handSnapshot.ActiveHolders.Count}/{handSnapshot.AllHolders.Count}/{handSnapshot.ModelHandCount}, " +
                $"queued {handSnapshot.PendingHolderCount}, tween {(handSnapshot.HandAnimationActive ? "active" : "idle")}, " +
                $"card play {(handSnapshot.CardPlayInProgress ? "active" : "idle")}.");
        }
        state.Notes = [.. notes];

        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "combat_card_select")
        {
            return false;
        }

        if (!TryGetSelectionState(context, out _, out NPlayerHand? hand))
        {
            throw new InvalidOperationException("Combat is not currently waiting on a hand-card selection.");
        }

        switch (command.Verb)
        {
            case "select":
            {
                NHandCardHolder holder = hand!.ActiveHolders
                    .FirstOrDefault(
                        candidate =>
                        {
                            CardModel? model = candidate.CardModel;
                            return model is not null
                                && string.Equals(CombatCardIdentity.FromCard(model), command.Argument, StringComparison.Ordinal);
                        })
                    ?? throw new InvalidOperationException($"Selectable combat card '{command.Argument}' was not found.");

                MethodInfo onHolderPressedMethod = hand.GetType().GetMethod(
                    "OnHolderPressed",
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
                    binder: null,
                    types: [typeof(MegaCrit.Sts2.Core.Nodes.Cards.Holders.NCardHolder)],
                    modifiers: null)
                    ?? throw new InvalidOperationException("Combat hand did not expose OnHolderPressed.");

                RuntimeInvoker.Invoke(hand, onHolderPressedMethod, [holder]);
                return true;
            }
            case "confirm":
            {
                object confirmButton = ReadRequiredField(hand!, "_selectModeConfirmButton");
                MethodInfo confirmMethod = hand!.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
                    .SingleOrDefault(method => method.Name == "OnSelectModeConfirmButtonPressed" && method.GetParameters().Length == 1)
                    ?? throw new InvalidOperationException("Combat hand did not expose OnSelectModeConfirmButtonPressed.");
                RuntimeInvoker.Invoke(hand, confirmMethod, [confirmButton]);
                return true;
            }
            default:
                throw new InvalidOperationException($"Unsupported combat hand-select action '{command.RawAction}'.");
        }
    }

    private static bool TryGetSelectionState(FeatureContext context, out NCombatUi? ui, out NPlayerHand? hand)
    {
        ui = null;
        hand = null;

        NCombatRoom? room = SceneTraversal.FindFirstVisible<NCombatRoom>(context.Root);
        if (room?.Ui?.Hand is not NPlayerHand combatHand)
        {
            return false;
        }

        if (!combatHand.IsInCardSelection)
        {
            return false;
        }

        string mode = combatHand.CurrentMode.ToString();
        if (mode is "None" or "Play")
        {
            return false;
        }

        ui = room.Ui;
        hand = combatHand;
        return true;
    }

    private static CombatState ReadCombatState(NPlayerHand hand)
    {
        FieldInfo combatStateField = hand.GetType().GetField("_combatState", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Combat hand did not expose _combatState.");
        return (CombatState?)combatStateField.GetValue(hand)
            ?? throw new InvalidOperationException("Combat hand did not expose an active combat state.");
    }

    private static PlayerCombatState ResolvePlayerCombatState(CombatState combatState)
    {
        Player? player = combatState.Players.FirstOrDefault();
        return player?.PlayerCombatState
            ?? throw new InvalidOperationException("Combat state did not expose a player combat state.");
    }

    private static List<ExportCombatCard> BuildSelectableHandCards(IReadOnlyList<NHandCardHolder> holders)
    {
        return holders
            .Where(static holder => holder.CardModel is not null)
            .Select(
                holder =>
                {
                    CardModel card = holder.CardModel!;
                    return CombatCardExportMapper.Build(card, holder, isPlayableOverride: true, validTargetIdsOverride: []);
                })
            .ToList();
    }

    private static string? ReadSelectionPrompt(NPlayerHand hand)
    {
        FieldInfo? headerField = hand.GetType().GetField("_selectionHeader", BindingFlags.Instance | BindingFlags.NonPublic);
        if (headerField?.GetValue(hand) is not Node header)
        {
            return null;
        }

        return NodeTextReader.ReadVisibleTexts(header, 1).FirstOrDefault();
    }

    private static CardSelectionPrefsSnapshot ReadSelectionPrefs(NPlayerHand hand)
    {
        object prefs = ReadRequiredField(hand, "_prefs");
        return new CardSelectionPrefsSnapshot(
            MinSelect: ReadIntProperty(prefs, "MinSelect") ?? 1,
            MaxSelect: ReadIntProperty(prefs, "MaxSelect") ?? 1);
    }

    private static int ReadSelectedCount(NPlayerHand hand)
    {
        object selectedCards = ReadRequiredField(hand, "_selectedCards");
        PropertyInfo? countProperty = selectedCards.GetType().GetProperty("Count", BindingFlags.Instance | BindingFlags.Public);
        return countProperty?.GetValue(selectedCards) as int? ?? 0;
    }

    private static bool CanConfirmSelection(NPlayerHand hand, int selectedCount, int minSelect)
    {
        if (selectedCount < minSelect)
        {
            return false;
        }

        object? button = ReadOptionalField(hand, "_selectModeConfirmButton");
        return button is Control control && SceneTraversal.IsNodeVisible(control);
    }

    private static object ReadRequiredField(object instance, string fieldName)
    {
        return ReadOptionalField(instance, fieldName)
            ?? throw new InvalidOperationException($"Expected field '{fieldName}' on '{instance.GetType().Name}'.");
    }

    private static object? ReadOptionalField(object instance, string fieldName)
    {
        FieldInfo? field = instance.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
        return field?.GetValue(instance);
    }

    private static int? ReadIntProperty(object instance, string propertyName)
    {
        PropertyInfo? property = instance.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        object? value = property?.GetValue(instance);
        return value switch
        {
            int amount => amount,
            _ => null
        };
    }

    private static int? ReadPileCount(Node? pileButton)
    {
        if (pileButton is null)
        {
            return null;
        }

        foreach (string text in NodeTextReader.ReadVisibleTexts(pileButton))
        {
            if (int.TryParse(text, out int amount))
            {
                return amount;
            }
        }

        return null;
    }

    private static int? ReadCounterValue(Node? counter)
    {
        if (counter is null)
        {
            return null;
        }

        foreach (string text in NodeTextReader.ReadVisibleTexts(counter))
        {
            if (int.TryParse(text, out int value))
            {
                return value;
            }
        }

        return null;
    }

    private readonly record struct CardSelectionPrefsSnapshot(int MinSelect, int MaxSelect);
}
