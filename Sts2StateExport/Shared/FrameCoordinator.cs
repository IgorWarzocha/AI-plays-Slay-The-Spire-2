using Godot;

namespace Sts2StateExport;

// The coordinator is the only place that knows about the frame loop, command
// dedupe, and file persistence. Features stay focused on one game surface each.
public sealed class FrameCoordinator
{
    private readonly MegaCrit.Sts2.Core.Logging.Logger _logger;
    private readonly AgentIpcServer _ipcServer;
    private readonly Sts2Reflection _reflection;
    private readonly IReadOnlyList<IAgentFeature> _primaryFeatures;
    private readonly IReadOnlyList<IAgentOverlayFeature> _overlayFeatures;

    private ulong _lastTickMs;
    private string? _lastStateJson;
    private ExportState? _lastState;
    private string? _lastHandledCommandId;
    private ExportCommandAck? _lastAck;

    private FrameCoordinator(
        MegaCrit.Sts2.Core.Logging.Logger logger,
        AgentIpcServer ipcServer,
        Sts2Reflection reflection,
        IReadOnlyList<IAgentFeature> primaryFeatures,
        IReadOnlyList<IAgentOverlayFeature> overlayFeatures)
    {
        _logger = logger;
        _ipcServer = ipcServer;
        _reflection = reflection;
        _primaryFeatures = primaryFeatures.OrderBy(feature => feature.Order).ToList();
        _overlayFeatures = overlayFeatures.OrderBy(feature => feature.Order).ToList();
    }

    public static FrameCoordinator CreateDefault(MegaCrit.Sts2.Core.Logging.Logger logger)
    {
        AgentIpcServer ipcServer = new(logger);
        Sts2Reflection reflection = new();

        return new FrameCoordinator(
            logger,
            ipcServer,
            reflection,
            [
                new ProfileFeature(),
                new CustomRunFeature(),
                new CharacterSelectFeature(),
                new SingleplayerSubmenuFeature(),
                new RunHistoryFeature(),
                new CompendiumSubmenuFeature(),
                new DeckViewFeature(),
                new CardPileFeature(),
                new DeckCardSelectFeature(),
                new CardRewardFeature(),
                new EventFeature(),
                new MerchantInventoryFeature(),
                new MerchantRoomFeature(),
                new PauseMenuFeature(),
                new RestSiteFeature(),
                new TreasureRelicFeature(),
                new TreasureRoomFeature(),
                new MapFeature(),
                new CombatHandSelectFeature(),
                new CombatChoiceSelectFeature(),
                new CombatFeature(),
                new RewardsFeature(),
                new RunPresenceFeature(),
                new MainMenuFeature()
            ],
            [
                new TopBarOverlayFeature(),
                new RunPotionOverlayFeature()
            ]);
    }

    public void ValidateOrThrow()
    {
        _reflection.ValidateOrThrow();
    }

    public void WriteBootstrapState()
    {
        _ipcServer.Start();
        _lastState = new ExportState
        {
            Source = "initializer",
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            ScreenType = "booting",
            Notes = ["Frame hook installed."]
        };
        _lastStateJson = System.Text.Json.JsonSerializer.Serialize(_lastState, AgentJson.Options);
        _ipcServer.PublishSnapshot(_lastState, _lastAck);
    }

    public void Tick()
    {
        try
        {
            ulong now = Time.GetTicksMsec();
            if (now - _lastTickMs < 120)
            {
                return;
            }

            _lastTickMs = now;

            ExportState state = BuildState();
            HandleCommandIfNeeded();
            WriteStateIfChanged(state);
        }
        catch (Exception exception)
        {
            _logger.Error($"Frame coordinator failed: {exception}", 0);
        }
    }

