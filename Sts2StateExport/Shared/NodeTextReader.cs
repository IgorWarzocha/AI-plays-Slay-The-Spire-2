using System.Reflection;
using Godot;

namespace Sts2StateExport;

// Event and reward widgets often already render the text we need even when
// private model fields are awkward. This reader harvests visible text-bearing
// descendants without coupling the exporter to every custom label type.
public static class NodeTextReader
{
    public static List<string> ReadVisibleTexts(Node root, int limit = 6)
    {
        List<string> items = [];
        ReadVisibleTextsRecursive(root, items, limit);
        return items;
    }

    private static void ReadVisibleTextsRecursive(Node node, List<string> items, int limit)
    {
        if (items.Count >= limit)
        {
            return;
        }

        if (SceneTraversal.IsNodeVisible(node))
        {
            string? text = TryReadText(node);
            if (!string.IsNullOrWhiteSpace(text) && !items.Contains(text, StringComparer.Ordinal))
            {
                items.Add(text);
            }
        }

        foreach (Node child in node.GetChildren())
        {
            ReadVisibleTextsRecursive(child, items, limit);
            if (items.Count >= limit)
            {
                return;
            }
        }
    }

    private static string? TryReadText(Node node)
    {
        PropertyInfo? textProperty = node.GetType().GetProperty("Text", BindingFlags.Instance | BindingFlags.Public);
        if (textProperty?.CanRead != true || textProperty.GetIndexParameters().Length != 0)
        {
            return null;
        }

        object? rawValue = textProperty.GetValue(node);
        if (rawValue is null)
        {
            return null;
        }

        return rawValue switch
        {
            string value => Normalize(value),
            _ => Normalize(rawValue.ToString())
        };
    }

    private static string? Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        string flattened = text.Replace('\n', ' ').Replace('\r', ' ').Trim();
        return string.IsNullOrWhiteSpace(flattened) ? null : flattened;
    }
}
