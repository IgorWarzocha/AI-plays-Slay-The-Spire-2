const STYLE_TAGS = [
  'center',
  'left',
  'right',
  'gold',
  'blue',
  'green',
  'red',
  'purple',
  'orange',
  'white',
  'black',
  'gray',
  'grey',
  'small',
  'tiny',
  'large',
  'bold',
  'italic',
  'b',
  'i',
  'u',
  'jitter',
  'sine',
  'rainbow',
  'aqua',
] as const;

const STYLE_TAG_PATTERN = new RegExp(`\\[(?:\\/?(?:${STYLE_TAGS.join('|')}))\\]`, 'gi');
const ENERGY_ICON_PATTERN = /(?:\[img\][^\[]*?energy_icon[^\[]*?\[\/img\])+/gi;
const SINGLE_ENERGY_ICON_PATTERN = /\[img\][^\[]*?energy_icon[^\[]*?\[\/img\]/gi;

export function normalizeGameText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let normalized = value;

  normalized = normalized.replace(ENERGY_ICON_PATTERN, (match) => {
    const count = (match.match(SINGLE_ENERGY_ICON_PATTERN) ?? []).length;
    return count <= 1 ? '1 Energy' : `${count} Energy`;
  });

  normalized = normalized.replace(/\[energy:(\d+)\]/gi, (_match, amount: string) => `${amount} Energy`);
  normalized = normalized.replace(STYLE_TAG_PATTERN, '');
  normalized = normalized.replace(/\[InCombat\]/gi, '');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return null;
  }

  normalized = normalized.replace(/\b0\s+1\s+Energy\b/gi, '0-cost');
  return normalized.trim() || null;
}

export function normalizeGameTextList(values: readonly string[] | null | undefined): string[] {
  return (values ?? [])
    .map((value) => normalizeGameText(value))
    .filter((value): value is string => Boolean(value));
}
