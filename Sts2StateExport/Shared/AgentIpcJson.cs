using System.Text.Json;

namespace Sts2StateExport;

public static class AgentIpcJson
{
    public static readonly JsonSerializerOptions Options = new(AgentJson.Options)
    {
        WriteIndented = false
    };
}
