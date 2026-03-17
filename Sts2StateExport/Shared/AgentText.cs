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

        if (!value.Exists())
        {
            return FormatMissingLoc(value);
        }

        try
        {
            string? raw = value.GetRawText();
            return string.IsNullOrWhiteSpace(raw) ? null : raw;
        }
        catch (LocException)
        {
            return FormatMissingLoc(value);
        }
    }

    private static string? FormatMissingLoc(LocString value)
    {
        string table = value.LocTable;
        string key = value.LocEntryKey;
        if (string.IsNullOrWhiteSpace(table) && string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(table))
        {
            return key;
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return table;
        }

        return $"{table}.{key}";
    }
}
