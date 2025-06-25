/**
 * Sidebar Controller
 * Server-side functions for the sidebar UI
 */

/**
 * Get current configuration
 * @return {Object} Configuration object
 */
function getConfiguration() {
  return ConfigService.getAll();
}

/**
 * Save configuration
 * @param {Object} config - Configuration data
 */
function saveConfiguration(config) {
  try {
    // Handle API key separately if provided
    if (config.API_KEY) {
      ConfigService.setApiKey(config.API_KEY);
      delete config.API_KEY;
    }
    
    // Save other configuration
    Object.entries(config).forEach(([key, value]) => {
      ConfigService.set(key, value);
    });
    
    // Initialize defaults if needed
    ConfigService.initializeDefaults();
    
    return true;
  } catch (error) {
    throw new Error('Failed to save configuration: ' + error.toString());
  }
}

/**
 * Check API connection
 * @return {boolean} Whether API key is valid
 */
function checkApiConnection() {
  const apiKey = ConfigService.getApiKey();
  if (!apiKey) return false;
  
  try {
    return Anthropic.validateApiKey(apiKey);
  } catch (error) {
    console.error('API connection check failed:', error);
    return false;
  }
}

/**
 * Get available templates
 * @return {Array} Array of template objects
 */
function getAvailableTemplates() {
  const defaultTemplates = DefaultTemplates.getAll();
  const customTemplates = getCustomTemplatesFromSheet();
  
  return [...defaultTemplates, ...customTemplates];
}

/**
 * Get custom templates from sheet
 * @return {Array} Array of custom templates
 */
function getCustomTemplatesFromSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment Templates');
    
    if (!sheet || sheet.getLastRow() <= 1) return [];
    
    const data = SheetHelper.getSheetDataAsObjects(sheet, 2);
    
    return data
      .filter(row => row['Template ID'] && row['Template ID'].startsWith('custom-'))
      .map(row => {
        let promptTemplate = row['Prompt Template'];
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
          id: row['Template ID'],
          name: row['Template Name'],
          type: row['Template Type'],
          description: row['Description'],
          promptTemplate: promptTemplate,
          fieldPrompts: fieldPrompts,
          requiredFields: row['Required Input Fields'].split(',').map(f => f.trim()),
          outputFields: row['Output Fields'].split(',').map(f => f.trim()),
          modelSettings: JSON.parse(row['Model Settings'] || '{}'),
          usageCount: parseInt(row['Usage Count']) || 0,
          successRate: parseFloat(row['Success Rate']) || 0
        };
      });
  } catch (error) {
    console.error('Failed to load custom templates:', error);
    return [];
  }
}

/**
 * Enrich selected entities
 * @param {string} type - Entity type (company/contact)
 * @param {Object} options - Enrichment options
 * @return {Object} Enrichment results
 */
function enrichSelectedEntities(type, options) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Check if it's a template-based sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (template) {
    // Use template-based enrichment
    return enrichTemplateSheetFromSidebar(sheet, template, options);
  }
  
  // Original validation for default sheets
  if (type === 'company' && sheetName !== 'Companies') {
    throw new Error('Please select companies from the Companies sheet');
  }
  if (type === 'contact' && sheetName !== 'Contacts') {
    throw new Error('Please select contacts from the Contacts sheet');
  }
  
  // Get selected rows
  const selection = sheet.getSelection();
  const ranges = selection.getActiveRangeList().getRanges();
  const rowIndices = [];
  
  ranges.forEach(range => {
    for (let i = range.getRow(); i <= range.getLastRow(); i++) {
      if (i > 1) { // Skip header
        rowIndices.push(i);
      }
    }
  });
  
  if (rowIndices.length === 0) {
    throw new Error('Please select at least one row to enrich');
  }
  
  // Perform enrichment
  if (type === 'company') {
    CompanyEnrichment.initialize();
    return CompanyEnrichment.enrichSelected(rowIndices, options);
  } else {
    ContactEnrichment.initialize();
    return ContactEnrichment.enrichSelected(rowIndices, options);
  }
}

/**
 * Enrich all entities
 * @param {string} type - Entity type (company/contact)
 * @param {Object} options - Enrichment options
 * @return {Object} Enrichment results
 */
