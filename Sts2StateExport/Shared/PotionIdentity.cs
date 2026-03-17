using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Potions;

namespace Sts2StateExport;

internal static class PotionIdentity
{
    public static string FromHolder(NPotionHolder holder, int slotIndex)
    {
        PotionModel model = holder.Potion?.Model ?? throw new InvalidOperationException("Potion holder had no potion model.");
        string title = AgentText.SafeText(model.Title) ?? model.GetType().Name;
        string slug = title.Trim().ToLowerInvariant().Replace(' ', '-');
        return $"potion-{slotIndex + 1:D2}:{slug}";
    }
}
