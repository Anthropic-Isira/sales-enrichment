/**
 * Template Management System
 * Handles creation, storage, and sheet generation for templates
 */

class TemplateManager {
  constructor() {
    this.ss = SpreadsheetApp.getActiveSpreadsheet();
    this.templatesSheet = this.ss.getSheetByName(TEMPLATES_SHEET);
  }
  
  /**
   * Create a new template and generate its sheet
   * @param {Object} templateData - Template configuration
   * @return {Object} Result with template ID and sheet name
   */
  createTemplateWithSheet(templateData) {
    // Validate template data
    const validation = DefaultTemplates.validateTemplate(templateData);
    if (!validation.valid) {
      throw new Error('Invalid template: ' + validation.errors.join(', '));
    }
    
    // Create template ID
    const templateId = `custom-${Utilities.getUuid()}`;
    
    // Create the template object
    const template = {
      id: templateId,
      name: templateData.name,
      type: templateData.type,
      description: templateData.description,
      promptTemplate: templateData.promptTemplate,
      requiredFields: templateData.requiredFields,
      outputFields: templateData.outputFields,
      modelSettings: templateData.modelSettings,
      sheetName: this.sanitizeSheetName(templateData.name),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      successRate: 0,
      averageCost: 0
    };
    
    // Check if sheet name already exists
    if (this.ss.getSheetByName(template.sheetName)) {
      throw new Error(`A sheet named "${template.sheetName}" already exists. Please use a different template name.`);
    }
    
    // Save template to Templates sheet
    this.saveTemplate(template);
    
    // Create the sheet for this template
    const sheet = this.createTemplateSheet(template);
    
    return {
      templateId: template.id,
      sheetName: template.sheetName,
      sheet: sheet
    };
  }
  
  /**
   * Save template to the Templates sheet
   * @private
   */
  saveTemplate(template) {
    if (!this.templatesSheet) {
      throw new Error('Templates sheet not found. Please initialize sheets first.');
    }
    
    // Store field prompts in the main prompt field if they exist
    let promptData = template.promptTemplate;
    if (template.fieldPrompts) {
      // Store both the main prompt and field prompts
      promptData = JSON.stringify({
        mainPrompt: template.promptTemplate,
        fieldPrompts: template.fieldPrompts
      });
    }
    
    const row = [
      template.id,
      template.name,
      template.type,
      template.description,
      promptData,
      template.requiredFields.join(', '),
      template.outputFields.join(', '),
      JSON.stringify(template.modelSettings),
      template.modelSettings.maxTokens,
      template.modelSettings.temperature,
      template.createdAt,
      template.updatedAt,
      template.usageCount,
      template.successRate,
      template.averageCost
    ];
    
    this.templatesSheet.appendRow(row);
  }
  
  /**
   * Create a sheet for the template
   * @private
   */
  createTemplateSheet(template) {
    const sheet = this.ss.insertSheet(template.sheetName);
    
    // Build headers based on template type and output fields
    const headers = this.buildHeaders(template);
    
    // Set headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1a73e8');
    headerRange.setFontColor('#ffffff');
    
    // Add header notes
    const headerNotes = this.buildHeaderNotes(template);
    headers.forEach((header, index) => {
      sheet.getRange(1, index + 1).setNote(headerNotes[index]);
    });
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Apply column formatting
    this.applyTemplateSheetFormatting(sheet, template);
    
    // Add template reference
    this.addTemplateReference(sheet, template);
    
    return sheet;
  }
  
  /**
   * Build headers for template sheet
   * @private
   */
  buildHeaders(template) {
    const headers = [`${template.type} ID`];
    
    // Add base fields based on type
    if (template.type === 'Company') {
      headers.push('Company Name', 'Domain');
    } else if (template.type === 'Contact') {
      headers.push('First Name', 'Last Name', 'Company Name', 'Company Domain');
    } else {
      // Custom type - use required fields as base
      template.requiredFields.forEach(field => {
        headers.push(this.fieldToHeader(field));
      });
    }
    
    // Add output fields
    template.outputFields.forEach(field => {
      headers.push(this.fieldToHeader(field));
    });
    
    // Add system fields
    headers.push('Enrichment Status', 'Last Enriched Date', 'Confidence Score', 'API Tokens Used', 'Notes');
    
    return headers;
  }
  
  /**
   * Build header notes
   * @private
   */
  buildHeaderNotes(template) {
    const notes = ['Unique identifier'];
    
    // Base field notes
    if (template.type === 'Company') {
      notes.push('Company name (required)', 'Company domain (required)');
    } else if (template.type === 'Contact') {
      notes.push('First name (required)', 'Last name (required)', 'Company name (required)', 'Company domain (optional)');
    } else {
      template.requiredFields.forEach(field => {
        notes.push(`${this.fieldToHeader(field)} (required)`);
      });
    }
    
    // Output field notes
    template.outputFields.forEach(field => {
      notes.push('Will be enriched by AI');
    });
    
    // System field notes
    notes.push(
      'System field - do not edit',
      'System field - do not edit',
      'AI confidence in the data (0-100)',
      'Token usage for this enrichment',
      'Optional notes'
    );
    
    return notes;
  }
  
