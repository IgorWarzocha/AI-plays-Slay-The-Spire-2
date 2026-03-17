namespace Sts2StateExport;

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
    public ExportCombatCardState? Affliction { get; set; }
    public ExportCombatCardState? Enchantment { get; set; }
    public ExportCombatCardUnplayable? Unplayable { get; set; }
    public List<string> ValidTargetIds { get; set; } = [];
}

public sealed class ExportCombatCardState
{
    public string Kind { get; set; } = string.Empty;
    public string? TypeName { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? ExtraCardText { get; set; }
    public int? Amount { get; set; }
    public string? Status { get; set; }
    public string? OverlayPath { get; set; }
    public bool? GlowsGold { get; set; }
    public bool? GlowsRed { get; set; }
}

public sealed class ExportCombatCardUnplayable
{
    public string? Reason { get; set; }
    public string? PreventerType { get; set; }
    public string? PreventerTitle { get; set; }
    public string? PreventerDescription { get; set; }
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
