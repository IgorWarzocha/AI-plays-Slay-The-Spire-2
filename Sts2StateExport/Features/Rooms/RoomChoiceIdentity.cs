using MegaCrit.Sts2.Core.Entities.RestSite;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

public static class RoomChoiceIdentity
{
    public static string FromRestSiteOption(RestSiteOption option)
    {
        string optionId = option.OptionId;
        return string.IsNullOrWhiteSpace(optionId)
            ? option.GetType().Name
            : optionId;
    }

    public static string FromTreasureRelic(RelicModel relic, int index)
    {
        return $"relic-{index}-{relic.GetType().Name}";
    }
}
