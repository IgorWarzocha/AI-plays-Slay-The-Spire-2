using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Runs.History;
using MegaCrit.Sts2.Core.Saves.Runs;

namespace Sts2StateExport;

public sealed class RunHistoryFeature : IAgentFeature
{
    public int Order => 406;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NRunHistory? screen = SceneTraversal.FindFirstVisible<NRunHistory>(context.Root);
        if (screen is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        RunHistory history = reflection.ReadField<RunHistory>(screen, reflection.RunHistoryHistoryField)
            ?? throw new InvalidOperationException("Run history data is unavailable.");
        List<string> runNames = reflection.ReadField<List<string>>(screen, reflection.RunHistoryRunNamesField) ?? [];
        int index = reflection.ReadField<int>(screen, reflection.RunHistoryIndexField);
        NRunHistoryPlayerIcon? selectedPlayerIcon = reflection.ReadField<NRunHistoryPlayerIcon>(screen, reflection.RunHistorySelectedPlayerIconField);
        RunHistoryPlayer? selectedPlayer = selectedPlayerIcon?.Player ?? history.Players.FirstOrDefault();

        state.ScreenType = "run_history";
        state.RunHistory = BuildRunHistoryState(context, screen, history, runNames, index, selectedPlayer);
        state.MenuItems =
        [
            new ExportMenuItem
            {
                Id = "prev",
                Label = "Previous Run",
                Visible = true,
                Enabled = index > 0,
                Selected = false
            },
            new ExportMenuItem
            {
                Id = "next",
                Label = "Next Run",
                Visible = true,
                Enabled = index < Math.Max(0, runNames.Count - 1),
                Selected = false
            },
            new ExportMenuItem
            {
                Id = "back",
                Label = "Back",
                Visible = true,
                Enabled = true,
                Selected = false
            }
        ];
        state.Actions =
        [
            .. state.MenuItems
                .Where(static item => item.Enabled)
                .Select(item => $"run_history.{item.Id}")
        ];
        state.Notes = ["Run History screen is active."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "run_history")
        {
            return false;
        }

        NRunHistory screen = context.RequireVisible<NRunHistory>();
        Sts2Reflection reflection = context.Reflection;

        switch (command.Verb)
        {
            case "prev":
                RuntimeInvoker.Invoke(screen, reflection.RunHistoryPrevMethod, ResolveArrow(screen, reflection.RunHistoryPrevButtonField));
                return true;
            case "next":
                RuntimeInvoker.Invoke(screen, reflection.RunHistoryNextMethod, ResolveArrow(screen, reflection.RunHistoryNextButtonField));
                return true;
            case "back":
                CloseSubmenu(screen, reflection);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported run history action '{command.RawAction}'.");
        }
    }

    private static ExportRunHistoryState BuildRunHistoryState(
        FeatureContext context,
        NRunHistory screen,
        RunHistory history,
        List<string> runNames,
        int index,
        RunHistoryPlayer? selectedPlayer)
    {
        ExportRunHistoryState result = new()
        {
            FileName = index >= 0 && index < runNames.Count ? runNames[index] : null,
            SelectedIndex = index,
            RunCount = runNames.Count,
            CanGoPrevious = index > 0,
            CanGoNext = index < Math.Max(0, runNames.Count - 1),
            CharacterId = selectedPlayer?.Character.ToString(),
            Ascension = history.Ascension,
            Seed = history.Seed,
            GameMode = history.GameMode.ToString(),
            BuildId = history.BuildId,
            Win = history.Win,
            WasAbandoned = history.WasAbandoned,
            KilledByEncounterId = history.KilledByEncounter.ToString(),
            KilledByEventId = history.KilledByEvent.ToString(),
            RunTimeSeconds = history.RunTime,
            StartTimeUnixSeconds = history.StartTime,
            PotionSlotCount = selectedPlayer?.MaxPotionSlotCount
        };

        if (selectedPlayer is not null)
        {
            ApplyPlayerHistorySummary(result, history, selectedPlayer);
            result.Floors = BuildFloorHistory(history, selectedPlayer);
        }

        NDeckHistory? deckHistory = context.Reflection.ReadField<NDeckHistory>(screen, context.Reflection.RunHistoryDeckHistoryField);
        if (deckHistory is not null)
        {
            result.Deck = SceneTraversal.FindAllVisible<NDeckHistoryEntry>(deckHistory)
                .Select(entry => MapDeckEntry(entry, context.Reflection))
                .ToList();
        }

        NRelicHistory? relicHistory = context.Reflection.ReadField<NRelicHistory>(screen, context.Reflection.RunHistoryRelicHistoryField);
        if (relicHistory is not null)
        {
            result.Relics = SceneTraversal.FindAllVisible<NRelicBasicHolder>(relicHistory)
                .Select(holder => MapRelicHolder(holder, context.Reflection))
                .ToList();
        }

        return result;
    }

