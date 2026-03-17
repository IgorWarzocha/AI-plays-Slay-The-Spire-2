using MegaCrit.Sts2.Core.Events;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Events;
using MegaCrit.Sts2.Core.Nodes.Events;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

public sealed class EventFeature : IAgentFeature
{
    public int Order => 450;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NEventRoom? eventRoom = NEventRoom.Instance;
        if (eventRoom is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        EventModel? eventModel = reflection.ReadField<EventModel>(eventRoom, reflection.EventField);
        List<ResolvedEventOption> options = ReadResolvedOptions(context, eventRoom);

        state.ScreenType = "event";
        state.EventTitle = AgentText.SafeText(eventModel?.Title);
        LocString? fallbackDescription = RuntimeInvoker.Invoke<LocString>(eventRoom, reflection.EventFallbackDescriptionMethod);
        state.EventDescription = AgentText.SafeText(eventModel?.Description)
            ?? AgentText.SafeText(fallbackDescription);
        state.MenuItems = options
            .Select(
                resolved => new ExportMenuItem
                {
                    Id = resolved.Id,
                    Label = resolved.Binding.Label,
                    Description = resolved.Binding.Description,
                    Visible = true,
                    Enabled = !resolved.Binding.Option.IsLocked,
                    Selected = resolved.Binding.Option.WasChosen
                })
            .ToList();
        state.Actions = state.MenuItems
            .Where(static item => item.Enabled)
            .Select(item => $"event.choose:{item.Id}")
            .ToList();

        NeowFeature.AppendNotes(eventModel, state);
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "event" || command.Verb != "choose" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        NEventRoom eventRoom = NEventRoom.Instance ?? throw new InvalidOperationException("No event room is active.");
        List<ResolvedEventOption> options = ReadResolvedOptions(context, eventRoom);
        if (options.Count == 0)
        {
            throw new InvalidOperationException("No visible event options were found.");
        }

        ResolvedEventOption? match = options.FirstOrDefault(option => string.Equals(option.Id, command.Argument, StringComparison.Ordinal));
        if (match is null)
        {
            string knownIds = string.Join(", ", options.Select(static option => option.Id));
            throw new InvalidOperationException($"Event option '{command.Argument}' was not found. Known ids: {knownIds}");
        }

        if (match.Binding.Option.IsLocked)
        {
            throw new InvalidOperationException($"Event option '{command.Argument}' is locked.");
        }

        eventRoom.OptionButtonClicked(match.Binding.Option, match.Binding.OptionIndex);
        return true;
    }

    private static List<ResolvedEventOption> ReadResolvedOptions(FeatureContext context, NEventRoom eventRoom)
    {
        return EventOptionIdentity.Resolve(ReadOptionBindings(context, eventRoom));
    }

    private static List<EventOptionButtonBinding> ReadOptionBindings(FeatureContext context, NEventRoom eventRoom)
    {
        EventModel? eventModel = context.Reflection.ReadField<EventModel>(eventRoom, context.Reflection.EventField);
        List<NEventOptionButton> buttons = SceneTraversal.FindAllVisible<NEventOptionButton>(eventRoom)
            .Where(static button => button.Option is not null)
            .ToList();
        List<NEventOptionButton> connectedOptions = context.Reflection.ReadField<List<NEventOptionButton>>(eventRoom, context.Reflection.ConnectedOptionsField)
            ?.Where(static button => button.Option is not null)
            .ToList()
            ?? [];

        if (connectedOptions.Count > 0)
        {
            return connectedOptions
                .Select(
                    (button, index) =>
                    {
                        NEventOptionButton textSource = buttons.FirstOrDefault(visible => ReferenceEquals(visible.Option, button.Option))
                            ?? button;
                        EventOption option = button.Option ?? throw new InvalidOperationException("Connected event option had no option model.");
                        List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(textSource);
                        string label = AgentText.SafeText(option.Title)
                            ?? option.TextKey
                            ?? visibleTexts.FirstOrDefault()
                            ?? $"Option {index + 1}";
                        string? description = EventOptionDetails.BuildDescription(
                            option,
                            AgentText.SafeText(option.Description)
                            ?? visibleTexts.FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal)));

                        return new EventOptionButtonBinding(index, option, label, description);
                    })
                .ToList();
        }

        if (buttons.Count > 0)
        {
            return buttons
                .Select(
                    (button, index) =>
                    {
                        EventOption option = button.Option ?? throw new InvalidOperationException("Visible event button had no option model.");
                        List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(button);
                        string label = AgentText.SafeText(option.Title)
                            ?? option.TextKey
                            ?? visibleTexts.FirstOrDefault()
                            ?? $"Option {index + 1}";
                        string? description = EventOptionDetails.BuildDescription(
                            option,
                            AgentText.SafeText(option.Description)
                            ?? visibleTexts.FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal)));

                        return new EventOptionButtonBinding(index, option, label, description);
                    })
                .ToList();
        }

        return ReadGeneratedAncientOptions(context, eventModel);
    }

    private static List<EventOptionButtonBinding> ReadGeneratedAncientOptions(FeatureContext context, EventModel? eventModel)
    {
        if (eventModel is not AncientEventModel ancient)
        {
            return [];
        }

        List<EventOption>? generatedOptions = context.Reflection.ReadProperty<List<EventOption>>(ancient, context.Reflection.AncientGeneratedOptionsProperty);
        if (generatedOptions is null || generatedOptions.Count == 0)
        {
            return [];
        }

        return generatedOptions
            .Select(
                (option, index) =>
                {
                    string label = AgentText.SafeText(option.Title)
                        ?? option.TextKey
                        ?? $"Option {index + 1}";
                    string? description = EventOptionDetails.BuildDescription(
                        option,
                        AgentText.SafeText(option.Description));

                    return new EventOptionButtonBinding(index, option, label, description);
                })
            .ToList();
    }
}
