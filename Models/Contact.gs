/**
 * Contact Model
 * Represents a contact entity with validation and serialization
 */

class Contact {
  constructor(data = {}) {
    // Required fields
    this.id = data.id || Utilities.getUuid();
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.companyName = data.companyName || '';
    this.companyDomain = data.companyDomain || '';
    
    // Enriched fields
    this.jobTitle = data.jobTitle || '';
    this.department = data.department || '';
    this.seniorityLevel = data.seniorityLevel || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.linkedinUrl = data.linkedinUrl || '';
    this.twitterHandle = data.twitterHandle || '';
    this.location = data.location || '';
    this.yearsInRole = data.yearsInRole || '';
    this.previousCompanies = data.previousCompanies || '';
    this.skills = data.skills || '';
    this.directReports = data.directReports || '';
    
    // System fields
    this.enrichmentStatus = data.enrichmentStatus || 'Pending';
    this.lastEnrichedDate = data.lastEnrichedDate || null;
    this.confidenceScore = data.confidenceScore || 0;
    this.source = data.source || '';
    this.notes = data.notes || '';
    
    // Metadata
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this._rowIndex = data._rowIndex || null;
  }
  
  /**
   * Get full name
   * @return {string} Full name
   */
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }
  
  /**
   * Validate contact data
   * @return {Object} Validation result
   */
  validate() {
    const errors = [];
    
    // Name validation
    if (!this.firstName || this.firstName.trim() === '') {
      errors.push('First name is required');
    }
    
    if (!this.lastName || this.lastName.trim() === '') {
      errors.push('Last name is required');
    }
    
    // Email validation
    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }
    
    // LinkedIn URL validation
    if (this.linkedinUrl && !this.isValidLinkedInUrl(this.linkedinUrl)) {
      errors.push('Invalid LinkedIn URL format');
    }
    
    // Phone validation
    if (this.phone && !this.isValidPhone(this.phone)) {
      errors.push('Invalid phone format');
    }
    
    // Seniority level validation
    const validSeniority = ['', 'Entry', 'Mid', 'Senior', 'Executive', 'C-Suite'];
    if (this.seniorityLevel && !validSeniority.includes(this.seniorityLevel)) {
      errors.push('Invalid seniority level');
    }
    
    // Status validation
    const validStatuses = ['Pending', 'Processing', 'Complete', 'Failed', 'Skipped'];
    if (!validStatuses.includes(this.enrichmentStatus)) {
      errors.push('Invalid enrichment status');
    }
    
    // Confidence score validation
    if (this.confidenceScore < 0 || this.confidenceScore > 100) {
      errors.push('Confidence score must be between 0 and 100');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Check if email is valid
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Check if LinkedIn URL is valid
   * @private
   */
  isValidLinkedInUrl(url) {
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;
    return linkedinRegex.test(url);
  }
  
  /**
   * Check if phone is valid
   * @private
   */
  isValidPhone(phone) {
    // Basic phone validation - allows various formats
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
  
  /**
   * Convert to spreadsheet row format
   * @return {Array} Row values in correct order
   */
  toRowArray() {
    return [
      this.id,
      this.firstName,
      this.lastName,
      this.companyName,
      this.companyDomain,
      this.jobTitle,
      this.department,
      this.seniorityLevel,
      this.email,
      this.phone,
      this.linkedinUrl,
      this.twitterHandle,
      this.location,
      this.yearsInRole,
      this.previousCompanies,
      this.skills,
      this.directReports,
      this.enrichmentStatus,
      this.lastEnrichedDate,
      this.confidenceScore,
      this.source,
      this.notes
    ];
  }
  
  /**
   * Create from spreadsheet row
   * @param {Array} row - Row data
   * @param {number} rowIndex - Row index in sheet
   * @return {Contact} Contact instance
   */
  static fromRow(row, rowIndex) {
    return new Contact({
      id: row[0],
      firstName: row[1],
      lastName: row[2],
      companyName: row[3],
      companyDomain: row[4],
      jobTitle: row[5],
      department: row[6],
      seniorityLevel: row[7],
      email: row[8],
      phone: row[9],
      linkedinUrl: row[10],
      twitterHandle: row[11],
      location: row[12],
      yearsInRole: row[13],
      previousCompanies: row[14],
      skills: row[15],
      directReports: row[16],
      enrichmentStatus: row[17],
      lastEnrichedDate: row[18],
      confidenceScore: row[19],
      source: row[20],
      notes: row[21],
      _rowIndex: rowIndex
    });
  }
  
  /**
   * Update with enrichment data
   * @param {Object} enrichmentData - Data from enrichment service
   */
  updateWithEnrichment(enrichmentData) {
    if (enrichmentData.jobTitle) this.jobTitle = enrichmentData.jobTitle;
    if (enrichmentData.department) this.department = enrichmentData.department;
    if (enrichmentData.seniorityLevel) this.seniorityLevel = enrichmentData.seniorityLevel;
    if (enrichmentData.email) this.email = enrichmentData.email;
    if (enrichmentData.phone) this.phone = enrichmentData.phone;
    if (enrichmentData.linkedinUrl) this.linkedinUrl = enrichmentData.linkedinUrl;
    if (enrichmentData.location) this.location = enrichmentData.location;
    if (enrichmentData.yearsInRole) this.yearsInRole = enrichmentData.yearsInRole;
    if (enrichmentData.previousCompanies) {
      this.previousCompanies = Array.isArray(enrichmentData.previousCompanies)
        ? enrichmentData.previousCompanies.join(', ')
        : enrichmentData.previousCompanies;
    }
    if (enrichmentData.skills) {
      this.skills = Array.isArray(enrichmentData.skills)
        ? enrichmentData.skills.join(', ')
        : enrichmentData.skills;
    }
    if (enrichmentData.directReports !== undefined) {
      this.directReports = enrichmentData.directReports.toString();
    }
    
    // Calculate confidence score based on data completeness
    this.confidenceScore = this.calculateConfidenceScore(enrichmentData);
    this.source = enrichmentData.source || 'AI Enrichment';
    this.lastEnrichedDate = new Date();
    this.enrichmentStatus = 'Complete';
    this.updatedAt = new Date();
  }
  
  /**
   * Calculate confidence score based on enrichment data
   * @private
   */
  calculateConfidenceScore(enrichmentData) {
    let score = 0;
    let totalWeight = 0;
    
    // Weight different fields based on importance
    const fieldWeights = {
      jobTitle: 20,
      department: 10,
      email: 25,
      linkedinUrl: 20,
      location: 10,
      phone: 15
    };
    
    for (const [field, weight] of Object.entries(fieldWeights)) {
      totalWeight += weight;
      if (enrichmentData[field] && enrichmentData[field] !== 'N/A') {
        score += weight;
      }
    }
    
    return Math.round((score / totalWeight) * 100);
  }
  
  /**
   * Calculate completeness score
   * @return {number} Percentage of fields filled
   */
  getCompletenessScore() {
    const fields = [
      'firstName', 'lastName', 'companyName', 'jobTitle', 'department',
      'seniorityLevel', 'email', 'phone', 'linkedinUrl', 'location',
      'skills'
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
  needsReEnrichment(daysThreshold = 180) {
    if (this.enrichmentStatus !== 'Complete') return true;
    
    const daysSince = this.getDaysSinceEnrichment();
    return daysSince !== null && daysSince > daysThreshold;
  }
  
  /**
   * Check if contact matches search criteria
   * @param {string} searchTerm - Search term
   * @return {boolean} Whether contact matches
   */
  matchesSearch(searchTerm) {
    const term = searchTerm.toLowerCase();
    const searchableFields = [
      this.getFullName(),
      this.email,
      this.companyName,
      this.jobTitle,
      this.department,
      this.location,
      this.skills
    ];
    
    return searchableFields.some(field => 
      field && field.toString().toLowerCase().includes(term)
    );
  }
  
  /**
   * Convert to JSON
   * @return {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      companyName: this.companyName,
      companyDomain: this.companyDomain,
      jobTitle: this.jobTitle,
      department: this.department,
      seniorityLevel: this.seniorityLevel,
      email: this.email,
      phone: this.phone,
      linkedinUrl: this.linkedinUrl,
      twitterHandle: this.twitterHandle,
      location: this.location,
      yearsInRole: this.yearsInRole,
      previousCompanies: this.previousCompanies,
      skills: this.skills,
      directReports: this.directReports,
      enrichmentStatus: this.enrichmentStatus,
      lastEnrichedDate: this.lastEnrichedDate,
      confidenceScore: this.confidenceScore,
      source: this.source,
      completenessScore: this.getCompletenessScore(),
      daysSinceEnrichment: this.getDaysSinceEnrichment()
    };
  }
  
  /**
   * Convert to vCard format
   * @return {string} vCard string
   */
  toVCard() {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${this.getFullName()}`,
      `N:${this.lastName};${this.firstName};;;`,
      this.companyName ? `ORG:${this.companyName}` : '',
      this.jobTitle ? `TITLE:${this.jobTitle}` : '',
      this.email ? `EMAIL:${this.email}` : '',
      this.phone ? `TEL:${this.phone}` : '',
      this.linkedinUrl ? `URL:${this.linkedinUrl}` : '',
      this.location ? `ADR:;;${this.location};;;;` : '',
      'END:VCARD'
    ];
    
    return vcard.filter(line => line).join('\n');
  }
  
  /**
   * Clone the contact
   * @return {Contact} Cloned instance
   */
  clone() {
    return new Contact(this.toJSON());
  }
}