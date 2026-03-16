using System.Runtime.CompilerServices;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

// Browse screens do not act on individual cards yet, but stable ids still make
// the exported JSON easier to diff and reason about.
public static class CardBrowseIdentity
{
    public static string FromCard(CardModel card)
    {
        return $"browse-card-{RuntimeHelpers.GetHashCode(card):x}";
    }
}
