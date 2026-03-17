using Godot;
using MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu;

namespace Sts2StateExport;

// Pause is its own screen surface so recovery and reload flows can be driven
// explicitly instead of inferring menu state from top-bar toggles.
public sealed class PauseMenuFeature : IAgentFeature
{
    public int Order => 448;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NPauseMenu? menu = SceneTraversal.FindFirstVisible<NPauseMenu>(context.Root);
        if (menu is null)
        {
            return false;
        }

        state.ScreenType = "pause_menu";
        state.MenuItems = new List<ExportMenuItem>
        {
            BuildMenuItem(context, menu, "resume", "Resume", "Close the pause menu and return to the run."),
            BuildMenuItem(context, menu, "save_and_quit", "Save and Quit", "Save the run and return to the main menu."),
            BuildMenuItem(context, menu, "settings", "Settings", "Open settings from the pause menu."),
            BuildMenuItem(context, menu, "compendium", "Compendium", "Open the compendium from the pause menu."),
            BuildMenuItem(context, menu, "give_up", "Give Up", "Abandon the current run.")
        }.Where(static item => item.Visible).ToList();
        state.Actions = state.MenuItems
            .Where(static item => item.Enabled)
            .Select(item => $"pause_menu.{item.Id}")
            .ToList();
        state.Notes =
        [
            "Pause menu is active.",
            "Use this surface for save-and-quit reloads instead of synthetic keyboard input."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "pause_menu")
        {
            return false;
        }

        NPauseMenu menu = context.RequireVisible<NPauseMenu>();
        Sts2Reflection reflection = context.Reflection;

        switch (command.Verb)
        {
            case "resume":
                RuntimeInvoker.Invoke(
                    menu,
                    reflection.PauseMenuResumeMethod,
                    ResolveButton(menu, reflection.PauseMenuResumeButtonField, "Resume"));
                return true;
            case "save_and_quit":
                RuntimeInvoker.Invoke(
                    menu,
                    reflection.PauseMenuSaveAndQuitMethod,
                    ResolveButton(menu, reflection.PauseMenuSaveAndQuitButtonField, "Save and Quit"));
                return true;
            case "settings":
                RuntimeInvoker.Invoke(
                    menu,
                    reflection.PauseMenuSettingsMethod,
                    ResolveButton(menu, reflection.PauseMenuSettingsButtonField, "Settings"));
                return true;
            case "compendium":
                RuntimeInvoker.Invoke(
                    menu,
                    reflection.PauseMenuCompendiumMethod,
                    ResolveButton(menu, reflection.PauseMenuCompendiumButtonField, "Compendium"));
                return true;
            case "give_up":
                RuntimeInvoker.Invoke(
                    menu,
                    reflection.PauseMenuGiveUpMethod,
                    ResolveButton(menu, reflection.PauseMenuGiveUpButtonField, "Give Up"));
                return true;
            default:
                throw new InvalidOperationException($"Unsupported pause menu action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildMenuItem(
        FeatureContext context,
        NPauseMenu menu,
        string id,
        string label,
        string description)
    {
        Control? button = id switch
        {
            "resume" => context.Reflection.ReadField<Control>(menu, context.Reflection.PauseMenuResumeButtonField),
            "save_and_quit" => context.Reflection.ReadField<Control>(menu, context.Reflection.PauseMenuSaveAndQuitButtonField),
            "settings" => context.Reflection.ReadField<Control>(menu, context.Reflection.PauseMenuSettingsButtonField),
            "compendium" => context.Reflection.ReadField<Control>(menu, context.Reflection.PauseMenuCompendiumButtonField),
            "give_up" => context.Reflection.ReadField<Control>(menu, context.Reflection.PauseMenuGiveUpButtonField),
            _ => null,
        };

        bool visible = button is not null && SceneTraversal.IsNodeVisible(button);
        return new ExportMenuItem
        {
            Id = id,
            Label = label,
            Description = description,
            Visible = visible,
            Enabled = visible,
            Selected = button is not null && SceneTraversal.HasFocus(button)
        };
    }

    private static object[] ResolveButton(NPauseMenu menu, System.Reflection.FieldInfo? field, string label)
    {
        NPauseMenuButton button = field?.GetValue(menu) as NPauseMenuButton
            ?? throw new InvalidOperationException($"{label} button is unavailable.");
        return [button];
    }
}
