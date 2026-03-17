using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;
using MegaCrit.Sts2.Core.Nodes.Screens.CustomRun;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.ProfileScreen;

namespace Sts2StateExport;

public sealed partial class Sts2Reflection
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

    public FieldInfo? ProfileButtonsField { get; } = GetField<NProfileScreen>("_profileButtons");
    public FieldInfo? ProfileIdField { get; } = GetField<NProfileButton>("_profileId");
    public FieldInfo? ProfileCurrentIndicatorField { get; } = GetField<NProfileButton>("_currentProfileIndicator");

    public FieldInfo? CharacterSelectedButtonField { get; } = GetField<NCharacterSelectScreen>("_selectedButton");
    public FieldInfo? CharacterEmbarkButtonField { get; } = GetField<NCharacterSelectScreen>("_embarkButton");

    public FieldInfo? CustomSelectedButtonField { get; } = GetField<NCustomRunScreen>("_selectedButton");
    public FieldInfo? CustomConfirmButtonField { get; } = GetField<NCustomRunScreen>("_confirmButton");

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
    public MethodInfo? ProfileSwitchMethod { get; } = GetMethod<NProfileButton>("SwitchToThisProfile", 0);
    public MethodInfo? CharacterEmbarkMethod { get; } = GetMethod<NCharacterSelectScreen>("OnEmbarkPressed", 1);
    public MethodInfo? CustomEmbarkMethod { get; } = GetMethod<NCustomRunScreen>("OnEmbarkPressed", 1);

    private void ValidateMainMenuCatalog()
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
        RequireField(ProfileButtonsField, nameof(ProfileButtonsField));
        RequireField(ProfileIdField, nameof(ProfileIdField));
        RequireField(ProfileCurrentIndicatorField, nameof(ProfileCurrentIndicatorField));
        RequireField(CharacterSelectedButtonField, nameof(CharacterSelectedButtonField));
        RequireField(CharacterEmbarkButtonField, nameof(CharacterEmbarkButtonField));
        RequireField(CustomSelectedButtonField, nameof(CustomSelectedButtonField));
        RequireField(CustomConfirmButtonField, nameof(CustomConfirmButtonField));

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
        RequireMethod(ProfileSwitchMethod, nameof(ProfileSwitchMethod));
        RequireMethod(CharacterEmbarkMethod, nameof(CharacterEmbarkMethod));
        RequireMethod(CustomEmbarkMethod, nameof(CustomEmbarkMethod));
    }
}
