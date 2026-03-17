using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Rewards;

namespace Sts2StateExport;

// Room rewards are their own surface because claiming rewards and proceeding is
// a separate state machine from combat and card-selection overlays.
public sealed class RewardsFeature : IAgentFeature
{
    public int Order => 445;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NRewardsScreen? screen = SceneTraversal.FindFirstVisible<NRewardsScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        List<NRewardButton> rewardButtons = SceneTraversal.FindAllVisible<NRewardButton>(screen);
        state.ScreenType = "rewards_screen";
        state.MenuItems = rewardButtons.Select(BuildRewardMenuItem).ToList();
        state.Actions =
        [
            .. state.MenuItems.Select(item => $"rewards.claim:{item.Id}")
        ];

        NProceedButton? proceedButton = context.Reflection.ReadField<NProceedButton>(screen, context.Reflection.RewardsProceedButtonField);
        if (proceedButton is not null && SceneTraversal.IsNodeVisible(proceedButton))
        {
            state.Actions.Add("rewards.proceed");
        }

        state.Notes =
        [
            $"Rewards visible: {rewardButtons.Count}.",
            "Claim rewards individually, then proceed when the screen enables it."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "rewards")
        {
            return false;
        }

        NRewardsScreen screen = context.RequireVisible<NRewardsScreen>();

        switch (command.Verb)
        {
            case "claim":
                if (string.IsNullOrWhiteSpace(command.Argument))
                {
                    throw new InvalidOperationException("Reward claim requires a reward id.");
                }

                NRewardButton button = SceneTraversal.FindAllVisible<NRewardButton>(screen)
                    .FirstOrDefault(candidate =>
                    {
                        Reward? reward = candidate.Reward;
                        return reward is not null
                            && string.Equals(RewardIdentity.FromReward(reward), command.Argument, StringComparison.Ordinal);
                    })
                    ?? throw new InvalidOperationException($"Reward '{command.Argument}' was not found.");
                RuntimeInvoker.Invoke(button, context.Reflection.RewardButtonOnReleaseMethod);
                return true;
            case "proceed":
                NProceedButton proceedButton = context.Reflection.ReadField<NProceedButton>(screen, context.Reflection.RewardsProceedButtonField)
                    ?? throw new InvalidOperationException("Rewards proceed button is unavailable.");
                RuntimeInvoker.Invoke(screen, context.Reflection.RewardsOnProceedButtonPressedMethod, proceedButton);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported rewards action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildRewardMenuItem(NRewardButton button)
    {
        Reward reward = button.Reward ?? throw new InvalidOperationException("Reward button did not expose a reward model.");
        List<string> visibleTexts = NodeTextReader.ReadVisibleTexts(button);
        string label = visibleTexts.FirstOrDefault()
            ?? ReadRewardProperty(reward, "RewardType")?.ToString()
            ?? reward.GetType().Name;
        string? description = AgentText.SafeText(reward.Description)
            ?? visibleTexts.FirstOrDefault(text => !string.Equals(text, label, StringComparison.Ordinal));

        return new ExportMenuItem
        {
            Id = RewardIdentity.FromReward(reward),
            Label = label,
            Description = description,
            Visible = true,
            Enabled = true,
            Selected = false
        };
    }

    private static object? ReadRewardProperty(Reward reward, string propertyName)
    {
        return reward.GetType()
            .GetProperty(propertyName, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic)
            ?.GetValue(reward);
    }
}
