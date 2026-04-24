import { describe, expect, it } from 'vitest';
import { looksLikeEgyptianMobile } from '../../backend/src/utils/validators.js';

describe('Egyptian phone validation regex', () => {
  it('accepts Egyptian mobile formats', () => {
    expect(looksLikeEgyptianMobile('01012345678')).toBe(true);
    expect(looksLikeEgyptianMobile('+201012345678')).toBe(true);
  });

  it('rejects non-mobile or malformed values', () => {
    expect(looksLikeEgyptianMobile('021012345678')).toBe(false);
    expect(looksLikeEgyptianMobile('1234')).toBe(false);
    expect(looksLikeEgyptianMobile('')).toBe(false);
  });
});
