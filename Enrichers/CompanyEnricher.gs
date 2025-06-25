/**
 * Company Enricher
 * Handles enrichment operations for company entities
 */

class CompanyEnricher extends BaseEnricher {
  constructor() {
    super();
    this.sheetName = 'Companies';
    this.sheet = null;
  }
  
  /**
   * Initialize the company enricher
   */
  initialize() {
    super.initialize();
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName(this.sheetName);
    
    if (!this.sheet) {
      throw new Error('Companies sheet not found. Please initialize sheets first.');
    }
  }
  
  /**
   * Enrich a company entity
   * @param {Company} company - Company to enrich
   * @param {Object} template - Enrichment template
   * @return {Object} Enrichment result
   */
  enrich(company, template) {
    if (!(company instanceof Company)) {
      throw new Error('Entity must be a Company instance');
    }
    
    return this.enrichSingle(company, template);
  }
  
  /**
   * Enrich all companies in the sheet
   * @param {Object} options - Enrichment options
   * @return {Object} Enrichment summary
   */
  enrichAll(options = {}) {
    this.initialize();
    
    const companies = this.getCompaniesFromSheet(options);
    const template = this.getTemplate(options.templateId);
    
    const results = this.enrichBatch(companies, template, options.progressCallback);
    
    return this.summarizeResults(results);
  }
  
  /**
   * Enrich selected companies
   * @param {Array} rowIndices - Array of row indices to enrich
   * @param {Object} options - Enrichment options
   * @return {Object} Enrichment summary
   */
  enrichSelected(rowIndices, options = {}) {
    this.initialize();
    
    const companies = rowIndices.map(index => {
      const row = this.sheet.getRange(index, 1, 1, 21).getValues()[0];
      return Company.fromRow(row, index);
    });
    
    const template = this.getTemplate(options.templateId);
    const results = this.enrichBatch(companies, template, options.progressCallback);
    
    return this.summarizeResults(results);
  }
  
  /**
   * Get companies from sheet based on filters
   * @param {Object} options - Filter options
   * @return {Array} Array of Company objects
   */
  getCompaniesFromSheet(options = {}) {
    const data = SheetHelper.getSheetDataAsObjects(this.sheet);
    
    return data
      .map(row => new Company({
        id: row['Company ID'],
        name: row['Company Name'],
        domain: row['Domain'],
        industry: row['Industry'],
        companySize: row['Company Size'],
        employeeCount: row['Employee Count'],
        revenueRange: row['Revenue Range'],
        foundedYear: row['Founded Year'],
        headquarters: row['Headquarters Location'],
        description: row['Company Description'],
        technologiesUsed: row['Technologies Used'],
        keyProducts: row['Key Products/Services'],
        targetMarket: row['Target Market'],
        competitors: row['Competitors'],
        recentNews: row['Recent News'],
        socialMediaLinks: row['Social Media Links'],
        enrichmentStatus: row['Enrichment Status'],
        lastEnrichedDate: row['Last Enriched Date'],
        enrichmentTemplate: row['Enrichment Template Used'],
        apiCallsUsed: parseInt(row['API Calls Used']) || 0,
        notes: row['Notes'],
        _rowIndex: row._rowIndex
      }))
      .filter(company => {
        // Apply filters
        if (options.onlyNew && company.enrichmentStatus === 'Complete') {
          return false;
        }
        if (options.onlyFailed && company.enrichmentStatus !== 'Failed') {
          return false;
        }
        if (options.industry && company.industry !== options.industry) {
          return false;
        }
        if (options.minEmployees && parseInt(company.employeeCount) < options.minEmployees) {
          return false;
        }
        return true;
      });
  }
  
  /**
   * Get entity data for template processing
   * @param {Company} company - Company object
   * @return {Object} Template data
   */
  getEntityData(company) {
    return {
      companyName: company.name,
      companyDomain: company.domain,
      domain: company.domain,
      industry: company.industry,
      companySize: company.companySize,
      headquarters: company.headquarters,
      description: company.description
    };
  }
  
