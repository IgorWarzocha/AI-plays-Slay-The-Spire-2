using System.Reflection;
using MegaCrit.Sts2.Core.Multiplayer.Game.Lobby;
using MegaCrit.Sts2.Core.Nodes.Cards;
using MegaCrit.Sts2.Core.Nodes.Events;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;
using MegaCrit.Sts2.Core.Nodes.Screens.CustomRun;
using MegaCrit.Sts2.Core.Nodes.Screens.GameOverScreen;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.ProfileScreen;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.RunHistoryScreen;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.RestSite;
using MegaCrit.Sts2.Core.Nodes.TopBar;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Relics;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;
using MegaCrit.Sts2.Core.Nodes.Screens.TreasureRoomRelic;
using MegaCrit.Sts2.Core.Runs;

namespace Sts2StateExport;

// Reflection lookups are centralized here so we have one audited place for
// private API usage and parameter-count-sensitive overload selection.
public sealed class Sts2Reflection
{
    public FieldInfo? MainMenuContinueField { get; } = GetField<NMainMenu>("_continueButton");
    public FieldInfo? MainMenuAbandonField { get; } = GetField<NMainMenu>("_abandonRunButton");
    public FieldInfo? MainMenuSingleplayerField { get; } = GetField<NMainMenu>("_singleplayerButton");
    public FieldInfo? MainMenuMultiplayerField { get; } = GetField<NMainMenu>("_multiplayerButton");
    public FieldInfo? MainMenuTimelineField { get; } = GetField<NMainMenu>("_timelineButton");
    public FieldInfo? MainMenuSettingsField { get; } = GetField<NMainMenu>("_settingsButton");
    public FieldInfo? MainMenuCompendiumField { get; } = GetField<NMainMenu>("_compendiumButton");
    public FieldInfo? MainMenuQuitField { get; } = GetField<NMainMenu>("_quitButton");
    public FieldInfo? MainMenuLastHitField { get; } = GetField<NMainMenu>("_lastHitButton");

    public FieldInfo? SingleplayerStandardField { get; } = GetField<NSingleplayerSubmenu>("_standardButton");
    public FieldInfo? SingleplayerDailyField { get; } = GetField<NSingleplayerSubmenu>("_dailyButton");
    public FieldInfo? SingleplayerCustomField { get; } = GetField<NSingleplayerSubmenu>("_customButton");
    public FieldInfo? CompendiumCardLibraryField { get; } = GetField<NCompendiumSubmenu>("_cardLibraryButton");
    public FieldInfo? CompendiumRelicCollectionField { get; } = GetField<NCompendiumSubmenu>("_relicCollectionButton");
    public FieldInfo? CompendiumPotionLabField { get; } = GetField<NCompendiumSubmenu>("_potionLabButton");
    public FieldInfo? CompendiumBestiaryField { get; } = GetField<NCompendiumSubmenu>("_bestiaryButton");
    public FieldInfo? CompendiumStatisticsField { get; } = GetField<NCompendiumSubmenu>("_statisticsButton");
    public FieldInfo? CompendiumRunHistoryField { get; } = GetField<NCompendiumSubmenu>("_runHistoryButton");
    public FieldInfo? SubmenuStackField { get; } = GetField<NSubmenu>("_stack");

    public FieldInfo? RunHistoryPrevButtonField { get; } = GetField<NRunHistory>("_prevButton");
    public FieldInfo? RunHistoryNextButtonField { get; } = GetField<NRunHistory>("_nextButton");
    public FieldInfo? RunHistoryHistoryField { get; } = GetField<NRunHistory>("_history");
    public FieldInfo? RunHistoryIndexField { get; } = GetField<NRunHistory>("_index");
    public FieldInfo? RunHistoryRunNamesField { get; } = GetField<NRunHistory>("_runNames");
    public FieldInfo? RunHistorySelectedPlayerIconField { get; } = GetField<NRunHistory>("_selectedPlayerIcon");
    public FieldInfo? RunHistoryDeckHistoryField { get; } = GetField<NRunHistory>("_deckHistory");
    public FieldInfo? RunHistoryRelicHistoryField { get; } = GetField<NRunHistory>("_relicHistory");
    public FieldInfo? DeckHistoryEntryAmountField { get; } = GetField<NDeckHistoryEntry>("_amount");
    public FieldInfo? RelicBasicHolderModelField { get; } = GetField<NRelicBasicHolder>("_model");

    public FieldInfo? ProfileButtonsField { get; } = GetField<NProfileScreen>("_profileButtons");
    public FieldInfo? ProfileIdField { get; } = GetField<NProfileButton>("_profileId");
    public FieldInfo? ProfileCurrentIndicatorField { get; } = GetField<NProfileButton>("_currentProfileIndicator");

