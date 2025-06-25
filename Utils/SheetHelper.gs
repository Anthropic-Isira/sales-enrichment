/**
 * Sheet Helper Utilities
 * Common functions for working with Google Sheets
 */

class SheetHelper {
  /**
   * Get or create a sheet by name
   * @param {string} sheetName - Name of the sheet
   * @param {Spreadsheet} spreadsheet - Spreadsheet object (optional)
   * @return {Sheet} Sheet object
   */
  static getOrCreateSheet(sheetName, spreadsheet = null) {
    const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    return sheet;
  }
  
  /**
   * Get data from a sheet as objects
   * @param {Sheet} sheet - Sheet to read from
   * @param {number} startRow - Starting row (default: 2)
   * @return {Object[]} Array of objects with header keys
   */
  static getSheetDataAsObjects(sheet, startRow = 2) {
    if (sheet.getLastRow() < startRow) return [];
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
    
    return data.map((row, index) => {
      const obj = { _rowIndex: startRow + index };
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      return obj;
    });
  }
  
  /**
   * Write objects to a sheet
   * @param {Sheet} sheet - Sheet to write to
   * @param {Object[]} objects - Array of objects to write
   * @param {boolean} clearSheet - Whether to clear existing data
   */
  static writeObjectsToSheet(sheet, objects, clearSheet = false) {
    if (objects.length === 0) return;
    
    if (clearSheet) {
      sheet.clear();
    }
    
    // Get headers from first object
    const headers = Object.keys(objects[0]).filter(key => key !== '_rowIndex');
    
    // Write headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Convert objects to 2D array
    const data = objects.map(obj => headers.map(header => obj[header] || ''));
    
    // Write data
    const startRow = clearSheet ? 2 : sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, data.length, headers.length).setValues(data);
  }
  
  /**
   * Update a specific row with object data
   * @param {Sheet} sheet - Sheet to update
   * @param {number} rowIndex - Row index to update
   * @param {Object} data - Object with column updates
   */
  static updateRow(sheet, rowIndex, data) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    headers.forEach((header, colIndex) => {
      if (data.hasOwnProperty(header)) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(data[header]);
      }
    });
  }
  
  /**
   * Find rows matching criteria
   * @param {Sheet} sheet - Sheet to search
   * @param {Object} criteria - Search criteria
   * @return {Object[]} Matching rows as objects
   */
  static findRows(sheet, criteria) {
    const data = this.getSheetDataAsObjects(sheet);
    
    return data.filter(row => {
      return Object.entries(criteria).every(([key, value]) => {
        if (typeof value === 'function') {
          return value(row[key]);
        }
        return row[key] === value;
      });
    });
  }
  
  /**
   * Get unique values from a column
   * @param {Sheet} sheet - Sheet to read from
   * @param {string} columnName - Column name
   * @return {Array} Unique values
   */
  static getUniqueColumnValues(sheet, columnName) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnIndex = headers.indexOf(columnName);
    
    if (columnIndex === -1) return [];
    
    const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1).getValues();
    const uniqueValues = [...new Set(values.flat().filter(v => v !== ''))];
    
    return uniqueValues.sort();
  }
  
  /**
   * Apply formatting to a range
   * @param {Range} range - Range to format
   * @param {Object} format - Formatting options
   */
  static applyFormatting(range, format) {
    if (format.background) range.setBackground(format.background);
    if (format.fontColor) range.setFontColor(format.fontColor);
    if (format.fontSize) range.setFontSize(format.fontSize);
    if (format.fontWeight) range.setFontWeight(format.fontWeight);
    if (format.horizontalAlignment) range.setHorizontalAlignment(format.horizontalAlignment);
    if (format.verticalAlignment) range.setVerticalAlignment(format.verticalAlignment);
    if (format.numberFormat) range.setNumberFormat(format.numberFormat);
    if (format.wrap) range.setWrap(format.wrap);
    if (format.border) {
      range.setBorder(
        format.border.top,
        format.border.left,
        format.border.bottom,
        format.border.right,
        format.border.vertical,
        format.border.horizontal
      );
    }
  }
  
  /**
   * Create data validation rule
   * @param {Array|string} options - List of options or validation type
   * @param {Object} settings - Additional validation settings
   * @return {DataValidation} Validation rule
   */
  static createValidation(options, settings = {}) {
    let builder = SpreadsheetApp.newDataValidation();
    
    if (Array.isArray(options)) {
      builder = builder.requireValueInList(options, true);
    } else {
      switch (options) {
        case 'checkbox':
          builder = builder.requireCheckbox();
          break;
        case 'date':
          builder = builder.requireDate();
          break;
        case 'number':
          if (settings.min !== undefined && settings.max !== undefined) {
            builder = builder.requireNumberBetween(settings.min, settings.max);
          } else if (settings.min !== undefined) {
            builder = builder.requireNumberGreaterThan(settings.min);
          } else if (settings.max !== undefined) {
            builder = builder.requireNumberLessThan(settings.max);
          }
          break;
      }
    }
    
    if (settings.allowInvalid !== undefined) {
      builder = builder.setAllowInvalid(settings.allowInvalid);
    }
    
    if (settings.helpText) {
      builder = builder.setHelpText(settings.helpText);
    }
    
    return builder.build();
  }
  
  /**
   * Batch update cells for performance
   * @param {Sheet} sheet - Sheet to update
   * @param {Array} updates - Array of {row, column, value} objects
   */
  static batchUpdate(sheet, updates) {
    // Group updates by contiguous ranges for efficiency
    const sortedUpdates = updates.sort((a, b) => {
      if (a.row === b.row) return a.column - b.column;
      return a.row - b.row;
    });
    
    let currentRange = null;
    let currentValues = [];
    let ranges = [];
    
    sortedUpdates.forEach(update => {
      if (!currentRange) {
        currentRange = { row: update.row, column: update.column, values: [[]] };
        currentValues = currentRange.values[0];
      }
      
      if (update.row === currentRange.row && 
          update.column === currentRange.column + currentValues.length) {
        // Adjacent cell in same row
        currentValues.push(update.value);
      } else {
        // New range needed
        ranges.push(currentRange);
        currentRange = { row: update.row, column: update.column, values: [[update.value]] };
        currentValues = currentRange.values[0];
      }
    });
    
    if (currentRange) {
      ranges.push(currentRange);
    }
    
    // Apply all updates
    ranges.forEach(range => {
      sheet.getRange(range.row, range.column, 1, range.values[0].length)
        .setValues(range.values);
    });
  }
  
  /**
   * Export sheet data to different formats
   * @param {Sheet} sheet - Sheet to export
   * @param {string} format - Export format (csv, json, array)
   * @return {string|Array|Object} Exported data
   */
  static exportData(sheet, format = 'array') {
    const data = sheet.getDataRange().getValues();
    
    switch (format.toLowerCase()) {
      case 'csv':
        return data.map(row => row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const value = String(cell).replace(/"/g, '""');
          return value.includes(',') ? `"${value}"` : value;
        }).join(',')).join('\n');
        
      case 'json':
        const headers = data[0];
        const jsonData = data.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        return JSON.stringify(jsonData, null, 2);
        
      case 'array':
      default:
        return data;
    }
  }
  
  /**
   * Import data from different formats
   * @param {Sheet} sheet - Sheet to import to
   * @param {string|Array} data - Data to import
   * @param {string} format - Data format (csv, json, array)
   * @param {boolean} clearSheet - Whether to clear existing data
   */
  static importData(sheet, data, format = 'array', clearSheet = true) {
    let importArray;
    
    switch (format.toLowerCase()) {
      case 'csv':
        importArray = data.split('\n').map(row => {
          // Simple CSV parser (doesn't handle all edge cases)
          const regex = /("([^"]|"")*"|[^,]+)/g;
          const cells = [];
          let match;
          while ((match = regex.exec(row)) !== null) {
            let value = match[1];
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/""/g, '"');
            }
            cells.push(value);
          }
          return cells;
        });
        break;
        
      case 'json':
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        if (jsonData.length === 0) return;
        
        const headers = Object.keys(jsonData[0]);
        importArray = [headers];
        jsonData.forEach(obj => {
          importArray.push(headers.map(header => obj[header] || ''));
        });
        break;
        
      case 'array':
      default:
        importArray = data;
    }
    
    if (clearSheet) {
      sheet.clear();
    }
    
    if (importArray.length > 0) {
      const startRow = clearSheet ? 1 : sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, importArray.length, importArray[0].length)
        .setValues(importArray);
    }
  }
  
  /**
   * Check for duplicates in a column
   * @param {Sheet} sheet - Sheet to check
   * @param {string} columnName - Column to check for duplicates
   * @return {Object} Duplicate analysis
   */
  static findDuplicates(sheet, columnName) {
    const data = this.getSheetDataAsObjects(sheet);
    const valueCount = {};
    const duplicates = {};
    
    data.forEach(row => {
      const value = row[columnName];
      if (value && value !== '') {
        if (!valueCount[value]) {
          valueCount[value] = [];
        }
        valueCount[value].push(row._rowIndex);
      }
    });
    
    Object.entries(valueCount).forEach(([value, rows]) => {
      if (rows.length > 1) {
        duplicates[value] = rows;
      }
    });
    
    return {
      hasDuplicates: Object.keys(duplicates).length > 0,
      duplicates: duplicates,
      summary: `Found ${Object.keys(duplicates).length} duplicate values`
    };
  }
  
  /**
   * Create a pivot summary
   * @param {Sheet} sheet - Source sheet
   * @param {string} rowField - Field for rows
   * @param {string} columnField - Field for columns
   * @param {string} valueField - Field for values
   * @param {string} aggregation - Aggregation type (sum, count, average)
   * @return {Array} Pivot data
   */
  static createPivot(sheet, rowField, columnField, valueField, aggregation = 'sum') {
    const data = this.getSheetDataAsObjects(sheet);
    const pivot = {};
    const columns = new Set();
    
    data.forEach(row => {
      const rowKey = row[rowField] || 'Blank';
      const colKey = row[columnField] || 'Blank';
      const value = parseFloat(row[valueField]) || 0;
      
      if (!pivot[rowKey]) pivot[rowKey] = {};
      if (!pivot[rowKey][colKey]) pivot[rowKey][colKey] = [];
      
      pivot[rowKey][colKey].push(value);
      columns.add(colKey);
    });
    
    // Calculate aggregations
    const sortedColumns = Array.from(columns).sort();
    const result = [['', ...sortedColumns]];
    
    Object.keys(pivot).sort().forEach(rowKey => {
      const row = [rowKey];
      sortedColumns.forEach(colKey => {
        const values = pivot[rowKey][colKey] || [];
        let aggValue = 0;
        
        switch (aggregation) {
          case 'sum':
            aggValue = values.reduce((a, b) => a + b, 0);
            break;
          case 'count':
            aggValue = values.length;
            break;
          case 'average':
            aggValue = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
        }
        
        row.push(aggValue);
      });
      result.push(row);
    });
    
    return result;
  }
}