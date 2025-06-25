/**
 * Clay-like Enrichment System for Google Sheets
 * Main entry point and menu setup
 */

// Global constants
const ADDON_NAME = 'Clay Enrichment';
const COMPANY_SHEET = 'Companies';
const CONTACT_SHEET = 'Contacts';
const TEMPLATES_SHEET = 'Enrichment Templates';
const HISTORY_SHEET = 'Enrichment History';
const SETTINGS_SHEET = 'Settings';

/**
 * Runs when the spreadsheet is opened
 */
function onOpen(e) {
  try {
    // Auto-refresh checks
    if (typeof autoRefreshOnOpen === 'function') {
      try {
        autoRefreshOnOpen();
      } catch (refreshError) {
        console.log('Auto-refresh skipped:', refreshError);
      }
    }
    
    // Check if we're in a context where UI is available
    let ui;
    try {
      ui = SpreadsheetApp.getUi();
    } catch (uiError) {
      // UI not available in this context
      console.log('UI not available, skipping menu creation');
      return;
    }
    
    if (!e || (e.authMode !== ScriptApp.AuthMode.NONE && e.authMode !== undefined)) {
      
      // Create main menu
      const menu = ui.createMenu(ADDON_NAME)
        .addItem('Open Enrichment Panel', 'showSidebar')
        .addSeparator()
        .addSubMenu(ui.createMenu('Setup')
          .addItem('Initialize Sheets', 'initializeSheets')
          .addItem('Configure API Key', 'showApiKeyDialog'))
        .addSubMenu(ui.createMenu('Enrichment')
          .addItem('Enrich Current Sheet', 'enrichTemplateSheet')
          .addSeparator()
          .addItem('Enrich Selected Companies', 'enrichSelectedCompanies')
          .addItem('Enrich Selected Contacts', 'enrichSelectedContacts')
          .addItem('Enrich All New Records', 'enrichAllNew')
          .addSeparator()
          .addItem('Reset Selected for Re-enrichment', 'resetForReenrichment'))
        .addSubMenu(ui.createMenu('Templates')
          .addItem('Create New Template', 'showTemplateCreator')
          .addItem('Manage Templates', 'showTemplateManager')
          .addItem('Reset Default Templates', 'resetDefaultTemplates')
          .addSeparator()
          .addItem('Load Example Templates', 'loadExampleTemplates')
          .addItem('Generate Sheets from Templates', 'generateSheetsFromTemplates'))
        .addSubMenu(ui.createMenu('Tools')
          .addItem('Check for Duplicates', 'checkDuplicates')
          .addItem('Export Data', 'showExportDialog')
          .addItem('View Usage Stats', 'showUsageStats')
          .addItem('Refresh Sheet Formatting', 'refreshSheetFormatting')
          .addSeparator()
          .addItem('Refresh Spreadsheet', 'forceRefreshSpreadsheet')
          .addItem('Clear Cache', 'clearAllCaches'))
        .addSeparator()
        .addItem('Help & Documentation', 'showHelp')
        .addItem('About', 'showAbout');
      
      menu.addToUi();
      
      // Initialize on first open with full auth
      if (e && e.authMode === ScriptApp.AuthMode.FULL) {
        try {
          initializeIfNeeded();
        } catch (initError) {
          console.log('Initialization will happen on first use:', initError);
        }
      }
    }
  } catch (error) {
    // Fail silently - this often happens during initial script setup
    console.log('Menu will be available after authorization:', error.toString());
  }
}

/**
 * Runs when the add-on is installed
 */
function onInstall(e) {
  onOpen(e);
  initializeSheets();
}

/**
 * Shows the main sidebar interface
 */