    private static void ApplyPlayerHistorySummary(ExportRunHistoryState result, RunHistory history, RunHistoryPlayer player)
    {
        List<PlayerMapPointHistoryEntry> playerEntries = [];
        int floor = 0;

        foreach (List<MapPointHistoryEntry> actHistory in history.MapPointHistory)
        {
            foreach (MapPointHistoryEntry mapPoint in actHistory)
            {
                floor += 1;
                PlayerMapPointHistoryEntry? entry = mapPoint.GetEntry(player.Id);
                if (entry is null)
                {
                    continue;
                }

                playerEntries.Add(entry);
                result.FloorReached = floor;
            }
        }

        PlayerMapPointHistoryEntry? latest = playerEntries.LastOrDefault();
        if (latest is null)
        {
            return;
        }

        result.CurrentHp = latest.CurrentHp;
        result.MaxHp = latest.MaxHp;
        result.CurrentGold = latest.CurrentGold;
    }

    private static ExportRunHistoryCard MapDeckEntry(NDeckHistoryEntry entry, Sts2Reflection reflection)
    {
        CardModel card = entry.Card;
        IEnumerable<int> floorsAdded = entry.FloorsAddedToDeck ?? [];
        int amount = reflection.ReadField<int>(entry, reflection.DeckHistoryEntryAmountField);

        return new ExportRunHistoryCard
        {
            Id = card.Id.ToString(),
            Title = AgentText.SafeText(card.TitleLocString) ?? card.Title,
            Description = ModelTextResolver.ResolveCardDescription(card),
            CostText = BrowseCardMapper.ReadCanonicalCost(card),
            Upgraded = BrowseCardMapper.ReadIsUpgraded(card),
            Count = amount,
            FloorsAdded = floorsAdded.ToList()
        };
    }

    private static List<ExportRunHistoryFloor> BuildFloorHistory(RunHistory history, RunHistoryPlayer player)
    {
        List<ExportRunHistoryFloor> floors = [];
        int floor = 0;

        foreach (List<MapPointHistoryEntry> actHistory in history.MapPointHistory)
        {
            foreach (MapPointHistoryEntry mapPoint in actHistory)
            {
                floor += 1;
                PlayerMapPointHistoryEntry? entry = mapPoint.GetEntry(player.Id);
                floors.Add(MapFloorHistoryEntry(floor, mapPoint, entry));
            }
        }

        return floors;
    }

    private static ExportRunHistoryFloor MapFloorHistoryEntry(int floor, MapPointHistoryEntry mapPoint, PlayerMapPointHistoryEntry? entry)
    {
        return new ExportRunHistoryFloor
        {
            Floor = floor,
            MapPointType = mapPoint.MapPointType.ToString(),
            CurrentHp = entry?.CurrentHp,
            MaxHp = entry?.MaxHp,
            CurrentGold = entry?.CurrentGold,
            DamageTaken = entry?.DamageTaken,
            GoldGained = entry?.GoldGained,
            GoldLost = entry?.GoldLost,
            GoldSpent = entry?.GoldSpent,
            GoldStolen = entry?.GoldStolen,
            HpHealed = entry?.HpHealed,
            MaxHpGained = entry?.MaxHpGained,
            MaxHpLost = entry?.MaxHpLost,
            Rooms = mapPoint.Rooms.Select(MapRoomHistoryEntry).ToList(),
            CardsGained = entry?.CardsGained.Select(MapSerializableCard).ToList() ?? [],
            CardsRemoved = entry?.CardsRemoved.Select(MapSerializableCard).ToList() ?? [],
            CardsTransformed = entry?.CardsTransformed.Select(MapTransformedCard).ToList() ?? [],
            UpgradedCards = entry?.UpgradedCards.Select(MapModelId).ToList() ?? [],
            DowngradedCards = entry?.DowngradedCards.Select(MapModelId).ToList() ?? [],
            BoughtRelics = entry?.BoughtRelics.Select(MapModelId).ToList() ?? [],
            BoughtPotions = entry?.BoughtPotions.Select(MapModelId).ToList() ?? [],
            CompletedQuests = entry?.CompletedQuests.Select(MapModelId).ToList() ?? [],
            PotionUsed = entry?.PotionUsed.Select(MapModelId).ToList() ?? [],
            PotionDiscarded = entry?.PotionDiscarded.Select(MapModelId).ToList() ?? [],
            RestSiteChoices = entry?.RestSiteChoices.ToList() ?? [],
            CardChoices = entry?.CardChoices.Select(MapCardChoice).ToList() ?? [],
            RelicChoices = entry?.RelicChoices.Select(MapModelChoice).ToList() ?? [],
            PotionChoices = entry?.PotionChoices.Select(MapModelChoice).ToList() ?? [],
            AncientChoices = entry?.AncientChoices.Select(MapAncientChoice).ToList() ?? [],
            EventChoices = entry?.EventChoices.Select(MapEventChoice).ToList() ?? []
        };
    }

