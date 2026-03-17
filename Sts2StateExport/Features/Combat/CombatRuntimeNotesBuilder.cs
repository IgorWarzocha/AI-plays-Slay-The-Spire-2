namespace Sts2StateExport;

internal static class CombatRuntimeNotesBuilder
{
    public static string[] Build(CombatHandSnapshot handSnapshot, CombatRuntimePhase runtimePhase)
    {
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
                $"card play {(handSnapshot.CardPlayInProgress ? "active" : "idle")}." );
        }

        if (handSnapshot.IsSettled && !runtimePhase.IsReadyForPlayerInput)
        {
            notes.Add(
                $"Combat runtime is not ready for player input yet: playPhase={runtimePhase.IsPlayPhase}, " +
                $"actionsDisabled={runtimePhase.PlayerActionsDisabled}, enemyTurnStarted={runtimePhase.IsEnemyTurnStarted}, " +
                $"endingP1={runtimePhase.EndingPlayerTurnPhaseOne}, endingP2={runtimePhase.EndingPlayerTurnPhaseTwo}, " +
                $"queueEmpty={runtimePhase.ActionQueueIsEmpty}, executorRunning={runtimePhase.ActionExecutorIsRunning}.");
        }

        return [.. notes];
    }
}
