import { readDisplayState, sendAction } from './command-client.ts';
import type { DeckInspectionResult, DisplayState, PileInspectionResult, RuntimeCommandOptions } from './types.ts';

function isDeckScreen(state: DisplayState | null | undefined): boolean {
  return state?.screenType === 'deck_view' || state?.screenType === 'card_pile';
}

function resolveDeckCloseAction(state: DisplayState | null | undefined): string | null {
  const actions = state?.actions ?? [];
  if (actions.includes('card_pile.close')) {
    return 'card_pile.close';
  }

  if (actions.includes('top_bar.deck')) {
    return 'top_bar.deck';
  }

  return null;
}

function isMatchingPileScreen(state: DisplayState | null | undefined, pileType: 'draw' | 'discard' | 'exhaust'): boolean {
  return state?.screenType === 'card_pile'
    && state.cardBrowse?.pileType?.toLowerCase() === pileType;
}

export async function inspectDeck(options: RuntimeCommandOptions = {}): Promise<DeckInspectionResult> {
  const sourceState = await readDisplayState();
  if (!sourceState) {
    throw new Error('Cannot inspect deck without a live in-run state.');
  }

  const results: DeckInspectionResult['results'] = [];
  const sourceScreenType = sourceState.screenType ?? null;

  let deckState = sourceState;
  if (!isDeckScreen(deckState)) {
    const opened = await sendAction('top_bar.deck', options);
    results.push(opened);
    deckState = opened.state ?? null;
  }

  if (!isDeckScreen(deckState)) {
    throw new Error(`Deck inspect expected deck_view or card_pile, got '${deckState?.screenType ?? 'unknown'}'.`);
  }

  let restoredState = deckState;
  const closeAction = resolveDeckCloseAction(deckState);
  if (closeAction) {
    const closed = await sendAction(closeAction, options);
    results.push(closed);
    restoredState = closed.state ?? null;
  }

  return {
    ok: true,
    actionCount: results.length,
    results,
    state: restoredState,
    deckState,
    sourceScreenType,
    restoredScreenType: restoredState?.screenType ?? deckState.screenType ?? null,
  };
}

export async function inspectPile(
  pileType: 'draw' | 'discard' | 'exhaust',
  options: RuntimeCommandOptions = {},
): Promise<PileInspectionResult> {
  const sourceState = await readDisplayState();
  if (!sourceState) {
    throw new Error(`Cannot inspect ${pileType} pile without a live in-run state.`);
  }

  const results: PileInspectionResult['results'] = [];
  const sourceScreenType = sourceState.screenType ?? null;
  const openAction = `combat.open_pile:${pileType}`;

  let pileState = sourceState;
  if (!isMatchingPileScreen(pileState, pileType)) {
    if (!(sourceState.actions ?? []).includes(openAction)) {
      throw new Error(`Cannot inspect ${pileType} pile from screen '${sourceScreenType ?? 'unknown'}'; action ${openAction} is unavailable.`);
    }

    const opened = await sendAction(openAction, options);
    results.push(opened);
    pileState = opened.state ?? null;
  }

  if (!isMatchingPileScreen(pileState, pileType)) {
    throw new Error(`Pile inspect expected ${pileType} card_pile, got '${pileState?.screenType ?? 'unknown'}'.`);
  }

  let restoredState = pileState;
  const closeAction = resolveDeckCloseAction(pileState);
  if (closeAction) {
    const closed = await sendAction(closeAction, options);
    results.push(closed);
    restoredState = closed.state ?? null;
  }

  return {
    ok: true,
    actionCount: results.length,
    results,
    state: restoredState,
    pileState,
    pileType: pileState.cardBrowse?.pileType ?? null,
    sourceScreenType,
    restoredScreenType: restoredState?.screenType ?? pileState.screenType ?? null,
  };
}
