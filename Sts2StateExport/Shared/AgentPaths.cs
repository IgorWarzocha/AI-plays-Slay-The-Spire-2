namespace Sts2StateExport;

public static class AgentPaths
{
    public static readonly string IpcDir =
        Path.Combine(
            System.Environment.GetFolderPath(System.Environment.SpecialFolder.UserProfile),
            ".local",
            "share",
            "SlayTheSpire2",
            "agent_ipc");

    public static readonly string SocketPath = Path.Combine(IpcDir, "sts2-agent.sock");
}
