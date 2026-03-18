using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Combat;

namespace Sts2StateExport;

// Combat hand export needs a real notion of "settled" so the controller does
// not act on transient animation frames that expose only part of the hand.
public sealed record CombatHandSnapshot(
    IReadOnlyList<NHandCardHolder> ActiveHolders,
    IReadOnlyList<NHandCardHolder> AllHolders,
    int ModelHandCount,
    int PendingHolderCount,
    bool HandAnimationActive,
    bool CardPlayInProgress,
    bool IsSettled);

public static class CombatHandSnapshotReader
{
    private static readonly PropertyInfo? HoldersProperty = typeof(NPlayerHand)
        .GetProperty("Holders", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    private static readonly FieldInfo? HoldersAwaitingQueueField = typeof(NPlayerHand)
        .GetField("_holdersAwaitingQueue", BindingFlags.Instance | BindingFlags.NonPublic);
    private static readonly FieldInfo? CombatStateField = typeof(NPlayerHand)
        .GetField("_combatState", BindingFlags.Instance | BindingFlags.NonPublic);
    private static readonly FieldInfo? CurrentCardPlayField = typeof(NPlayerHand)
        .GetField("_currentCardPlay", BindingFlags.Instance | BindingFlags.NonPublic);
    private static readonly FieldInfo? AnimEnableTweenField = typeof(NPlayerHand)
        .GetField("_animEnableTween", BindingFlags.Instance | BindingFlags.NonPublic);
    private static readonly FieldInfo? AnimInTweenField = typeof(NPlayerHand)
        .GetField("_animInTween", BindingFlags.Instance | BindingFlags.NonPublic);
    private static readonly FieldInfo? AnimOutTweenField = typeof(NPlayerHand)
        .GetField("_animOutTween", BindingFlags.Instance | BindingFlags.NonPublic);

    internal static CombatHandSnapshot Capture(NPlayerHand hand, CombatRuntimePhase runtimePhase)
    {
        IReadOnlyList<NHandCardHolder> activeHolders = hand.ActiveHolders
            .Where(static holder => holder.CardModel is not null)
            .ToList();
        IReadOnlyList<NHandCardHolder> allHolders = ReadAllHolders(hand)
            .Where(static holder => holder.CardModel is not null)
            .ToList();
        int modelHandCount = ReadModelHandCount(hand);
        int pendingHolderCount = ReadPendingHolderCount(hand);
        bool handAnimationActive = HasRunningHandTween(hand);
        bool rawCardPlayInProgress = hand.InCardPlay || CurrentCardPlayField?.GetValue(hand) is not null;
        bool activeParitySatisfied = hand.CurrentMode.ToString() is not ("None" or "Play")
            || activeHolders.Count == allHolders.Count;
        bool modelParitySatisfied = allHolders.Count == modelHandCount;
        bool cardPlayInProgress = rawCardPlayInProgress && !ShouldSuppressStickyCardPlayFlag(
            runtimePhase,
            pendingHolderCount,
            handAnimationActive,
            activeParitySatisfied,
            modelParitySatisfied);

        return new CombatHandSnapshot(
            ActiveHolders: activeHolders,
            AllHolders: allHolders,
            ModelHandCount: modelHandCount,
            PendingHolderCount: pendingHolderCount,
            HandAnimationActive: handAnimationActive,
            CardPlayInProgress: cardPlayInProgress,
            IsSettled: pendingHolderCount == 0
                && !handAnimationActive
                && !cardPlayInProgress
                && activeParitySatisfied
                && modelParitySatisfied);
    }

    private static bool ShouldSuppressStickyCardPlayFlag(
        CombatRuntimePhase runtimePhase,
        int pendingHolderCount,
        bool handAnimationActive,
        bool activeParitySatisfied,
        bool modelParitySatisfied)
    {
        return runtimePhase.IsReadyForPlayerInput
            && pendingHolderCount == 0
            && !handAnimationActive
            && activeParitySatisfied
            && modelParitySatisfied;
    }

    private static IReadOnlyList<NHandCardHolder> ReadAllHolders(NPlayerHand hand)
    {
        if (HoldersProperty?.GetValue(hand) is IReadOnlyList<NHandCardHolder> holders)
        {
            return holders;
        }

        return hand.ActiveHolders;
    }

    private static int ReadPendingHolderCount(NPlayerHand hand)
    {
        object? queue = HoldersAwaitingQueueField?.GetValue(hand);
        if (queue is null)
        {
            return 0;
        }

        PropertyInfo? countProperty = queue.GetType().GetProperty("Count", BindingFlags.Instance | BindingFlags.Public);
        object? rawCount = countProperty?.GetValue(queue);
        return rawCount switch
        {
            int count => count,
            _ => 0
        };
    }

    private static int ReadModelHandCount(NPlayerHand hand)
    {
        PlayerCombatState? playerCombatState = ReadPlayerCombatState(hand);
        return playerCombatState?.Hand?.Cards?.Count ?? hand.ActiveHolders.Count;
    }

    private static PlayerCombatState? ReadPlayerCombatState(NPlayerHand hand)
    {
        object? combatState = CombatStateField?.GetValue(hand);
        if (combatState is null)
        {
            return null;
        }

        PropertyInfo? playersProperty = combatState.GetType().GetProperty("Players", BindingFlags.Instance | BindingFlags.Public);
        if (playersProperty?.GetValue(combatState) is not IEnumerable<Player> players)
        {
            return null;
        }

        return players.FirstOrDefault()?.PlayerCombatState;
    }

    private static bool HasRunningHandTween(NPlayerHand hand)
    {
        return IsTweenRunning(AnimEnableTweenField?.GetValue(hand) as Tween)
            || IsTweenRunning(AnimInTweenField?.GetValue(hand) as Tween)
            || IsTweenRunning(AnimOutTweenField?.GetValue(hand) as Tween);
    }

    private static bool IsTweenRunning(Tween? tween)
    {
        return tween is not null
            && GodotObject.IsInstanceValid(tween)
            && tween.IsRunning();
    }
}
