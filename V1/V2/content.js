// Content script that runs on Google Maps pages
// Detects coffee shops and displays price information

// Exchange rates cache (loaded from storage)
let exchangeRates = null;

// Load exchange rates from storage
async function loadExchangeRates() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getExchangeRates' });
    if (response && response.exchangeRates) {
      exchangeRates = response.exchangeRates;
      console.log('☕ Exchange rates loaded');
    }
  } catch (error) {
    console.error('☕ Error loading exchange rates:', error);
  }
}

// Convert price between currencies using cached rates
function convertPrice(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  if (!exchangeRates) {
    console.log('☕ No exchange rates available for conversion');
    return null;
  }
  
  console.log(`☕ Converting ${amount} from ${fromCurrency} to ${toCurrency}`);
  console.log(`☕ Available rates:`, exchangeRates);
  
  // All rates are relative to EUR (base currency)
  // API gives us: 1 EUR = X USD (e.g., 1 EUR = 1.16 USD)
  
  let result = null;
  
  if (fromCurrency === 'EUR') {
    // Converting from EUR to another currency
    // Example: 5 EUR to USD with rate 1.16 = 5 * 1.16 = 5.80 USD
    result = exchangeRates[toCurrency] ? amount * exchangeRates[toCurrency] : null;
    console.log(`☕ EUR to ${toCurrency}: ${amount} * ${exchangeRates[toCurrency]} = ${result}`);
  } else if (toCurrency === 'EUR') {
    // Converting to EUR from another currency
    // Example: 5 USD to EUR with rate 1.16 = 5 / 1.16 = 4.31 EUR
    result = exchangeRates[fromCurrency] ? amount / exchangeRates[fromCurrency] : null;
    console.log(`☕ ${fromCurrency} to EUR: ${amount} / ${exchangeRates[fromCurrency]} = ${result}`);
  } else {
    // Converting between two non-EUR currencies
    // Example: 5 USD to GBP = (5 / 1.16 USD rate) * 0.86 GBP rate
    if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
      const inEur = amount / exchangeRates[fromCurrency];
      result = inEur * exchangeRates[toCurrency];
      console.log(`☕ ${fromCurrency} to ${toCurrency}: (${amount} / ${exchangeRates[fromCurrency]}) * ${exchangeRates[toCurrency]} = ${result}`);
    }
  }
  
  return result;
}

let currentPlaceId = null;
let currentPlaceName = null;
let currentCurrency = 'USD';
let checkInterval = null;

// Initialize
function init() {
  console.log('☕ Coffee Price Tracker: Initialized');
  console.log('☕ Current URL:', location.href);
  
  // Load exchange rates
  loadExchangeRates();
  
  // Start checking immediately
  startChecking();
  
  // Also watch for URL changes
  observeMapChanges();
}

// Start periodic checking for coffee shops
function startChecking() {
  // Check immediately
  checkIfCoffeeShop();
  
  // Then check every 3 seconds (only if we haven't found a place yet)
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    // Stop checking if we've already found a coffee shop
    if (currentPlaceId) {
      console.log('☕ Already tracking a coffee shop, stopping checks');
      clearInterval(checkInterval);
      return;
    }
    checkIfCoffeeShop();
  }, 3000);
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
      convertedPriceHTML = `<span class="price-badge-converted">≈${convertedFormatted}</span>`;
    }
  }
  
  if (priceData && priceData.avgPrice) {
    const formattedPrice = formatPrice(priceData.avgPrice, currency);
    badge.innerHTML = `
      <div class="price-badge-content">
        <div class="price-badge-icon">☕</div>
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
        <div class="price-badge-icon">☕</div>
        <div class="price-badge-info">
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