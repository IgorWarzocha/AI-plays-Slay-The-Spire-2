using MegaCrit.Sts2.Core.Events;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Models;
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
        List<NEventOptionButton> buttons = ReadOptionButtons(context, eventRoom);

        state.ScreenType = "event";
        state.EventTitle = AgentText.SafeText(eventModel?.Title);
        LocString? fallbackDescription = RuntimeInvoker.Invoke<LocString>(eventRoom, reflection.EventFallbackDescriptionMethod);
        state.EventDescription = AgentText.SafeText(eventModel?.Description)
            ?? AgentText.SafeText(fallbackDescription);
        state.MenuItems = buttons
            .Select(
                (button, index) =>
                {
                    EventOption? option = button.Option;
                    List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(button);
                    string label = AgentText.SafeText(option?.Title)
                        ?? option?.TextKey
                        ?? visibleTexts.FirstOrDefault()
                        ?? $"Option {index + 1}";
                    string? description = visibleTexts
                        .Where(text => !string.Equals(text, label, StringComparison.Ordinal))
                        .FirstOrDefault();

                    return new ExportMenuItem
                    {
                        Id = index.ToString(),
                        Label = label,
                        Description = description,
                        Visible = true,
                        Enabled = option is not null && !option.IsLocked,
                        Selected = option?.WasChosen ?? false
                    };
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

        if (!int.TryParse(command.Argument, out int optionIndex))
        {
            throw new InvalidOperationException($"Event option '{command.Argument}' is not a valid integer.");
        }

        NEventRoom eventRoom = NEventRoom.Instance ?? throw new InvalidOperationException("No event room is active.");
        List<NEventOptionButton> buttons = ReadOptionButtons(context, eventRoom);
        if (buttons.Count == 0)
        {
            throw new InvalidOperationException("No visible event options were found.");
        }

        if (optionIndex < 0 || optionIndex >= buttons.Count)
        {
            throw new InvalidOperationException($"Event option {optionIndex} is out of range.");
        }

        EventOption? option = buttons[optionIndex].Option;
        if (option is null || option.IsLocked)
        {
            throw new InvalidOperationException($"Event option {optionIndex} is not selectable.");
        }

        eventRoom.OptionButtonClicked(option, optionIndex);
        return true;
    }

    private static List<NEventOptionButton> ReadOptionButtons(FeatureContext context, NEventRoom eventRoom)
    {
        List<NEventOptionButton> buttons = SceneTraversal.FindAllVisible<NEventOptionButton>(eventRoom)
            .Where(static button => button.Option is not null)
            .ToList();

        if (buttons.Count > 0)
        {
            return buttons;
        }

        return context.Reflection.ReadField<List<NEventOptionButton>>(eventRoom, context.Reflection.ConnectedOptionsField)
            ?? [];
    }
}
