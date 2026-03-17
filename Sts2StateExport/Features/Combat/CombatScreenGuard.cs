using Godot;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

namespace Sts2StateExport;

internal static class CombatScreenGuard
{
    // Reward overlays sit on top of the combat room, so combat must yield
    // whenever one of those higher-level screens is currently visible.
    public static bool IsBlockedByHigherPrioritySurface(Node root)
    {
        return SceneTraversal.FindFirstVisible<NCardRewardSelectionScreen>(root) is not null
            || SceneTraversal.FindFirstVisible<NRewardsScreen>(root) is not null
            || SceneTraversal.FindFirstVisible<NMerchantRoom>(root) is not null
            || SceneTraversal.FindFirstVisible<NRestSiteRoom>(root) is not null
            || SceneTraversal.FindFirstVisible<NTreasureRoom>(root) is not null;
    }
}
