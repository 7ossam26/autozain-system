// numeral_system: 'western' (1,2,3) or 'arabic' (١,٢,٣)
// The current setting is read from a module-level variable refreshed by setNumeralSystem().
let _numeralSystem = 'western';

export function setNumeralSystem(system) {
  _numeralSystem = system === 'arabic' ? 'arabic' : 'western';
}

function toLocale() {
  return _numeralSystem === 'arabic' ? 'ar-EG' : 'en-US';
}

export function formatNumber(value) {
  if (value == null) return '';
  return Number(value).toLocaleString(toLocale());
}

export function formatEGP(amount) {
  if (amount == null) return '';
  return `${formatNumber(amount)} ج.م`;
}

export function formatKm(value) {
  if (value == null) return '';
  return `${formatNumber(value)} كم`;
}
