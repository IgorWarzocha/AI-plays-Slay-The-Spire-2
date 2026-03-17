using System.Reflection;
using System.Text.RegularExpressions;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Runs;

namespace Sts2StateExport;

// Combat is the highest-value in-run surface, so it gets its own feature
// boundary with direct model-backed exports and commands.
public sealed class CombatFeature : IAgentFeature
{
    private static readonly Regex NumberRegex = new(@"-?\d+", RegexOptions.Compiled);

    public int Order => 460;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        // Reward overlays sit on top of the combat room, so combat must yield
        // whenever one of those higher-level screens is currently visible.
        if (SceneTraversal.FindFirstVisible<NCardRewardSelectionScreen>(context.Root) is not null
            || SceneTraversal.FindFirstVisible<NRewardsScreen>(context.Root) is not null
            || SceneTraversal.FindFirstVisible<NMerchantRoom>(context.Root) is not null
            || SceneTraversal.FindFirstVisible<NRestSiteRoom>(context.Root) is not null
            || SceneTraversal.FindFirstVisible<NTreasureRoom>(context.Root) is not null)
        {
            return false;
        }

        NCombatRoom? room = SceneTraversal.FindFirstVisible<NCombatRoom>(context.Root);
        if (room is null)
        {
            return false;
        }

        NCombatUi? ui = room.Ui;
        if (ui is null)
        {
            return false;
        }

        NPlayerHand? hand = ui.Hand;
        if (hand is null)
        {
            return false;
        }

        CombatState? combatState = TryReadCombatState(hand);
        if (combatState is null)
        {
            return false;
        }
        CombatHandSnapshot handSnapshot = CombatHandSnapshotReader.Capture(hand);
        if (!TryResolvePlayerCombatState(combatState, out PlayerCombatState? playerCombatState))
        {
            return false;
        }

        PlayerCombatState resolvedPlayerCombatState = playerCombatState!;
        CombatRuntimePhase runtimePhase = ReadRuntimePhase();

        List<ExportCombatCreature> creatures = room.CreatureNodes
            .Select(BuildCreature)
            .OrderBy(creature => creature.Side)
            .ThenBy(creature => creature.SlotName)
            .ThenBy(creature => creature.Name)
            .ToList();
        List<ExportCombatCard> handCards = BuildHandCards(resolvedPlayerCombatState, handSnapshot);
        bool isPlayerTurn = string.Equals(combatState.CurrentSide.ToString(), "Player", StringComparison.Ordinal);
        List<ExportCombatPotion> potions = CombatPotionSupport.BuildPotions(context.Root, creatures, isPlayerTurn);

        state.ScreenType = "combat_room";
        state.Combat = new ExportCombatState
        {
            RoundNumber = combatState.RoundNumber,
            CurrentSide = combatState.CurrentSide.ToString(),
            Energy = resolvedPlayerCombatState.Energy,
            HandIsSettled = handSnapshot.IsSettled && runtimePhase.IsReadyForPlayerInput,
            ActiveHandCount = handSnapshot.ActiveHolders.Count,
            TotalHandCount = handSnapshot.AllHolders.Count,
            ModelHandCount = handSnapshot.ModelHandCount,
            PendingHandHolderCount = handSnapshot.PendingHolderCount,
            HandAnimationActive = handSnapshot.HandAnimationActive,
            CardPlayInProgress = handSnapshot.CardPlayInProgress,
            Hand = handCards,
            DrawPileCount = resolvedPlayerCombatState.DrawPile.Cards.Count,
            DiscardPileCount = resolvedPlayerCombatState.DiscardPile.Cards.Count,
            ExhaustPileCount = resolvedPlayerCombatState.ExhaustPile.Cards.Count,
            CanEndTurn = RuntimeInvoker.Invoke<bool>(ui.EndTurnButton, context.Reflection.CombatEndTurnCanTurnBeEndedMethod),
            Potions = potions,
            Creatures = creatures
        };

