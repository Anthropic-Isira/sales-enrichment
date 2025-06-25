/**
 * Contact Enricher
 * Handles enrichment operations for contact entities
 */

class ContactEnricher extends BaseEnricher {
  constructor() {
    super();
    this.sheetName = 'Contacts';
    this.sheet = null;
    this.companiesSheet = null;
  }
  
  /**
   * Initialize the contact enricher
   */
  initialize() {
    super.initialize();
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName(this.sheetName);
    this.companiesSheet = ss.getSheetByName('Companies');
    
    if (!this.sheet) {
      throw new Error('Contacts sheet not found. Please initialize sheets first.');
    }
  }
  
  /**
   * Enrich a contact entity
   * @param {Contact} contact - Contact to enrich
   * @param {Object} template - Enrichment template
   * @return {Object} Enrichment result
   */
  enrich(contact, template) {
    if (!(contact instanceof Contact)) {
      throw new Error('Entity must be a Contact instance');
    }
    
    // Auto-populate company domain if missing
    if (!contact.companyDomain && contact.companyName) {
      contact.companyDomain = this.findCompanyDomain(contact.companyName);
    }
    
    return this.enrichSingle(contact, template);
  }
  
  /**
   * Enrich all contacts in the sheet
   * @param {Object} options - Enrichment options
   * @return {Object} Enrichment summary
   */
  enrichAll(options = {}) {
    this.initialize();
    
    const contacts = this.getContactsFromSheet(options);
    const template = this.getTemplate(options.templateId);
    
    const results = this.enrichBatch(contacts, template, options.progressCallback);
    
    return this.summarizeResults(results);
  }
  
  /**
   * Enrich selected contacts
   * @param {Array} rowIndices - Array of row indices to enrich
   * @param {Object} options - Enrichment options
   * @return {Object} Enrichment summary
   */
  enrichSelected(rowIndices, options = {}) {
    this.initialize();
    
    const contacts = rowIndices.map(index => {
      const row = this.sheet.getRange(index, 1, 1, 22).getValues()[0];
      return Contact.fromRow(row, index);
    });
    
    const template = this.getTemplate(options.templateId);
    const results = this.enrichBatch(contacts, template, options.progressCallback);
    
    return this.summarizeResults(results);
  }
  
  /**
   * Get contacts from sheet based on filters
   * @param {Object} options - Filter options
   * @return {Array} Array of Contact objects
   */
  getContactsFromSheet(options = {}) {
    const data = SheetHelper.getSheetDataAsObjects(this.sheet);
    
    return data
      .map(row => new Contact({
        id: row['Contact ID'],
        firstName: row['First Name'],
        lastName: row['Last Name'],
        companyName: row['Company Name'],
        companyDomain: row['Company Domain'],
        jobTitle: row['Job Title'],
        department: row['Department'],
        seniorityLevel: row['Seniority Level'],
        email: row['Email'],
        phone: row['Phone'],
        linkedinUrl: row['LinkedIn URL'],
        twitterHandle: row['Twitter/X Handle'],
        location: row['Location'],
        yearsInRole: row['Years in Role'],
        previousCompanies: row['Previous Companies'],
        skills: row['Skills/Expertise'],
        directReports: row['Direct Reports'],
        enrichmentStatus: row['Enrichment Status'],
        lastEnrichedDate: row['Last Enriched Date'],
        confidenceScore: parseFloat(row['Confidence Score']) || 0,
        source: row['Source'],
        notes: row['Notes'],
        _rowIndex: row._rowIndex
      }))
      .filter(contact => {
        // Apply filters
        if (options.onlyNew && contact.enrichmentStatus === 'Complete') {
          return false;
        }
        if (options.onlyFailed && contact.enrichmentStatus !== 'Failed') {
          return false;
        }
        if (options.companyName && contact.companyName !== options.companyName) {
          return false;
        }
        if (options.seniorityLevel && contact.seniorityLevel !== options.seniorityLevel) {
          return false;
        }
        if (options.department && contact.department !== options.department) {
          return false;
        }
        if (options.withoutEmail && contact.email) {
          return false;
        }
        return true;
      });
  }
  
  /**
   * Get entity data for template processing
   * @param {Contact} contact - Contact object
   * @return {Object} Template data
   */
  getEntityData(contact) {
    return {
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: contact.getFullName(),
      companyName: contact.companyName,
      companyDomain: contact.companyDomain,
      jobTitle: contact.jobTitle,
      department: contact.department,
      location: contact.location,
      linkedinUrl: contact.linkedinUrl
    };
  }
  
