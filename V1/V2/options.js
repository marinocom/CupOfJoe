// Options page script for Coffee Price Tracker

// Load saved settings
async function loadSettings() {
    const settings = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'preferredCurrency']);
    
    if (settings.supabaseUrl) {
      document.getElementById('supabaseUrl').value = settings.supabaseUrl;
    }
    
    if (settings.supabaseKey) {
      document.getElementById('supabaseKey').value = settings.supabaseKey;
    }
    
    if (settings.preferredCurrency) {
      document.getElementById('preferredCurrency').value = settings.preferredCurrency;
    } else {
      // Default to EUR
      document.getElementById('preferredCurrency').value = 'EUR';
    }
  }
  
  // Save settings
  async function saveSettings(e) {
    e.preventDefault();
    
    const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
    const supabaseKey = document.getElementById('supabaseKey').value.trim();
    const preferredCurrency = document.getElementById('preferredCurrency').value;
    
    await chrome.storage.local.set({
      supabaseUrl,
      supabaseKey,
      preferredCurrency
    });
    
    // Show success message
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('show');
    
    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 3000);
  }
  
  // Test connection
  async function testConnection() {
    const testButton = document.getElementById('testConnection');
    const testResult = document.getElementById('testResult');
    
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    testResult.style.display = 'none';
    
    const settings = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
    
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      testResult.textContent = '❌ Please save your settings first';
      testResult.className = 'test-result error';
      testResult.style.display = 'block';
      testButton.disabled = false;
      testButton.textContent = 'Test Connection';
      return;
    }
    
    try {
      const response = await fetch(
        `${settings.supabaseUrl}/rest/v1/`,
        {
          method: 'GET',
          headers: {
            'apikey': settings.supabaseKey,
            'Authorization': `Bearer ${settings.supabaseKey}`
          }
        }
      );
      
      if (response.ok || response.status === 404) {
        testResult.textContent = '✅ Connection successful!';
        testResult.className = 'test-result success';
      } else {
        testResult.textContent = `❌ Connection failed: ${response.status}`;
        testResult.className = 'test-result error';
      }
    } catch (error) {
      testResult.textContent = `❌ Connection failed: ${error.message}`;
      testResult.className = 'test-result error';
    }
    
    testResult.style.display = 'block';
    testButton.disabled = false;
    testButton.textContent = 'Test Connection';
  }
  
  // Refresh exchange rates
  async function refreshExchangeRates() {
    const refreshButton = document.getElementById('refreshRates');
    const ratesResult = document.getElementById('ratesResult');
    
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing...';
    ratesResult.style.display = 'none';
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'refreshExchangeRates' });
      
      if (response && response.success) {
        ratesResult.textContent = '✅ Exchange rates updated successfully!';
        ratesResult.className = 'test-result success';
        
        // Update status display
        updateRatesStatus();
      } else {
        ratesResult.textContent = `❌ Failed to update rates: ${response.error || 'Unknown error'}`;
        ratesResult.className = 'test-result error';
      }
    } catch (error) {
      ratesResult.textContent = `❌ Failed to update rates: ${error.message}`;
      ratesResult.className = 'test-result error';
    }
    
    ratesResult.style.display = 'block';
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh Exchange Rates';
  }
  
  // Update rates status display
  async function updateRatesStatus() {
    const ratesStatus = document.getElementById('ratesStatus');
    const stored = await chrome.storage.local.get(['exchangeRates', 'ratesLastUpdated']);
    
    if (stored.ratesLastUpdated) {
      const lastUpdated = new Date(stored.ratesLastUpdated);
      const now = new Date();
      const daysDiff = Math.floor((now - lastUpdated) / (24 * 60 * 60 * 1000));
      
      let statusText = `Last updated: ${lastUpdated.toLocaleDateString()} (${daysDiff} days ago)`;
      
      if (stored.exchangeRates && stored.exchangeRates.USD) {
        statusText += ` | Sample rate: 1 EUR = ${stored.exchangeRates.USD.toFixed(4)} USD`;
      }
      
      ratesStatus.textContent = statusText;
    } else {
      ratesStatus.textContent = 'Exchange rates not yet fetched';
    }
  }
  
  // Event listeners
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  document.getElementById('testConnection').addEventListener('click', testConnection);
  document.getElementById('refreshRates').addEventListener('click', refreshExchangeRates);
  
  // Load settings on page load
  loadSettings();
  updateRatesStatus();