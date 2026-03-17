using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Entities.Merchant;

namespace Sts2StateExport;

internal static class MerchantInventoryText
{
    public static string? ReadRenderedLabel(Node? primaryNode, Node fallbackNode)
    {
        return ReadRenderedTexts(primaryNode, fallbackNode)
            .FirstOrDefault(static text => !LooksLikeCostText(text));
    }

    public static string? ReadRenderedDescription(Node? primaryNode, Node fallbackNode, string label)
    {
        return ReadRenderedTexts(primaryNode, fallbackNode)
            .FirstOrDefault(text =>
                !string.Equals(text, label, StringComparison.Ordinal)
                && !LooksLikeCostText(text));
    }

    public static IEnumerable<string> ReadRenderedTexts(Node? primaryNode, Node fallbackNode)
    {
        IEnumerable<string> primary = primaryNode is null
            ? []
            : NodeTextReader.ReadVisibleTexts(primaryNode, 6);
        IEnumerable<string> fallback = NodeTextReader.ReadVisibleTexts(fallbackNode, 8);
        return primary.Concat(fallback).Distinct(StringComparer.Ordinal);
    }

    public static bool LooksLikeCostText(string text)
    {
        string trimmed = text.Trim();
        return trimmed.All(static character => char.IsDigit(character))
            || trimmed.EndsWith(" gold", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("Cost:", StringComparison.OrdinalIgnoreCase);
    }

    public static bool HasEnoughGold(MerchantEntry entry, MerchantInventory inventory)
    {
        return ReadPlayerGold(inventory.Player) >= entry.Cost;
    }

    private static int ReadPlayerGold(object player)
    {
        PropertyInfo? goldProperty = player.GetType().GetProperty("Gold", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (goldProperty?.GetValue(player) is int gold)
        {
            return gold;
        }

        if (goldProperty?.GetValue(player) is decimal decimalGold)
        {
            return decimal.ToInt32(decimalGold);
        }

        throw new InvalidOperationException("Could not read player gold from merchant inventory.");
    }
}
