using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;

namespace Sts2StateExport;

// STS2 uses several specialized card-selection screens. Resolving them here
// keeps the feature itself small and makes it easy to add future selectors.
public static class CardSelectionScreenResolver
{
    public static CardSelectionScreenBinding? TryResolve(FeatureContext context)
    {
        return Resolve<NDeckUpgradeSelectScreen>(
                context,
                "upgrade")
            ?? Resolve<NDeckTransformSelectScreen>(
                context,
                "transform")
            ?? Resolve<NDeckEnchantSelectScreen>(
                context,
                "enchant")
            ?? Resolve<NDeckCardSelectScreen>(
                context,
                "deck")
            ?? Resolve<NSimpleCardSelectScreen>(
                context,
                "simple");
    }

    private static CardSelectionScreenBinding? Resolve<TScreen>(FeatureContext context, string kind) where TScreen : Control
    {
        TScreen? screen = SceneTraversal.FindFirstVisible<TScreen>(context.Root);
        if (screen is null)
        {
            return null;
        }

        MethodInfo onCardClickedMethod = ResolveMethod(screen, "OnCardClicked", typeof(CardModel));
        MethodInfo? confirmSelectionMethod = ResolveOptionalMethod(screen, "ConfirmSelection");
        MethodInfo? closeSelectionMethod = ResolveOptionalMethod(screen, "CloseSelection")
            ?? ResolveOptionalMethod(screen, "CancelSelection")
            ?? ResolveOptionalMethod(screen, "CompleteSelection");

        return new CardSelectionScreenBinding
        {
            Screen = screen,
            Kind = kind,
            Prompt = ReadLabelText(screen, "_infoLabel"),
            OnCardClickedMethod = onCardClickedMethod,
            ConfirmSelectionMethod = confirmSelectionMethod,
            CloseSelectionMethod = closeSelectionMethod,
            CanConfirm = confirmSelectionMethod is not null && SceneTraversal.FindAllVisible<NConfirmButton>(screen).Count > 0,
            CanClose = closeSelectionMethod is not null && SceneTraversal.FindAllVisible<NBackButton>(screen).Count > 0
        };
    }

    private static string? ReadLabelText(Control screen, string fieldName)
    {
        Node? node = ReadNode(screen, fieldName);
        return node is null ? null : NodeTextReader.ReadVisibleTexts(node, 1).FirstOrDefault();
    }

    private static Node? ReadNode(Control screen, string fieldName)
    {
        FieldInfo? field = screen.GetType().GetField(
            fieldName,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        return field?.GetValue(screen) as Node;
    }

    private static MethodInfo ResolveMethod(Control screen, string name, params Type[] parameterTypes)
    {
        return ResolveOptionalMethod(screen, name, parameterTypes)
            ?? throw new InvalidOperationException(
                $"Selection screen '{screen.GetType().Name}' is missing method '{name}'.");
    }

    private static MethodInfo? ResolveOptionalMethod(Control screen, string name, params Type[] parameterTypes)
    {
        return screen.GetType().GetMethod(
            name,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic,
            binder: null,
            types: parameterTypes,
            modifiers: null);
    }
}
