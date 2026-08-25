/**
 * Shared helpers for Android / app-user APIs.
 */

/** Strip hyphens and non-alnum; keep at most 16 chars for DB storage. */
export function normalizeMachineNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
}

/** Display format: XXXX-XXXX-XXXX-XXXX */
export function formatMachineNumber(value: string): string {
  const cleaned = normalizeMachineNumber(value);
  const parts = cleaned.match(/.{1,4}/g);
  return parts ? parts.join('-') : '';
}

export function isValidMachineNumber(value: string): boolean {
  return /^[A-Za-z0-9]{16}$/.test(normalizeMachineNumber(value));
}