  /**
   * Apply formatting to template sheet
   * @private
   */
  applyTemplateSheetFormatting(sheet, template) {
    const inputCols = template.type === 'Company' ? 3 : 
                     template.type === 'Contact' ? 5 : 
                     template.requiredFields.length + 1;
    
    const outputCols = template.outputFields.length;
    const systemCols = 5; // Status, Date, Confidence, Tokens, Notes
    
    // Input columns: White background
    if (inputCols > 1) {
      const inputRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, inputCols);
      inputRange.setBackground('#ffffff');
      inputRange.setBorder(true, true, true, true, false, false, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
    }
    
    // Output columns: Light gray background
    if (outputCols > 0) {
      const outputRange = sheet.getRange(2, inputCols + 1, sheet.getMaxRows() - 1, outputCols);
      outputRange.setBackground('#f8f9fa');
      outputRange.setFontColor('#5f6368');
    }
    
    // System columns: Darker gray background (except Notes)
    const systemRange = sheet.getRange(2, inputCols + outputCols + 1, sheet.getMaxRows() - 1, systemCols - 1);
    systemRange.setBackground('#e8eaed');
    systemRange.setFontColor('#5f6368');
    
    // Notes column: White background
    const notesCol = inputCols + outputCols + systemCols;
    const notesRange = sheet.getRange(2, notesCol, sheet.getMaxRows() - 1, 1);
    notesRange.setBackground('#ffffff');
    
    // Set column widths
    sheet.setColumnWidth(1, 100); // ID
    if (template.type === 'Company') {
      sheet.setColumnWidth(2, 200); // Company Name
      sheet.setColumnWidth(3, 150); // Domain
    } else if (template.type === 'Contact') {
      sheet.setColumnWidth(2, 120); // First Name
      sheet.setColumnWidth(3, 120); // Last Name
      sheet.setColumnWidth(4, 200); // Company Name
      sheet.setColumnWidth(5, 150); // Domain
    }
    
    // Add data validation for status column
    const statusCol = inputCols + outputCols + 1;
    const statusRange = sheet.getRange(2, statusCol, sheet.getMaxRows() - 1);
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending', 'Processing', 'Complete', 'Failed', 'Skipped'])
      .setAllowInvalid(false)
      .build();
    statusRange.setDataValidation(statusRule);
    
    // Add conditional formatting for status
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
    
    // Add sample row
    const sampleData = this.buildSampleRow(template, inputCols + outputCols + systemCols);
    sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
    sheet.getRange(2, 1, 1, sampleData.length).setFontColor('#9e9e9e');
    sheet.getRange(2, 1, 1, sampleData.length).setFontStyle('italic');
    
    // Add instruction row
    sheet.getRange(3, 1).setValue(`← Add your ${template.type.toLowerCase()}s below this row →`);
    sheet.getRange(3, 1).setFontColor('#666666');
    sheet.getRange(3, 1).setFontStyle('italic');
    sheet.getRange(3, 1, 1, inputCols + outputCols + systemCols).merge();
    sheet.getRange(3, 1, 1, inputCols + outputCols + systemCols).setHorizontalAlignment('center');
    
    // Add legend
    this.addTemplateLegend(sheet, template);
  }
  
  /**
   * Build sample row data
   * @private
   */
  buildSampleRow(template, totalCols) {
    const row = [];
    
    // ID
    row.push(template.type.charAt(0) + '001');
    
    // Base fields
    if (template.type === 'Company') {
      row.push('Example Corp', 'example.com');
    } else if (template.type === 'Contact') {
      row.push('John', 'Doe', 'Example Corp', 'example.com');
    } else {
      template.requiredFields.forEach(() => row.push('Sample'));
    }
    
    // Output fields (empty)
    template.outputFields.forEach(() => row.push(''));
    
    // System fields
    row.push('Pending', '', '', '', '');
    
    return row;
  }
  
  /**
   * Add template reference to sheet
   * @private
   */
  addTemplateReference(sheet, template) {
    // Store template ID in sheet properties
    const props = PropertiesService.getDocumentProperties();
    props.setProperty(`SHEET_TEMPLATE_${sheet.getName()}`, template.id);
    
    // Add hidden row with template info
    const lastCol = sheet.getLastColumn();
    sheet.getRange(sheet.getMaxRows(), 1).setValue('Template ID:');
    sheet.getRange(sheet.getMaxRows(), 2).setValue(template.id);
    sheet.getRange(sheet.getMaxRows(), 3).setValue('Template Name:');
    sheet.getRange(sheet.getMaxRows(), 4).setValue(template.name);
    sheet.hideRows(sheet.getMaxRows());
  }
  
