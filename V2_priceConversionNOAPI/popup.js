// Popup script for the Coffee Price Tracker extension

let currentPlaceId = null;
let currentPlaceName = null;
let currentPlaceAddress = null;
let currentCurrency = 'USD';

// Check if currency uses zero decimals
function isZeroDecimalCurrency(currencyCode) {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'TWD', 'PYG', 'UGX', 'BIF', 'DJF', 'GNF', 'KMF', 'RWF', 'XAF', 'XOF', 'XPF'];
  return zeroDecimalCurrencies.includes(currencyCode);
}

// Get currency symbol
function getCurrencySymbol(currencyCode) {
  const symbols = {
    'USD': '$', 'CAD': 'CA$', 'AUD': 'A$', 'NZD': 'NZ$',
    'GBP': '£', 'EUR': '€', 'JPY': '¥', 'CNY': '¥',
    'KRW': '₩', 'INR': '₹', 'SGD': 'S$', 'MYR': 'RM',
    'THB': '฿', 'IDR': 'Rp', 'PHP': '₱', 'VND': '₫',
    'MXN': 'MX$', 'BRL': 'R$', 'ARS': 'AR$', 'CLP': 'CL$',
    'CHF': 'CHF', 'NOK': 'kr', 'SEK': 'kr', 'DKK': 'kr',
    'ISK': 'kr', 'TWD': 'NT$', 'HKD': 'HK$'
  };
  return symbols[currencyCode] || currencyCode;
}

// Format price based on currency
function formatPrice(price, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  
  if (isZeroDecimalCurrency(currencyCode)) {
    return `${symbol}${Math.round(price)}`;
  } else {
    const formattedAmount = price.toFixed(2);
    // Euro symbol goes at the end
    if (currencyCode === 'EUR') {
      return `${formattedAmount}${symbol}`;
    }
    return `${symbol}${formattedAmount}`;
  }
}

// Initialize popup
async function init() {
  console.log('Popup initialized');
  
  // Check if Supabase is configured
  const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
  if (!config.supabaseUrl || !config.supabaseKey) {
    showSetupWarning();
    return;
  }
  
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on Google Maps
  if (!tab.url || !tab.url.includes('google.com/maps')) {
    showNotOnMaps();
    return;
  }
  
  // Try to get place info from storage first
  const stored = await chrome.storage.local.get(['currentPlace']);
  if (stored.currentPlace) {
    currentPlaceId = stored.currentPlace.id;
    currentPlaceName = stored.currentPlace.name;
    currentPlaceAddress = stored.currentPlace.address;
    currentCurrency = stored.currentPlace.currencyCode || 'USD';
    showMainContent();
    loadExistingPrice();
    return;
  }
  
  // If not in storage, try to get from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentPlace' });
    
    if (response && response.placeId && response.placeName) {
      currentPlaceId = response.placeId;
      currentPlaceName = response.placeName;
      currentCurrency = response.currencyCode || 'USD';
      showMainContent();
      updatePriceInput();
      loadExistingPrice();
    } else {
      showNotOnMaps();
    }
  } catch (error) {
    console.error('Error getting place info:', error);
    showNotOnMaps();
  }
}


async function saveSettings(e) {
    e.preventDefault();
    
    const preferredCurrency = document.getElementById('preferredCurrency').value;
    
    await chrome.storage.local.set({
      preferredCurrency
    });
    
    // Show success message
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('show');
    
    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 3000);
}


// Show error message
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

// Show success message
function showSuccess(message) {
  const successEl = document.getElementById('successMessage');
  successEl.textContent = message;
  successEl.style.display = 'block';
  
  setTimeout(() => {
    successEl.style.display = 'none';
  }, 3000);
}

// Event listeners
document.getElementById('settingsForm').addEventListener('submit', saveSettings);


// Initialize when popup opens
init();