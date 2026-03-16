using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game.Lobby;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;

namespace Sts2StateExport;

public sealed class CharacterSelectFeature : IAgentFeature
{
    public int Order => 300;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NCharacterSelectScreen? screen = SceneTraversal.FindFirstVisible<NCharacterSelectScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        NCharacterSelectButton? selectedButton = context.Reflection.ReadField<NCharacterSelectButton>(
            screen,
            context.Reflection.CharacterSelectedButtonField);
        List<ExportCharacter> characters = RunStartHelpers.ReadCharacters(screen, selectedButton);
        if (context.Reflection.CharacterEmbarkButtonField is null)
        {
            throw new InvalidOperationException("Character select embark button field is missing. Update the reflection catalog.");
        }

        Node? embarkButton = context.Reflection.ReadField<Node>(screen, context.Reflection.CharacterEmbarkButtonField)
            ?? throw new InvalidOperationException("Character select embark button is unavailable. Update the reflection catalog.");

        state.ScreenType = "character_select";
        state.Characters = characters;
        state.CharacterSelection = new CharacterSelectionState
        {
            Seed = screen.Lobby.Seed,
            Act1 = screen.Lobby.Act1,
            Ascension = screen.Lobby.Ascension,
            CanEmbark = SceneTraversal.IsNodeVisible(embarkButton)
        };
        state.Actions = characters
            .Where(static character => !character.IsLocked)
            .Select(character => $"character.select:{character.Id}")
            .Append("character.start_run")
            .ToList();
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "character")
        {
            return false;
        }

        NCharacterSelectScreen screen = context.RequireVisible<NCharacterSelectScreen>();

        switch (command.Verb)
        {
            case "select":
                if (string.IsNullOrWhiteSpace(command.Argument))
                {
                    throw new InvalidOperationException("Character selection requires an argument.");
                }

                SelectCharacter(screen, command.Argument);
                return true;
            case "start_run":
                StartRun(context, screen, command);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported character select action '{command.RawAction}'.");
        }
    }

    private static void SelectCharacter(NCharacterSelectScreen screen, string characterId)
    {
        NCharacterSelectButton button = RunStartHelpers.FindCharacterButton(screen, characterId);
        CharacterModel character = button.Character ?? throw new InvalidOperationException("Selected character button has no character model.");
        screen.SelectCharacter(button, character);
        screen.Lobby.SetLocalCharacter(character);
    }

    private static void StartRun(FeatureContext context, NCharacterSelectScreen screen, ParsedCommand command)
    {
        if (!string.IsNullOrWhiteSpace(command.Character))
        {
            SelectCharacter(screen, command.Character);
        }

        StartRunLobby lobby = screen.Lobby;
        if (!string.IsNullOrWhiteSpace(command.Seed))
        {
            lobby.SetSeed(command.Seed);
        }

        if (!string.IsNullOrWhiteSpace(command.Act1))
        {
            lobby.Act1 = command.Act1;
        }

        RuntimeInvoker.Invoke(screen, context.Reflection.CharacterEmbarkMethod, new object?[] { null });
    }
}
