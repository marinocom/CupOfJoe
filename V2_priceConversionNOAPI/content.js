// Content script that runs on Google Maps pages
// Detects coffee shops and displays price information


const EXCHANGE_RATES = {
  'USD': { 'EUR': 0.92, 'USD': 1 },
  'EUR': { 'EUR': 1, 'USD': 1.09 },
  'GBP': { 'EUR': 1.17, 'USD': 1.27 },
  'JPY': { 'EUR': 0.0062, 'USD': 0.0068 },
  'CAD': { 'EUR': 0.68, 'USD': 0.74 },
  'AUD': { 'EUR': 0.60, 'USD': 0.65 },
  'NZD': { 'EUR': 0.55, 'USD': 0.60 },
  'CHF': { 'EUR': 1.05, 'USD': 1.14 },
  'CNY': { 'EUR': 0.13, 'USD': 0.14 },
  'INR': { 'EUR': 0.011, 'USD': 0.012 },
  'SGD': { 'EUR': 0.69, 'USD': 0.75 },
  'HKD': { 'EUR': 0.12, 'USD': 0.13 },
  'KRW': { 'EUR': 0.00069, 'USD': 0.00075 },
  'MYR': { 'EUR': 0.21, 'USD': 0.23 },
  'THB': { 'EUR': 0.026, 'USD': 0.028 },
  'IDR': { 'EUR': 0.000058, 'USD': 0.000063 },
  'PHP': { 'EUR': 0.016, 'USD': 0.018 },
  'VND': { 'EUR': 0.000037, 'USD': 0.000040 },
  'MXN': { 'EUR': 0.054, 'USD': 0.059 },
  'BRL': { 'EUR': 0.18, 'USD': 0.20 },
  'ZAR': { 'EUR': 0.051, 'USD': 0.055 },
  'NOK': { 'EUR': 0.088, 'USD': 0.096 },
  'SEK': { 'EUR': 0.088, 'USD': 0.096 },
  'DKK': { 'EUR': 0.13, 'USD': 0.14 },
  'PLN': { 'EUR': 0.23, 'USD': 0.25 },
  'CZK': { 'EUR': 0.040, 'USD': 0.044 },
  'HUF': { 'EUR': 0.0026, 'USD': 0.0028 },
  'TRY': { 'EUR': 0.032, 'USD': 0.035 },
  'RUB': { 'EUR': 0.010, 'USD': 0.011 },
  'ISK': { 'EUR': 0.0067, 'USD': 0.0073 },
  'TWD': { 'EUR': 0.029, 'USD': 0.032 },
  'CLP': { 'EUR': 0.0010, 'USD': 0.0011 },
  'ARS': { 'EUR': 0.0010, 'USD': 0.0011 },
  'COP': { 'EUR': 0.00023, 'USD': 0.00025 },
  'PEN': { 'EUR': 0.24, 'USD': 0.26 },
  'ILS': { 'EUR': 0.25, 'USD': 0.27 },
  'AED': { 'EUR': 0.25, 'USD': 0.27 },
  'SAR': { 'EUR': 0.24, 'USD': 0.27 }
};

// Convert price between currencies
function convertPrice(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  if (EXCHANGE_RATES[fromCurrency] && EXCHANGE_RATES[fromCurrency][toCurrency]) {
    return amount * EXCHANGE_RATES[fromCurrency][toCurrency];
  }
  
  return null;
}

let currentPlaceId = null;
let currentPlaceName = null;
let currentCurrency = 'USD';
let checkInterval = null;

// Initialize
function init() {
  console.log('☕ Coffee Price Tracker: Initialized');
  console.log('☕ Current URL:', location.href);
  
  // Start checking immediately
  startChecking();
  
  // Also watch for URL changes
  observeMapChanges();
}

// Start periodic checking for coffee shops
function startChecking() {
  // Check immediately
  checkIfCoffeeShop();
  
  // Then check every 1 seconds (only if we haven't found a place yet)
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    // Stop checking if we've already found a coffee shop
    if (currentPlaceId) {
      console.log('☕ Already tracking a coffee shop, stopping checks');
      clearInterval(checkInterval);
      return;
    }
    checkIfCoffeeShop();
  }, 250);
}

