/**
 * WWWWW.AI Universal Chatbot Embed Script
 * This script creates an overlay chatbot on any website
 */

(function() {
    'use strict';
    
    class WWWWWChatbotEmbed {
        constructor(config) {
            this.config = {
                id: config.id || 'default',
                name: config.name || 'AI Assistant',
                position: config.position || 'bottom-right',
                animation: config.animation || 'slide-up',
                delay: config.delay || 3,
                primaryColor: config.primaryColor || '#2196F3',
                apiEndpoint: config.apiEndpoint || 'https://api.wwwww.ai',
                ...config
            };
            
            this.isOpen = false;
            this.isMinimized = false;
            this.chatbot = null;
            this.websiteData = null;
            
            this.init();
        }
        
        async init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }
        
        async setup() {
            // Analyze current website
            await this.analyzeWebsite();
            
            // Create chatbot elements
            this.createChatbotElements();
            
            // Load chatbot configuration
            await this.loadChatbotConfig();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show chatbot after delay
            setTimeout(() => {
                this.showChatbotTrigger();
            }, this.config.delay * 1000);
        }
        
        async analyzeWebsite() {
            this.websiteData = {
                url: window.location.href,
                title: document.title,
                description: this.getMetaDescription(),
                keywords: this.getMetaKeywords(),
                headings: this.extractHeadings(),
                content: this.extractMainContent(),
                contactInfo: this.extractContactInfo(),
                businessInfo: this.extractBusinessInfo()
            };
        }
        
        getMetaDescription() {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') : '';
        }
        
        getMetaKeywords() {
            const meta = document.querySelector('meta[name="keywords"]');
            return meta ? meta.getAttribute('content').split(',').map(k => k.trim()) : [];
        }
        
        extractHeadings() {
            const headings = [];
            document.querySelectorAll('h1, h2, h3').forEach(h => {
                headings.push({
                    level: h.tagName.toLowerCase(),
                    text: h.textContent.trim()
                });
            });
            return headings.slice(0, 10); // Limit to first 10
        }
        
        extractMainContent() {
            // Try to find main content area
            const mainSelectors = ['main', '[role="main"]', '.main-content', '#main', '.content'];
            let mainContent = '';
            
            for (const selector of mainSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    mainContent = element.textContent.trim().substring(0, 1000);
                    break;
                }
            }
            
            if (!mainContent) {
                // Fallback: get text from body, excluding nav, footer, etc.
                const excludeSelectors = ['nav', 'footer', 'header', '.nav', '.footer', '.header'];
                let body = document.body.cloneNode(true);
                
                excludeSelectors.forEach(selector => {
                    body.querySelectorAll(selector).forEach(el => el.remove());
                });
                
                mainContent = body.textContent.trim().substring(0, 1000);
            }
            
            return mainContent;
        }
        
        extractContactInfo() {
            const contactInfo = {
                phone: null,
                email: null,
                address: null
            };
            
            // Extract phone numbers
            const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
            const phoneMatches = document.body.textContent.match(phoneRegex);
            if (phoneMatches) {
                contactInfo.phone = phoneMatches[0];
            }
            
            // Extract email addresses
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emailMatches = document.body.textContent.match(emailRegex);
            if (emailMatches) {
                contactInfo.email = emailMatches[0];
            }
            
            return contactInfo;
        }
        
        extractBusinessInfo() {
            // Look for common business indicators
            const businessKeywords = [
                'services', 'about us', 'company', 'business', 'professional',
                'experience', 'years', 'certified', 'licensed', 'insured'
            ];
            
            const content = document.body.textContent.toLowerCase();
            const foundKeywords = businessKeywords.filter(keyword => 
                content.includes(keyword)
            );
            
            return {
                keywords: foundKeywords,
                hasServices: content.includes('services') || content.includes('service'),
                hasAbout: content.includes('about') || content.includes('company'),
                hasContact: content.includes('contact') || content.includes('phone') || content.includes('email')
            };
        }
        
        createChatbotElements() {
            // Create chatbot container
            this.chatbotContainer = document.createElement('div');
            this.chatbotContainer.id = 'wwwww-chatbot-container';
            this.chatbotContainer.className = `wwwww-chatbot-container ${this.config.position}`;
            
            // Create chatbot trigger button
            this.createTriggerButton();
            
            // Create chatbot window
            this.createChatbotWindow();
            
            // Add styles
            this.addStyles();
            
            // Append to body
            document.body.appendChild(this.chatbotContainer);
        }
        
        createTriggerButton() {
            this.triggerButton = document.createElement('div');
            this.triggerButton.className = 'wwwww-chatbot-trigger';
            this.triggerButton.innerHTML = `
                <div class="trigger-icon">💬</div>
                <div class="trigger-text">Chat with us!</div>
            `;
            
            this.triggerButton.addEventListener('click', () => {
                this.openChatbot();
            });
            
            this.chatbotContainer.appendChild(this.triggerButton);
        }
        
        createChatbotWindow() {
            this.chatbotWindow = document.createElement('div');
            this.chatbotWindow.className = 'wwwww-chatbot-window';
            this.chatbotWindow.innerHTML = `
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <span class="chatbot-avatar">🤖</span>
                        <span class="chatbot-name">${this.config.name}</span>
                    </div>
                    <div class="chatbot-controls">
                        <button class="minimize-btn" title="Minimize">−</button>
                        <button class="close-btn" title="Close">×</button>
                    </div>
                </div>
                <div class="chatbot-messages" id="wwwww-chatbot-messages">
                    <div class="welcome-message">
                        <div class="message bot-message">
                            <div class="message-content">
                                Hi! I'm here to help you learn about this website and answer any questions you might have. How can I assist you today?
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chatbot-input-container">
                    <input type="text" class="chatbot-input" placeholder="Type your message..." id="wwwww-chatbot-input">
                    <button class="send-btn" id="wwwww-chatbot-send">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
            
            this.chatbotContainer.appendChild(this.chatbotWindow);
        }
        
        addStyles() {
            if (document.getElementById('wwwww-chatbot-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'wwwww-chatbot-styles';
            styles.textContent = `
                #wwwww-chatbot-container {
                    position: fixed;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .wwwww-chatbot-container.bottom-right {
                    bottom: 20px;
                    right: 20px;
                }
                
                .wwwww-chatbot-container.bottom-left {
                    bottom: 20px;
                    left: 20px;
                }
                
                .wwwww-chatbot-container.center {
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .wwwww-chatbot-trigger {
                    background: ${this.config.primaryColor};
                    color: white;
                    padding: 15px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                    max-width: 200px;
                }
                
                .wwwww-chatbot-trigger:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                }
                
                .trigger-icon {
                    font-size: 20px;
                }
                
                .trigger-text {
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .wwwww-chatbot-window {
                    display: none;
                    width: 350px;
                    height: 500px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    flex-direction: column;
                    overflow: hidden;
                    margin-bottom: 10px;
                }
                
                .wwwww-chatbot-window.open {
                    display: flex;
                    animation: ${this.getAnimation()} 0.3s ease-out;
                }
                
                .chatbot-header {
                    background: ${this.config.primaryColor};
                    color: white;
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chatbot-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .chatbot-avatar {
                    font-size: 18px;
                }
                
                .chatbot-name {
                    font-weight: 600;
                    font-size: 16px;
                }
                
                .chatbot-controls {
                    display: flex;
                    gap: 5px;
                }
                
                .minimize-btn, .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .minimize-btn:hover, .close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .chatbot-messages {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #f8f9fa;
                }
                
                .message {
                    margin-bottom: 15px;
                }
                
                .bot-message .message-content {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 18px 18px 18px 4px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    max-width: 80%;
                }
                
                .user-message {
                    text-align: right;
                }
                
                .user-message .message-content {
                    background: ${this.config.primaryColor};
                    color: white;
                    padding: 12px 16px;
                    border-radius: 18px 18px 4px 18px;
                    display: inline-block;
                    max-width: 80%;
                }
                
                .chatbot-input-container {
                    padding: 15px 20px;
                    background: white;
                    border-top: 1px solid #e9ecef;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                
                .chatbot-input {
                    flex: 1;
                    padding: 10px 15px;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    outline: none;
                    font-size: 14px;
                }
                
                .chatbot-input:focus {
                    border-color: ${this.config.primaryColor};
                }
                
                .send-btn {
                    background: ${this.config.primaryColor};
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .send-btn:hover {
                    background: ${this.darkenColor(this.config.primaryColor, 10)};
                }
                
                .typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 10px 16px;
                    background: white;
                    border-radius: 18px 18px 18px 4px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    max-width: 80%;
                }
                
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ccc;
                    animation: typing 1.4s infinite ease-in-out;
                }
                
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-10px); }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }
                
                /* Mobile responsive */
                @media (max-width: 768px) {
                    .wwwww-chatbot-window {
                        width: 100vw;
                        height: 100vh;
                        border-radius: 0;
                        margin: 0;
                    }
                    
                    .wwwww-chatbot-container.bottom-right,
                    .wwwww-chatbot-container.bottom-left {
                        bottom: 0;
                        right: 0;
                        left: 0;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        getAnimation() {
            switch(this.config.animation) {
                case 'fade-in': return 'fadeIn';
                case 'bounce': return 'bounce';
                case 'slide-up':
                default: return 'slideUp';
            }
        }
        
        darkenColor(color, percent) {
            const num = parseInt(color.replace("#", ""), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        }
        
        setupEventListeners() {
            // Minimize button
            this.chatbotWindow.querySelector('.minimize-btn').addEventListener('click', () => {
                this.minimizeChatbot();
            });
            
            // Close button
            this.chatbotWindow.querySelector('.close-btn').addEventListener('click', () => {
                this.closeChatbot();
            });
            
            // Send message
            const sendBtn = this.chatbotWindow.querySelector('.send-btn');
            const input = this.chatbotWindow.querySelector('.chatbot-input');
            
            sendBtn.addEventListener('click', () => this.sendMessage());
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        
        async loadChatbotConfig() {
            try {
                const response = await fetch(`${this.config.apiEndpoint}/chatbot/${this.config.id}/config`);
                if (response.ok) {
                    this.chatbotConfig = await response.json();
                } else {
                    // Fallback configuration
                    this.chatbotConfig = this.getDefaultConfig();
                }
            } catch (error) {
                console.warn('Failed to load chatbot config, using default:', error);
                this.chatbotConfig = this.getDefaultConfig();
            }
        }
        
        getDefaultConfig() {
            return {
                topics: [
                    { id: 'WHERE', question: 'Where are you located?' },
                    { id: 'WHEN', question: 'When do you need service?' },
                    { id: 'WHAT', question: 'What service do you need?' },
                    { id: 'WHY', question: 'What brings you here today?' },
                    { id: 'WHO', question: 'How can we contact you?' }
                ],
                businessContext: 'I help visitors learn about this website and connect them with the business.',
                leadCriteria: 'Collect contact information and service needs'
            };
        }
        
        showChatbotTrigger() {
            this.triggerButton.style.display = 'flex';
            this.triggerButton.style.animation = `${this.getAnimation()} 0.5s ease-out`;
        }
        
        openChatbot() {
            this.isOpen = true;
            this.triggerButton.style.display = 'none';
            this.chatbotWindow.classList.add('open');
            
            // Focus input
            setTimeout(() => {
                this.chatbotWindow.querySelector('.chatbot-input').focus();
            }, 300);
            
            // Track opening
            this.trackEvent('chatbot_opened');
        }
        
        closeChatbot() {
            this.isOpen = false;
            this.chatbotWindow.classList.remove('open');
            this.triggerButton.style.display = 'flex';
            
            // Track closing
            this.trackEvent('chatbot_closed');
        }
        
        minimizeChatbot() {
            this.isMinimized = true;
            this.chatbotWindow.style.display = 'none';
            this.triggerButton.style.display = 'flex';
            this.triggerButton.querySelector('.trigger-text').textContent = 'Continue chat';
        }
        
        async sendMessage() {
            const input = this.chatbotWindow.querySelector('.chatbot-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message to chat
            this.addMessage(message, 'user');
            input.value = '';
            
            // Show typing indicator
            this.showTypingIndicator();
            
            try {
                // Send to AI backend
                const response = await this.sendToAI(message);
                
                // Hide typing indicator
                this.hideTypingIndicator();
                
                // Add bot response
                this.addMessage(response.message, 'bot');
                
                // Handle any actions
                if (response.actions) {
                    this.handleActions(response.actions);
                }
                
            } catch (error) {
                this.hideTypingIndicator();
                this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                console.error('Chat error:', error);
            }
            
            // Track message
            this.trackEvent('message_sent', { message });
        }
        
        async sendToAI(message) {
            // Prepare context
            const context = {
                message,
                websiteData: this.websiteData,
                chatbotConfig: this.chatbotConfig,
                conversationHistory: this.getConversationHistory()
            };
            
            const response = await fetch(`${this.config.apiEndpoint}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatbotId: this.config.id,
                    context
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }
            
            return await response.json();
        }
        
        getConversationHistory() {
            const messages = this.chatbotWindow.querySelectorAll('.message');
            const history = [];
            
            messages.forEach(msg => {
                const isUser = msg.classList.contains('user-message');
                const content = msg.querySelector('.message-content').textContent;
                history.push({
                    sender: isUser ? 'user' : 'bot',
                    message: content,
                    timestamp: new Date().toISOString()
                });
            });
            
            return history.slice(-10); // Last 10 messages
        }
        
        addMessage(content, sender) {
            const messagesContainer = this.chatbotWindow.querySelector('.chatbot-messages');
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            messagesContainer.appendChild(messageDiv);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        showTypingIndicator() {
            const messagesContainer = this.chatbotWindow.querySelector('.chatbot-messages');
            
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot-message typing-indicator-message';
            typingDiv.innerHTML = `
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        hideTypingIndicator() {
            const typingIndicator = this.chatbotWindow.querySelector('.typing-indicator-message');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
        
        handleActions(actions) {
            actions.forEach(action => {
                switch(action.type) {
                    case 'save_lead':
                        this.saveLead(action.data);
                        break;
                    case 'redirect':
                        window.location.href = action.url;
                        break;
                    case 'open_link':
                        window.open(action.url, '_blank');
                        break;
                }
            });
        }
        
        async saveLead(leadData) {
            try {
                await fetch(`${this.config.apiEndpoint}/leads`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chatbotId: this.config.id,
                        websiteUrl: window.location.href,
                        leadData,
                        conversationHistory: this.getConversationHistory()
                    })
                });
                
                this.trackEvent('lead_saved', leadData);
            } catch (error) {
                console.error('Failed to save lead:', error);
            }
        }
        
        trackEvent(eventName, data = {}) {
            // Send analytics data
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, {
                    chatbot_id: this.config.id,
                    website_url: window.location.href,
                    ...data
                });
            }
            
            // Send to WWWWW.AI analytics
            fetch(`${this.config.apiEndpoint}/analytics/event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatbotId: this.config.id,
                    event: eventName,
                    data,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            }).catch(error => {
                console.warn('Failed to track event:', error);
            });
        }
    }
    
    // Initialize chatbot from script attributes
    function initializeChatbot() {
        const script = document.querySelector('script[data-chatbot-id]');
        if (!script) {
            console.error('WWWWW.AI: No chatbot configuration found');
            return;
        }
        
        const chatbotId = script.getAttribute('data-chatbot-id');
        const configData = script.getAttribute('data-config');
        
        let config = { id: chatbotId };
        
        if (configData) {
            try {
                config = { ...config, ...JSON.parse(configData) };
            } catch (error) {
                console.warn('WWWWW.AI: Invalid config data, using defaults');
            }
        }
        
        // Create chatbot instance
        window.WWWWWChatbot = new WWWWWChatbotEmbed(config);
    }
    
    // Auto-initialize when script loads
    initializeChatbot();
    
})();
