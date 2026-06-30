// Parse a positive-integer query param. Guards against NaN/negative/float
// inputs that would otherwise flow into Prisma `skip`/`take` (e.g. `?page=abc`
// -> Number("abc") -> NaN -> `skip: NaN` throws). Absent/empty values use the
// fallback; out-of-range values are clamped to [min, max].
export function parsePositiveInt(
  value: string | null | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {}
) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
