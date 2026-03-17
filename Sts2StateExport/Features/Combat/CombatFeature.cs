using System.Reflection;
using System.Text.RegularExpressions;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

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

        NCombatUi ui = room.Ui ?? throw new InvalidOperationException("Combat room did not expose its combat UI.");
        NPlayerHand hand = ui.Hand ?? throw new InvalidOperationException("Combat UI did not expose the player hand.");
        CombatState? combatState = TryReadCombatState(hand);
        if (combatState is null)
        {
            return false;
        }
        CombatHandSnapshot handSnapshot = CombatHandSnapshotReader.Capture(hand);

        List<ExportCombatCreature> creatures = room.CreatureNodes
            .Select(BuildCreature)
            .OrderBy(creature => creature.Side)
            .ThenBy(creature => creature.SlotName)
            .ThenBy(creature => creature.Name)
            .ToList();
        List<ExportCombatCard> handCards = handSnapshot.ActiveHolders
            .Select(holder => BuildHandCard(holder))
            .ToList();
        bool isPlayerTurn = string.Equals(combatState.CurrentSide.ToString(), "Player", StringComparison.Ordinal);
        List<ExportCombatPotion> potions = CombatPotionSupport.BuildPotions(context.Root, creatures, isPlayerTurn);

        state.ScreenType = "combat_room";
        state.Combat = new ExportCombatState
        {
            RoundNumber = combatState.RoundNumber,
            CurrentSide = combatState.CurrentSide.ToString(),
            Energy = ReadCounterValue(SceneTraversal.FindFirstVisible<NEnergyCounter>(ui)),
            HandIsSettled = handSnapshot.IsSettled,
            ActiveHandCount = handSnapshot.ActiveHolders.Count,
            TotalHandCount = handSnapshot.AllHolders.Count,
            PendingHandHolderCount = handSnapshot.PendingHolderCount,
            HandAnimationActive = handSnapshot.HandAnimationActive,
            CardPlayInProgress = handSnapshot.CardPlayInProgress,
            Hand = handCards,
            DrawPileCount = ReadPileCount(ui.DrawPile),
            DiscardPileCount = ReadPileCount(ui.DiscardPile),
            ExhaustPileCount = ReadPileCount(ui.ExhaustPile),
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
                $"Combat hand is still settling: active {handSnapshot.ActiveHolders.Count}/{handSnapshot.AllHolders.Count}, " +
                $"queued {handSnapshot.PendingHolderCount}, tween {(handSnapshot.HandAnimationActive ? "active" : "idle")}, " +
                $"card play {(handSnapshot.CardPlayInProgress ? "active" : "idle")}.");
        }
        state.Notes = [.. notes];

        return true;
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
        NHandCardHolder holder = hand.ActiveHolders
            .FirstOrDefault(candidate =>
            {
                CardModel? model = candidate.CardModel;
                return model is not null
                    && string.Equals(CombatCardIdentity.FromCard(model), cardId, StringComparison.Ordinal);
            })
            ?? throw new InvalidOperationException($"Combat card '{cardId}' was not found in the active hand.");
        CardModel card = holder.CardModel ?? throw new InvalidOperationException("Hand card holder did not expose a card model.");

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

    private static ExportCombatCard BuildHandCard(NHandCardHolder holder)
    {
        CardModel card = holder.CardModel ?? throw new InvalidOperationException("Hand card holder did not expose a card model.");
        NCard? cardNode = holder.CardNode;
        bool isPlayable = ReadBoolProperty(card, "IsPlayable") ?? card.CanPlay();

        string title = CardTextResolver.ResolveLabel(cardNode, card);
        string? description = CardTextResolver.ResolveDescription(cardNode, card, title);

        return new ExportCombatCard
        {
            Id = CombatCardIdentity.FromCard(card),
            Title = title,
            Description = description,
            CostText = ReadCardCost(cardNode, card),
            TargetType = card.TargetType.ToString(),
            IsPlayable = isPlayable && card.CanPlay(),
            ValidTargetIds = card.TargetType.ToString() == "None"
                ? []
                : card.CombatState?.HittableEnemies
                    .Where(card.IsValidTarget)
                    .Select(CombatCardIdentity.FromCreature)
                    .ToList()
                    ?? [],
            GlowsGold = ReadBoolProperty(holder, "ShouldGlowGold") ?? false,
            GlowsRed = ReadBoolProperty(holder, "ShouldGlowRed") ?? false
        };
    }

    private static string? ReadCardCost(NCard? cardNode, CardModel card)
    {
        if (cardNode is not null)
        {
            foreach (string fieldName in new[] { "_energyLabel", "_costLabel", "_starCostLabel" })
            {
                FieldInfo? field = cardNode.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
                if (field?.GetValue(cardNode) is not Node node)
                {
                    continue;
                }

                string? text = NodeTextReader.ReadVisibleTexts(node, 1).FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }
        }

        int? canonicalCost = ReadIntProperty(card, "CanonicalEnergyCost");
        return canonicalCost is >= 0 ? canonicalCost.Value.ToString() : null;
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
        object? targets = intentNode.GetType()
            .GetField("_targets", BindingFlags.Instance | BindingFlags.NonPublic)
            ?.GetValue(intentNode);

        string? label = NodeTextReader.ReadVisibleTexts(intentNode, 3).FirstOrDefault();
        return new ExportCombatIntent
        {
            Kind = intent?.GetType().Name ?? "UnknownIntent",
            Label = label,
            Targets = targets is IEnumerable<Creature> creatureTargets
                ? creatureTargets.Select(CombatCardIdentity.FromCreature).ToList()
                : [],
            OwnerId = CombatCardIdentity.FromCreature(ownerNode.Entity)
        };
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
