using System.Reflection;

namespace Sts2StateExport;

// Reflection lookups are centralized here so we have one audited place for
// private API usage and parameter-count-sensitive overload selection.
public sealed partial class Sts2Reflection
{
    public void ValidateOrThrow()
    {
        ValidateMainMenuCatalog();
        ValidateRunHistoryCatalog();
        ValidateScreenInteractionCatalog();
        ValidateCombatCatalog();
    }

    public T? ReadField<T>(object instance, FieldInfo? fieldInfo)
    {
        if (fieldInfo?.GetValue(instance) is not T value)
        {
            return default;
        }

        return value;
    }

    public T? ReadProperty<T>(object instance, PropertyInfo? propertyInfo)
    {
        if (propertyInfo?.GetValue(instance) is not T value)
        {
            return default;
        }

        return value;
    }

    private static FieldInfo? GetField<T>(string name)
    {
        return typeof(T).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static PropertyInfo? GetProperty<T>(string name)
    {
        return typeof(T).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static PropertyInfo? GetPropertyByDeclaringType(string fullName, string name)
    {
        Type? declaringType = Type.GetType($"{fullName}, sts2");
        return declaringType?.GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static MethodInfo? GetMethod<T>(string name, int parameterCount)
    {
        MethodInfo[] matches = typeof(T)
            .GetMethods(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Where(method => method.Name == name && method.GetParameters().Length == parameterCount)
            .ToArray();

        return matches.Length switch
        {
            0 => null,
            1 => matches[0],
            _ => throw new InvalidOperationException(
                $"Reflection catalog is ambiguous for {typeof(T).FullName}.{name} with {parameterCount} parameters.")
        };
    }

    private static void RequireField(FieldInfo? fieldInfo, string propertyName)
    {
        if (fieldInfo is null)
        {
            throw new InvalidOperationException($"Required reflected field '{propertyName}' is missing.");
        }
    }

    private static void RequireMethod(MethodInfo? methodInfo, string propertyName)
    {
        if (methodInfo is null)
        {
            throw new InvalidOperationException($"Required reflected method '{propertyName}' is missing.");
        }
    }

    private static void RequireProperty(PropertyInfo? propertyInfo, string propertyName)
    {
        if (propertyInfo is null)
        {
            throw new InvalidOperationException($"Required reflected property '{propertyName}' is missing.");
        }
    }
}
