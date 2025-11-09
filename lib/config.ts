export function getDailyClaimLabel(): string {
  // Prefer a combined env var first
  const combined = process.env.NEXT_PUBLIC_DAILY_CLAIM_AMOUNT;
  if (combined && combined.trim().length > 0) return combined.trim();

  // Otherwise allow separate value + units
  const value = process.env.NEXT_PUBLIC_DAILY_CLAIM_AMOUNT_VALUE;
  const units = process.env.NEXT_PUBLIC_DAILY_CLAIM_AMOUNT_UNITS;
  if (value) {
    return units ? `${value} ${units}` : String(value);
  }

  // Default fallback
  return '100,000 $TRIV';
}