function showSidebar() {
  try {
    const template = HtmlService.createTemplateFromFile('Sidebar');
    const html = template.evaluate()
      .setTitle('Clay Enrichment Panel')
      .setWidth(400);
    
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (error) {
    showError('Failed to open sidebar: ' + error.toString());
  }
}

/**
 * Initialize sheets if they don't exist
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui;
  let hasUI = true;
  
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    // UI not available in this context
    hasUI = false;
    console.log('Running without UI context');
  }
  
  try {
    // Create Companies sheet
    let companiesSheet = ss.getSheetByName(COMPANY_SHEET);
    if (!companiesSheet) {
      companiesSheet = ss.insertSheet(COMPANY_SHEET);
      setupCompaniesSheet(companiesSheet);
    }
    
    // Create Contacts sheet
    let contactsSheet = ss.getSheetByName(CONTACT_SHEET);
    if (!contactsSheet) {
      contactsSheet = ss.insertSheet(CONTACT_SHEET);
      setupContactsSheet(contactsSheet);
    }
    
    // Create Enrichment Templates sheet
    let templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
    if (!templatesSheet) {
      templatesSheet = ss.insertSheet(TEMPLATES_SHEET);
      setupTemplatesSheet(templatesSheet);
      // DefaultTemplates will be populated later if available
      try {
        if (typeof DefaultTemplates !== 'undefined') {
          DefaultTemplates.populate(templatesSheet);
        }
      } catch (e) {
        console.log('DefaultTemplates not yet loaded');
      }
    }
    
    // Create Enrichment History sheet
    let historySheet = ss.getSheetByName(HISTORY_SHEET);
    if (!historySheet) {
      historySheet = ss.insertSheet(HISTORY_SHEET);
      setupHistorySheet(historySheet);
    }
    
    // Create Settings sheet (hidden)
    let settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet(SETTINGS_SHEET);
      setupSettingsSheet(settingsSheet);
      settingsSheet.hideSheet();
    }
    
    // Create named ranges
    createNamedRanges(ss);
    
    if (hasUI) {
      ui.alert('Success', 'All sheets have been initialized successfully!', ui.ButtonSet.OK);
    } else {
      console.log('All sheets have been initialized successfully!');
    }
  } catch (error) {
    if (hasUI) {
      ui.alert('Error', 'Failed to initialize sheets: ' + error.toString(), ui.ButtonSet.OK);
    } else {
      console.error('Failed to initialize sheets:', error);
      throw error;
    }
  }
}

/**
 * Setup Companies sheet structure
 */
function setupCompaniesSheet(sheet) {
  const headers = [
    'Company ID', 'Company Name', 'Domain', 'Industry', 'Company Size',
    'Employee Count', 'Revenue Range', 'Founded Year', 'Headquarters Location',
    'Company Description', 'Technologies Used', 'Key Products/Services',
    'Target Market', 'Competitors', 'Recent News', 'Social Media Links',
    'Enrichment Status', 'Last Enriched Date', 'Enrichment Template Used',
    'API Calls Used', 'Notes'
  ];
  
  // Set headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('#ffffff');
  
  // Add header notes to guide users
  const headerNotes = [
    'Unique identifier (e.g., C001)', // Company ID
    'Full company name (required)', // Company Name
    'Company website domain (required)', // Domain
    'Will be enriched by AI', // Industry
    'Will be enriched by AI', // Company Size
    'Will be enriched by AI', // Employee Count
    'Will be enriched by AI', // Revenue Range
    'Will be enriched by AI', // Founded Year
    'Will be enriched by AI', // Headquarters
    'Will be enriched by AI', // Description
    'Will be enriched by AI', // Technologies
    'Will be enriched by AI', // Products
    'Will be enriched by AI', // Target Market
    'Will be enriched by AI', // Competitors
    'Will be enriched by AI', // Recent News
    'Will be enriched by AI', // Social Media
    'System field - do not edit', // Status
    'System field - do not edit', // Last Enriched
    'System field - do not edit', // Template Used
    'System field - do not edit', // API Calls
    'Optional notes' // Notes
  ];
  
  // Add notes to header cells
  headers.forEach((header, index) => {
    sheet.getRange(1, index + 1).setNote(headerNotes[index]);
  });
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 100); // Company ID
  sheet.setColumnWidth(2, 200); // Company Name
  sheet.setColumnWidth(3, 150); // Domain
  sheet.setColumnWidth(10, 300); // Company Description
  
  // Apply data validation
  const statusRange = sheet.getRange(2, 17, sheet.getMaxRows() - 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Processing', 'Complete', 'Failed', 'Skipped'])
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);
  
  // Apply conditional formatting
  const rules = [];
  
  // Green for complete
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Complete')
    .setBackground('#e8f5e9')
    .setRanges([statusRange])
    .build());
  
  // Yellow for processing
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Processing')
    .setBackground('#fff3e0')
    .setRanges([statusRange])
    .build());
  
  // Red for failed
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Failed')
    .setBackground('#ffebee')
    .setRanges([statusRange])
    .build());
  
  sheet.setConditionalFormatRules(rules);
  
  // Add visual formatting to distinguish input vs enriched columns
  // Input columns (1-3): White background
  const inputRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 3);
  inputRange.setBackground('#ffffff');
  inputRange.setBorder(true, true, true, true, false, false, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  
  // Enriched columns (4-16): Light gray background
  const enrichedRange = sheet.getRange(2, 4, sheet.getMaxRows() - 1, 13);
  enrichedRange.setBackground('#f8f9fa');
  enrichedRange.setFontColor('#5f6368');
  
  // System columns (17-20): Darker gray background
  const systemRange = sheet.getRange(2, 17, sheet.getMaxRows() - 1, 4);
  systemRange.setBackground('#e8eaed');
  systemRange.setFontColor('#5f6368');
  
  // Notes column (21): White background
  const notesRange = sheet.getRange(2, 21, sheet.getMaxRows() - 1, 1);
  notesRange.setBackground('#ffffff');
  
  // Add sample data row
  const sampleData = [
    'C001', 'Acme Corporation', 'acme.com', 
    '', '', '', '', '', '', '', '', '', '', '', '', '',
    'Pending', '', '', '', ''
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  sheet.getRange(2, 1, 1, headers.length).setFontColor('#9e9e9e');
  sheet.getRange(2, 1, 1, headers.length).setFontStyle('italic');
  
  // Add instructions in row 3
  sheet.getRange(3, 1).setValue('← Add your companies below this row →');
  sheet.getRange(3, 1).setFontColor('#666666');
  sheet.getRange(3, 1).setFontStyle('italic');
  sheet.getRange(3, 1, 1, headers.length).merge();
  sheet.getRange(3, 1, 1, headers.length).setHorizontalAlignment('center');
  
  // Add visual legend
  addSheetLegend(sheet, 'company');
}

/**
 * Setup Contacts sheet structure
 */
function setupContactsSheet(sheet) {
  const headers = [
    'Contact ID', 'First Name', 'Last Name', 'Company Name', 'Company Domain',
    'Job Title', 'Department', 'Seniority Level', 'Email', 'Phone',
    'LinkedIn URL', 'Twitter/X Handle', 'Location', 'Years in Role',
    'Previous Companies', 'Skills/Expertise', 'Direct Reports',
    'Enrichment Status', 'Last Enriched Date', 'Confidence Score',
    'Source', 'Notes'
  ];
  
  // Set headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('#ffffff');
  
  // Add header notes to guide users
  const headerNotes = [
    'Unique identifier (e.g., CT001)', // Contact ID
    'Contact first name (required)', // First Name
    'Contact last name (required)', // Last Name
    'Company name (required)', // Company Name
    'Company domain (optional)', // Company Domain
    'Will be enriched by AI', // Job Title
    'Will be enriched by AI', // Department
    'Will be enriched by AI', // Seniority
    'Will be enriched by AI', // Email
    'Will be enriched by AI', // Phone
    'Will be enriched by AI', // LinkedIn
    'Will be enriched by AI', // Twitter
    'Will be enriched by AI', // Location
    'Will be enriched by AI', // Years in Role
    'Will be enriched by AI', // Previous Companies
    'Will be enriched by AI', // Skills
    'Will be enriched by AI', // Direct Reports
    'System field - do not edit', // Status
    'System field - do not edit', // Last Enriched
    'System field - do not edit', // Confidence
    'System field - do not edit', // Source
    'Optional notes' // Notes
  ];
  
  // Add notes to header cells
  headers.forEach((header, index) => {
    sheet.getRange(1, index + 1).setNote(headerNotes[index]);
  });
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 100); // Contact ID
  sheet.setColumnWidth(2, 120); // First Name
  sheet.setColumnWidth(3, 120); // Last Name
  sheet.setColumnWidth(4, 200); // Company Name
  
  // Apply data validation
  const statusRange = sheet.getRange(2, 18, sheet.getMaxRows() - 1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Processing', 'Complete', 'Failed', 'Skipped'])
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);
  
  const seniorityRange = sheet.getRange(2, 8, sheet.getMaxRows() - 1);
  const seniorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Entry', 'Mid', 'Senior', 'Executive', 'C-Suite'])
    .setAllowInvalid(true)
    .build();
  seniorityRange.setDataValidation(seniorityRule);
  
  // Apply conditional formatting (same as companies)
  const rules = [];
  
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Complete')
    .setBackground('#e8f5e9')
    .setRanges([statusRange])
    .build());
  
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Processing')
    .setBackground('#fff3e0')
    .setRanges([statusRange])
    .build());
  
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Failed')
    .setBackground('#ffebee')
    .setRanges([statusRange])
    .build());
  
  sheet.setConditionalFormatRules(rules);
  
  // Add visual formatting to distinguish input vs enriched columns
  // Input columns (1-5): White background
  const inputRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 5);
  inputRange.setBackground('#ffffff');
  inputRange.setBorder(true, true, true, true, false, false, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  
  // Enriched columns (6-17): Light gray background
  const enrichedRange = sheet.getRange(2, 6, sheet.getMaxRows() - 1, 12);
  enrichedRange.setBackground('#f8f9fa');
  enrichedRange.setFontColor('#5f6368');
  
  // System columns (18-21): Darker gray background
  const systemRange = sheet.getRange(2, 18, sheet.getMaxRows() - 1, 4);
  systemRange.setBackground('#e8eaed');
  systemRange.setFontColor('#5f6368');
  
  // Notes column (22): White background
  const notesRange = sheet.getRange(2, 22, sheet.getMaxRows() - 1, 1);
  notesRange.setBackground('#ffffff');
  
  // Add sample data row
  const sampleData = [
    'CT001', 'John', 'Doe', 'Acme Corporation', 'acme.com',
    '', '', '', '', '', '', '', '', '', '', '', '',
    'Pending', '', '', '', ''
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  sheet.getRange(2, 1, 1, headers.length).setFontColor('#9e9e9e');
  sheet.getRange(2, 1, 1, headers.length).setFontStyle('italic');
  
  // Add instructions in row 3
  sheet.getRange(3, 1).setValue('← Add your contacts below this row →');
  sheet.getRange(3, 1).setFontColor('#666666');
  sheet.getRange(3, 1).setFontStyle('italic');
  sheet.getRange(3, 1, 1, headers.length).merge();
  sheet.getRange(3, 1, 1, headers.length).setHorizontalAlignment('center');
  
  // Add visual legend
  addSheetLegend(sheet, 'contact');
}

/**
 * Setup Templates sheet structure
 */
function setupTemplatesSheet(sheet) {
  const headers = [
    'Template ID', 'Template Name', 'Template Type', 'Description',
    'Prompt Template', 'Required Input Fields', 'Output Fields',
    'Model Settings', 'Max Tokens', 'Temperature', 'Created Date',
    'Last Modified', 'Usage Count', 'Success Rate', 'Average Cost'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(4, 300); // Description
  sheet.setColumnWidth(5, 400); // Prompt Template
}

/**
 * Setup History sheet structure
 */
function setupHistorySheet(sheet) {
  const headers = [
    'Job ID', 'Timestamp', 'Entity Type', 'Entity ID', 'Template Used',
    'Status', 'API Calls Made', 'Tokens Used', 'Cost', 'Processing Time',
    'Error Message', 'Retry Count'
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#34a853');
  headerRange.setFontColor('#ffffff');
  
  sheet.setFrozenRows(1);
}

/**
 * Setup Settings sheet structure
 */
function setupSettingsSheet(sheet) {
  const settings = [
    ['Setting Name', 'Value'],
    ['API_KEY', ''],
    ['DEFAULT_MODEL', 'claude-sonnet-4-20250514'],
    ['RATE_LIMIT', '10'],
    ['BATCH_SIZE', '50'],
    ['CACHE_DURATION', '86400'],
    ['AUTO_RETRY', 'true'],
    ['MAX_RETRIES', '3'],
    ['WEBHOOK_URL', '']
  ];
  
  const range = sheet.getRange(1, 1, settings.length, 2);
  range.setValues(settings);
  
  // Format header
  const headerRange = sheet.getRange(1, 1, 1, 2);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#9e9e9e');
  headerRange.setFontColor('#ffffff');
}

/**
 * Create named ranges for easier access
 */
function createNamedRanges(ss) {
  try {
    // Remove existing named ranges
    const namedRanges = ss.getNamedRanges();
    namedRanges.forEach(range => range.remove());
    
    // Create new named ranges
    const companiesSheet = ss.getSheetByName(COMPANY_SHEET);
    const contactsSheet = ss.getSheetByName(CONTACT_SHEET);
    const templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
    
    if (companiesSheet) {
      ss.setNamedRange('CompanyData', companiesSheet.getDataRange());
    }
    
    if (contactsSheet) {
      ss.setNamedRange('ContactData', contactsSheet.getDataRange());
    }
    
    if (templatesSheet) {
      ss.setNamedRange('Templates', templatesSheet.getDataRange());
    }
  } catch (error) {
    console.error('Error creating named ranges:', error);
  }
}

/**
 * Initialize if needed on first open
 */
function initializeIfNeeded() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = [COMPANY_SHEET, CONTACT_SHEET, TEMPLATES_SHEET, HISTORY_SHEET, SETTINGS_SHEET];
  
  const existingSheets = ss.getSheets().map(sheet => sheet.getName());
  const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));
  
  if (missingSheets.length > 0) {
    initializeSheets();
  } else {
    // Check if templates sheet is empty and populate if needed
    const templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
    if (templatesSheet && templatesSheet.getLastRow() <= 1) {
      try {
        DefaultTemplates.populate(templatesSheet);
        console.log('Default templates populated automatically');
      } catch (e) {
        console.log('Templates will be populated on first use');
      }
    }
  }
}

