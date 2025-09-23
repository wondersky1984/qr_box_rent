const units: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export const parseDurationMs = (input: string | number | undefined, fallbackMs: number): number => {
  if (!input) return fallbackMs;
  if (typeof input === 'number') return input;
  const match = /^([0-9]+)(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  const unit = match[2];
  return value * (units[unit] ?? fallbackMs);
};
