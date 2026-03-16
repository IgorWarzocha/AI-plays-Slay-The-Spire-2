using System.Reflection;
using System.Runtime.Loader;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: dotnet run --project tools/Sts2TypeInspector -- <type-name-fragment>");
    return 1;
}

string query = args[0].Trim();
if (string.IsNullOrWhiteSpace(query))
{
    Console.Error.WriteLine("Type query must not be empty.");
    return 1;
}

string dataDir = "/run/media/igorw/Steam/SteamLibrary/steamapps/common/Slay the Spire 2/data_sts2_linuxbsd_x86_64";
string assemblyPath = Path.Combine(dataDir, "sts2.dll");
if (!File.Exists(assemblyPath))
{
    Console.Error.WriteLine($"STS2 assembly was not found at '{assemblyPath}'.");
    return 3;
}

AssemblyLoadContext.Default.Resolving += (_, assemblyName) =>
{
    string candidatePath = Path.Combine(dataDir, $"{assemblyName.Name}.dll");
    return File.Exists(candidatePath)
        ? AssemblyLoadContext.Default.LoadFromAssemblyPath(candidatePath)
        : null;
};

Assembly assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(assemblyPath);
Type[] allTypes = GetLoadableTypes(assembly);
Type[] matchingTypes = allTypes
    .Where(type =>
        type.FullName?.Contains(query, StringComparison.OrdinalIgnoreCase) == true
        || type.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
    .OrderBy(type => type.FullName, StringComparer.Ordinal)
    .ToArray();

if (matchingTypes.Length == 0)
{
    Console.Error.WriteLine($"No STS2 types matched '{query}'.");
    return 2;
}

foreach (Type type in matchingTypes)
{
    PrintType(type);
}

return 0;

static void PrintType(Type type)
{
    BindingFlags instanceFlags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;
    BindingFlags staticFlags = BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

    Console.WriteLine($"=== {type.FullName} ===");
    Console.WriteLine($"Base: {type.BaseType?.FullName ?? "<none>"}");

    FieldInfo[] fields = type.GetFields(instanceFlags | staticFlags)
        .OrderBy(field => field.Name, StringComparer.Ordinal)
        .ToArray();
    Console.WriteLine($"Fields ({fields.Length}):");
    foreach (FieldInfo field in fields)
    {
        Console.WriteLine($"  {FormatFieldVisibility(field)} {(field.IsStatic ? "static " : string.Empty)}{FormatType(field.FieldType)} {field.Name}");
    }

    PropertyInfo[] properties = type.GetProperties(instanceFlags | staticFlags)
        .OrderBy(property => property.Name, StringComparer.Ordinal)
        .ToArray();
    Console.WriteLine($"Properties ({properties.Length}):");
    foreach (PropertyInfo property in properties)
    {
        MethodInfo? accessor = property.GetMethod ?? property.SetMethod;
        bool isStatic = accessor?.IsStatic == true;
        Console.WriteLine($"  {FormatMethodVisibility(accessor)} {(isStatic ? "static " : string.Empty)}{FormatType(property.PropertyType)} {property.Name}");
    }

    MethodInfo[] methods = type.GetMethods(instanceFlags | staticFlags)
        .Where(method => !method.IsSpecialName)
        .OrderBy(method => method.Name, StringComparer.Ordinal)
        .ThenBy(method => method.GetParameters().Length)
        .ToArray();
    Console.WriteLine($"Methods ({methods.Length}):");
    foreach (MethodInfo method in methods)
    {
        string parameters = string.Join(", ", method.GetParameters().Select(FormatParameter));
        Console.WriteLine($"  {FormatMethodVisibility(method)} {(method.IsStatic ? "static " : string.Empty)}{FormatType(method.ReturnType)} {method.Name}({parameters})");
    }

    Console.WriteLine();
}

static string FormatParameter(ParameterInfo parameter)
{
    string modifier = parameter.IsOut
        ? "out "
        : parameter.ParameterType.IsByRef
            ? "ref "
            : string.Empty;
    Type parameterType = parameter.ParameterType.IsByRef
        ? parameter.ParameterType.GetElementType() ?? parameter.ParameterType
        : parameter.ParameterType;
    return $"{modifier}{FormatType(parameterType)} {parameter.Name}";
}

static string FormatFieldVisibility(FieldInfo field)
{
    if (field.IsPublic)
    {
        return "public";
    }

    if (field.IsFamily)
    {
        return "protected";
    }

    if (field.IsAssembly)
    {
        return "internal";
    }

    return "private";
}

static string FormatMethodVisibility(MethodBase? method)
{
    if (method is null)
    {
        return "private";
    }

    if (method.IsPublic)
    {
        return "public";
    }

    if (method.IsFamily)
    {
        return "protected";
    }

    if (method.IsAssembly)
    {
        return "internal";
    }

    return "private";
}

static string FormatType(Type type)
{
    if (!type.IsGenericType)
    {
        return type.Name;
    }

    int tickIndex = type.Name.IndexOf('`');
    string name = tickIndex >= 0 ? type.Name[..tickIndex] : type.Name;
    string arguments = string.Join(", ", type.GetGenericArguments().Select(FormatType));
    return $"{name}<{arguments}>";
}

static Type[] GetLoadableTypes(Assembly assembly)
{
    try
    {
        return assembly.GetTypes();
    }
    catch (ReflectionTypeLoadException exception)
    {
        return exception.Types.Where(static type => type is not null).Cast<Type>().ToArray();
    }
}
