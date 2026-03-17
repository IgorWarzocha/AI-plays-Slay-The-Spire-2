using System.Reflection;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Nodes.Combat;

namespace Sts2StateExport;

internal static class CombatStateReader
{
    private static readonly FieldInfo? CombatStateField = typeof(NPlayerHand)
        .GetField("_combatState", BindingFlags.Instance | BindingFlags.NonPublic);

    public static CombatState? TryReadCombatState(NPlayerHand hand)
    {
        return CombatStateField?.GetValue(hand) as CombatState;
    }

    public static bool TryResolvePlayerCombatState(CombatState combatState, out PlayerCombatState? playerCombatState)
    {
        Player? player = combatState.Players.FirstOrDefault();
        playerCombatState = player?.PlayerCombatState;
        return playerCombatState is not null;
    }

    public static CombatRuntimePhase ReadRuntimePhase()
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
}

internal readonly record struct CombatRuntimePhase(
    bool IsPlayPhase,
    bool PlayerActionsDisabled,
    bool IsEnemyTurnStarted,
    bool EndingPlayerTurnPhaseOne,
    bool EndingPlayerTurnPhaseTwo,
    bool ActionQueueIsEmpty,
    bool ActionExecutorIsRunning,
    bool IsReadyForPlayerInput);