/**
 * Show API key configuration dialog
 */
function showApiKeyDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('ApiKeyDialog')
      .setWidth(400)
      .setHeight(300);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Configure API Key');
  } catch (error) {
    // Fallback to sidebar if dialog fails
    showSidebar();
    SpreadsheetApp.getUi().alert('Please configure your API key in the Setup tab of the sidebar.');
  }
}

/**
 * Show error message
 */
function showError(message) {
  try {
    SpreadsheetApp.getUi().alert('Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // UI not available, log to console instead
    console.error('Error:', message);
  }
}

/**
 * Show help documentation
 */
function showHelp() {
  const helpText = `Clay Enrichment Help\n\n1. Setup: Configure your Anthropic API key\n2. Add data to Companies or Contacts sheets\n3. Select rows to enrich\n4. Open sidebar and choose a template\n5. Click 'Enrich Selected'\n\nFor more help, visit the documentation.`;
  
  SpreadsheetApp.getUi().alert('Help', helpText, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Show about dialog
 */
function showAbout() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'About Clay Enrichment',
    'Clay-like Enrichment System v1.0\\n\\n' +
    'Built with Google Apps Script and Anthropic Claude API\\n\\n' +
    'This tool helps you enrich company and contact data using AI-powered web search and analysis.',
    ui.ButtonSet.OK
  );
}

/**
 * Include HTML files in templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Check and populate templates if needed
 */
function checkAndPopulateTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
  
  if (!templatesSheet) {
    SpreadsheetApp.getUi().alert('Templates sheet not found. Please run "Initialize Sheets" first.');
    return false;
  }
  
  // Check if templates are already populated
  if (templatesSheet.getLastRow() > 1) {
    // Check if we have actual template data (not just headers)
    const existingTemplates = templatesSheet.getRange(2, 1, 1, 1).getValue();
    if (existingTemplates && existingTemplates !== '') {
      console.log('Templates already populated');
      return true;
    }
  }
  
  try {
    // Clear any partial data
    if (templatesSheet.getLastRow() > 1) {
      templatesSheet.getRange(2, 1, templatesSheet.getLastRow() - 1, templatesSheet.getLastColumn()).clear();
    }
    
    // Populate templates
    DefaultTemplates.populate(templatesSheet);
    SpreadsheetApp.getUi().alert('Success', 'Default templates have been loaded successfully!', SpreadsheetApp.getUi().ButtonSet.OK);
    return true;
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', 'Failed to load templates: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    return false;
  }
}

