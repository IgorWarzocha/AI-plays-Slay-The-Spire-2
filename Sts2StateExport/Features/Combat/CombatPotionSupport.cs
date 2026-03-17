using Godot;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Entities.Potions;
using MegaCrit.Sts2.Core.Nodes.Potions;

namespace Sts2StateExport;

internal static class CombatPotionSupport
{
    public static List<ExportCombatPotion> BuildPotions(Node root, IReadOnlyList<ExportCombatCreature> creatures, bool isPlayerTurn)
    {
        NPotionContainer? container = SceneTraversal.FindFirstVisible<NPotionContainer>(root);
        if (container is null)
        {
            return [];
        }

        return SceneTraversal.FindAllVisible<NPotionHolder>(container)
            .Where(static holder => holder.HasPotion && holder.Potion?.Model is not null)
            .Select(holder => BuildPotion(holder, creatures, isPlayerTurn))
            .ToList();
    }

    public static IEnumerable<string> BuildActions(IEnumerable<ExportCombatPotion> potions)
    {
        foreach (ExportCombatPotion potion in potions)
        {
            if (potion.IsUsable)
            {
                if (potion.ValidTargetIds.Count == 0)
                {
                    yield return $"combat.use_potion:{potion.Id}";
                }
                else
                {
                    foreach (string targetId in potion.ValidTargetIds)
                    {
                        yield return $"combat.use_potion:{potion.Id}@{targetId}";
                    }
                }
            }

            if (potion.CanDiscard)
            {
                yield return $"combat.discard_potion:{potion.Id}";
            }
        }
    }

    public static NPotionHolder FindPotionHolderForExecution(Node root, string? potionId)
    {
        if (string.IsNullOrWhiteSpace(potionId))
        {
            throw new InvalidOperationException("Potion action requires a potion id.");
        }

        NPotionContainer container = SceneTraversal.FindFirstVisible<NPotionContainer>(root)
            ?? throw new InvalidOperationException("Potion container is not visible.");

        return SceneTraversal.FindAllVisible<NPotionHolder>(container)
            .FirstOrDefault(holder => holder.HasPotion && string.Equals(GetPotionId(holder), potionId, StringComparison.Ordinal))
            ?? throw new InvalidOperationException($"Potion '{potionId}' was not found.");
    }

    public static void UsePotion(Node root, string? argument, IReadOnlyList<Creature> creatures)
    {
        if (string.IsNullOrWhiteSpace(argument))
        {
            throw new InvalidOperationException("Potion use requires a potion id.");
        }

        string[] parts = argument.Split('@', 2, StringSplitOptions.TrimEntries);
        NPotionHolder holder = FindPotionHolderForExecution(root, parts[0]);
        PotionModel model = holder.Potion?.Model ?? throw new InvalidOperationException("Potion holder had no potion model.");

        Creature? target = ResolveTarget(model, parts.Length == 2 ? parts[1] : null, creatures);
        model.EnqueueManualUse(target ?? ResolveDefaultTarget(model, creatures));
    }

    private static ExportCombatPotion BuildPotion(NPotionHolder holder, IReadOnlyList<ExportCombatCreature> creatures, bool isPlayerTurn)
    {
        PotionModel model = holder.Potion?.Model ?? throw new InvalidOperationException("Potion holder had no potion model.");
        List<string> validTargetIds = ResolveValidTargetIds(model, creatures);
        bool isUsable = isPlayerTurn && model.Usage != PotionUsage.None;

        return new ExportCombatPotion
        {
            Id = GetPotionId(holder),
            Title = AgentText.SafeText(model.Title) ?? model.GetType().Name,
            Description = AgentText.SafeText(model.DynamicDescription) ?? AgentText.SafeText(model.Description),
            TargetType = model.TargetType.ToString(),
            Usage = model.Usage.ToString(),
            IsUsable = isUsable,
            CanDiscard = true,
            ValidTargetIds = validTargetIds
        };
    }

    private static List<string> ResolveValidTargetIds(PotionModel model, IReadOnlyList<ExportCombatCreature> creatures)
    {
        return model.TargetType.ToString() switch
        {
            "AnyEnemy" => creatures.Where(static creature => creature.IsEnemy && creature.IsHittable).Select(static creature => creature.Id).ToList(),
            "Any" or "Creature" => creatures.Where(static creature => creature.IsHittable).Select(static creature => creature.Id).ToList(),
            _ => []
        };
    }

    private static Creature? ResolveTarget(PotionModel model, string? targetId, IReadOnlyList<Creature> creatures)
    {
        if (string.IsNullOrWhiteSpace(targetId))
        {
            return null;
        }

        Creature? target = creatures.FirstOrDefault(creature => string.Equals(CombatCardIdentity.FromCreature(creature), targetId, StringComparison.Ordinal));
        if (target is null)
        {
            throw new InvalidOperationException($"Potion target '{targetId}' was not found.");
        }

        return target;
    }

    private static Creature ResolveDefaultTarget(PotionModel model, IReadOnlyList<Creature> creatures)
    {
        return model.TargetType.ToString() switch
        {
            "Self" => creatures.First(static creature => creature.IsPlayer),
            "AnyEnemy" => throw new InvalidOperationException("Potion use requires an explicit enemy target."),
            "Any" or "Creature" => throw new InvalidOperationException("Potion use requires an explicit target."),
            _ => creatures.First(static creature => creature.IsPlayer)
        };
    }

    private static string GetPotionId(NPotionHolder holder)
    {
        PotionModel model = holder.Potion?.Model ?? throw new InvalidOperationException("Potion holder had no potion model.");
        string title = AgentText.SafeText(model.Title) ?? model.GetType().Name;
        return $"potion:{title.Trim().ToLowerInvariant().Replace(' ', '-')}";
    }
}
