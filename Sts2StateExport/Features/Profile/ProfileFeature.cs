using Godot;
using MegaCrit.Sts2.Core.Nodes.Screens.ProfileScreen;

namespace Sts2StateExport;

public sealed class ProfileFeature : IAgentFeature
{
    public int Order => 100;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NProfileScreen? screen = SceneTraversal.FindFirstVisible<NProfileScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        List<NProfileButton> buttons = reflection.ReadField<List<NProfileButton>>(screen, reflection.ProfileButtonsField) ?? [];

        state.ScreenType = "profile_screen";
        state.Profiles = buttons
            .Where(SceneTraversal.IsNodeVisible)
            .Select(
                button =>
                {
                    int internalId = reflection.ReadField<int>(button, reflection.ProfileIdField);
                    Control? indicator = reflection.ReadField<Control>(button, reflection.ProfileCurrentIndicatorField);

                    return new ExportProfile
                    {
                        InternalId = internalId,
                        DisplayId = internalId + 1,
                        IsCurrent = indicator?.Visible ?? false
                    };
                })
            .ToList();
        state.Actions = state.Profiles.Select(profile => $"profile.select:{profile.InternalId}").ToList();
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "profile" || command.Verb != "select" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        if (!int.TryParse(command.Argument, out int profileId))
        {
            throw new InvalidOperationException($"Profile argument '{command.Argument}' is not a valid integer.");
        }

        NProfileScreen screen = context.RequireVisible<NProfileScreen>();
        Sts2Reflection reflection = context.Reflection;
        NProfileButton button = (reflection.ReadField<List<NProfileButton>>(screen, reflection.ProfileButtonsField) ?? [])
            .FirstOrDefault(candidate => reflection.ReadField<int>(candidate, reflection.ProfileIdField) == profileId)
            ?? throw new InvalidOperationException($"Profile {profileId} is not available.");

        context.QueueTask(RuntimeInvoker.InvokeTask(button, reflection.ProfileSwitchMethod), command.RawAction);
        return true;
    }
}
