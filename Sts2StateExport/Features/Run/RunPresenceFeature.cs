using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace Sts2StateExport;

// This is the first in-run safety net. Even before we export detailed combat,
// rewards, or map data, the agent should not lose observability right after
// embarking into a run.
public sealed class RunPresenceFeature : IAgentFeature
{
    public int Order => 475;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        if (SceneTraversal.FindFirstVisible<NCombatRoom>(context.Root) is not null)
        {
            state.ScreenType = "combat_room";
        }
        else if (SceneTraversal.FindFirstVisible<NMapRoom>(context.Root) is not null)
        {
            state.ScreenType = "map_room";
        }
        else if (SceneTraversal.FindFirstVisible<NMerchantRoom>(context.Root) is not null)
        {
            state.ScreenType = "merchant_room";
        }
        else if (SceneTraversal.FindFirstVisible<NRestSiteRoom>(context.Root) is not null)
        {
            state.ScreenType = "rest_site_room";
        }
        else if (SceneTraversal.FindFirstVisible<NTreasureRoom>(context.Root) is not null)
        {
            state.ScreenType = "treasure_room";
        }
        else if (SceneTraversal.FindFirstVisible<NMapScreen>(context.Root) is not null)
        {
            state.ScreenType = "map_screen";
        }
        else if (SceneTraversal.FindFirstVisible<NRewardsScreen>(context.Root) is not null)
        {
            state.ScreenType = "rewards_screen";
        }
        else if (SceneTraversal.FindFirstVisible<NRun>(context.Root) is not null)
        {
            state.ScreenType = "run_active";
        }
        else
        {
            return false;
        }

        state.Notes =
        [
            "A run is active.",
            "Room-specific automation beyond classification is not implemented yet."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        _ = context;
        _ = command;
        return false;
    }
}