        state.MenuItems = handCards
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
        state.Actions =
        [
            .. CombatPotionSupport.BuildActions(potions),
            .. handCards.Where(static card => card.IsPlayable).Select(card => $"combat.play:{card.Id}"),
            .. handCards.Where(static card => card.IsPlayable && card.ValidTargetIds.Count > 0)
                .SelectMany(card => card.ValidTargetIds.Select(targetId => $"combat.play:{card.Id}@{targetId}")),
            .. BuildPileActions(ui),
            "combat.end_turn"
        ];
        List<string> notes =
        [
            "Combat state is model-backed.",
            "Targeted card plays use combat and card runtime identities."
        ];
        if (!handSnapshot.IsSettled)
        {
            notes.Add(
                $"Combat hand is still settling: active {handSnapshot.ActiveHolders.Count}/{handSnapshot.AllHolders.Count}/{handSnapshot.ModelHandCount}, " +
                $"queued {handSnapshot.PendingHolderCount}, tween {(handSnapshot.HandAnimationActive ? "active" : "idle")}, " +
                $"card play {(handSnapshot.CardPlayInProgress ? "active" : "idle")}.");
        }
        if (handSnapshot.IsSettled && !runtimePhase.IsReadyForPlayerInput)
        {
            notes.Add(
                $"Combat runtime is not ready for player input yet: playPhase={runtimePhase.IsPlayPhase}, " +
                $"actionsDisabled={runtimePhase.PlayerActionsDisabled}, enemyTurnStarted={runtimePhase.IsEnemyTurnStarted}, " +
                $"endingP1={runtimePhase.EndingPlayerTurnPhaseOne}, endingP2={runtimePhase.EndingPlayerTurnPhaseTwo}, " +
                $"queueEmpty={runtimePhase.ActionQueueIsEmpty}, executorRunning={runtimePhase.ActionExecutorIsRunning}.");
        }
        state.Notes = [.. notes];

