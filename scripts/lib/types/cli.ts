export type OptionValue = string | boolean | number;
export type OptionMap = Record<string, OptionValue>;

export interface ParsedArgs {
  positional: string[];
  options: OptionMap;
}

export interface RuntimeCommandOptions extends Record<string, string | boolean | number | undefined> {
  id?: string;
  easy?: boolean | string;
  hard?: boolean | string;
  full?: boolean | string;
  raw?: boolean | string;
  notes?: boolean | string;
  menu?: boolean | string;
  relics?: boolean | string;
  actions?: boolean | string;
  batch?: boolean | string;
  strict?: boolean | string;
  character?: string;
  seed?: string;
  act1?: string;
  waitTimeoutMs?: number | string;
  settleTimeoutMs?: number | string;
  followThroughTimeoutMs?: number | string;
  ['settle-timeout-ms']?: number | string;
  ['follow-through-timeout-ms']?: number | string;
}
