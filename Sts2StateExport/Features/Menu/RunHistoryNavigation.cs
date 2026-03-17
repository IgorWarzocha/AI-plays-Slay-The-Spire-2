using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;

namespace Sts2StateExport;

internal static class RunHistoryNavigation
{
    public static List<ExportMenuItem> BuildMenuItems(int index, int runCount)
    {
        return
        [
            new ExportMenuItem
            {
                Id = "prev",
                Label = "Previous Run",
                Visible = true,
                Enabled = index > 0,
                Selected = false
            },
            new ExportMenuItem
            {
                Id = "next",
                Label = "Next Run",
                Visible = true,
                Enabled = index < Math.Max(0, runCount - 1),
                Selected = false
            },
            new ExportMenuItem
            {
                Id = "back",
                Label = "Back",
                Visible = true,
                Enabled = true,
                Selected = false
            }
        ];
    }

    public static bool GoPrevious(NRunHistory screen, Sts2Reflection reflection)
    {
        RuntimeInvoker.Invoke(screen, reflection.RunHistoryPrevMethod, ResolveArrow(screen, reflection.RunHistoryPrevButtonField));
        return true;
    }

    public static bool GoNext(NRunHistory screen, Sts2Reflection reflection)
    {
        RuntimeInvoker.Invoke(screen, reflection.RunHistoryNextMethod, ResolveArrow(screen, reflection.RunHistoryNextButtonField));
        return true;
    }

    public static bool GoBack(NSubmenu submenu, Sts2Reflection reflection)
    {
        NSubmenuStack stack = reflection.ReadField<NSubmenuStack>(submenu, reflection.SubmenuStackField)
            ?? throw new InvalidOperationException("Submenu stack is unavailable.");
        RuntimeInvoker.Invoke(stack, reflection.SubmenuStackPopMethod);
        return true;
    }

    private static object ResolveArrow(NRunHistory screen, System.Reflection.FieldInfo? fieldInfo)
    {
        return fieldInfo?.GetValue(screen)
            ?? throw new InvalidOperationException("Run history arrow button is unavailable.");
    }
}
