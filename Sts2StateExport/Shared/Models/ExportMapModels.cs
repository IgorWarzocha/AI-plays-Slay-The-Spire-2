namespace Sts2StateExport;

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
