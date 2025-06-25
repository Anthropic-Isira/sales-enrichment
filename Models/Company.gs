/**
 * Company Model
 * Represents a company entity with validation and serialization
 */

class Company {
  constructor(data = {}) {
    // Required fields
    this.id = data.id || Utilities.getUuid();
    this.name = data.name || '';
    this.domain = data.domain || '';
    
    // Enriched fields
    this.industry = data.industry || '';
    this.companySize = data.companySize || '';
    this.employeeCount = data.employeeCount || '';
    this.revenueRange = data.revenueRange || '';
    this.foundedYear = data.foundedYear || '';
    this.headquarters = data.headquarters || '';
    this.description = data.description || '';
    this.technologiesUsed = data.technologiesUsed || '';
    this.keyProducts = data.keyProducts || '';
    this.targetMarket = data.targetMarket || '';
    this.competitors = data.competitors || '';
    this.recentNews = data.recentNews || '';
    this.socialMediaLinks = data.socialMediaLinks || '';
    
    // System fields
    this.enrichmentStatus = data.enrichmentStatus || 'Pending';
    this.lastEnrichedDate = data.lastEnrichedDate || null;
    this.enrichmentTemplate = data.enrichmentTemplate || '';
    this.apiCallsUsed = data.apiCallsUsed || 0;
    this.notes = data.notes || '';
    
    // Metadata
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this._rowIndex = data._rowIndex || null;
  }
  
  /**
   * Validate company data
   * @return {Object} Validation result
   */
  validate() {
    const errors = [];
    
    // Required field validation
    if (!this.name || this.name.trim() === '') {
      errors.push('Company name is required');
    }
    
    // Domain validation
    if (this.domain && !this.isValidDomain(this.domain)) {
      errors.push('Invalid domain format');
    }
    
    // Year validation
    if (this.foundedYear) {
      const year = parseInt(this.foundedYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        errors.push('Invalid founded year');
      }
    }
    
    // Employee count validation
    if (this.employeeCount && !this.isValidEmployeeCount(this.employeeCount)) {
      errors.push('Invalid employee count format');
    }
    
    // Status validation
    const validStatuses = ['Pending', 'Processing', 'Complete', 'Failed', 'Skipped'];
    if (!validStatuses.includes(this.enrichmentStatus)) {
      errors.push('Invalid enrichment status');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Check if domain is valid
   * @private
   */
  isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain);
  }
  
  /**
   * Check if employee count is valid
   * @private
   */
  isValidEmployeeCount(count) {
    // Accept ranges like "11-50" or specific numbers
    const rangeRegex = /^\d+(-\d+)?$/;
    return rangeRegex.test(count.toString());
  }
  
  /**
   * Convert to spreadsheet row format
   * @return {Array} Row values in correct order
   */
  toRowArray() {
    return [
      this.id,
      this.name,
      this.domain,
      this.industry,
      this.companySize,
      this.employeeCount,
      this.revenueRange,
      this.foundedYear,
      this.headquarters,
      this.description,
      this.technologiesUsed,
      this.keyProducts,
      this.targetMarket,
      this.competitors,
      this.recentNews,
      this.socialMediaLinks,
      this.enrichmentStatus,
      this.lastEnrichedDate,
      this.enrichmentTemplate,
      this.apiCallsUsed,
      this.notes
    ];
  }
  
  /**
   * Create from spreadsheet row
   * @param {Array} row - Row data
   * @param {number} rowIndex - Row index in sheet
   * @return {Company} Company instance
   */
  static fromRow(row, rowIndex) {
    return new Company({
      id: row[0],
      name: row[1],
      domain: row[2],
      industry: row[3],
      companySize: row[4],
      employeeCount: row[5],
      revenueRange: row[6],
      foundedYear: row[7],
      headquarters: row[8],
      description: row[9],
      technologiesUsed: row[10],
      keyProducts: row[11],
      targetMarket: row[12],
      competitors: row[13],
      recentNews: row[14],
      socialMediaLinks: row[15],
      enrichmentStatus: row[16],
      lastEnrichedDate: row[17],
      enrichmentTemplate: row[18],
      apiCallsUsed: row[19],
      notes: row[20],
      _rowIndex: rowIndex
    });
  }
  
