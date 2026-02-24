/**
 * Format a number as South African Rand with 2 decimal places.
 */
export function formatCurrency(value: number): string {
  return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a number as a percentage with 2 decimal places.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
