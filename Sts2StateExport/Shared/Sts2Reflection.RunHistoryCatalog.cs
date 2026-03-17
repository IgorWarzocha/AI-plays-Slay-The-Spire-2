using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;

namespace Sts2StateExport;

public sealed partial class Sts2Reflection
{
    public FieldInfo? RunHistoryPrevButtonField { get; } = GetField<NRunHistory>("_prevButton");
    public FieldInfo? RunHistoryNextButtonField { get; } = GetField<NRunHistory>("_nextButton");
    public FieldInfo? RunHistoryHistoryField { get; } = GetField<NRunHistory>("_history");
    public FieldInfo? RunHistoryIndexField { get; } = GetField<NRunHistory>("_index");
    public FieldInfo? RunHistoryRunNamesField { get; } = GetField<NRunHistory>("_runNames");
    public FieldInfo? RunHistorySelectedPlayerIconField { get; } = GetField<NRunHistory>("_selectedPlayerIcon");
    public FieldInfo? RunHistoryDeckHistoryField { get; } = GetField<NRunHistory>("_deckHistory");
    public FieldInfo? RunHistoryRelicHistoryField { get; } = GetField<NRunHistory>("_relicHistory");
    public FieldInfo? DeckHistoryEntryAmountField { get; } = GetField<NDeckHistoryEntry>("_amount");
    public FieldInfo? RelicBasicHolderModelField { get; } = GetField<NRelicBasicHolder>("_model");

    public MethodInfo? RunHistoryPrevMethod { get; } = GetMethod<NRunHistory>("OnLeftButtonButtonReleased", 1);
    public MethodInfo? RunHistoryNextMethod { get; } = GetMethod<NRunHistory>("OnRightButtonButtonReleased", 1);

    private void ValidateRunHistoryCatalog()
    {
        RequireField(RunHistoryPrevButtonField, nameof(RunHistoryPrevButtonField));
        RequireField(RunHistoryNextButtonField, nameof(RunHistoryNextButtonField));
        RequireField(RunHistoryHistoryField, nameof(RunHistoryHistoryField));
        RequireField(RunHistoryIndexField, nameof(RunHistoryIndexField));
        RequireField(RunHistoryRunNamesField, nameof(RunHistoryRunNamesField));
        RequireField(RunHistorySelectedPlayerIconField, nameof(RunHistorySelectedPlayerIconField));
        RequireField(RunHistoryDeckHistoryField, nameof(RunHistoryDeckHistoryField));
        RequireField(RunHistoryRelicHistoryField, nameof(RunHistoryRelicHistoryField));
        RequireField(DeckHistoryEntryAmountField, nameof(DeckHistoryEntryAmountField));
        RequireField(RelicBasicHolderModelField, nameof(RelicBasicHolderModelField));

        RequireMethod(RunHistoryPrevMethod, nameof(RunHistoryPrevMethod));
        RequireMethod(RunHistoryNextMethod, nameof(RunHistoryNextMethod));
    }
}
