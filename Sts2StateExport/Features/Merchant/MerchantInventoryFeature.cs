using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;

namespace Sts2StateExport;

// The merchant inventory is a reusable commerce surface: explicit items, gold
// affordability, and a close action back to the room.
public sealed class MerchantInventoryFeature : IAgentFeature
{
    public int Order => 449;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NMerchantInventory? inventory = SceneTraversal.FindFirstVisible<NMerchantInventory>(context.Root);
        if (inventory is null || !inventory.IsOpen)
        {
            return false;
        }

        MerchantInventory merchantInventory = inventory.Inventory
            ?? throw new InvalidOperationException("Merchant inventory model was unavailable.");
        List<MerchantSlotSnapshot> slots = inventory
            .GetAllSlots()
            .Where(SceneTraversal.IsNodeVisible)
            .Select((slot, index) => MerchantInventorySnapshotBuilder.Build(slot, index, merchantInventory))
            .ToList();

        state.ScreenType = "merchant_inventory";
        state.MenuItems = BuildMenuItems(slots);
        state.Actions =
        [
            .. slots.Where(static slot => slot.Enabled).Select(slot => $"merchant.buy:{slot.Id}"),
            "merchant.close",
            "merchant.leave"
        ];
        MerchantContextBuilder.PopulateRuntimeContext(state);
        state.Notes =
        [
            "Merchant inventory is active.",
            "Buy actions execute the slot's native purchase flow."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "merchant" || command.Verb is not ("buy" or "close" or "leave"))
        {
            return false;
        }

        NMerchantInventory? inventory = SceneTraversal.FindFirstVisible<NMerchantInventory>(context.Root);
        if (inventory is null || !inventory.IsOpen)
        {
            return false;
        }

        return command.Verb switch
        {
            "buy" => MerchantInventoryExecutor.ExecutePurchase(context, inventory, command.Argument),
            "close" => MerchantInventoryExecutor.ExecuteClose(context, inventory),
            "leave" => MerchantInventoryExecutor.ExecuteLeave(context, inventory),
            _ => false
        };
    }

    private static List<ExportMenuItem> BuildMenuItems(IEnumerable<MerchantSlotSnapshot> slots)
    {
        return
        [
            .. slots.Select(
                static slot => new ExportMenuItem
                {
                    Id = slot.Id,
                    Label = slot.Label,
                    Description = slot.Description,
                    Visible = true,
                    Enabled = slot.Enabled,
                    Selected = false
                }),
            new ExportMenuItem
            {
                Id = "close",
                Label = "Close Merchant",
                Description = "Close the merchant inventory.",
                Visible = true,
                Enabled = true,
                Selected = false
            }
        ];
    }
}
