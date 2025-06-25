# Clay-like Enrichment System for Google Sheets

A powerful data enrichment system that brings Clay.com-like functionality to Google Sheets using Google Apps Script and the Anthropic Claude API.

## Features

### 🚀 Core Functionality
- **AI-Powered Enrichment**: Uses Anthropic's Claude API for intelligent data enrichment
- **Dual Entity Support**: Separate sheets for Companies and Contacts with smart linking
- **10+ Pre-built Templates**: Including company overview, contact finder, tech stack discovery, and more
- **Smart Caching**: Reduces API costs by caching responses
- **Batch Processing**: Process multiple records efficiently with rate limiting
- **Beautiful Sidebar UI**: Professional interface with tabs for Setup, Enrichment, Templates, and History

### 📊 Data Management
- **Duplicate Detection**: Automatically identifies and highlights duplicate records
- **Auto-linking**: Contacts automatically link to their companies
- **Multiple Export Formats**: JSON, CSV, Salesforce, HubSpot, vCard
- **Confidence Scoring**: Each enrichment includes a confidence score
- **Completeness Tracking**: Visual indicators for data quality

### 🎯 Enrichment Templates

#### Company Templates
- **Company Overview**: Comprehensive company information
- **Technology Stack Finder**: Identifies tools and technologies
- **Social Media Finder**: Discovers all social profiles
- **Industry Analysis**: Market trends and competitive landscape
- **Competitor Analysis**: Detailed competitive positioning
- **Funding History**: Investment rounds and investors
- **News Monitoring**: Recent updates and announcements

#### Contact Templates
- **Contact Information Finder**: Professional details and contact info
- **Email Pattern Finder**: Determines likely email addresses
- **Social Profile Finder**: LinkedIn, Twitter, and other profiles

### 🛠️ Technical Features
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Comprehensive error tracking and recovery
- **Usage Analytics**: Track API usage, costs, and success rates
- **Progress Tracking**: Real-time progress updates during enrichment
- **Template Management**: Create and manage custom templates

## Installation

1. **Open Google Sheets**
   - Create a new spreadsheet or open an existing one

2. **Open Apps Script**
   - Go to Extensions > Apps Script
   - Delete any default code

3. **Create Project Structure**
   - Create folders: UI, Services, Models, Enrichers, Templates, Utils
   - Copy all .gs files to their respective locations

4. **Initialize the System**
   - Save the project
   - Refresh the spreadsheet
   - Click "Clay Enrichment" > "Setup" > "Initialize Sheets"

5. **Configure API Key**
   - Click "Clay Enrichment" > "Open Enrichment Panel"
   - Enter your Anthropic API key in the Setup tab
   - Save configuration

## Usage

### Basic Enrichment Workflow

1. **Add Data**
   - Enter company names and domains in the Companies sheet
   - Enter contact names and companies in the Contacts sheet

2. **Select Records**
   - Select the rows you want to enrich
   - Or use "Enrich All New" to process all pending records

3. **Choose Template**
   - Open the sidebar (Clay Enrichment > Open Enrichment Panel)
   - Go to the Enrich tab
   - Select an enrichment template

4. **Run Enrichment**
   - Click "Enrich Selected Companies/Contacts"
   - Monitor progress in real-time
   - View results immediately in the spreadsheet

### Advanced Features

#### Custom Templates
```javascript
// Example custom template structure
{
  name: "Custom Research",
  type: "Company",
  promptTemplate: "Research {{companyName}} and find...",
  requiredFields: ["companyName"],
  outputFields: ["customData"]
}
```

#### Bulk Operations
- Process up to 50 records at once
- Automatic rate limiting prevents API throttling
- Progress tracking shows real-time updates

#### Data Export
- Export enriched data in multiple formats
- Salesforce and HubSpot compatible exports
- vCard export for contacts

## Project Structure

```
/clay-enrichment/
├── Code.gs                    # Main entry point and menu setup
├── Config.gs                  # Configuration management
├── UI/
│   ├── Sidebar.html          # Main sidebar interface
│   ├── SidebarCSS.html       # Styles
│   ├── SidebarJS.html        # Client-side JavaScript
│   └── SidebarController.gs  # Server-side handlers
├── Services/
│   └── AnthropicService.gs   # Claude API integration
├── Models/
│   ├── Company.gs            # Company data model
│   └── Contact.gs            # Contact data model
├── Enrichers/
│   ├── BaseEnricher.gs       # Base enrichment class
│   ├── CompanyEnricher.gs    # Company enrichment logic
│   └── ContactEnricher.gs    # Contact enrichment logic
├── Templates/
│   └── DefaultTemplates.gs   # Pre-built templates
└── Utils/
    └── SheetHelper.gs        # Sheet manipulation utilities
```

## Sheet Structure

### Companies Sheet (21 columns)
- Company ID, Name, Domain
- Industry, Size, Employee Count
- Revenue, Founded Year, HQ Location
- Description, Technologies, Products
- Target Market, Competitors, News
- Social Media, Status, Enrichment Data

### Contacts Sheet (22 columns)
- Contact ID, First/Last Name
- Company Name/Domain
- Job Title, Department, Seniority
- Email, Phone, LinkedIn, Twitter
- Location, Experience, Skills
- Status, Confidence Score, Source

## API Usage & Costs

### Claude 4 Models (Latest - May 2025)
- **Claude 4 Opus**: Estimated $5/million input tokens, $25/million output tokens (most capable)
- **Claude 4 Sonnet**: Estimated $2/million input tokens, $10/million output tokens (best balance)

### Claude 3.5 Models
- **Claude 3.5 Sonnet**: $3/million input tokens, $15/million output tokens
- **Claude 3.5 Haiku**: $0.80/million input tokens, $4/million output tokens

### Claude 3 Models
- **Claude 3 Opus**: $15/million input tokens, $75/million output tokens
- **Claude 3 Sonnet**: $3/million input tokens, $15/million output tokens
- **Claude 3 Haiku**: $0.25/million input tokens, $1.25/million output tokens (most economical)

Average enrichment costs:
- Company Overview: ~$0.008-0.02 (with Claude 4 Sonnet)
- Contact Finder: ~$0.004-0.01 (with Claude 4 Sonnet)
- Simple lookups: ~$0.002-0.006 (with Claude 4 Sonnet)

## Best Practices

1. **Start Small**: Test with a few records before bulk enrichment
2. **Use Templates**: Leverage pre-built templates for consistency
3. **Enable Caching**: Reduces costs for duplicate lookups
4. **Monitor Usage**: Check the History tab regularly
5. **Batch Process**: More efficient than one-by-one enrichment

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Open sidebar > Setup tab > Enter API key > Save

2. **"Rate limit exceeded"**
   - Reduce rate limit in settings
   - Wait a few minutes before retrying

3. **"No data returned"**
   - Check if company/contact name is spelled correctly
   - Try adding more context (domain, location)

4. **Slow performance**
   - Reduce batch size
   - Check rate limit settings
   - Enable caching

## Future Enhancements

- Webhook integration for real-time updates
- Advanced queue management system
- Email verification service integration
- More export format options
- Custom field mapping UI
- Scheduled enrichment runs

## License

This project is provided as-is for use with Google Sheets and requires a valid Anthropic API key.

## Support

For issues or questions:
1. Check the built-in Help (sidebar > Help button)
2. Review error messages in the History tab
3. Verify API key and connection status

---

Built with ❤️ using Google Apps Script and Anthropic Claude API