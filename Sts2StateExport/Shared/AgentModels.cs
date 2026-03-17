namespace Sts2StateExport;

// These transport models are intentionally runtime-agnostic so the JSON
// contract is easy to inspect, diff, and test without touching Godot nodes.
public sealed class ExportState
{
    public string? Source { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public string? ScreenType { get; set; }
    public List<ExportMenuItem> MenuItems { get; set; } = [];
    public List<ExportProfile> Profiles { get; set; } = [];
    public List<ExportCharacter> Characters { get; set; } = [];
    public CharacterSelectionState? CharacterSelection { get; set; }
    public string? EventTitle { get; set; }
    public string? EventDescription { get; set; }
    public List<string> Actions { get; set; } = [];
    public ExportTopBar? TopBar { get; set; }
    public List<ExportRelic> Relics { get; set; } = [];
    public List<ExportHeldPotion> Potions { get; set; } = [];
    public ExportMapState? Map { get; set; }
    public ExportCardBrowseState? CardBrowse { get; set; }
    public ExportCombatState? Combat { get; set; }
    public string[] Notes { get; set; } = [];
    public string? LastHandledCommandId { get; set; }
    public ExportCommandAck? LastCommandAck { get; set; }
}

public sealed class ExportMenuItem
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Visible { get; set; }
    public bool Enabled { get; set; }
    public bool Selected { get; set; }
}

public sealed class ExportProfile
{
    public int InternalId { get; set; }
    public int DisplayId { get; set; }
    public bool IsCurrent { get; set; }
}

public sealed class ExportCharacter
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
    public bool IsRandom { get; set; }
    public bool IsSelected { get; set; }
}

public sealed class CharacterSelectionState
{
    public string? Seed { get; set; }
    public string? Act1 { get; set; }
    public int Ascension { get; set; }
    public bool CanEmbark { get; set; }
}

public sealed class ExportCommand
{
    public string? Id { get; set; }
    public string? Action { get; set; }
    public string? Character { get; set; }
    public string? Seed { get; set; }
    public string? Act1 { get; set; }
}

public sealed class ExportCommandAck
{
    public string? Id { get; set; }
    public string? Action { get; set; }
    public string? Status { get; set; }
    public string? Message { get; set; }
    public DateTimeOffset HandledAtUtc { get; set; }
}

public sealed class ExportTopBar
{
    public bool Visible { get; set; }
    public int? CurrentHp { get; set; }
    public int? MaxHp { get; set; }
    public int? Gold { get; set; }
    public int? PotionSlotCount { get; set; }
    public int? FilledPotionSlotCount { get; set; }
    public int? EmptyPotionSlotCount { get; set; }
    public List<ExportTopBarButton> Buttons { get; set; } = [];
}

public sealed class ExportTopBarButton
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Visible { get; set; }
    public bool Enabled { get; set; }
    public bool Selected { get; set; }
    public List<string> Hotkeys { get; set; } = [];
}

public sealed class ExportRelic
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? Count { get; set; }
    public string? Status { get; set; }
}

public sealed class ExportHeldPotion
{
    public string Id { get; set; } = string.Empty;
    public int SlotIndex { get; set; }
    public bool HasPotion { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Usage { get; set; }
    public bool IsUsable { get; set; }
    public bool CanDiscard { get; set; }
}

public sealed class ExportMapState
{
    public bool Visible { get; set; }
    public bool TravelEnabled { get; set; }
    public bool Traveling { get; set; }
    public List<ExportMapPoint> Points { get; set; } = [];
}

public sealed class ExportMapPoint
{
    public string Id { get; set; } = string.Empty;
    public int Col { get; set; }
    public int Row { get; set; }
    public string Type { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public bool Travelable { get; set; }
    public bool CanModify { get; set; }
}

public sealed class ExportCardBrowseState
{
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? PileType { get; set; }
    public int CardCount { get; set; }
    public bool CanClose { get; set; }
    public List<ExportBrowseSort> Sorts { get; set; } = [];
    public List<ExportBrowseCard> Cards { get; set; } = [];
}

public sealed class ExportBrowseSort
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class ExportBrowseCard
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CostText { get; set; }
    public bool Upgraded { get; set; }
}

public sealed class ExportCombatState
{
    public int? RoundNumber { get; set; }
    public string? CurrentSide { get; set; }
    public int? Energy { get; set; }
    public int? DrawPileCount { get; set; }
    public int? DiscardPileCount { get; set; }
    public int? ExhaustPileCount { get; set; }
    public bool CanEndTurn { get; set; }
    public bool? HandIsSettled { get; set; }
    public int? ActiveHandCount { get; set; }
    public int? TotalHandCount { get; set; }
    public int? ModelHandCount { get; set; }
    public int? PendingHandHolderCount { get; set; }
    public bool? HandAnimationActive { get; set; }
    public bool? CardPlayInProgress { get; set; }
    public string? SelectionMode { get; set; }
    public string? SelectionPrompt { get; set; }
    public List<ExportCombatPotion> Potions { get; set; } = [];
    public List<ExportCombatCard> Hand { get; set; } = [];
    public List<ExportCombatCreature> Creatures { get; set; } = [];
}

public sealed class ExportCombatPotion
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TargetType { get; set; }
    public string? Usage { get; set; }
    public bool IsUsable { get; set; }
    public bool CanDiscard { get; set; }
    public List<string> ValidTargetIds { get; set; } = [];
}

public sealed class ExportCombatCard
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CostText { get; set; }
    public string? TargetType { get; set; }
    public bool IsPlayable { get; set; }
    public bool GlowsGold { get; set; }
    public bool GlowsRed { get; set; }
    public List<string> ValidTargetIds { get; set; } = [];
}

public sealed class ExportCombatCreature
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Side { get; set; } = string.Empty;
    public string? SlotName { get; set; }
    public int CurrentHp { get; set; }
    public int MaxHp { get; set; }
    public int Block { get; set; }
    public bool IsPlayer { get; set; }
    public bool IsEnemy { get; set; }
    public bool IsHittable { get; set; }
    public bool IsStunned { get; set; }
    public List<ExportCombatPower> Powers { get; set; } = [];
    public List<ExportCombatIntent> Intents { get; set; } = [];
}

public sealed class ExportCombatPower
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int? Amount { get; set; }
    public string? Description { get; set; }
}

public sealed class ExportCombatIntent
{
    public string Kind { get; set; } = string.Empty;
    public string? Label { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Summary { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public List<string> Targets { get; set; } = [];
}
