// Google Sheets Integration for Firebase Data
// This script will automatically sync Firebase data to Google Sheets

class SheetsIntegration {
    constructor() {
        // Replace with your Google Apps Script Web App URL
        this.sheetsWebAppUrl = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
        this.isEnabled = false; // Set to true when you have the Web App URL
    }

    // Format lead data for Google Sheets
    formatLeadForSheets(lead) {
        return {
            timestamp: lead.timestamp || new Date().toISOString(),
            sessionId: lead.sessionId || '',
            status: lead.status || 'in_progress',
            location: lead.location || '',
            timing: lead.timing || '',
            serviceNeeded: lead.serviceNeeded || '',
            phone: lead.contactInfo?.phone || '',
            email: lead.contactInfo?.email || '',
            preferredContact: lead.contactInfo?.preferred || '',
            brandAlignment: lead.brandAlignment ? 'Yes' : 'No',
            conversationLength: lead.conversationHistory?.length || 0,
            lastMessage: lead.conversationHistory?.slice(-1)[0]?.content?.substring(0, 100) || ''
        };
    }

    // Send lead data to Google Sheets
    async sendToSheets(leadData) {
        if (!this.isEnabled || !this.sheetsWebAppUrl || this.sheetsWebAppUrl === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            console.log('Google Sheets integration not configured');
            return false;
        }

        try {
            const formattedData = this.formatLeadForSheets(leadData);
            
            const response = await fetch(this.sheetsWebAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addLead',
                    data: formattedData
                })
            });

            if (response.ok) {
                console.log('Lead successfully sent to Google Sheets');
                return true;
            } else {
                console.error('Failed to send to Google Sheets:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error sending to Google Sheets:', error);
            return false;
        }
    }

    // Batch sync all leads to sheets
    async syncAllLeads(leads) {
        if (!this.isEnabled) return false;

        try {
            const formattedLeads = leads.map(lead => this.formatLeadForSheets(lead));
            
            const response = await fetch(this.sheetsWebAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'syncAllLeads',
                    data: formattedLeads
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error syncing all leads to Google Sheets:', error);
            return false;
        }
    }

    // Enable sheets integration with Web App URL
    enableIntegration(webAppUrl) {
        this.sheetsWebAppUrl = webAppUrl;
        this.isEnabled = true;
        console.log('Google Sheets integration enabled');
    }
}

// Export for use in other files
window.SheetsIntegration = SheetsIntegration;
