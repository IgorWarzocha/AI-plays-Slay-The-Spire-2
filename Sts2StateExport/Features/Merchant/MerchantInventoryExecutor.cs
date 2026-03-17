using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;

namespace Sts2StateExport;

internal static class MerchantInventoryExecutor
{
    public static bool ExecutePurchase(FeatureContext context, NMerchantInventory inventory, string? argument)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Merchant purchase requires an item id.");
        }

        MerchantInventory merchantInventory = inventory.Inventory
            ?? throw new InvalidOperationException("Merchant inventory model was unavailable.");
        NMerchantSlot slot = inventory
            .GetAllSlots()
            .Where(SceneTraversal.IsNodeVisible)
            .Select((candidate, index) => new
            {
                candidate,
                snapshot = MerchantInventorySnapshotBuilder.Build(candidate, index, merchantInventory)
            })
            .FirstOrDefault(item => string.Equals(item.snapshot.Id, argument, StringComparison.Ordinal))
            ?.candidate
            ?? throw new InvalidOperationException($"Merchant item '{argument}' was not found.");

        MerchantEntry entry = slot.Entry ?? throw new InvalidOperationException("Merchant slot had no entry.");
        if (!entry.IsStocked)
        {
            throw new InvalidOperationException($"Merchant item '{argument}' is already sold out.");
        }

        if (!MerchantInventoryText.HasEnoughGold(entry, merchantInventory))
        {
            throw new InvalidOperationException($"Merchant item '{argument}' is not affordable.");
        }

        Task task = RuntimeInvoker.InvokeTask(slot, context.Reflection.MerchantSlotOnReleasedMethod);
        context.QueueTask(task, $"merchant.buy:{argument}");
        return true;
    }

    public static bool ExecuteClose(FeatureContext context, NMerchantInventory inventory)
    {
        RuntimeInvoker.Invoke(inventory, context.Reflection.MerchantInventoryCloseMethod);
        return true;
    }

    public static bool ExecuteLeave(FeatureContext context, NMerchantInventory inventory)
    {
        RuntimeInvoker.Invoke(inventory, context.Reflection.MerchantInventoryCloseMethod);

        NMerchantRoom room = SceneTraversal.FindFirstVisible<NMerchantRoom>(inventory.GetTree().Root)
            ?? throw new InvalidOperationException("Merchant room was not visible for leave action.");
        if (room.ProceedButton is null || !SceneTraversal.IsNodeVisible(room.ProceedButton))
        {
            throw new InvalidOperationException("Merchant proceed button is unavailable.");
        }

        RuntimeInvoker.Invoke(room, context.Reflection.MerchantRoomHideScreenMethod, room.ProceedButton);
        return true;
    }
}
