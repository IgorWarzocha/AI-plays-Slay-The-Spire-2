using MegaCrit.Sts2.Core.Models;
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
        state.ScreenType = "card_reward_selection";
        state.MenuItems = holders
            .Select(BuildCardRewardItem)
            .ToList();
        state.Actions =
        [
            .. state.MenuItems.Select(item => $"card_reward.select:{item.Id}")
        ];
        state.Notes = ["Card reward screen is active."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "card_reward" || command.Verb != "select" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        NCardRewardSelectionScreen screen = context.RequireVisible<NCardRewardSelectionScreen>();
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
}