// Watch for navigation changes on Google Maps
function observeMapChanges() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      console.log('☕ URL changed to:', url);
      lastUrl = url;
      // Give the page a moment to load, then check
      setTimeout(() => checkIfCoffeeShop(), 1500);
    }
  }).observe(document, { subtree: true, childList: true });
}

// Detect country/currency from the page
function detectCurrency() {
  // Try to get country from address
  const addressElement = 
    document.querySelector('button[data-item-id*="address"]') ||
    document.querySelector('[data-item-id*="address"]') ||
    document.querySelector('.rogA2c');
  
  if (addressElement) {
    const addressText = addressElement.innerText;
    console.log('☕ Address text:', addressText);
    
    // Try to extract country from address (usually at the end)
    const addressParts = addressText.split(',').map(s => s.trim());
    const lastPart = addressParts[addressParts.length - 1];
    
    console.log('☕ Last address part:', lastPart);
    
    // Try to match country
    const currency = getCurrencyFromCountry(lastPart);
    if (currency !== 'USD' || lastPart.toLowerCase().includes('united states')) {
      console.log('☕ Detected currency from address:', currency);
      return currency;
    }
  }
  
  // Try to detect from map URL region parameter
  const urlMatch = location.href.match(/\/maps.*?@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    const currencyFromCoords = getCurrencyFromCoordinates(lat, lng);
    if (currencyFromCoords) {
      console.log('☕ Detected currency from coordinates:', currencyFromCoords);
      return currencyFromCoords;
    }
  }
  
  // Try to detect from language/region in Google Maps
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    const langParts = htmlLang.split('-');
    if (langParts.length > 1) {
      const region = langParts[1].toUpperCase();
      const currency = getCurrencyFromCountry(region);
      if (currency !== 'USD') {
        console.log('☕ Detected currency from HTML lang:', currency);
        return currency;
      }
    }
  }
  
  console.log('☕ No currency detected, defaulting to USD');
  return 'USD';
}

// Simple coordinate-based currency detection (approximate)
function getCurrencyFromCoordinates(lat, lng) {
  // More precise coordinate-based detection
  // Order matters - check more specific/smaller regions first
  
  // Singapore (very specific)
  if (lat >= 1.1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1) return 'SGD';
  
  // Hong Kong
  if (lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.4) return 'HKD';
  
  // South Korea (peninsula)
  if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) return 'KRW';
  
  // Japan (island chain - more specific eastern bounds)
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 154) {
    // Exclude western part that overlaps with Korea/China
    if (lng >= 128) return 'JPY';
  }
  
  // China (large mainland - check before Japan to prioritize mainland)
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) return 'CNY';
  
  // Taiwan
  if (lat >= 21.9 && lat <= 25.3 && lng >= 120 && lng <= 122) return 'TWD';
  
  // USA (continental)
  if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) return 'USD';
  
  // Canada
  if (lat >= 41 && lat <= 83 && lng >= -141 && lng <= -52) return 'CAD';
  
  // UK
  if (lat >= 49 && lat <= 61 && lng >= -11 && lng <= 2) return 'GBP';
  
  // Europe (simplified - western/central Europe)
  if (lat >= 36 && lat <= 71 && lng >= -10 && lng <= 30) return 'EUR';
  
  // Australia
  if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return 'AUD';
  
  // India
  if (lat >= 8 && lat <= 38 && lng >= 68 && lng <= 97) return 'INR';
  
  // Thailand
  if (lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106) return 'THB';
  
  // Vietnam
  if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return 'VND';
  
  // Malaysia
  if (lat >= 0.8 && lat <= 7.5 && lng >= 99 && lng <= 120) return 'MYR';
  
  // Indonesia
  if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return 'IDR';
  
  // Philippines
  if (lat >= 4.5 && lat <= 21 && lng >= 116 && lng <= 127) return 'PHP';
  
  return null;
}

