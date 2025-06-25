/**
 * Template-based Enrichment Functions
 * Handles enrichment for custom template sheets
 */

/**
 * Enrich data in any template-based sheet
 */
function enrichTemplateSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  const ui = SpreadsheetApp.getUi();
  
  // Skip system sheets
  const systemSheets = [TEMPLATES_SHEET, HISTORY_SHEET, SETTINGS_SHEET];
  if (systemSheets.includes(sheetName)) {
    ui.alert('This sheet cannot be enriched. Please select a data sheet.');
    return;
  }
  
  // Get template for this sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (!template) {
    ui.alert('No template found for this sheet. Please use a template-based sheet.');
    return;
  }
  
  // Get selected range
  const selection = sheet.getActiveRange();
  if (!selection) {
    ui.alert('Please select rows to enrich.');
    return;
  }
  
  // Show enrichment options
  const result = ui.alert(
    'Enrich Template Data',
    `Enrich ${selection.getNumRows()} selected rows using "${template.name}" template?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      const options = {
        templateId: template.id,
        templateName: template.name,
        sheetName: sheetName,
        selection: {
          startRow: selection.getRow(),
          numRows: selection.getNumRows()
        }
      };
      
      performTemplateEnrichment(sheet, template, options);
    } catch (error) {
      ui.alert('Error', 'Enrichment failed: ' + error.toString(), ui.ButtonSet.OK);
    }
  }
}

/**
 * Perform enrichment on template sheet
 */
function performTemplateEnrichment(sheet, template, options) {
  const ui = SpreadsheetApp.getUi();
  const startRow = options.selection.startRow;
  const numRows = options.selection.numRows;
  
  // Get headers to find column positions
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Find status column
  const statusCol = headers.indexOf('Enrichment Status') + 1;
  if (statusCol === 0) {
    throw new Error('Enrichment Status column not found');
  }
  
  // Find required field columns
  const fieldColumns = {};
  template.requiredFields.forEach(field => {
    const header = fieldToHeader(field);
    const col = headers.indexOf(header) + 1;
    if (col === 0) {
      // Try alternate formats
      const altCol = headers.findIndex(h => h.toLowerCase().includes(field.toLowerCase())) + 1;
      if (altCol > 0) {
        fieldColumns[field] = altCol;
      } else {
        throw new Error(`Required field "${field}" not found in sheet`);
      }
    } else {
      fieldColumns[field] = col;
    }
  });
  
  // Find output field columns
  const outputColumns = {};
  template.outputFields.forEach(field => {
    const header = fieldToHeader(field);
    const col = headers.indexOf(header) + 1;
    if (col > 0) {
      outputColumns[field] = col;
    }
  });
  
  // Process each row
  let processed = 0;
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    
    // Check status
    const status = sheet.getRange(row, statusCol).getValue();
    if (status === 'Complete' && !options.forceReenrich) {
      continue;
    }
    
    // Set processing status
    sheet.getRange(row, statusCol).setValue('Processing');
    SpreadsheetApp.flush();
    
    try {
      // Gather input data
      const inputData = {};
      Object.entries(fieldColumns).forEach(([field, col]) => {
        inputData[field] = sheet.getRange(row, col).getValue();
      });
      
      // Process template prompt
      const prompt = DefaultTemplates.processTemplate(template.promptTemplate, inputData);
      
      // Call Anthropic API
      const result = callAnthropicForEnrichment(prompt, template.modelSettings);
      
      if (result.success) {
        // Parse response and update cells
        const data = parseEnrichmentResponse(result.content);
        
        // Update output fields
        Object.entries(outputColumns).forEach(([field, col]) => {
          if (data[field] !== undefined) {
            sheet.getRange(row, col).setValue(data[field]);
          }
        });
        
        // Update status
        sheet.getRange(row, statusCol).setValue('Complete');
        sheet.getRange(row, statusCol + 1).setValue(new Date()); // Last enriched date
        
        // Update confidence if available
        const confidenceCol = headers.indexOf('Confidence Score') + 1;
        if (confidenceCol > 0 && data.confidence) {
          sheet.getRange(row, confidenceCol).setValue(data.confidence);
        }
        
        // Update token usage
        const tokensCol = headers.indexOf('API Tokens Used') + 1;
        if (tokensCol > 0 && result.usage) {
          const totalTokens = (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
          sheet.getRange(row, tokensCol).setValue(totalTokens);
        }
        
        successful++;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      // Mark as failed
      sheet.getRange(row, statusCol).setValue('Failed');
      
      // Add error to notes
      const notesCol = headers.indexOf('Notes') + 1;
      if (notesCol > 0) {
        sheet.getRange(row, notesCol).setValue('Error: ' + error.toString());
      }
      
      failed++;
    }
    
    processed++;
    
    // Update progress (every 5 rows)
    if (processed % 5 === 0) {
      ui.toast(`Processing: ${processed}/${numRows} rows`, 'Enrichment Progress', 3);
    }
  }
  
  // Show results
  ui.alert(
    'Enrichment Complete',
    `Processed: ${processed} rows\nSuccessful: ${successful}\nFailed: ${failed}`,
    ui.ButtonSet.OK
  );
}

/**
 * Call Anthropic API for enrichment
 */
function callAnthropicForEnrichment(prompt, modelSettings) {
  try {
    const anthropic = new AnthropicService();
    return anthropic.makeRequest(prompt, {
      model: modelSettings.model,
      maxTokens: modelSettings.maxTokens,
      temperature: modelSettings.temperature
    });
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Parse enrichment response
 */
function parseEnrichmentResponse(content) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, try to parse as structured text
    const data = {};
    const lines = content.split('\n');
    lines.forEach(line => {
      const match = line.match(/^(.+?):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        data[key] = match[2].trim();
      }
    });
    
    return data;
  } catch (error) {
    console.error('Failed to parse response:', error);
    return {};
  }
}

/**
 * Convert field name to header format
 */
function fieldToHeader(field) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Updated enrichSelectedCompanies to support template sheets
 */
function enrichSelectedCompanies() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Check if it's a template sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (template && template.type === 'Company') {
    enrichTemplateSheet();
  } else if (sheetName === COMPANY_SHEET) {
    // Original company enrichment logic
    showSidebar();
    SpreadsheetApp.getUi().alert('Please select a template in the sidebar to enrich companies.');
  } else {
    SpreadsheetApp.getUi().alert('Please select a company sheet or company template sheet.');
  }
}

/**
 * Updated enrichSelectedContacts to support template sheets
 */
function enrichSelectedContacts() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Check if it's a template sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (template && template.type === 'Contact') {
    enrichTemplateSheet();
  } else if (sheetName === CONTACT_SHEET) {
    // Original contact enrichment logic
    showSidebar();
    SpreadsheetApp.getUi().alert('Please select a template in the sidebar to enrich contacts.');
  } else {
    SpreadsheetApp.getUi().alert('Please select a contact sheet or contact template sheet.');
  }
}

/**
 * Enrich all new records in template sheet
 */
function enrichAllNew() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  const ui = SpreadsheetApp.getUi();
  
  // Get template for this sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (!template) {
    ui.alert('Please select a template-based sheet to enrich.');
    return;
  }
  
  // Find all pending rows
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Enrichment Status') + 1;
  
  if (statusCol === 0) {
    ui.alert('Enrichment Status column not found in this sheet.');
    return;
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const pendingRows = [];
  
  for (let i = 3; i < values.length; i++) { // Start from row 4 (skip headers and sample)
    if (values[i][statusCol - 1] === 'Pending' || values[i][statusCol - 1] === '') {
      pendingRows.push(i + 1); // Convert to 1-based row number
    }
  }
  
  if (pendingRows.length === 0) {
    ui.alert('No pending records found to enrich.');
    return;
  }
  
  const result = ui.alert(
    'Enrich All New Records',
    `Found ${pendingRows.length} pending records. Enrich all using "${template.name}" template?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    // Select all pending rows
    const selection = sheet.getRange(pendingRows[0], 1, pendingRows.length, sheet.getLastColumn());
    sheet.setActiveRange(selection);
    
    // Run enrichment
    enrichTemplateSheet();
  }
}