using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.TreasureRoomRelic;

namespace Sts2StateExport;

// Treasure relic selection overlays the room and must take precedence over the
// base treasure room while the relic picker is visible.
public sealed class TreasureRelicFeature : IAgentFeature
{
    public int Order => 453;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NTreasureRoomRelicCollection? collection = SceneTraversal.FindFirstVisible<NTreasureRoomRelicCollection>(context.Root);
        List<NTreasureRoomRelicHolder> holders = collection is null
            ? []
            : SceneTraversal.FindAllVisible<NTreasureRoomRelicHolder>(collection)
                .Where(static holder => holder.Relic?.Model is not null)
                .OrderBy(static holder => holder.Index)
                .ToList();
        if (collection is null || holders.Count == 0)
        {
            return false;
        }

        state.ScreenType = "treasure_relic_selection";
        state.MenuItems = holders
            .Select(BuildRelicItem)
            .ToList();
        state.Actions = state.MenuItems
            .Select(item => $"treasure_relic.choose:{item.Id}")
            .ToList();
        state.Notes =
        [
            "Treasure relic picker is open.",
            "Choose one visible relic to continue the chest flow."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "treasure_relic" || command.Verb != "choose" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        NTreasureRoomRelicCollection collection = context.RequireVisible<NTreasureRoomRelicCollection>();
        NTreasureRoomRelicHolder holder = SceneTraversal.FindAllVisible<NTreasureRoomRelicHolder>(collection)
            .Where(static candidate => candidate.Relic?.Model is not null)
            .FirstOrDefault(candidate =>
            {
                RelicModel relic = candidate.Relic!.Model!;
                return string.Equals(RoomChoiceIdentity.FromTreasureRelic(relic, candidate.Index), command.Argument, StringComparison.Ordinal);
            })
            ?? throw new InvalidOperationException($"Treasure relic '{command.Argument}' was not found.");

        RuntimeInvoker.Invoke(collection, context.Reflection.TreasureRelicPickMethod, holder);
        return true;
    }

    private static ExportMenuItem BuildRelicItem(NTreasureRoomRelicHolder holder)
    {
        RelicModel relic = holder.Relic?.Model ?? throw new InvalidOperationException("Treasure relic holder had no relic model.");
        Node? relicNode = ReadNodeField<Node>(holder, "_relicNode");
        string label = ReadRenderedLabel(relicNode, holder)
            ?? AgentText.SafeText(relic.Title)
            ?? relic.GetType().Name;
        string? renderedDescription = ReadRenderedDescription(relicNode, holder, label);
        return new ExportMenuItem
        {
            Id = RoomChoiceIdentity.FromTreasureRelic(relic, holder.Index),
            Label = label,
            Description = renderedDescription ?? ModelTextResolver.ResolveRelicDescription(relic),
            Visible = true,
            Enabled = true,
            Selected = false
        };
    }

    private static TNode? ReadNodeField<TNode>(object instance, string fieldName) where TNode : class
    {
        FieldInfo? field = instance.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
        return field?.GetValue(instance) as TNode;
    }

    private static string? ReadRenderedLabel(Node? primaryNode, Node fallbackNode)
    {
        return ReadRenderedTexts(primaryNode, fallbackNode)
            .FirstOrDefault(static text => !LooksLikeCostText(text));
    }

    private static string? ReadRenderedDescription(Node? primaryNode, Node fallbackNode, string label)
    {
        return ReadRenderedTexts(primaryNode, fallbackNode)
            .FirstOrDefault(text =>
                !string.Equals(text, label, StringComparison.Ordinal)
                && !LooksLikeCostText(text));
    }

    private static IEnumerable<string> ReadRenderedTexts(Node? primaryNode, Node fallbackNode)
    {
        IEnumerable<string> primary = primaryNode is null
            ? []
            : NodeTextReader.ReadVisibleTexts(primaryNode, 6);
        IEnumerable<string> fallback = NodeTextReader.ReadVisibleTexts(fallbackNode, 8);
        return primary.Concat(fallback).Distinct(StringComparer.Ordinal);
    }

    private static bool LooksLikeCostText(string text)
    {
        string trimmed = text.Trim();
        return trimmed.All(static character => char.IsDigit(character))
            || trimmed.EndsWith(" gold", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("Cost:", StringComparison.OrdinalIgnoreCase);
    }
}
