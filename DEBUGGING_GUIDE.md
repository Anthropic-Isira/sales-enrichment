# Debugging Guide for Clay-like Enrichment System

## Fixed Issues

### 1. ✅ Fixed Template Include Issue
- Changed from `HtmlService.createTemplateFromFile()` to `HtmlService.createHtmlOutputFromFile()`
- The include function works correctly with `<?!= include('filename'); ?>`

### 2. ✅ Fixed Async/Await in Google Apps Script
- Removed `async` keyword from `validateApiKey` function
- Google Apps Script doesn't support async/await

### 3. ✅ Added Missing Menu Functions
- Added `showTemplateManager()`
- Added `resetDefaultTemplates()`
- Added `checkDuplicates()`
- Added `showExportDialog()`
- Added `showUsageStats()`

### 4. ✅ Added Initialization Checks
- Added `.initialize()` calls before using enrichers
- Added try-catch blocks for error handling
- Added checks for undefined modules

### 5. ✅ Created Missing Files
- Created `ErrorHandler.gs` for error handling
- Created `ApiKeyDialog.html` for API key input

### 6. ✅ Fixed Module Loading Order
- Added checks for `typeof Module !== 'undefined'`
- Graceful fallbacks when modules aren't loaded

## Common Debugging Steps

### 1. File Loading Order in Apps Script
When adding files to Google Apps Script, they should be loaded in this order:
1. Utils files first (ErrorHandler, SheetHelper)
2. Config
3. Services (AnthropicService)
4. Models (Company, Contact)
5. Templates (DefaultTemplates)
6. Base classes (BaseEnricher)
7. Enrichers (CompanyEnricher, ContactEnricher)
8. UI Controllers
9. Main Code.gs last

### 2. Testing Individual Components

#### Test Configuration:
```javascript
function testConfig() {
  console.log('API Key exists:', !!ConfigService.getApiKey());
  console.log('All config:', ConfigService.getAll());
}
```

#### Test API Connection:
```javascript
function testApiConnection() {
  const apiKey = ConfigService.getApiKey();
  if (!apiKey) {
    console.log('No API key configured');
    return;
  }
  
  const isValid = Anthropic.validateApiKey(apiKey);
  console.log('API key valid:', isValid);
}
```

#### Test Sheet Initialization:
```javascript
function testSheetInit() {
  initializeSheets();
  console.log('Sheets initialized');
}
```

### 3. Error Handling Best Practices

All functions that interact with the UI should have try-catch blocks:
```javascript
try {
  // Your code here
} catch (error) {
  SpreadsheetApp.getUi().alert('Error', error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
}
```

### 4. Common Errors and Solutions

#### "Cannot read property 'initialize' of undefined"
- **Cause**: Module not loaded
- **Solution**: Check that all .gs files are properly saved in Apps Script

#### "Cannot call method 'getSheetByName' of null"
- **Cause**: No active spreadsheet
- **Solution**: Ensure script is bound to a spreadsheet

#### "Invalid API key"
- **Cause**: Wrong API key or no key configured
- **Solution**: Get key from https://console.anthropic.com

#### "Rate limit exceeded"
- **Cause**: Too many API calls
- **Solution**: Reduce rate limit in settings or wait

### 5. Performance Optimization

1. **Batch Operations**: Always use batch reads/writes
2. **Cache Results**: Enable caching in settings
3. **Limit Selections**: Process smaller batches
4. **Monitor Usage**: Check History tab regularly

### 6. Testing Workflow

1. **Initialize First**:
   ```
   Clay Enrichment > Setup > Initialize Sheets
   ```

2. **Configure API**:
   ```
   Clay Enrichment > Setup > Configure API Key
   ```

3. **Test with Sample Data**:
   - Add one company: "Google" with domain "google.com"
   - Select the row
   - Clay Enrichment > Enrich Selected Companies

4. **Check Logs**:
   - View > Logs in Apps Script editor
   - Check Enrichment History sheet

### 7. Deployment Checklist

- [ ] All .gs files added to project
- [ ] File order correct (see above)
- [ ] API key configured
- [ ] Sheets initialized
- [ ] Test with sample data
- [ ] Check error logs
- [ ] Verify enrichment results

## Troubleshooting Specific Features

### Sidebar Not Opening
1. Check browser console for errors
2. Try different browser
3. Check if popups are blocked
4. Refresh the spreadsheet

### Enrichment Not Working
1. Check API key is valid
2. Check you have selected rows
3. Check the correct sheet is active
4. Check template is selected
5. Look at Enrichment History for errors

### Templates Not Loading
1. Run "Reset Default Templates"
2. Check Templates sheet exists
3. Manually trigger `DefaultTemplates.populate()`

## Support Resources

1. **Google Apps Script Documentation**: https://developers.google.com/apps-script
2. **Anthropic API Docs**: https://docs.anthropic.com
3. **Error Logs**: Check Error Log sheet (hidden by default)
4. **Console Logs**: View > Logs in Apps Script editor