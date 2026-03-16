namespace Sts2StateExport;

public static class AgentPaths
{
    public static readonly string ExportDir =
        Path.Combine(
            System.Environment.GetFolderPath(System.Environment.SpecialFolder.UserProfile),
            ".local",
            "share",
            "SlayTheSpire2",
            "agent_state");

    public static readonly string StatePath = Path.Combine(ExportDir, "screen_state.json");
    public static readonly string CommandPath = Path.Combine(ExportDir, "command.json");
    public static readonly string AckPath = Path.Combine(ExportDir, "command_ack.json");
}
