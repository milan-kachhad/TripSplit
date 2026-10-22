import axios from 'axios';

<<<<<<< HEAD
export const CONVERSION_FEE_PERCENT = 2.0; // 2% forex conversion markup fee

=======
// Realistic fallback rates to INR if live API is temporarily unreachable or rate-limited
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
const FALLBACK_RATES_TO_INR = {
  INR: 1.0,
  USD: 86.5,
  EUR: 93.8,
  GBP: 110.2,
  THB: 2.5,
  AED: 23.55,
};

<<<<<<< HEAD
=======
/**
 * Converts foreign currency amount to INR (or specified target currency).
 * If fromCurrency is 'INR', returns amount directly without making an API call.
 * 
 * @param {number|string} amount 
 * @param {string} fromCurrency 
 * @param {string} toCurrency 
 * @returns {Promise<{ convertedAmount: number, exchangeRate: number, currency: string }>}
 */
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
export async function convertCurrency(amount, fromCurrency = 'INR', toCurrency = 'INR') {
  const numericAmount = parseFloat(amount) || 0;
  const from = (fromCurrency || 'INR').trim().toUpperCase();
  const to = (toCurrency || 'INR').trim().toUpperCase();

<<<<<<< HEAD
  if (from === to || from === 'INR') {
    return {
      convertedAmount: numericAmount,
      baseConvertedAmount: numericAmount,
      conversionFee: 0,
      feePercentage: 0,
=======
  // If fromCurrency is INR (or matches target), return directly without network call
  if (from === to || from === 'INR') {
    return {
      convertedAmount: numericAmount,
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
      exchangeRate: 1.0,
      currency: from,
    };
  }

<<<<<<< HEAD
  let rate = null;

=======
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
  try {
    // 1. Fetch live rates with fromCurrency as base (e.g. 1 USD = X INR)
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, {
      timeout: 5000,
    });

    if (response.data?.rates?.[to]) {
<<<<<<< HEAD
      rate = Number(response.data.rates[to]);
=======
      const rate = Number(response.data.rates[to]);
      const converted = Math.round(numericAmount * rate * 100) / 100;
      return {
        convertedAmount: converted,
        exchangeRate: Math.round(rate * 10000) / 10000,
        currency: from,
      };
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    }
  } catch (err) {
    console.warn(`[Currency Warning] Live API failed for ${from}->${to}: ${err.message}. Trying inverse.`);
  }

<<<<<<< HEAD
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
=======
  try {
    // 2. Fetch using INR as base
    const inrResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/INR', {
      timeout: 5000,
    });
    if (inrResponse.data?.rates?.[from]) {
      const inverseRate = Number(inrResponse.data.rates[from]);
      if (inverseRate > 0) {
        const rate = 1 / inverseRate;
        const converted = Math.round(numericAmount * rate * 100) / 100;
        return {
          convertedAmount: converted,
          exchangeRate: Math.round(rate * 10000) / 10000,
          currency: from,
        };
      }
    }
  } catch (err) {
    console.warn(`[Currency Warning] Inverse INR rate failed: ${err.message}. Using fallback.`);
  }

  // 3. Reliable offline fallback rate
  const fallbackRate = FALLBACK_RATES_TO_INR[from] || 1.0;
  const converted = Math.round(numericAmount * fallbackRate * 100) / 100;
  return {
    convertedAmount: converted,
    exchangeRate: fallbackRate,
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    currency: from,
  };
}

export default convertCurrency;
