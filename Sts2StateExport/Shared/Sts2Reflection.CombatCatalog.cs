using System.Reflection;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Potions;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.Shops;
using MegaCrit.Sts2.Core.Nodes.TopBar;

namespace Sts2StateExport;

public sealed partial class Sts2Reflection
{
    public MethodInfo? MerchantInventoryCloseMethod { get; } = GetMethod<NMerchantInventory>("Close", 0);
    public MethodInfo? MerchantSlotOnReleasedMethod { get; } = GetMethod<NMerchantSlot>("OnReleased", 0);
    public MethodInfo? MerchantRoomHideScreenMethod { get; } = GetMethod<NMerchantRoom>("HideScreen", 1);
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

    public PropertyInfo? MapPointIsTravelableProperty { get; } = GetProperty<NMapPoint>("IsTravelable");
    public PropertyInfo? TopBarMapButtonHotkeysProperty { get; } = GetProperty<NTopBarMapButton>("Hotkeys");
    public PropertyInfo? TopBarDeckButtonHotkeysProperty { get; } = GetProperty<NTopBarDeckButton>("Hotkeys");
    public PropertyInfo? TopBarPauseButtonHotkeysProperty { get; } = GetProperty<NTopBarPauseButton>("Hotkeys");

    private void ValidateCombatCatalog()
    {
        RequireProperty(MapPointIsTravelableProperty, nameof(MapPointIsTravelableProperty));
        RequireProperty(TopBarMapButtonHotkeysProperty, nameof(TopBarMapButtonHotkeysProperty));
        RequireProperty(TopBarDeckButtonHotkeysProperty, nameof(TopBarDeckButtonHotkeysProperty));
        RequireProperty(TopBarPauseButtonHotkeysProperty, nameof(TopBarPauseButtonHotkeysProperty));

        RequireMethod(MerchantInventoryCloseMethod, nameof(MerchantInventoryCloseMethod));
        RequireMethod(MerchantSlotOnReleasedMethod, nameof(MerchantSlotOnReleasedMethod));
        RequireMethod(MerchantRoomHideScreenMethod, nameof(MerchantRoomHideScreenMethod));
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
    }
}
