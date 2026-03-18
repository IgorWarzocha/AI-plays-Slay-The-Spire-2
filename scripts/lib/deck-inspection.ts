import { readDisplayState, sendAction } from './command-client.ts';
import type { DeckInspectionResult, DisplayState, RuntimeCommandOptions } from './types.ts';

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
