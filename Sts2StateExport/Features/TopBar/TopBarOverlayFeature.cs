using Godot;
using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.TopBar;
using MegaCrit.sts2.Core.Nodes.TopBar;

namespace Sts2StateExport;

// The top bar is visible across multiple primary screens, so it is exported as
// an overlay. This keeps run-state affordances stable while the main screen
// surface changes beneath it.
public sealed class TopBarOverlayFeature : IAgentOverlayFeature
{
    private static readonly Regex HpRegex = new(@"(?<current>\d+)\s*/\s*(?<max>\d+)", RegexOptions.Compiled);
    private static readonly Regex GoldRegex = new(@"-?\d+", RegexOptions.Compiled);

    public int Order => 100;

    public void Augment(FeatureContext context, ExportState state)
    {
        NTopBar? topBar = SceneTraversal.FindFirstVisible<NTopBar>(context.Root);
        if (topBar is null)
        {
            return;
        }

        state.TopBar = new ExportTopBar
        {
            Visible = true,
            CurrentHp = ReadCurrentHp(topBar.Hp),
            MaxHp = ReadMaxHp(topBar.Hp),
            Gold = ReadGold(topBar.Gold),
            Buttons = new List<ExportTopBarButton>
            {
                BuildButton(context, "map", "Map", topBar.Map, context.Reflection.TopBarMapButtonHotkeysProperty, context.Reflection.TopBarMapButtonIsOpenMethod),
                BuildButton(context, "deck", "Deck", topBar.Deck, context.Reflection.TopBarDeckButtonHotkeysProperty, context.Reflection.TopBarDeckButtonIsOpenMethod),
                BuildButton(context, "pause", "Pause", topBar.Pause, context.Reflection.TopBarPauseButtonHotkeysProperty, context.Reflection.TopBarPauseButtonIsOpenMethod)
            }
            .Where(static button => button.Visible)
            .ToList()
        };

        foreach (ExportTopBarButton button in state.TopBar.Buttons.Where(static button => button.Enabled))
        {
            string action = $"top_bar.{button.Id}";
            if (!state.Actions.Contains(action, StringComparer.Ordinal))
            {
                state.Actions.Add(action);
            }
        }

        NRelicInventory? relicInventory = SceneTraversal.FindFirstVisible<NRelicInventory>(context.Root);
        if (relicInventory is null)
        {
            return;
        }

        state.Relics = relicInventory.RelicNodes
            .Select(holder => holder.Relic?.Model)
            .Where(static model => model is not null)
            .Select(
                model => new ExportRelic
                {
                    Id = model!.GetType().Name,
                    Label = AgentText.SafeText(model.Title) ?? model.GetType().Name,
                    Description = AgentText.SafeText(model.Description),
                    Count = model.ShowCounter ? model.DisplayAmount : null,
                    Status = model.Status.ToString()
                })
            .ToList();
    }

    public bool TryExecute(FeatureContext context, ParsedCommand command)
    {
        if (command.Scope != "top_bar")
        {
            return false;
        }

        NTopBar topBar = context.RequireVisible<NTopBar>();
        switch (command.Verb)
        {
            case "map":
                RuntimeInvoker.Invoke(topBar.Map ?? throw new InvalidOperationException("Top bar map button is not available."), context.Reflection.TopBarMapButtonOnReleaseMethod);
                return true;
            case "deck":
                RuntimeInvoker.Invoke(topBar.Deck ?? throw new InvalidOperationException("Top bar deck button is not available."), context.Reflection.TopBarDeckButtonOnReleaseMethod);
                return true;
            case "pause":
                RuntimeInvoker.Invoke(topBar.Pause ?? throw new InvalidOperationException("Top bar pause button is not available."), context.Reflection.TopBarPauseButtonOnReleaseMethod);
                return true;
            default:
                throw new InvalidOperationException($"Unsupported top bar action '{command.RawAction}'.");
        }
    }

    private static ExportTopBarButton BuildButton(
        FeatureContext context,
        string id,
        string label,
        Node? node,
        System.Reflection.PropertyInfo? hotkeysProperty,
        System.Reflection.MethodInfo? isOpenMethod)
    {
        return new ExportTopBarButton
        {
            Id = id,
            Label = label,
            Visible = node is not null && SceneTraversal.IsNodeVisible(node),
            Enabled = node is not null && SceneTraversal.IsNodeVisible(node),
            Selected = node is not null && RuntimeInvoker.Invoke<bool>(node, isOpenMethod),
            Hotkeys = node is not null ? context.Reflection.ReadProperty<string[]>(node, hotkeysProperty)?.ToList() ?? [] : []
        };
    }

    private static int? ReadCurrentHp(NTopBarHp? hp)
    {
        Match? match = ReadFirstMatch(hp, HpRegex);
        return match?.Groups["current"].Success == true
            ? int.Parse(match.Groups["current"].Value)
            : null;
    }

    private static int? ReadMaxHp(NTopBarHp? hp)
    {
        Match? match = ReadFirstMatch(hp, HpRegex);
        return match?.Groups["max"].Success == true
            ? int.Parse(match.Groups["max"].Value)
            : null;
    }

    private static int? ReadGold(NTopBarGold? gold)
    {
        Match? match = ReadFirstMatch(gold, GoldRegex);
        return match is not null ? int.Parse(match.Value) : null;
    }

    private static Match? ReadFirstMatch(Node? node, Regex regex)
    {
        if (node is null)
        {
            return null;
        }

        foreach (string text in NodeTextReader.ReadVisibleTexts(node))
        {
            Match match = regex.Match(text);
            if (match.Success)
            {
                return match;
            }
        }

        return null;
    }
}
