import axios from 'axios';

export const CONVERSION_FEE_PERCENT = 2.0; // 2% forex conversion markup fee

const FALLBACK_RATES_TO_INR = {
  INR: 1.0,
  USD: 86.5,
  EUR: 93.8,
  GBP: 110.2,
  THB: 2.5,
  AED: 23.55,
};

export async function convertCurrency(amount, fromCurrency = 'INR', toCurrency = 'INR') {
  const numericAmount = parseFloat(amount) || 0;
  const from = (fromCurrency || 'INR').trim().toUpperCase();
  const to = (toCurrency || 'INR').trim().toUpperCase();

  if (from === to || from === 'INR') {
    return {
      convertedAmount: numericAmount,
      baseConvertedAmount: numericAmount,
      conversionFee: 0,
      feePercentage: 0,
      exchangeRate: 1.0,
      currency: from,
    };
  }

  let rate = null;

  try {
    // 1. Fetch live rates with fromCurrency as base (e.g. 1 USD = X INR)
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, {
      timeout: 5000,
    });

    if (response.data?.rates?.[to]) {
      rate = Number(response.data.rates[to]);
    }
  } catch (err) {
    console.warn(`[Currency Warning] Live API failed for ${from}->${to}: ${err.message}. Trying inverse.`);
  }

  if (!rate) {
    try {
      // 2. Fetch using INR as base
      const inrResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/INR', {
        timeout: 5000,
      });
      if (inrResponse.data?.rates?.[from]) {
        const inverseRate = Number(inrResponse.data.rates[from]);
        if (inverseRate > 0) {
          rate = 1 / inverseRate;
        }
      }
    } catch (err) {
      console.warn(`[Currency Warning] Inverse INR rate failed: ${err.message}. Using fallback.`);
    }
  }

  // 3. Reliable offline fallback rate
  if (!rate) {
    rate = FALLBACK_RATES_TO_INR[from] || 1.0;
  }

  const baseConvertedAmount = Math.round(numericAmount * rate * 100) / 100;
  const conversionFee = Math.round(baseConvertedAmount * (CONVERSION_FEE_PERCENT / 100) * 100) / 100;
  const finalTotalAmount = Math.round((baseConvertedAmount + conversionFee) * 100) / 100;

  return {
    convertedAmount: finalTotalAmount,
    baseConvertedAmount,
    conversionFee,
    feePercentage: CONVERSION_FEE_PERCENT,
    exchangeRate: Math.round(rate * 10000) / 10000,
    currency: from,
  };
}

export default convertCurrency;
