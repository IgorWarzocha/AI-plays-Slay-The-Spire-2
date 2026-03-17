using Godot;
using MegaCrit.Sts2.Core.Entities.Potions;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Potions;

namespace Sts2StateExport;

// Held potions matter on rewards, merchants, and events. Export them as an
// overlay so the agent can decide whether to use or discard one before taking
// a new potion reward.
public sealed class RunPotionOverlayFeature : IAgentOverlayFeature
{
    public int Order => 110;

    public void Augment(FeatureContext context, ExportState state)
    {
        if (state.TopBar is null || state.ScreenType is "combat_room" or "combat_card_select")
        {
            return;
        }

        NPotionContainer? container = SceneTraversal.FindFirstVisible<NPotionContainer>(context.Root);
        if (container is null)
        {
            return;
        }

        List<ExportHeldPotion> potions = SceneTraversal.FindAllVisible<NPotionHolder>(container)
            .Where(static holder => holder.HasPotion && holder.Potion?.Model is not null)
            .Select((holder, index) => BuildPotion(holder, index))
            .ToList();

        if (potions.Count == 0)
        {
            return;
        }

        state.Potions = potions;

        foreach (ExportHeldPotion potion in potions)
        {
            if (potion.IsUsable)
            {
                state.Actions.Add($"potions.use:{potion.Id}");
            }

            if (potion.CanDiscard)
            {
                state.Actions.Add($"potions.discard:{potion.Id}");
            }
        }
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "potions")
        {
            return false;
        }

        NPotionHolder holder = FindHolder(context.Root, command.Argument);

        switch (command.Verb)
        {
            case "use":
                if (!CanUsePotion(holder))
                {
                    throw new InvalidOperationException($"Potion '{command.Argument}' is not usable on this screen.");
                }

                context.QueueTask(
                    RuntimeInvoker.InvokeTask(holder, context.Reflection.PotionHolderUseMethod),
                    command.RawAction);
                return true;
            case "discard":
                RuntimeInvoker.Invoke(holder, context.Reflection.PotionHolderDiscardMethod);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported potion action '{command.RawAction}'.");
        }
    }

    private static ExportHeldPotion BuildPotion(NPotionHolder holder, int slotIndex)
    {
        PotionModel model = holder.Potion?.Model ?? throw new InvalidOperationException("Potion holder had no potion model.");
        return new ExportHeldPotion
        {
            Id = PotionIdentity.FromHolder(holder, slotIndex),
            Title = AgentText.SafeText(model.Title) ?? model.GetType().Name,
            Description = ModelTextResolver.ResolvePotionDescription(model),
            Usage = model.Usage.ToString(),
            IsUsable = CanUsePotion(holder),
            CanDiscard = true
        };
    }

    private static bool CanUsePotion(NPotionHolder holder)
    {
        PotionModel? model = holder.Potion?.Model;
        if (model?.Usage == PotionUsage.AnyTime)
        {
            return true;
        }

        return IsPotionUsable(holder);
    }

    private static bool IsPotionUsable(NPotionHolder holder)
    {
        try
        {
            return holder.IsPotionUsable;
        }
        catch (NullReferenceException)
        {
            return false;
        }
    }

    private static NPotionHolder FindHolder(Node root, string? potionId)
    {
        if (string.IsNullOrWhiteSpace(potionId))
        {
            throw new InvalidOperationException("Potion action requires a potion id.");
        }

        NPotionContainer container = SceneTraversal.FindFirstVisible<NPotionContainer>(root)
            ?? throw new InvalidOperationException("Potion container is not visible.");

        return SceneTraversal.FindAllVisible<NPotionHolder>(container)
            .Select((holder, index) => new { holder, potionKey = PotionIdentity.FromHolder(holder, index) })
            .FirstOrDefault(item => item.holder.HasPotion && string.Equals(item.potionKey, potionId, StringComparison.Ordinal))
            ?.holder
            ?? throw new InvalidOperationException($"Potion '{potionId}' was not found.");
    }
}
