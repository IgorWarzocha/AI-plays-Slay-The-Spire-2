using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Events;
using MegaCrit.Sts2.Core.Nodes.RestSite;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Nodes.Screens.GameOverScreen;
using MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.TreasureRoomRelic;

namespace Sts2StateExport;

public sealed partial class Sts2Reflection
{
    public FieldInfo? EventField { get; } = GetField<NEventRoom>("_event");
    public FieldInfo? ConnectedOptionsField { get; } = GetField<NEventRoom>("_connectedOptions");
    public PropertyInfo? AncientGeneratedOptionsProperty { get; } = GetPropertyByDeclaringType("MegaCrit.Sts2.Core.Models.AncientEventModel", "GeneratedOptions");
    public FieldInfo? CardGridConfirmButtonField { get; } = GetField<NCardGridSelectionScreen>("_selectModeConfirmButton");
    public FieldInfo? DeckViewObtainedSorterField { get; } = GetField<NDeckViewScreen>("_obtainedSorter");
    public FieldInfo? DeckViewTypeSorterField { get; } = GetField<NDeckViewScreen>("_typeSorter");
    public FieldInfo? DeckViewCostSorterField { get; } = GetField<NDeckViewScreen>("_costSorter");
    public FieldInfo? DeckViewAlphabetSorterField { get; } = GetField<NDeckViewScreen>("_alphabetSorter");
    public FieldInfo? RewardsProceedButtonField { get; } = GetField<NRewardsScreen>("_proceedButton");
    public FieldInfo? CardPileBackButtonField { get; } = GetField<NCardPileScreen>("_backButton");
    public FieldInfo? TreasureChestButtonField { get; } = GetField<NTreasureRoom>("_chestButton");
    public FieldInfo? TreasureRelicCollectionField { get; } = GetField<NTreasureRoom>("_relicCollection");
    public FieldInfo? GameOverContinueButtonField { get; } = GetField<NGameOverScreen>("_continueButton");
    public FieldInfo? GameOverMainMenuButtonField { get; } = GetField<NGameOverScreen>("_mainMenuButton");
    public FieldInfo? PauseMenuResumeButtonField { get; } = GetField<NPauseMenu>("_resumeButton");
    public FieldInfo? PauseMenuSaveAndQuitButtonField { get; } = GetField<NPauseMenu>("_saveAndQuitButton");
    public FieldInfo? PauseMenuSettingsButtonField { get; } = GetField<NPauseMenu>("_settingsButton");
    public FieldInfo? PauseMenuCompendiumButtonField { get; } = GetField<NPauseMenu>("_compendiumButton");
    public FieldInfo? PauseMenuGiveUpButtonField { get; } = GetField<NPauseMenu>("_giveUpButton");

    public MethodInfo? EventFallbackDescriptionMethod { get; } = GetMethod<NEventRoom>("GetDescriptionOrFallback", 0);
    public MethodInfo? CardGridOnCardClickedMethod { get; } = GetMethod<NCardGridSelectionScreen>("OnCardClicked", 1);
    public MethodInfo? CardGridConfirmSelectionMethod { get; } = GetMethod<NCardGridSelectionScreen>("ConfirmSelection", 0);
    public MethodInfo? DeckViewOnObtainedSortMethod { get; } = GetMethod<NDeckViewScreen>("OnObtainedSort", 1);
    public MethodInfo? DeckViewOnCardTypeSortMethod { get; } = GetMethod<NDeckViewScreen>("OnCardTypeSort", 1);
    public MethodInfo? DeckViewOnCostSortMethod { get; } = GetMethod<NDeckViewScreen>("OnCostSort", 1);
    public MethodInfo? DeckViewOnAlphabetSortMethod { get; } = GetMethod<NDeckViewScreen>("OnAlphabetSort", 1);
    public MethodInfo? CardPileReturnMethod { get; } = GetMethod<NCardPileScreen>("OnReturnButtonPressed", 1);
    public MethodInfo? RewardButtonOnReleaseMethod { get; } = GetMethod<NRewardButton>("OnRelease", 0);
    public MethodInfo? ProceedButtonOnReleaseMethod { get; } = GetMethod<NProceedButton>("OnRelease", 0);
    public MethodInfo? RewardsOnProceedButtonPressedMethod { get; } = GetMethod<NRewardsScreen>("OnProceedButtonPressed", 1);
    public MethodInfo? CardRewardSelectCardMethod { get; } = GetMethod<NCardRewardSelectionScreen>("SelectCard", 1);
    public MethodInfo? CardRewardAlternateSelectedMethod { get; } = GetMethod<NCardRewardSelectionScreen>("OnAlternateRewardSelected", 1);
    public MethodInfo? GameOverContinuePressMethod { get; } = GetMethod<NGameOverContinueButton>("OnPress", 0);
    public MethodInfo? GameOverMainMenuPressMethod { get; } = GetMethod<NReturnToMainMenuButton>("OnPress", 0);
    public MethodInfo? PauseMenuResumeMethod { get; } = GetMethod<NPauseMenu>("OnBackOrResumeButtonPressed", 1);
    public MethodInfo? PauseMenuSaveAndQuitMethod { get; } = GetMethod<NPauseMenu>("OnSaveAndQuitButtonPressed", 1);
    public MethodInfo? PauseMenuSettingsMethod { get; } = GetMethod<NPauseMenu>("OnSettingsButtonPressed", 1);
    public MethodInfo? PauseMenuCompendiumMethod { get; } = GetMethod<NPauseMenu>("OnCompendiumButtonPressed", 1);
    public MethodInfo? PauseMenuGiveUpMethod { get; } = GetMethod<NPauseMenu>("OnGiveUpButtonPressed", 1);
    public MethodInfo? RestSiteButtonOnReleaseMethod { get; } = GetMethod<NRestSiteButton>("OnRelease", 0);
    public MethodInfo? RestSiteProceedMethod { get; } = GetMethod<NRestSiteRoom>("OnProceedButtonReleased", 1);
    public MethodInfo? TreasureChestReleasedMethod { get; } = GetMethod<NTreasureRoom>("OnChestButtonReleased", 1);
    public MethodInfo? TreasureProceedMethod { get; } = GetMethod<NTreasureRoom>("OnProceedButtonReleased", 1);
    public MethodInfo? TreasureRelicPickMethod { get; } = GetMethod<NTreasureRoomRelicCollection>("PickRelic", 1);

