function summarizeButton(button) {
  return {
    id: button.id,
    enabled: button.enabled,
    selected: button.selected,
  };
}

function summarizeRelicLabel(relic) {
  return relic.count == null ? relic.label : `${relic.label} (${relic.count})`;
}

function summarizeRelic(relic) {
  return {
    id: relic.id,
    label: relic.label,
    description: relic.description ?? null,
    count: relic.count ?? null,
    status: relic.status ?? null,
  };
}

function summarizeMenuItem(item) {
  return {
    id: item.id,
    label: item.label,
    description: item.description ?? null,
    enabled: item.enabled,
    selected: item.selected,
  };
}

function summarizeCombatCard(card) {
  return {
    id: card.id,
    title: card.title,
    cost: card.costText ?? null,
    description: card.description ?? null,
    playable: card.isPlayable,
    targets: card.validTargetIds ?? [],
  };
}

function summarizePotion(potion) {
  return {
    id: potion.id,
    title: potion.title,
    description: potion.description ?? null,
    usable: potion.isUsable,
    discardable: potion.canDiscard,
    usage: potion.usage ?? null,
    targets: potion.validTargetIds ?? [],
  };
}

function summarizeCreature(creature) {
  return {
    id: creature.id,
    name: creature.name,
    side: creature.side,
    hp: `${creature.currentHp}/${creature.maxHp}`,
    block: creature.block,
    powers: creature.powers ?? [],
    intents: creature.intents ?? [],
  };
}

function summarizeCombat(combat) {
  return {
    roundNumber: combat.roundNumber ?? null,
    currentSide: combat.currentSide ?? null,
    energy: combat.energy ?? null,
    handIsSettled: combat.handIsSettled ?? null,
    handMeta: combat.handIsSettled == null ? null : {
      active: combat.activeHandCount ?? null,
      total: combat.totalHandCount ?? null,
      pending: combat.pendingHandHolderCount ?? null,
      animating: combat.handAnimationActive ?? null,
      cardPlayInProgress: combat.cardPlayInProgress ?? null,
    },
    piles: {
      draw: combat.drawPileCount ?? null,
      discard: combat.discardPileCount ?? null,
      exhaust: combat.exhaustPileCount ?? null,
    },
    canEndTurn: combat.canEndTurn,
    selectionMode: combat.selectionMode ?? null,
    selectionPrompt: combat.selectionPrompt ?? null,
    hand: (combat.hand ?? []).map(summarizeCombatCard),
    potions: (combat.potions ?? []).map(summarizePotion),
    creatures: (combat.creatures ?? []).map(summarizeCreature),
  };
}

function summarizeMap(map) {
  return {
    visible: map.visible,
    travelEnabled: map.travelEnabled,
    traveling: map.traveling,
    points: (map.points ?? []).map((point) => ({
      id: point.id,
      coord: `${point.col},${point.row}`,
      type: point.type,
      state: point.state,
      travelable: point.travelable,
    })),
  };
}

function summarizeCardBrowse(cardBrowse) {
  return {
    kind: cardBrowse.kind,
    title: cardBrowse.title,
    pileType: cardBrowse.pileType ?? null,
    cardCount: cardBrowse.cardCount,
    canClose: cardBrowse.canClose,
    cards: (cardBrowse.cards ?? []).map((card) => ({
      id: card.id,
      title: card.title,
      cost: card.costText ?? null,
      upgraded: card.upgraded,
      description: card.description ?? null,
    })),
  };
}

function summarizeCharacter(character) {
  return {
    id: character.id,
    label: character.label,
    locked: character.isLocked,
    random: character.isRandom,
    selected: character.isSelected,
  };
}

function summarizeProfile(profile) {
  return {
    internalId: profile.internalId,
    displayId: profile.displayId,
    current: profile.isCurrent,
  };
}