function enrichAllEntities(type, options) {
  if (type === 'company') {
    CompanyEnrichment.initialize();
    return CompanyEnrichment.enrichAll(options);
  } else {
    ContactEnrichment.initialize();
    return ContactEnrichment.enrichAll(options);
  }
}

/**
 * Get enrichment statistics
 * @return {Object} Statistics
 */
function getEnrichmentStatistics() {
  try {
    const stats = Anthropic.getUsageStats();
    const enricher = new BaseEnricher();
    enricher.initialize();
    const enrichmentStats = enricher.getStatistics();
    
    // Calculate success rate
    let successRate = 0;
    if (enrichmentStats && enrichmentStats.totalJobs > 0) {
      successRate = Math.round((enrichmentStats.successfulJobs / enrichmentStats.totalJobs) * 100);
    }
    
    // Calculate average time
    let avgTime = 0;
    if (enrichmentStats && enrichmentStats.averageProcessingTime) {
      avgTime = Math.round(enrichmentStats.averageProcessingTime / 1000); // Convert to seconds
    }
    
    return {
      totalRequests: stats.totalRequests,
      successRate: successRate,
      totalCost: enrichmentStats ? enrichmentStats.totalCost : 0,
      avgTime: avgTime,
      totalTokens: stats.totalTokens,
      estimatedCost: stats.estimatedCost
    };
  } catch (error) {
    console.error('Failed to get statistics:', error);
    return {
      totalRequests: 0,
      successRate: 0,
      totalCost: 0,
      avgTime: 0
    };
  }
}

/**
 * Get enrichment history
 * @param {number} limit - Maximum number of records
 * @return {Array} History records
 */
function getEnrichmentHistory(limit = 50) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment History');
    
    if (!sheet || sheet.getLastRow() <= 1) return [];
    
    const data = SheetHelper.getSheetDataAsObjects(sheet, 2);
    
    // Sort by timestamp descending and limit
    return data
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
      .slice(0, limit)
      .map(row => ({
        jobId: row['Job ID'],
        timestamp: row['Timestamp'],
        entityType: row['Entity Type'],
        entityId: row['Entity ID'],
        templateUsed: row['Template Used'],
        status: row['Status'],
        apiCalls: row['API Calls Made'],
        tokensUsed: row['Tokens Used'],
        cost: row['Cost'],
        processingTime: row['Processing Time'],
        errorMessage: row['Error Message']
      }));
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
}

/**
 * Export enrichment history
 * @return {string} Download URL
 */
function exportEnrichmentHistory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment History');
    
    if (!sheet) {
      throw new Error('No enrichment history found');
    }
    
    // Create a temporary copy
    const tempSheet = sheet.copyTo(ss);
    tempSheet.setName('History Export ' + new Date().toISOString());
    
    // Convert to CSV
    const csv = SheetHelper.exportData(tempSheet, 'csv');
    
    // Create blob and get download URL
    const blob = Utilities.newBlob(csv, 'text/csv', 'enrichment_history.csv');
    const file = DriveApp.createFile(blob);
    const url = file.getDownloadUrl();
    
    // Clean up temp sheet
    ss.deleteSheet(tempSheet);
    
    // Delete file after 1 hour
    const deleteTime = new Date();
    deleteTime.setHours(deleteTime.getHours() + 1);
    
    ScriptApp.newTrigger('cleanupExportFile')
      .timeBased()
      .at(deleteTime)
      .create();
    
    PropertiesService.getScriptProperties().setProperty('TEMP_FILE_ID', file.getId());
    
    return url;
  } catch (error) {
    throw new Error('Failed to export history: ' + error.toString());
  }
}

/**
 * Clean up temporary export file
 */
function cleanupExportFile() {
  try {
    const fileId = PropertiesService.getScriptProperties().getProperty('TEMP_FILE_ID');
    if (fileId) {
      DriveApp.getFileById(fileId).setTrashed(true);
      PropertiesService.getScriptProperties().deleteProperty('TEMP_FILE_ID');
    }
  } catch (error) {
    console.error('Failed to cleanup export file:', error);
  }
}

/**
 * Create custom template
 * @param {Object} templateData - Template data
 * @return {Object} Created template
 */