// Get currency code from country name or code
function getCurrencyFromCountry(countryString) {
  const COUNTRY_TO_CURRENCY = {
    'US': 'USD', 'USA': 'USD', 'United States': 'USD', 'United States of America': 'USD',
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
    'DE': 'EUR', 'Germany': 'EUR',
    'FR': 'EUR', 'France': 'EUR',
    'IT': 'EUR', 'Italy': 'EUR',
    'ES': 'EUR', 'Spain': 'EUR',
    'PT': 'EUR', 'Portugal': 'EUR',
    'NL': 'EUR', 'Netherlands': 'EUR',
    'BE': 'EUR', 'Belgium': 'EUR',
    'AT': 'EUR', 'Austria': 'EUR',
    'IE': 'EUR', 'Ireland': 'EUR',
    'CH': 'CHF', 'Switzerland': 'CHF',
    'NO': 'NOK', 'Norway': 'NOK',
    'SE': 'SEK', 'Sweden': 'SEK',
    'DK': 'DKK', 'Denmark': 'DKK',
    'IS': 'ISK', 'Iceland': 'ISK',
    'TW': 'TWD', 'Taiwan': 'TWD',
    'HK': 'HKD', 'Hong Kong': 'HKD'
  };
  
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
  
  return 'USD';
}

// Check if the current place is a coffee shop
function checkIfCoffeeShop() {
  console.log('☕ Checking if this is a coffee shop...');
  
  // Detect currency first
  currentCurrency = detectCurrency();
  console.log('☕ Current currency:', currentCurrency);
  
  // Get the place name and category information
  const titleElement = 
    document.querySelector('h1[class*="fontHeadline"]') || 
    document.querySelector('h1.DUwDvf') ||
    document.querySelector('h1') ||
    document.querySelector('.qBF1Pd');
  
  const placeName = titleElement ? titleElement.innerText.toLowerCase() : '';
  
  // Look for category/type information (usually near the title)
  const categoryElement = 
    document.querySelector('[jsaction*="category"]') ||
    document.querySelector('button[jsaction*="pane.rating.category"]') ||
    document.querySelector('.fontBodyMedium .DkEaL');
  
  const categoryText = categoryElement ? categoryElement.innerText.toLowerCase() : '';
  
  console.log('☕ Place name:', placeName);
  console.log('☕ Category:', categoryText);
  
  // Check if it's a coffee-related business
  const isCoffeeShop = 
    categoryText.includes('coffee shop') ||
    categoryText.includes('café') ||
    categoryText.includes('cafe') ||
    categoryText.includes('coffee') ||
    categoryText.includes('espresso') ||
    categoryText.includes('coffeehouse') ||
    placeName.includes('starbucks') ||
    placeName.includes('dunkin') ||
    placeName.includes('peet') ||
    placeName.includes('costa coffee') ||
    placeName.includes('blue bottle') ||
    placeName.includes('coffee') && (
      placeName.includes('shop') ||
      placeName.includes('house') ||
      placeName.includes('bar') ||
      placeName.includes('roasters') ||
      placeName.includes('cafe') ||
      placeName.includes('café') ||
      placeName.includes('kave')
    );
  
  console.log('☕ Is coffee shop:', isCoffeeShop);
  
  if (isCoffeeShop) {
    const placeInfo = extractPlaceInfo();
    console.log('☕ Place info:', placeInfo);
    
    if (placeInfo) {
      if (currentPlaceId !== placeInfo.id) {
        currentPlaceId = placeInfo.id;
        currentPlaceName = placeInfo.name;
        
        // Store current place with currency for popup
        chrome.storage.local.set({
          currentPlace: {
            ...placeInfo,
            currencyCode: currentCurrency
          }
        });
        
        console.log('☕ Fetching price for:', placeInfo.name);
        fetchAndDisplayPrice(placeInfo);
      }
    } else {
      console.log('☕ Could not extract place info');
    }
  } else {
    console.log('☕ Not a coffee shop, removing badge');
    removePriceBadge();
    currentPlaceId = null;
    currentPlaceName = null;
  }
}

