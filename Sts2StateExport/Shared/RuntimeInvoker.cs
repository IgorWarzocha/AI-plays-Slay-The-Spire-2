using System.Reflection;

namespace Sts2StateExport;

public static class RuntimeInvoker
{
    public static void Invoke(object instance, MethodInfo? methodInfo, params object?[]? args)
    {
        if (methodInfo is null)
        {
            throw new MissingMethodException(instance.GetType().FullName, "unknown");
        }

        methodInfo.Invoke(instance, args);
    }

    public static T? Invoke<T>(object instance, MethodInfo? methodInfo, params object?[]? args)
    {
        if (methodInfo is null)
        {
            throw new MissingMethodException(instance.GetType().FullName, "unknown");
        }

        return (T?)methodInfo.Invoke(instance, args);
    }

    public static Task InvokeTask(object instance, MethodInfo? methodInfo, params object?[]? args)
    {
        return Invoke<Task>(instance, methodInfo, args)
            ?? throw new InvalidOperationException($"Method '{methodInfo?.Name ?? "unknown"}' did not return a Task.");
    }
}