  /**
   * Add template-specific legend
   * @private
   */
  addTemplateLegend(sheet, template) {
    const lastCol = sheet.getLastColumn();
    const legendCol = lastCol + 2;
    
    // Legend title
    sheet.getRange(1, legendCol).setValue('Template Info');
    sheet.getRange(1, legendCol).setFontWeight('bold');
    sheet.getRange(1, legendCol).setBackground('#34a853');
    sheet.getRange(1, legendCol).setFontColor('#ffffff');
    
    // Template details
    const legendItems = [
      ['', ''],
      ['Template:', template.name],
      ['Type:', template.type],
      ['Model:', template.modelSettings.model],
      ['', ''],
      ['Required Fields:', ''],
      ...template.requiredFields.map(field => ['', field]),
      ['', ''],
      ['Output Fields:', ''],
      ...template.outputFields.map(field => ['', field]),
      ['', ''],
      ['Column Guide:', ''],
      ['White:', 'User input'],
      ['Light gray:', 'AI enriched'],
      ['Dark gray:', 'System managed']
    ];
    
    sheet.getRange(2, legendCol, legendItems.length, 2).setValues(legendItems);
    
    // Format
    sheet.getRange(6, legendCol).setFontWeight('bold');
    sheet.getRange(6 + template.requiredFields.length + 2, legendCol).setFontWeight('bold');
    sheet.getRange(6 + template.requiredFields.length + template.outputFields.length + 4, legendCol).setFontWeight('bold');
    
    sheet.setColumnWidth(legendCol, 120);
    sheet.setColumnWidth(legendCol + 1, 150);
    
    // Border
    sheet.getRange(1, legendCol, legendItems.length + 1, 2)
      .setBorder(true, true, true, true, true, true, '#666666', SpreadsheetApp.BorderStyle.SOLID);
  }
  
  /**
   * Convert field name to header
   * @private
   */
  fieldToHeader(field) {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }
  
  /**
   * Sanitize sheet name
   * @private
   */
  sanitizeSheetName(name) {
    // Remove invalid characters and limit length
    return name
      .replace(/[^\w\s-]/g, '')
      .trim()
      .substring(0, 30);
  }
  
  /**
   * Get template by sheet name
   */
  getTemplateBySheet(sheetName) {
    const props = PropertiesService.getDocumentProperties();
    const templateId = props.getProperty(`SHEET_TEMPLATE_${sheetName}`);
    
    if (!templateId) {
      // Check default sheets
      if (sheetName === COMPANY_SHEET) {
        return { 
          type: 'Company', 
          name: 'Companies', 
          isDefault: true,
          requiredFields: ['companyName', 'domain'],
          outputFields: []
        };
      } else if (sheetName === CONTACT_SHEET) {
        return { 
          type: 'Contact', 
          name: 'Contacts', 
          isDefault: true,
          requiredFields: ['firstName', 'lastName', 'companyName'],
          outputFields: []
        };
      }
      return null;
    }
    
    // Find template in Templates sheet
    const data = this.templatesSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === templateId) {
        let promptTemplate = data[i][4];
        let fieldPrompts = null;
        
        // Check if prompt data is JSON (contains field prompts)
        try {
          const promptData = JSON.parse(promptTemplate);
          if (promptData.mainPrompt) {
            promptTemplate = promptData.mainPrompt;
            fieldPrompts = promptData.fieldPrompts;
          }
        } catch (e) {
          // Not JSON, use as is
        }
        
        return {
          id: data[i][0],
          name: data[i][1],
          type: data[i][2],
          description: data[i][3],
          promptTemplate: promptTemplate,
          fieldPrompts: fieldPrompts,
          requiredFields: data[i][5].split(', ').filter(f => f),
          outputFields: data[i][6].split(', ').filter(f => f),
          modelSettings: JSON.parse(data[i][7] || '{}')
        };
      }
    }
    
    return null;
  }
  
  /**
   * List all template sheets
   */
  listTemplateSheets() {
    const sheets = this.ss.getSheets();
    const templateSheets = [];
    
    sheets.forEach(sheet => {
      const template = this.getTemplateBySheet(sheet.getName());
      if (template) {
        templateSheets.push({
          sheetName: sheet.getName(),
          template: template
        });
      }
    });
    
    return templateSheets;
  }
}

// Create global instance
let templateManager;

/**
 * Initialize template manager
 */
function initializeTemplateManager() {
  if (!templateManager) {
    templateManager = new TemplateManager();
  }
  return templateManager;
}

/**
 * Create template with sheet (called from UI)
 */
function createTemplateWithSheet(templateData) {
  const manager = initializeTemplateManager();
  return manager.createTemplateWithSheet(templateData);
}

/**
 * Get template by sheet name
 */
function getTemplateBySheet(sheetName) {
  const manager = initializeTemplateManager();
  return manager.getTemplateBySheet(sheetName);
}

/**
 * List all template sheets
 */
function listTemplateSheets() {
  const manager = initializeTemplateManager();
  return manager.listTemplateSheets();
}