import type { RunSummary } from './run-save-summary-types.ts';

export function printRunSummary(summary: RunSummary): void {
  const currentNode = summary.position.currentNode;
  const nextNodes = summary.position.nextNodes;

  console.log(`Save: ${summary.savePath}`);
  console.log(`Saved: ${summary.saveTimeIso ?? 'unknown'}`);
  console.log(`Run: ${summary.player.characterShortId} A${summary.ascension} in ${summary.act.shortId}`);
  console.log(`Vitals: HP ${summary.player.currentHp}/${summary.player.maxHp}, Gold ${summary.player.gold}, Energy ${summary.player.maxEnergy}`);
  console.log(`Relics: ${summary.player.relics.map((relic) => relic.shortId).join(', ') || '(none)'}`);
  console.log(`Deck: ${summary.player.deckCount} cards`);
  console.log(`Current node: ${currentNode ? `${currentNode.type} @ (${currentNode.coord.col},${currentNode.coord.row})` : 'unknown'}`);

  if (nextNodes.length > 0) {
    console.log(`Next nodes: ${nextNodes.map((node) => `${node.type} @ (${node.coord.col},${node.coord.row})`).join(' | ')}`);
  } else {
    console.log('Next nodes: none');
  }

  if (!summary.screen) {
    return;
  }

  console.log(`Screen: ${summary.screen.screenType ?? 'unknown'}${summary.screen.actions.length > 0 ? ` [${summary.screen.actions.join(', ')}]` : ''}`);

  if (summary.screen.eventTitle) {
    console.log(`Event: ${summary.screen.eventTitle}`);
  }

  if (summary.screen.eventDescription) {
    console.log(`Event text: ${summary.screen.eventDescription}`);
  }

  if (summary.screen.menuItems.length > 0) {
    console.log(`Items: ${summary.screen.menuItems.map((item) => {
      const title = item.label ?? item.id ?? '(untitled)';
      const flags = [item.enabled ? null : 'disabled', item.selected ? 'selected' : null]
        .filter((value): value is string => value !== null)
        .join(', ');
      return `${title}${flags ? ` [${flags}]` : ''}`;
    }).join(' | ')}`);
  }

  if (summary.screen.topBar?.visible) {
    const buttonText = Array.isArray(summary.screen.topBar.buttons)
      ? summary.screen.topBar.buttons
        .map((button) => `${(button as { label?: string }).label ?? button.id}${button.selected ? ' [open]' : ''}`)
        .join(' | ')
      : '';
    console.log(`Top bar: HP ${summary.screen.topBar.currentHp ?? '?'}/${summary.screen.topBar.maxHp ?? '?'}, Gold ${summary.screen.topBar.gold ?? '?'}${buttonText ? `, Buttons ${buttonText}` : ''}`);
  }

  if (summary.screen.relics && summary.screen.relics.length > 0) {
    console.log(`Runtime relics: ${summary.screen.relics.map((relic) => `${relic.label}${Number.isFinite(relic.count) ? ` x${relic.count}` : ''}`).join(' | ')}`);
  }

  if (summary.screen.map?.visible) {
    const travelable = Array.isArray(summary.screen.map.points)
      ? summary.screen.map.points
        .filter((point) => point.travelable)
        .map((point) => `${point.type} @ (${point.col},${point.row})`)
        .join(' | ')
      : '';
    console.log(`Map: travelEnabled=${Boolean(summary.screen.map.travelEnabled)}, traveling=${Boolean(summary.screen.map.traveling)}${travelable ? `, Travelable ${travelable}` : ''}`);
  }

  if (summary.screen.cardBrowse) {
    const previewCards = Array.isArray(summary.screen.cardBrowse.cards)
      ? summary.screen.cardBrowse.cards
        .slice(0, 8)
        .map((card) => `${card.title ?? card.id}${card.costText ? `(${card.costText})` : ''}${card.upgraded ? '+' : ''}`)
        .join(' | ')
      : '';
    const sortText = Array.isArray(summary.screen.cardBrowse.sorts)
      ? summary.screen.cardBrowse.sorts.map((sort) => sort.label ?? '').filter(Boolean).join(' | ')
      : '';
    console.log(`Browse: ${summary.screen.cardBrowse.title} (${summary.screen.cardBrowse.cardCount ?? '?'} cards)${sortText ? `, Sorts ${sortText}` : ''}`);

    if (previewCards) {
      console.log(`Browse cards: ${previewCards}`);
    }
  }

  if (summary.screen.combat) {
    const creatures = Array.isArray(summary.screen.combat.creatures)
      ? summary.screen.combat.creatures
        .map((creature) => {
          const intentText = Array.isArray(creature.intents) && creature.intents.length > 0
            ? ` -> ${creature.intents.map((intent) => intent.kind).join(', ')}`
            : '';
          return `${creature.name} ${creature.currentHp}/${creature.maxHp}${creature.block ? ` +${creature.block}` : ''}${intentText}`;
        })
        .join(' | ')
      : '';
    const hand = Array.isArray(summary.screen.combat.hand)
      ? summary.screen.combat.hand
        .map((card) => `${card.title ?? card.id}${card.costText ? `(${card.costText})` : ''}${card.isPlayable ? '' : ' [locked]'}`)
        .join(' | ')
      : '';

    console.log(`Combat: round=${summary.screen.combat.roundNumber ?? '?'}, side=${summary.screen.combat.currentSide ?? '?'}, energy=${summary.screen.combat.energy ?? '?'}, draw=${summary.screen.combat.drawPileCount ?? '?'}, discard=${summary.screen.combat.discardPileCount ?? '?'}, exhaust=${summary.screen.combat.exhaustPileCount ?? '?'}, endTurn=${Boolean(summary.screen.combat.canEndTurn)}`);

    if (creatures) {
      console.log(`Creatures: ${creatures}`);
    }

    if (hand) {
      console.log(`Hand: ${hand}`);
    }
  }

  if (summary.screen.characters && summary.screen.characters.length > 0) {
    console.log(`Characters: ${summary.screen.characters.map((character) => `${character.id}${character.isLocked ? ' [locked]' : ''}${character.isSelected ? ' [selected]' : ''}`).join(' | ')}`);
  }
}
