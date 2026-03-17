using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Entities.CardRewardAlternatives;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

namespace Sts2StateExport;

// Card-reward selection is distinct from generic deck modification and from
// the outer rewards screen, so it gets an explicit screen feature.
public sealed class CardRewardFeature : IAgentFeature
{
    public int Order => 440;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NCardRewardSelectionScreen? screen = SceneTraversal.FindFirstVisible<NCardRewardSelectionScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        List<NCardHolder> holders = SceneTraversal.FindAllVisible<NCardHolder>(screen);
        List<CardRewardAlternativeOption> alternatives = ReadAlternativeOptions(screen);
        List<ExportMenuItem> cardItems = holders.Select(BuildCardRewardItem).ToList();
        state.ScreenType = "card_reward_selection";
        state.MenuItems = cardItems
            .Concat(alternatives.Select(BuildAlternativeMenuItem))
            .ToList();
        state.Actions =
        [
            .. cardItems.Select(item => $"card_reward.select:{item.Id}"),
            .. alternatives.Select(option => $"card_reward.alternate:{option.Id}")
        ];
        if (alternatives.Any(static option => option.IsSkip))
        {
            state.Actions.Add("card_reward.skip");
        }
        state.Notes = ["Card reward screen is active."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "card_reward")
        {
            return false;
        }

        NCardRewardSelectionScreen screen = context.RequireVisible<NCardRewardSelectionScreen>();
        switch (command.Verb)
        {
            case "select":
            {
                if (string.IsNullOrWhiteSpace(command.Argument))
                {
                    throw new InvalidOperationException("Card reward selection requires a reward id.");
                }

                NCardHolder holder = SceneTraversal.FindAllVisible<NCardHolder>(screen)
                    .FirstOrDefault(candidate =>
                    {
                        CardModel? card = candidate.CardModel;
                        return card is not null
                            && string.Equals(RewardIdentity.FromCard(card), command.Argument, StringComparison.Ordinal);
                    })
                    ?? throw new InvalidOperationException($"Card reward '{command.Argument}' was not found.");

                RuntimeInvoker.Invoke(screen, context.Reflection.CardRewardSelectCardMethod, holder);
                return true;
            }
            case "alternate":
            {
                if (string.IsNullOrWhiteSpace(command.Argument))
                {
                    throw new InvalidOperationException("Card reward alternate action requires an option id.");
                }

                CardRewardAlternativeOption option = ReadAlternativeOptions(screen)
                    .FirstOrDefault(candidate => string.Equals(candidate.Id, command.Argument, StringComparison.Ordinal))
                    ?? throw new InvalidOperationException($"Card reward alternate option '{command.Argument}' was not found.");
                context.QueueTask(option.OnSelect(), command.RawAction);
                return true;
            }
            case "skip":
            {
                CardRewardAlternativeOption option = ReadAlternativeOptions(screen)
                    .FirstOrDefault(static candidate => candidate.IsSkip)
                    ?? throw new InvalidOperationException("This card reward screen cannot be skipped.");
                context.QueueTask(option.OnSelect(), command.RawAction);
                return true;
            }
            default:
                throw new InvalidOperationException($"Unsupported card reward action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildCardRewardItem(NCardHolder holder)
    {
        CardModel card = holder.CardModel ?? throw new InvalidOperationException("Card reward holder did not expose a card model.");
        string label = CardTextResolver.ResolveLabel(holder.CardNode, card);
        string? description = CardTextResolver.ResolveDescription(holder.CardNode, card, label);

        return new ExportMenuItem
        {
            Id = RewardIdentity.FromCard(card),
            Label = label,
            Description = description,
            Visible = true,
            Enabled = true,
            Selected = false
        };
    }

    private static ExportMenuItem BuildAlternativeMenuItem(CardRewardAlternativeOption option)
    {
        return new ExportMenuItem
        {
            Id = option.Id,
            Label = option.Label,
            Description = option.Hotkey is null ? null : $"Hotkey: {option.Hotkey}",
            Visible = true,
            Enabled = true,
            Selected = false
        };
    }

    private static List<CardRewardAlternativeOption> ReadAlternativeOptions(NCardRewardSelectionScreen screen)
    {
        // Reward screens surface Skip and similar branches through extra
        // options, not through the card holder row itself.
        return ReadExtraOptions(screen)
            .Select(
                alternative =>
                {
                    string optionId = string.IsNullOrWhiteSpace(alternative.OptionId)
                        ? "unknown"
                        : alternative.OptionId.Trim();
                    string label = AgentText.SafeText(alternative.Title) ?? optionId;
                    return new CardRewardAlternativeOption
                    {
                        Id = optionId,
                        Label = label,
                        Hotkey = string.IsNullOrWhiteSpace(alternative.Hotkey) ? null : alternative.Hotkey,
                        IsSkip = string.Equals(optionId, "skip", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(label, "Skip", StringComparison.OrdinalIgnoreCase),
                        OnSelect = alternative.OnSelect
                            ?? throw new InvalidOperationException($"Card reward alternate option '{optionId}' did not expose an OnSelect handler.")
                    };
                })
            .ToList();
    }

    private static IReadOnlyList<CardRewardAlternative> ReadExtraOptions(NCardRewardSelectionScreen screen)
    {
        System.Reflection.FieldInfo? field = screen.GetType().GetField(
            "_extraOptions",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
        return field?.GetValue(screen) as IReadOnlyList<CardRewardAlternative> ?? [];
    }

    private sealed class CardRewardAlternativeOption
    {
        public required string Id { get; init; }
        public required string Label { get; init; }
        public string? Hotkey { get; init; }
        public bool IsSkip { get; init; }
        public required Func<Task> OnSelect { get; init; }
    }
}