    public FieldInfo? CharacterSelectedButtonField { get; } = GetField<NCharacterSelectScreen>("_selectedButton");
    public FieldInfo? CharacterEmbarkButtonField { get; } = GetField<NCharacterSelectScreen>("_embarkButton");

    public FieldInfo? CustomSelectedButtonField { get; } = GetField<NCustomRunScreen>("_selectedButton");
    public FieldInfo? CustomConfirmButtonField { get; } = GetField<NCustomRunScreen>("_confirmButton");

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

    public MethodInfo? MainMenuContinueMethod { get; } = GetMethod<NMainMenu>("OnContinueButtonPressed", 1);
    public MethodInfo? MainMenuTextButtonOnReleaseMethod { get; } = GetMethod<NMainMenuTextButton>("OnRelease", 0);
    public MethodInfo? MainMenuTimelineMethod { get; } = GetMethod<NMainMenu>("OpenTimelineScreen", 1);
    public MethodInfo? MainMenuCompendiumMethod { get; } = GetMethod<NMainMenu>("OpenCompendiumSubmenu", 1);
    public MethodInfo? SingleplayerOpenCharacterMethod { get; } = GetMethod<NSingleplayerSubmenu>("OpenCharacterSelect", 1);
    public MethodInfo? SingleplayerOpenDailyMethod { get; } = GetMethod<NSingleplayerSubmenu>("OpenDailyScreen", 0);
    public MethodInfo? SingleplayerOpenCustomMethod { get; } = GetMethod<NSingleplayerSubmenu>("OpenCustomScreen", 1);
    public MethodInfo? CompendiumOpenCardLibraryMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenCardLibrary", 1);
    public MethodInfo? CompendiumOpenRelicCollectionMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenRelicCollection", 1);
    public MethodInfo? CompendiumOpenPotionLabMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenPotionLab", 1);
    public MethodInfo? CompendiumOpenBestiaryMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenBestiary", 1);
    public MethodInfo? CompendiumOpenStatisticsMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenStatistics", 1);
    public MethodInfo? CompendiumOpenRunHistoryMethod { get; } = GetMethod<NCompendiumSubmenu>("OpenRunHistory", 1);
    public MethodInfo? SubmenuStackPopMethod { get; } = GetMethod<NSubmenuStack>("Pop", 0);
    public MethodInfo? RunHistoryPrevMethod { get; } = GetMethod<NRunHistory>("OnLeftButtonButtonReleased", 1);
    public MethodInfo? RunHistoryNextMethod { get; } = GetMethod<NRunHistory>("OnRightButtonButtonReleased", 1);
    public MethodInfo? ProfileSwitchMethod { get; } = GetMethod<NProfileButton>("SwitchToThisProfile", 0);
    public MethodInfo? CharacterEmbarkMethod { get; } = GetMethod<NCharacterSelectScreen>("OnEmbarkPressed", 1);
    public MethodInfo? CustomEmbarkMethod { get; } = GetMethod<NCustomRunScreen>("OnEmbarkPressed", 1);
    public MethodInfo? EventFallbackDescriptionMethod { get; } = GetMethod<NEventRoom>("GetDescriptionOrFallback", 0);
    public MethodInfo? CardGridOnCardClickedMethod { get; } = GetMethod<NCardGridSelectionScreen>("OnCardClicked", 1);
    public MethodInfo? CardGridConfirmSelectionMethod { get; } = GetMethod<NCardGridSelectionScreen>("ConfirmSelection", 0);
    public MethodInfo? DeckViewOnObtainedSortMethod { get; } = GetMethod<NDeckViewScreen>("OnObtainedSort", 1);
    public MethodInfo? DeckViewOnCardTypeSortMethod { get; } = GetMethod<NDeckViewScreen>("OnCardTypeSort", 1);
    public MethodInfo? DeckViewOnCostSortMethod { get; } = GetMethod<NDeckViewScreen>("OnCostSort", 1);
    public MethodInfo? DeckViewOnAlphabetSortMethod { get; } = GetMethod<NDeckViewScreen>("OnAlphabetSort", 1);
    public MethodInfo? CardPileReturnMethod { get; } = GetMethod<NCardPileScreen>("OnReturnButtonPressed", 1);
    public MethodInfo? MerchantInventoryCloseMethod { get; } = GetMethod<NMerchantInventory>("Close", 0);
    public MethodInfo? MerchantSlotOnReleasedMethod { get; } = GetMethod<NMerchantSlot>("OnReleased", 0);
    public MethodInfo? MerchantRoomHideScreenMethod { get; } = GetMethod<NMerchantRoom>("HideScreen", 1);
    public MethodInfo? RestSiteButtonOnReleaseMethod { get; } = GetMethod<NRestSiteButton>("OnRelease", 0);
    public MethodInfo? RestSiteProceedMethod { get; } = GetMethod<NRestSiteRoom>("OnProceedButtonReleased", 1);
    public MethodInfo? TreasureChestReleasedMethod { get; } = GetMethod<NTreasureRoom>("OnChestButtonReleased", 1);
    public MethodInfo? TreasureProceedMethod { get; } = GetMethod<NTreasureRoom>("OnProceedButtonReleased", 1);
    public MethodInfo? TreasureRelicPickMethod { get; } = GetMethod<NTreasureRoomRelicCollection>("PickRelic", 1);
    public MethodInfo? MapTravelToCoordMethod { get; } = GetMethod<NMapScreen>("TravelToMapCoord", 1);
    public MethodInfo? TopBarMapButtonOnReleaseMethod { get; } = GetMethod<NTopBarMapButton>("OnRelease", 0);
    public MethodInfo? TopBarMapButtonIsOpenMethod { get; } = GetMethod<NTopBarMapButton>("IsOpen", 0);
    public MethodInfo? TopBarDeckButtonOnReleaseMethod { get; } = GetMethod<NTopBarDeckButton>("OnRelease", 0);
    public MethodInfo? TopBarDeckButtonIsOpenMethod { get; } = GetMethod<NTopBarDeckButton>("IsOpen", 0);
    public MethodInfo? TopBarPauseButtonOnReleaseMethod { get; } = GetMethod<NTopBarPauseButton>("OnRelease", 0);
    public MethodInfo? TopBarPauseButtonIsOpenMethod { get; } = GetMethod<NTopBarPauseButton>("IsOpen", 0);
    public MethodInfo? PotionHolderUseMethod { get; } = GetMethod<NPotionHolder>("UsePotion", 0);
    public MethodInfo? PotionHolderDiscardMethod { get; } = GetMethod<NPotionHolder>("DiscardPotion", 0);
    public MethodInfo? CombatEndTurnOnReleaseMethod { get; } = GetMethod<NEndTurnButton>("OnRelease", 0);
    public MethodInfo? CombatEndTurnCanTurnBeEndedMethod { get; } = GetMethod<NEndTurnButton>("get_CanTurnBeEnded", 0);
    public MethodInfo? CombatPileOnReleaseMethod { get; } = GetMethod<NCombatCardPile>("OnRelease", 0);
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

