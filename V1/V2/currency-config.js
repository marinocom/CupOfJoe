// Currency configuration for the Coffee Price Tracker

// List of zero-decimal currencies (no cents/decimals)
const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', // Japanese Yen
  'KRW', // South Korean Won
  'VND', // Vietnamese Dong
  'CLP', // Chilean Peso
  'ISK', // Icelandic Króna
  'TWD', // New Taiwan Dollar
  'PYG', // Paraguayan Guaraní
  'UGX', // Ugandan Shilling
  'BIF', // Burundian Franc
  'DJF', // Djiboutian Franc
  'GNF', // Guinean Franc
  'KMF', // Comorian Franc
  'RWF', // Rwandan Franc
  'XAF', // Central African CFA Franc
  'XOF', // West African CFA Franc
  'XPF'  // CFP Franc
]);

// Country to currency mapping
const COUNTRY_TO_CURRENCY = {
  'US': 'USD', 'United States': 'USD',
  'CA': 'CAD', 'Canada': 'CAD',
  'GB': 'GBP', 'United Kingdom': 'GBP', 'UK': 'GBP',
  'AU': 'AUD', 'Australia': 'AUD',
  'NZ': 'NZD', 'New Zealand': 'NZD',
  'JP': 'JPY', 'Japan': 'JPY',
  'KR': 'KRW', 'South Korea': 'KRW', 'Korea': 'KRW',
  'CN': 'CNY', 'China': 'CNY',
  'IN': 'INR', 'India': 'INR',
  'SG': 'SGD', 'Singapore': 'SGD',
  'MY': 'MYR', 'Malaysia': 'MYR',
  'TH': 'THB', 'Thailand': 'THB',
  'ID': 'IDR', 'Indonesia': 'IDR',
  'PH': 'PHP', 'Philippines': 'PHP',
  'VN': 'VND', 'Vietnam': 'VND',
  'MX': 'MXN', 'Mexico': 'MXN',
  'BR': 'BRL', 'Brazil': 'BRL',
  'AR': 'ARS', 'Argentina': 'ARS',
  'CL': 'CLP', 'Chile': 'CLP',
  'CO': 'COP', 'Colombia': 'COP',
  'PE': 'PEN', 'Peru': 'PEN',
  'ZA': 'ZAR', 'South Africa': 'ZAR',
  'EG': 'EGP', 'Egypt': 'EGP',
  'NG': 'NGN', 'Nigeria': 'NGN',
  'KE': 'KES', 'Kenya': 'KES',
  'TU': 'TRY', 'Turkey': 'TRY', 'Türkiye': 'TRY',
  'RU': 'RUB', 'Russia': 'RUB',
  'PL': 'PLN', 'Poland': 'PLN',
  'CZ': 'CZK', 'Czech Republic': 'CZK', 'Czechia': 'CZK',
  'HU': 'HUF', 'Hungary': 'HUF',
  'RO': 'RON', 'Romania': 'RON',
  'SE': 'SEK', 'Sweden': 'SEK',
  'NO': 'NOK', 'Norway': 'NOK',
  'DK': 'DKK', 'Denmark': 'DKK',
  'CH': 'CHF', 'Switzerland': 'CHF',
  'IL': 'ILS', 'Israel': 'ILS',
  'AE': 'AED', 'United Arab Emirates': 'AED', 'UAE': 'AED',
  'SA': 'SAR', 'Saudi Arabia': 'SAR',
  'HK': 'HKD', 'Hong Kong': 'HKD',
  'TW': 'TWD', 'Taiwan': 'TWD',
  'IS': 'ISK', 'Iceland': 'ISK',
  // Euro countries
  'DE': 'EUR', 'Germany': 'EUR',
  'FR': 'EUR', 'France': 'EUR',
  'IT': 'EUR', 'Italy': 'EUR',
  'ES': 'EUR', 'Spain': 'EUR',
  'PT': 'EUR', 'Portugal': 'EUR',
  'NL': 'EUR', 'Netherlands': 'EUR',
  'BE': 'EUR', 'Belgium': 'EUR',
  'AT': 'EUR', 'Austria': 'EUR',
  'IE': 'EUR', 'Ireland': 'EUR',
  'FI': 'EUR', 'Finland': 'EUR',
  'GR': 'EUR', 'Greece': 'EUR',
  'LU': 'EUR', 'Luxembourg': 'EUR',
  'SK': 'EUR', 'Slovakia': 'EUR',
  'SI': 'EUR', 'Slovenia': 'EUR',
  'EE': 'EUR', 'Estonia': 'EUR',
  'LV': 'EUR', 'Latvia': 'EUR',
  'LT': 'EUR', 'Lithuania': 'EUR',
  'MT': 'EUR', 'Malta': 'EUR',
  'CY': 'EUR', 'Cyprus': 'EUR'
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  'USD': '$', 'CAD': 'CA$', 'AUD': 'A$', 'NZD': 'NZ$',
  'GBP': '£', 'EUR': '€', 'JPY': '¥', 'CNY': '¥',
  'KRW': '₩', 'INR': '₹', 'SGD': 'S$', 'MYR': 'RM',
  'THB': '฿', 'IDR': 'Rp', 'PHP': '₱', 'VND': '₫',
  'MXN': 'MX$', 'BRL': 'R$', 'ARS': 'AR$', 'CLP': 'CL$',
  'COP': 'CO$', 'PEN': 'S/', 'ZAR': 'R', 'EGP': 'E£',
  'NGN': '₦', 'KES': 'KSh', 'TRY': '₺', 'RUB': '₽',
  'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft', 'RON': 'lei',
  'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'CHF': 'CHF',
  'ILS': '₪', 'AED': 'د.إ', 'SAR': 'ر.س', 'HKD': 'HK$',
  'TWD': 'NT$', 'ISK': 'kr'
};

// Check if a currency uses zero decimals
function isZeroDecimalCurrency(currencyCode) {
  return ZERO_DECIMAL_CURRENCIES.has(currencyCode);
}

// Get currency code from country name or code
function getCurrencyFromCountry(countryString) {
  if (!countryString) return 'USD';
  
  // Try direct lookup
  if (COUNTRY_TO_CURRENCY[countryString]) {
    return COUNTRY_TO_CURRENCY[countryString];
  }
  
  // Try case-insensitive lookup
  const normalized = countryString.trim();
  for (const [key, value] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  
  return 'USD'; // Default fallback
}

// Get currency symbol
function getCurrencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

// Format price based on currency
function formatPrice(price, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  
  if (isZeroDecimalCurrency(currencyCode)) {
    return `${symbol}${Math.round(price)}`;
  } else {
    return `${symbol}${price.toFixed(2)}`;
  }
}

// Parse price input based on currency
function parsePrice(priceString, currencyCode) {
  const price = parseFloat(priceString);
  
  if (isZeroDecimalCurrency(currencyCode)) {
    return Math.round(price);
  } else {
    return parseFloat(price.toFixed(2));
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isZeroDecimalCurrency,
    getCurrencyFromCountry,
    getCurrencySymbol,
    formatPrice,
    parsePrice,
    ZERO_DECIMAL_CURRENCIES,
    COUNTRY_TO_CURRENCY,
    CURRENCY_SYMBOLS
  };
}