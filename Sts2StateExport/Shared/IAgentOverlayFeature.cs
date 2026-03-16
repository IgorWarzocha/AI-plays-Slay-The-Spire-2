namespace Sts2StateExport;

// Overlay features enrich the exported state regardless of which primary
// screen is active. They own cross-cutting surfaces such as the top bar.
public interface IAgentOverlayFeature
{
    int Order { get; }
    void Augment(FeatureContext context, ExportState state);
    bool TryExecute(FeatureContext context, ParsedCommand command);
}