/**
 * Force reload all default templates
 */
function forceReloadTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
  
  if (!templatesSheet) {
    initializeSheets();
    return;
  }
  
  // Clear existing templates
  if (templatesSheet.getLastRow() > 1) {
    templatesSheet.getRange(2, 1, templatesSheet.getLastRow() - 1, templatesSheet.getLastColumn()).clear();
  }
  
  // Reload templates
  DefaultTemplates.populate(templatesSheet);
  SpreadsheetApp.getUi().alert('Templates reloaded successfully!');
}

/**
 * Add a visual legend to help users understand the sheet
 */
function addSheetLegend(sheet, sheetType) {
  const lastCol = sheet.getLastColumn();
  const legendCol = lastCol + 2;
  
  // Add legend title
  sheet.getRange(1, legendCol).setValue('Column Guide');
  sheet.getRange(1, legendCol).setFontWeight('bold');
  sheet.getRange(1, legendCol).setBackground('#34a853');
  sheet.getRange(1, legendCol).setFontColor('#ffffff');
  
  // Add legend items
  const legendItems = [
    ['', ''],
    ['White cells:', 'User input required'],
    ['Light gray cells:', 'AI will enrich these'],
    ['Dark gray cells:', 'System managed'],
    ['', ''],
    ['Status Colors:', ''],
    ['Green:', 'Enrichment complete'],
    ['Yellow:', 'Processing'],
    ['Red:', 'Failed'],
    ['', ''],
    ['Required Fields:', ''],
    [sheetType === 'company' ? 'Company Name' : 'First Name', '✓'],
    [sheetType === 'company' ? 'Domain' : 'Last Name', '✓'],
    [sheetType === 'contact' ? 'Company Name' : '', sheetType === 'contact' ? '✓' : '']
  ];
  
  // Set legend values
  sheet.getRange(2, legendCol, legendItems.length, 2).setValues(legendItems);
  
  // Format legend
  sheet.getRange(6, legendCol).setFontWeight('bold');
  sheet.getRange(11, legendCol).setFontWeight('bold');
  
  // Color code the status examples
  sheet.getRange(7, legendCol).setBackground('#e8f5e9');
  sheet.getRange(8, legendCol).setBackground('#fff3e0');
  sheet.getRange(9, legendCol).setBackground('#ffebee');
  
  // Format the column
  sheet.setColumnWidth(legendCol, 120);
  sheet.setColumnWidth(legendCol + 1, 120);
  
  // Add border around legend
  sheet.getRange(1, legendCol, legendItems.length + 1, 2)
    .setBorder(true, true, true, true, true, true, '#666666', SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Show template creator dialog
 */
function showTemplateCreator() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('TemplateCreator')
      .setWidth(650)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Create New Enrichment Template');
  } catch (error) {
    showError('Failed to open template creator: ' + error.toString());
  }
}

