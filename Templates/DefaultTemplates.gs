/**
 * Default Enrichment Templates
 * Pre-built templates for common enrichment scenarios
 */

class DefaultTemplates {
  /**
   * Get all default templates
   * @return {Array} Array of template objects
   */
  static getAll() {
    return [
      // Company Templates
      {
        id: 'company-overview',
        name: 'Company Overview',
        type: 'Company',
        description: 'Comprehensive company information including size, revenue, and industry',
        promptTemplate: `Search the web for current information about the company "{{companyName}}" {{#if domain}}with domain {{domain}}{{/if}} and provide:
1. Company description (2-3 sentences)
2. Industry and sub-industry classification
3. Company size category (Startup/SMB/Mid-Market/Enterprise)
4. Employee count or range
5. Estimated annual revenue range
6. Year founded
7. Headquarters location (city, state/country)
8. Key products or services (top 3-5)
9. Primary target market
10. Main competitors (3-5 companies)
11. Recent news or developments (search for news from the last 6 months)

Format the response as a JSON object with these exact keys:
description, industry, companySize, employeeCount, revenueRange, foundedYear, headquarters, products, targetMarket, competitors, recentNews

Ensure all values are strings. Use "N/A" for unavailable information.`,
        requiredFields: ['companyName'],
        outputFields: ['description', 'industry', 'companySize', 'employeeCount', 'revenueRange', 'foundedYear', 'headquarters', 'products', 'targetMarket', 'competitors', 'recentNews'],
        // New structure for field-specific prompts
        fieldPrompts: {
          description: `Search the web and provide a 2-3 sentence description of {{companyName}}. Focus on what the company does and its main value proposition.`,
          industry: `What industry and sub-industry does {{companyName}} operate in? Provide the most specific classification.`,
          companySize: `Classify {{companyName}} by size: Startup (1-50 employees), SMB (51-500), Mid-Market (501-5000), or Enterprise (5000+).`,
          employeeCount: `Search for the current employee count or range for {{companyName}}. Provide the most recent figure you can find.`,
          revenueRange: `Find the estimated annual revenue for {{companyName}}. Provide a range if exact figures aren't available (e.g., "$10M-$50M").`,
          foundedYear: `What year was {{companyName}} founded?`,
          headquarters: `Where is {{companyName}} headquartered? Provide city and state/country.`,
          products: `What are the top 3-5 key products or services offered by {{companyName}}?`,
          targetMarket: `Who is the primary target market for {{companyName}}? Describe their ideal customers.`,
          competitors: `List 3-5 main competitors of {{companyName}}.`,
          recentNews: `Search for recent news about {{companyName}} from the last 6 months. Provide a brief summary of key developments.`
        },
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 2048,
          temperature: 0.3
        }
      },
      
      {
        id: 'company-tech-stack',
        name: 'Technology Stack Finder',
        type: 'Company',
        description: 'Identifies technologies and tools used by the company',
        promptTemplate: `Search the web to identify the current technology stack used by "{{companyName}}" {{#if domain}}({{domain}}){{/if}}:

Please research and categorize their technology usage:
1. Programming languages
2. Web frameworks
3. Databases
4. Cloud infrastructure providers
5. Analytics and tracking tools
6. Marketing and sales tools
7. Development and deployment tools
8. Security and monitoring tools
9. Communication and collaboration tools
10. Any notable open source contributions

Format as JSON with key "technologies" containing an object with these categories as keys and arrays of tool names as values.
Example: {"technologies": {"programming_languages": ["Python", "JavaScript"], "cloud_providers": ["AWS", "Google Cloud"]}}`,
        requiredFields: ['companyName'],
        outputFields: ['technologiesUsed'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          temperature: 0.2
        }
      },
      
      {
        id: 'company-social-media',
        name: 'Social Media Finder',
        type: 'Company',
        description: 'Finds all social media profiles and online presence',
        promptTemplate: `Search the web to find all social media and online presence for "{{companyName}}" {{#if domain}}({{domain}}){{/if}}:

Locate their official profiles on:
1. LinkedIn company page
2. Twitter/X handle
3. Facebook page
4. Instagram account
5. YouTube channel
6. GitHub organization
7. Medium publication
8. Reddit presence
9. TikTok account
10. Any other relevant platforms

Format as JSON object with platform names as keys and URLs/handles as values.
Example: {"linkedin": "https://linkedin.com/company/example", "twitter": "@example"}
Use null for platforms where no official presence is found.`,
        requiredFields: ['companyName'],
        outputFields: ['socialMediaLinks'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 512,
          temperature: 0.1
        }
      },
      
      // Contact Templates
      {
        id: 'contact-finder',
        name: 'Contact Information Finder',
        type: 'Contact',
        description: 'Finds professional information and contact details',
        promptTemplate: `Search the web for current professional information about {{firstName}} {{lastName}} {{#if companyName}}at {{companyName}}{{/if}} {{#if companyDomain}}({{companyDomain}}){{/if}}:

Research and provide:
1. Current job title
2. Department or team
3. Seniority level (Entry/Mid/Senior/Executive/C-Suite)
4. Professional email address (if publicly available)
5. LinkedIn profile URL
6. Office location (city, state/country)
7. Estimated years in current role
8. Previous companies (last 2-3)
9. Key skills or areas of expertise (top 5)
10. Number of direct reports (if applicable)

Format as JSON with these keys:
jobTitle, department, seniorityLevel, email, linkedinUrl, location, yearsInRole, previousCompanies (array), skills (array), directReports

Use "N/A" for unavailable information. Only include publicly available information.`,
        requiredFields: ['firstName', 'lastName'],
        outputFields: ['jobTitle', 'department', 'seniorityLevel', 'email', 'linkedinUrl', 'location', 'yearsInRole', 'previousCompanies', 'skills', 'directReports'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          temperature: 0.2
        }
      },
      
      {
        id: 'email-finder',
        name: 'Email Pattern Finder',
        type: 'Contact',
        description: 'Finds likely email address based on company patterns',
        promptTemplate: `Determine the likely professional email address for {{firstName}} {{lastName}} at {{companyName}} (domain: {{companyDomain}}):

Based on common email patterns at this company and industry standards, provide:
1. Most likely email format
2. Alternative email formats (2-3 options)
3. Confidence level (High/Medium/Low)
4. Company email pattern if identifiable

Common patterns to consider:
- firstname.lastname@domain
- firstinitiallastname@domain
- firstname@domain
- f.lastname@domain
- firstname_lastname@domain

Format as JSON:
{"primary_email": "example@domain.com", "alternatives": ["alt1@domain.com"], "confidence": "Medium", "pattern": "firstname.lastname"}`,
        requiredFields: ['firstName', 'lastName', 'companyDomain'],
        outputFields: ['email'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 256,
          temperature: 0.1
        }
      },
      
      {
        id: 'contact-social',
        name: 'Contact Social Profiles',
        type: 'Contact',
        description: 'Finds social media profiles for individual',
        promptTemplate: `Find professional social media profiles for {{firstName}} {{lastName}} {{#if jobTitle}}({{jobTitle}}){{/if}} {{#if companyName}}at {{companyName}}{{/if}}:

Locate their profiles on:
1. LinkedIn personal profile
2. Twitter/X handle
3. GitHub profile (if technical role)
4. Personal website or blog
5. Medium profile
6. Speaking engagements or conference talks
7. Published articles or papers
8. Professional certifications

Format as JSON:
{"linkedinUrl": "url", "twitterHandle": "@handle", "github": "username", "website": "url", "publications": ["title1", "title2"]}`,
        requiredFields: ['firstName', 'lastName'],
        outputFields: ['linkedinUrl', 'twitterHandle'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 512,
          temperature: 0.2
        }
      },
      
      // Industry Analysis Templates
      {
        id: 'industry-analysis',
        name: 'Industry Analysis',
        type: 'Company',
        description: 'Analyzes industry trends and competitive landscape',
        promptTemplate: `Analyze the industry for {{companyName}} in the {{industry}} sector:

Provide comprehensive analysis including:
1. Industry size and growth rate (global and regional)
2. Key trends shaping the industry (top 5)
3. Major players and market share
4. Regulatory environment and challenges
5. Emerging technologies or disruptions
6. Customer demographics and behavior changes
7. Investment and M&A activity
8. Future outlook (next 2-3 years)

Format as JSON with clear structure:
{"industrySize": "value", "growthRate": "percentage", "trends": ["trend1"], "majorPlayers": ["company1"], "challenges": ["challenge1"], "opportunities": ["opp1"], "outlook": "description"}`,
        requiredFields: ['companyName', 'industry'],
        outputFields: ['industry', 'targetMarket', 'competitors'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 2048,
          temperature: 0.4
        }
      },
      
      {
        id: 'competitor-analysis',
        name: 'Competitor Analysis',
        type: 'Company',
        description: 'Detailed analysis of competitive positioning',
        promptTemplate: `Analyze competitors for {{companyName}} in the {{industry}} industry:

Research and provide:
1. Direct competitors (top 5 with brief description)
2. Indirect competitors or alternatives
3. Competitive advantages of {{companyName}}
4. Competitive disadvantages or gaps
5. Market positioning comparison
6. Pricing strategy comparison
7. Target customer overlap
8. Recent competitive moves or announcements

Format as structured JSON with detailed comparisons.`,
        requiredFields: ['companyName'],
        outputFields: ['competitors', 'targetMarket'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 2048,
          temperature: 0.3
        }
      },
      
      // Custom Research Templates
      {
        id: 'funding-history',
        name: 'Funding & Investment History',
        type: 'Company',
        description: 'Tracks funding rounds and investor information',
        promptTemplate: `Search the web for funding history and investment information for {{companyName}}:

Find and list:
1. Total funding raised to date
2. Latest funding round (amount, date, series)
3. All funding rounds chronologically
4. Key investors and VCs
5. Board members
6. Valuation (if available)
7. Exit potential or IPO likelihood
8. Use of funds statements

Format as JSON:
{"totalFunding": "amount", "latestRound": {"amount": "", "date": "", "series": ""}, "rounds": [array], "investors": [array], "valuation": "amount"}`,
        requiredFields: ['companyName'],
        outputFields: ['revenueRange', 'foundedYear'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          temperature: 0.2
        }
      },
      
      {
        id: 'news-monitoring',
        name: 'Recent News & Updates',
        type: 'Company',
        description: 'Finds recent news and announcements',
        promptTemplate: `Search the web for the most recent news and updates about {{companyName}} (focus on the last 6 months):

Search for:
1. Major announcements or press releases
2. Product launches or updates
3. Leadership changes
4. Partnerships or acquisitions
5. Awards or recognition
6. Controversies or challenges
7. Financial performance updates
8. Strategic initiatives

Format as JSON array with date, title, summary, and impact for each item.
Sort by date (most recent first).`,
        requiredFields: ['companyName'],
        outputFields: ['recentNews'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1536,
          temperature: 0.2
        }
      }
    ];
  }
  
  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @return {Object} Template object
   */
  static getById(templateId) {
    return this.getAll().find(template => template.id === templateId);
  }
  
  /**
   * Get templates by type
   * @param {string} type - Template type (Company/Contact)
   * @return {Array} Filtered templates
   */
  static getByType(type) {
    return this.getAll().filter(template => template.type === type);
  }
  
  /**
   * Populate templates sheet with default templates
   * @param {Sheet} sheet - Templates sheet
   */
  static populate(sheet) {
    const templates = this.getAll();
    const rows = [];
    
    templates.forEach((template, index) => {
      rows.push([
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
        new Date(), // Created date
        new Date(), // Last modified
        0, // Usage count
        0, // Success rate
        0  // Average cost
      ]);
    });
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 15).setValues(rows);
    }
  }
  
  /**
   * Process template with variables
   * @param {string} template - Template string with {{variables}}
   * @param {Object} data - Data object with variable values
   * @return {string} Processed template
   */
  static processTemplate(template, data) {
    // Simple template processing - replace {{variable}} with values
    let processed = template;
    
    // Handle simple variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || '');
    });
    
    // Handle conditionals {{#if variable}}...{{/if}}
    const conditionalRegex = /{{#if (\w+)}}(.*?){{\/if}}/gs;
    processed = processed.replace(conditionalRegex, (match, variable, content) => {
      return data[variable] ? content : '';
    });
    
    // Clean up any remaining empty spaces
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }
  
  /**
   * Validate template
   * @param {Object} template - Template object
   * @return {Object} Validation result
   */
  static validateTemplate(template) {
    const errors = [];
    
    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }
    
    if (!template.type || !['Company', 'Contact'].includes(template.type)) {
      errors.push('Template type must be Company or Contact');
    }
    
    if (!template.promptTemplate || template.promptTemplate.trim() === '') {
      errors.push('Prompt template is required');
    }
    
    if (!Array.isArray(template.requiredFields) || template.requiredFields.length === 0) {
      errors.push('At least one required field must be specified');
    }
    
    if (!Array.isArray(template.outputFields) || template.outputFields.length === 0) {
      errors.push('At least one output field must be specified');
    }
    
    if (!template.modelSettings || typeof template.modelSettings !== 'object') {
      errors.push('Model settings must be provided');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Create custom template
   * @param {Object} templateData - Template data
   * @return {Object} Created template
   */
  static createCustom(templateData) {
    const validation = this.validateTemplate(templateData);
    if (!validation.valid) {
      throw new Error('Invalid template: ' + validation.errors.join(', '));
    }
    
    return {
      id: `custom-${Utilities.getUuid()}`,
      name: templateData.name,
      type: templateData.type,
      description: templateData.description || '',
      promptTemplate: templateData.promptTemplate,
      requiredFields: templateData.requiredFields,
      outputFields: templateData.outputFields,
      modelSettings: {
        model: templateData.modelSettings.model || 'claude-3-5-sonnet-20241022',
        maxTokens: templateData.modelSettings.maxTokens || 1024,
        temperature: templateData.modelSettings.temperature || 0.3
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      successRate: 0,
      averageCost: 0
    };
  }
  
  /**
   * Get example custom templates
   * @return {Array} Example templates for users to try
   */
  static getExampleCustomTemplates() {
    return [
      {
        name: 'Executive Profile Builder',
        type: 'Contact',
        description: 'Deep profile of C-level executives including background and achievements',
        promptTemplate: `Search the web for detailed information about {{firstName}} {{lastName}} ({{jobTitle}} at {{companyName}}):

Find and provide:
1. Professional biography and career progression
2. Educational background (degrees, universities, years)
3. Previous executive positions (last 5)
4. Board memberships and advisory roles
5. Published articles, interviews, or speaking engagements
6. Awards and recognitions
7. Known expertise areas and thought leadership topics
8. Estimated total years of experience
9. Notable achievements or company milestones during tenure
10. Public quotes or mission statements

Format as JSON with appropriate keys for each data point.`,
        requiredFields: ['firstName', 'lastName', 'jobTitle', 'companyName'],
        outputFields: ['biography', 'education', 'previousRoles', 'boardMemberships', 'publications', 'awards', 'expertiseAreas', 'yearsExperience', 'achievements', 'quotes'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 3000,
          temperature: 0.3
        }
      },
      
      {
        name: 'Company Culture Analyzer',
        type: 'Company',
        description: 'Analyzes company culture, values, and employee sentiment',
        promptTemplate: `Search the web for information about {{companyName}}'s culture and work environment:

Research and analyze:
1. Stated company values and mission
2. Employee reviews and ratings (Glassdoor, Indeed, etc.)
3. Benefits and perks offered
4. Work-life balance policies
5. Diversity and inclusion initiatives
6. Remote work policies
7. Professional development opportunities
8. Company events and team building
9. Leadership style and management approach
10. Employee retention indicators

Also calculate an overall culture score (1-10) based on findings.

Format as JSON with detailed findings and the culture score.`,
        requiredFields: ['companyName'],
        outputFields: ['values', 'employeeRating', 'benefits', 'workLifeBalance', 'diversity', 'remotePolicy', 'development', 'teamCulture', 'leadership', 'retention', 'cultureScore'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 2500,
          temperature: 0.4
        }
      },
      
      {
        name: 'Market Opportunity Finder',
        type: 'Company',
        description: 'Identifies expansion opportunities and untapped markets',
        promptTemplate: `Analyze market opportunities for {{companyName}} in the {{industry}} industry:

Research and identify:
1. Geographic markets not yet entered (top 5)
2. Adjacent product/service opportunities
3. Underserved customer segments
4. Partnership opportunities with complementary businesses
5. Acquisition targets (smaller companies to acquire)
6. New distribution channels to explore
7. Emerging technologies to leverage
8. Regulatory changes creating opportunities
9. Competitor weaknesses to exploit
10. Estimated market size for each opportunity

Format as JSON with detailed opportunity analysis and market sizing.`,
        requiredFields: ['companyName', 'industry'],
        outputFields: ['newMarkets', 'productOpportunities', 'customerSegments', 'partnerships', 'acquisitionTargets', 'channels', 'technologies', 'regulatory', 'competitiveAdvantages', 'marketSizes'],
        modelSettings: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 3000,
          temperature: 0.5
        }
      }
    ];
  }
}