using Godot;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;

namespace Sts2StateExport;

public sealed class CompendiumSubmenuFeature : IAgentFeature
{
    public int Order => 405;

    public bool TryPopulate(FeatureContext context, ExportState state)
    {
        NCompendiumSubmenu? submenu = SceneTraversal.FindFirstVisible<NCompendiumSubmenu>(context.Root);
        if (submenu is null)
        {
            return false;
        }

        Sts2Reflection reflection = context.Reflection;
        state.ScreenType = "compendium_submenu";
        state.MenuItems = new List<ExportMenuItem>
        {
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumCardLibraryField), "card_library", "Card Library"),
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumRelicCollectionField), "relic_collection", "Relic Collection"),
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumPotionLabField), "potion_lab", "Potion Lab"),
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumBestiaryField), "bestiary", "Bestiary"),
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumStatisticsField), "statistics", "Character Stats"),
            BuildMenuItem(reflection.ReadField<Control>(submenu, reflection.CompendiumRunHistoryField), "run_history", "Run History")
        }.Where(static item => item.Visible).ToList();
        state.Actions =
        [
            .. state.MenuItems
                .Where(static item => item.Enabled)
                .Select(item => $"compendium.{item.Id}"),
            "compendium.back"
        ];
        state.Notes = ["Compendium submenu is active."];
        return true;
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "compendium")
        {
            return false;
        }

        NCompendiumSubmenu submenu = context.RequireVisible<NCompendiumSubmenu>();
        Sts2Reflection reflection = context.Reflection;

        switch (command.Verb)
        {
            case "card_library":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenCardLibraryMethod, ResolveButton(submenu, reflection.CompendiumCardLibraryField));
                return true;
            case "relic_collection":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenRelicCollectionMethod, ResolveButton(submenu, reflection.CompendiumRelicCollectionField));
                return true;
            case "potion_lab":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenPotionLabMethod, ResolveButton(submenu, reflection.CompendiumPotionLabField));
                return true;
            case "bestiary":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenBestiaryMethod, ResolveButton(submenu, reflection.CompendiumBestiaryField));
                return true;
            case "statistics":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenStatisticsMethod, ResolveButton(submenu, reflection.CompendiumStatisticsField));
                return true;
            case "run_history":
                RuntimeInvoker.Invoke(submenu, reflection.CompendiumOpenRunHistoryMethod, ResolveButton(submenu, reflection.CompendiumRunHistoryField));
                return true;
            case "back":
                CloseSubmenu(submenu, reflection);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported compendium action '{command.RawAction}'.");
        }
    }

    private static ExportMenuItem BuildMenuItem(Control? button, string id, string label)
    {
        bool visible = button is not null && SceneTraversal.IsNodeVisible(button);
        return new ExportMenuItem
        {
            Id = id,
            Label = label,
            Visible = visible,
            Enabled = visible,
            Selected = button is not null && SceneTraversal.HasFocus(button)
        };
    }

    private static object ResolveButton(NCompendiumSubmenu submenu, System.Reflection.FieldInfo? fieldInfo)
    {
        return submenu.GetType()
            .GetField(fieldInfo?.Name ?? string.Empty, System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public)?
            .GetValue(submenu)
            ?? throw new InvalidOperationException("Compendium button is unavailable.");
    }

    private static void CloseSubmenu(NSubmenu submenu, Sts2Reflection reflection)
    {
        NSubmenuStack stack = reflection.ReadField<NSubmenuStack>(submenu, reflection.SubmenuStackField)
            ?? throw new InvalidOperationException("Submenu stack is unavailable.");
        RuntimeInvoker.Invoke(stack, reflection.SubmenuStackPopMethod);
    }
}