/**
 * Load example custom templates
 */
function loadExampleTemplates() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.alert(
    'Load Example Templates',
    'This will create 3 example custom templates:\n\n' +
    '1. Executive Profile Builder - Deep profiles of C-level executives\n' +
    '2. Company Culture Analyzer - Employee sentiment and culture analysis\n' +
    '3. Market Opportunity Finder - Expansion and growth opportunities\n\n' +
    'Each template will create its own sheet. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      const manager = initializeTemplateManager();
      const examples = DefaultTemplates.getExampleCustomTemplates();
      let created = 0;
      
      examples.forEach(example => {
        try {
          const result = manager.createTemplateWithSheet(example);
          created++;
          console.log(`Created template: ${example.name}`);
        } catch (error) {
          console.error(`Failed to create ${example.name}: ${error}`);
        }
      });
      
      if (created > 0) {
        ui.alert(
          'Success',
          `Created ${created} example template(s) with their sheets.\n\n` +
          'You can now:\n' +
          '1. Add data to the new sheets\n' +
          '2. Select rows and use "Enrich Current Sheet"\n' +
          '3. Create your own templates using "Create New Template"',
          ui.ButtonSet.OK
        );
      } else {
        ui.alert('Error', 'Failed to create example templates. They may already exist.', ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', 'Failed to load examples: ' + error.toString(), ui.ButtonSet.OK);
    }
  }
}

