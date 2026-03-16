using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;

namespace Sts2StateExport;

public sealed class SingleplayerSubmenuFeature : IAgentFeature
{
    public int Order => 400;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NSingleplayerSubmenu? submenu = SceneTraversal.FindFirstVisible<NSingleplayerSubmenu>(context.Root);
        if (submenu is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        state.ScreenType = "singleplayer_submenu";
        state.MenuItems = new List<ExportMenuItem>
        {
            BuildMenuItem(reflection, submenu, "standard", "Standard", reflection.SingleplayerStandardField),
            BuildMenuItem(reflection, submenu, "daily", "Daily", reflection.SingleplayerDailyField),
            BuildMenuItem(reflection, submenu, "custom", "Custom", reflection.SingleplayerCustomField)
        }.Where(static item => item.Visible).ToList();
        state.Actions = state.MenuItems.Select(static item => $"singleplayer.{item.Id}").ToList();
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "singleplayer")
        {
            return false;
        }

        NSingleplayerSubmenu submenu = context.RequireVisible<NSingleplayerSubmenu>();
        Sts2Reflection reflection = context.Reflection;

        switch (command.Verb)
        {
            case "standard":
                RuntimeInvoker.Invoke(submenu, reflection.SingleplayerOpenCharacterMethod, new object?[] { null });
                return true;
            case "daily":
                RuntimeInvoker.Invoke(submenu, reflection.SingleplayerOpenDailyMethod);
                return true;
            case "custom":
                RuntimeInvoker.Invoke(submenu, reflection.SingleplayerOpenCustomMethod, new object?[] { null });
                return true;
            default:
                throw new InvalidOperationException($"Unsupported singleplayer action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildMenuItem(
        Sts2Reflection reflection,
        NSingleplayerSubmenu submenu,
        string id,
        string label,
        System.Reflection.FieldInfo? fieldInfo)
    {
        NSubmenuButton? button = reflection.ReadField<NSubmenuButton>(submenu, fieldInfo);
        return new ExportMenuItem
        {
            Id = id,
            Label = label,
            Visible = button is not null && SceneTraversal.IsNodeVisible(button),
            Enabled = button is not null && SceneTraversal.IsNodeVisible(button),
            Selected = button is not null && SceneTraversal.HasFocus(button)
        };
    }
}
