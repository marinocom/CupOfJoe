// Background service worker - handles Supabase communication

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
});

chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], (config) => {
  if (config.supabaseUrl && config.supabaseKey) {
    supabaseUrl = config.supabaseUrl;
    supabaseKey = config.supabaseKey;
  }
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
  }
});

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