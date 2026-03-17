namespace Sts2StateExport;

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
