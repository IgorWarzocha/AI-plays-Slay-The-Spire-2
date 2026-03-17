using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

namespace Sts2StateExport;

// Combat potions and similar effects use a dedicated choose-a-card overlay
// rather than the normal hand-selection mode. Giving it a first-class combat
// surface keeps the CLI honest and makes these modal choices directly
// actionable.
public sealed class CombatChoiceSelectFeature : IAgentFeature
{
    public int Order => 458;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        CombatChoiceScreenBinding? binding = TryResolve(context);
        if (binding is null)
        {
            return false;
        }

        PlayerCombatState playerCombatState = ResolvePlayerCombatState(binding.CombatState);
        List<CardChoiceOption> options = BuildOptions(binding.Screen);

        state.ScreenType = "combat_choice_select";
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
            .. options.Select(option => $"combat_choice_select.select:{option.Id}")
        ];
        if (binding.CanSkip)
        {
            state.Actions.Add("combat_choice_select.skip");
        }

        state.Combat = new ExportCombatState
        {
            RoundNumber = binding.CombatState.RoundNumber,
            CurrentSide = binding.CombatState.CurrentSide.ToString(),
            Energy = playerCombatState.Energy,
            DrawPileCount = playerCombatState.DrawPile.Cards.Count,
            DiscardPileCount = playerCombatState.DiscardPile.Cards.Count,
            ExhaustPileCount = playerCombatState.ExhaustPile.Cards.Count,
            CanEndTurn = false,
            HandIsSettled = true,
            SelectionMode = "choice_selection",
            SelectionPrompt = binding.Prompt,
            Hand = [],
            Potions = [],
            Creatures = binding.Room.CreatureNodes
                .Select(CombatFeature.BuildCreatureForExport)
                .ToList()
        };
        state.Notes =
        [
            "Combat is waiting on a modal card choice.",
            $"Prompt: {binding.Prompt ?? "Unknown"}"
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "combat_choice_select")
        {
            return false;
        }

        CombatChoiceScreenBinding binding = TryResolve(context)
            ?? throw new InvalidOperationException("Combat is not currently waiting on a card choice.");
        List<CardChoiceOption> options = BuildOptions(binding.Screen);

        switch (command.Verb)
        {
            case "select":
            {
                CardChoiceOption option = options.FirstOrDefault(
                        candidate => string.Equals(candidate.Id, command.Argument, StringComparison.Ordinal))
                    ?? throw new InvalidOperationException($"Combat choice '{command.Argument}' was not found.");
                RuntimeInvoker.Invoke(binding.Screen, binding.SelectHolderMethod, [option.Holder]);
                return true;
            }
            case "skip":
            {
                if (!binding.CanSkip || binding.SkipButton is null)
                {
                    throw new InvalidOperationException("This combat choice screen cannot be skipped.");
                }

                RuntimeInvoker.Invoke(binding.Screen, binding.SkipMethod, [binding.SkipButton]);
                return true;
            }
            default:
                throw new InvalidOperationException($"Unsupported combat choice action '{command.RawAction}'.");
        }
    }

    private static CombatChoiceScreenBinding? TryResolve(FeatureContext context)
    {
        NCombatRoom? room = SceneTraversal.FindFirstVisible<NCombatRoom>(context.Root);
        NChooseACardSelectionScreen? screen = SceneTraversal.FindFirstVisible<NChooseACardSelectionScreen>(context.Root);
        if (room?.Ui?.Hand is not NPlayerHand hand || screen is null)
        {
            return null;
        }

        CombatState combatState = ReadCombatState(hand);
        MethodInfo selectHolderMethod = screen.GetType().GetMethod(
            "SelectHolder",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            binder: null,
            types: [typeof(NCardHolder)],
            modifiers: null)
            ?? throw new InvalidOperationException("Choose-a-card screen did not expose SelectHolder(NCardHolder).");
        MethodInfo skipMethod = screen.GetType().GetMethod(
            "OnSkipButtonReleased",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            binder: null,
            types: [typeof(NButton)],
            modifiers: null)
            ?? throw new InvalidOperationException("Choose-a-card screen did not expose OnSkipButtonReleased(NButton).");
        NChoiceSelectionSkipButton? skipButton = ReadSkipButton(screen);

        return new CombatChoiceScreenBinding
        {
            Screen = screen,
            Room = room,
            CombatState = combatState,
            Prompt = ReadPrompt(screen),
            SelectHolderMethod = selectHolderMethod,
            SkipMethod = skipMethod,
            SkipButton = skipButton,
            CanSkip = skipButton is not null && SceneTraversal.IsNodeVisible(skipButton)
        };
    }

    private static List<CardChoiceOption> BuildOptions(NChooseACardSelectionScreen screen)
    {
        Dictionary<string, int> titleCounts = new(StringComparer.Ordinal);
        return ReadVisibleHolders(screen)
            .Select(
                holder =>
                {
                    CardModel cardModel = holder.CardModel
                        ?? throw new InvalidOperationException("Choice holder did not expose a card model.");
                    NCard? cardNode = ReadCardNode(holder);
                    string label = CardTextResolver.ResolveLabel(cardNode, cardModel);
                    string? description = CardTextResolver.ResolveDescription(cardNode, cardModel, label);
                    int occurrence = titleCounts.GetValueOrDefault(label, 0) + 1;
                    titleCounts[label] = occurrence;

                    return new CardChoiceOption
                    {
                        Id = CardSelectionIdentity.Create(label, occurrence),
                        Label = label,
                        Description = description,
                        Holder = holder
                    };
                })
            .ToList();
    }

    private static List<NCardHolder> ReadVisibleHolders(NChooseACardSelectionScreen screen)
    {
        return SceneTraversal.FindAllVisibleAssignableTo<NCardHolder>(screen)
            .Where(static holder => holder.CardModel is not null && SceneTraversal.IsNodeVisible(holder))
            .ToList();
    }

    private static NCard? ReadCardNode(NCardHolder holder)
    {
        PropertyInfo? cardNodeProperty = holder.GetType().GetProperty(
            "CardNode",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return cardNodeProperty?.GetValue(holder) as NCard;
    }

    private static NChoiceSelectionSkipButton? ReadSkipButton(NChooseACardSelectionScreen screen)
    {
        FieldInfo? skipField = screen.GetType().GetField(
            "_skipButton",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return skipField?.GetValue(screen) as NChoiceSelectionSkipButton;
    }

    private static string? ReadPrompt(NChooseACardSelectionScreen screen)
    {
        return NodeTextReader.ReadVisibleTexts(screen, 3)
            .Select(static text => text.Trim())
            .FirstOrDefault(static text => !string.IsNullOrWhiteSpace(text) && !string.Equals(text, "Skip", StringComparison.Ordinal));
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

    private sealed class CombatChoiceScreenBinding
    {
        public required NChooseACardSelectionScreen Screen { get; init; }
        public required NCombatRoom Room { get; init; }
        public required CombatState CombatState { get; init; }
        public required MethodInfo SelectHolderMethod { get; init; }
        public required MethodInfo SkipMethod { get; init; }
        public string? Prompt { get; init; }
        public NChoiceSelectionSkipButton? SkipButton { get; init; }
        public bool CanSkip { get; init; }
    }

    private sealed class CardChoiceOption
    {
        public required string Id { get; init; }
        public required string Label { get; init; }
        public string? Description { get; init; }
        public required NCardHolder Holder { get; init; }
    }
}
