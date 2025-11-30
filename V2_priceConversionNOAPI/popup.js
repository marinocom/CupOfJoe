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

// Update price input based on currency
function updatePriceInput() {
  const priceInput = document.getElementById('priceInput');
  const priceWrapper = document.querySelector('.price-input-wrapper');
  
  // Update the currency symbol in the input
  const symbol = getCurrencySymbol(currentCurrency);
  priceWrapper.setAttribute('data-symbol', symbol);
  
  // Update step and placeholder based on currency
  if (isZeroDecimalCurrency(currentCurrency)) {
    priceInput.step = '1';
    priceInput.placeholder = '500';
  } else {
    priceInput.step = '0.01';
    priceInput.placeholder = '5.00';
  }
  
  // Update label to show currency
  const label = document.querySelector('label[for="priceInput"]');
  label.textContent = `Coffee Price (${currentCurrency})`;
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
    updatePriceInput();
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

// Show setup warning
function showSetupWarning() {
  document.getElementById('setupWarning').style.display = 'block';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('notOnMaps').style.display = 'none';
  document.getElementById('mainContent').style.display = 'none';
}

// Show "not on maps" message
function showNotOnMaps() {
  document.getElementById('setupWarning').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('notOnMaps').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
}

// Show main content
function showMainContent() {
  document.getElementById('setupWarning').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('notOnMaps').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  
  // Update place info
  document.getElementById('placeName').textContent = currentPlaceName || 'Unknown Place';
  document.getElementById('placeAddress').textContent = currentPlaceAddress || '';
}

// Load existing price data
async function loadExistingPrice() {
  if (!currentPlaceId) return;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getPrice',
      placeId: currentPlaceId
    });
    
    if (response && response.success && response.data) {
      // Use the currency from the data if available, otherwise use detected currency
      const currency = response.data.currencyCode || currentCurrency;
      
      // Show stats
      document.getElementById('statsSection').style.display = 'block';
      const formattedPrice = formatPrice(response.data.avgPrice, currency);
      document.getElementById('avgPrice').textContent = formattedPrice;
      document.getElementById('reviewCount').textContent = 
        `${response.data.count} ${response.data.count === 1 ? 'submission' : 'submissions'}`;
    }
  } catch (error) {
    console.error('Error loading price:', error);
  }
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  const priceInput = document.getElementById('priceInput');
  let price = parseFloat(priceInput.value);
  
  if (!price || price <= 0) {
    showError('Please enter a valid price');
    return;
  }
  
  // Round for zero-decimal currencies
  if (isZeroDecimalCurrency(currentCurrency)) {
    price = Math.round(price);
  } else {
    price = parseFloat(price.toFixed(2));
  }
  
  if (!currentPlaceId || !currentPlaceName) {
    showError('Place information not available');
    return;
  }
  
  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'submitPrice',
      placeId: currentPlaceId,
      placeName: currentPlaceName,
      price: price,
      currencyCode: currentCurrency
    });
    
    if (response && response.success) {
      showSuccess(`Price submitted successfully! (${formatPrice(price, currentCurrency)})`);
      priceInput.value = '';
      
      // Reload price data
      setTimeout(() => {
        loadExistingPrice();
        
        // Notify content script to refresh
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshPrice' });
          }
        });
      }, 500);
    } else {
      showError(response.error || 'Failed to submit price');
    }
  } catch (error) {
    console.error('Error submitting price:', error);
    showError('Failed to submit price. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Price';
  }
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
document.getElementById('priceForm').addEventListener('submit', handleSubmit);

// Settings button handler
document.getElementById('settingsButton').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize when popup opens
init();