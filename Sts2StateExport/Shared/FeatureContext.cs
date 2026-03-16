using Godot;

namespace Sts2StateExport;

public sealed class FeatureContext
{
    private readonly List<ScheduledCommandTask> _scheduledTasks = [];

    public FeatureContext(Node root, Sts2Reflection reflection)
    {
        Root = root;
        Reflection = reflection;
    }

    public Node Root { get; }
    public Sts2Reflection Reflection { get; }
    public IReadOnlyList<ScheduledCommandTask> ScheduledTasks => _scheduledTasks;

    public T RequireVisible<T>() where T : Node
    {
        return SceneTraversal.FindFirstVisible<T>(Root)
            ?? throw new InvalidOperationException($"Screen '{typeof(T).Name}' is not currently visible.");
    }

    public void QueueTask(Task task, string actionName)
    {
        _scheduledTasks.Add(new ScheduledCommandTask(task, actionName));
    }
}
