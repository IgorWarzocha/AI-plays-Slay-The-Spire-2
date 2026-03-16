using Godot;

namespace Sts2StateExport;

public static class SceneTraversal
{
    public static T? FindFirstVisible<T>(Node root) where T : Node
    {
        if (root is T self && IsNodeVisible(self))
        {
            return self;
        }

        foreach (Node child in root.GetChildren())
        {
            T? match = FindFirstVisible<T>(child);
            if (match is not null)
            {
                return match;
            }
        }

        return null;
    }

    public static List<T> FindAllVisible<T>(Node root) where T : Node
    {
        List<T> items = [];
        FindAllVisibleRecursive(root, items);
        return items;
    }

    public static bool IsNodeVisible(Node node)
    {
        return node switch
        {
            Control control => control.IsVisibleInTree(),
            CanvasItem canvasItem => canvasItem.IsVisibleInTree(),
            _ => node.IsInsideTree()
        };
    }

    public static bool HasFocus(Node node)
    {
        return node is Control control && control.HasFocus();
    }

    public static List<string> ListVisibleTypeNames(Node root, int limit)
    {
        List<string> items = [];
        ListVisibleTypeNamesRecursive(root, items, limit);
        return items;
    }

    private static void FindAllVisibleRecursive<T>(Node node, List<T> items) where T : Node
    {
        if (node is T self && IsNodeVisible(self))
        {
            items.Add(self);
        }

        foreach (Node child in node.GetChildren())
        {
            FindAllVisibleRecursive(child, items);
        }
    }

    private static void ListVisibleTypeNamesRecursive(Node node, List<string> items, int limit)
    {
        if (items.Count >= limit)
        {
            return;
        }

        if (IsNodeVisible(node))
        {
            string typeName = node.GetType().FullName ?? node.GetType().Name;
            if (!items.Contains(typeName, StringComparer.Ordinal))
            {
                items.Add(typeName);
            }
        }

        foreach (Node child in node.GetChildren())
        {
            ListVisibleTypeNamesRecursive(child, items, limit);
            if (items.Count >= limit)
            {
                return;
            }
        }
    }
}
