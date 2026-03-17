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
            if (value.Variables.Count > 0)
            {
                try
                {
                    string? formatted = value.GetFormattedText();
                    if (!string.IsNullOrWhiteSpace(formatted))
                    {
                        return formatted;
                    }
                }
                catch (Exception)
                {
                    // Some runtime descriptions depend on selector extensions that are
                    // only valid in specific UI contexts. Falling back to raw text is
                    // better than crashing the entire frame export.
                }
            }

            try
            {
                string? raw = value.GetRawText();
                return string.IsNullOrWhiteSpace(raw) ? null : raw;
            }
            catch (Exception)
            {
                return FormatMissingLoc(value);
            }
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
