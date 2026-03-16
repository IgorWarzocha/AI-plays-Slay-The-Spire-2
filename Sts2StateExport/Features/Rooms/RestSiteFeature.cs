using MegaCrit.Sts2.Core.Entities.RestSite;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.RestSite;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

// Rest sites are a distinct room state with explicit option buttons and a
// room-owned proceed action after the choice resolves.
public sealed class RestSiteFeature : IAgentFeature
{
    public int Order => 452;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NRestSiteRoom? room = SceneTraversal.FindFirstVisible<NRestSiteRoom>(context.Root);
        if (room is null)
        {
            return false;
        }

        List<NRestSiteButton> buttons = SceneTraversal.FindAllVisible<NRestSiteButton>(room)
            .Where(static button => button.Option is not null)
            .ToList();
        state.ScreenType = "rest_site";
        state.MenuItems = buttons
            .Select(BuildOptionItem)
            .ToList();
        state.Actions = state.MenuItems
            .Where(static item => item.Enabled)
            .Select(item => $"rest_site.choose:{item.Id}")
            .ToList();

        if (room.ProceedButton is not null && SceneTraversal.IsNodeVisible(room.ProceedButton))
        {
            state.Actions.Add("rest_site.proceed");
        }

        state.Notes =
        [
            "Rest site room is active.",
            "Selecting an option may open a card-selection overlay."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "rest_site")
        {
            return false;
        }

        NRestSiteRoom room = context.RequireVisible<NRestSiteRoom>();
        switch (command.Verb)
        {
            case "choose":
                ExecuteOption(room, context, command.Argument);
                return true;
            case "proceed":
                NProceedButton proceedButton = room.ProceedButton
                    ?? throw new InvalidOperationException("Rest-site proceed button is unavailable.");
                RuntimeInvoker.Invoke(room, context.Reflection.RestSiteProceedMethod, proceedButton);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported rest-site action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildOptionItem(NRestSiteButton button)
    {
        RestSiteOption option = button.Option ?? throw new InvalidOperationException("Rest-site button had no option.");
        string label = AgentText.SafeText(option.Title)
            ?? NodeTextReader.ReadVisibleTexts(button, 3).FirstOrDefault()
            ?? option.GetType().Name;
        string? description = AgentText.SafeText(option.Description)
            ?? NodeTextReader.ReadVisibleTexts(button, 5).FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));

        return new ExportMenuItem
        {
            Id = RoomChoiceIdentity.FromRestSiteOption(option),
            Label = label,
            Description = description,
            Visible = true,
            Enabled = option.IsEnabled,
            Selected = false
        };
    }

    private static void ExecuteOption(NRestSiteRoom room, FeatureContext context, string? argument)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Rest-site selection requires an option id.");
        }

        NRestSiteButton button = SceneTraversal.FindAllVisible<NRestSiteButton>(room)
            .FirstOrDefault(candidate =>
            {
                RestSiteOption? option = candidate.Option;
                return option is not null
                    && string.Equals(RoomChoiceIdentity.FromRestSiteOption(option), argument, StringComparison.Ordinal);
            })
            ?? throw new InvalidOperationException($"Rest-site option '{argument}' was not found.");

        if (button.Option?.IsEnabled != true)
        {
            throw new InvalidOperationException($"Rest-site option '{argument}' is disabled.");
        }

        RuntimeInvoker.Invoke(button, context.Reflection.RestSiteButtonOnReleaseMethod);
    }
}
