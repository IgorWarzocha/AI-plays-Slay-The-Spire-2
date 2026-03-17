using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

// The closed merchant room only needs two room-level actions: open the rug or
// leave. Inventory interaction is handled by a separate overlay feature.
public sealed class MerchantRoomFeature : IAgentFeature
{
    public int Order => 450;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NMerchantRoom? room = SceneTraversal.FindFirstVisible<NMerchantRoom>(context.Root);
        if (room is null)
        {
            return false;
        }

        if (room.Inventory?.IsOpen == true)
        {
            return false;
        }

        state.ScreenType = "merchant_room";
        state.MenuItems =
        [
            new ExportMenuItem
            {
                Id = "open",
                Label = "Open Merchant",
                Description = "Open the merchant inventory.",
                Visible = true,
                Enabled = room.MerchantButton is not null,
                Selected = false
            },
            new ExportMenuItem
            {
                Id = "proceed",
                Label = "Proceed",
                Description = "Leave the merchant room.",
                Visible = room.ProceedButton is not null && SceneTraversal.IsNodeVisible(room.ProceedButton),
                Enabled = room.ProceedButton is not null && SceneTraversal.IsNodeVisible(room.ProceedButton),
                Selected = false
            }
        ];
        state.Actions = state.MenuItems
            .Where(static item => item.Visible && item.Enabled)
            .Select(item => $"merchant.{item.Id}")
            .Append("merchant.leave")
            .Distinct(StringComparer.Ordinal)
            .ToList();
        MerchantContextBuilder.PopulateRuntimeContext(state);
        state.Notes =
        [
            "Merchant room is active.",
            "Open the merchant before buying anything."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "merchant")
        {
            return false;
        }

        NMerchantRoom room = context.RequireVisible<NMerchantRoom>();
        if (room.Inventory?.IsOpen == true)
        {
            return false;
        }

        switch (command.Verb)
        {
            case "open":
                room.OpenInventory();
                return true;
            case "proceed":
            case "leave":
                if (room.ProceedButton is null || !SceneTraversal.IsNodeVisible(room.ProceedButton))
                {
                    throw new InvalidOperationException("Merchant proceed button is unavailable.");
                }

                RuntimeInvoker.Invoke(room, context.Reflection.MerchantRoomHideScreenMethod, room.ProceedButton);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported merchant room action '{command.RawAction}'.");
        }
    }
}