function createCustomTemplate(templateData) {
  try {
    const template = DefaultTemplates.createCustom(templateData);
    
    // Save to sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment Templates');
    
    if (!sheet) {
      throw new Error('Templates sheet not found');
    }
    
    sheet.appendRow([
      template.id,
      template.name,
      template.type,
      template.description,
      template.promptTemplate,
      template.requiredFields.join(', '),
      template.outputFields.join(', '),
      JSON.stringify(template.modelSettings),
      template.modelSettings.maxTokens,
      template.modelSettings.temperature,
      template.createdAt,
      template.updatedAt,
      0, // Usage count
      0, // Success rate
      0  // Average cost
    ]);
    
    return template;
  } catch (error) {
    throw new Error('Failed to create template: ' + error.toString());
  }
}

/**
 * Update template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @return {boolean} Success
 */
function updateTemplate(templateId, updates) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment Templates');
    
    if (!sheet) {
      throw new Error('Templates sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === templateId) {
        // Update specific fields
        if (updates.name) sheet.getRange(i + 1, 2).setValue(updates.name);
        if (updates.description) sheet.getRange(i + 1, 4).setValue(updates.description);
        if (updates.promptTemplate) sheet.getRange(i + 1, 5).setValue(updates.promptTemplate);
        if (updates.modelSettings) {
          sheet.getRange(i + 1, 8).setValue(JSON.stringify(updates.modelSettings));
          sheet.getRange(i + 1, 9).setValue(updates.modelSettings.maxTokens);
          sheet.getRange(i + 1, 10).setValue(updates.modelSettings.temperature);
        }
        
        // Update modified date
        sheet.getRange(i + 1, 12).setValue(new Date());
        
        return true;
      }
    }
    
    throw new Error('Template not found');
  } catch (error) {
    throw new Error('Failed to update template: ' + error.toString());
  }
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @return {boolean} Success
 */
