namespace Sts2StateExport;

public sealed class ParsedCommand
{
    public required string Id { get; init; }
    public required string RawAction { get; init; }
    public required string Scope { get; init; }
    public required string Verb { get; init; }
    public string? Argument { get; init; }
    public string? Character { get; init; }
    public string? Seed { get; init; }
    public string? Act1 { get; init; }
}

// Parsing is kept separate from execution so runtime features only handle
// validated command shapes instead of re-checking string formatting.
public static class CommandParser
{
    public static ParsedCommand Parse(ExportCommand command)
    {
        string id = !string.IsNullOrWhiteSpace(command.Id)
            ? command.Id
            : throw new InvalidOperationException("Command id is required.");

        string action = !string.IsNullOrWhiteSpace(command.Action)
            ? command.Action
            : throw new InvalidOperationException("Command action is required.");

        string[] actionParts = action.Split(':', 2, StringSplitOptions.TrimEntries);
        string head = actionParts[0];
        string? argument = actionParts.Length == 2 && !string.IsNullOrWhiteSpace(actionParts[1])
            ? actionParts[1]
            : null;

        string[] headParts = head.Split('.', 2, StringSplitOptions.TrimEntries);
        if (headParts.Length != 2)
        {
            throw new InvalidOperationException($"Command action '{action}' must be in '<scope>.<verb>' form.");
        }

        return new ParsedCommand
        {
            Id = id,
            RawAction = action,
            Scope = headParts[0],
            Verb = headParts[1],
            Argument = argument,
            Character = command.Character,
            Seed = command.Seed,
            Act1 = command.Act1
        };
    }
}