    private ExportState BuildState()
    {
        SceneTree tree = (SceneTree)Engine.GetMainLoop();
        FeatureContext context = new(tree.Root, _reflection);
        ExportState state = new()
        {
            Source = "runtime_frame",
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            LastHandledCommandId = _lastHandledCommandId,
            LastCommandAck = _lastAck
        };

        foreach (IAgentFeature feature in _primaryFeatures)
        {
            if (feature.TryPopulate(context, state))
            {
                AugmentState(context, state);
                return state;
            }
        }

        state.ScreenType = "unknown";
        state.Notes =
        [
            "No supported screen is currently visible.",
            $"Visible node types: {string.Join(", ", SceneTraversal.ListVisibleTypeNames(tree.Root, 14))}"
        ];
        AugmentState(context, state);
        return state;
    }

    private void HandleCommandIfNeeded()
    {
        while (_ipcServer.TryDequeueCommand(out ExportCommand? rawCommand) && rawCommand is not null)
        {
            try
            {
                ParsedCommand command = CommandParser.Parse(rawCommand);
                if (command.Id == _lastHandledCommandId)
                {
                    continue;
                }

                SceneTree tree = (SceneTree)Engine.GetMainLoop();
                FeatureContext context = new(tree.Root, _reflection);

                foreach (IAgentFeature feature in _primaryFeatures)
                {
                    if (!feature.TryExecute(context, command))
                    {
                        continue;
                    }

                    _lastHandledCommandId = command.Id;

                    if (context.ScheduledTasks.Count == 0)
                    {
                        WriteCommandAck(command.Id, command.RawAction, "completed", null);
                        goto commandHandled;
                    }

                    WriteCommandAck(command.Id, command.RawAction, "pending", "Awaiting async completion.");
                    ObserveScheduledCommand(command, context.ScheduledTasks);
                    goto commandHandled;
                }

                foreach (IAgentOverlayFeature feature in _overlayFeatures)
                {
                    if (!feature.TryExecute(context, command))
                    {
                        continue;
                    }

                    _lastHandledCommandId = command.Id;

                    if (context.ScheduledTasks.Count == 0)
                    {
                        WriteCommandAck(command.Id, command.RawAction, "completed", null);
                        goto commandHandled;
                    }

                    WriteCommandAck(command.Id, command.RawAction, "pending", "Awaiting async completion.");
                    ObserveScheduledCommand(command, context.ScheduledTasks);
                    goto commandHandled;
                }

                throw new InvalidOperationException($"No feature handled command '{command.RawAction}'.");

            commandHandled:
                continue;
            }
            catch (Exception exception)
            {
                WriteCommandAck(rawCommand?.Id, rawCommand?.Action, "error", exception.Message);
                _logger.Error($"Command failed: {exception}", 0);
            }
        }
    }

    private void WriteStateIfChanged(ExportState state)
    {
        string json = System.Text.Json.JsonSerializer.Serialize(state, AgentJson.Options);
        _lastState = state;

        if (json == _lastStateJson)
        {
            return;
        }

        _lastStateJson = json;
        _ipcServer.PublishSnapshot(state, _lastAck);
    }

    private void ObserveScheduledCommand(ParsedCommand command, IReadOnlyList<ScheduledCommandTask> tasks)
    {
        _ = ObserveScheduledCommandAsync(command, tasks);
    }

    private async Task ObserveScheduledCommandAsync(ParsedCommand command, IReadOnlyList<ScheduledCommandTask> tasks)
    {
        try
        {
            await Task.WhenAll(tasks.Select(static task => task.Task));
            WriteCommandAck(command.Id, command.RawAction, "completed", null);
        }
        catch (Exception exception)
        {
            string actionList = string.Join(", ", tasks.Select(static task => task.ActionName));
            WriteCommandAck(command.Id, command.RawAction, "error", exception.Message);
            _logger.Error($"Async action '{actionList}' failed: {exception}", 0);
        }
    }

    private void WriteCommandAck(string? id, string? action, string status, string? message)
    {
        _lastAck = new ExportCommandAck
        {
            Id = id,
            Action = action,
            Status = status,
            Message = message,
            HandledAtUtc = DateTimeOffset.UtcNow
        };
        _ipcServer.PublishSnapshot(_lastState, _lastAck);
    }

    private void AugmentState(FeatureContext context, ExportState state)
    {
        foreach (IAgentOverlayFeature overlayFeature in _overlayFeatures)
        {
            overlayFeature.Augment(context, state);
        }
    }
}
