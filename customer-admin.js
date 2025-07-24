/**
 * Customer Admin Panel for WWWWW.AI
 * Shows only the customer's own chatbot and data
 */

class CustomerAdminPanel {
    constructor() {
        this.customerId = this.getCustomerId();
        this.chatbot = null;
        this.leads = [];
        this.analytics = {};
        
        // API configuration
        this.apiEndpoint = 'https://api.wwwww.ai'; // In production
        
        this.init();
    }
    
    getCustomerId() {
        // Get customer ID from URL params, localStorage, or JWT token
        const urlParams = new URLSearchParams(window.location.search);
        const customerId = urlParams.get('customer') || localStorage.getItem('customerId');
        
        if (!customerId) {
            // Redirect to login if no customer ID
            window.location.href = 'login.html';
            return null;
        }
        
        return customerId;
    }
    
    async init() {
        if (!this.customerId) return;
        
        this.showLoading();
        
        try {
            await this.loadCustomerData();
            await this.loadChatbotData();
            await this.loadLeadsData();
            await this.loadAnalytics();
            
            this.setupEventListeners();
            this.updateUI();
            this.initializeCharts();
            
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            this.showError('Failed to load dashboard data');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadCustomerData() {
        try {
            // In production, this would fetch from API
            // const response = await fetch(`${this.apiEndpoint}/customers/${this.customerId}`);
            // const customerData = await response.json();
            
            // For demo, use mock data
            this.customerData = {
                id: this.customerId,
                name: 'John Smith',
                email: 'john@example.com',
                plan: 'Free Plan',
                createdAt: '2024-01-15',
                chatbotId: 'bot_' + this.customerId
            };
            
        } catch (error) {
            console.error('Error loading customer data:', error);
            throw error;
        }
    }
    
    async loadChatbotData() {
        try {
            // Load chatbot configuration
            const chatbotId = this.customerData.chatbotId;
            
            // In production, fetch from API
            // const response = await fetch(`${this.apiEndpoint}/chatbots/${chatbotId}`);
            // this.chatbot = await response.json();
            
            // For demo, use mock data
            this.chatbot = {
                id: chatbotId,
                name: 'Hampton Blue Pools Assistant',
                websiteUrl: 'https://hamptonbluepools.com',
                companyEthos: 'Family-owned business focused on quality service and customer satisfaction',
                customization: {
                    primaryColor: '#2196F3',
                    chatPosition: 'bottom-right',
                    triggerDelay: 3,
                    animationType: 'slide-up'
                },
                questions: {
                    where: 'Which area of the Hamptons are you in?',
                    when: 'When are you looking to have this service done?',
                    what: 'What service are you interested in?',
                    why: 'Could you tell me more about what you need help with?',
                    who: 'How should we contact you?'
                },
                status: 'active',
                createdAt: '2024-01-15T10:30:00Z',
                lastUpdated: '2024-01-20T14:22:00Z',
                stats: {
                    totalLeads: 45,
                    totalConversations: 128,
                    conversionRate: 35.2
                }
            };
            
        } catch (error) {
            console.error('Error loading chatbot data:', error);
            throw error;
        }
    }
    
    async loadLeadsData() {
        try {
            // In production, fetch from API
            // const response = await fetch(`${this.apiEndpoint}/chatbots/${this.chatbot.id}/leads`);
            // this.leads = await response.json();
            
            // For demo, generate mock leads
            this.leads = this.generateMockLeads();
            
        } catch (error) {
            console.error('Error loading leads data:', error);
            throw error;
        }
    }
    
    generateMockLeads() {
        const leads = [];
        const names = ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Brown', 'David Davis'];
        const services = ['Pool Maintenance', 'Equipment Installation', 'Repairs', 'Seasonal Opening', 'Cleaning'];
        
        for (let i = 0; i < 15; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            
            leads.push({
                id: 'lead_' + Date.now() + '_' + i,
                name: names[Math.floor(Math.random() * names.length)],
                email: `user${i}@example.com`,
                phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                service: services[Math.floor(Math.random() * services.length)],
                contextSummary: `Interested in ${services[Math.floor(Math.random() * services.length)].toLowerCase()}. Completed 3 of 5 topics.`,
                specificRequests: Math.random() > 0.5 ? 'Urgent service needed' : 'Standard inquiry',
                timestamp: date.toISOString(),
                status: ['new', 'contacted', 'qualified'][Math.floor(Math.random() * 3)]
            });
        }
        
        return leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    async loadAnalytics() {
        try {
            // Generate analytics data
            this.analytics = {
                conversations: this.generateConversationData(),
                leads: this.generateLeadsData(),
                topics: this.generateTopicsData(),
                engagement: this.generateEngagementData()
            };
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            throw error;
        }
    }
    
    generateConversationData() {
        const data = [];
        const labels = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 20) + 5);
        }
        
        return { labels, data };
    }
    