    private void ValidateScreenInteractionCatalog()
    {
        RequireField(EventField, nameof(EventField));
        RequireField(ConnectedOptionsField, nameof(ConnectedOptionsField));
        RequireProperty(AncientGeneratedOptionsProperty, nameof(AncientGeneratedOptionsProperty));
        RequireField(DeckViewObtainedSorterField, nameof(DeckViewObtainedSorterField));
        RequireField(DeckViewTypeSorterField, nameof(DeckViewTypeSorterField));
        RequireField(DeckViewCostSorterField, nameof(DeckViewCostSorterField));
        RequireField(DeckViewAlphabetSorterField, nameof(DeckViewAlphabetSorterField));
        RequireField(RewardsProceedButtonField, nameof(RewardsProceedButtonField));
        RequireField(CardPileBackButtonField, nameof(CardPileBackButtonField));
        RequireField(TreasureChestButtonField, nameof(TreasureChestButtonField));
        RequireField(TreasureRelicCollectionField, nameof(TreasureRelicCollectionField));
        RequireField(GameOverContinueButtonField, nameof(GameOverContinueButtonField));
        RequireField(GameOverMainMenuButtonField, nameof(GameOverMainMenuButtonField));
        RequireField(PauseMenuResumeButtonField, nameof(PauseMenuResumeButtonField));
        RequireField(PauseMenuSaveAndQuitButtonField, nameof(PauseMenuSaveAndQuitButtonField));
        RequireField(PauseMenuSettingsButtonField, nameof(PauseMenuSettingsButtonField));
        RequireField(PauseMenuCompendiumButtonField, nameof(PauseMenuCompendiumButtonField));
        RequireField(PauseMenuGiveUpButtonField, nameof(PauseMenuGiveUpButtonField));

        RequireMethod(EventFallbackDescriptionMethod, nameof(EventFallbackDescriptionMethod));
        RequireMethod(DeckViewOnObtainedSortMethod, nameof(DeckViewOnObtainedSortMethod));
        RequireMethod(DeckViewOnCardTypeSortMethod, nameof(DeckViewOnCardTypeSortMethod));
        RequireMethod(DeckViewOnCostSortMethod, nameof(DeckViewOnCostSortMethod));
        RequireMethod(DeckViewOnAlphabetSortMethod, nameof(DeckViewOnAlphabetSortMethod));
        RequireMethod(CardPileReturnMethod, nameof(CardPileReturnMethod));
        RequireMethod(RewardButtonOnReleaseMethod, nameof(RewardButtonOnReleaseMethod));
        RequireMethod(ProceedButtonOnReleaseMethod, nameof(ProceedButtonOnReleaseMethod));
        RequireMethod(RewardsOnProceedButtonPressedMethod, nameof(RewardsOnProceedButtonPressedMethod));
        RequireMethod(CardRewardSelectCardMethod, nameof(CardRewardSelectCardMethod));
        RequireMethod(CardRewardAlternateSelectedMethod, nameof(CardRewardAlternateSelectedMethod));
        RequireMethod(GameOverContinuePressMethod, nameof(GameOverContinuePressMethod));
        RequireMethod(GameOverMainMenuPressMethod, nameof(GameOverMainMenuPressMethod));
        RequireMethod(PauseMenuResumeMethod, nameof(PauseMenuResumeMethod));
        RequireMethod(PauseMenuSaveAndQuitMethod, nameof(PauseMenuSaveAndQuitMethod));
        RequireMethod(PauseMenuSettingsMethod, nameof(PauseMenuSettingsMethod));
        RequireMethod(PauseMenuCompendiumMethod, nameof(PauseMenuCompendiumMethod));
        RequireMethod(PauseMenuGiveUpMethod, nameof(PauseMenuGiveUpMethod));
        RequireMethod(RestSiteButtonOnReleaseMethod, nameof(RestSiteButtonOnReleaseMethod));
        RequireMethod(RestSiteProceedMethod, nameof(RestSiteProceedMethod));
        RequireMethod(TreasureChestReleasedMethod, nameof(TreasureChestReleasedMethod));
        RequireMethod(TreasureProceedMethod, nameof(TreasureProceedMethod));
        RequireMethod(TreasureRelicPickMethod, nameof(TreasureRelicPickMethod));
    }
}
