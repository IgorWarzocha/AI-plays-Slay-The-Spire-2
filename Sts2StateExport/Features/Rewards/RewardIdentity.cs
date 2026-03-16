using System.Runtime.CompilerServices;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Rewards;

namespace Sts2StateExport;

public static class RewardIdentity
{
    public static string FromReward(Reward reward)
    {
        string rewardType = ReadProperty(reward, "RewardType")?.ToString() ?? reward.GetType().Name;
        string rewardsSetIndex = ReadProperty(reward, "RewardsSetIndex")?.ToString() ?? "unknown";
        return $"reward-{rewardType}-{rewardsSetIndex}-{RuntimeHelpers.GetHashCode(reward):x}";
    }

    public static string FromCard(CardModel card)
    {
        return $"reward-card-{RuntimeHelpers.GetHashCode(card):x}";
    }

    private static object? ReadProperty(object instance, string propertyName)
    {
        return instance.GetType()
            .GetProperty(propertyName, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic)
            ?.GetValue(instance);
    }
}
