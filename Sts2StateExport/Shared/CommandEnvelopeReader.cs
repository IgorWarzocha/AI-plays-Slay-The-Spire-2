using System.Text.Json;

namespace Sts2StateExport;

// Command file parsing is isolated so malformed JSON can be turned into one
// deterministic error ack instead of cascading into the frame loop.
public static class CommandEnvelopeReader
{
    public static CommandEnvelopeParseResult Parse(string commandJson)
    {
        try
        {
            ExportCommand? command = JsonSerializer.Deserialize<ExportCommand>(commandJson, AgentJson.Options);
            if (command is null)
            {
                return new CommandEnvelopeParseResult(
                    CommandEnvelopeParseStatus.InvalidPayload,
                    null,
                    "Command file did not contain a command object.");
            }

            return new CommandEnvelopeParseResult(CommandEnvelopeParseStatus.Ok, command, null);
        }
        catch (JsonException exception)
        {
            return new CommandEnvelopeParseResult(
                CommandEnvelopeParseStatus.InvalidJson,
                null,
                $"Command JSON is invalid: {exception.Message}");
        }
    }
}

public enum CommandEnvelopeParseStatus
{
    Ok,
    InvalidJson,
    InvalidPayload
}

public sealed class CommandEnvelopeParseResult(
    CommandEnvelopeParseStatus status,
    ExportCommand? command,
    string? errorMessage)
{
    public CommandEnvelopeParseStatus Status { get; } = status;
    public ExportCommand? Command { get; } = command;
    public string? ErrorMessage { get; } = errorMessage;
}
