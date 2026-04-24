import { describe, expect, it } from 'vitest';
import { formatEGP, formatNumber, setNumeralSystem } from '../../frontend/src/utils/formatters.js';

describe('numeral formatting utility', () => {
  it('formats western numerals and EGP suffix', () => {
    setNumeralSystem('western');

    expect(formatNumber(123456)).toBe('123,456');
    expect(formatEGP(123456)).toBe('123,456 ج.م');
  });

  it('switches to Arabic-Indic numeral display', () => {
    setNumeralSystem('arabic');

    expect(formatNumber(123456)).toMatch(/[١٢٣٤٥٦]/);
    expect(formatEGP(123456)).toContain('ج.م');

    setNumeralSystem('western');
  });
});
