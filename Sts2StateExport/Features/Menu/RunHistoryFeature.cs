using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Runs.History;

namespace Sts2StateExport;

public sealed class RunHistoryFeature : IAgentFeature
{
    public int Order => 406;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NRunHistory? screen = SceneTraversal.FindFirstVisible<NRunHistory>(context.Root);
        if (screen is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        RunHistory history = reflection.ReadField<RunHistory>(screen, reflection.RunHistoryHistoryField)
            ?? throw new InvalidOperationException("Run history data is unavailable.");
        List<string> runNames = reflection.ReadField<List<string>>(screen, reflection.RunHistoryRunNamesField) ?? [];
        int index = reflection.ReadField<int>(screen, reflection.RunHistoryIndexField);
        NRunHistoryPlayerIcon? selectedPlayerIcon = reflection.ReadField<NRunHistoryPlayerIcon>(screen, reflection.RunHistorySelectedPlayerIconField);
        RunHistoryPlayer? selectedPlayer = selectedPlayerIcon?.Player ?? history.Players.FirstOrDefault();

        state.ScreenType = "run_history";
        state.RunHistory = RunHistoryStateBuilder.Build(context, screen, history, runNames, index, selectedPlayer);
        state.MenuItems = RunHistoryNavigation.BuildMenuItems(index, runNames.Count);
        state.Actions =
        [
            .. state.MenuItems.Where(static item => item.Enabled).Select(item => $"run_history.{item.Id}")
        ];
        state.Notes = ["Run History screen is active."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "run_history")
        {
            return false;
        }

        NRunHistory screen = context.RequireVisible<NRunHistory>();
        Sts2Reflection reflection = context.Reflection;

        return command.Verb switch
        {
            "prev" => RunHistoryNavigation.GoPrevious(screen, reflection),
            "next" => RunHistoryNavigation.GoNext(screen, reflection),
            "back" => RunHistoryNavigation.GoBack(screen, reflection),
            _ => throw new InvalidOperationException($"Unsupported run history action '{command.RawAction}'.")
        };
    }
}