  /**
   * Get entity-specific cache key
   * @param {Company} company - Company object
   * @return {string} Cache key
   */
  getEntityCacheKey(company) {
    // Use company name and domain for cache key
    const name = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain = company.domain ? company.domain.toLowerCase() : '';
    return `${name}_${domain}`;
  }
  
  /**
   * Update company status in sheet
   * @param {Company} company - Company object
   */
  updateEntityStatus(company) {
    if (!company._rowIndex || !this.sheet) return;
    
    // Update status column (column Q = 17)
    this.sheet.getRange(company._rowIndex, 17).setValue(company.enrichmentStatus);
    
    // Update last enriched date if complete
    if (company.enrichmentStatus === 'Complete') {
      this.sheet.getRange(company._rowIndex, 18).setValue(company.lastEnrichedDate);
    }
  }
  
  /**
   * Update company in sheet
   * @param {Company} company - Company object
   */
  updateEntityInSheet(company) {
    if (!company._rowIndex || !this.sheet) return;
    
    // Update all columns
    const rowData = company.toRowArray();
    this.sheet.getRange(company._rowIndex, 1, 1, rowData.length).setValues([rowData]);
    
    // Apply conditional formatting based on completeness
    const completeness = company.getCompletenessScore();
    let backgroundColor = '#ffffff';
    
    if (completeness >= 80) {
      backgroundColor = '#e8f5e9'; // Light green
    } else if (completeness >= 60) {
      backgroundColor = '#fff3e0'; // Light orange
    } else if (completeness >= 40) {
      backgroundColor = '#fce4ec'; // Light pink
    }
    
    this.sheet.getRange(company._rowIndex, 1, 1, 21).setBackground(backgroundColor);
  }
  
  /**
   * Get enrichment template
   * @param {string} templateId - Template ID
   * @return {Object} Template object
   */
  getTemplate(templateId) {
    if (!templateId) {
      // Default to company overview template
      return DefaultTemplates.getById('company-overview');
    }
    
    // Try default templates first
    let template = DefaultTemplates.getById(templateId);
    
    if (!template) {
      // Try custom templates from sheet
      template = this.getCustomTemplate(templateId);
    }
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    return template;
  }
  
  /**
   * Get custom template from sheet
   * @param {string} templateId - Template ID
   * @return {Object|null} Template object
   */
  getCustomTemplate(templateId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const templatesSheet = ss.getSheetByName('Enrichment Templates');
    
    if (!templatesSheet) return null;
    
    const templates = SheetHelper.getSheetDataAsObjects(templatesSheet);
    const templateRow = templates.find(row => row['Template ID'] === templateId);
    
    if (!templateRow) return null;
    
    return {
      id: templateRow['Template ID'],
      name: templateRow['Template Name'],
      type: templateRow['Template Type'],
      description: templateRow['Description'],
      promptTemplate: templateRow['Prompt Template'],
      requiredFields: templateRow['Required Input Fields'].split(',').map(f => f.trim()),
      outputFields: templateRow['Output Fields'].split(',').map(f => f.trim()),
      modelSettings: JSON.parse(templateRow['Model Settings'] || '{}')
    };
  }
  
  /**
   * Summarize enrichment results
   * @param {Array} results - Array of enrichment results
   * @return {Object} Summary
   */
  summarizeResults(results) {
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      skipped: results.filter(r => r.skipped).length,
      fromCache: results.filter(r => r.fromCache).length,
      totalTokensUsed: 0,
      estimatedCost: 0,
      errors: []
    };
    
    results.forEach(result => {
      if (result.usage) {
        summary.totalTokensUsed += (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
      }
      if (result.error) {
        summary.errors.push({
          entityId: result.entity.id,
          entityName: result.entity.name,
          error: result.error
        });
      }
    });
    
    // Calculate estimated cost
    const model = this.config.get('DEFAULT_MODEL', 'claude-3-opus-20240229');
    summary.estimatedCost = this.calculateCost(
      { input_tokens: summary.totalTokensUsed * 0.3, output_tokens: summary.totalTokensUsed * 0.7 },
      model
    );
    
    return summary;
  }
  