/**
 * Generate sheets from existing templates
 */
function generateSheetsFromTemplates() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templatesSheet = ss.getSheetByName(TEMPLATES_SHEET);
  
  if (!templatesSheet) {
    ui.alert('Templates sheet not found. Please initialize sheets first.');
    return;
  }
  
  const result = ui.alert(
    'Generate Template Sheets',
    'This will create a new sheet for each custom template that doesn\'t already have one. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      const manager = initializeTemplateManager();
      const data = templatesSheet.getDataRange().getValues();
      let created = 0;
      
      for (let i = 1; i < data.length; i++) {
        const templateId = data[i][0];
        const templateName = data[i][1];
        
        // Only process custom templates
        if (templateId && templateId.startsWith('custom-')) {
          const sheetName = manager.sanitizeSheetName(templateName);
          
          // Check if sheet already exists
          if (!ss.getSheetByName(sheetName)) {
            const template = {
              id: templateId,
              name: templateName,
              type: data[i][2],
              description: data[i][3],
              promptTemplate: data[i][4],
              requiredFields: data[i][5].split(', ').filter(f => f),
              outputFields: data[i][6].split(', ').filter(f => f),
              modelSettings: JSON.parse(data[i][7]),
              sheetName: sheetName
            };
            
            manager.createTemplateSheet(template);
            created++;
          }
        }
      }
      
      if (created > 0) {
        ui.alert('Success', `Created ${created} new template sheet(s).`, ui.ButtonSet.OK);
      } else {
        ui.alert('No new sheets needed. All templates already have sheets.', ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', 'Failed to generate sheets: ' + error.toString(), ui.ButtonSet.OK);
    }
  }
}

