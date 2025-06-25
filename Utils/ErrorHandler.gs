/**
 * Error Handler Utilities
 * Centralized error handling and logging
 */

class ErrorHandler {
  /**
   * Log error to console and optionally to sheet
   * @param {Error|string} error - Error object or message
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional metadata
   */
  static log(error, context = '', metadata = {}) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.toString() : error;
    const stackTrace = error instanceof Error ? error.stack : '';
    
    // Log to console
    console.error(`[${timestamp}] ${context}: ${errorMessage}`);
    if (stackTrace) console.error(stackTrace);
    if (Object.keys(metadata).length > 0) {
      console.error('Metadata:', metadata);
    }
    
    // Try to log to sheet
    try {
      this.logToSheet(timestamp, context, errorMessage, metadata);
    } catch (e) {
      console.error('Failed to log to sheet:', e);
    }
  }
  
  /**
   * Log error to error tracking sheet
   * @private
   */
  static logToSheet(timestamp, context, errorMessage, metadata) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let errorSheet = ss.getSheetByName('Error Log');
      
      if (!errorSheet) {
        // Create error log sheet if it doesn't exist
        errorSheet = ss.insertSheet('Error Log');
        errorSheet.getRange(1, 1, 1, 5).setValues([
          ['Timestamp', 'Context', 'Error', 'Metadata', 'User']
        ]);
        errorSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
        errorSheet.setFrozenRows(1);
        errorSheet.hideSheet(); // Hide by default
      }
      
      errorSheet.appendRow([
        timestamp,
        context,
        errorMessage,
        JSON.stringify(metadata),
        Session.getActiveUser().getEmail()
      ]);
      
      // Keep only last 1000 errors
      if (errorSheet.getLastRow() > 1001) {
        errorSheet.deleteRow(2); // Delete oldest error
      }
    } catch (e) {
      // Silently fail if we can't log to sheet
    }
  }
  
  /**
   * Handle error with user notification
   * @param {Error|string} error - Error object or message
   * @param {string} userMessage - User-friendly message
   * @param {boolean} showAlert - Whether to show UI alert
   */
  static handle(error, userMessage = 'An error occurred', showAlert = true) {
    // Log the error
    this.log(error, 'User Operation');
    
    // Show user-friendly message
    if (showAlert) {
      const ui = SpreadsheetApp.getUi();
      const detailMessage = error instanceof Error ? error.message : error;
      
      ui.alert(
        'Error',
        `${userMessage}\n\nDetails: ${detailMessage}`,
        ui.ButtonSet.OK
      );
    }
  }
  
  /**
   * Wrap function with error handling
   * @param {Function} func - Function to wrap
   * @param {string} context - Context for logging
   * @return {Function} Wrapped function
   */
  static wrap(func, context = '') {
    return function(...args) {
      try {
        return func.apply(this, args);
      } catch (error) {
        ErrorHandler.log(error, context || func.name);
        throw error;
      }
    };
  }
  
  /**
   * Create a safe version of a function that won't throw
   * @param {Function} func - Function to make safe
   * @param {*} defaultReturn - Default return value on error
   * @return {Function} Safe function
   */
  static makeSafe(func, defaultReturn = null) {
    return function(...args) {
      try {
        return func.apply(this, args);
      } catch (error) {
        ErrorHandler.log(error, `Safe execution of ${func.name}`);
        return defaultReturn;
      }
    };
  }
  
  /**
   * Retry a function with exponential backoff
   * @param {Function} func - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} initialDelay - Initial delay in ms
   * @return {*} Function result
   */
  static async retry(func, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          Utilities.sleep(delay);
          
          this.log(error, `Retry attempt ${attempt + 1}/${maxRetries}`, {
            delay: delay,
            function: func.name
          });
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get error summary from logs
   * @param {number} hours - Hours to look back
   * @return {Object} Error summary
   */
  static getErrorSummary(hours = 24) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const errorSheet = ss.getSheetByName('Error Log');
      
      if (!errorSheet || errorSheet.getLastRow() <= 1) {
        return { total: 0, byContext: {}, recent: [] };
      }
      
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      const data = errorSheet.getDataRange().getValues();
      const summary = {
        total: 0,
        byContext: {},
        recent: []
      };
      
      for (let i = 1; i < data.length; i++) {
        const timestamp = new Date(data[i][0]);
        
        if (timestamp > cutoffTime) {
          summary.total++;
          
          const context = data[i][1] || 'Unknown';
          summary.byContext[context] = (summary.byContext[context] || 0) + 1;
          
          if (summary.recent.length < 10) {
            summary.recent.push({
              timestamp: data[i][0],
              context: data[i][1],
              error: data[i][2]
            });
          }
        }
      }
      
      return summary;
    } catch (error) {
      this.log(error, 'getErrorSummary');
      return { total: 0, byContext: {}, recent: [] };
    }
  }
}

// Helper functions for backward compatibility
function logError(error, context) {
  ErrorHandler.log(error, context);
}

function handleError(error, userMessage, showAlert) {
  ErrorHandler.handle(error, userMessage, showAlert);
}

function wrapWithErrorHandling(func, context) {
  return ErrorHandler.wrap(func, context);
}