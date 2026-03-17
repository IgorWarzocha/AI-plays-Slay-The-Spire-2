using Godot;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

internal static class CombatCommandExecutor
{
    public static bool ExecuteEndTurn(FeatureContext context, NCombatUi ui)
    {
        RuntimeInvoker.Invoke(
            ui.EndTurnButton ?? throw new InvalidOperationException("End turn button is unavailable."),
            context.Reflection.CombatEndTurnOnReleaseMethod);
        return true;
    }

    public static bool ExecutePotionCommand(FeatureContext context, ParsedCommand command)
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

    public static bool ExecuteOpenPile(FeatureContext context, NCombatUi ui, string? argument)
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
        return true;
    }

    public static bool ExecutePlayCommand(NCombatRoom room, NCombatUi ui, string? argument)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Combat play requires a card id.");
        }

        string[] parts = argument.Split('@', 2, StringSplitOptions.TrimEntries);
        string cardId = parts[0];
        string? targetId = parts.Length == 2 ? parts[1] : null;

        NPlayerHand hand = ui.Hand ?? throw new InvalidOperationException("Combat hand is unavailable.");
        CombatState combatState = CombatStateReader.TryReadCombatState(hand)
            ?? throw new InvalidOperationException("Combat hand did not expose an active combat state.");
        if (!CombatStateReader.TryResolvePlayerCombatState(combatState, out PlayerCombatState? playerCombatState))
        {
            throw new InvalidOperationException("Combat hand did not expose a player combat state.");
        }

        CardModel card = playerCombatState!.Hand.Cards
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

        return true;
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
}