    generateLeadsData() {
        const data = [];
        const labels = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 8) + 1);
        }
        
        return { labels, data };
    }
    
    generateTopicsData() {
        return {
            labels: ['WHERE', 'WHEN', 'WHAT', 'WHY', 'WHO'],
            data: [85, 78, 92, 65, 88]
        };
    }
    
    generateEngagementData() {
        return {
            labels: ['Messages per Conversation', 'Avg Session Duration', 'Return Visitors'],
            data: [8.5, 4.2, 23]
        };
    }
    
    setupEventListeners() {
        // Time range filter
        const timeRange = document.getElementById('timeRange');
        if (timeRange) {
            timeRange.addEventListener('change', () => this.updateAnalytics());
        }
        
        // Upgrade button
        const upgradeBtn = document.querySelector('.upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.showUpgradeModal());
        }
        
        // Color picker
        const colorPicker = document.getElementById('primaryColor');
        if (colorPicker) {
            colorPicker.addEventListener('change', () => this.updatePreview());
        }
        
        // Position selector
        const positionSelect = document.getElementById('chatPosition');
        if (positionSelect) {
            positionSelect.addEventListener('change', () => this.updatePreview());
        }
    }
    
    updateUI() {
        // Update user info
        document.getElementById('userName').textContent = this.customerData.name;
        document.getElementById('userPlan').textContent = this.customerData.plan;
        
        // Update quick stats
        document.getElementById('totalLeads').textContent = this.chatbot.stats.totalLeads;
        document.getElementById('todayConversations').textContent = this.getTodayConversations();
        document.getElementById('conversionRate').textContent = this.chatbot.stats.conversionRate + '%';
        
        // Update chatbot details
        document.getElementById('chatbotName').textContent = this.chatbot.name;
        document.getElementById('websiteUrl').textContent = this.chatbot.websiteUrl;
        document.getElementById('previewUrl').textContent = new URL(this.chatbot.websiteUrl).hostname;
        document.getElementById('createdDate').textContent = new Date(this.chatbot.createdAt).toLocaleDateString();
        document.getElementById('lastUpdated').textContent = new Date(this.chatbot.lastUpdated).toLocaleDateString();
        
        // Update chatbot preview
        this.updateChatbotPreview();
        
        // Update leads table
        this.updateLeadsTable();
    }
    
    getTodayConversations() {
        const today = new Date().toDateString();
        return this.leads.filter(lead => 
            new Date(lead.timestamp).toDateString() === today
        ).length;
    }
    
    updateChatbotPreview() {
        const overlay = document.getElementById('chatbotOverlay');
        const trigger = overlay.querySelector('.chat-trigger');
        
        // Update colors
        trigger.style.background = this.chatbot.customization.primaryColor;
        
        // Update position
        overlay.className = 'chatbot-overlay';
        if (this.chatbot.customization.chatPosition === 'bottom-left') {
            overlay.style.left = '20px';
            overlay.style.right = 'auto';
        } else {
            overlay.style.right = '20px';
            overlay.style.left = 'auto';
        }
        
        // Update CSS custom property
        document.documentElement.style.setProperty('--primary-color', this.chatbot.customization.primaryColor);
    }
    
    updateLeadsTable() {
        const tableBody = document.getElementById('leadsTableBody');
        tableBody.innerHTML = '';
        
        // Show only recent leads (last 10)
        const recentLeads = this.leads.slice(0, 10);
        
        if (recentLeads.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
                        No leads yet. Your chatbot will start collecting leads once it's active on your website.
                    </td>
                </tr>
            `;
            return;
        }
        
        recentLeads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(lead.timestamp).toLocaleDateString()}</td>
                <td>${lead.name}</td>
                <td>${lead.email}</td>
                <td>${lead.service}</td>
                <td>${lead.contextSummary}</td>
                <td>
                    <button class="btn-secondary" onclick="customerAdmin.viewLead('${lead.id}')">View</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    initializeCharts() {
        this.initConversationsChart();
        this.initLeadsChart();
        this.initTopicsChart();
        this.initEngagementChart();
    }
    
    initConversationsChart() {
        const ctx = document.getElementById('conversationsChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.analytics.conversations.labels,
                datasets: [{
                    label: 'Conversations',
                    data: this.analytics.conversations.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    initLeadsChart() {
        const ctx = document.getElementById('leadsChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.analytics.leads.labels,
                datasets: [{
                    label: 'Leads',
                    data: this.analytics.leads.data,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    initTopicsChart() {
        const ctx = document.getElementById('topicsChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: this.analytics.topics.labels,
                datasets: [{
                    label: 'Completion Rate %',
                    data: this.analytics.topics.data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    initEngagementChart() {
        const ctx = document.getElementById('engagementChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.analytics.engagement.labels,
                datasets: [{
                    data: this.analytics.engagement.data,
                    backgroundColor: ['#667eea', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    updateAnalytics() {
        const timeRange = document.getElementById('timeRange').value;
        console.log('Updating analytics for time range:', timeRange);
        
        // In production, this would fetch new data based on time range
        // For demo, we'll just reinitialize with the same data
        this.initializeCharts();
    }
    
    // Modal and action functions
    testChatbot() {
        const modal = document.getElementById('testModal');
        const iframe = document.getElementById('testFrame');
        
        // Generate test URL with chatbot configuration
        const testUrl = `test-chatbot.html?id=${this.chatbot.id}`;
        iframe.src = testUrl;
        
        modal.style.display = 'block';
    }
    
    editChatbot() {
        const settingsPanel = document.getElementById('settingsPanel');
        
        // Populate form with current values
        document.getElementById('editChatbotName').value = this.chatbot.name;
        document.getElementById('editWebsiteUrl').value = this.chatbot.websiteUrl;
        document.getElementById('editCompanyEthos').value = this.chatbot.companyEthos;
        document.getElementById('primaryColor').value = this.chatbot.customization.primaryColor;
        document.getElementById('chatPosition').value = this.chatbot.customization.chatPosition;
        document.getElementById('triggerDelay').value = this.chatbot.customization.triggerDelay;
        
        // Populate questions
        document.getElementById('whereQuestion').value = this.chatbot.questions.where;
        document.getElementById('whenQuestion').value = this.chatbot.questions.when;
        document.getElementById('whatQuestion').value = this.chatbot.questions.what;
        document.getElementById('whyQuestion').value = this.chatbot.questions.why;
        document.getElementById('whoQuestion').value = this.chatbot.questions.who;
        
        settingsPanel.classList.add('show');
    }
    
    closeSettings() {
        document.getElementById('settingsPanel').classList.remove('show');
    }
    
    cancelEdit() {
        this.closeSettings();
    }
    
    async saveSettings() {
        try {
            // Get form data
            const updatedChatbot = {
                ...this.chatbot,
                name: document.getElementById('editChatbotName').value,
                websiteUrl: document.getElementById('editWebsiteUrl').value,
                companyEthos: document.getElementById('editCompanyEthos').value,
                customization: {
                    ...this.chatbot.customization,
                    primaryColor: document.getElementById('primaryColor').value,
                    chatPosition: document.getElementById('chatPosition').value,
                    triggerDelay: parseInt(document.getElementById('triggerDelay').value)
                },
                questions: {
                    where: document.getElementById('whereQuestion').value,
                    when: document.getElementById('whenQuestion').value,
                    what: document.getElementById('whatQuestion').value,
                    why: document.getElementById('whyQuestion').value,
                    who: document.getElementById('whoQuestion').value
                },
                lastUpdated: new Date().toISOString()
            };
            
            // In production, save to API
            // await fetch(`${this.apiEndpoint}/chatbots/${this.chatbot.id}`, {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(updatedChatbot)
            // });
            
            // Update local data
            this.chatbot = updatedChatbot;
            
            // Update UI
            this.updateUI();
            this.closeSettings();
            
            this.showNotification('Chatbot settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }
    
    updatePreview() {
        // Update the preview in real-time as user changes settings
        const primaryColor = document.getElementById('primaryColor').value;
        const chatPosition = document.getElementById('chatPosition').value;
        
        const overlay = document.getElementById('chatbotOverlay');
        const trigger = overlay.querySelector('.chat-trigger');
        
        trigger.style.background = primaryColor;
        
        if (chatPosition === 'bottom-left') {
            overlay.style.left = '20px';
            overlay.style.right = 'auto';
        } else {
            overlay.style.right = '20px';
            overlay.style.left = 'auto';
        }
    }
    
    getEmbedCode() {
        const embedCode = this.generateEmbedCode();
        document.getElementById('embedCode').value = embedCode;
        document.getElementById('embedModal').style.display = 'block';
    }
    
    generateEmbedCode() {
        return `<!-- WWWWW.AI Chatbot Embed Code -->
<script>
(function() {
    var chatbotConfig = {
        id: '${this.chatbot.id}',
        name: '${this.chatbot.name}',
        position: '${this.chatbot.customization.chatPosition}',
        animation: '${this.chatbot.customization.animationType}',
        delay: ${this.chatbot.customization.triggerDelay},
        primaryColor: '${this.chatbot.customization.primaryColor}'
    };
    
    var script = document.createElement('script');
    script.src = 'https://cdn.wwwww.ai/embed.js';
    script.setAttribute('data-chatbot-id', '${this.chatbot.id}');
    script.setAttribute('data-config', JSON.stringify(chatbotConfig));
    document.head.appendChild(script);
})();
</script>
<!-- End WWWWW.AI Chatbot -->`;
    }
    
    copyEmbedCode() {
        const embedCode = document.getElementById('embedCode');
        embedCode.select();
        document.execCommand('copy');
        this.showNotification('Embed code copied to clipboard!', 'success');
    }
    
    downloadEmbedCode() {
        const embedCode = this.generateEmbedCode();
        const blob = new Blob([embedCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wwwww-chatbot-embed.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Embed code downloaded!', 'success');
    }
    
    downloadAnalytics() {
        const analyticsData = {
            chatbot: this.chatbot,
            leads: this.leads,
            analytics: this.analytics,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatbot-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Analytics data downloaded!', 'success');
    }
    
    exportLeads() {
        // Convert leads to CSV
        const csvContent = this.convertLeadsToCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Leads exported successfully!', 'success');
    }
    
    convertLeadsToCSV() {
        const headers = ['Date', 'Name', 'Email', 'Phone', 'Service', 'Context Summary', 'Specific Requests', 'Status'];
        const csvRows = [headers.join(',')];
        
        this.leads.forEach(lead => {
            const row = [
                new Date(lead.timestamp).toLocaleDateString(),
                lead.name,
                lead.email,
                lead.phone,
                lead.service,
                `"${lead.contextSummary}"`,
                `"${lead.specificRequests}"`,
                lead.status
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    viewLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) return;
        
        alert(`Lead Details:\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nService: ${lead.service}\nContext: ${lead.contextSummary}\nRequests: ${lead.specificRequests}\nStatus: ${lead.status}`);
    }
    
    showUpgradeModal() {
        document.getElementById('upgradeModal').style.display = 'block';
    }
    
    closeUpgradeModal() {
        document.getElementById('upgradeModal').style.display = 'none';
    }
    
    closeTestModal() {
        document.getElementById('testModal').style.display = 'none';
    }
    
    closeEmbedModal() {
        document.getElementById('embedModal').style.display = 'none';
    }
    
    // Utility functions
    showLoading() {
        document.body.classList.add('loading');
    }
    
    hideLoading() {
        document.body.classList.remove('loading');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Global functions for onclick handlers
function testChatbot() {
    customerAdmin.testChatbot();
}

function editChatbot() {
    customerAdmin.editChatbot();
}

function getEmbedCode() {
    customerAdmin.getEmbedCode();
}

function downloadAnalytics() {
    customerAdmin.downloadAnalytics();
}

function exportLeads() {
    customerAdmin.exportLeads();
}

function updateAnalytics() {
    customerAdmin.updateAnalytics();
}

function closeSettings() {
    customerAdmin.closeSettings();
}

function cancelEdit() {
    customerAdmin.cancelEdit();
}

function saveSettings() {
    customerAdmin.saveSettings();
}

function copyEmbedCode() {
    customerAdmin.copyEmbedCode();
}

function downloadEmbedCode() {
    customerAdmin.downloadEmbedCode();
}

function closeTestModal() {
    customerAdmin.closeTestModal();
}

function closeEmbedModal() {
    customerAdmin.closeEmbedModal();
}

function closeUpgradeModal() {
    customerAdmin.closeUpgradeModal();
}

function logout() {
    localStorage.removeItem('customerId');
    window.location.href = 'login.html';
}

// Initialize the customer admin panel
let customerAdmin;
document.addEventListener('DOMContentLoaded', () => {
    customerAdmin = new CustomerAdminPanel();
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});
