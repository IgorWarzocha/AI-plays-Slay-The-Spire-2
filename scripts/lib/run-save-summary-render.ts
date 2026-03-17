import type { RunSummary } from './run-save-summary-types.ts';

function formatNode(node: { type: string | null | undefined; coord: { col: number; row: number } }): string {
  return `${node.type} @ (${node.coord.col},${node.coord.row})`;
}

function formatMapRows(summary: RunSummary): string[] {
  const points = Array.isArray(summary.screen?.map?.points) ? summary.screen.map.points : [];
  const rows = new Map<number, typeof points>();

  for (const point of points) {
    const existing = rows.get(point.row) ?? [];
    existing.push(point);
    rows.set(point.row, existing);
  }

  return [...rows.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([row, nodes]) => {
      const text = nodes
        .sort((left, right) => left.col - right.col)
        .map((point) => {
          const flags = [point.state, point.travelable ? 'travelable' : null, point.canModify === false ? 'fixed' : null]
            .filter((value): value is string => Boolean(value))
            .join(',');
          return `${point.type}@${point.col},${point.row}${flags ? ` [${flags}]` : ''}`;
        })
        .join(' | ');
      return `  ${row}: ${text}`;
    });
}

function abbreviateNodeType(type: string | null | undefined): string {
  switch (String(type ?? '').toLowerCase()) {
    case 'monster':
      return 'M';
    case 'unknown':
      return '?';
    case 'elite':
      return 'E';
    case 'rest_site':
    case 'restsite':
      return 'R';
    case 'shop':
      return '$';
    case 'treasure':
      return 'T';
    case 'boss':
      return 'B';
    case 'ancient':
      return 'A';
    default:
      return String(type ?? '?');
  }
}

function formatRouteCounts(counts: RunSummary['position']['routeOptions'][number]['previews'][number]['counts']): string {
  const parts = [
    counts.monsters > 0 ? `M${counts.monsters}` : null,
    counts.unknowns > 0 ? `?${counts.unknowns}` : null,
    counts.elites > 0 ? `E${counts.elites}` : null,
    counts.rests > 0 ? `R${counts.rests}` : null,
    counts.shops > 0 ? `$${counts.shops}` : null,
    counts.treasures > 0 ? `T${counts.treasures}` : null,
  ].filter((value): value is string => value !== null);

  return parts.join(' ');
}

function formatRoutePath(path: RunSummary['position']['routeOptions'][number]['previews'][number]['path']): string {
  return path
    .map((node) => `${abbreviateNodeType(node.type)}@${node.coord.col},${node.coord.row}`)
    .join(' -> ');
}

export function printRunSummary(summary: RunSummary, options: { full?: boolean } = {}): void {
  const currentNode = summary.position.currentNode;
  const nextNodes = summary.position.nextNodes;
  const full = options.full === true;

  console.log(`Save: ${summary.savePath}`);
  console.log(`Saved: ${summary.saveTimeIso ?? 'unknown'}`);
  console.log(`Run: ${summary.player.characterShortId} A${summary.ascension} in ${summary.act.shortId}`);
  console.log(`Floor: ${summary.position.currentFloor}${summary.position.nextFloor != null ? ` -> next ${summary.position.nextFloor}` : ''}`);
  console.log(`Boss: ${summary.act.bossShortId ?? summary.act.bossId ?? 'unknown'}`);
  console.log(`Vitals: HP ${summary.player.currentHp}/${summary.player.maxHp}, Gold ${summary.player.gold}, Energy ${summary.player.maxEnergy}`);
  console.log(`Relics: ${summary.player.relics.map((relic) => relic.shortId).join(', ') || '(none)'}`);
  console.log(`Deck: ${summary.player.deckCount} cards`);
  console.log(`Current node: ${currentNode ? formatNode(currentNode) : 'unknown'}`);

  if (nextNodes.length > 0) {
    console.log(`Next nodes: ${nextNodes.map(formatNode).join(' | ')}`);
  } else {
    console.log('Next nodes: none');
  }

  if (summary.position.routeOptions.length > 0) {
    console.log('Route options to boss:');
    for (const option of summary.position.routeOptions) {
      console.log(`- ${formatNode(option.start)}:`);
      for (const preview of option.previews) {
        const counts = formatRouteCounts(preview.counts);
        console.log(`  - ${formatRoutePath(preview.path)}${counts ? ` [${counts}]` : ''}`);
      }
    }
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
    const relicText = full
      ? summary.screen.relics.map((relic) => `${relic.label}${Number.isFinite(relic.count) ? ` x${relic.count}` : ''}: ${relic.description ?? ''}`)
      : summary.screen.relics.map((relic) => `${relic.label}${Number.isFinite(relic.count) ? ` x${relic.count}` : ''}`);
    console.log(`Runtime relics: ${relicText.join(' | ')}`);
  }

  if (summary.screen.potions && summary.screen.potions.length > 0) {
    const potionText = summary.screen.potions.map((potion) => {
      const base = `${potion.slotIndex ?? '?'}:${potion.title ?? potion.id ?? 'Unknown'}`;
      if (!full) {
        return base;
      }

      return `${base}${potion.description ? `: ${potion.description}` : ''}`;
    }).join(' | ');
    console.log(`Potions: ${potionText}`);
  }

  if (summary.screen.map?.visible) {
    const travelable = Array.isArray(summary.screen.map.points)
      ? summary.screen.map.points
        .filter((point) => point.travelable)
        .map((point) => `${point.type} @ (${point.col},${point.row})`)
        .join(' | ')
      : '';
    console.log(`Map: travelEnabled=${Boolean(summary.screen.map.travelEnabled)}, traveling=${Boolean(summary.screen.map.traveling)}${travelable ? `, Travelable ${travelable}` : ''}`);

    if (full) {
      console.log('Map rows:');
      for (const line of formatMapRows(summary)) {
        console.log(line);
      }
    }
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

  if (full) {
    console.log(`Deck list: ${summary.player.deck.map((card) => `${card.shortId}${card.upgraded ? '+' : ''}`).join(' | ')}`);
  }
}
