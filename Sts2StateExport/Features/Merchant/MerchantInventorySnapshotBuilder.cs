using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;

namespace Sts2StateExport;

internal static class MerchantInventorySnapshotBuilder
{
    public static MerchantSlotSnapshot Build(NMerchantSlot slot, int index, MerchantInventory inventory)
    {
        MerchantEntry entry = slot.Entry ?? throw new InvalidOperationException("Merchant slot had no entry.");
        bool affordable = MerchantInventoryText.HasEnoughGold(entry, inventory);

        return slot switch
        {
            NMerchantCard cardSlot => BuildCardSnapshot(cardSlot, index, affordable),
            NMerchantRelic relicSlot => BuildRelicSnapshot(relicSlot, index, affordable),
            NMerchantPotion potionSlot => BuildPotionSnapshot(potionSlot, index, affordable),
            NMerchantCardRemoval removalSlot => BuildRemovalSnapshot(removalSlot, index, affordable),
            _ => BuildFallbackSnapshot(slot, entry, index, affordable)
        };
    }

    private static MerchantSlotSnapshot BuildCardSnapshot(NMerchantCard slot, int index, bool affordable)
    {
        MerchantCardEntry entry = (MerchantCardEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant card slot had no entry."));
        CardCreationResult creationResult = entry.CreationResult
            ?? throw new InvalidOperationException("Merchant card entry did not expose creation data.");
        CardModel card = creationResult.Card
            ?? throw new InvalidOperationException("Merchant card entry did not expose a card model.");
        NCard? cardNode = ReadNodeField<NCard>(slot, "_cardNode");
        string label = CardTextResolver.ResolveLabel(cardNode, card);
        string description = MerchantEntryDescriptionBuilder.Compose(
            CardTextResolver.ResolveDescription(cardNode, card, label),
            entry.Cost,
            entry.IsStocked,
            affordable,
            entry.IsOnSale ? "On sale." : null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("card", label, index),
            label,
            description,
            entry.IsStocked && affordable);
    }

    private static MerchantSlotSnapshot BuildRelicSnapshot(NMerchantRelic slot, int index, bool affordable)
    {
        MerchantRelicEntry entry = (MerchantRelicEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant relic slot had no entry."));
        RelicModel relic = entry.Model
            ?? throw new InvalidOperationException("Merchant relic entry did not expose a relic model.");
        Node? relicNode = ReadNodeField<Node>(slot, "_relicNode");
        string label = MerchantInventoryText.ReadRenderedLabel(relicNode, slot)
            ?? AgentText.SafeText(relic.Title)
            ?? relic.GetType().Name;
        string description = MerchantEntryDescriptionBuilder.Compose(
            MerchantInventoryText.ReadRenderedDescription(relicNode, slot, label) ?? ModelTextResolver.ResolveRelicDescription(relic),
            entry.Cost,
            entry.IsStocked,
            affordable,
            null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("relic", label, index),
            label,
            description,
            entry.IsStocked && affordable);
    }

    private static MerchantSlotSnapshot BuildPotionSnapshot(NMerchantPotion slot, int index, bool affordable)
    {
        MerchantPotionEntry entry = (MerchantPotionEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant potion slot had no entry."));
        PotionModel potion = entry.Model
            ?? throw new InvalidOperationException("Merchant potion entry did not expose a potion model.");
        Node? potionNode = ReadNodeField<Node>(slot, "_potionNode");
        string label = MerchantInventoryText.ReadRenderedLabel(potionNode, slot)
            ?? AgentText.SafeText(potion.Title)
            ?? potion.GetType().Name;
        string description = MerchantEntryDescriptionBuilder.Compose(
            MerchantInventoryText.ReadRenderedDescription(potionNode, slot, label) ?? ModelTextResolver.ResolvePotionDescription(potion),
            entry.Cost,
            entry.IsStocked,
            affordable,
            null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("potion", label, index),
            label,
            description,
            entry.IsStocked && affordable);
    }

    private static MerchantSlotSnapshot BuildRemovalSnapshot(NMerchantCardRemoval slot, int index, bool affordable)
    {
        MerchantCardRemovalEntry entry = (MerchantCardRemovalEntry)(slot.Entry ?? throw new InvalidOperationException("Merchant removal slot had no entry."));
        string label = "Remove a card";
        string? nodeDescription = NodeTextReader.ReadVisibleTexts(slot, 4)
            .FirstOrDefault(static text => !text.Contains("remove a card", StringComparison.OrdinalIgnoreCase));
        string description = MerchantEntryDescriptionBuilder.Compose(
            nodeDescription,
            entry.Cost,
            entry.IsStocked,
            affordable,
            entry.Used ? "Already used." : null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("remove", label, index),
            label,
            description,
            entry.IsStocked && affordable);
    }

    private static MerchantSlotSnapshot BuildFallbackSnapshot(NMerchantSlot slot, MerchantEntry entry, int index, bool affordable)
    {
        string label = NodeTextReader.ReadVisibleTexts(slot, 3).FirstOrDefault() ?? slot.GetType().Name;
        string? details = NodeTextReader.ReadVisibleTexts(slot, 5)
            .FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));
        string description = MerchantEntryDescriptionBuilder.Compose(details, entry.Cost, entry.IsStocked, affordable, null);

        return new MerchantSlotSnapshot(
            MerchantEntryIdentity.Create("slot", label, index),
            label,
            description,
            entry.IsStocked && affordable);
    }

    private static TNode? ReadNodeField<TNode>(object instance, string fieldName) where TNode : class
    {
        FieldInfo? field = instance.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
        return field?.GetValue(instance) as TNode;
    }
}
