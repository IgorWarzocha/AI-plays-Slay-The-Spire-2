using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Runs.History;
using MegaCrit.Sts2.Core.Saves.Runs;

namespace Sts2StateExport;

internal static class RunHistoryEntryMapper
{
    public static ExportRunHistoryCard MapDeckEntry(NDeckHistoryEntry entry, Sts2Reflection reflection)
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

    public static List<ExportRunHistoryFloor> BuildFloorHistory(RunHistory history, RunHistoryPlayer player)
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

    public static ExportRelic MapRelicHolder(NRelicBasicHolder holder, Sts2Reflection reflection)
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
}
