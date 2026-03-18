namespace Sts2StateExport;

public sealed class AgentIpcRequest
{
    public string? Type { get; set; }
    public ExportCommand? Command { get; set; }
}

public sealed class AgentIpcResponse
{
    public string Type { get; set; } = string.Empty;
    public ExportState? State { get; set; }
    public ExportCommandAck? Ack { get; set; }
    public string? Message { get; set; }
}

public static class AgentIpcRequestParser
{
    public static AgentIpcRequestParseResult Parse(string requestJson)
    {
        try
        {
            AgentIpcRequest? request = System.Text.Json.JsonSerializer.Deserialize<AgentIpcRequest>(requestJson, AgentJson.Options);
            if (request is null)
            {
                return new AgentIpcRequestParseResult(
                    AgentIpcRequestParseStatus.InvalidPayload,
                    null,
                    "IPC request did not contain an object payload.");
            }

            if (!string.Equals(request.Type, "command", StringComparison.OrdinalIgnoreCase))
            {
                return new AgentIpcRequestParseResult(
                    AgentIpcRequestParseStatus.UnsupportedType,
                    null,
                    $"Unsupported IPC request type '{request.Type ?? "<null>"}'.");
            }

            if (request.Command is null)
            {
                return new AgentIpcRequestParseResult(
                    AgentIpcRequestParseStatus.InvalidPayload,
                    null,
                    "IPC command request did not include a command payload.");
            }

            return new AgentIpcRequestParseResult(AgentIpcRequestParseStatus.Ok, request.Command, null);
        }
        catch (System.Text.Json.JsonException exception)
        {
            return new AgentIpcRequestParseResult(
                AgentIpcRequestParseStatus.InvalidJson,
                null,
                $"IPC request JSON is invalid: {exception.Message}");
        }
    }
}

public enum AgentIpcRequestParseStatus
{
    Ok,
    InvalidJson,
    InvalidPayload,
    UnsupportedType
}

public sealed class AgentIpcRequestParseResult(
    AgentIpcRequestParseStatus status,
    ExportCommand? command,
    string? errorMessage)
{
    public AgentIpcRequestParseStatus Status { get; } = status;
    public ExportCommand? Command { get; } = command;
    public string? ErrorMessage { get; } = errorMessage;
}
