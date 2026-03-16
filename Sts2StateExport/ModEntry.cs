using Godot;
using MegaCrit.Sts2.Core.Modding;

namespace Sts2StateExport;

// The mod entry point stays deliberately tiny. All volatile game logic lives
// behind feature slices so startup errors are easier to localize and fix.
[ModInitializer(nameof(Initialize))]
public static class ModEntry
{
    public const string ModId = "Sts2StateExport";

    public static MegaCrit.Sts2.Core.Logging.Logger Logger { get; } =
        new(ModId, MegaCrit.Sts2.Core.Logging.LogType.Generic);

    private static FrameCoordinator? _coordinator;

    public static void Initialize()
    {
        try
        {
            if (Engine.GetMainLoop() is not SceneTree tree)
            {
                throw new InvalidOperationException("SceneTree is not available during mod initialization.");
            }

            _coordinator = FrameCoordinator.CreateDefault(Logger);
            _coordinator.ValidateOrThrow();
            _coordinator.WriteBootstrapState();
            tree.ProcessFrame += OnProcessFrame;
            Logger.Info("Sts2StateExport initialized.", 0);
        }
        catch (Exception exception)
        {
            Logger.Error($"Failed to initialize {ModId}: {exception}", 0);
            throw;
        }
    }

    private static void OnProcessFrame()
    {
        _coordinator?.Tick();
    }
}
