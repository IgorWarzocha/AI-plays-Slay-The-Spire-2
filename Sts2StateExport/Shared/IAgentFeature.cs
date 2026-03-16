namespace Sts2StateExport;

// Primary features compete to define the current screen and its main action
// surface. Only one primary feature should win per frame.
public interface IAgentFeature
{
    int Order { get; }
    bool TryPopulate(FeatureContext context, ExportState state);
    bool TryExecute(FeatureContext context, ParsedCommand command);
}
