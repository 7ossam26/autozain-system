import { describe, expect, it } from 'vitest';
import { calculateSaleFinancials, requireWholeEgp } from '../../backend/src/utils/financial.js';

describe('financial calculations', () => {
  it('calculates dealership revenue, tax amount, and net profit with integer math', () => {
    const result = calculateSaleFinancials({
      finalSalePrice: 250000,
      sellerReceived: 220000,
      employeeCommission: 5000,
      taxPercentage: 14,
    });

    expect(result).toEqual({
      dealershipRevenue: 30000,
      taxAmount: 4200,
      netProfit: 20800,
    });
  });

  it('rejects decimal EGP amounts instead of truncating them', () => {
    expect(requireWholeEgp('150000.50')).toBeNull();
    expect(requireWholeEgp('150000')).toBe(150000);
  });
});