        return true;
    }

    internal static ExportCombatCreature BuildCreatureForExport(NCreature creature)
    {
        return BuildCreature(creature);
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "combat")
        {
            return false;
        }

        NCombatRoom room = context.RequireVisible<NCombatRoom>();
        NCombatUi ui = room.Ui ?? throw new InvalidOperationException("Combat UI is unavailable.");

        switch (command.Verb)
        {
            case "end_turn":
                RuntimeInvoker.Invoke(
                    ui.EndTurnButton ?? throw new InvalidOperationException("End turn button is unavailable."),
                    context.Reflection.CombatEndTurnOnReleaseMethod);
                return true;
            case "use_potion":
            case "discard_potion":
                return ExecutePotionCommand(context, command);
            case "open_pile":
                OpenPile(context, ui, command.Argument);
                return true;
            case "play":
                ExecutePlayCommand(room, ui, command.Argument);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported combat action '{command.RawAction}'.");
        }
    }

    private static bool ExecutePotionCommand(FeatureContext context, ParsedCommand command)
    {
        IReadOnlyList<Creature> creatures = context.RequireVisible<NCombatRoom>().CreatureNodes
            .Select(static node => node.Entity)
            .ToList();

        if (string.Equals(command.Verb, "use_potion", StringComparison.Ordinal))
        {
            CombatPotionSupport.UsePotion(context.Root, command.Argument, creatures);
            return true;
        }

        if (string.Equals(command.Verb, "discard_potion", StringComparison.Ordinal))
        {
            NPotionHolder holder = CombatPotionSupport.FindPotionHolderForExecution(context.Root, command.Argument);
            RuntimeInvoker.Invoke(holder, holder.GetType().GetMethod(nameof(NPotionHolder.DiscardPotion)));
            return true;
        }

        return false;
    }

    private static void ExecutePlayCommand(NCombatRoom room, NCombatUi ui, string? argument)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Combat play requires a card id.");
        }

        string[] parts = argument.Split('@', 2, StringSplitOptions.TrimEntries);
        string cardId = parts[0];
        string? targetId = parts.Length == 2 ? parts[1] : null;

        NPlayerHand hand = ui.Hand ?? throw new InvalidOperationException("Combat hand is unavailable.");
        CombatState combatState = TryReadCombatState(hand)
            ?? throw new InvalidOperationException("Combat hand did not expose an active combat state.");
        if (!TryResolvePlayerCombatState(combatState, out PlayerCombatState? playerCombatState))
        {
            throw new InvalidOperationException("Combat hand did not expose a player combat state.");
        }

        PlayerCombatState resolvedPlayerCombatState = playerCombatState!;
        CardModel card = resolvedPlayerCombatState.Hand.Cards
            .FirstOrDefault(candidate => string.Equals(CombatCardIdentity.FromCard(candidate), cardId, StringComparison.Ordinal))
            ?? throw new InvalidOperationException($"Combat card '{cardId}' was not found in the active hand.");

        if (!card.CanPlay())
        {
            throw new InvalidOperationException($"Card '{card.Title}' is not currently playable.");
        }

        Creature? target = ResolveTarget(room, targetId);
        if (targetId is not null && target is null)
        {
            throw new InvalidOperationException($"Target '{targetId}' was not found.");
        }

        if (target is not null && !card.IsValidTarget(target))
        {
            throw new InvalidOperationException($"Target '{targetId}' is not valid for '{card.Title}'.");
        }

        if (!card.TryManualPlay(target))
        {
            string targetSuffix = target is null ? string.Empty : $" on {target.Name}";
            throw new InvalidOperationException($"Card '{card.Title}' failed to play{targetSuffix}.");
        }
    }

    private static Creature? ResolveTarget(NCombatRoom room, string? targetId)
    {
        if (string.IsNullOrWhiteSpace(targetId))
        {
            return null;
        }

        return room.CreatureNodes
            .Select(static node => node.Entity)
            .FirstOrDefault(entity => string.Equals(CombatCardIdentity.FromCreature(entity), targetId, StringComparison.Ordinal));
    }

    private static IEnumerable<string> BuildPileActions(NCombatUi ui)
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

    private static void OpenPile(FeatureContext context, NCombatUi ui, string? argument)
    {
        Node pileButton = argument switch
        {
            "draw" => ui.DrawPile ?? throw new InvalidOperationException("Draw pile button is unavailable."),
            "discard" => ui.DiscardPile ?? throw new InvalidOperationException("Discard pile button is unavailable."),
            "exhaust" => ui.ExhaustPile ?? throw new InvalidOperationException("Exhaust pile button is unavailable."),
            _ => throw new InvalidOperationException($"Unsupported combat pile '{argument}'.")
        };

        if (!SceneTraversal.IsNodeVisible(pileButton))
        {
            throw new InvalidOperationException($"Combat pile '{argument}' is not visible.");
        }

        RuntimeInvoker.Invoke(pileButton, context.Reflection.CombatPileOnReleaseMethod);
    }

    private static CombatState? TryReadCombatState(NPlayerHand hand)
    {
        FieldInfo? combatStateField = hand.GetType().GetField("_combatState", BindingFlags.Instance | BindingFlags.NonPublic);
        return combatStateField?.GetValue(hand) as CombatState;
    }

    private static bool TryResolvePlayerCombatState(CombatState combatState, out PlayerCombatState? playerCombatState)
    {
        Player? player = combatState.Players.FirstOrDefault();
        playerCombatState = player?.PlayerCombatState;
        return playerCombatState is not null;
    }

    private static CombatRuntimePhase ReadRuntimePhase()
    {
        CombatManager? combatManager = CombatManager.Instance;
        RunManager? runManager = RunManager.Instance;

        bool isPlayPhase = combatManager?.IsPlayPhase == true;
        bool playerActionsDisabled = combatManager?.PlayerActionsDisabled == true;
        bool isEnemyTurnStarted = combatManager?.IsEnemyTurnStarted == true;
        bool endingPlayerTurnPhaseOne = combatManager?.EndingPlayerTurnPhaseOne == true;
        bool endingPlayerTurnPhaseTwo = combatManager?.EndingPlayerTurnPhaseTwo == true;
        bool actionQueueIsEmpty = runManager?.ActionQueueSet?.IsEmpty == true;
        bool actionExecutorIsRunning = runManager?.ActionExecutor?.IsRunning == true;

        return new CombatRuntimePhase(
            IsPlayPhase: isPlayPhase,
            PlayerActionsDisabled: playerActionsDisabled,
            IsEnemyTurnStarted: isEnemyTurnStarted,
            EndingPlayerTurnPhaseOne: endingPlayerTurnPhaseOne,
            EndingPlayerTurnPhaseTwo: endingPlayerTurnPhaseTwo,
            ActionQueueIsEmpty: actionQueueIsEmpty,
            ActionExecutorIsRunning: actionExecutorIsRunning,
            IsReadyForPlayerInput: isPlayPhase
                && !playerActionsDisabled
                && !isEnemyTurnStarted
                && !endingPlayerTurnPhaseOne
                && !endingPlayerTurnPhaseTwo
                && actionQueueIsEmpty
                && !actionExecutorIsRunning);
    }

    private readonly record struct CombatRuntimePhase(
        bool IsPlayPhase,
        bool PlayerActionsDisabled,
        bool IsEnemyTurnStarted,
        bool EndingPlayerTurnPhaseOne,
        bool EndingPlayerTurnPhaseTwo,
        bool ActionQueueIsEmpty,
        bool ActionExecutorIsRunning,
        bool IsReadyForPlayerInput);

    private static List<ExportCombatCard> BuildHandCards(PlayerCombatState playerCombatState, CombatHandSnapshot handSnapshot)
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

    private static ExportCombatCreature BuildCreature(NCreature node)
    {
        Creature creature = node.Entity;
        List<ExportCombatIntent> intents = SceneTraversal.FindAllVisible<NIntent>(node)
            .Select(intent => BuildIntent(node, intent))
            .ToList();

        return new ExportCombatCreature
        {
            Id = CombatCardIdentity.FromCreature(creature),
            Name = creature.Name,
            Side = creature.Side.ToString(),
            SlotName = creature.SlotName,
            CurrentHp = creature.CurrentHp,
            MaxHp = creature.MaxHp,
            Block = creature.Block,
            IsPlayer = creature.IsPlayer,
            IsEnemy = creature.IsEnemy,
            // Combat objects can briefly outlive the underlying combat state during
            // room transitions. These flags are useful when available, but they
            // must never be allowed to crash frame export.
            IsHittable = SafeReadFlag(static candidate => candidate.IsHittable, creature),
            IsStunned = SafeReadFlag(static candidate => candidate.IsStunned, creature),
            Powers = creature.Powers.Select(BuildPower).ToList(),
            Intents = intents
        };
    }

    private static bool SafeReadFlag(Func<Creature, bool> reader, Creature creature)
    {
        try
        {
            return reader(creature);
        }
        catch
        {
            return false;
        }
    }

    private static ExportCombatIntent BuildIntent(NCreature ownerNode, NIntent intentNode)
    {
        object? intent = intentNode.GetType()
            .GetField("_intent", BindingFlags.Instance | BindingFlags.NonPublic)
            ?.GetValue(intentNode);
        object? rawTargets = intentNode.GetType()
            .GetField("_targets", BindingFlags.Instance | BindingFlags.NonPublic)
            ?.GetValue(intentNode);
        List<Creature> targetCreatures = rawTargets is IEnumerable<Creature> creatureTargets
            ? creatureTargets.ToList()
            : [];

        string? fallbackLabel = NodeTextReader.ReadVisibleTexts(intentNode, 3).FirstOrDefault();
        string? label = ResolveIntentLabel(intent, targetCreatures, ownerNode.Entity) ?? fallbackLabel;
        HoverTip? hoverTip = ResolveIntentHoverTip(intent, targetCreatures, ownerNode.Entity);
        string? title = hoverTip?.Title;
        string? description = hoverTip?.Description;
        return new ExportCombatIntent
        {
            Kind = intent?.GetType().Name ?? "UnknownIntent",
            Label = label,
            Title = title,
            Description = description,
            Summary = BuildIntentSummary(title, description, label, intent),
            Targets = targetCreatures.Select(CombatCardIdentity.FromCreature).ToList(),
            OwnerId = CombatCardIdentity.FromCreature(ownerNode.Entity)
        };
    }

    private static string? ResolveIntentLabel(object? intent, IEnumerable<Creature> targets, Creature owner)
    {
        if (intent is null)
        {
            return null;
        }

        MethodInfo? labelMethod = intent.GetType().GetMethod(
            "GetIntentLabel",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            null,
            [typeof(IEnumerable<Creature>), typeof(Creature)],
            null);
        object? label = labelMethod?.Invoke(intent, [targets, owner]);
        return label switch
        {
            null => null,
            LocString locString => AgentText.SafeText(locString),
            _ => label.ToString()
        };
    }

    private static HoverTip? ResolveIntentHoverTip(object? intent, IEnumerable<Creature> targets, Creature owner)
    {
        if (intent is null)
        {
            return null;
        }

        MethodInfo? hoverTipMethod = intent.GetType().GetMethod(
            "GetHoverTip",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            null,
            [typeof(IEnumerable<Creature>), typeof(Creature)],
            null);
        object? hoverTip = hoverTipMethod?.Invoke(intent, [targets, owner]);
        return hoverTip is HoverTip value ? value : null;
    }

    private static string? BuildIntentSummary(string? title, string? description, string? label, object? intent)
    {
        if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(description))
        {
            return $"{title}: {description}";
        }

        if (!string.IsNullOrWhiteSpace(description))
        {
            return description;
        }

        if (!string.IsNullOrWhiteSpace(label))
        {
            return label;
        }

        return intent?.GetType().Name;
    }

    private static ExportCombatPower BuildPower(object power)
    {
        Type type = power.GetType();
        return new ExportCombatPower
        {
            Id = type.Name,
            Label = ReadLocStringProperty(power, type, "Title") ?? type.Name,
            Amount = ReadIntProperty(power, type, "Amount"),
            Description = ReadLocStringProperty(power, type, "Description")
        };
    }

    private static string? ReadLocStringProperty(object instance, Type type, string propertyName)
    {
        PropertyInfo? property = type.GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        object? value = property?.GetValue(instance);
        return value switch
        {
            null => null,
            MegaCrit.Sts2.Core.Localization.LocString loc => AgentText.SafeText(loc),
            _ => value.ToString()
        };
    }

    private static int? ReadIntProperty(object instance, Type type, string propertyName)
    {
        PropertyInfo? property = type.GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        object? value = property?.GetValue(instance);
        return value switch
        {
            int amount => amount,
            _ => null
        };
    }

    private static int? ReadIntProperty(object instance, string propertyName)
    {
        return ReadIntProperty(instance, instance.GetType(), propertyName);
    }

    private static object? ReadObjectProperty(object instance, string propertyName)
    {
        PropertyInfo? property = instance.GetType().GetProperty(
            propertyName,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return property?.GetValue(instance);
    }

    private static bool? ReadBoolProperty(object instance, string propertyName)
    {
        PropertyInfo? property = instance.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        object? value = property?.GetValue(instance);
        return value switch
        {
            bool flag => flag,
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
            Match match = NumberRegex.Match(text);
            if (match.Success)
            {
                return int.Parse(match.Value);
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
            Match match = NumberRegex.Match(text);
            if (match.Success)
            {
                return int.Parse(match.Value);
            }
        }

        return null;
    }
}