    public PropertyInfo? MapPointIsTravelableProperty { get; } = GetProperty<NMapPoint>("IsTravelable");
    public PropertyInfo? TopBarMapButtonHotkeysProperty { get; } = GetProperty<NTopBarMapButton>("Hotkeys");
    public PropertyInfo? TopBarDeckButtonHotkeysProperty { get; } = GetProperty<NTopBarDeckButton>("Hotkeys");
    public PropertyInfo? TopBarPauseButtonHotkeysProperty { get; } = GetProperty<NTopBarPauseButton>("Hotkeys");

    public void ValidateOrThrow()
    {
        RequireField(MainMenuLastHitField, nameof(MainMenuLastHitField));
        RequireField(MainMenuContinueField, nameof(MainMenuContinueField));
        RequireField(MainMenuSingleplayerField, nameof(MainMenuSingleplayerField));
        RequireField(MainMenuMultiplayerField, nameof(MainMenuMultiplayerField));
        RequireField(MainMenuTimelineField, nameof(MainMenuTimelineField));
        RequireField(MainMenuSettingsField, nameof(MainMenuSettingsField));
        RequireField(MainMenuCompendiumField, nameof(MainMenuCompendiumField));
        RequireField(SingleplayerStandardField, nameof(SingleplayerStandardField));
        RequireField(SingleplayerDailyField, nameof(SingleplayerDailyField));
        RequireField(SingleplayerCustomField, nameof(SingleplayerCustomField));
        RequireField(CompendiumCardLibraryField, nameof(CompendiumCardLibraryField));
        RequireField(CompendiumRelicCollectionField, nameof(CompendiumRelicCollectionField));
        RequireField(CompendiumPotionLabField, nameof(CompendiumPotionLabField));
        RequireField(CompendiumBestiaryField, nameof(CompendiumBestiaryField));
        RequireField(CompendiumStatisticsField, nameof(CompendiumStatisticsField));
        RequireField(CompendiumRunHistoryField, nameof(CompendiumRunHistoryField));
        RequireField(SubmenuStackField, nameof(SubmenuStackField));
        RequireField(RunHistoryPrevButtonField, nameof(RunHistoryPrevButtonField));
        RequireField(RunHistoryNextButtonField, nameof(RunHistoryNextButtonField));
        RequireField(RunHistoryHistoryField, nameof(RunHistoryHistoryField));
        RequireField(RunHistoryIndexField, nameof(RunHistoryIndexField));
        RequireField(RunHistoryRunNamesField, nameof(RunHistoryRunNamesField));
        RequireField(RunHistorySelectedPlayerIconField, nameof(RunHistorySelectedPlayerIconField));
        RequireField(RunHistoryDeckHistoryField, nameof(RunHistoryDeckHistoryField));
        RequireField(RunHistoryRelicHistoryField, nameof(RunHistoryRelicHistoryField));
        RequireField(DeckHistoryEntryAmountField, nameof(DeckHistoryEntryAmountField));
        RequireField(RelicBasicHolderModelField, nameof(RelicBasicHolderModelField));
        RequireField(ProfileButtonsField, nameof(ProfileButtonsField));
        RequireField(ProfileIdField, nameof(ProfileIdField));
        RequireField(ProfileCurrentIndicatorField, nameof(ProfileCurrentIndicatorField));
        RequireField(CharacterSelectedButtonField, nameof(CharacterSelectedButtonField));
        RequireField(CharacterEmbarkButtonField, nameof(CharacterEmbarkButtonField));
        RequireField(CustomSelectedButtonField, nameof(CustomSelectedButtonField));
        RequireField(CustomConfirmButtonField, nameof(CustomConfirmButtonField));
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
        RequireProperty(MapPointIsTravelableProperty, nameof(MapPointIsTravelableProperty));
        RequireProperty(TopBarMapButtonHotkeysProperty, nameof(TopBarMapButtonHotkeysProperty));
        RequireProperty(TopBarDeckButtonHotkeysProperty, nameof(TopBarDeckButtonHotkeysProperty));
        RequireProperty(TopBarPauseButtonHotkeysProperty, nameof(TopBarPauseButtonHotkeysProperty));

        RequireMethod(MainMenuContinueMethod, nameof(MainMenuContinueMethod));
        RequireMethod(MainMenuTextButtonOnReleaseMethod, nameof(MainMenuTextButtonOnReleaseMethod));
        RequireMethod(MainMenuTimelineMethod, nameof(MainMenuTimelineMethod));
        RequireMethod(MainMenuCompendiumMethod, nameof(MainMenuCompendiumMethod));
        RequireMethod(SingleplayerOpenCharacterMethod, nameof(SingleplayerOpenCharacterMethod));
        RequireMethod(SingleplayerOpenDailyMethod, nameof(SingleplayerOpenDailyMethod));
        RequireMethod(SingleplayerOpenCustomMethod, nameof(SingleplayerOpenCustomMethod));
        RequireMethod(CompendiumOpenCardLibraryMethod, nameof(CompendiumOpenCardLibraryMethod));
        RequireMethod(CompendiumOpenRelicCollectionMethod, nameof(CompendiumOpenRelicCollectionMethod));
        RequireMethod(CompendiumOpenPotionLabMethod, nameof(CompendiumOpenPotionLabMethod));
        RequireMethod(CompendiumOpenBestiaryMethod, nameof(CompendiumOpenBestiaryMethod));
        RequireMethod(CompendiumOpenStatisticsMethod, nameof(CompendiumOpenStatisticsMethod));
        RequireMethod(CompendiumOpenRunHistoryMethod, nameof(CompendiumOpenRunHistoryMethod));
        RequireMethod(SubmenuStackPopMethod, nameof(SubmenuStackPopMethod));
        RequireMethod(RunHistoryPrevMethod, nameof(RunHistoryPrevMethod));
        RequireMethod(RunHistoryNextMethod, nameof(RunHistoryNextMethod));
        RequireMethod(ProfileSwitchMethod, nameof(ProfileSwitchMethod));
        RequireMethod(CharacterEmbarkMethod, nameof(CharacterEmbarkMethod));
        RequireMethod(CustomEmbarkMethod, nameof(CustomEmbarkMethod));
        RequireMethod(EventFallbackDescriptionMethod, nameof(EventFallbackDescriptionMethod));
        RequireMethod(DeckViewOnObtainedSortMethod, nameof(DeckViewOnObtainedSortMethod));
        RequireMethod(DeckViewOnCardTypeSortMethod, nameof(DeckViewOnCardTypeSortMethod));
        RequireMethod(DeckViewOnCostSortMethod, nameof(DeckViewOnCostSortMethod));
        RequireMethod(DeckViewOnAlphabetSortMethod, nameof(DeckViewOnAlphabetSortMethod));
        RequireMethod(CardPileReturnMethod, nameof(CardPileReturnMethod));
        RequireMethod(MerchantInventoryCloseMethod, nameof(MerchantInventoryCloseMethod));
        RequireMethod(MerchantSlotOnReleasedMethod, nameof(MerchantSlotOnReleasedMethod));
        RequireMethod(MerchantRoomHideScreenMethod, nameof(MerchantRoomHideScreenMethod));
        RequireMethod(RestSiteButtonOnReleaseMethod, nameof(RestSiteButtonOnReleaseMethod));
        RequireMethod(RestSiteProceedMethod, nameof(RestSiteProceedMethod));
        RequireMethod(TreasureChestReleasedMethod, nameof(TreasureChestReleasedMethod));
        RequireMethod(TreasureProceedMethod, nameof(TreasureProceedMethod));
        RequireMethod(TreasureRelicPickMethod, nameof(TreasureRelicPickMethod));
        RequireMethod(MapTravelToCoordMethod, nameof(MapTravelToCoordMethod));
        RequireMethod(TopBarMapButtonOnReleaseMethod, nameof(TopBarMapButtonOnReleaseMethod));
        RequireMethod(TopBarMapButtonIsOpenMethod, nameof(TopBarMapButtonIsOpenMethod));
        RequireMethod(TopBarDeckButtonOnReleaseMethod, nameof(TopBarDeckButtonOnReleaseMethod));
        RequireMethod(TopBarDeckButtonIsOpenMethod, nameof(TopBarDeckButtonIsOpenMethod));
        RequireMethod(TopBarPauseButtonOnReleaseMethod, nameof(TopBarPauseButtonOnReleaseMethod));
        RequireMethod(TopBarPauseButtonIsOpenMethod, nameof(TopBarPauseButtonIsOpenMethod));
        RequireMethod(PotionHolderUseMethod, nameof(PotionHolderUseMethod));
        RequireMethod(PotionHolderDiscardMethod, nameof(PotionHolderDiscardMethod));
        RequireMethod(CombatEndTurnOnReleaseMethod, nameof(CombatEndTurnOnReleaseMethod));
        RequireMethod(CombatEndTurnCanTurnBeEndedMethod, nameof(CombatEndTurnCanTurnBeEndedMethod));
        RequireMethod(CombatPileOnReleaseMethod, nameof(CombatPileOnReleaseMethod));
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
    }

