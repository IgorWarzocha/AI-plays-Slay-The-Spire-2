using System.Reflection;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: ReflectSts2 <path-to-sts2.dll> [filter]");
    return 1;
}

string assemblyPath = args[0];
string filter = args.Length > 1 ? args[1] : "Ancient|Neow|ScreenState|CurrentScreen|StartRunLobby";

Assembly assembly = Assembly.LoadFrom(assemblyPath);

foreach (Type type in assembly.GetTypes().OrderBy(type => type.FullName))
{
    string name = type.FullName ?? type.Name;
    if (!System.Text.RegularExpressions.Regex.IsMatch(
            name,
            filter,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase))
    {
        continue;
    }

    Console.WriteLine($"TYPE {name}");

    foreach (MethodInfo method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
    {
        Console.WriteLine($"  METHOD {method.ReturnType.Name} {method.Name}({string.Join(", ", method.GetParameters().Select(p => $"{p.ParameterType.Name} {p.Name}"))})");
    }

    foreach (PropertyInfo property in type.GetProperties(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
    {
        Console.WriteLine($"  PROPERTY {property.PropertyType.Name} {property.Name}");
    }

    foreach (FieldInfo field in type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
    {
        Console.WriteLine($"  FIELD {field.FieldType.Name} {field.Name}");
    }

    Console.WriteLine();
}

return 0;
