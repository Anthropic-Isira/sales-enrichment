/**
 * Anthropic API Service
 * Handles all interactions with Claude API for enrichment
 */

class AnthropicService {
  constructor() {
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.apiVersion = '2023-06-01';
    this.defaultModel = ConfigService.get('DEFAULT_MODEL', 'claude-sonnet-4-20250514');
    this.maxRetries = ConfigService.get('MAX_RETRIES', 3);
    this.timeout = ConfigService.get('ENRICHMENT_TIMEOUT', 30000);
  }
  
  /**
   * Make a request to the Anthropic API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options
   * @return {Object} API response
   */
  makeRequest(prompt, options = {}) {
    const apiKey = ConfigService.getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured. Please set your Anthropic API key in the settings.');
    }
    
    const payload = {
      model: options.model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || ConfigService.get('MAX_TOKENS', 4096),
      temperature: options.temperature || ConfigService.get('TEMPERATURE', 0.7),
      system: options.systemPrompt || this.getDefaultSystemPrompt()
    };
    
    // Add web search tool if enabled and using compatible model
    const useWebSearch = ConfigService.get('USE_WEB_SEARCH', true);
    const webSearchModels = ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'];
    
    if (useWebSearch && webSearchModels.includes(payload.model)) {
      payload.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: options.maxSearches || ConfigService.get('MAX_WEB_SEARCHES', 5)
      }];
    }
    
    const requestOptions = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': this.apiVersion
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Add timeout
    if (this.timeout) {
      requestOptions.timeout = this.timeout;
    }
    
    // Retry logic
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = UrlFetchApp.fetch(this.baseUrl, requestOptions);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        if (responseCode === 200) {
          const data = JSON.parse(responseText);
          
          // Extract text content from the response
          // Handle both regular responses and tool-use responses
          let content = '';
          if (data.content && data.content.length > 0) {
            // Combine all text blocks in the response
            data.content.forEach(block => {
              if (block.type === 'text') {
                content += block.text;
              }
            });
          }
          
          return {
            success: true,
            content: content || data.content[0].text,
            usage: data.usage,
            model: data.model,
            toolUse: data.content.filter(c => c.type === 'tool_use')
          };
        } else if (responseCode === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.getHeaders()['retry-after'] || Math.pow(2, attempt) * 1000;
          Utilities.sleep(parseInt(retryAfter));
          continue;
        } else {
          // Other error
          const errorData = JSON.parse(responseText);
          lastError = new Error(`API Error (${responseCode}): ${errorData.error?.message || responseText}`);
        }
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          Utilities.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError || new Error('Failed to make API request after retries');
  }
  
  /**
   * Enrich text with web search capabilities
   * @param {string} query - Search query
   * @param {string} enrichmentType - Type of enrichment
   * @param {Object} context - Additional context
   * @return {Object} Enrichment result
   */
  enrichWithSearch(query, enrichmentType, context = {}) {
    const searchPrompt = this.buildSearchPrompt(query, enrichmentType, context);
    
    try {
      const result = this.makeRequest(searchPrompt, {
        systemPrompt: this.getSearchSystemPrompt(),
        temperature: 0.3, // Lower temperature for more consistent results
        maxSearches: 5 // Allow up to 5 web searches per request
      });
      
      if (result.success) {
        return this.parseEnrichmentResponse(result.content, enrichmentType);
      }
      
      throw new Error('Failed to get enrichment response');
    } catch (error) {
      console.error('Enrichment error:', error);
      throw error;
    }
  }
  
  /**
   * Build search prompt based on enrichment type
   * @private
   */
  buildSearchPrompt(query, enrichmentType, context) {
    const prompts = {
      company_overview: `Use the web_search tool to research the company "${query}" and provide current information:

1. First, search for the company's official website and "about" page
2. Then search for recent news about the company (2024-2025)
3. Look for employee count and revenue information

Provide:
1. Company description (2-3 sentences)
2. Industry and sub-industry
3. Company size (employees) - find current data
4. Estimated revenue range - find recent figures
5. Founded year
6. Headquarters location
7. Key products/services
8. Target market
9. Main competitors (3-5)
10. Recent news or developments (2024-2025)

Format the response as a JSON object with these exact keys:
description, industry, companySize, employeeCount, revenueRange, foundedYear, headquarters, products, targetMarket, competitors, recentNews`,

      contact_finder: `Use the web_search tool to find professional information for "${context.firstName} ${context.lastName}" at "${context.company || query}":

1. Search for their LinkedIn profile
2. Search for them on the company website (team page, about us, leadership)
3. Look for recent mentions in press releases or news

Find:
1. Current job title
2. Department
3. Seniority level
4. Professional email (if publicly available)
5. LinkedIn profile URL
6. Location
7. Years in current role (estimate)
8. Previous companies
9. Key skills or expertise
10. Direct reports (if applicable)

Format the response as a JSON object with these keys:
jobTitle, department, seniorityLevel, email, linkedinUrl, location, yearsInRole, previousCompanies, skills, directReports`,

      technology_stack: `Use the web_search tool to identify the technology stack used by "${query}":

1. Search for "${query} tech stack" or "${query} technologies"
2. Look for their engineering blog or careers page
3. Check job postings for technology requirements
4. Search for "${query} built with" or "${query} uses"

Find:
1. Programming languages
2. Frameworks and libraries
3. Databases
4. Cloud providers
5. Analytics tools
6. Marketing tools
7. Development tools
8. Security tools

Format as JSON with key "technologies" containing categorized lists.`,

      social_media: `Find social media presence for "${query}":
1. LinkedIn company page
2. Twitter/X handle
3. Facebook page
4. Instagram account
5. YouTube channel
6. GitHub organization
7. Other relevant platforms

Format as JSON with platform names as keys and URLs as values.`,

      industry_analysis: `Analyze the industry for "${query}":
1. Industry size and growth rate
2. Key trends
3. Major players
4. Market challenges
5. Opportunities
6. Regulatory environment

Format as a structured JSON object.`
    };
    
    return prompts[enrichmentType] || `Research "${query}" and provide relevant business information in JSON format.`;
  }
  
  /**
   * Parse enrichment response based on type
   * @private
   */
  parseEnrichmentResponse(content, enrichmentType) {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      
      // Validate required fields based on enrichment type
      const requiredFields = this.getRequiredFields(enrichmentType);
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        console.warn('Missing fields in response:', missingFields);
      }
      
      return {
        success: true,
        data: data,
        enrichmentType: enrichmentType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to parse enrichment response:', error);
      
      // Return structured error response
      return {
        success: false,
        error: error.toString(),
        rawContent: content,
        enrichmentType: enrichmentType,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get required fields for enrichment type
   * @private
   */
  getRequiredFields(enrichmentType) {
    const fieldMap = {
      company_overview: ['description', 'industry', 'companySize'],
      contact_finder: ['jobTitle', 'department'],
      technology_stack: ['technologies'],
      social_media: [],
      industry_analysis: ['industrySize', 'trends', 'majorPlayers']
    };
    
    return fieldMap[enrichmentType] || [];
  }
  
  /**
   * Get default system prompt
   * @private
   */
  getDefaultSystemPrompt() {
    return `You are a professional data enrichment assistant with web search capabilities. Your task is to research and provide accurate, up-to-date business information. 

IMPORTANT: You have access to the web_search tool. Use it to find the most current information about companies and contacts. Always search for real-time data before providing answers.

Key guidelines:
1. USE THE WEB SEARCH TOOL to find current information - don't rely on training data
2. Search for the company's official website first
3. Look for recent news, press releases, and announcements
4. Always format responses as valid JSON when requested
5. Use "N/A" or null for information you cannot find
6. Include dates when mentioning time-sensitive information (e.g., "as of January 2025")
7. Verify information from multiple sources when possible
8. For company data, search for: official website, recent funding, employee count, revenue
9. For contact data, search for: LinkedIn profiles, company directories, recent mentions
10. Prioritize official sources and recent information`;
  }
  
  /**
   * Get search-specific system prompt
   * @private
   */
  getSearchSystemPrompt() {
    return `You are a professional data enrichment assistant with web search capabilities. Your task is to research companies and contacts to provide accurate business intelligence. 

IMPORTANT: You have access to the web_search tool. Use it actively to find current information.

Key guidelines:
1. ALWAYS use the web_search tool to find current information
2. Search for the company name and domain to find official sources
3. Format all responses as valid JSON as specified
4. Use "N/A" or null for unavailable information
5. For employee counts, use ranges like "11-50", "51-200", "201-500", etc.
6. For revenue, use ranges like "$1M-$10M", "$10M-$50M", etc.
7. Ensure all URLs are properly formatted
8. Focus on publicly available information only
9. Search for recent data (2024-2025) when possible
10. Include source dates in your findings`;
  }
  
  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @return {boolean} Whether the key is valid
   */
  validateApiKey(apiKey) {
    try {
      const testPayload = {
        model: 'claude-3-haiku-20240307', // Use cheapest model for validation
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      };
      
      const response = UrlFetchApp.fetch(this.baseUrl, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': this.apiVersion
        },
        payload: JSON.stringify(testPayload),
        muteHttpExceptions: true
      });
      
      return response.getResponseCode() === 200;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }
  
  /**
   * Get usage statistics
   * @return {Object} Usage stats
   */
  getUsageStats() {
    // This would typically fetch from the API, but Anthropic doesn't provide this endpoint yet
    // For now, we'll track locally
    const stats = {
      totalRequests: parseInt(PropertiesService.getScriptProperties().getProperty('TOTAL_REQUESTS') || '0'),
      totalTokens: parseInt(PropertiesService.getScriptProperties().getProperty('TOTAL_TOKENS') || '0'),
      lastRequest: PropertiesService.getScriptProperties().getProperty('LAST_REQUEST_TIME'),
      estimatedCost: 0 // Calculate based on token usage and model
    };
    
    // Estimate cost (example rates per million tokens)
    const costPerMillion = {
      'claude-opus-4-20250514': 5,          // Estimated $5 input (actual pricing TBD)
      'claude-sonnet-4-20250514': 2,        // Estimated $2 input (actual pricing TBD)
      'claude-3-5-sonnet-20241022': 3,      // $3 input, $15 output
      'claude-3-5-haiku-20241022': 0.8,     // $0.80 input, $4 output
      'claude-3-opus-20240229': 15,         // $15 input, $75 output
      'claude-3-sonnet-20240229': 3,        // $3 input, $15 output
      'claude-3-haiku-20240307': 0.25       // $0.25 input, $1.25 output
    };
    
    const model = this.defaultModel;
    const rate = costPerMillion[model] || 15;
    stats.estimatedCost = (stats.totalTokens / 1000000) * rate;
    
    return stats;
  }
  
  /**
   * Update usage statistics
   * @private
   */
  updateUsageStats(usage) {
    const props = PropertiesService.getScriptProperties();
    
    const totalRequests = parseInt(props.getProperty('TOTAL_REQUESTS') || '0') + 1;
    const totalTokens = parseInt(props.getProperty('TOTAL_TOKENS') || '0') + 
                       (usage.input_tokens || 0) + (usage.output_tokens || 0);
    
    props.setProperties({
      'TOTAL_REQUESTS': totalRequests.toString(),
      'TOTAL_TOKENS': totalTokens.toString(),
      'LAST_REQUEST_TIME': new Date().toISOString()
    });
  }
}

// Create global instance
const Anthropic = new AnthropicService();

// Initialize function for global access
AnthropicService.initialize = function() {
  if (!global.Anthropic) {
    global.Anthropic = new AnthropicService();
  }
  return global.Anthropic;
};

// Helper functions for backward compatibility
function makeAnthropicRequest(prompt, options) {
  return Anthropic.makeRequest(prompt, options);
}

function enrichWithAnthropic(query, enrichmentType, context) {
  return Anthropic.enrichWithSearch(query, enrichmentType, context);
}

function validateAnthropicApiKey(apiKey) {
  return Anthropic.validateApiKey(apiKey);
}