  /**
   * Find duplicate companies
   * @return {Object} Duplicate analysis
   */
  findDuplicates() {
    this.initialize();
    
    const domainDuplicates = SheetHelper.findDuplicates(this.sheet, 'Domain');
    const nameDuplicates = SheetHelper.findDuplicates(this.sheet, 'Company Name');
    
    // Highlight duplicates
    Object.values(domainDuplicates.duplicates).forEach(rows => {
      rows.forEach(row => {
        this.sheet.getRange(row, 3).setBackground('#ffcdd2'); // Light red for domain
      });
    });
    
    Object.values(nameDuplicates.duplicates).forEach(rows => {
      rows.forEach(row => {
        this.sheet.getRange(row, 2).setBackground('#ffcdd2'); // Light red for name
      });
    });
    
    return {
      domainDuplicates: domainDuplicates,
      nameDuplicates: nameDuplicates,
      totalDuplicates: Object.keys(domainDuplicates.duplicates).length + 
                      Object.keys(nameDuplicates.duplicates).length
    };
  }
  
  /**
   * Export companies to different formats
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @return {string} Exported data
   */
  exportCompanies(format = 'json', options = {}) {
    this.initialize();
    
    const companies = this.getCompaniesFromSheet(options);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(companies.map(c => c.toJSON()), null, 2);
        
      case 'csv':
        const headers = [
          'Company Name', 'Domain', 'Industry', 'Employee Count',
          'Revenue Range', 'Headquarters', 'Description'
        ];
        const rows = [headers];
        
        companies.forEach(company => {
          rows.push([
            company.name,
            company.domain,
            company.industry,
            company.employeeCount,
            company.revenueRange,
            company.headquarters,
            company.description
          ]);
        });
        
        return rows.map(row => row.map(cell => {
          const value = String(cell || '').replace(/"/g, '""');
          return value.includes(',') ? `"${value}"` : value;
        }).join(',')).join('\n');
        
      case 'salesforce':
        // Salesforce-compatible format
        return JSON.stringify({
          records: companies.map(company => ({
            attributes: { type: 'Account' },
            Name: company.name,
            Website: company.domain,
            Industry: company.industry,
            NumberOfEmployees: parseInt(company.employeeCount) || null,
            AnnualRevenue: company.revenueRange,
            BillingCity: company.headquarters,
            Description: company.description
          }))
        });
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

// Create singleton instance
const CompanyEnrichment = new CompanyEnricher();

// Helper functions for menu integration
function enrichSelectedCompanies() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== 'Companies') {
    ui.alert('Please select companies from the Companies sheet');
    return;
  }
  
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
    ui.alert('Please select at least one company row');
    return;
  }
  
  const result = ui.alert(
    'Confirm Enrichment',
    `Enrich ${rowIndices.length} selected companies?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      CompanyEnrichment.initialize();
      const summary = CompanyEnrichment.enrichSelected(rowIndices);
      ui.alert(
        'Enrichment Complete',
        `Processed: ${summary.total}\nSuccessful: ${summary.successful}\nFailed: ${summary.failed}`,
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert('Error', error.toString(), ui.ButtonSet.OK);
    }
  }
}

function enrichAllNewCompanies() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.alert(
    'Confirm Enrichment',
    'Enrich all companies with pending status?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      CompanyEnrichment.initialize();
      const summary = CompanyEnrichment.enrichAll({ onlyNew: true });
      ui.alert(
        'Enrichment Complete',
        `Processed: ${summary.total}\nSuccessful: ${summary.successful}\nFailed: ${summary.failed}`,
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert('Error', error.toString(), ui.ButtonSet.OK);
    }
  }
}