// Extract place information from the page
function extractPlaceInfo() {
  const titleElement = 
    document.querySelector('h1[class*="fontHeadline"]') || 
    document.querySelector('h1.DUwDvf') ||
    document.querySelector('h1') ||
    document.querySelector('[data-item-id*="title"]') ||
    document.querySelector('.qBF1Pd');
  
  const name = titleElement ? titleElement.innerText.trim() : null;
  
  console.log('☕ Extracted name:', name);
  
  const addressElement = 
    document.querySelector('button[data-item-id*="address"]') ||
    document.querySelector('[data-item-id*="address"]') ||
    document.querySelector('.rogA2c');
  const address = addressElement ? addressElement.innerText : null;
  
  const urlMatch = location.href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
  const placeIdMatch = location.href.match(/place\/([^/]+)/);
  
  let id = null;
  if (urlMatch) {
    id = urlMatch[1];
  } else if (placeIdMatch) {
    id = placeIdMatch[1];
  } else if (name) {
    id = btoa(name).substring(0, 50);
  }
  
  console.log('☕ Extracted ID:', id);
  
  if (!id || !name) return null;
  
  return { id, name, address };
}

// Fetch price data from Supabase via background script
async function fetchAndDisplayPrice(placeInfo) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getPrice',
      placeId: placeInfo.id
    });
    
    if (response && response.success) {
      displayPriceBadge(placeInfo, response.data);
    } else {
      displayPriceBadge(placeInfo, null);
    }
  } catch (error) {
    console.error('☕ Error fetching price:', error);
    displayPriceBadge(placeInfo, null);
  }
}

// Check if currency uses zero decimals
function isZeroDecimalCurrency(currencyCode) {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'TWD'];
  return zeroDecimalCurrencies.includes(currencyCode);
}

