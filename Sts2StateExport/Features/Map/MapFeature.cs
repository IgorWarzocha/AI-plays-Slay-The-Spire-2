using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace Sts2StateExport;

// Map navigation is its own primary surface because it owns the currently
// available pathing actions for the run.
public sealed class MapFeature : IAgentFeature
{
    public int Order => 430;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NMapScreen? screen = SceneTraversal.FindFirstVisible<NMapScreen>(context.Root);
        if (screen is null || !screen.IsOpen)
        {
            return false;
        }

        List<ExportMapPoint> points = SceneTraversal.FindAllVisible<NMapPoint>(screen)
            .Select(point => BuildPoint(context, point))
            .OrderBy(point => point.Row)
            .ThenBy(point => point.Col)
            .ToList();

        state.ScreenType = "map_screen";
        state.Map = new ExportMapState
        {
            Visible = true,
            TravelEnabled = screen.IsTravelEnabled,
            Traveling = screen.IsTraveling,
            Points = points
        };
        state.MenuItems = points
            .Where(static point => point.Travelable)
            .Select(
                point => new ExportMenuItem
                {
                    Id = point.Id,
                    Label = $"{point.Type} ({point.Col},{point.Row})",
                    Description = point.CanModify ? "Node can modify future map generation." : null,
                    Visible = true,
                    Enabled = true,
                    Selected = false
                })
            .ToList();
        state.Actions =
        [
            .. state.MenuItems.Select(item => $"map.travel:{item.Id}")
        ];
        state.Notes =
        [
            "Map screen is open.",
            "Travel commands target explicit map coordinates."
        ];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "map" || command.Verb != "travel" || string.IsNullOrWhiteSpace(command.Argument))
        {
            return false;
        }

        NMapScreen screen = context.RequireVisible<NMapScreen>();
        if (!screen.IsOpen)
        {
            throw new InvalidOperationException("Map screen is not open.");
        }

        if (!screen.IsTravelEnabled || screen.IsTraveling)
        {
            throw new InvalidOperationException("Map travel is not currently available.");
        }

        MapCoord coord = ParseCoord(command.Argument);
        ExportMapPoint? point = SceneTraversal.FindAllVisible<NMapPoint>(screen)
            .Select(node => BuildPoint(context, node))
            .FirstOrDefault(point => point.Col == coord.col && point.Row == coord.row);
        if (point is null)
        {
            throw new InvalidOperationException($"Map point '{command.Argument}' is not visible.");
        }

        if (!point.Travelable)
        {
            throw new InvalidOperationException($"Map point '{command.Argument}' is not travelable.");
        }

        context.QueueTask(RuntimeInvoker.InvokeTask(screen, context.Reflection.MapTravelToCoordMethod, coord), command.RawAction);
        return true;
    }

    private static ExportMapPoint BuildPoint(FeatureContext context, NMapPoint point)
    {
        MapPoint model = point.Point;
        return new ExportMapPoint
        {
            Id = $"{model.coord.col},{model.coord.row}",
            Col = model.coord.col,
            Row = model.coord.row,
            Type = model.PointType.ToString(),
            State = point.State.ToString(),
            Travelable = context.Reflection.ReadProperty<bool>(point, context.Reflection.MapPointIsTravelableProperty),
            CanModify = model.CanBeModified
        };
    }

    private static MapCoord ParseCoord(string raw)
    {
        string[] parts = raw.Split(',', 2, StringSplitOptions.TrimEntries);
        if (parts.Length != 2
            || !int.TryParse(parts[0], out int col)
            || !int.TryParse(parts[1], out int row))
        {
            throw new InvalidOperationException($"Map coordinate '{raw}' must be in 'col,row' form.");
        }

        return new MapCoord { col = col, row = row };
    }
}
