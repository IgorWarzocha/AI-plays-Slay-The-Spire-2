using System.Reflection;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Rooms;

namespace Sts2StateExport;

internal static class CombatCreatureExportBuilder
{
    public static ExportCombatCreature BuildCreatureForExport(NCreature creature)
    {
        Creature entity = creature.Entity;
        List<ExportCombatIntent> intents = SceneTraversal.FindAllVisible<NIntent>(creature)
            .Select(intent => BuildIntent(creature, intent))
            .ToList();

        return new ExportCombatCreature
        {
            Id = CombatCardIdentity.FromCreature(entity),
            Name = entity.Name,
            Side = entity.Side.ToString(),
            SlotName = entity.SlotName,
            CurrentHp = entity.CurrentHp,
            MaxHp = entity.MaxHp,
            Block = entity.Block,
            IsPlayer = entity.IsPlayer,
            IsEnemy = entity.IsEnemy,
            // Combat objects can briefly outlive the underlying combat state during
            // room transitions. These flags are useful when available, but they
            // must never be allowed to crash frame export.
            IsHittable = SafeReadFlag(static candidate => candidate.IsHittable, entity),
            IsStunned = SafeReadFlag(static candidate => candidate.IsStunned, entity),
            Powers = entity.Powers.Select(BuildPower).ToList(),
            Intents = intents
        };
    }

    private static bool SafeReadFlag(Func<Creature, bool> reader, Creature creature)
    {
        try
        {
            return reader(creature);
        }
        catch
        {
            return false;
        }
    }

    private static ExportCombatIntent BuildIntent(NCreature ownerNode, NIntent intentNode)
    {
        object? intent = intentNode.GetType()
            .GetField("_intent", BindingFlags.Instance | BindingFlags.NonPublic)
            ?.GetValue(intentNode);
        object? rawTargets = intentNode.GetType()
            .GetField("_targets", BindingFlags.Instance | BindingFlags.NonPublic)
            ?.GetValue(intentNode);
        List<Creature> targetCreatures = rawTargets is IEnumerable<Creature> creatureTargets
            ? creatureTargets.ToList()
            : [];

        string? fallbackLabel = NodeTextReader.ReadVisibleTexts(intentNode, 3).FirstOrDefault();
        string? label = ResolveIntentLabel(intent, targetCreatures, ownerNode.Entity) ?? fallbackLabel;
        HoverTip? hoverTip = ResolveIntentHoverTip(intent, targetCreatures, ownerNode.Entity);
        string? title = hoverTip?.Title;
        string? description = hoverTip?.Description;

        return new ExportCombatIntent
        {
            Kind = intent?.GetType().Name ?? "UnknownIntent",
            Label = label,
            Title = title,
            Description = description,
            Summary = CombatIntentSummaryBuilder.Build(title, description, label, intent?.GetType().Name),
            Targets = targetCreatures.Select(CombatCardIdentity.FromCreature).ToList(),
            OwnerId = CombatCardIdentity.FromCreature(ownerNode.Entity)
        };
    }

    private static string? ResolveIntentLabel(object? intent, IEnumerable<Creature> targets, Creature owner)
    {
        if (intent is null)
        {
            return null;
        }

        MethodInfo? labelMethod = intent.GetType().GetMethod(
            "GetIntentLabel",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            null,
            [typeof(IEnumerable<Creature>), typeof(Creature)],
            null);
        object? label = labelMethod?.Invoke(intent, [targets, owner]);
        return label switch
        {
            null => null,
            LocString locString => AgentText.SafeText(locString),
            _ => label.ToString()
        };
    }

    private static HoverTip? ResolveIntentHoverTip(object? intent, IEnumerable<Creature> targets, Creature owner)
    {
        if (intent is null)
        {
            return null;
        }

        MethodInfo? hoverTipMethod = intent.GetType().GetMethod(
            "GetHoverTip",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            null,
            [typeof(IEnumerable<Creature>), typeof(Creature)],
            null);
        object? hoverTip = hoverTipMethod?.Invoke(intent, [targets, owner]);
        return hoverTip is HoverTip value ? value : null;
    }

    private static ExportCombatPower BuildPower(object power)
    {
        Type type = power.GetType();
        return new ExportCombatPower
        {
            Id = type.Name,
            Label = ReadLocStringProperty(power, type, "Title") ?? type.Name,
            Amount = ReadIntProperty(power, type, "Amount"),
            Description = ReadLocStringProperty(power, type, "Description")
        };
    }

    private static string? ReadLocStringProperty(object instance, Type type, string propertyName)
    {
        PropertyInfo? property = type.GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        object? value = property?.GetValue(instance);
        return value switch
        {
            null => null,
            LocString loc => AgentText.SafeText(loc),
            _ => value.ToString()
        };
    }

    private static int? ReadIntProperty(object instance, Type type, string propertyName)
    {
        PropertyInfo? property = type.GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return property?.GetValue(instance) as int?;
    }
}