    private static ExportRunHistoryRoom MapRoomHistoryEntry(MapPointRoomHistoryEntry room)
    {
        return new ExportRunHistoryRoom
        {
            RoomType = room.RoomType.ToString(),
            ModelId = MapModelId(room.ModelId),
            TurnsTaken = room.TurnsTaken,
            MonsterIds = room.MonsterIds.Select(MapModelId).ToList()
        };
    }

    private static ExportRunHistoryChoice MapCardChoice(CardChoiceHistoryEntry entry)
    {
        ExportRunHistoryCard card = MapSerializableCard(entry.Card);
        return new ExportRunHistoryChoice
        {
            Label = card.Title,
            Picked = entry.wasPicked
        };
    }

    private static ExportRunHistoryChoice MapModelChoice(ModelChoiceHistoryEntry entry)
    {
        return new ExportRunHistoryChoice
        {
            Label = MapModelId(entry.choice),
            Picked = entry.wasPicked
        };
    }

    private static ExportRunHistoryChoice MapAncientChoice(AncientChoiceHistoryEntry entry)
    {
        return new ExportRunHistoryChoice
        {
            Label = AgentText.SafeText(entry.Title) ?? entry.TextKey ?? string.Empty,
            Picked = entry.WasChosen
        };
    }

    private static string MapEventChoice(EventOptionHistoryEntry entry)
    {
        return AgentText.SafeText(entry.Title) ?? string.Empty;
    }

    private static ExportRunHistoryTransform MapTransformedCard(CardTransformationHistoryEntry entry)
    {
        return new ExportRunHistoryTransform
        {
            OriginalCard = MapSerializableCard(entry.OriginalCard),
            FinalCard = MapSerializableCard(entry.FinalCard)
        };
    }

    private static ExportRunHistoryCard MapSerializableCard(SerializableCard card)
    {
        CardModel model = CardModel.FromSerializable(card);

        return new ExportRunHistoryCard
        {
            Id = model.Id.ToString(),
            Title = AgentText.SafeText(model.TitleLocString) ?? model.Title,
            Description = ModelTextResolver.ResolveCardDescription(model),
            CostText = BrowseCardMapper.ReadCanonicalCost(model),
            Upgraded = model.IsUpgraded,
            Count = 1,
            FloorsAdded = card.FloorAddedToDeck is int floor ? [floor] : []
        };
    }

    private static string MapModelId(ModelId? id)
    {
        return id?.ToString() ?? string.Empty;
    }

    private static ExportRelic MapRelicHolder(NRelicBasicHolder holder, Sts2Reflection reflection)
    {
        RelicModel model = reflection.ReadField<RelicModel>(holder, reflection.RelicBasicHolderModelField)
            ?? throw new InvalidOperationException("Relic history entry is missing its model.");

        return new ExportRelic
        {
            Id = model.Id.ToString(),
            Label = AgentText.SafeText(model.Title) ?? model.GetType().Name,
            Description = ModelTextResolver.ResolveRelicDescription(model),
            Count = null,
            Status = null
        };
    }

    private static object ResolveArrow(NRunHistory screen, System.Reflection.FieldInfo? fieldInfo)
    {
        return fieldInfo?.GetValue(screen)
            ?? throw new InvalidOperationException("Run history arrow button is unavailable.");
    }

    private static void CloseSubmenu(NSubmenu submenu, Sts2Reflection reflection)
    {
        NSubmenuStack stack = reflection.ReadField<NSubmenuStack>(submenu, reflection.SubmenuStackField)
            ?? throw new InvalidOperationException("Submenu stack is unavailable.");
        RuntimeInvoker.Invoke(stack, reflection.SubmenuStackPopMethod);
    }
}
