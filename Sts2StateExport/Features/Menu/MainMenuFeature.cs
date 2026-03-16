using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;

namespace Sts2StateExport;

// Main menu handling stays here so top-level navigation changes do not leak
// into profile/run-start/event code.
public sealed class MainMenuFeature : IAgentFeature
{
    public int Order => 500;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NMainMenu? menu = SceneTraversal.FindFirstVisible<NMainMenu>(context.Root);
        if (menu is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        NMainMenuTextButton? lastHitButton = reflection.ReadField<NMainMenuTextButton>(menu, reflection.MainMenuLastHitField);

        state.ScreenType = "main_menu";
        state.MenuItems = new List<ExportMenuItem>
        {
            BuildMenuItem(context, menu, "continue", "Continue", reflection.MainMenuContinueField, lastHitButton),
            BuildMenuItem(context, menu, "singleplayer", "Singleplayer", reflection.MainMenuSingleplayerField, lastHitButton),
            BuildMenuItem(context, menu, "multiplayer", "Multiplayer", reflection.MainMenuMultiplayerField, lastHitButton),
            BuildMenuItem(context, menu, "timeline", "Timeline", reflection.MainMenuTimelineField, lastHitButton),
            BuildMenuItem(context, menu, "settings", "Settings", reflection.MainMenuSettingsField, lastHitButton),
            BuildMenuItem(context, menu, "compendium", "Compendium", reflection.MainMenuCompendiumField, lastHitButton),
        }.Where(static item => item.Visible).ToList();

        state.Actions =
        [
            .. state.MenuItems.Select(static item => $"main_menu.{item.Id}"),
            "main_menu.profile"
        ];
        state.Notes = ["Drive the main menu through exported actions rather than synthetic input."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "main_menu")
        {
            return false;
        }

        NMainMenu menu = context.RequireVisible<NMainMenu>();
        Sts2Reflection reflection = context.Reflection;

        switch (command.Verb)
        {
            case "continue":
                context.QueueTask(RuntimeInvoker.InvokeTask(menu, reflection.MainMenuContinueMethod), command.RawAction);
                return true;
            case "singleplayer":
                menu.OpenSingleplayerSubmenu();
                return true;
            case "multiplayer":
                menu.OpenMultiplayerSubmenu();
                return true;
            case "timeline":
                RuntimeInvoker.Invoke(menu, reflection.MainMenuTimelineMethod, new object?[] { null });
                return true;
            case "settings":
                menu.OpenSettingsMenu();
                return true;
            case "compendium":
                RuntimeInvoker.Invoke(menu, reflection.MainMenuCompendiumMethod, new object?[] { null });
                return true;
            case "profile":
                menu.OpenProfileScreen();
                return true;
            default:
                throw new InvalidOperationException($"Unsupported main menu action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildMenuItem(
        FeatureContext context,
        NMainMenu menu,
        string id,
        string label,
        System.Reflection.FieldInfo? fieldInfo,
        NMainMenuTextButton? lastHitButton)
    {
        NMainMenuTextButton? button = context.Reflection.ReadField<NMainMenuTextButton>(menu, fieldInfo);
        return new ExportMenuItem
        {
            Id = id,
            Label = label,
            Visible = button is not null && SceneTraversal.IsNodeVisible(button),
            Enabled = button is not null && SceneTraversal.IsNodeVisible(button),
            Selected = button is not null && (ReferenceEquals(button, lastHitButton) || SceneTraversal.HasFocus(button))
        };
    }
}
