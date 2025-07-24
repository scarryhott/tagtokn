class WWWWWAdminPlatform {
    constructor() {
        this.currentUser = null;
        this.chatbots = [];
        this.leads = [];
        this.analytics = {};
        
        // Initialize Firebase (would be configured per user)
        this.firebaseDB = null;
        
        // Gemini API configuration
        this.geminiApiKey = localStorage.getItem('geminiApiKey') || '';
        
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.loadUserData();
        this.setupEventListeners();
        this.initializeDashboard();
    }
    
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific data
            switch(sectionId) {
                case 'dashboard':
                    this.loadDashboard();
                    break;
                case 'chatbots':
                    this.loadChatbots();
                    break;
                case 'leads':
                    this.loadLeads();
                    break;
                case 'analytics':
                    this.loadAnalytics();
                    break;
                case 'settings':
                    this.loadSettings();
                    break;
            }
        }
    }
    
    setupEventListeners() {
        // Create chatbot form
        const createForm = document.getElementById('createChatbotForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createChatbot();
            });
        }
        
        // Website analysis
        const analyzeBtn = document.getElementById('analyzeWebsite');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeWebsite());
        }
        
        // JSON generation
        const generateJsonBtn = document.getElementById('generateJson');
        if (generateJsonBtn) {
            generateJsonBtn.addEventListener('click', () => this.generateBusinessJson());
        }
        
        // Filters
        this.setupFilters();
    }
    
    setupFilters() {
        const chatbotFilter = document.getElementById('chatbotFilter');
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        [chatbotFilter, statusFilter, dateFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.filterLeads());
            }
        });
    }
    
    // Dashboard functionality
    initializeDashboard() {
        this.updateDashboardStats();
        this.initializeCharts();
    }
    
    loadDashboard() {
        this.updateDashboardStats();
        this.updateCharts();
    }
    
    updateDashboardStats() {
        // Update stat cards
        document.getElementById('totalChatbots').textContent = this.chatbots.length;
        document.getElementById('totalLeads').textContent = this.leads.length;
        document.getElementById('totalConversations').textContent = this.calculateTotalConversations();
        document.getElementById('conversionRate').textContent = this.calculateConversionRate() + '%';
    }
    
    calculateTotalConversations() {
        return this.leads.reduce((total, lead) => {
            return total + (lead.conversationFlow ? lead.conversationFlow.length : 0);
        }, 0);
    }
    
    calculateConversionRate() {
        if (this.leads.length === 0) return 0;
        const convertedLeads = this.leads.filter(lead => lead.status === 'converted').length;
        return Math.round((convertedLeads / this.leads.length) * 100);
    }
    
    initializeCharts() {
        // Destroy existing charts if they exist
        if (this.leadsChart) {
            this.leadsChart.destroy();
        }
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }
        
        // Leads over time chart
        const leadsCtx = document.getElementById('leadsChart');
        if (leadsCtx) {
            this.leadsChart = new Chart(leadsCtx, {
                type: 'line',
                data: {
                    labels: this.getLastSevenDays(),
                    datasets: [{
                        label: 'Leads',
                        data: this.getLeadsPerDay(),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        // Performance chart
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            this.performanceChart = new Chart(performanceCtx, {
                type: 'doughnut',
                data: {
                    labels: this.chatbots.map(bot => bot.name),
                    datasets: [{
                        data: this.chatbots.map(bot => bot.leads || 0),
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#f093fb',
                            '#f5576c',
                            '#4facfe'
                        ]
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
    }
    
    updateCharts() {
        // Update existing charts with new data
        this.initializeCharts();
    }
    
    getLastSevenDays() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }
    
    getLeadsPerDay() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));
            
            const leadsCount = this.leads.filter(lead => {
                const leadDate = new Date(lead.timestamp);
                return leadDate >= dayStart && leadDate <= dayEnd;
            }).length;
            
            days.push(leadsCount);
        }
        return days;
    }
    
    // Chatbot management
    loadChatbots() {
        const grid = document.getElementById('chatbotsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (this.chatbots.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No chatbots yet</h3>
                    <p>Create your first chatbot to get started</p>
                    <button class="btn-primary" onclick="adminPlatform.showSection('create')">Create Chatbot</button>
                </div>
            `;
            return;
        }
        
        this.chatbots.forEach(chatbot => {
            const card = this.createChatbotCard(chatbot);
            grid.appendChild(card);
        });
    }
    
    createChatbotCard(chatbot) {
        const card = document.createElement('div');
        card.className = 'chatbot-card';
        card.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-avatar">🤖</div>
                <div class="chatbot-info">
                    <h3>${chatbot.name}</h3>
                    <p>${chatbot.websiteUrl}</p>
                </div>
            </div>
            <div class="chatbot-stats">
                <div class="stat-item">
                    <div class="number">${chatbot.leads || 0}</div>
                    <div class="label">Leads</div>
                </div>
                <div class="stat-item">
                    <div class="number">${chatbot.conversations || 0}</div>
                    <div class="label">Conversations</div>
                </div>
                <div class="stat-item">
                    <div class="number">${chatbot.conversionRate || 0}%</div>
                    <div class="label">Conversion</div>
                </div>
            </div>
            <div class="chatbot-actions">
                <button class="btn-secondary" onclick="adminPlatform.editChatbot('${chatbot.id}')">Edit</button>
                <button class="btn-secondary" onclick="adminPlatform.previewChatbot('${chatbot.id}')">Preview</button>
                <button class="btn-secondary" onclick="adminPlatform.getEmbedCode('${chatbot.id}')">Embed</button>
                <button class="btn-danger" onclick="adminPlatform.deleteChatbot('${chatbot.id}')">Delete</button>
            </div>
        `;
        return card;
    }
    
    async createChatbot() {
        const formData = this.getFormData();
        
        if (!this.validateChatbotForm(formData)) {
            return;
        }
        
        const chatbot = {
            id: this.generateId(),
            ...formData,
            createdAt: new Date().toISOString(),
            leads: 0,
            conversations: 0,
            conversionRate: 0,
            status: 'active'
        };
        
        try {
            // Save to database
            await this.saveChatbot(chatbot);
            
            // Add to local array
            this.chatbots.push(chatbot);
            
            // Generate chatbot files
            await this.generateChatbotFiles(chatbot);
            
            this.showNotification('Chatbot created successfully!', 'success');
            this.showSection('chatbots');
            
        } catch (error) {
            console.error('Error creating chatbot:', error);
            this.showNotification('Error creating chatbot', 'error');
        }
    }
    
    getFormData() {
        return {
            name: document.getElementById('chatbotName').value,
            websiteUrl: document.getElementById('websiteUrl').value,
            companyEthos: document.getElementById('companyEthos').value,
            businessInfo: document.getElementById('businessInfo').value,
            questions: {
                where: document.getElementById('whereQuestion').value,
                when: document.getElementById('whenQuestion').value,
                what: document.getElementById('whatQuestion').value,
                why: document.getElementById('whyQuestion').value,
                who: document.getElementById('whoQuestion').value
            },
            leadCriteria: document.getElementById('leadCriteria').value,
            customization: {
                primaryColor: document.getElementById('primaryColor').value,
                chatPosition: document.getElementById('chatPosition').value,
                animationType: document.getElementById('animationType').value,
                triggerDelay: parseInt(document.getElementById('triggerDelay').value)
            }
        };
    }
    
    validateChatbotForm(data) {
        if (!data.name.trim()) {
            this.showNotification('Please enter a chatbot name', 'warning');
            return false;
        }
        
        if (!data.websiteUrl.trim()) {
            this.showNotification('Please enter a website URL', 'warning');
            return false;
        }
        
        try {
            new URL(data.websiteUrl);
        } catch {
            this.showNotification('Please enter a valid website URL', 'warning');
            return false;
        }
        
        return true;
    }
    
    async generateChatbotFiles(chatbot) {
        // Generate custom HTML file
        const htmlContent = this.generateChatbotHTML(chatbot);
        
        // Generate custom JS file
        const jsContent = this.generateChatbotJS(chatbot);
        
        // Generate custom CSS file
        const cssContent = this.generateChatbotCSS(chatbot);
        
        // In a real implementation, these would be saved to the server
        console.log('Generated files for chatbot:', chatbot.id);
    }
    
    generateChatbotHTML(chatbot) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatbot.name}</title>
    <link rel="stylesheet" href="chatbot-${chatbot.id}.css">
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>${chatbot.name}</h1>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-container">
            <input type="text" id="messageInput" placeholder="Type your message...">
            <button id="sendButton">Send</button>
        </div>
    </div>
    <script src="chatbot-${chatbot.id}.js"></script>
</body>
</html>`;
    }
    
    generateChatbotJS(chatbot) {
        // This would generate a customized version of the chatbot.js file
        // with the specific configuration for this chatbot
        return `// Generated chatbot for ${chatbot.name}
class CustomChatbot {
    constructor() {
        this.config = ${JSON.stringify(chatbot, null, 2)};
        this.init();
    }
    // ... rest of chatbot functionality
}
new CustomChatbot();`;
    }
    
    generateChatbotCSS(chatbot) {
        const { primaryColor, chatPosition, animationType } = chatbot.customization;
        
        return `/* Custom styles for ${chatbot.name} */
:root {
    --primary-color: ${primaryColor};
    --chat-position: ${chatPosition};
    --animation-type: ${animationType};
}

.chat-container {
    /* Custom positioning and styling based on configuration */
}`;
    }
    
    // Website analysis using AI
    async analyzeWebsite() {
        const websiteUrl = document.getElementById('websiteUrl').value;
        
        if (!websiteUrl) {
            this.showNotification('Please enter a website URL first', 'warning');
            return;
        }
        
        try {
            this.showNotification('Analyzing website...', 'info');
            
            // In a real implementation, this would scrape the website
            // and use AI to analyze the content
            const analysis = await this.performWebsiteAnalysis(websiteUrl);
            
            // Auto-fill form fields based on analysis
            this.populateFormFromAnalysis(analysis);
            
            this.showNotification('Website analysis complete!', 'success');
            
        } catch (error) {
            console.error('Website analysis error:', error);
            this.showNotification('Error analyzing website', 'error');
        }
    }
    
    async performWebsiteAnalysis(url) {
        // Mock analysis - in real implementation, this would:
        // 1. Scrape the website content
        // 2. Use Gemini AI to analyze the business
        // 3. Extract relevant information
        
        return {
            companyEthos: "Family-owned business focused on quality service and customer satisfaction",
            businessInfo: {
                services: ["Service 1", "Service 2", "Service 3"],
                areas: ["Location 1", "Location 2"],
                specialties: ["Specialty 1", "Specialty 2"]
            },
            questions: {
                where: "Which area do you need service in?",
                when: "When do you need this service?",
                what: "What type of service are you looking for?",
                why: "What specific issue can we help you with?",
                who: "How would you like us to contact you?"
            }
        };
    }
    
    populateFormFromAnalysis(analysis) {
        document.getElementById('companyEthos').value = analysis.companyEthos;
        document.getElementById('businessInfo').value = JSON.stringify(analysis.businessInfo, null, 2);
        
        document.getElementById('whereQuestion').value = analysis.questions.where;
        document.getElementById('whenQuestion').value = analysis.questions.when;
        document.getElementById('whatQuestion').value = analysis.questions.what;
        document.getElementById('whyQuestion').value = analysis.questions.why;
        document.getElementById('whoQuestion').value = analysis.questions.who;
    }
    
    async generateBusinessJson() {
        const websiteUrl = document.getElementById('websiteUrl').value;
        const companyEthos = document.getElementById('companyEthos').value;
        
        if (!websiteUrl || !companyEthos) {
            this.showNotification('Please fill in website URL and company ethos first', 'warning');
            return;
        }
        
        try {
            this.showNotification('Generating business information...', 'info');
            
            const businessInfo = await this.generateBusinessInfoWithAI(websiteUrl, companyEthos);
            document.getElementById('businessInfo').value = JSON.stringify(businessInfo, null, 2);
            
            this.showNotification('Business information generated!', 'success');
            
        } catch (error) {
            console.error('Error generating business info:', error);
            this.showNotification('Error generating business information', 'error');
        }
    }
    
    async generateBusinessInfoWithAI(websiteUrl, ethos) {
        // Mock generation - in real implementation, this would use Gemini AI
        return {
            services: [
                "Primary Service",
                "Secondary Service",
                "Additional Service"
            ],
            areas: [
                "Primary Location",
                "Secondary Location"
            ],
            specialties: [
                "Key Specialty 1",
                "Key Specialty 2"
            ],
            pricing: "Competitive pricing with personalized estimates",
            experience: "Years of experience in the industry",
            certifications: "Industry certifications and qualifications",
            values: ethos
        };
    }
    
    // Leads management
    loadLeads() {
        this.populateLeadsFilters();
        this.displayLeads();
    }
    
    populateLeadsFilters() {
        const chatbotFilter = document.getElementById('chatbotFilter');
        if (chatbotFilter) {
            chatbotFilter.innerHTML = '<option value="">All Chatbots</option>';
            this.chatbots.forEach(chatbot => {
                const option = document.createElement('option');
                option.value = chatbot.id;
                option.textContent = chatbot.name;
                chatbotFilter.appendChild(option);
            });
        }
    }
    
    displayLeads(filteredLeads = null) {
        const tableBody = document.getElementById('leadsTableBody');
        if (!tableBody) return;
        
        const leadsToShow = filteredLeads || this.leads;
        tableBody.innerHTML = '';
        
        if (leadsToShow.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        No leads found
                    </td>
                </tr>
            `;
            return;
        }
        
        leadsToShow.forEach(lead => {
            const row = this.createLeadRow(lead);
            tableBody.appendChild(row);
        });
    }
    
    createLeadRow(lead) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(lead.timestamp).toLocaleDateString()}</td>
            <td>${lead.name || 'Anonymous'}</td>
            <td>${lead.email || lead.phone || 'No contact'}</td>
            <td>${this.getChatbotName(lead.chatbotId)}</td>
            <td>${lead.contextSummary || 'No summary'}</td>
            <td>${lead.specificRequests || 'None'}</td>
            <td><span class="status-badge status-${lead.status || 'new'}">${lead.status || 'new'}</span></td>
            <td>
                <button class="btn-secondary" onclick="adminPlatform.viewLead('${lead.id}')">View</button>
                <button class="btn-secondary" onclick="adminPlatform.updateLeadStatus('${lead.id}')">Update</button>
            </td>
        `;
        return row;
    }
    
    getChatbotName(chatbotId) {
        const chatbot = this.chatbots.find(bot => bot.id === chatbotId);
        return chatbot ? chatbot.name : 'Unknown';
    }
    
    filterLeads() {
        const chatbotFilter = document.getElementById('chatbotFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        let filteredLeads = [...this.leads];
        
        if (chatbotFilter) {
            filteredLeads = filteredLeads.filter(lead => lead.chatbotId === chatbotFilter);
        }
        
        if (statusFilter) {
            filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
        }
        
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filteredLeads = filteredLeads.filter(lead => {
                const leadDate = new Date(lead.timestamp);
                return leadDate.toDateString() === filterDate.toDateString();
            });
        }
        
        this.displayLeads(filteredLeads);
    }
    
    // Analytics
    loadAnalytics() {
        this.initializeAnalyticsCharts();
    }
    
    initializeAnalyticsCharts() {
        // Conversation metrics
        const conversationCtx = document.getElementById('conversationMetrics');
        if (conversationCtx) {
            new Chart(conversationCtx, {
                type: 'bar',
                data: {
                    labels: ['Started', 'Completed', 'Abandoned'],
                    datasets: [{
                        label: 'Conversations',
                        data: [100, 75, 25],
                        backgroundColor: ['#667eea', '#27ae60', '#e74c3c']
                    }]
                },
                options: { responsive: true }
            });
        }
        
        // Lead quality score
        const leadQualityCtx = document.getElementById('leadQualityChart');
        if (leadQualityCtx) {
            new Chart(leadQualityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['High Quality', 'Medium Quality', 'Low Quality'],
                    datasets: [{
                        data: [40, 35, 25],
                        backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
                    }]
                },
                options: { responsive: true }
            });
        }
        
        // Topic completion rate
        const topicCompletionCtx = document.getElementById('topicCompletionChart');
        if (topicCompletionCtx) {
            new Chart(topicCompletionCtx, {
                type: 'radar',
                data: {
                    labels: ['WHERE', 'WHEN', 'WHAT', 'WHY', 'WHO'],
                    datasets: [{
                        label: 'Completion Rate',
                        data: [85, 78, 92, 65, 88],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.2)'
                    }]
                },
                options: { responsive: true }
            });
        }
        
        // Response time analysis
        const responseTimeCtx = document.getElementById('responseTimeChart');
        if (responseTimeCtx) {
            new Chart(responseTimeCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Avg Response Time (s)',
                        data: [2.1, 1.8, 2.3, 1.9, 2.0, 2.5, 2.2],
                        borderColor: '#764ba2',
                        tension: 0.4
                    }]
                },
                options: { responsive: true }
            });
        }
    }
    
    // Settings
    loadSettings() {
        // Load current settings
        document.getElementById('geminiApiKey').value = this.geminiApiKey;
        // Load other settings...
    }
    
    // Utility functions
    generateId() {
        return 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async saveChatbot(chatbot) {
        // Save to database - implementation depends on backend
        localStorage.setItem(`chatbot_${chatbot.id}`, JSON.stringify(chatbot));
    }
    
    async loadUserData() {
        // Load user's chatbots and leads from database
        // For demo, load from localStorage
        this.loadFromLocalStorage();
    }
    
    loadFromLocalStorage() {
        // Load chatbots
        const chatbotKeys = Object.keys(localStorage).filter(key => key.startsWith('chatbot_'));
        this.chatbots = chatbotKeys.map(key => JSON.parse(localStorage.getItem(key)));
        
        // Load leads
        const leadKeys = Object.keys(localStorage).filter(key => key.startsWith('lead_'));
        this.leads = leadKeys.map(key => JSON.parse(localStorage.getItem(key)));
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
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Modal functions
    previewChatbot(chatbotId) {
        const chatbot = this.chatbots.find(bot => bot.id === chatbotId);
        if (!chatbot) return;
        
        // Create dynamic preview page with website + chatbot overlay
        const previewContent = this.generatePreviewPage(chatbot);
        
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewFrame');
        
        // Create blob URL for the preview content
        const blob = new Blob([previewContent], { type: 'text/html' });
        const previewUrl = URL.createObjectURL(blob);
        
        iframe.src = previewUrl;
        modal.style.display = 'block';
        
        // Clean up blob URL when modal is closed
        iframe.onload = () => {
            setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
        };
    }
    
    getEmbedCode(chatbotId) {
        const chatbot = this.chatbots.find(bot => bot.id === chatbotId);
        if (!chatbot) return;
        
        const embedCode = this.generateEmbedCode(chatbot);
        
        document.getElementById('embedCode').value = embedCode;
        document.getElementById('embedModal').style.display = 'block';
    }
    
    generateEmbedCode(chatbot) {
        return `<!-- WWWWW.AI Chatbot Embed Code -->
<script>
(function() {
    var chatbotConfig = {
        id: '${chatbot.id}',
        name: '${chatbot.name}',
        position: '${chatbot.customization.chatPosition}',
        animation: '${chatbot.customization.animationType}',
        delay: ${chatbot.customization.triggerDelay},
        primaryColor: '${chatbot.customization.primaryColor}'
    };
    
    var script = document.createElement('script');
    script.src = 'https://cdn.wwwww.ai/embed.js';
    script.setAttribute('data-chatbot-id', '${chatbot.id}');
    script.setAttribute('data-config', JSON.stringify(chatbotConfig));
    document.head.appendChild(script);
})();
</script>
<!-- End WWWWW.AI Chatbot -->`;
    }
    
    generatePreviewPage(chatbot) {
        const websiteUrl = chatbot.websiteUrl || chatbot.website || chatbot.url || 'https://example.com';
        
        // Debug: Log the chatbot data to see what fields are available
        console.log('Preview chatbot data:', chatbot);
        console.log('Using website URL:', websiteUrl);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatbot.name} - Live Preview with Chatbot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow: hidden; }
        
        .preview-container {
            position: relative;
            width: 100vw;
            height: 100vh;
        }
        
        .website-frame {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .preview-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 10px 20px;
            text-align: center;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .preview-overlay .close-btn {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
        }
        
        .chat-notice {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: #667eea;
            color: white;
            padding: 12px 16px;
            border-radius: 25px;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            animation: pulse 2s infinite;
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6); }
            100% { transform: scale(1); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
        }
        
        .error-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            padding: 2rem;
            background: #f8f9fa;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            max-width: 500px;
        }
        
        .error-message h3 {
            color: #dc3545;
            margin-bottom: 1rem;
        }
        
        .error-message p {
            color: #6c757d;
            margin-bottom: 1rem;
        }
        
        .error-message .website-url {
            background: #e9ecef;
            padding: 0.5rem;
            border-radius: 5px;
            font-family: monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-overlay">
            🔥 Live Preview: ${chatbot.name} with WWWWW.AI Chatbot Overlay
        </div>
        
        <iframe 
            class="website-frame" 
            src="${websiteUrl}"
            title="${chatbot.name} Website"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            onerror="this.style.display='none'; document.querySelector('.error-message').style.display='block';"
        ></iframe>
        
        <div class="error-message" style="display: none;">
            <h3>⚠️ Website Preview Unavailable</h3>
            <p>The website URL may not allow embedding or may be unreachable:</p>
            <div class="website-url">${websiteUrl}</div>
            <p><strong>The chatbot will still work perfectly when embedded on the actual website!</strong></p>
        </div>
        
        <div class="chat-notice">
            💬 Try the AI Assistant!
        </div>
    </div>
    
    <!-- WWWWW.AI Chatbot HTML Structure -->
    <div id="chatContainer" class="chat-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000;">
        <div id="chatWidget" class="chat-widget" style="display: none;">
            <div id="chatHeader" class="chat-header">
                <span id="businessName">${chatbot.name}</span>
                <button id="minimizeButton" class="minimize-btn">−</button>
                <button id="closeButton" class="close-btn">×</button>
            </div>
            <div id="chatMessages" class="chat-messages"></div>
            <div id="chatInput" class="chat-input">
                <input type="text" id="messageInput" placeholder="Type your message..." />
                <button id="sendButton">Send</button>
            </div>
        </div>
        <button id="chatToggle" class="chat-toggle">💬</button>
    </div>
    
    <!-- WWWWW.AI Chatbot Styles -->
    <link rel="stylesheet" href="https://wwwww-ai-platform.netlify.app/styles.css">
    
    <!-- WWWWW.AI Chatbot Integration -->
    <script src="https://wwwww-ai-platform.netlify.app/chatbot.js"></script>
    <script>
        // Initialize chatbot with preview configuration
        const chatbotConfig = {
            businessName: '${chatbot.name}',
            location: '${chatbot.location || 'Your City, State'}',
            services: '${chatbot.services || 'Professional Services'}',
            experience: '${chatbot.experience || 'Experienced professionals'}',
            specialties: '${chatbot.specialties || 'Quality service, competitive pricing'}',
            serviceAreas: '${chatbot.serviceAreas || 'Local area and surrounding regions'}',
            industry: '${chatbot.industry || 'service'}',
            phone: '${chatbot.phone || '(555) 123-4567'}',
            email: '${chatbot.email || 'info@business.com'}',
            website: '${chatbot.website || 'https://yourbusiness.com'}',
            
            // Custom Questions
            whereQuestion: '${chatbot.whereQuestion || 'What area are you located in?'}',
            whenQuestion: '${chatbot.whenQuestion || 'When do you need service?'}',
            whatQuestion: '${chatbot.whatQuestion || 'What service do you need?'}',
            whyQuestion: '${chatbot.whyQuestion || 'Tell me more about your specific needs?'}',
            whoQuestion: '${chatbot.whoQuestion || 'How should we contact you?'}',
            
            // API Keys
            geminiApiKey: 'AIzaSyDB4_JVNACxlh0fu3a3UWm9XO5kIxvwDfg',
            firebaseConfig: {
                apiKey: "AIzaSyBqzjB4_JVNACxlh0fu3a3UWm9XO5kIxvwDfg",
                authDomain: "wwwww-ai-demo.firebaseapp.com",
                projectId: "wwwww-ai-demo",
                storageBucket: "wwwww-ai-demo.appspot.com",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abcdef123456"
            }
        };
        
        // Handle iframe load errors
        const iframe = document.querySelector('.website-frame');
        const errorMessage = document.querySelector('.error-message');
        
        iframe.addEventListener('error', function() {
            iframe.style.display = 'none';
            errorMessage.style.display = 'block';
        });
        
        // Initialize chatbot when page loads
        document.addEventListener('DOMContentLoaded', function() {
            const chatbot = new WWWWWAIChatbot(chatbotConfig);
            
            // Show chatbot after a short delay to simulate real website behavior
            setTimeout(() => {
                // Chatbot is already initialized and will show automatically
            }, 1000);
        });
        
        // Handle cross-origin iframe issues
        window.addEventListener('message', function(event) {
            // Handle messages from iframe if needed
        });
    </script>
</body>
</html>`;
    }
    
    copyEmbedCode() {
        const embedCode = document.getElementById('embedCode');
        embedCode.select();
        document.execCommand('copy');
        this.showNotification('Embed code copied to clipboard!', 'success');
    }
    
    closePreview() {
        document.getElementById('previewModal').style.display = 'none';
    }
    
    closeEmbedModal() {
        document.getElementById('embedModal').style.display = 'none';
    }
    
    // Email agent functionality
    async startEmailAgent() {
        // This would implement the email agent that finds businesses
        // and sends them information about WWWWW.AI
        console.log('Starting email agent...');
    }
}

// Global functions for onclick handlers
function showSection(sectionId) {
    adminPlatform.showSection(sectionId);
}

function previewChatbot() {
    // Preview current form data
    const formData = adminPlatform.getFormData();
    console.log('Previewing chatbot with data:', formData);
}

function closePreview() {
    adminPlatform.closePreview();
}

function closeEmbedModal() {
    adminPlatform.closeEmbedModal();
}

function copyEmbedCode() {
    adminPlatform.copyEmbedCode();
}

// Initialize the admin platform
let adminPlatform;
document.addEventListener('DOMContentLoaded', () => {
    adminPlatform = new WWWWWAdminPlatform();
});