export function buildGameplayView(state, options = {}) {
  if (!state) {
    return {
      screenType: null,
      updatedAtUtc: null,
      topBar: null,
      relics: [],
      actions: [],
      notes: [],
    };
  }

  if (options.raw) {
    return state;
  }

  const includeActions = options.actions !== false;
  const includeMenuItems = options.menu === true;
  const includeNotes = options.notes === true;
  const includeRelicDetails = options.relics === true;

  const view = {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: state.topBar ? {
      hp: state.topBar.currentHp == null || state.topBar.maxHp == null
        ? null
        : `${state.topBar.currentHp}/${state.topBar.maxHp}`,
      gold: state.topBar.gold ?? null,
      buttons: (state.topBar.buttons ?? []).map(summarizeButton),
    } : null,
    relics: includeRelicDetails
      ? (state.relics ?? []).map(summarizeRelic)
      : (state.relics ?? []).map(summarizeRelicLabel),
  };

  if (includeActions) {
    view.actions = state.actions ?? [];
  }

  if (includeNotes) {
    view.notes = state.notes ?? [];
  }

  switch (state.screenType) {
    case "profile":
      view.profiles = (state.profiles ?? []).map(summarizeProfile);
      break;
    case "character_select":
    case "custom_run":
      view.characters = (state.characters ?? []).map(summarizeCharacter);
      view.characterSelection = state.characterSelection ?? null;
      break;
    case "event":
      view.event = {
        title: state.eventTitle ?? null,
        description: state.eventDescription ?? null,
        options: (state.menuItems ?? []).map(summarizeMenuItem),
      };
      break;
    case "map":
      view.map = state.map ? summarizeMap(state.map) : null;
      break;
    case "combat_room":
    case "combat_card_select":
      view.combat = state.combat ? summarizeCombat(state.combat) : null;
      break;
    case "deck_view":
    case "card_pile":
      view.cardBrowse = state.cardBrowse ? summarizeCardBrowse(state.cardBrowse) : null;
      break;
    default:
      if (includeMenuItems || (state.menuItems ?? []).length > 0) {
        view.menuItems = (state.menuItems ?? []).map(summarizeMenuItem);
      }
      break;
  }

  return view;
}

export function buildCommandView(result, options = {}) {
  if (options.raw) {
    return result;
  }

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => ({
      action: entry.action,
      id: entry.id,
      ackStatus: entry.ackStatus ?? entry.ack?.status ?? null,
      screenType: entry.screenType ?? null,
    })),
    state: buildGameplayView(result.state, options),
  };
}

export function buildCombatView(state, options = {}) {
  if (!state) {
    return {
      screenType: null,
      updatedAtUtc: null,
      topBar: null,
      relics: [],
      notes: [],
      combat: null,
      actions: [],
    };
  }

  if (options.raw) {
    return state;
  }

  if (state.screenType !== "combat_room" && state.screenType !== "combat_card_select") {
    throw new Error(`Combat view requires a combat screen, received '${state.screenType ?? "unknown"}'.`);
  }

  return {
    screenType: state.screenType ?? null,
    updatedAtUtc: state.updatedAtUtc ?? null,
    topBar: state.topBar ? {
      hp: state.topBar.currentHp == null || state.topBar.maxHp == null
        ? null
        : `${state.topBar.currentHp}/${state.topBar.maxHp}`,
      gold: state.topBar.gold ?? null,
    } : null,
    relics: options.relics === true
      ? (state.relics ?? []).map(summarizeRelic)
      : (state.relics ?? []).map(summarizeRelicLabel),
    notes: options.notes === true ? (state.notes ?? []) : [],
    combat: state.combat ? summarizeCombat(state.combat) : null,
    actions: (state.actions ?? []).filter((action) =>
      action.startsWith("combat.") || action.startsWith("combat_card_select.")),
  };
}

export function buildCombatCommandView(result, options = {}) {
  if (options.raw) {
    return result;
  }

  return {
    ok: result.ok,
    actionCount: result.actionCount,
    actions: (result.results ?? []).map((entry) => ({
      action: entry.action,
      id: entry.id,
      ackStatus: entry.ackStatus ?? entry.ack?.status ?? null,
      screenType: entry.screenType ?? null,
    })),
    state: buildCombatView(result.state, options),
  };
}