  /**
   * Get entity-specific cache key
   * @param {Contact} contact - Contact object
   * @return {string} Cache key
   */
  getEntityCacheKey(contact) {
    // Use full name and company for cache key
    const name = contact.getFullName().toLowerCase().replace(/[^a-z0-9]/g, '');
    const company = contact.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${name}_${company}`;
  }
  
  /**
   * Update contact status in sheet
   * @param {Contact} contact - Contact object
   */
  updateEntityStatus(contact) {
    if (!contact._rowIndex || !this.sheet) return;
    
    // Update status column (column R = 18)
    this.sheet.getRange(contact._rowIndex, 18).setValue(contact.enrichmentStatus);
    
    // Update last enriched date if complete
    if (contact.enrichmentStatus === 'Complete') {
      this.sheet.getRange(contact._rowIndex, 19).setValue(contact.lastEnrichedDate);
    }
  }
  
  /**
   * Update contact in sheet
   * @param {Contact} contact - Contact object
   */
  updateEntityInSheet(contact) {
    if (!contact._rowIndex || !this.sheet) return;
    
    // Update all columns
    const rowData = contact.toRowArray();
    this.sheet.getRange(contact._rowIndex, 1, 1, rowData.length).setValues([rowData]);
    
    // Apply conditional formatting based on confidence score
    let backgroundColor = '#ffffff';
    
    if (contact.confidenceScore >= 80) {
      backgroundColor = '#e8f5e9'; // Light green - high confidence
    } else if (contact.confidenceScore >= 60) {
      backgroundColor = '#fff3e0'; // Light orange - medium confidence
    } else if (contact.confidenceScore >= 40) {
      backgroundColor = '#fce4ec'; // Light pink - low confidence
    }
    
    this.sheet.getRange(contact._rowIndex, 1, 1, 22).setBackground(backgroundColor);
    
    // Highlight email cell if found
    if (contact.email) {
      this.sheet.getRange(contact._rowIndex, 9).setFontWeight('bold');
    }
  }
  
  /**
   * Get enrichment template
   * @param {string} templateId - Template ID
   * @return {Object} Template object
   */
  getTemplate(templateId) {
    if (!templateId) {
      // Default to contact finder template
      return DefaultTemplates.getById('contact-finder');
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
   * Find company domain from companies sheet
   * @param {string} companyName - Company name
   * @return {string} Company domain or empty string
   */
  findCompanyDomain(companyName) {
    if (!this.companiesSheet || !companyName) return '';
    
    const companies = SheetHelper.getSheetDataAsObjects(this.companiesSheet);
    const company = companies.find(row => 
      row['Company Name'] && 
      row['Company Name'].toLowerCase() === companyName.toLowerCase()
    );
    
    return company ? company['Domain'] || '' : '';
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
      emailsFound: results.filter(r => r.success && r.entity.email).length,
      totalTokensUsed: 0,
      estimatedCost: 0,
      averageConfidence: 0,
      errors: []
    };
    
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    results.forEach(result => {
      if (result.usage) {
        summary.totalTokensUsed += (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
      }
      if (result.success && result.entity.confidenceScore > 0) {
        totalConfidence += result.entity.confidenceScore;
        confidenceCount++;
      }
      if (result.error) {
        summary.errors.push({
          entityId: result.entity.id,
          entityName: result.entity.getFullName(),
          error: result.error
        });
      }
    });
    
    // Calculate average confidence
    if (confidenceCount > 0) {
      summary.averageConfidence = Math.round(totalConfidence / confidenceCount);
    }
    
    // Calculate estimated cost
    const model = this.config.get('DEFAULT_MODEL', 'claude-3-opus-20240229');
    summary.estimatedCost = this.calculateCost(
      { input_tokens: summary.totalTokensUsed * 0.3, output_tokens: summary.totalTokensUsed * 0.7 },
      model
    );
    
    return summary;
  }
  
  /**
   * Find duplicate contacts
   * @return {Object} Duplicate analysis
   */
  findDuplicates() {
    this.initialize();
    
    // Check for duplicate emails
    const emailDuplicates = SheetHelper.findDuplicates(this.sheet, 'Email');
    
    // Check for duplicate names within same company
    const data = SheetHelper.getSheetDataAsObjects(this.sheet);
    const nameCompanyDuplicates = {};
    
    data.forEach(row => {
      const key = `${row['First Name']} ${row['Last Name']}|${row['Company Name']}`;
      if (!nameCompanyDuplicates[key]) {
        nameCompanyDuplicates[key] = [];
      }
      nameCompanyDuplicates[key].push(row._rowIndex);
    });
    
    const duplicateNameCompanies = {};
    Object.entries(nameCompanyDuplicates).forEach(([key, rows]) => {
      if (rows.length > 1) {
        duplicateNameCompanies[key] = rows;
      }
    });
    
    // Highlight duplicates
    Object.values(emailDuplicates.duplicates).forEach(rows => {
      rows.forEach(row => {
        this.sheet.getRange(row, 9).setBackground('#ffcdd2'); // Light red for email
      });
    });
    
    Object.values(duplicateNameCompanies).forEach(rows => {
      rows.forEach(row => {
        this.sheet.getRange(row, 2, 1, 2).setBackground('#ffe0b2'); // Light orange for name
      });
    });
    
    return {
      emailDuplicates: emailDuplicates,
      nameCompanyDuplicates: {
        hasDuplicates: Object.keys(duplicateNameCompanies).length > 0,
        duplicates: duplicateNameCompanies,
        summary: `Found ${Object.keys(duplicateNameCompanies).length} duplicate name/company combinations`
      },
      totalDuplicates: Object.keys(emailDuplicates.duplicates).length + 
                      Object.keys(duplicateNameCompanies).length
    };
  }
  
  /**
   * Export contacts to different formats
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @return {string} Exported data
   */
  exportContacts(format = 'json', options = {}) {
    this.initialize();
    
    const contacts = this.getContactsFromSheet(options);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(contacts.map(c => c.toJSON()), null, 2);
        
      case 'csv':
        const headers = [
          'First Name', 'Last Name', 'Company', 'Job Title',
          'Email', 'Phone', 'LinkedIn', 'Location'
        ];
        const rows = [headers];
        
        contacts.forEach(contact => {
          rows.push([
            contact.firstName,
            contact.lastName,
            contact.companyName,
            contact.jobTitle,
            contact.email,
            contact.phone,
            contact.linkedinUrl,
            contact.location
          ]);
        });
        
        return rows.map(row => row.map(cell => {
          const value = String(cell || '').replace(/"/g, '""');
          return value.includes(',') ? `"${value}"` : value;
        }).join(',')).join('\n');
        
      case 'vcard':
        return contacts.map(contact => contact.toVCard()).join('\n\n');
        
      case 'salesforce':
        // Salesforce-compatible format
        return JSON.stringify({
          records: contacts.map(contact => ({
            attributes: { type: 'Contact' },
            FirstName: contact.firstName,
            LastName: contact.lastName,
            AccountId: null, // Would need to be mapped
            Title: contact.jobTitle,
            Department: contact.department,
            Email: contact.email,
            Phone: contact.phone,
            LinkedIn__c: contact.linkedinUrl,
            MailingCity: contact.location
          }))
        });
        
      case 'hubspot':
        // HubSpot-compatible format
        return JSON.stringify({
          contacts: contacts.map(contact => ({
            properties: {
              firstname: contact.firstName,
              lastname: contact.lastName,
              company: contact.companyName,
              jobtitle: contact.jobTitle,
              email: contact.email,
              phone: contact.phone,
              linkedinbio: contact.linkedinUrl,
              city: contact.location
            }
          }))
        });
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * Email verification for found emails
   * @param {Array} contacts - Contacts with emails to verify
   * @return {Object} Verification results
   */
  verifyEmails(contacts) {
    // This is a placeholder for email verification
    // In a real implementation, you might use an email verification service
    const results = {
      total: contacts.length,
      valid: 0,
      invalid: 0,
      unknown: 0
    };
    
    contacts.forEach(contact => {
      if (!contact.email) return;
      
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(contact.email)) {
        // Check if domain matches company domain
        const emailDomain = contact.email.split('@')[1];
        if (contact.companyDomain && emailDomain === contact.companyDomain) {
          results.valid++;
          contact.confidenceScore = Math.min(100, contact.confidenceScore + 20);
        } else {
          results.unknown++;
        }
      } else {
        results.invalid++;
        contact.confidenceScore = Math.max(0, contact.confidenceScore - 30);
      }
    });
    
    return results;
  }
}

// Create singleton instance
const ContactEnrichment = new ContactEnricher();

// Helper functions for menu integration
function enrichSelectedContacts() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  
  if (sheet.getName() !== 'Contacts') {
    ui.alert('Please select contacts from the Contacts sheet');
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
    ui.alert('Please select at least one contact row');
    return;
  }
  
  const result = ui.alert(
    'Confirm Enrichment',
    `Enrich ${rowIndices.length} selected contacts?`,
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      ContactEnrichment.initialize();
      const summary = ContactEnrichment.enrichSelected(rowIndices);
      ui.alert(
        'Enrichment Complete',
        `Processed: ${summary.total}\n` +
        `Successful: ${summary.successful}\n` +
        `Failed: ${summary.failed}\n` +
        `Emails Found: ${summary.emailsFound}\n` +
        `Average Confidence: ${summary.averageConfidence}%`,
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert('Error', error.toString(), ui.ButtonSet.OK);
    }
  }
}

function enrichAllNewContacts() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.alert(
    'Confirm Enrichment',
    'Enrich all contacts with pending status?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      ContactEnrichment.initialize();
      const summary = ContactEnrichment.enrichAll({ onlyNew: true });
      ui.alert(
        'Enrichment Complete',
        `Processed: ${summary.total}\n` +
        `Successful: ${summary.successful}\n` +
        `Failed: ${summary.failed}\n` +
        `Emails Found: ${summary.emailsFound}\n` +
        `Average Confidence: ${summary.averageConfidence}%`,
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert('Error', error.toString(), ui.ButtonSet.OK);
    }
  }
}

function enrichAllNew() {
  // Enrich both companies and contacts that are new
  enrichAllNewCompanies();
  enrichAllNewContacts();
}