// Get currency symbol
function getCurrencySymbol(currencyCode) {
  const symbols = {
    'USD': '$', 'CAD': 'CA$', 'AUD': 'A$', 'NZD': 'NZ$',
    'GBP': '£', 'EUR': '€', 'JPY': '¥', 'CNY': '¥',
    'KRW': '₩', 'INR': '₹', 'SGD': 'S$', 'MYR': 'RM',
    'THB': '฿', 'IDR': 'Rp', 'PHP': '₱', 'VND': '₫',
    'MXN': 'MX$', 'BRL': 'R$', 'CHF': 'CHF', 'NOK': 'kr',
    'SEK': 'kr', 'DKK': 'kr', 'ISK': 'kr', 'TWD': 'NT$', 'HKD': 'HK$'
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

// Display price badge on the page
async function displayPriceBadge(placeInfo, priceData) {
  console.log('☕ Displaying badge with data:', priceData);
  
  removePriceBadge();
  
  const badge = document.createElement('div');
  badge.id = 'coffee-price-badge';
  badge.className = 'coffee-price-badge';
  
  const currency = (priceData && priceData.currencyCode) || currentCurrency;
  const currencySymbol = getCurrencySymbol(currency);
  const isZeroDecimal = isZeroDecimalCurrency(currency);
  const placeholder = isZeroDecimal ? '500' : '5.00';
  const step = isZeroDecimal ? '1' : '0.01';
  
  // Get preferred currency setting
  const settings = await chrome.storage.local.get(['preferredCurrency']);
  const preferredCurrency = settings.preferredCurrency || 'EUR';
  
  // Generate converted price HTML if applicable
  let convertedPriceHTML = '';
  if (priceData && priceData.avgPrice && preferredCurrency !== 'none' && currency !== preferredCurrency) {
    const convertedAmount = convertPrice(priceData.avgPrice, currency, preferredCurrency);
    if (convertedAmount) {
      const convertedFormatted = formatPrice(convertedAmount, preferredCurrency);
      convertedPriceHTML =`<span class="price-badge-converted">≈${convertedFormatted}</span>`;
    }
  }
  
  if (priceData && priceData.avgPrice) {
    const formattedPrice = formatPrice(priceData.avgPrice, currency);
    badge.innerHTML = `
      <div class="price-badge-content">
        <img class="coffee-image" src="data:image/png;base64,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">
        <div class="price-badge-info">
          <div class="price-badge-label">Avg Coffee Price</div>
          <div class="price-badge-price">
            <span>${formattedPrice}</span>
            ${convertedPriceHTML}
          </div>
          <div class="price-badge-count">${priceData.count} ${priceData.count === 1 ? 'review' : 'reviews'}</div>
        </div>
      </div>
      <button class="add-price-button" id="show-price-form">Add Your Price</button>
      <div class="price-form-container" id="price-form-container" style="display: none;">
        <div class="price-input-group" data-symbol="${currencySymbol}">
          <input type="number" id="price-input" step="${step}" min="0" max="100000" placeholder="${placeholder}" />
        </div>
        <div class="price-form-buttons">
          <button class="submit-price-button" id="submit-price">Submit</button>
          <button class="cancel-price-button" id="cancel-price">Cancel</button>
        </div>
        <div id="price-message" class="price-message" style="display: none;"></div>
      </div>
    `;
  } else {
    badge.innerHTML = `
      <div class="price-badge-content">
        <img class="coffee-image" src="data:image/png;base64,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"><div class="price-badge-info">
          <div class="price-badge-label">No price data yet</div>
          <div class="price-badge-message">Be the first to add!</div>
        </div>
      </div>
      <button class="add-price-button" id="show-price-form">Add Price</button>
      <div class="price-form-container" id="price-form-container" style="display: none;">
        <div class="price-input-group" data-symbol="${currencySymbol}">
          <input type="number" id="price-input" step="${step}" min="0" max="100000" placeholder="${placeholder}" />
        </div>
        <div class="price-form-buttons">
          <button class="submit-price-button" id="submit-price">Submit</button>
          <button class="cancel-price-button" id="cancel-price">Cancel</button>
        </div>
        <div id="price-message" class="price-message" style="display: none;"></div>
      </div>
    `;
  }
  
  document.body.appendChild(badge);
  console.log('☕ Badge inserted successfully!');
  
  // Add event listeners
  setupBadgeEventListeners(placeInfo, currency);
}

// Setup event listeners for the badge form
function setupBadgeEventListeners(placeInfo, currency) {
  const showFormBtn = document.getElementById('show-price-form');
  const formContainer = document.getElementById('price-form-container');
  const cancelBtn = document.getElementById('cancel-price');
  const submitBtn = document.getElementById('submit-price');
  const priceInput = document.getElementById('price-input');
  const messageEl = document.getElementById('price-message');
  
  if (!showFormBtn || !formContainer) return;
  
  // Show form when "Add Price" is clicked
  showFormBtn.addEventListener('click', () => {
    formContainer.style.display = 'block';
    showFormBtn.style.display = 'none';
    priceInput.focus();
  });
  
  // Hide form when "Cancel" is clicked
  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
    showFormBtn.style.display = 'block';
    priceInput.value = '';
    messageEl.style.display = 'none';
  });
  
  // Submit price
  submitBtn.addEventListener('click', async () => {
    let price = parseFloat(priceInput.value);
    
    if (!price || price <= 0) {
      showMessage('Please enter a valid price', 'error');
      return;
    }
    
    // Round for zero-decimal currencies
    if (isZeroDecimalCurrency(currency)) {
      price = Math.round(price);
    } else {
      price = parseFloat(price.toFixed(2));
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'submitPrice',
        placeId: placeInfo.id,
        placeName: placeInfo.name,
        price: price,
        currencyCode: currency
      });
      
      if (response && response.success) {
        const formattedPrice = formatPrice(price, currency);
        showMessage(`✓ Price submitted! (${formattedPrice})`, 'success');
        priceInput.value = '';
        
        // Refresh the badge after a delay
        setTimeout(() => {
          fetchAndDisplayPrice(placeInfo);
        }, 1500);
      } else {
        showMessage('Failed to submit price', 'error');
      }
    } catch (error) {
      console.error('Error submitting price:', error);
      showMessage('Failed to submit price', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });
  
  // Allow Enter key to submit
  priceInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });
  
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `price-message ${type}`;
    messageEl.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 3000);
    }
  }
}

// Remove existing price badge
function removePriceBadge() {
  const existing = document.getElementById('coffee-price-badge');
  if (existing) {
    existing.remove();
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentPlace') {
    sendResponse({
      placeId: currentPlaceId,
      placeName: currentPlaceName,
      currencyCode: currentCurrency
    });
  } else if (request.action === 'refreshPrice') {
    if (currentPlaceId && currentPlaceName) {
      fetchAndDisplayPrice({
        id: currentPlaceId,
        name: currentPlaceName
      });
    }
  }
  return true;
});

// Start the extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}