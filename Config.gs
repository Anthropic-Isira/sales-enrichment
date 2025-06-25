/**
 * Configuration Management Service
 * Handles API keys, settings, and environment configuration
 */

class Config {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.userProps = PropertiesService.getUserProperties();
    this.scriptProps = PropertiesService.getScriptProperties();
    this.documentProps = PropertiesService.getDocumentProperties();
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if not found
   * @return {*} Configuration value
   */
  get(key, defaultValue = null) {
    // Try cache first
    const cached = this.cache.get(`config_${key}`);
    if (cached !== null) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return cached;
      }
    }
    
    // Try different property stores in order of precedence
    let value = this.userProps.getProperty(key) || 
                this.documentProps.getProperty(key) || 
                this.scriptProps.getProperty(key);
    
    if (value === null) {
      // Check settings sheet as last resort
      value = this.getFromSettingsSheet(key);
    }
    
    if (value === null) {
      return defaultValue;
    }
    
    // Cache the value
    this.cache.put(`config_${key}`, value, 3600); // 1 hour cache
    
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   * @param {string} scope - Storage scope: 'user', 'document', or 'script'
   */
  set(key, value, scope = 'user') {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    switch (scope) {
      case 'user':
        this.userProps.setProperty(key, stringValue);
        break;
      case 'document':
        this.documentProps.setProperty(key, stringValue);
        break;
      case 'script':
        this.scriptProps.setProperty(key, stringValue);
        break;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
    
    // Update cache
    this.cache.put(`config_${key}`, stringValue, 3600);
    
    // Also update settings sheet if it exists
    this.updateSettingsSheet(key, stringValue);
  }
  
  /**
   * Get all configuration values
   * @return {Object} All configuration values
   */
  getAll() {
    const allProps = {};
    
    // Merge all property stores
    const scriptProps = this.scriptProps.getProperties();
    const documentProps = this.documentProps.getProperties();
    const userProps = this.userProps.getProperties();
    
    Object.assign(allProps, scriptProps, documentProps, userProps);
    
    // Add settings from sheet
    const sheetSettings = this.getAllFromSettingsSheet();
    Object.assign(allProps, sheetSettings);
    
    // Parse JSON values
    const parsed = {};
    for (const [key, value] of Object.entries(allProps)) {
      try {
        parsed[key] = JSON.parse(value);
      } catch (e) {
        parsed[key] = value;
      }
    }
    
    return parsed;
  }
  
  /**
   * Delete a configuration value
   * @param {string} key - Configuration key
   */
  delete(key) {
    this.userProps.deleteProperty(key);
    this.documentProps.deleteProperty(key);
    this.scriptProps.deleteProperty(key);
    this.cache.remove(`config_${key}`);
    
    // Remove from settings sheet
    this.deleteFromSettingsSheet(key);
  }
  
  /**
   * Get API key (with encryption/decryption)
   * @return {string} Decrypted API key
   */
  getApiKey() {
    const encryptedKey = this.get('API_KEY');
    if (!encryptedKey) return null;
    
    // In a real implementation, you would decrypt the key here
    // For now, we'll return it as-is
    return encryptedKey;
  }
  
  /**
   * Set API key (with encryption)
   * @param {string} apiKey - API key to store
   */
  setApiKey(apiKey) {
    if (!apiKey) {
      throw new Error('API key cannot be empty');
    }
    
    // In a real implementation, you would encrypt the key here
    // For now, we'll store it as-is in user properties
    this.set('API_KEY', apiKey, 'user');
  }
  
  /**
   * Get value from settings sheet
   * @private
   */
  getFromSettingsSheet(key) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Settings');
      if (!sheet) return null;
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          return data[i][1];
        }
      }
    } catch (e) {
      console.error('Error reading from settings sheet:', e);
    }
    return null;
  }
  
  /**
   * Get all values from settings sheet
   * @private
   */
  getAllFromSettingsSheet() {
    const settings = {};
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Settings');
      if (!sheet) return settings;
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][1]) {
          settings[data[i][0]] = data[i][1];
        }
      }
    } catch (e) {
      console.error('Error reading from settings sheet:', e);
    }
    return settings;
  }
  
  /**
   * Update value in settings sheet
   * @private
   */
  updateSettingsSheet(key, value) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Settings');
      if (!sheet) return;
      
      const data = sheet.getDataRange().getValues();
      let found = false;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Add new setting
        sheet.appendRow([key, value]);
      }
    } catch (e) {
      console.error('Error updating settings sheet:', e);
    }
  }
  
  /**
   * Delete value from settings sheet
   * @private
   */
  deleteFromSettingsSheet(key) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Settings');
      if (!sheet) return;
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    } catch (e) {
      console.error('Error deleting from settings sheet:', e);
    }
  }
  
  /**
   * Get default configuration values
   */
  static getDefaults() {
    return {
      DEFAULT_MODEL: 'claude-sonnet-4-20250514',
      RATE_LIMIT: 10,
      BATCH_SIZE: 50,
      CACHE_DURATION: 86400,
      AUTO_RETRY: true,
      MAX_RETRIES: 3,
      WEBHOOK_URL: '',
      MAX_TOKENS: 4096,
      TEMPERATURE: 0.7,
      ENRICHMENT_TIMEOUT: 30000, // 30 seconds
      CONCURRENT_JOBS: 5,
      LOG_LEVEL: 'INFO',
      ENABLE_CACHE: true,
      ENABLE_WEBHOOKS: false,
      ENABLE_ANALYTICS: true,
      USE_WEB_SEARCH: true,
      MAX_WEB_SEARCHES: 5
    };
  }
  
  /**
   * Initialize default configuration
   */
  initializeDefaults() {
    const defaults = Config.getDefaults();
    const existing = this.getAll();
    
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in existing)) {
        this.set(key, value, 'document');
      }
    }
  }
  
  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    // Check required settings
    if (!this.getApiKey()) {
      errors.push('API key is not configured');
    }
    
    // Validate numeric settings
    const rateLimit = this.get('RATE_LIMIT');
    if (rateLimit && (isNaN(rateLimit) || rateLimit < 1)) {
      errors.push('Rate limit must be a positive number');
    }
    
    const batchSize = this.get('BATCH_SIZE');
    if (batchSize && (isNaN(batchSize) || batchSize < 1 || batchSize > 100)) {
      errors.push('Batch size must be between 1 and 100');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Export configuration
   */
  export() {
    const config = this.getAll();
    // Remove sensitive data
    delete config.API_KEY;
    return config;
  }
  
  /**
   * Import configuration
   */
  import(config) {
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'API_KEY') { // Don't import API keys
        this.set(key, value, 'document');
      }
    }
  }
}

// Create singleton instance
const ConfigService = new Config();

// Helper functions for backward compatibility
function getConfig(key, defaultValue) {
  return ConfigService.get(key, defaultValue);
}

function setConfig(key, value, scope = 'user') {
  return ConfigService.set(key, value, scope);
}

function getApiKey() {
  return ConfigService.getApiKey();
}

function setApiKey(apiKey) {
  return ConfigService.setApiKey(apiKey);
}

function validateConfig() {
  return ConfigService.validate();
}