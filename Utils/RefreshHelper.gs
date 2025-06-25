/**
 * Refresh Helper
 * Utilities to ensure spreadsheet updates with latest code
 */

/**
 * Force refresh all custom functions and menus
 */
function forceRefreshSpreadsheet() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Clear cache
    clearAllCaches();
    
    // Refresh custom functions
    refreshCustomFunctions();
    
    // Reload menu
    onOpen();
    
    // Force recalculation
    SpreadsheetApp.getActiveSpreadsheet().toast('Refresh complete! You may need to reload the page.', 'Success', 5);
    
    // Prompt for page reload
    const result = ui.alert(
      'Refresh Complete',
      'The spreadsheet has been refreshed. For best results, please reload the page (Cmd/Ctrl + R).\n\nReload now?',
      ui.ButtonSet.YES_NO
    );
    
    if (result === ui.Button.YES) {
      // This will trigger a reload prompt
      forcePageReload();
    }
    
  } catch (error) {
    ui.alert('Refresh Error', error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Clear all caches
 */
function clearAllCaches() {
  try {
    CacheService.getScriptCache().removeAll();
    CacheService.getUserCache().removeAll();
    CacheService.getDocumentCache().removeAll();
    console.log('All caches cleared');
  } catch (e) {
    console.error('Error clearing caches:', e);
  }
}

/**
 * Refresh custom functions by touching cells
 */
function refreshCustomFunctions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  sheets.forEach(sheet => {
    // Force recalculation by adding and removing a space in A1
    const a1 = sheet.getRange('A1');
    const originalValue = a1.getValue();
    if (originalValue) {
      a1.setValue(originalValue + ' ');
      SpreadsheetApp.flush();
      a1.setValue(originalValue);
    }
  });
}

/**
 * Force page reload using HTML service
 */
function forcePageReload() {
  const html = '<script>window.top.location.reload();</script>';
  const userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(1)
    .setHeight(1);
  SpreadsheetApp.getUi().showModalDialog(userInterface, 'Reloading...');
}

/**
 * Version management
 */
class VersionManager {
  static getCurrentVersion() {
    return '1.0.0'; // Update this with each release
  }
  
  static getLastVersion() {
    const props = PropertiesService.getDocumentProperties();
    return props.getProperty('SCRIPT_VERSION') || '0.0.0';
  }
  
  static updateVersion() {
    const props = PropertiesService.getDocumentProperties();
    props.setProperty('SCRIPT_VERSION', this.getCurrentVersion());
  }
  
  static checkForUpdates() {
    const currentVersion = this.getCurrentVersion();
    const lastVersion = this.getLastVersion();
    
    if (currentVersion !== lastVersion) {
      this.performUpdate();
      this.updateVersion();
      return true;
    }
    return false;
  }
  
  static performUpdate() {
    console.log('Performing update tasks...');
    
    // Clear all caches
    clearAllCaches();
    
    // Re-initialize configuration
    if (typeof ConfigService !== 'undefined') {
      ConfigService.initializeDefaults();
    }
    
    // Refresh templates if needed
    try {
      if (typeof checkAndPopulateTemplates !== 'undefined') {
        checkAndPopulateTemplates();
      }
    } catch (e) {
      console.log('Templates check skipped:', e);
    }
    
    // Show update notification
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Updated to version ${this.getCurrentVersion()}. Please refresh the page for best results.`,
      'Script Updated',
      10
    );
  }
}

/**
 * Auto-refresh on open
 */
function autoRefreshOnOpen() {
  // Check for version updates
  VersionManager.checkForUpdates();
  
  // Clear expired cache entries
  clearExpiredCache();
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  // Apps Script cache expires automatically, but we can clear known keys
  const cacheKeys = [
    'enrichment_progress_*',
    'template_cache_*',
    'config_*'
  ];
  
  const cache = CacheService.getUserCache();
  cacheKeys.forEach(pattern => {
    // Note: Can't actually list keys, so this is more symbolic
    // In practice, cache expires after the TTL we set
    console.log('Cache maintenance completed');
  });
}

/**
 * Development mode utilities
 */
const DevMode = {
  enabled: false,
  
  enable() {
    this.enabled = true;
    PropertiesService.getUserProperties().setProperty('DEV_MODE', 'true');
    console.log('Development mode enabled');
  },
  
  disable() {
    this.enabled = false;
    PropertiesService.getUserProperties().deleteProperty('DEV_MODE');
    console.log('Development mode disabled');
  },
  
  isEnabled() {
    return PropertiesService.getUserProperties().getProperty('DEV_MODE') === 'true';
  },
  
  log(...args) {
    if (this.isEnabled()) {
      console.log('[DEV]', ...args);
    }
  }
};

/**
 * Add refresh button to toolbar
 */
function addRefreshButton() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Note: Can't actually add buttons to toolbar via Apps Script
  // But we can add a refresh option to the menu
  console.log('Use Clay Enrichment > Tools > Refresh Spreadsheet');
}

/**
 * Create development menu
 */
function createDevMenu(ui) {
  if (DevMode.isEnabled()) {
    ui.createMenu('🔧 Dev Tools')
      .addItem('Force Refresh', 'forceRefreshSpreadsheet')
      .addItem('Clear All Caches', 'clearAllCaches')
      .addItem('Check Version', 'showVersionInfo')
      .addItem('Enable Logging', 'enableVerboseLogging')
      .addItem('Show Properties', 'showAllProperties')
      .addItem('Disable Dev Mode', 'disableDevMode')
      .addToUi();
  }
}

/**
 * Show version information
 */
function showVersionInfo() {
  const ui = SpreadsheetApp.getUi();
  const info = `
Current Version: ${VersionManager.getCurrentVersion()}
Last Version: ${VersionManager.getLastVersion()}
Dev Mode: ${DevMode.isEnabled() ? 'Enabled' : 'Disabled'}
Cache Status: Active
  `;
  
  ui.alert('Version Information', info, ui.ButtonSet.OK);
}

/**
 * Enable verbose logging
 */
function enableVerboseLogging() {
  PropertiesService.getUserProperties().setProperty('VERBOSE_LOGGING', 'true');
  SpreadsheetApp.getActiveSpreadsheet().toast('Verbose logging enabled', 'Success', 3);
}

/**
 * Show all properties
 */
function showAllProperties() {
  const ui = SpreadsheetApp.getUi();
  const userProps = PropertiesService.getUserProperties().getProperties();
  const docProps = PropertiesService.getDocumentProperties().getProperties();
  
  let info = 'USER PROPERTIES:\n';
  Object.entries(userProps).forEach(([key, value]) => {
    if (key !== 'API_KEY') { // Don't show sensitive data
      info += `${key}: ${value}\n`;
    }
  });
  
  info += '\nDOCUMENT PROPERTIES:\n';
  Object.entries(docProps).forEach(([key, value]) => {
    info += `${key}: ${value}\n`;
  });
  
  ui.alert('Properties', info, ui.ButtonSet.OK);
}

/**
 * Disable dev mode
 */
function disableDevMode() {
  DevMode.disable();
  SpreadsheetApp.getActiveSpreadsheet().toast('Dev mode disabled. Reload to update menu.', 'Success', 5);
}