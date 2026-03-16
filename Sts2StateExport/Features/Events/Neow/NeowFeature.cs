using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

// Neow is called out explicitly because it is the first transient screen we
// care about, and it will likely grow specialized handling beyond generic
// event choice export.
public static class NeowFeature
{
    public static void AppendNotes(EventModel? eventModel, ExportState state)
    {
        if (eventModel?.GetType().Name != "AncientEventModel")
        {
            return;
        }

        state.Notes =
        [
            ..state.Notes,
            "Ancient event active.",
            "This is the Neow-style opening choice surface."
        ];
    }
}
