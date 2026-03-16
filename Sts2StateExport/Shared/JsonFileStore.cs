using System.Text.Json;

namespace Sts2StateExport;

// File I/O is isolated so runtime logic can reason in terms of models and
// commands rather than raw file system calls.
public sealed class JsonFileStore
{
    public void EnsureDirectory()
    {
        Directory.CreateDirectory(AgentPaths.ExportDir);
    }

    public T? ReadOrDefault<T>(string path)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(File.ReadAllText(path), AgentJson.Options);
    }

    public string? ReadTextOrDefault(string path)
    {
        return File.Exists(path) ? File.ReadAllText(path) : null;
    }

    public void WriteAtomic<T>(string path, T value)
    {
        EnsureDirectory();
        string json = JsonSerializer.Serialize(value, AgentJson.Options);
        string tempPath = $"{path}.tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, path, true);
    }

    public void DeleteIfExists(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
