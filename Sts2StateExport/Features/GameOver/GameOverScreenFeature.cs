using MegaCrit.Sts2.Core.Nodes.Screens.GameOverScreen;

namespace Sts2StateExport;

// Game-over handling must sit above combat so a lethal turn cannot leave the
// exporter trapped on a stale combat surface with HP already at zero.
public sealed class GameOverScreenFeature : IAgentFeature
{
    public int Order => 430;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NGameOverScreen? screen = SceneTraversal.FindFirstVisible<NGameOverScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        NGameOverContinueButton? continueButton = context.Reflection.ReadField<NGameOverContinueButton>(
            screen,
            context.Reflection.GameOverContinueButtonField);
        NReturnToMainMenuButton? mainMenuButton = context.Reflection.ReadField<NReturnToMainMenuButton>(
            screen,
            context.Reflection.GameOverMainMenuButtonField);

        state.ScreenType = "game_over_screen";
        state.MenuItems =
        [
            BuildMenuItem("continue", "Continue", "Advance from the defeat screen.", continueButton),
            BuildMenuItem("main_menu", "Main Menu", "Return to the main menu.", mainMenuButton)
        ];
        state.Actions = state.MenuItems
            .Where(static item => item.Visible && item.Enabled)
            .Select(item => $"game_over.{item.Id}")
            .ToList();
        state.Notes =
        [
            "Game over screen is active.",
            "Use this surface instead of treating lethal as a stalled combat room."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "game_over")
        {
            return false;
        }

        NGameOverScreen screen = context.RequireVisible<NGameOverScreen>();

        switch (command.Verb)
        {
            case "continue":
                NGameOverContinueButton continueButton = context.Reflection.ReadField<NGameOverContinueButton>(
                        screen,
                        context.Reflection.GameOverContinueButtonField)
                    ?? throw new InvalidOperationException("Game over continue button is unavailable.");
                RuntimeInvoker.Invoke(continueButton, context.Reflection.GameOverContinuePressMethod);
                return true;
            case "main_menu":
                NReturnToMainMenuButton mainMenuButton = context.Reflection.ReadField<NReturnToMainMenuButton>(
                        screen,
                        context.Reflection.GameOverMainMenuButtonField)
                    ?? throw new InvalidOperationException("Game over main menu button is unavailable.");
                RuntimeInvoker.Invoke(mainMenuButton, context.Reflection.GameOverMainMenuPressMethod);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported game over action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildMenuItem(string id, string label, string description, Godot.Control? button)
    {
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
}
