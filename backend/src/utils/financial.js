export function requireWholeEgp(value, { min = 0 } = {}) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    if (!/^\d+$/.test(normalized)) return null;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < min) return null;
    return parsed;
  }

  if (!Number.isSafeInteger(value) || value < min) return null;
  return value;
}

export function calculateSaleFinancials({
  finalSalePrice,
  sellerReceived,
  employeeCommission = 0,
  taxPercentage = 0,
}) {
  const dealershipRevenue = finalSalePrice - sellerReceived;
  const taxAmount = Math.round((dealershipRevenue * Number(taxPercentage || 0)) / 100);
  const netProfit = dealershipRevenue - taxAmount - employeeCommission;

  return { dealershipRevenue, taxAmount, netProfit };
}
