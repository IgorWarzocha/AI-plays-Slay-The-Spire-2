using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Models;

namespace Sts2StateExport;

public static class AgentText
{
    public static string CanonicalizeCharacterId(string raw)
    {
        return raw.Trim().Replace(" ", string.Empty, StringComparison.Ordinal).ToLowerInvariant();
    }

    public static string GetCharacterId(CharacterModel? character)
    {
        return character is null ? "unknown" : CanonicalizeCharacterId(character.GetType().Name);
    }

    public static string? SafeText(LocString? value)
    {
        if (value is null || value.IsEmpty)
        {
            return null;
        }

        string? raw = value.GetRawText();
        return string.IsNullOrWhiteSpace(raw) ? null : raw;
    }
}
