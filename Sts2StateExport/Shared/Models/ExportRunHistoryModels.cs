namespace Sts2StateExport;

public sealed class ExportRunHistoryState
{
    public string? FileName { get; set; }
    public int SelectedIndex { get; set; }
    public int RunCount { get; set; }
    public bool CanGoPrevious { get; set; }
    public bool CanGoNext { get; set; }
    public string? CharacterId { get; set; }
    public int? Ascension { get; set; }
    public string? Seed { get; set; }
    public string? GameMode { get; set; }
    public string? BuildId { get; set; }
    public bool? Win { get; set; }
    public bool? WasAbandoned { get; set; }
    public string? KilledByEncounterId { get; set; }
    public string? KilledByEventId { get; set; }
    public double? RunTimeSeconds { get; set; }
    public long? StartTimeUnixSeconds { get; set; }
    public int? FloorReached { get; set; }
    public int? CurrentHp { get; set; }
    public int? MaxHp { get; set; }
    public int? CurrentGold { get; set; }
    public int? PotionSlotCount { get; set; }
    public List<ExportRunHistoryFloor> Floors { get; set; } = [];
    public List<ExportRunHistoryCard> Deck { get; set; } = [];
    public List<ExportRelic> Relics { get; set; } = [];
}

public sealed class ExportRunHistoryFloor
{
    public int Floor { get; set; }
    public string? MapPointType { get; set; }
    public int? CurrentHp { get; set; }
    public int? MaxHp { get; set; }
    public int? CurrentGold { get; set; }
    public int? DamageTaken { get; set; }
    public int? GoldGained { get; set; }
    public int? GoldLost { get; set; }
    public int? GoldSpent { get; set; }
    public int? GoldStolen { get; set; }
    public int? HpHealed { get; set; }
    public int? MaxHpGained { get; set; }
    public int? MaxHpLost { get; set; }
    public List<ExportRunHistoryRoom> Rooms { get; set; } = [];
    public List<ExportRunHistoryCard> CardsGained { get; set; } = [];
    public List<ExportRunHistoryCard> CardsRemoved { get; set; } = [];
    public List<ExportRunHistoryTransform> CardsTransformed { get; set; } = [];
    public List<string> UpgradedCards { get; set; } = [];
    public List<string> DowngradedCards { get; set; } = [];
    public List<string> BoughtRelics { get; set; } = [];
    public List<string> BoughtPotions { get; set; } = [];
    public List<string> CompletedQuests { get; set; } = [];
    public List<string> PotionUsed { get; set; } = [];
    public List<string> PotionDiscarded { get; set; } = [];
    public List<string> RestSiteChoices { get; set; } = [];
    public List<ExportRunHistoryChoice> CardChoices { get; set; } = [];
    public List<ExportRunHistoryChoice> RelicChoices { get; set; } = [];
    public List<ExportRunHistoryChoice> PotionChoices { get; set; } = [];
    public List<ExportRunHistoryChoice> AncientChoices { get; set; } = [];
    public List<string> EventChoices { get; set; } = [];
}

public sealed class ExportRunHistoryRoom
{
    public string? RoomType { get; set; }
    public string? ModelId { get; set; }
    public int? TurnsTaken { get; set; }
    public List<string> MonsterIds { get; set; } = [];
}

public sealed class ExportRunHistoryTransform
{
    public ExportRunHistoryCard? OriginalCard { get; set; }
    public ExportRunHistoryCard? FinalCard { get; set; }
}

public sealed class ExportRunHistoryChoice
{
    public string Label { get; set; } = string.Empty;
    public bool Picked { get; set; }
}

public sealed class ExportRunHistoryCard
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CostText { get; set; }
    public bool Upgraded { get; set; }
    public int Count { get; set; }
    public List<int> FloorsAdded { get; set; } = [];
}
