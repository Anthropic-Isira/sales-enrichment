/**
 * Base Enricher Class
 * Abstract base class for all enrichment operations
 */

class BaseEnricher {
  constructor() {
    this.anthropicService = Anthropic;
    this.cache = CacheService.getScriptCache();
    this.config = ConfigService;
    this.rateLimiter = null; // Will be initialized when RateLimiter is created
    this.historySheet = null;
  }
  
  /**
   * Initialize the enricher
   */
  initialize() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.historySheet = ss.getSheetByName('Enrichment History');
    
    if (!this.historySheet) {
      throw new Error('Enrichment History sheet not found. Please initialize sheets first.');
    }
  }
  
  /**
   * Main enrichment method - must be implemented by subclasses
   * @param {Object} entity - Entity to enrich (Company or Contact)
   * @param {Object} template - Enrichment template
   * @return {Object} Enrichment result
   */
  enrich(entity, template) {
    throw new Error('enrich() method must be implemented by subclass');
  }
  
  /**
   * Batch enrichment with progress tracking
   * @param {Array} entities - Array of entities to enrich
   * @param {Object} template - Enrichment template
   * @param {Function} progressCallback - Progress callback function
   * @return {Array} Enrichment results
   */
  enrichBatch(entities, template, progressCallback) {
    const results = [];
    const batchSize = this.config.get('BATCH_SIZE', 50);
    const rateLimit = this.config.get('RATE_LIMIT', 10);
    const delayMs = Math.ceil(60000 / rateLimit); // Delay between requests
    
    entities.forEach((entity, index) => {
      try {
        // Check if should skip
        if (entity.enrichmentStatus === 'Complete' && !entity.needsReEnrichment()) {
          results.push({
            entity: entity,
            success: true,
            skipped: true,
            message: 'Already enriched'
          });
        } else {
          // Process enrichment
          const result = this.enrichSingle(entity, template);
          results.push(result);
          
          // Rate limiting
          if ((index + 1) % batchSize === 0 || index === entities.length - 1) {
            Utilities.sleep(delayMs);
          }
        }
        
        // Progress callback
        if (progressCallback) {
          progressCallback({
            current: index + 1,
            total: entities.length,
            percentage: Math.round(((index + 1) / entities.length) * 100)
          });
        }
      } catch (error) {
        console.error(`Error enriching entity ${entity.id}:`, error);
        results.push({
          entity: entity,
          success: false,
          error: error.toString()
        });
      }
    });
    
    return results;
  }
  
  /**
   * Enrich a single entity
   * @param {Object} entity - Entity to enrich
   * @param {Object} template - Enrichment template
   * @return {Object} Enrichment result
   */
  enrichSingle(entity, template) {
    const startTime = new Date();
    const jobId = Utilities.getUuid();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(entity, template);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          entity: entity,
          success: true,
          data: cached,
          fromCache: true,
          jobId: jobId
        };
      }
      
      // Mark as processing
      entity.enrichmentStatus = 'Processing';
      this.updateEntityStatus(entity);
      
      // Build prompt from template
      const prompt = this.buildPrompt(entity, template);
      
      // Make API request
      const apiResult = this.anthropicService.makeRequest(prompt, template.modelSettings);
      
      if (!apiResult.success) {
        throw new Error('API request failed');
      }
      
      // Parse response
      const enrichmentData = this.parseApiResponse(apiResult.content, template);
      
      // Update entity with enrichment data
      entity.updateWithEnrichment(enrichmentData);
      entity.enrichmentTemplate = template.name;
      entity.apiCallsUsed = (entity.apiCallsUsed || 0) + 1;
      
      // Save to cache
      this.saveToCache(cacheKey, enrichmentData);
      
      // Log to history
      this.logEnrichment({
        jobId: jobId,
        entityType: entity.constructor.name,
        entityId: entity.id,
        templateUsed: template.name,
        status: 'Complete',
        apiCallsMade: 1,
        tokensUsed: (apiResult.usage?.input_tokens || 0) + (apiResult.usage?.output_tokens || 0),
        cost: this.calculateCost(apiResult.usage, template.modelSettings.model),
        processingTime: new Date() - startTime,
        errorMessage: null
      });
      
      // Update entity in sheet
      this.updateEntityInSheet(entity);
      
      return {
        entity: entity,
        success: true,
        data: enrichmentData,
        fromCache: false,
        jobId: jobId,
        usage: apiResult.usage
      };
      
    } catch (error) {
      // Handle failure
      entity.enrichmentStatus = 'Failed';
      this.updateEntityStatus(entity);
      
      // Log failure
      this.logEnrichment({
        jobId: jobId,
        entityType: entity.constructor.name,
        entityId: entity.id,
        templateUsed: template.name,
        status: 'Failed',
        apiCallsMade: 0,
        tokensUsed: 0,
        cost: 0,
        processingTime: new Date() - startTime,
        errorMessage: error.toString()
      });
      
      throw error;
    }
  }
  
  /**
   * Build prompt from template and entity data
   * @param {Object} entity - Entity object
   * @param {Object} template - Template object
   * @return {string} Processed prompt
   */
  buildPrompt(entity, template) {
    // Get entity data as flat object
    const data = this.getEntityData(entity);
    
    // Process template
    return DefaultTemplates.processTemplate(template.promptTemplate, data);
  }
  
  /**
   * Get entity data for template processing - override in subclasses
   * @param {Object} entity - Entity object
   * @return {Object} Flat data object
   */
  getEntityData(entity) {
    return entity.toJSON();
  }
  
  /**
   * Parse API response based on template
   * @param {string} content - API response content
   * @param {Object} template - Template object
   * @return {Object} Parsed data
   */
  parseApiResponse(content, template) {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in API response');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      
      // Validate against expected output fields
      const missingFields = template.outputFields.filter(field => 
        !(field in data) || data[field] === undefined
      );
      
      if (missingFields.length > 0) {
        console.warn('Missing expected fields:', missingFields);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to parse API response:', error);
      throw new Error('Invalid API response format');
    }
  }
  
  /**
   * Get cache key for entity and template
   * @param {Object} entity - Entity object
   * @param {Object} template - Template object
   * @return {string} Cache key
   */
  getCacheKey(entity, template) {
    const entityKey = this.getEntityCacheKey(entity);
    return `enrichment_${template.id}_${entityKey}`;
  }
  
  /**
   * Get entity-specific cache key - override in subclasses
   * @param {Object} entity - Entity object
   * @return {string} Entity cache key
   */
  getEntityCacheKey(entity) {
    return entity.id;
  }
  
  /**
   * Get from cache
   * @param {string} key - Cache key
   * @return {Object|null} Cached data
   */
  getFromCache(key) {
    if (!this.config.get('ENABLE_CACHE', true)) return null;
    
    try {
      const cached = this.cache.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    return null;
  }
  
  /**
   * Save to cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  saveToCache(key, data) {
    if (!this.config.get('ENABLE_CACHE', true)) return;
    
    try {
      const ttl = this.config.get('CACHE_DURATION', 86400); // 24 hours default
      this.cache.put(key, JSON.stringify(data), ttl);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }
  
  /**
   * Calculate cost based on token usage
   * @param {Object} usage - Token usage object
   * @param {string} model - Model name
   * @return {number} Estimated cost
   */
  calculateCost(usage, model) {
    if (!usage) return 0;
    
    // Cost per 1M tokens (Claude 4 pricing is estimated)
    const costRates = {
      'claude-opus-4-20250514': { input: 5, output: 25 },      // Estimated pricing
      'claude-sonnet-4-20250514': { input: 2, output: 10 },    // Estimated pricing
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
    };
    
    const rates = costRates[model] || costRates['claude-3-opus-20240229'];
    const inputCost = (usage.input_tokens || 0) * rates.input / 1000000;
    const outputCost = (usage.output_tokens || 0) * rates.output / 1000000;
    
    return inputCost + outputCost;
  }
  
  /**
   * Log enrichment to history sheet
   * @param {Object} logData - Log data
   */
  logEnrichment(logData) {
    if (!this.historySheet) return;
    
    try {
      this.historySheet.appendRow([
        logData.jobId,
        new Date(),
        logData.entityType,
        logData.entityId,
        logData.templateUsed,
        logData.status,
        logData.apiCallsMade,
        logData.tokensUsed,
        logData.cost.toFixed(4),
        logData.processingTime,
        logData.errorMessage || '',
        0 // Retry count
      ]);
    } catch (error) {
      console.error('Failed to log enrichment:', error);
    }
  }
  
  /**
   * Update entity status - must be implemented by subclasses
   * @param {Object} entity - Entity object
   */
  updateEntityStatus(entity) {
    throw new Error('updateEntityStatus() must be implemented by subclass');
  }
  
  /**
   * Update entity in sheet - must be implemented by subclasses
   * @param {Object} entity - Entity object
   */
  updateEntityInSheet(entity) {
    throw new Error('updateEntityInSheet() must be implemented by subclass');
  }
  
  /**
   * Get enrichment statistics
   * @return {Object} Statistics
   */
  getStatistics() {
    if (!this.historySheet) return null;
    
    const data = SheetHelper.getSheetDataAsObjects(this.historySheet);
    
    const stats = {
      totalJobs: data.length,
      successfulJobs: data.filter(row => row.Status === 'Complete').length,
      failedJobs: data.filter(row => row.Status === 'Failed').length,
      totalTokensUsed: data.reduce((sum, row) => sum + (parseInt(row['Tokens Used']) || 0), 0),
      totalCost: data.reduce((sum, row) => sum + (parseFloat(row.Cost) || 0), 0),
      averageProcessingTime: 0,
      templateUsage: {}
    };
    
    // Calculate average processing time
    const times = data.map(row => parseInt(row['Processing Time']) || 0).filter(t => t > 0);
    if (times.length > 0) {
      stats.averageProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    // Count template usage
    data.forEach(row => {
      const template = row['Template Used'];
      if (template) {
        stats.templateUsage[template] = (stats.templateUsage[template] || 0) + 1;
      }
    });
    
    return stats;
  }
}