    public T? ReadField<T>(object instance, FieldInfo? fieldInfo)
    {
        if (fieldInfo?.GetValue(instance) is not T value)
        {
            return default;
        }

        return value;
    }

    public T? ReadProperty<T>(object instance, PropertyInfo? propertyInfo)
    {
        if (propertyInfo?.GetValue(instance) is not T value)
        {
            return default;
        }

        return value;
    }

    private static FieldInfo? GetField<T>(string name)
    {
        return typeof(T).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static PropertyInfo? GetProperty<T>(string name)
    {
        return typeof(T).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static PropertyInfo? GetPropertyByDeclaringType(string fullName, string name)
    {
        Type? declaringType = Type.GetType($"{fullName}, sts2");
        return declaringType?.GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
    }

    private static MethodInfo? GetMethod<T>(string name, int parameterCount)
    {
        MethodInfo[] matches = typeof(T)
            .GetMethods(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Where(method => method.Name == name && method.GetParameters().Length == parameterCount)
            .ToArray();

        return matches.Length switch
        {
            0 => null,
            1 => matches[0],
            _ => throw new InvalidOperationException(
                $"Reflection catalog is ambiguous for {typeof(T).FullName}.{name} with {parameterCount} parameters.")
        };
    }

    private static void RequireField(FieldInfo? fieldInfo, string propertyName)
    {
        if (fieldInfo is null)
        {
            throw new InvalidOperationException($"Required reflected field '{propertyName}' is missing.");
        }
    }

    private static void RequireMethod(MethodInfo? methodInfo, string propertyName)
    {
        if (methodInfo is null)
        {
            throw new InvalidOperationException($"Required reflected method '{propertyName}' is missing.");
        }
    }

    private static void RequireProperty(PropertyInfo? propertyInfo, string propertyName)
    {
        if (propertyInfo is null)
        {
            throw new InvalidOperationException($"Required reflected property '{propertyName}' is missing.");
        }
    }
}
