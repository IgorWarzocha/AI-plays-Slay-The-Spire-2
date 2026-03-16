using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game.Lobby;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;
using MegaCrit.Sts2.Core.Nodes.Screens.CustomRun;

namespace Sts2StateExport;

public sealed class CustomRunFeature : IAgentFeature
{
    public int Order => 200;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NCustomRunScreen? screen = SceneTraversal.FindFirstVisible<NCustomRunScreen>(context.Root);
        if (screen is null)
        {
            return false;
        }

        NCharacterSelectButton? selectedButton = context.Reflection.ReadField<NCharacterSelectButton>(
            screen,
            context.Reflection.CustomSelectedButtonField);
        List<ExportCharacter> characters = RunStartHelpers.ReadCharacters(screen, selectedButton);
        if (context.Reflection.CustomConfirmButtonField is null)
        {
            throw new InvalidOperationException("Custom run confirm button field is missing. Update the reflection catalog.");
        }

        Node? confirmButton = context.Reflection.ReadField<Node>(screen, context.Reflection.CustomConfirmButtonField)
            ?? throw new InvalidOperationException("Custom run confirm button is unavailable. Update the reflection catalog.");

        state.ScreenType = "custom_run";
        state.Characters = characters;
        state.CharacterSelection = new CharacterSelectionState
        {
            Seed = screen.Lobby.Seed,
            Act1 = screen.Lobby.Act1,
            Ascension = screen.Lobby.Ascension,
            CanEmbark = SceneTraversal.IsNodeVisible(confirmButton)
        };
        state.Actions = characters
            .Where(static character => !character.IsLocked)
            .Select(character => $"custom.select:{character.Id}")
            .Append("custom.start_run")
            .ToList();
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "custom")
        {
            return false;
        }

        NCustomRunScreen screen = context.RequireVisible<NCustomRunScreen>();

        switch (command.Verb)
        {
            case "select":
                if (string.IsNullOrWhiteSpace(command.Argument))
                {
                    throw new InvalidOperationException("Custom run character selection requires an argument.");
                }

                SelectCharacter(screen, command.Argument);
                return true;
            case "start_run":
                StartRun(context, screen, command);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported custom run action '{command.RawAction}'.");
        }
    }

    private static void SelectCharacter(NCustomRunScreen screen, string characterId)
    {
        NCharacterSelectButton button = RunStartHelpers.FindCharacterButton(screen, characterId);
        CharacterModel character = button.Character ?? throw new InvalidOperationException("Selected character button has no character model.");
        screen.SelectCharacter(button, character);
        screen.Lobby.SetLocalCharacter(character);
    }

    private static void StartRun(FeatureContext context, NCustomRunScreen screen, ParsedCommand command)
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

        RuntimeInvoker.Invoke(screen, context.Reflection.CustomEmbarkMethod, new object?[] { null });
    }
}
