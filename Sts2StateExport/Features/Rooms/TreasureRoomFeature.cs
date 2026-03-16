using Godot;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.TreasureRoomRelic;

namespace Sts2StateExport;

// Treasure rooms have a small state machine: unopened chest, relic picker, and
// post-claim proceed. The relic picker is handled separately; this feature owns
// the room-level open/proceed flow.
public sealed class TreasureRoomFeature : IAgentFeature
{
    public int Order => 454;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NTreasureRoom? room = SceneTraversal.FindFirstVisible<NTreasureRoom>(context.Root);
        if (room is null)
        {
            return false;
        }

        NTreasureRoomRelicCollection? collection = context.Reflection.ReadField<NTreasureRoomRelicCollection>(room, context.Reflection.TreasureRelicCollectionField);
        if (collection is not null && SceneTraversal.FindAllVisible<NTreasureRoomRelicHolder>(collection).Count > 0)
        {
            return false;
        }

        NButton? chestButton = context.Reflection.ReadField<NButton>(room, context.Reflection.TreasureChestButtonField);
        state.ScreenType = "treasure_room";
        state.MenuItems = [];
        state.Actions = [];

        if (chestButton is not null && SceneTraversal.IsNodeVisible(chestButton))
        {
            state.MenuItems.Add(
                new ExportMenuItem
                {
                    Id = "open",
                    Label = "Open Chest",
                    Description = "Open the treasure chest.",
                    Visible = true,
                    Enabled = true,
                    Selected = false
                });
            state.Actions.Add("treasure.open");
        }

        if (room.ProceedButton is not null && SceneTraversal.IsNodeVisible(room.ProceedButton))
        {
            state.MenuItems.Add(
                new ExportMenuItem
                {
                    Id = "proceed",
                    Label = "Proceed",
                    Description = "Leave the treasure room.",
                    Visible = true,
                    Enabled = true,
                    Selected = false
                });
            state.Actions.Add("treasure.proceed");
        }

        state.Notes =
        [
            "Treasure room is active.",
            "Open the chest before trying to proceed."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "treasure")
        {
            return false;
        }

        NTreasureRoom room = context.RequireVisible<NTreasureRoom>();
        switch (command.Verb)
        {
            case "open":
            {
                NButton chestButton = context.Reflection.ReadField<NButton>(room, context.Reflection.TreasureChestButtonField)
                    ?? throw new InvalidOperationException("Treasure chest button is unavailable.");
                RuntimeInvoker.Invoke(room, context.Reflection.TreasureChestReleasedMethod, chestButton);
                return true;
            }
            case "proceed":
            {
                NProceedButton proceedButton = room.ProceedButton
                    ?? throw new InvalidOperationException("Treasure proceed button is unavailable.");
                RuntimeInvoker.Invoke(room, context.Reflection.TreasureProceedMethod, proceedButton);
                return true;
            }
            default:
                throw new InvalidOperationException($"Unsupported treasure action '{command.RawAction}'.");
        }
    }
}
