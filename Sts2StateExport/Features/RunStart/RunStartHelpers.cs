using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;

namespace Sts2StateExport;

public static class RunStartHelpers
{
    public static List<ExportCharacter> ReadCharacters(
        Node root,
        NCharacterSelectButton? selectedButton)
    {
        return SceneTraversal.FindAllVisible<NCharacterSelectButton>(root)
            .Select(
                button =>
                {
                    CharacterModel? character = button.Character;
                    return new ExportCharacter
                    {
                        Id = AgentText.GetCharacterId(character),
                        Label = character is null ? button.Name : AgentText.SafeText(character.Title) ?? button.Name,
                        IsLocked = button.IsLocked,
                        IsRandom = button.IsRandom,
                        IsSelected = ReferenceEquals(button, selectedButton)
                    };
                })
            .DistinctBy(static character => character.Id)
            .ToList();
    }

    public static NCharacterSelectButton FindCharacterButton(Node root, string characterId)
    {
        string canonicalId = AgentText.CanonicalizeCharacterId(characterId);
        return SceneTraversal.FindAllVisible<NCharacterSelectButton>(root)
            .FirstOrDefault(
                button =>
                {
                    CharacterModel? character = button.Character;
                    return !button.IsLocked && AgentText.GetCharacterId(character) == canonicalId;
                })
            ?? throw new InvalidOperationException($"Character '{characterId}' is not available.");
    }
}
