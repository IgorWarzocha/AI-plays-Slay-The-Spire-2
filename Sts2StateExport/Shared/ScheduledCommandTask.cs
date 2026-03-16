namespace Sts2StateExport;

// Features queue async work here so the coordinator can own the ack lifecycle
// and report completion or failure back through the IPC contract.
public sealed class ScheduledCommandTask(Task task, string actionName)
{
    public Task Task { get; } = task;
    public string ActionName { get; } = actionName;
}
