using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Runs.History;

namespace Sts2StateExport;

internal static class RunHistoryStateBuilder
{
    public static ExportRunHistoryState Build(
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
            result.Floors = RunHistoryEntryMapper.BuildFloorHistory(history, selectedPlayer);
        }

        NDeckHistory? deckHistory = context.Reflection.ReadField<NDeckHistory>(screen, context.Reflection.RunHistoryDeckHistoryField);
        if (deckHistory is not null)
        {
            result.Deck = SceneTraversal.FindAllVisible<NDeckHistoryEntry>(deckHistory)
                .Select(entry => RunHistoryEntryMapper.MapDeckEntry(entry, context.Reflection))
                .ToList();
        }

        NRelicHistory? relicHistory = context.Reflection.ReadField<NRelicHistory>(screen, context.Reflection.RunHistoryRelicHistoryField);
        if (relicHistory is not null)
        {
            result.Relics = SceneTraversal.FindAllVisible<NRelicBasicHolder>(relicHistory)
                .Select(holder => RunHistoryEntryMapper.MapRelicHolder(holder, context.Reflection))
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
}
