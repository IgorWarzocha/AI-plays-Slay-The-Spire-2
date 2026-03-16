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
    public ExportMapState? Map { get; set; }
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
