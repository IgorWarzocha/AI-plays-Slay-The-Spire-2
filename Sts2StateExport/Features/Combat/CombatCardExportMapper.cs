using System.Reflection;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;

namespace Sts2StateExport;

// Card runtime state is spread across multiple model layers. Export it
// explicitly so the CLI can reason about cards the same way the GUI does.
internal static class CombatCardExportMapper
{
    public static ExportCombatCard Build(CardModel card, NHandCardHolder? holder, bool? isPlayableOverride = null, List<string>? validTargetIdsOverride = null)
    {
        NCard? cardNode = holder?.CardNode;
        string title = CardTextResolver.ResolveLabel(cardNode, card);
        PlayabilitySnapshot playability = ReadPlayability(card);

        return new ExportCombatCard
        {
            Id = CombatCardIdentity.FromCard(card),
            Title = title,
            Description = CardTextResolver.ResolveDescription(cardNode, card, title),
            CostText = ReadCardCost(card),
            TargetType = card.TargetType.ToString(),
            IsPlayable = isPlayableOverride ?? playability.IsPlayable,
            GlowsGold = ReadBoolProperty(holder, "ShouldGlowGold") ?? card.ShouldGlowGold,
            GlowsRed = ReadBoolProperty(holder, "ShouldGlowRed") ?? card.ShouldGlowRed,
            Affliction = BuildAffliction(card.Affliction),
            Enchantment = BuildEnchantment(card.Enchantment),
            Unplayable = playability.Unplayable,
            ValidTargetIds = validTargetIdsOverride ?? []
        };
    }

    private static PlayabilitySnapshot ReadPlayability(CardModel card)
    {
        MethodInfo? canPlayMethod = card.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .SingleOrDefault(
                method =>
                {
                    if (!string.Equals(method.Name, nameof(CardModel.CanPlay), StringComparison.Ordinal))
                    {
                        return false;
                    }

                    ParameterInfo[] parameters = method.GetParameters();
                    return parameters.Length == 2 && parameters.All(static parameter => parameter.IsOut);
                });

        if (canPlayMethod is null)
        {
            bool canPlay = ReadBoolProperty(card, "IsPlayable") ?? card.CanPlay();
            return new PlayabilitySnapshot(canPlay, canPlay ? null : new ExportCombatCardUnplayable());
        }

        object?[] args = [null, null];
        bool canPlayWithReason = RuntimeInvoker.Invoke<bool>(card, canPlayMethod, args);
        if (canPlayWithReason)
        {
            return new PlayabilitySnapshot(true, null);
        }

        UnplayableReason? reason = args[0] is UnplayableReason typedReason ? typedReason : null;
        AbstractModel? preventer = args[1] as AbstractModel;
        return new PlayabilitySnapshot(
            false,
            new ExportCombatCardUnplayable
            {
                Reason = reason?.ToString(),
                PreventerType = preventer?.GetType().Name,
                PreventerTitle = ReadModelLocText(preventer, "Title"),
                PreventerDescription = ReadModelLocText(preventer, "DynamicDescription")
                    ?? ReadModelLocText(preventer, "SmartDescription")
                    ?? ReadModelLocText(preventer, "Description")
            });
    }

    private static ExportCombatCardState? BuildAffliction(AfflictionModel? affliction)
    {
        if (affliction is null)
        {
            return null;
        }

        return new ExportCombatCardState
        {
            Kind = "affliction",
            TypeName = affliction.GetType().Name,
            Title = AgentText.SafeText(affliction.Title),
            Description = AgentText.SafeText(affliction.DynamicDescription) ?? AgentText.SafeText(affliction.Description),
            ExtraCardText = AgentText.SafeText(affliction.DynamicExtraCardText) ?? AgentText.SafeText(affliction.ExtraCardText),
            Amount = affliction.Amount,
            OverlayPath = affliction.OverlayPath
        };
    }

    private static ExportCombatCardState? BuildEnchantment(EnchantmentModel? enchantment)
    {
        if (enchantment is null)
        {
            return null;
        }

        return new ExportCombatCardState
        {
            Kind = "enchantment",
            TypeName = enchantment.GetType().Name,
            Title = AgentText.SafeText(enchantment.Title),
            Description = AgentText.SafeText(enchantment.DynamicDescription) ?? AgentText.SafeText(enchantment.Description),
            ExtraCardText = AgentText.SafeText(enchantment.DynamicExtraCardText) ?? AgentText.SafeText(enchantment.ExtraCardText),
            Amount = enchantment.DisplayAmount,
            Status = enchantment.Status.ToString(),
            OverlayPath = enchantment.IconPath,
            GlowsGold = enchantment.ShouldGlowGold,
            GlowsRed = enchantment.ShouldGlowRed
        };
    }

    private static string? ReadCardCost(CardModel card)
    {
        object? energyCost = ReadObjectProperty(card, "EnergyCost");
        if (energyCost is not null)
        {
            MethodInfo? getResolvedMethod = energyCost.GetType().GetMethod(
                "GetResolved",
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (getResolvedMethod?.Invoke(energyCost, null) is int resolvedCost && resolvedCost >= 0)
            {
                return resolvedCost.ToString();
            }
        }

        int? canonicalCost = ReadIntProperty(card, "CanonicalEnergyCost");
        return canonicalCost is >= 0 ? canonicalCost.Value.ToString() : null;
    }

    private static string? ReadModelLocText(object? instance, string propertyName)
    {
        if (instance is null)
        {
            return null;
        }

        PropertyInfo? property = instance.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return property?.GetValue(instance) is LocString locString ? AgentText.SafeText(locString) : null;
    }

    private static object? ReadObjectProperty(object? instance, string propertyName)
    {
        if (instance is null)
        {
            return null;
        }

        return instance.GetType().GetProperty(propertyName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            ?.GetValue(instance);
    }

    private static int? ReadIntProperty(object? instance, string propertyName)
    {
        return ReadObjectProperty(instance, propertyName) switch
        {
            int value => value,
            _ => null
        };
    }

    private static bool? ReadBoolProperty(object? instance, string propertyName)
    {
        return ReadObjectProperty(instance, propertyName) switch
        {
            bool value => value,
            _ => null
        };
    }

    private readonly record struct PlayabilitySnapshot(bool IsPlayable, ExportCombatCardUnplayable? Unplayable);
}
