namespace Sts2StateExport;

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
