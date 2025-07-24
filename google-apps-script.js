// Google Apps Script Code for Google Sheets Integration
// Deploy this as a Web App in Google Apps Script

// INSTRUCTIONS:
// 1. Go to script.google.com
// 2. Create a new project
// 3. Replace the default code with this code
// 4. Create a new Google Sheet for your leads
// 5. Update the SPREADSHEET_ID below with your sheet's ID
// 6. Deploy as Web App with execute permissions for "Anyone"
// 7. Copy the Web App URL and use it in sheets-integration.js

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // Replace with your Google Sheet ID
const SHEET_NAME = 'Hampton Blue Pools Leads';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'addLead') {
      return addLeadToSheet(data.data);
    } else if (action === 'syncAllLeads') {
      return syncAllLeadsToSheet(data.data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Invalid action'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addLeadToSheet(leadData) {
  try {
    const sheet = getOrCreateSheet();
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Session ID',
        'Status',
        'Location',
        'Timing',
        'Service Needed',
        'Phone',
        'Email',
        'Preferred Contact',
        'Eco-Friendly Interest',
        'Conversation Length',
        'Last Message'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }
    
    // Add the new lead data
    const rowData = [
      leadData.timestamp,
      leadData.sessionId,
      leadData.status,
      leadData.location,
      leadData.timing,
      leadData.serviceNeeded,
      leadData.phone,
      leadData.email,
      leadData.preferredContact,
      leadData.brandAlignment,
      leadData.conversationLength,
      leadData.lastMessage
    ];
    
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, rowData.length);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'Lead added successfully'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error adding lead: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllLeadsToSheet(leadsData) {
  try {
    const sheet = getOrCreateSheet();
    
    // Clear existing data (keep headers)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Session ID',
        'Status',
        'Location',
        'Timing',
        'Service Needed',
        'Phone',
        'Email',
        'Preferred Contact',
        'Eco-Friendly Interest',
        'Conversation Length',
        'Last Message'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }
    
    // Add all leads data
    if (leadsData.length > 0) {
      const rowsData = leadsData.map(lead => [
        lead.timestamp,
        lead.sessionId,
        lead.status,
        lead.location,
        lead.timing,
        lead.serviceNeeded,
        lead.phone,
        lead.email,
        lead.preferredContact,
        lead.brandAlignment,
        lead.conversationLength,
        lead.lastMessage
      ]);
      
      sheet.getRange(2, 1, rowsData.length, rowsData[0].length).setValues(rowsData);
    }
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 12);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: `${leadsData.length} leads synced successfully`}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error syncing leads: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  let sheet;
  try {
    sheet = spreadsheet.getSheetByName(SHEET_NAME);
  } catch (error) {
    // Sheet doesn't exist, create it
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  
  return sheet;
}

// Test function to verify setup
function testSetup() {
  try {
    const sheet = getOrCreateSheet();
    Logger.log('Sheet setup successful: ' + sheet.getName());
    return true;
  } catch (error) {
    Logger.log('Setup error: ' + error.toString());
    return false;
  }
}
