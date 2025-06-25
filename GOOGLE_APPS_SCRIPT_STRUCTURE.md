# Google Apps Script File Structure

## Important: Google Apps Script Flattens All Files!

In Google Apps Script, there are NO folders. All files appear in a flat list. The folder structure we used locally was just for organization.

## How to Create Files in Google Apps Script

### File List (in the order you should create them):

1. **Code.gs** (Script file - this is the default, just replace its content)
2. **Config.gs** (Script file)
3. **ErrorHandler.gs** (Script file)
4. **SheetHelper.gs** (Script file)
5. **AnthropicService.gs** (Script file)
6. **Company.gs** (Script file)
7. **Contact.gs** (Script file)
8. **DefaultTemplates.gs** (Script file)
9. **BaseEnricher.gs** (Script file)
10. **CompanyEnricher.gs** (Script file)
11. **ContactEnricher.gs** (Script file)
12. **SidebarController.gs** (Script file)
13. **Sidebar.html** (HTML file)
14. **SidebarCSS.html** (HTML file)
15. **SidebarJS.html** (HTML file)
16. **ApiKeyDialog.html** (HTML file)

## Step-by-Step Instructions

### 1. Open Google Apps Script
- In Google Sheets: **Extensions > Apps Script**
- You'll see a default `Code.gs` file

### 2. Create Script Files (.gs)
For each .gs file:
- Click the **+** button next to "Files"
- Select **Script**
- Name it exactly as shown above (without .gs extension)
- Copy the content from the corresponding file

### 3. Create HTML Files (.html)
For each .html file:
- Click the **+** button next to "Files"
- Select **HTML**
- Name it exactly as shown above (without .html extension)
- Copy the content from the corresponding file

## Visual Guide - What You'll See in Apps Script:

```
Files
├── Code.gs
├── Config.gs
├── ErrorHandler.gs
├── SheetHelper.gs
├── AnthropicService.gs
├── Company.gs
├── Contact.gs
├── DefaultTemplates.gs
├── BaseEnricher.gs
├── CompanyEnricher.gs
├── ContactEnricher.gs
├── SidebarController.gs
├── Sidebar.html
├── SidebarCSS.html
├── SidebarJS.html
└── ApiKeyDialog.html
```

## Mapping from Local to Apps Script:

| Local File Path | Apps Script File Name |
|----------------|----------------------|
| `/Code.gs` | `Code.gs` |
| `/Config.gs` | `Config.gs` |
| `/Utils/ErrorHandler.gs` | `ErrorHandler.gs` |
| `/Utils/SheetHelper.gs` | `SheetHelper.gs` |
| `/Services/AnthropicService.gs` | `AnthropicService.gs` |
| `/Models/Company.gs` | `Company.gs` |
| `/Models/Contact.gs` | `Contact.gs` |
| `/Templates/DefaultTemplates.gs` | `DefaultTemplates.gs` |
| `/Enrichers/BaseEnricher.gs` | `BaseEnricher.gs` |
| `/Enrichers/CompanyEnricher.gs` | `CompanyEnricher.gs` |
| `/Enrichers/ContactEnricher.gs` | `ContactEnricher.gs` |
| `/UI/SidebarController.gs` | `SidebarController.gs` |
| `/UI/Sidebar.html` | `Sidebar.html` |
| `/UI/SidebarCSS.html` | `SidebarCSS.html` |
| `/UI/SidebarJS.html` | `SidebarJS.html` |
| `/UI/ApiKeyDialog.html` | `ApiKeyDialog.html` |

## Quick Copy Order:

1. **Start with Code.gs** - Just replace the default content
2. **Add utility files**: ErrorHandler.gs, SheetHelper.gs
3. **Add core files**: Config.gs, AnthropicService.gs
4. **Add models**: Company.gs, Contact.gs
5. **Add business logic**: DefaultTemplates.gs, BaseEnricher.gs, CompanyEnricher.gs, ContactEnricher.gs
6. **Add UI files**: SidebarController.gs, then all HTML files

## After All Files Are Added:

1. Click the **Save** button (💾)
2. Click **Run** > Select `onOpen` function > Run
3. Grant permissions when prompted
4. Go back to your Google Sheet
5. **Refresh the browser page**
6. You should see "Clay Enrichment" in the menu bar

## Common Issues:

- **No menu appears**: Refresh the Google Sheet (F5)
- **Permission errors**: Run the `onOpen` function from Apps Script editor
- **Files not found**: Make sure file names match exactly (case-sensitive)
- **Include errors**: The HTML files must be named exactly as referenced in the code

## Testing Your Setup:

1. After all files are uploaded, in Apps Script:
   ```
   Run > Run function > initializeSheets
   ```

2. Check for errors in:
   ```
   View > Logs
   ```

3. In your Google Sheet:
   ```
   Clay Enrichment > Setup > Initialize Sheets
   ```

That's it! No complex folder structure needed - just 16 files in a flat list.