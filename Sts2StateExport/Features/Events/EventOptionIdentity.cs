using System.Text;
using MegaCrit.Sts2.Core.Events;

namespace Sts2StateExport;

// Event choices must be addressed by a stable identity, not the visible button
// index. The UI order can drift during transitions, but the underlying option
// metadata stays stable enough for command replay.
public static class EventOptionIdentity
{
    public static List<ResolvedEventOption> Resolve(IReadOnlyList<EventOptionButtonBinding> bindings)
    {
        Dictionary<string, int> duplicateCount = new(StringComparer.Ordinal);
        List<ResolvedEventOption> resolved = [];

        foreach (EventOptionButtonBinding binding in bindings)
        {
            string stem = BuildStem(binding.Option, binding.Label);
            int occurrence = duplicateCount.TryGetValue(stem, out int count) ? count + 1 : 1;
            duplicateCount[stem] = occurrence;

            resolved.Add(new ResolvedEventOption(binding, occurrence == 1 ? stem : $"{stem}#{occurrence}"));
        }

        return resolved;
    }

    private static string BuildStem(EventOption option, string fallbackLabel)
    {
        if (!string.IsNullOrWhiteSpace(option.TextKey))
        {
            return $"textkey:{Normalize(option.TextKey)}";
        }

        if (option.Relic is not null)
        {
            string relicTitle = AgentText.SafeText(option.Relic.Title) ?? option.Relic.GetType().Name;
            return $"relic:{Normalize(relicTitle)}";
        }

        string? title = AgentText.SafeText(option.Title);
        if (!string.IsNullOrWhiteSpace(title))
        {
            return option.IsProceed ? $"proceed:{Normalize(title)}" : $"title:{Normalize(title)}";
        }

        return option.IsProceed ? "proceed" : $"label:{Normalize(fallbackLabel)}";
    }

    private static string Normalize(string value)
    {
        StringBuilder builder = new();
        bool previousWasDash = false;

        foreach (char character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousWasDash = false;
                continue;
            }

            if (previousWasDash)
            {
                continue;
            }

            builder.Append('-');
            previousWasDash = true;
        }

        return builder
            .ToString()
            .Trim('-');
    }
}

public sealed record EventOptionButtonBinding(int OptionIndex, EventOption Option, string Label, string? Description);

public sealed record ResolvedEventOption(EventOptionButtonBinding Binding, string Id);
