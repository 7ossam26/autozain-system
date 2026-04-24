// UI formatters. Numeral system toggle (western ↔ arabic-indic) lands in Phase 3 via settings.

export function formatEGP(amount) {
  if (amount == null) return '';
  return `${Number(amount).toLocaleString('en-US')} ج.م`;
}

export function formatKm(value) {
  if (value == null) return '';
  return `${Number(value).toLocaleString('en-US')} كم`;
}