function deleteTemplate(templateId) {
  // Only allow deletion of custom templates
  if (!templateId.startsWith('custom-')) {
    throw new Error('Cannot delete default templates');
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Enrichment Templates');
    
    if (!sheet) {
      throw new Error('Templates sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === templateId) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    
    throw new Error('Template not found');
  } catch (error) {
    throw new Error('Failed to delete template: ' + error.toString());
  }
}

/**
 * Test enrichment with sample data
 * @param {string} templateId - Template ID
 * @param {Object} sampleData - Sample data
 * @return {Object} Test result
 */
function testEnrichmentTemplate(templateId, sampleData) {
  try {
    const template = getAvailableTemplates().find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Build test prompt
    const prompt = DefaultTemplates.processTemplate(template.promptTemplate, sampleData);
    
    // Make test request with minimal tokens
    const result = Anthropic.makeRequest(prompt, {
      ...template.modelSettings,
      maxTokens: Math.min(template.modelSettings.maxTokens, 500) // Limit tokens for testing
    });
    
    return {
      success: result.success,
      prompt: prompt,
      response: result.content,
      usage: result.usage
    };
  } catch (error) {
    throw new Error('Test failed: ' + error.toString());
  }
}

/**
 * Enrich template sheet from sidebar
 * @param {Sheet} sheet - The sheet to enrich
 * @param {Object} template - The template configuration
 * @param {Object} options - Enrichment options
 * @return {Object} Enrichment results
 */
function enrichTemplateSheetFromSidebar(sheet, template, options) {
  try {
    // Get selected rows
    const selection = sheet.getSelection();
    const ranges = selection.getActiveRangeList().getRanges();
    const rowIndices = [];
    
    ranges.forEach(range => {
      for (let i = range.getRow(); i <= range.getLastRow(); i++) {
        if (i > 1) { // Skip header
          rowIndices.push(i);
        }
      }
    });
    
    if (rowIndices.length === 0) {
      throw new Error('Please select at least one row to enrich');
    }
    
    // Use the template ID from options if provided, otherwise use sheet's template
    const templateId = options.templateId || template.id;
    const enrichmentOptions = {
      ...options,
      templateId: templateId,
      templateName: template.name,
      sheetName: sheet.getName(),
      selection: {
        rows: rowIndices
      }
    };
    
    // Perform enrichment
    return performBatchTemplateEnrichment(sheet, template, enrichmentOptions);
  } catch (error) {
    throw new Error('Template enrichment failed: ' + error.toString());
  }
}

/**
 * Perform batch template enrichment
 * @private
 */
function performBatchTemplateEnrichment(sheet, template, options) {
  const rows = options.selection.rows;
  const batchSize = ConfigService.get('BATCH_SIZE', 50);
  const actualBatchSize = Math.min(batchSize, rows.length);
  
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let totalCost = 0;
  
  // Store progress in cache for UI updates
  const progressKey = `enrichment_progress_${Utilities.getUuid()}`;
  
  // Process in batches
  for (let i = 0; i < actualBatchSize; i++) {
    try {
      const row = rows[i];
      
      // Update progress in cache
      CacheService.getUserCache().put(progressKey, JSON.stringify({
        current: i + 1,
        total: actualBatchSize,
        status: `Processing row ${row}...`
      }), 300);
      
      const result = enrichSingleTemplateRow(sheet, template, row, options);
      
      if (result.success) {
        successful++;
        if (result.cost) totalCost += result.cost;
      } else if (result.partial) {
        successful++; // Count partials as success
        failed++; // But also track failed fields
      } else {
        failed++;
      }
      processed++;
      
    } catch (error) {
      console.error(`Failed to enrich row ${rows[i]}: ${error}`);
      failed++;
      processed++;
    }
    
    // Force flush to show updates
    SpreadsheetApp.flush();
  }
  
  // Clear progress
  CacheService.getUserCache().remove(progressKey);
  
  return {
    total: rows.length,
    processed: processed,
    successful: successful,
    failed: failed,
    estimatedCost: totalCost
  };
}

/**
 * Enrich a single row in template sheet
 * @private
 */
function enrichSingleTemplateRow(sheet, template, row, options) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Enrichment Status') + 1;
  const dateCol = headers.indexOf('Last Enriched Date') + 1;
  const confidenceCol = headers.indexOf('Confidence Score') + 1;
  const tokensCol = headers.indexOf('API Tokens Used') + 1;
  const notesCol = headers.indexOf('Notes') + 1;
  
  try {
    // Check if should skip
    if (statusCol > 0) {
      const currentStatus = sheet.getRange(row, statusCol).getValue();
      if (currentStatus === 'Complete' && options.skipComplete) {
        return { success: false, skipped: true };
      }
      
      // Set processing status
      sheet.getRange(row, statusCol).setValue('Processing');
      SpreadsheetApp.flush();
    }
    
    // Get input data from the row
    const inputData = {};
    
    // Debug: log template structure
    console.log('Template:', template);
    console.log('Selected template ID:', options.templateId);
    
    // Ensure template has required fields
    const requiredFields = template.requiredFields || [];
    requiredFields.forEach(field => {
      const fieldHeader = fieldToHeader(field);
      const fieldCol = headers.indexOf(fieldHeader) + 1;
      if (fieldCol > 0) {
        inputData[field] = sheet.getRange(row, fieldCol).getValue();
      }
    });
    
    // Check if we have all required data
    for (const field of requiredFields) {
      if (!inputData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Get the template to use
    const selectedTemplateId = options.templateId;
    let enrichmentTemplate = null;
    
    // Load the actual template with all its properties
    const allTemplates = getAvailableTemplates();
    enrichmentTemplate = allTemplates.find(t => t.id === selectedTemplateId);
    
    if (!enrichmentTemplate) {
      console.error('Template not found, using sheet template');
      enrichmentTemplate = template;
    }
    
    // Ensure template has all required properties
    if (!enrichmentTemplate.outputFields) {
      throw new Error('Template missing output fields');
    }
    
    let totalCost = 0;
    let totalTokens = 0;
    let successCount = 0;
    let failedFields = [];
    
    // Debug log
    console.log('Enrichment template:', enrichmentTemplate);
    console.log('Output fields:', enrichmentTemplate.outputFields);
    console.log('Has field prompts:', !!enrichmentTemplate.fieldPrompts);
    
    // Check if template has field-specific prompts
    if (enrichmentTemplate.fieldPrompts && Object.keys(enrichmentTemplate.fieldPrompts).length > 0) {
      // New approach: One API call per field
      for (const field of enrichmentTemplate.outputFields) {
        const fieldCol = headers.indexOf(fieldToHeader(field)) + 1;
        if (fieldCol > 0) {
          try {
            // Get field-specific prompt
            const fieldPrompt = enrichmentTemplate.fieldPrompts[field];
            if (fieldPrompt) {
              const prompt = DefaultTemplates.processTemplate(fieldPrompt, inputData);
              
              // Make API call for this field
              const result = callAnthropicAPI(prompt, {
                model: enrichmentTemplate.modelSettings.model,
                maxTokens: 500, // Smaller token limit per field
                temperature: enrichmentTemplate.modelSettings.temperature
              });
              
              if (result.success) {
                // Update the specific cell
                const value = result.content ? result.content.trim() : 'N/A';
                console.log(`Setting ${field} in row ${row}, col ${fieldCol} to: ${value.substring(0, 50)}...`);
                sheet.getRange(row, fieldCol).setValue(value);
                successCount++;
                
                // Track usage
                if (result.usage) {
                  totalTokens += (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
                  totalCost += result.estimatedCost || 0;
                }
              } else {
                failedFields.push(field);
              }
            }
            
            // Small delay between API calls to avoid rate limiting
            Utilities.sleep(200);
            
          } catch (fieldError) {
            console.error(`Failed to enrich field ${field}:`, fieldError);
            failedFields.push(field);
          }
        }
      }
    } else {
      // Fallback: Use single prompt for all fields or simple enrichment
      console.log('Using single prompt approach');
      
      // For now, let's do a simple field-by-field enrichment with basic prompts
      for (const field of enrichmentTemplate.outputFields) {
        const fieldCol = headers.indexOf(fieldToHeader(field)) + 1;
        if (fieldCol > 0) {
          try {
            // Create a simple prompt for each field
            let simplePrompt = '';
            const companyName = inputData.companyName || inputData.name || '';
            
            // Generate field-specific prompts based on field name
            switch(field.toLowerCase()) {
              case 'description':
                simplePrompt = `Use web search to find what ${companyName} does. Search their official website and provide a 2-3 sentence description of their business.`;
                break;
              case 'industry':
                simplePrompt = `Use web search to find what industry ${companyName} is in. Check their website and recent news.`;
                break;
              case 'employeecount':
                simplePrompt = `Use web search to find how many employees ${companyName} currently has. Look for recent data (2024-2025). Provide a number or range like "51-200".`;
                break;
              case 'revenue':
              case 'revenuerange':
                simplePrompt = `Use web search to find the annual revenue of ${companyName}. Look for recent financial data or estimates. Provide a range like "$10M-$50M" if exact figure not available.`;
                break;
              case 'foundedyear':
                simplePrompt = `Use web search to find what year ${companyName} was founded. Check their about page or company history.`;
                break;
              case 'headquarters':
                simplePrompt = `Use web search to find where ${companyName} is headquartered. Provide city and state/country.`;
                break;
              default:
                simplePrompt = `Use web search to find the ${field} for ${companyName}. Look for current, accurate information.`;
            }
            
            console.log(`Enriching ${field} with prompt: ${simplePrompt}`);
            
            const result = callAnthropicAPI(simplePrompt, {
              model: enrichmentTemplate.modelSettings.model || 'claude-sonnet-4-20250514',
              maxTokens: 200,
              temperature: 0.3
            });
            
            if (result.success && result.content) {
              const value = result.content.trim();
              console.log(`Got value for ${field}: ${value.substring(0, 100)}...`);
              sheet.getRange(row, fieldCol).setValue(value);
              successCount++;
              
              if (result.usage) {
                totalTokens += (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
                totalCost += result.estimatedCost || 0;
              }
            } else {
              failedFields.push(field);
              console.error(`Failed to get ${field}:`, result.error);
            }
            
            // Small delay between calls
            Utilities.sleep(100);
            
          } catch (fieldError) {
            console.error(`Error enriching ${field}:`, fieldError);
            failedFields.push(field);
          }
        }
      }
    }
    
    // Update status
    if (statusCol > 0) {
      const finalStatus = failedFields.length === 0 ? 'Complete' : 
                         failedFields.length < enrichmentTemplate.outputFields.length ? 'Partial' : 'Failed';
      sheet.getRange(row, statusCol).setValue(finalStatus);
    }
    
    // Update metadata
    if (dateCol > 0) sheet.getRange(row, dateCol).setValue(new Date());
    if (confidenceCol > 0) sheet.getRange(row, confidenceCol).setValue(Math.round((successCount / enrichmentTemplate.outputFields.length) * 100));
    if (tokensCol > 0) sheet.getRange(row, tokensCol).setValue(totalTokens);
    if (notesCol > 0 && failedFields.length > 0) {
      sheet.getRange(row, notesCol).setValue('Failed fields: ' + failedFields.join(', '));
    }
    
    return { 
      success: failedFields.length === 0, 
      partial: failedFields.length > 0 && failedFields.length < enrichmentTemplate.outputFields.length,
      cost: totalCost,
      tokens: totalTokens,
      failedFields: failedFields
    };
    
  } catch (error) {
    // Mark as failed
    if (statusCol > 0) sheet.getRange(row, statusCol).setValue('Failed');
    if (notesCol > 0) sheet.getRange(row, notesCol).setValue('Error: ' + error.toString());
    
    throw error;
  }
}

/**
 * Call Anthropic API
 * @private
 */
function callAnthropicAPI(prompt, settings) {
  try {
    // Initialize Anthropic service if needed
    if (typeof Anthropic === 'undefined') {
      AnthropicService.initialize();
    }
    
    const result = Anthropic.makeRequest(prompt, settings);
    
    // Calculate estimated cost
    if (result.success && result.usage) {
      const model = settings.model || 'claude-sonnet-4-20250514';
      const costs = {
        'claude-opus-4-20250514': { input: 5, output: 25 },
        'claude-sonnet-4-20250514': { input: 2, output: 10 },
        'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
        'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
      };
      
      const modelCost = costs[model] || costs['claude-sonnet-4-20250514'];
      const inputCost = (result.usage.input_tokens / 1000000) * modelCost.input;
      const outputCost = (result.usage.output_tokens / 1000000) * modelCost.output;
      result.estimatedCost = inputCost + outputCost;
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Parse enrichment response
 * @private
 */
function parseEnrichmentResponse(content) {
  try {
    // Try to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Parse as key-value pairs
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
 * Convert field to header
 * @private
 */
function fieldToHeader(field) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Show template creator from sidebar
 */
function showTemplateCreatorFromSidebar() {
  showTemplateCreator();
}

/**
 * Get current sheet information
 * @return {Object} Sheet info
 */
function getCurrentSheetInfo() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Get template if it's a template sheet
    const manager = initializeTemplateManager();
    const template = manager.getTemplateBySheet(sheetName);
    
    return {
      sheetName: sheetName,
      template: template ? {
        name: template.name,
        type: template.type,
        id: template.id
      } : null
    };
  } catch (error) {
    console.error('Error getting sheet info:', error);
    return { sheetName: 'Unknown', template: null };
  }
}

/**
 * Enrich selected rows in current sheet
 * @param {Object} options - Enrichment options
 * @return {Object} Enrichment results
 */
function enrichCurrentSheetSelection(options) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Get template for this sheet
  const manager = initializeTemplateManager();
  const template = manager.getTemplateBySheet(sheetName);
  
  if (!template) {
    // Check if it's Companies or Contacts sheet
    if (sheetName === 'Companies') {
      return enrichSelectedEntities('company', options);
    } else if (sheetName === 'Contacts') {
      return enrichSelectedEntities('contact', options);
    } else {
      throw new Error('This sheet is not set up for enrichment. Please use a template-based sheet.');
    }
  }
  
  // It's a template sheet - enrich it
  return enrichTemplateSheetFromSidebar(sheet, template, options);
}

/**
 * Enrich all new records in current sheet
 * @param {Object} options - Enrichment options
 * @return {Object} Enrichment results
 */
function enrichAllInCurrentSheet(options) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Find all pending rows
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Enrichment Status') + 1;
  
  if (statusCol === 0) {
    throw new Error('Enrichment Status column not found in this sheet.');
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
    throw new Error('No pending records found to enrich.');
  }
  
  // Select all pending rows
  const firstRow = pendingRows[0];
  const lastRow = pendingRows[pendingRows.length - 1];
  const selection = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, sheet.getLastColumn());
  sheet.setActiveRange(selection);
  
  // Now enrich them
  return enrichCurrentSheetSelection(options);
}