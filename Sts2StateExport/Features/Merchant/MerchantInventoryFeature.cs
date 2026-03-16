using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Models;
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

        List<MerchantSlotSnapshot> slots = inventory
            .GetAllSlots()
            .Where(SceneTraversal.IsNodeVisible)
            .Select((slot, index) => BuildSnapshot(slot, index))
            .ToList();

        state.ScreenType = "merchant_inventory";
        state.MenuItems =
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
        state.Actions =
        [
            .. slots.Where(static slot => slot.Enabled).Select(slot => $"merchant.buy:{slot.Id}"),
            "merchant.close"
        ];
        state.Notes =
        [
            "Merchant inventory is active.",
            "Buy actions execute the slot's native purchase flow."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "merchant")
        {
            return false;
        }

        if (command.Verb is not ("buy" or "close"))
        {
            return false;
        }

        NMerchantInventory? inventory = SceneTraversal.FindFirstVisible<NMerchantInventory>(context.Root);
        if (inventory is null || !inventory.IsOpen)
        {
            return false;
        }

        switch (command.Verb)
        {
            case "buy":
                ExecutePurchase(context, inventory, command.Argument);
                return true;
            case "close":
                RuntimeInvoker.Invoke(inventory, context.Reflection.MerchantInventoryCloseMethod);
                return true;
            default:
                return false;
        }
    }

    private static void ExecutePurchase(FeatureContext context, NMerchantInventory inventory, string? argument)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Merchant purchase requires an item id.");
        }

        NMerchantSlot slot = inventory
            .GetAllSlots()
            .Where(SceneTraversal.IsNodeVisible)
            .Select((candidate, index) => new { candidate, snapshot = BuildSnapshot(candidate, index) })
            .FirstOrDefault(item => string.Equals(item.snapshot.Id, argument, StringComparison.Ordinal))?.candidate
            ?? throw new InvalidOperationException($"Merchant item '{argument}' was not found.");

        MerchantEntry entry = slot.Entry ?? throw new InvalidOperationException("Merchant slot had no entry.");
        if (!entry.IsStocked)
        {
            throw new InvalidOperationException($"Merchant item '{argument}' is already sold out.");
        }

        if (!entry.EnoughGold)
        {
            throw new InvalidOperationException($"Merchant item '{argument}' is not affordable.");
        }

        Task task = RuntimeInvoker.InvokeTask(slot, context.Reflection.MerchantSlotOnReleasedMethod);
        context.QueueTask(task, $"merchant.buy:{argument}");
    }

    private static MerchantSlotSnapshot BuildSnapshot(NMerchantSlot slot, int index)
    {
        MerchantEntry entry = slot.Entry ?? throw new InvalidOperationException("Merchant slot had no entry.");

        return slot switch
        {
            NMerchantCard cardSlot => BuildCardSnapshot(cardSlot, index),
            NMerchantRelic relicSlot => BuildRelicSnapshot(relicSlot, index),
            NMerchantPotion potionSlot => BuildPotionSnapshot(potionSlot, index),
            NMerchantCardRemoval removalSlot => BuildRemovalSnapshot(removalSlot, index),
            _ => BuildFallbackSnapshot(slot, entry, index)
        };
    }

    private static MerchantSlotSnapshot BuildCardSnapshot(NMerchantCard slot, int index)
    {
        MerchantCardEntry entry = (MerchantCardEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant card slot had no entry."));
        CardCreationResult creationResult = entry.CreationResult
            ?? throw new InvalidOperationException("Merchant card entry did not expose creation data.");
        CardModel card = creationResult.Card
            ?? throw new InvalidOperationException("Merchant card entry did not expose a card model.");
        string label = AgentText.SafeText(card.TitleLocString) ?? card.Title;
        string description = DescribeEntry(entry, AgentText.SafeText(card.Description), entry.IsOnSale ? "On sale." : null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("card", label, index),
            label,
            description,
            entry.IsStocked && entry.EnoughGold);
    }

    private static MerchantSlotSnapshot BuildRelicSnapshot(NMerchantRelic slot, int index)
    {
        MerchantRelicEntry entry = (MerchantRelicEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant relic slot had no entry."));
        RelicModel relic = entry.Model
            ?? throw new InvalidOperationException("Merchant relic entry did not expose a relic model.");
        string label = AgentText.SafeText(relic.Title) ?? relic.GetType().Name;
        string description = DescribeEntry(entry, AgentText.SafeText(relic.Description), null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("relic", label, index),
            label,
            description,
            entry.IsStocked && entry.EnoughGold);
    }

    private static MerchantSlotSnapshot BuildPotionSnapshot(NMerchantPotion slot, int index)
    {
        MerchantPotionEntry entry = (MerchantPotionEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant potion slot had no entry."));
        PotionModel potion = entry.Model
            ?? throw new InvalidOperationException("Merchant potion entry did not expose a potion model.");
        string label = AgentText.SafeText(potion.Title) ?? potion.GetType().Name;
        string description = DescribeEntry(entry, AgentText.SafeText(potion.Description), null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("potion", label, index),
            label,
            description,
            entry.IsStocked && entry.EnoughGold);
    }

    private static MerchantSlotSnapshot BuildRemovalSnapshot(NMerchantCardRemoval slot, int index)
    {
        MerchantCardRemovalEntry entry = (MerchantCardRemovalEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant removal slot had no entry."));
        string label = "Remove a card";
        string? nodeDescription = NodeTextReader.ReadVisibleTexts(slot, 4)
            .FirstOrDefault(static text => !text.Contains("remove a card", StringComparison.OrdinalIgnoreCase));
        string description = DescribeEntry(entry, nodeDescription, entry.Used ? "Already used." : null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("remove", label, index),
            label,
            description,
            entry.IsStocked && entry.EnoughGold);
    }

    private static MerchantSlotSnapshot BuildFallbackSnapshot(NMerchantSlot slot, MerchantEntry entry, int index)
    {
        string label = NodeTextReader.ReadVisibleTexts(slot, 3).FirstOrDefault() ?? slot.GetType().Name;
        string? details = NodeTextReader.ReadVisibleTexts(slot, 5)
            .FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));
        string description = DescribeEntry(entry, details, null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("slot", label, index),
            label,
            description,
            entry.IsStocked && entry.EnoughGold);
    }

    private static string DescribeEntry(MerchantEntry entry, string? primary, string? extra)
    {
        List<string> parts = [];
        if (!string.IsNullOrWhiteSpace(primary))
        {
            parts.Add(primary.Trim());
        }

        parts.Add($"Cost: {entry.Cost} gold.");

        if (!entry.IsStocked)
        {
            parts.Add("Sold out.");
        }
        else if (!entry.EnoughGold)
        {
            parts.Add("Not enough gold.");
        }

        if (!string.IsNullOrWhiteSpace(extra))
        {
            parts.Add(extra.Trim());
        }

        return string.Join(" ", parts);
    }

    private sealed record MerchantSlotSnapshot(string Id, string Label, string Description, bool Enabled);
}
