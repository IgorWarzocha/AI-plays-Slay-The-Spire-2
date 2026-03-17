using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

// Combat is the highest-value in-run surface, so it gets its own feature
// boundary with direct model-backed exports and commands.
public sealed class CombatFeature : IAgentFeature
{
    public int Order => 460;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        if (CombatScreenGuard.IsBlockedByHigherPrioritySurface(context.Root))
        {
            return false;
        }

        NCombatRoom? room = SceneTraversal.FindFirstVisible<NCombatRoom>(context.Root);
        NCombatUi? ui = room?.Ui;
        NPlayerHand? hand = ui?.Hand;
        if (room is null || ui is null || hand is null)
        {
            return false;
        }

        if (CombatStateReader.TryReadCombatState(hand) is not { } combatState)
        {
            return false;
        }

        CombatHandSnapshot handSnapshot = CombatHandSnapshotReader.Capture(hand);
        if (!CombatStateReader.TryResolvePlayerCombatState(combatState, out PlayerCombatState? playerCombatState))
        {
            return false;
        }

        CombatRuntimePhase runtimePhase = CombatStateReader.ReadRuntimePhase();
        List<ExportCombatCreature> creatures = room.CreatureNodes
            .Select(CombatCreatureExportBuilder.BuildCreatureForExport)
            .OrderBy(creature => creature.Side)
            .ThenBy(creature => creature.SlotName)
            .ThenBy(creature => creature.Name)
            .ToList();
        List<ExportCombatCard> handCards = CombatCardExportBuilder.BuildHandCards(playerCombatState!, handSnapshot);
        bool isPlayerTurn = string.Equals(combatState.CurrentSide.ToString(), "Player", StringComparison.Ordinal);
        List<ExportCombatPotion> potions = CombatPotionSupport.BuildPotions(context.Root, creatures, isPlayerTurn);

        state.ScreenType = "combat_room";
        state.Combat = BuildCombatState(ui, combatState, playerCombatState!, handSnapshot, runtimePhase, handCards, potions, creatures, context);
        state.MenuItems = CombatMenuCatalog.BuildMenuItems(handCards);
        state.Actions = CombatMenuCatalog.BuildActions(
            handCards,
            CombatPotionSupport.BuildActions(potions),
            CombatMenuCatalog.BuildPileActions(ui));
        state.Notes = CombatRuntimeNotesBuilder.Build(handSnapshot, runtimePhase);

        return true;
    }

    internal static ExportCombatCreature BuildCreatureForExport(NCreature creature)
    {
        return CombatCreatureExportBuilder.BuildCreatureForExport(creature);
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "combat")
        {
            return false;
        }

        NCombatRoom room = context.RequireVisible<NCombatRoom>();
        NCombatUi ui = room.Ui ?? throw new InvalidOperationException("Combat UI is unavailable.");

        return command.Verb switch
        {
            "end_turn" => CombatCommandExecutor.ExecuteEndTurn(context, ui),
            "use_potion" or "discard_potion" => CombatCommandExecutor.ExecutePotionCommand(context, command),
            "open_pile" => CombatCommandExecutor.ExecuteOpenPile(context, ui, command.Argument),
            "play" => CombatCommandExecutor.ExecutePlayCommand(room, ui, command.Argument),
            _ => throw new InvalidOperationException($"Unsupported combat action '{command.RawAction}'.")
        };
    }

    private static ExportCombatState BuildCombatState(
        NCombatUi ui,
        MegaCrit.Sts2.Core.Combat.CombatState combatState,
        PlayerCombatState playerCombatState,
        CombatHandSnapshot handSnapshot,
        CombatRuntimePhase runtimePhase,
        List<ExportCombatCard> handCards,
        List<ExportCombatPotion> potions,
        List<ExportCombatCreature> creatures,
        FeatureContext context)
    {
        return new ExportCombatState
        {
            RoundNumber = combatState.RoundNumber,
            CurrentSide = combatState.CurrentSide.ToString(),
            Energy = playerCombatState.Energy,
            HandIsSettled = handSnapshot.IsSettled && runtimePhase.IsReadyForPlayerInput,
            ActiveHandCount = handSnapshot.ActiveHolders.Count,
            TotalHandCount = handSnapshot.AllHolders.Count,
            ModelHandCount = handSnapshot.ModelHandCount,
            PendingHandHolderCount = handSnapshot.PendingHolderCount,
            HandAnimationActive = handSnapshot.HandAnimationActive,
            CardPlayInProgress = handSnapshot.CardPlayInProgress,
            Hand = handCards,
            DrawPileCount = playerCombatState.DrawPile.Cards.Count,
            DiscardPileCount = playerCombatState.DiscardPile.Cards.Count,
            ExhaustPileCount = playerCombatState.ExhaustPile.Cards.Count,
            CanEndTurn = RuntimeInvoker.Invoke<bool>(ui.EndTurnButton, context.Reflection.CombatEndTurnCanTurnBeEndedMethod),
            Potions = potions,
            Creatures = creatures
        };
    }
}
