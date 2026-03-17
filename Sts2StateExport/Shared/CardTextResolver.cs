using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;

namespace Sts2StateExport;

// Live card nodes often contain already-resolved text, while model loc strings
// can still include unresolved placeholders in some combat contexts. Prefer the
// rendered node text whenever it is available.
internal static class CardTextResolver
{
    public static string ResolveLabel(NCard? cardNode, CardModel card)
    {
        return ReadCardText(cardNode, "_titleLabel")
            ?? AgentText.SafeText(card.TitleLocString)
            ?? card.Title;
    }

    public static string? ResolveDescription(NCard? cardNode, CardModel card, string? label = null)
    {
        string effectiveLabel = label
            ?? ReadCardText(cardNode, "_titleLabel")
            ?? AgentText.SafeText(card.TitleLocString)
            ?? card.Title;

        return ReadCardText(cardNode, "_descriptionLabel")
            ?? ReadRenderedDescription(cardNode, effectiveLabel)
            ?? AgentText.SafeText(card.Description);
    }

    private static string? ReadCardText(Node? cardNode, string fieldName)
    {
        if (cardNode is null)
        {
            return null;
        }

        FieldInfo? field = cardNode.GetType().GetField(
            fieldName,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        if (field?.GetValue(cardNode) is not Node node)
        {
            return null;
        }

        return NodeTextReader.ReadVisibleTexts(node, 1).FirstOrDefault();
    }

    private static string? ReadRenderedDescription(Node? cardNode, string label)
    {
        if (cardNode is null)
        {
            return null;
        }

        return NodeTextReader.ReadVisibleTexts(cardNode, 6)
            .FirstOrDefault(text =>
                !string.Equals(text, label, StringComparison.Ordinal)
                && !text.All(static character => char.IsDigit(character)));
    }
}