// Add missing functions referenced in menu
function showTemplateManager() {
  showSidebar();
  SpreadsheetApp.getUi().alert('Please manage templates in the Templates tab of the sidebar.');
}

function resetDefaultTemplates() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Reset Templates',
    'This will reset all default templates. Custom templates will be preserved. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(TEMPLATES_SHEET);
    if (sheet) {
      // Clear only default templates
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i > 0; i--) {
        if (data[i][0] && !data[i][0].toString().startsWith('custom-')) {
          sheet.deleteRow(i + 1);
        }
      }
      // Re-populate defaults
      try {
        if (typeof DefaultTemplates !== 'undefined') {
          DefaultTemplates.populate(sheet);
          ui.alert('Default templates have been reset.');
        } else {
          ui.alert('Error', 'DefaultTemplates module not loaded. Please refresh and try again.', ui.ButtonSet.OK);
        }
      } catch (e) {
        ui.alert('Error', 'Failed to reset templates: ' + e.toString(), ui.ButtonSet.OK);
      }
    }
  }
}

function checkDuplicates() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  try {
    if (sheetName === COMPANY_SHEET) {
      if (typeof CompanyEnrichment === 'undefined') {
        throw new Error('CompanyEnrichment module not loaded. Please refresh and try again.');
      }
      CompanyEnrichment.initialize();
      const result = CompanyEnrichment.findDuplicates();
      SpreadsheetApp.getUi().alert(
        'Duplicate Check',
        `Found ${result.totalDuplicates} duplicates:\n` +
        `- Domain duplicates: ${Object.keys(result.domainDuplicates.duplicates).length}\n` +
        `- Name duplicates: ${Object.keys(result.nameDuplicates.duplicates).length}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else if (sheetName === CONTACT_SHEET) {
      if (typeof ContactEnrichment === 'undefined') {
        throw new Error('ContactEnrichment module not loaded. Please refresh and try again.');
      }
      ContactEnrichment.initialize();
      const result = ContactEnrichment.findDuplicates();
      SpreadsheetApp.getUi().alert(
        'Duplicate Check',
        `Found ${result.totalDuplicates} duplicates:\n` +
        `- Email duplicates: ${Object.keys(result.emailDuplicates.duplicates).length}\n` +
        `- Name/Company duplicates: ${Object.keys(result.nameCompanyDuplicates.duplicates).length}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      SpreadsheetApp.getUi().alert('Please select either Companies or Contacts sheet.');
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showExportDialog() {
  showSidebar();
  SpreadsheetApp.getUi().alert('Please use the export options in the sidebar.');
}

function showUsageStats() {
  showSidebar();
  SpreadsheetApp.getUi().alert('Please view usage statistics in the History tab of the sidebar.');
}

/**
 * Reset selected rows for re-enrichment
 */
function resetForReenrichment() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  const ui = SpreadsheetApp.getUi();
  
  if (sheetName !== COMPANY_SHEET && sheetName !== CONTACT_SHEET) {
    ui.alert('Please select rows in either Companies or Contacts sheet.');
    return;
  }
  
  const selection = sheet.getActiveRange();
  if (!selection) {
    ui.alert('Please select the rows you want to re-enrich.');
    return;
  }
  
  const result = ui.alert(
    'Reset for Re-enrichment',
    `This will reset ${selection.getNumRows()} selected rows to "Pending" status for re-enrichment. Continue?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    // Find status column (17 for companies, 18 for contacts)
    const statusCol = sheetName === COMPANY_SHEET ? 17 : 18;
    
    // Get the row numbers from selection
    const startRow = selection.getRow();
    const numRows = selection.getNumRows();
    
    // Reset status to Pending
    const statusRange = sheet.getRange(startRow, statusCol, numRows, 1);
    const pendingValues = Array(numRows).fill(['Pending']);
    statusRange.setValues(pendingValues);
    
    // Clear last enriched date
    const dateCol = statusCol + 1;
    const dateRange = sheet.getRange(startRow, dateCol, numRows, 1);
    dateRange.clearContent();
    
    // Clear enrichment template used
    const templateCol = statusCol + 2;
    const templateRange = sheet.getRange(startRow, templateCol, numRows, 1);
    templateRange.clearContent();
    
    ui.alert('Success', `${numRows} rows have been reset and are ready for re-enrichment.`, ui.ButtonSet.OK);
  }
}

/**
 * Refresh sheet formatting without losing data
 */
function refreshSheetFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.alert(
    'Refresh Formatting',
    'This will update the visual formatting of Companies and Contacts sheets. Your data will be preserved. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      // Refresh Companies sheet
      const companiesSheet = ss.getSheetByName(COMPANY_SHEET);
      if (companiesSheet) {
        applyCompanySheetFormatting(companiesSheet);
      }
      
      // Refresh Contacts sheet
      const contactsSheet = ss.getSheetByName(CONTACT_SHEET);
      if (contactsSheet) {
        applyContactSheetFormatting(contactsSheet);
      }
      
      ui.alert('Success', 'Sheet formatting has been refreshed!', ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('Error', 'Failed to refresh formatting: ' + error.toString(), ui.ButtonSet.OK);
    }
  }
}

/**
 * Apply formatting to existing Companies sheet
 */
function applyCompanySheetFormatting(sheet) {
  const headers = sheet.getRange(1, 1, 1, 21).getValues()[0];
  
  // Add visual formatting to distinguish input vs enriched columns
  // Input columns (1-3): White background
  const inputRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 3);
  inputRange.setBackground('#ffffff');
  inputRange.setBorder(true, true, true, true, false, false, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  
  // Enriched columns (4-16): Light gray background
  const enrichedRange = sheet.getRange(2, 4, sheet.getMaxRows() - 1, 13);
  enrichedRange.setBackground('#f8f9fa');
  
  // System columns (17-20): Darker gray background
  const systemRange = sheet.getRange(2, 17, sheet.getMaxRows() - 1, 4);
  systemRange.setBackground('#e8eaed');
  
  // Notes column (21): White background
  const notesRange = sheet.getRange(2, 21, sheet.getMaxRows() - 1, 1);
  notesRange.setBackground('#ffffff');
  
  // Add visual legend if not present
  if (sheet.getRange(1, 23).getValue() !== 'Column Guide') {
    addSheetLegend(sheet, 'company');
  }
}

/**
 * Apply formatting to existing Contacts sheet
 */
function applyContactSheetFormatting(sheet) {
  const headers = sheet.getRange(1, 1, 1, 22).getValues()[0];
  
  // Add visual formatting to distinguish input vs enriched columns
  // Input columns (1-5): White background
  const inputRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 5);
  inputRange.setBackground('#ffffff');
  inputRange.setBorder(true, true, true, true, false, false, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  
  // Enriched columns (6-17): Light gray background
  const enrichedRange = sheet.getRange(2, 6, sheet.getMaxRows() - 1, 12);
  enrichedRange.setBackground('#f8f9fa');
  
  // System columns (18-21): Darker gray background
  const systemRange = sheet.getRange(2, 18, sheet.getMaxRows() - 1, 4);
  systemRange.setBackground('#e8eaed');
  
  // Notes column (22): White background
  const notesRange = sheet.getRange(2, 22, sheet.getMaxRows() - 1, 1);
  notesRange.setBackground('#ffffff');
  
  // Add visual legend if not present
  if (sheet.getRange(1, 24).getValue() !== 'Column Guide') {
    addSheetLegend(sheet, 'contact');
  }
}