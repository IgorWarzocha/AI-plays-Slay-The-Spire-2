using System.Runtime.CompilerServices;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

// Hand cards can share the same title and cost, so combat commands use a
// process-stable object identity instead of a human label or slot index alone.
public static class CombatCardIdentity
{
    public static string FromCard(CardModel card)
    {
        return $"card-{RuntimeHelpers.GetHashCode(card):x}";
    }

    public static string FromCreature(MegaCrit.Sts2.Core.Entities.Creatures.Creature creature)
    {
        if (creature.CombatId.HasValue)
        {
            return $"creature-{creature.CombatId.Value}";
        }

        string fallback = !string.IsNullOrWhiteSpace(creature.SlotName)
            ? creature.SlotName
            : RuntimeHelpers.GetHashCode(creature).ToString("x");
        return $"creature-{fallback}";
    }
}