  /**
   * Update with enrichment data
   * @param {Object} enrichmentData - Data from enrichment service
   */
  updateWithEnrichment(enrichmentData) {
    if (enrichmentData.description) this.description = enrichmentData.description;
    if (enrichmentData.industry) this.industry = enrichmentData.industry;
    if (enrichmentData.companySize) this.companySize = enrichmentData.companySize;
    if (enrichmentData.employeeCount) this.employeeCount = enrichmentData.employeeCount;
    if (enrichmentData.revenueRange) this.revenueRange = enrichmentData.revenueRange;
    if (enrichmentData.foundedYear) this.foundedYear = enrichmentData.foundedYear;
    if (enrichmentData.headquarters) this.headquarters = enrichmentData.headquarters;
    if (enrichmentData.products) this.keyProducts = enrichmentData.products;
    if (enrichmentData.targetMarket) this.targetMarket = enrichmentData.targetMarket;
    if (enrichmentData.competitors) {
      this.competitors = Array.isArray(enrichmentData.competitors) 
        ? enrichmentData.competitors.join(', ') 
        : enrichmentData.competitors;
    }
    if (enrichmentData.recentNews) this.recentNews = enrichmentData.recentNews;
    if (enrichmentData.technologies) {
      this.technologiesUsed = this.formatTechnologies(enrichmentData.technologies);
    }
    
    this.lastEnrichedDate = new Date();
    this.enrichmentStatus = 'Complete';
    this.updatedAt = new Date();
  }
  
  /**
   * Format technologies data
   * @private
   */
  formatTechnologies(technologies) {
    if (typeof technologies === 'string') return technologies;
    if (Array.isArray(technologies)) return technologies.join(', ');
    if (typeof technologies === 'object') {
      return Object.entries(technologies)
        .map(([category, items]) => `${category}: ${items.join(', ')}`)
        .join('; ');
    }
    return '';
  }
  
  /**
   * Calculate completeness score
   * @return {number} Percentage of fields filled
   */
  getCompletenessScore() {
    const fields = [
      'name', 'domain', 'industry', 'companySize', 'employeeCount',
      'revenueRange', 'foundedYear', 'headquarters', 'description',
      'technologiesUsed', 'keyProducts', 'targetMarket', 'competitors'
    ];
    
    const filledFields = fields.filter(field => this[field] && this[field].toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }
  
  /**
   * Get days since last enrichment
   * @return {number|null} Days since enrichment
   */
  getDaysSinceEnrichment() {
    if (!this.lastEnrichedDate) return null;
    
    const now = new Date();
    const enrichedDate = new Date(this.lastEnrichedDate);
    const diffTime = Math.abs(now - enrichedDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Check if needs re-enrichment
   * @param {number} daysThreshold - Days before re-enrichment needed
   * @return {boolean} Whether re-enrichment is needed
   */
  needsReEnrichment(daysThreshold = 90) {
    if (this.enrichmentStatus !== 'Complete') return true;
    
    const daysSince = this.getDaysSinceEnrichment();
    return daysSince !== null && daysSince > daysThreshold;
  }
  
  /**
   * Convert to JSON
   * @return {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      industry: this.industry,
      companySize: this.companySize,
      employeeCount: this.employeeCount,
      revenueRange: this.revenueRange,
      foundedYear: this.foundedYear,
      headquarters: this.headquarters,
      description: this.description,
      technologiesUsed: this.technologiesUsed,
      keyProducts: this.keyProducts,
      targetMarket: this.targetMarket,
      competitors: this.competitors,
      recentNews: this.recentNews,
      socialMediaLinks: this.socialMediaLinks,
      enrichmentStatus: this.enrichmentStatus,
      lastEnrichedDate: this.lastEnrichedDate,
      completenessScore: this.getCompletenessScore(),
      daysSinceEnrichment: this.getDaysSinceEnrichment()
    };
  }
  
  /**
   * Clone the company
   * @return {Company} Cloned instance
   */
  clone() {
    return new Company(this.toJSON());
  }
}