// Background service worker - handles Supabase communication and currency rates

let supabaseUrl = '';
let supabaseKey = '';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Coffee Price Tracker installed');
  
  const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
  if (config.supabaseUrl && config.supabaseKey) {
    supabaseUrl = config.supabaseUrl;
    supabaseKey = config.supabaseKey;
  } else {
    console.log('Please configure Supabase credentials');
  }
  
  // Fetch exchange rates on install
  await updateExchangeRates();
});

// Also fetch rates when service worker starts up
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension startup - checking exchange rates');
  await updateExchangeRates();
});

chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], (config) => {
  if (config.supabaseUrl && config.supabaseKey) {
    supabaseUrl = config.supabaseUrl;
    supabaseKey = config.supabaseKey;
  }
  
  // Check rates on initial load
  updateExchangeRates();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.supabaseUrl) {
      supabaseUrl = changes.supabaseUrl.newValue;
    }
    if (changes.supabaseKey) {
      supabaseKey = changes.supabaseKey.newValue;
    }
  }
});

// Check and update exchange rates if needed (once per month)
async function updateExchangeRates() {
  try {
    const stored = await chrome.storage.local.get(['exchangeRates', 'ratesLastUpdated']);
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    // Check if we need to update (no rates stored or older than 30 days)
    if (!stored.exchangeRates || !stored.ratesLastUpdated || (now - stored.ratesLastUpdated) > oneMonth) {
      console.log('Fetching new exchange rates...');
      
      // Use exchangerate-api.com free tier (no API key needed for basic usage)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      
      if (!response.ok) {
        console.error('Failed to fetch exchange rates:', response.status);
        return;
      }
      
      const data = await response.json();
      
      // Store only the rates object and timestamp
      await chrome.storage.local.set({
        exchangeRates: data.rates,
        ratesLastUpdated: now
      });
      
      console.log('Exchange rates updated successfully');
      console.log('Sample rate - EUR to USD:', data.rates.USD);
    } else {
      const daysSinceUpdate = Math.floor((now - stored.ratesLastUpdated) / (24 * 60 * 60 * 1000));
      console.log(`Exchange rates are up to date (${daysSinceUpdate} days old)`);
    }
  } catch (error) {
    console.error('Error updating exchange rates:', error);
  }
}

// Check rates daily (will only update if 30 days have passed)
chrome.alarms.create('checkExchangeRates', { periodInMinutes: 1440 }); // Once per day

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkExchangeRates') {
    updateExchangeRates();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPrice') {
    handleGetPrice(request.placeId).then(sendResponse);
    return true;
  } else if (request.action === 'submitPrice') {
    handleSubmitPrice(
      request.placeId, 
      request.placeName, 
      request.price,
      request.currencyCode || 'USD'
    ).then(sendResponse);
    return true;
  } else if (request.action === 'getExchangeRates') {
    // Return cached exchange rates to content script
    chrome.storage.local.get(['exchangeRates']).then(sendResponse);
    return true;
  } else if (request.action === 'refreshExchangeRates') {
    // Force refresh rates (ignore 30-day limit)
    forceRefreshRates().then(sendResponse);
    return true;
  }
});

// Force refresh rates (for manual trigger)
async function forceRefreshRates() {
  try {
    console.log('Force refreshing exchange rates...');
    
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch rates' };
    }
    
    const data = await response.json();
    const now = Date.now();
    
    await chrome.storage.local.set({
      exchangeRates: data.rates,
      ratesLastUpdated: now
    });
    
    console.log('Exchange rates force refreshed successfully');
    return { success: true, rates: data.rates };
  } catch (error) {
    console.error('Error force refreshing rates:', error);
    return { success: false, error: error.message };
  }
}

async function handleGetPrice(placeId) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_average_price`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ p_place_id: placeId })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].avg_price) {
      return {
        success: true,
        data: {
          avgPrice: parseFloat(data[0].avg_price),
          count: parseInt(data[0].submission_count),
          currencyCode: data[0].currency_code || 'USD'
        }
      };
    }
    
    return { success: true, data: null };
  } catch (error) {
    console.error('Error fetching price:', error);
    return { success: false, error: error.message };
  }
}

async function handleSubmitPrice(placeId, placeName, price, currencyCode) {
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/price_submissions`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          place_id: placeId,
          place_name: placeName,
          price: price,
          currency_code: currencyCode
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting price:', error);
    return { success: false, error: error.message };
  }
}