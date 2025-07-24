class HamptonBluePoolsChatbot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('messageInput'); // Fixed: HTML has messageInput, not userInput
        this.sendButton = document.getElementById('sendButton');
        this.quickReplies = [];
        this.conversation = [];
        this.leadData = {
            name: '',
            email: '',
            phone: '',
            location: '',
            service: '',
            message: '',
            specificRequests: '',
            contextSummary: '',
            conversationFlow: [],
            topicResponses: {},
            timestamp: new Date().toISOString()
        };
        this.currentTopicIndex = 0;
        this.topics = [
            { 
                id: 'WHERE', 
                title: 'Service Areas',
                question: 'Which area of the Hamptons are you in?', 
                info: 'We serve all Hamptons areas including Southampton, East Hampton, Westhampton, and Suffolk County.',
                done: false,
                responses: []
            },
            { 
                id: 'WHEN', 
                title: 'Timing & Scheduling',
                question: 'When are you looking to have this service done?', 
                info: 'We offer flexible scheduling with same-day attention to customer calls. Services available year-round.',
                done: false,
                responses: []
            },
            { 
                id: 'WHAT', 
                title: 'Services & Solutions',
                question: 'What service are you interested in?', 
                info: 'We offer pool maintenance, equipment installation, repairs, eco-friendly systems, and seasonal services.',
                done: false,
                responses: []
            },
            { 
                id: 'WHY', 
                title: 'Specific Needs',
                question: 'Could you tell me more about what you need help with?', 
                info: 'We specialize in eco-friendly solutions, salt water systems, and energy-efficient equipment.',
                done: false,
                responses: []
            },
            { 
                id: 'WHO', 
                title: 'Contact Preferences',
                question: 'How should we contact you?', 
                info: 'We can reach out via phone, email, or text - whatever works best for you.',
                done: false,
                responses: []
            }
        ];
        this.conversationComplete = false;
        
        // Gemini AI Configuration - Enhanced with flexible follow-up rules
        this.GEMINI_API_KEY = 'AIzaSyDB4_JVNACxlh0fu3a3UWm9XO5kIxvwDfg';
        this.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.GEMINI_API_KEY}`;
        
        // Enhanced conversation settings
        this.conversationSettings = {
            allowMultipleFollowUps: true,
            flexibleTopicTransition: true,
            contextualResponses: true,
            naturalConversationFlow: true
        };
        
        // Initialize Firebase
        this.firebaseDB = window.firebaseDB || null;
        this.initializeFirebase();
        this.initializeIntegrations();
        
        // Conversation state tracking
        this.conversationState = {
            currentFlow: 'initial',
            location: null,
            timing: null,
            contactInfo: {
                phone: null,
                email: null,
                preferred: null
            },
            serviceNeeded: null,
            brandAlignment: false,
            conversationHistory: [],
            sessionId: this.generateSessionId(),
        };
        this.conversationComplete = false;
        
        // Topic flow state management
        this.waitingForQuestionResponse = false;
        this.waitingForTopicInfo = false;
        this.answeringTopicQuestion = false;
        this.conversationStarted = false;
        
        // Add input rate limiting
        this.isProcessing = false;
        this.lastMessageTime = 0;
        this.messageDebounceMs = 1000;
        
        // Business context for Gemini
        this.businessContext = `
        You are a chatbot for Hampton Blue Pools, a family-owned pool and spa service company in the Hamptons, NY with 25+ years experience.
        
        WEBSITE DATABASE: https://hamptonbluepools.com/
        You can reference information from their website including services, pricing, coverage areas, and company details.
        
        BUSINESS INFO:
        - Services: Pool/spa maintenance, seasonal openings/closings, equipment installation, repairs, eco-friendly systems
        - Values: Same-day attention, competitive pricing, eco-friendly approach, local expertise
        - Coverage: Hamptons, Southampton, East Hampton, Westhampton, Suffolk County
        - Certifications: ENERGY STAR certified installers
        - Specialties: Salt water systems, copper ion systems, non-chlorine solutions
        - Experience: 25+ years, family-owned by lifelong Hampton locals
        
        CONVERSATION STRUCTURE - Follow this structured approach for the 5 W's:
        1. WHERE - Location (which Hamptons area)
        2. WHEN - Timing (service timeline)  
        3. WHAT - Service needed
        4. WHY - Specific queries/needs
        5. WHO - Contact preferences
        6. BRAND ALIGNMENT - Eco-friendly values
        
        ENHANCED CONVERSATION FLOW (FLEXIBLE RULES):
        
        GENERAL APPROACH:
        - Allow natural conversation flow with multiple follow-up questions
        - Don't force rigid topic progression - let conversation develop organically
        - Users can ask multiple questions about any topic before moving on
        - Provide comprehensive answers and encourage deeper exploration
        - Transition between topics naturally based on user interest
        
        TOPIC HANDLING:
        - Present topic information when relevant to user's questions
        - Allow users to revisit previous topics if they have more questions
        - Don't rush to "next topic" - let users fully explore their interests
        - Capture information naturally throughout the conversation
        - Use context from previous topics to inform current responses
        
        FOLLOW-UP QUESTION RULES:
        - ALWAYS encourage follow-up questions: "What else would you like to know about [topic]?"
        - Allow multiple rounds of questions per topic
        - Provide detailed, helpful answers that invite more questions
        - Don't limit to single question per topic
        - Let users drive the conversation pace and depth
        
        TOPIC EXAMPLES (FLEXIBLE APPROACH):
        - WHERE: "We serve all Hamptons areas... What would you like to know about our coverage?"
        - WHEN: "We offer flexible scheduling... Any questions about timing or availability?"
        - WHAT: "Here are our main services... What interests you most or what questions do you have?"
        - WHY: "We specialize in eco-friendly solutions... What specific challenges are you facing?"
        - WHO: "We can connect in several ways... What works best for you or do you have questions about our process?"
        
        RESPONSE STYLE:
        - Keep responses SHORT and CONCISE (2-3 sentences max)
        - Be direct and helpful
        - Don't over-explain
        - Focus on key information only
        - Use bullet points sparingly
        
        RULES:
        - Always explain why you're here initially: "I'm an interactive way to get informed about our website and let us know about your queries"
        - GIVE BEFORE TAKING: Always provide helpful information BEFORE asking for user details
        - Ask "Do you have any questions about [topic]?" before requesting their specific info
        - Only ask for information related to the current topic being discussed
        - Complete one topic fully before moving to the next
        - Don't ask multiple questions in one response
        - Only ask for ONE piece of information at a time
        - Guide toward the 5 pillars naturally through conversation
        - Be friendly, helpful, and professional
        - Keep responses under 50 words maximum
        `;
        
        // Website content cache for faster responses
        this.websiteContent = {
            services: [
                'Pool & Spa General Maintenance',
                'Pool & Spa Weekly Maintenance', 
                'Seasonal Openings and Closings',
                'Pool & Spa Acid Washing',
                'Repairs and Restorations',
                'Equipment Installation',
                'Salt Water Pool Systems',
                'Copper Ion Systems',
                'Gunite Installation',
                'Pressure Testing/Leak Detection',
                'Winter Pool Service/Pump Down'
            ],
            areas: ['Hamptons', 'Southampton', 'East Hampton', 'Westhampton', 'Suffolk County'],
            specialties: ['Eco-friendly systems', 'ENERGY STAR certified', 'Same-day service', 'Local expertise'],
            pricing: 'Competitive prices with personalized estimates',
            experience: '25+ years combined experience',
            certifications: 'ENERGY STAR Certified Pool Pump and Electric Heater Installers',
            values: 'Same-day attention to customer calls, personal service, eco-friendly approach'
        };
        
        // Database configuration
        this.database = this.initializeDatabase();
        
        this.init();
    }
    
    // Generate unique session ID
    generateSessionId() {
        return 'hbp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Initialize local database (localStorage for demo, can be replaced with real DB)
    initializeDatabase() {
        const dbName = 'hamptonBluePoolsLeads';
        if (!localStorage.getItem(dbName)) {
            localStorage.setItem(dbName, JSON.stringify([]));
        }
        return dbName;
    }
    
    // Initialize Firebase connection
    initializeFirebase() {
        try {
            if (window.FirebaseDB) {
                this.firebaseDB = window.FirebaseDB;
                console.log('Firebase connection established');
            } else {
                console.log('Firebase not available, will use fallback storage');
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.firebaseDB = null;
        }
    }
    
    // Initialize Firebase and Sheets integrations
    initializeIntegrations() {
        try {
            // Initialize Firebase if available
            if (typeof FirebaseDB !== 'undefined') {
                this.firebaseDB = new FirebaseDB();
                console.log('Firebase integration initialized');
            } else {
                console.log('Firebase not available, using localStorage fallback');
            }
            
            // Initialize Sheets integration if available
            if (typeof SheetsIntegration !== 'undefined') {
                this.sheetsIntegration = new SheetsIntegration();
                console.log('Google Sheets integration initialized');
            } else {
                console.log('Google Sheets integration not available');
            }
        } catch (error) {
            console.error('Error initializing integrations:', error);
        }
    }

    // Test Firebase connection and data saving
    async testFirebaseConnection() {
        try {
            const testLead = {
                name: 'Test User',
                email: 'test@example.com',
                phone: '1234567890',
                message: 'Testing Firebase connection',
                service: 'Pool Maintenance',
                location: 'Southampton',
                timestamp: new Date().toISOString(),
                test: true  // Mark as test data
            };
            
            console.log('Attempting to save test lead to Firebase...');
            const firebaseDB = new FirebaseDB();
            const docId = await firebaseDB.addLead(testLead);
            
            console.log('✅ Test lead saved successfully with ID:', docId);
            alert('✅ Firebase connection successful! Check console for details.');
            return true;
        } catch (error) {
            console.error('❌ Firebase test failed:', error);
            alert('❌ Firebase connection failed. Check console for details.');
            return false;
        }
    }
    
    // Enhanced database save with Firebase and Sheets sync
    async saveToDatabase() {
        const leadData = {
            sessionId: this.conversationState.sessionId,
            timestamp: this.conversationState.timestamp,
            status: this.hasEnoughInfo() ? 'complete' : 'in_progress',
            location: this.conversationState.location,
            timing: this.conversationState.timing,
            serviceNeeded: this.conversationState.serviceNeeded,
            contactInfo: this.conversationState.contactInfo,
            brandAlignment: this.conversationState.brandAlignment,
            conversationHistory: this.conversationState.conversationHistory
        };

        // Try Firebase first
        if (this.firebaseDB) {
            try {
                await this.firebaseDB.addLead(leadData);
                console.log('Lead saved to Firebase');
                
                // Also sync to Google Sheets if available
                if (this.sheetsIntegration) {
                    await this.sheetsIntegration.sendToSheets(leadData);
                }
            } catch (error) {
                console.error('Firebase save failed, falling back to localStorage:', error);
                this.saveToLocalStorageFallback(leadData);
            }
        } else {
            // Fallback to localStorage
            this.saveToLocalStorageFallback(leadData);
        }
    }

    // Fallback localStorage save method
    saveToLocalStorageFallback(leadData) {
        try {
            const existingLeads = JSON.parse(localStorage.getItem('hamptonBluePoolsLeads') || '[]');
            
            // Update existing lead or add new one
            const existingIndex = existingLeads.findIndex(lead => lead.sessionId === leadData.sessionId);
            if (existingIndex >= 0) {
                existingLeads[existingIndex] = leadData;
            } else {
                existingLeads.push(leadData);
            }
            
            localStorage.setItem('hamptonBluePoolsLeads', JSON.stringify(existingLeads));
            console.log('Lead saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Load existing session data
    async loadFromDatabase() {
        if (this.firebaseDB) {
            try {
                const leads = await this.firebaseDB.getLeads();
                const existingLead = leads.find(lead => lead.sessionId === this.conversationState.sessionId);
                if (existingLead) {
                    this.conversationState = { ...this.conversationState, ...existingLead };
                    return existingLead;
                }
            } catch (error) {
                console.error('Error loading from Firebase:', error);
            }
        }
        
        // Fallback to localStorage
        return this.loadFromLocalStorage();
    }

    // Load from localStorage fallback
    loadFromLocalStorage() {
        try {
            const allLeads = JSON.parse(localStorage.getItem('hamptonBluePoolsLeads') || '[]');
            return allLeads.find(lead => lead.sessionId === this.conversationState.sessionId);
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    // Save conversation data to database
    saveConversationData() {
        const leadData = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            location: this.conversationState.location,
            timing: this.conversationState.timing,
            contactInfo: this.conversationState.contactInfo,
            serviceNeeded: this.conversationState.serviceNeeded,
            specificQuery: this.conversationState.specificQuery,
            brandAlignment: this.conversationState.brandAlignment,
            conversationHistory: this.conversationState.conversationHistory,
            currentFlow: this.conversationState.currentFlow,
            status: this.hasEnoughInfo() ? 'complete' : 'in_progress'
        };
        
        // Get existing data
        const existingData = JSON.parse(localStorage.getItem(this.database) || '[]');
        
        // Update or add new record
        const existingIndex = existingData.findIndex(item => item.sessionId === this.sessionId);
        if (existingIndex >= 0) {
            existingData[existingIndex] = leadData;
        } else {
            existingData.push(leadData);
        }
        
        // Save back to localStorage
        localStorage.setItem(this.database, JSON.stringify(existingData));
        
        // Log to console for debugging
        console.log('💾 Saved to database:', leadData);
    }
    
    // Get all leads from database
    getAllLeads() {
        return JSON.parse(localStorage.getItem(this.database) || '[]');
    }
    
    // Get current session data
    getCurrentSession() {
        const allLeads = this.getAllLeads();
        return allLeads.find(lead => lead.sessionId === this.sessionId);
    }
    
    // Website search simulation with more detailed responses
    searchWebsiteContent(query) {
        const lowerQuery = query.toLowerCase();
        let results = [];
        
        if (lowerQuery.includes('service') || lowerQuery.includes('maintenance')) {
            results = [
                'Weekly Pool Maintenance: Regular cleaning, chemical balancing, equipment checks',
                'General Maintenance: As-needed service calls with same-day attention',
                'Seasonal Services: Professional openings and closings'
            ];
        } else if (lowerQuery.includes('seasonal') || lowerQuery.includes('opening') || lowerQuery.includes('closing')) {
            results = [
                'Spring Openings: Complete startup, equipment check, water balancing',
                'Fall Closings: Proper winterization, equipment protection',
                'Winter Services: Pump downs and maintenance as needed'
            ];
        } else if (lowerQuery.includes('eco') || lowerQuery.includes('green') || lowerQuery.includes('salt') || lowerQuery.includes('copper')) {
            results = [
                'Salt Water Systems: Gentler on skin, less chemical maintenance',
                'Copper Ion Systems: Natural sanitization through ionization',
                'EcoSmarte Partnership: Go-green approach with non-chlorine solutions'
            ];
        } else if (lowerQuery.includes('equipment') || lowerQuery.includes('installation') || lowerQuery.includes('heater') || lowerQuery.includes('pump')) {
            results = [
                'ENERGY STAR Certified Installers: Pool pumps and electric heaters',
                'Filter Systems: Professional installation and maintenance',
                'Pool Covers: Equipment installation and service'
            ];
        } else if (lowerQuery.includes('area') || lowerQuery.includes('location') || lowerQuery.includes('serve')) {
            results = [
                'Primary Coverage: Hamptons, Southampton, East Hampton, Westhampton',
                'Extended Service: All of Suffolk County, NY',
                'Local Expertise: Lifelong Hampton locals with area knowledge'
            ];
        } else if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('estimate')) {
            results = [
                'Competitive Pricing: Personal service at competitive rates',
                'Personalized Estimates: Every pool situation is unique',
                'Value Focus: 25+ years experience with quality service'
            ];
        } else if (lowerQuery.includes('experience') || lowerQuery.includes('years') || lowerQuery.includes('family')) {
            results = [
                'Family-Owned Business: Operated by lifelong Hampton locals',
                '25+ Years Combined Experience: Deep pool and spa industry knowledge',
                'Same-Day Attention: Pride in responsive customer service'
            ];
        } else if (lowerQuery.includes('repair') || lowerQuery.includes('restoration') || lowerQuery.includes('fix')) {
            results = [
                'Pool & Spa Repairs: Comprehensive restoration services',
                'Tile Work: Professional repairs and restorations',
                'Leak Detection: Pressure testing and diving services'
            ];
        } else {
            // Default to key specialties
            results = [
                'Same-Day Service: Quick response to customer calls',
                'Eco-Friendly Focus: Salt water and copper ion systems',
                'Local Expertise: 25+ years serving the Hamptons'
            ];
        }
        
        return results.slice(0, 2); // Return top 2 most relevant detailed results
    }
    
    init() {
        // Validate DOM elements exist
        if (!this.sendButton) {
            console.error('Send button not found! Check if element with id="sendButton" exists.');
            return;
        }
        if (!this.userInput) {
            console.error('User input not found! Check if element with id="messageInput" exists.');
            return;
        }
        if (!this.chatMessages) {
            console.error('Chat messages container not found! Check if element with id="chatMessages" exists.');
            return;
        }

        this.sendButton.addEventListener('click', () => this.handleSend());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
        
        // Handle quick reply buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply')) {
                this.handleUserMessage(e.target.dataset.response);
            }
        });
        
        // Initialize tab functionality
        this.initializeTabs();
        
        // Start the conversation automatically
        setTimeout(() => {
            this.startConversation();
        }, 1000);
    }
    
    // Start the conversation with welcome message and first topic
    async startConversation() {
        // Add welcome message
        this.addBotMessage(
            "👋 Hi! I'm here to help you learn about Hampton Blue Pools and understand your pool service needs. " +
            "I'll ask you a few questions to see how we can help."
        );
        
        this.conversationStarted = true;
        
        // Start with the first topic after a brief delay
        setTimeout(() => {
            this.startTopicDiscussion(this.topics[0]);
        }, 2000);
    }
    
    handleSend() {
        // Check if already processing or rate limited
        if (this.isProcessing) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastMessageTime < this.messageDebounceMs) {
            return;
        }
        
        const message = this.userInput.value.trim();
        if (message) {
            this.handleUserMessage(message);
            this.userInput.value = '';
        }
    }
    
    async handleUserMessage(message) {
        // Prevent multiple simultaneous requests
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        this.lastMessageTime = Date.now();
        
        // Disable send button to prevent spam
        this.sendButton.disabled = true;
        this.sendButton.textContent = 'Sending...';
        
        this.addMessage(message, 'user');
        this.conversationState.conversationHistory.push({role: 'user', content: message});
        this.showTypingIndicator();
        
        try {
            // Check if conversation is complete
            if (this.conversationComplete) {
                await this.handlePostConversationMessage(message);
                return;
            }
            
            // Handle topic-based conversation flow
            await this.handleTopicBasedConversation(message);
            
        } catch (error) {
            console.error('Gemini API Error:', error);
            this.hideTypingIndicator();
            this.addMessage(
                "I'm sorry, I'm having trouble processing your message right now. " +
                "Please try again in a moment, or feel free to call us directly at (555) 123-4567.",
                'bot'
            );
        } finally {
            // Re-enable send button
            this.isProcessing = false;
            this.sendButton.disabled = false;
            this.sendButton.textContent = 'Send';
        }
    }

    // Handle topic-based conversation flow
    async handleTopicBasedConversation(message) {
        const currentTopic = this.topics[this.currentTopicIndex];
        
        // If no current topic, we've completed all topics
        if (!currentTopic) {
            await this.completeConversationAndSaveLead();
            return;
        }
        
        // Check if this is a response to "Any questions about [topic]?"
        if (this.waitingForQuestionResponse) {
            await this.handleQuestionResponse(message);
            return;
        }
        
        // Check if this is topic information gathering
        if (this.waitingForTopicInfo) {
            await this.handleTopicInfoResponse(message, currentTopic);
            return;
        }
        
        // Check if user asked a question after saying they had questions
        if (this.answeringTopicQuestion) {
            // Get AI response to their question
            const response = await this.getGeminiResponse(message);
            this.hideTypingIndicator();
            this.processGeminiResponse(response, message);
            
            // After answering, move to next topic
            this.answeringTopicQuestion = false;
            this.topics[this.currentTopicIndex].done = true;
            this.currentTopicIndex++;
            
            setTimeout(() => {
                if (this.currentTopicIndex >= this.topics.length) {
                    // All topics completed
                    this.completeConversationAndSaveLead();
                } else {
                    // Move to next topic
                    this.addBotMessage("Let's move on to the next topic.");
                    setTimeout(() => {
                        this.startTopicDiscussion(this.topics[this.currentTopicIndex]);
                    }, 1500);
                }
            }, 2000);
            return;
        }
        
        // If conversation hasn't started yet, ignore the message (topic flow will start automatically)
        if (!this.conversationStarted) {
            this.hideTypingIndicator();
            return;
        }
        
        // If we're here and conversation is started but no specific state, 
        // it means the user sent a message while waiting for topic flow
        // Just acknowledge and let the topic flow continue
        this.hideTypingIndicator();
        this.addBotMessage("Let me ask you about our services step by step.");
    }

    // Start discussion about a topic
    async startTopicDiscussion(topic) {
        this.hideTypingIndicator();
        
        // Provide information about the topic first
        let topicInfo = '';
        switch(topic.id) {
            case 'WHERE':
                topicInfo = "We serve all areas of the Hamptons including Southampton, East Hampton, Westhampton, and Suffolk County with same-day service.";
                break;
            case 'WHEN':
                topicInfo = "We offer flexible scheduling including same-day service, weekly maintenance, seasonal openings/closings, and emergency repairs.";
                break;
            case 'WHAT':
                topicInfo = "Our services include pool/spa maintenance, equipment installation, repairs, eco-friendly systems, and seasonal services.";
                break;
            case 'WHY':
                topicInfo = "We specialize in eco-friendly solutions, ENERGY STAR certified equipment, and competitive pricing with 25+ years of local expertise.";
                break;
            case 'WHO':
                topicInfo = "We provide same-day attention to all customer calls and can reach you via phone or email based on your preference.";
                break;
        }
        
        this.addBotMessage(topicInfo);
        
        // Ask if they have questions about this topic
        setTimeout(() => {
            this.addBotMessage(
                `Any questions about ${topic.id.toLowerCase()}?`,
                ['No questions', 'Yes, I have a question']
            );
            this.waitingForQuestionResponse = true;
        }, 1500);
    }

    // Handle response to "Any questions about [topic]?"
    async handleQuestionResponse(message) {
        this.waitingForQuestionResponse = false;
        const hasQuestions = message.toLowerCase().includes('yes') || 
                           message.toLowerCase().includes('question') ||
                           !message.toLowerCase().includes('no');
        
        if (hasQuestions) {
            // Let them ask their question
            this.hideTypingIndicator();
            this.addBotMessage("What would you like to know?");
            // Set flag to handle their next message as a question
            this.answeringTopicQuestion = true;
        } else {
            // No questions - end conversation and save lead immediately
            this.hideTypingIndicator();
            this.addBotMessage("Perfect! I have enough information to help you.");
            
            // End conversation and save lead
            setTimeout(() => {
                this.completeConversationAndSaveLead();
            }, 1000);
        }
    }

    // Gather user's information for the current topic
    async gatherTopicInformation() {
        const currentTopic = this.topics[this.currentTopicIndex];
        this.hideTypingIndicator();
        
        let question = '';
        switch(currentTopic.id) {
            case 'WHERE':
                question = "Which area of the Hamptons are you in?";
                break;
            case 'WHEN':
                question = "When are you looking to have this service done?";
                break;
            case 'WHAT':
                question = "What service are you interested in?";
                break;
            case 'WHY':
                question = "Could you tell me more about what you need help with?";
                break;
            case 'WHO':
                question = "What's the best way to contact you - phone or email?";
                break;
        }
        
        this.addBotMessage(question);
        this.waitingForTopicInfo = true;
    }

    // Handle user's response to topic information request
    async handleTopicInfoResponse(message, topic) {
        this.waitingForTopicInfo = false;
        
        // Store the information based on topic
        switch(topic.id) {
            case 'WHERE':
                this.leadData.location = message;
                this.conversationState.location = message;
                break;
            case 'WHEN':
                this.leadData.timing = message;
                this.conversationState.timing = message;
                break;
            case 'WHAT':
                this.leadData.service = message;
                this.conversationState.serviceNeeded = message;
                break;
            case 'WHY':
                this.leadData.message = message;
                this.conversationState.specificQuery = message;
                break;
            case 'WHO':
                // Extract contact info
                const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
                const phoneMatch = message.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
                
                if (emailMatch) {
                    this.leadData.email = emailMatch[0];
                    this.conversationState.contactInfo.email = emailMatch[0];
                    this.conversationState.contactInfo.preferred = 'email';
                } else if (phoneMatch) {
                    this.leadData.phone = phoneMatch[0];
                    this.conversationState.contactInfo.phone = phoneMatch[0];
                    this.conversationState.contactInfo.preferred = 'phone';
                } else {
                    this.conversationState.contactInfo.preferred = message;
                }
                break;
        }
        
        // Mark topic as complete and move to next
        this.topics[this.currentTopicIndex].done = true;
        this.currentTopicIndex++;
        
        this.hideTypingIndicator();
        this.addBotMessage("Great! Let's move on.");
        
        // Check if we have more topics or should complete conversation
        if (this.currentTopicIndex >= this.topics.length) {
            // All topics completed
            setTimeout(() => {
                this.completeConversationAndSaveLead();
            }, 1000);
        } else {
            // Move to next topic
            setTimeout(() => {
                this.startTopicDiscussion(this.topics[this.currentTopicIndex]);
            }, 1000);
        }
    }

    // Complete conversation and save lead
    async completeConversationAndSaveLead() {
        if (this.conversationComplete) return;
        
        this.conversationComplete = true;
        this.hideTypingIndicator();
        
        // Add completion timestamp
        this.leadData.completedAt = new Date().toISOString();
        this.leadData.conversationHistory = this.conversationState.conversationHistory;
        
        try {
            // Save the lead
            const leadId = await this.saveLead();
            console.log('✅ Lead saved with ID:', leadId);
            
            // Thank you message
            this.addBotMessage(
                "Perfect! I have all the information I need. One of our Hampton Blue Pools experts will be in touch shortly to discuss your needs.",
                ['Thank you', 'I have another question']
            );
            
        } catch (error) {
            console.error('❌ Error saving lead:', error);
            this.addBotMessage(
                "Thank you for the information! I'm having a small technical issue saving your details, " +
                "but please call us directly at (555) 123-4567 and we'll take care of everything."
            );
        }
    }

    // Handle messages after conversation is complete
    async handlePostConversationMessage(message) {
        this.hideTypingIndicator();
        
        if (message.toLowerCase().includes('question') || message.toLowerCase().includes('help')) {
            // They have another question - get AI response
            const response = await this.getGeminiResponse(message);
            this.processGeminiResponse(response, message);
        } else {
            // Generic thank you response
            this.addBotMessage(
                "Thank you! We look forward to helping you with your pool and spa needs. " +
                "Have a great day!",
                ['Contact us again', 'Visit our website']
            );
        }
    }
    
    async getGeminiResponse(userMessage) {
        const conversationContext = this.buildConversationContext(userMessage);
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: conversationContext
                }]
            }]
        };
        
        const response = await fetch(this.GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    buildConversationContext(userMessage) {
        const stateInfo = `
        CURRENT CONVERSATION STATE:
        - Location: ${this.conversationState.location || 'Not provided'}
        - Timing: ${this.conversationState.timing || 'Not provided'}
        - Contact Info: ${this.conversationState.contactInfo.preferred || 'Not provided'}
        - Phone: ${this.conversationState.contactInfo.phone || 'Not provided'}
        - Email: ${this.conversationState.contactInfo.email || 'Not provided'}
        - Service Needed: ${this.conversationState.serviceNeeded || 'Not provided'}
        - Current Flow: ${this.conversationState.currentFlow}
        - Brand Alignment: ${this.conversationState.brandAlignment}
        `;
        
        // Limit conversation history to last 10 messages to prevent context overflow
        const maxHistoryLength = 10;
        const recentHistory = this.conversationState.conversationHistory
            .slice(-maxHistoryLength)
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
        
        // Search website content based on user message
        const searchResults = this.searchWebsiteContent(userMessage);
        const websiteSearchInfo = searchResults.length > 0 ? 
            `RELEVANT WEBSITE INFO: ${searchResults.join(', ')}` : '';
        
        // Analyze what has already been discussed to avoid repetition
        const discussedTopics = this.getDiscussedTopics();
        
        // Condensed website info to reduce payload size
        const websiteInfo = `
        WEBSITE DATABASE (hamptonbluepools.com):
        Services: ${this.websiteContent.services.slice(0, 3).join(', ')}
        Areas: ${this.websiteContent.areas.slice(0, 4).join(', ')}
        Specialties: ${this.websiteContent.specialties.slice(0, 3).join(', ')}
        ${websiteSearchInfo}
        `;
        
        return `${this.businessContext}
        
        ${websiteInfo}
        
        ${stateInfo}
        
        RECENT CONVERSATION HISTORY (last ${maxHistoryLength} messages):
        ${recentHistory}
        
        TOPICS DISCUSSED: ${discussedTopics.slice(0, 5).join(', ')}
        
        CURRENT USER MESSAGE: ${userMessage}
        
        INSTRUCTIONS:
        Provide a SHORT response (under 50 words) that:
        1. FOLLOWS TOPIC-BASED FLOW: Give info → "Any questions about [topic]?" → Ask for specific info
        2. GIVES VALUE FIRST before asking questions
        3. AVOIDS repeating discussed information
        4. Asks for only ONE piece of missing information
        5. Suggests 2-3 quick replies (format: QUICK_REPLIES: option1|option2|option3)
        
        RESPONSE:`;
    }
    
    // Analyze what topics have been discussed to avoid repetition
    getDiscussedTopics() {
        const topics = [];
        const history = this.conversationState.conversationHistory;
        
        history.forEach(msg => {
            const content = msg.content.toLowerCase();
            if (content.includes('maintenance') && !topics.includes('maintenance')) topics.push('maintenance');
            if (content.includes('seasonal') && !topics.includes('seasonal')) topics.push('seasonal');
            if (content.includes('eco') && !topics.includes('eco-friendly')) topics.push('eco-friendly');
            if (content.includes('equipment') && !topics.includes('equipment')) topics.push('equipment');
            if (content.includes('price') && !topics.includes('pricing')) topics.push('pricing');
            if (content.includes('experience') && !topics.includes('experience')) topics.push('experience');
            if (content.includes('area') && !topics.includes('coverage')) topics.push('coverage');
            if (content.includes('same-day') && !topics.includes('same-day service')) topics.push('same-day service');
        });
        
        return topics;
    }
    
    processGeminiResponse(response, userMessage) {
        // Extract quick replies if present
        let quickReplies = [];
        let cleanResponse = response;
        
        if (response.includes('QUICK_REPLIES:')) {
            const parts = response.split('QUICK_REPLIES:');
            cleanResponse = parts[0].trim();
            if (parts[1]) {
                quickReplies = parts[1].trim().split('|').map(reply => ({
                    text: reply.trim(),
                    response: reply.trim()
                }));
            }
        }
        
        // Enforce single-question rule by post-processing response
        cleanResponse = this.enforceSingleQuestion(cleanResponse);
        
        // Update conversation state based on user message
        this.updateConversationState(userMessage);
        
        // Add bot response to history
        this.conversationState.conversationHistory.push({role: 'assistant', content: cleanResponse});
        
        // Display response
        this.addBotMessage(cleanResponse, quickReplies);
        
        // Check if we have enough info for summary
        if (this.hasEnoughInfo() && !cleanResponse.includes('summary')) {
            setTimeout(() => {
                this.provideSummaryAndNextSteps();
            }, 3000);
        }
    }
    
    // Enforce single-question rule by removing extra questions
    enforceSingleQuestion(response) {
        // Split by question marks and keep only the first question
        const sentences = response.split(/[.!?]+/).filter(s => s.trim());
        let result = '';
        let questionCount = 0;
        
        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (!sentence) continue;
            
            if (sentence.includes('?') || sentence.endsWith('?')) {
                questionCount++;
                if (questionCount === 1) {
                    result += sentence + (sentence.endsWith('?') ? '' : '?') + ' ';
                }
                // Stop after first question
                break;
            } else {
                result += sentence + '. ';
            }
        }
        
        return result.trim();
    }
    
    updateConversationState(message) {
        const lowerMessage = message.toLowerCase();
        
        // Phone number detection (various formats) - exclude prompts
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/;
        const phoneMatch = message.match(phoneRegex);
        if (phoneMatch && !this.conversationState.contactInfo.phone && 
            !lowerMessage.includes('phone number is') && 
            !lowerMessage.includes('my phone') &&
            !lowerMessage.includes('call me') &&
            !lowerMessage.includes('number is') &&
            this.isValidPhoneNumber(message)) {
            this.conversationState.contactInfo.phone = phoneMatch[0];
            this.conversationState.contactInfo.preferred = 'phone';
        }
        
        // Email detection - exclude prompts
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = message.match(emailRegex);
        if (emailMatch && !this.conversationState.contactInfo.email &&
            !lowerMessage.includes('email is') &&
            !lowerMessage.includes('my email') &&
            this.isValidEmail(message)) {
            this.conversationState.contactInfo.email = emailMatch[0];
            this.conversationState.contactInfo.preferred = 'email';
        }
        
        // Location detection
        if (!this.conversationState.location && this.isLocationMessage(lowerMessage)) {
            this.conversationState.location = message;
        }
        
        // Timing detection
        if (!this.conversationState.timing && this.isTimingMessage(lowerMessage)) {
            this.conversationState.timing = message;
        }
        
        // Contact preference detection
        if (!this.conversationState.contactInfo.preferred && this.isContactMessage(lowerMessage)) {
            this.conversationState.contactInfo.preferred = lowerMessage.includes('phone') ? 'phone' : 'email';
        }
        
        // Service detection
        if (!this.conversationState.serviceNeeded) {
            if (lowerMessage.includes('maintenance')) this.conversationState.serviceNeeded = 'maintenance';
            else if (lowerMessage.includes('seasonal')) this.conversationState.serviceNeeded = 'seasonal';
            else if (lowerMessage.includes('equipment')) this.conversationState.serviceNeeded = 'equipment';
            else if (lowerMessage.includes('eco') || lowerMessage.includes('green')) {
                this.conversationState.serviceNeeded = 'eco-systems';
                this.conversationState.brandAlignment = true;
            }
        }
        
        // Brand alignment detection
        if (lowerMessage.includes('eco') || lowerMessage.includes('green') || lowerMessage.includes('environment')) {
            this.conversationState.brandAlignment = true;
        }
    }
    
    handleFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Fallback to rule-based responses if Gemini fails
        if (this.conversationState.currentFlow === 'initial') {
            this.addBotMessage(
                "Hi! I help with Hampton Blue Pools info. How can I assist?",
                [
                    { text: "Pool services", response: "Tell me about services" },
                    { text: "Get help", response: "I need pool help" },
                    { text: "Ask question", response: "I have a question" }
                ]
            );
        } else {
            this.addBotMessage(
                "What can I help you with?",
                [
                    { text: "Pool maintenance", response: "I need maintenance" },
                    { text: "Pricing info", response: "I'd like pricing" },
                    { text: "Schedule service", response: "Schedule service" }
                ]
            );
        }
    }
    
    
    provideSummaryAndNextSteps() {
        const summary = this.generateConversationSummary();
        this.addBotMessage(
            `Perfect! Let me summarize what we've discussed:\n\n${summary}\n\n**Next Steps:**\nOur team will reach out to you via ${this.conversationState.contactInfo.preferred || 'your preferred method'} to discuss your specific needs and provide a personalized estimate.\n\n**Why choose Hampton Blue Pools?**\n✅ 25+ years of local expertise\n✅ Same-day attention to calls\n✅ Eco-friendly solutions\n✅ Competitive pricing\n✅ ENERGY STAR certified\n\nIs there anything else you'd like to know before we connect you with our team?`,
            [
                { text: "That covers everything", response: "That covers everything, thanks!" },
                { text: "I have another question", response: "I have one more question" },
                { text: "When will you contact me?", response: "When will someone contact me?" }
            ]
        );
    }
    
    generateConversationSummary() {
        let summary = "📍 **Where:** " + (this.conversationState.location || "Hampton area") + "\n";
        summary += "⏰ **When:** " + (this.conversationState.timing || "To be determined") + "\n";
        summary += "🔧 **What:** " + (this.conversationState.serviceNeeded || "Pool/spa services") + "\n";
        
        // Show actual contact information if captured
        if (this.conversationState.contactInfo.phone) {
            summary += "📞 **Phone:** " + this.conversationState.contactInfo.phone + "\n";
        } else if (this.conversationState.contactInfo.email) {
            summary += "📧 **Email:** " + this.conversationState.contactInfo.email + "\n";
        } else {
            summary += "📞 **Contact:** " + (this.conversationState.contactInfo.preferred || "To be determined") + "\n";
        }
        
        if (this.conversationState.specificQuery) {
            summary += "❓ **Why:** " + this.conversationState.specificQuery + "\n";
        }
        if (this.conversationState.brandAlignment) {
            summary += "🌿 **Brand Alignment:** Interested in eco-friendly solutions\n";
        }
        return summary;
    }
    
    // Helper functions for conversation state detection
    isLocationMessage(message) {
        const locations = ['hamptons', 'southampton', 'east hampton', 'westhampton', 'suffolk', 'ny', 'new york'];
        return locations.some(loc => message.includes(loc));
    }
    
    isTimingMessage(message) {
        const timingWords = ['soon', 'asap', 'today', 'tomorrow', 'week', 'month', 'urgent', 'emergency'];
        return timingWords.some(word => message.includes(word));
    }
    
    isContactMessage(message) {
        return message.includes('phone') || message.includes('email') || message.includes('call') || message.includes('text');
    }
    
    // Validate if a string contains a real phone number
    isValidPhoneNumber(text) {
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/;
        const match = text.match(phoneRegex);
        return match && match[0].replace(/\D/g, '').length >= 10;
    }
    
    // Validate if a string contains a real email
    isValidEmail(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        return emailRegex.test(text);
    }
    
    hasEnoughInfo() {
        return this.conversationState.location && 
               this.conversationState.timing && 
               this.conversationState.contactInfo.preferred &&
               this.conversationState.serviceNeeded;
    }

    // Save lead data with proper error handling and user feedback
    async saveLead() {
        const leadData = {
            name: this.leadData.name || 'Not provided',
            email: this.leadData.email || this.conversationState.contactInfo.email || '',
            phone: this.leadData.phone || this.conversationState.contactInfo.phone || '',
            location: this.leadData.location || this.conversationState.location || '',
            service: this.leadData.service || this.conversationState.serviceNeeded || '',
            message: this.leadData.message || this.conversationState.specificQuery || '',
            timing: this.conversationState.timing || '',
            contactPreference: this.conversationState.contactInfo.preferred || '',
            conversationHistory: this.conversationState.conversationHistory,
            sessionId: this.conversationState.sessionId,
            timestamp: new Date().toISOString(),
            source: 'chatbot'
        };

        let saveSuccessful = false;
        let errorMessages = [];

        // Try Firebase first
        if (this.firebaseDB) {
            try {
                const leadId = await this.firebaseDB.addLead(leadData);
                console.log('✅ Lead saved to Firebase with ID:', leadId);
                saveSuccessful = true;
            } catch (error) {
                console.error('❌ Firebase save failed:', error);
                errorMessages.push('Firebase');
                
                // Show user notification for Firebase failure
                this.showNotification('Having trouble saving to our main database. Trying backup...', 'warning');
            }
        }

        // Try Google Sheets as backup
        if (window.SheetsIntegration) {
            try {
                await window.SheetsIntegration.addLead(leadData);
                console.log('✅ Lead saved to Google Sheets');
                saveSuccessful = true;
            } catch (error) {
                console.error('❌ Google Sheets save failed:', error);
                errorMessages.push('Google Sheets');
            }
        }

        // Fallback to localStorage
        if (!saveSuccessful) {
            try {
                const existingLeads = JSON.parse(localStorage.getItem(this.database) || '[]');
                leadData.id = 'local_' + Date.now();
                existingLeads.push(leadData);
                localStorage.setItem(this.database, JSON.stringify(existingLeads));
                console.log('✅ Lead saved to localStorage as fallback');
                saveSuccessful = true;
                
                this.showNotification('Information saved locally. We\'ll sync it when connection improves.', 'info');
            } catch (error) {
                console.error('❌ localStorage save failed:', error);
                errorMessages.push('Local Storage');
            }
        }

        if (!saveSuccessful) {
            // All save methods failed - notify user
            this.showNotification(
                'We\'re having trouble saving your information right now. ' +
                'Please call us directly at (555) 123-4567 or try again later.',
                'error'
            );
            throw new Error(`All save methods failed: ${errorMessages.join(', ')}`);
        }

        // Success notification
        if (saveSuccessful && errorMessages.length === 0) {
            this.showNotification('Your information has been saved successfully!', 'success');
        }

        return leadData.id || 'saved';
    }

    // Show user notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add to chat or create notification area
        const notificationArea = document.getElementById('notifications') || this.chatMessages;
        notificationArea.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        this.scrollToBottom();
    }

    // Get notification icon based on type
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'info': 
            default: return 'ℹ️';
        }
    }
    
    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = message.replace(/\n/g, '<br>');
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addBotMessage(message, quickReplies = []) {
        // Handle undefined or null messages
        if (!message || message === 'undefined') {
            console.error('Attempted to add undefined message');
            return;
        }
        
        console.log('Adding bot message:', message);
        console.log('Quick replies:', quickReplies);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = message.replace(/\n/g, '<br>');
        
        messageDiv.appendChild(contentDiv);
        
        if (quickReplies.length > 0) {
            const repliesDiv = document.createElement('div');
            repliesDiv.className = 'quick-replies';
            
            quickReplies.forEach((reply, index) => {
                console.log(`Quick reply ${index}:`, reply, typeof reply);
                const button = document.createElement('button');
                button.className = 'quick-reply';
                
                // Handle both string and object formats
                if (typeof reply === 'string') {
                    button.textContent = reply;
                    button.dataset.response = reply;
                } else if (reply && typeof reply === 'object') {
                    button.textContent = reply.text || reply;
                    button.dataset.response = reply.response || reply.text || reply;
                } else {
                    console.error('Invalid quick reply format:', reply);
                    button.textContent = 'Invalid Reply';
                    button.dataset.response = 'Invalid Reply';
                }
                
                repliesDiv.appendChild(button);
            });
            
            messageDiv.appendChild(repliesDiv);
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <span>Hampton Blue Pools is typing</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = this.chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Initialize tab functionality
    initializeTabs() {
        const topicTabs = document.getElementById('topicTabs');
        const topicInfoPanel = document.getElementById('topicInfoPanel');
        const closeTopicBtn = document.getElementById('closeTopicBtn');
        
        if (!topicTabs || !topicInfoPanel || !closeTopicBtn) {
            console.warn('Tab elements not found, skipping tab initialization');
            return;
        }
        
        // Show tabs after conversation starts
        setTimeout(() => {
            topicTabs.style.display = 'block';
            this.updateTabStates();
        }, 3000);
        
        // Add click handlers for tabs - Enhanced for direct topic navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const topicId = tab.dataset.topic;
                this.navigateToTopic(topicId);
            });
        });
        
        // Add double-click to directly start topic conversation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('dblclick', () => {
                const topicId = tab.dataset.topic;
                this.startTopicConversation(topicId);
            });
        });
        
        // Close topic panel handler
        closeTopicBtn.addEventListener('click', () => {
            topicInfoPanel.classList.remove('show');
        });
    }
    
    // Update tab visual states
    updateTabStates() {
        document.querySelectorAll('.tab').forEach((tab, index) => {
            const topicId = tab.dataset.topic;
            const topic = this.topics.find(t => t.id === topicId);
            const tabStatus = tab.querySelector('.tab-status');
            
            // Remove existing classes
            tab.classList.remove('active', 'completed');
            tabStatus.classList.remove('active', 'completed');
            
            if (topic) {
                if (topic.done) {
                    tab.classList.add('completed');
                    tabStatus.classList.add('completed');
                } else if (index === this.currentTopicIndex) {
                    tab.classList.add('active');
                    tabStatus.classList.add('active');
                }
            }
        });
    }
    
    // Show topic information panel
    showTopicInfo(topicId) {
        const topic = this.topics.find(t => t.id === topicId);
        if (!topic) return;
        
        const topicInfoPanel = document.getElementById('topicInfoPanel');
        const topicTitle = document.getElementById('topicTitle');
        const topicInfo = document.getElementById('topicInfo');
        const topicResponses = document.getElementById('topicResponses');
        
        // Update panel content
        topicTitle.textContent = topic.title;
        topicInfo.textContent = topic.info;
        
        // Show responses for this topic
        topicResponses.innerHTML = '';
        if (topic.responses && topic.responses.length > 0) {
            const responsesTitle = document.createElement('h4');
            responsesTitle.textContent = 'Conversation History';
            topicResponses.appendChild(responsesTitle);
            
            topic.responses.forEach(response => {
                const responseDiv = document.createElement('div');
                responseDiv.className = `response-item ${response.type}`;
                responseDiv.textContent = response.content;
                topicResponses.appendChild(responseDiv);
            });
        }
        
        // Show panel
        topicInfoPanel.classList.add('show');
    }
    
    // Add response to topic history
    addTopicResponse(topicId, content, type = 'user') {
        const topic = this.topics.find(t => t.id === topicId);
        if (topic) {
            if (!topic.responses) topic.responses = [];
            topic.responses.push({ content, type, timestamp: new Date() });
            
            // Update lead data
            this.leadData.topicResponses[topicId] = topic.responses;
        }
    }
    
    // Navigate to topic (show info panel)
    navigateToTopic(topicId) {
        this.showTopicInfo(topicId);
        
        // Update current topic if not completed
        const topicIndex = this.topics.findIndex(t => t.id === topicId);
        if (topicIndex !== -1 && !this.topics[topicIndex].done) {
            this.currentTopicIndex = topicIndex;
            this.updateTabStates();
        }
    }
    
    // Start conversation for specific topic
    startTopicConversation(topicId) {
        const topic = this.topics.find(t => t.id === topicId);
        if (!topic) return;
        
        // Set current topic
        this.currentTopicIndex = this.topics.findIndex(t => t.id === topicId);
        
        // Generate topic-specific conversation starter
        const topicStarters = {
            'where': "Let's talk about our service areas in the Hamptons. What would you like to know about where we work?",
            'when': "I'd love to discuss timing for your pool service. What questions do you have about scheduling?",
            'what': "Let's explore our pool and spa services. What specific services interest you most?",
            'why': "I can explain our eco-friendly approach and specialties. What challenges are you facing with your pool?",
            'who': "Let's discuss how we can connect and work together. What's your preferred way to communicate?"
        };
        
        const message = topicStarters[topicId] || `Let's discuss ${topic.name}. What would you like to know?`;
        
        // Add bot message to conversation
        this.addMessage(message, 'bot');
        
        // Update topic state
        this.updateTabStates();
        
        // Close topic panel
        const topicInfoPanel = document.getElementById('topicInfoPanel');
        if (topicInfoPanel) {
            topicInfoPanel.classList.remove('show');
        }
    }
    
    // Enhanced lead saving with context summary
    async saveLeadEnhanced() {
        try {
            // Generate enhanced context summary
            const contextData = this.generateContextSummary();
            this.leadData.contextSummary = contextData.shortSummary;
            this.leadData.contextDetails = contextData.detailedSummary;
            this.leadData.conversationMetrics = contextData.metrics;
            
            // Extract enhanced specific requests
            const requestsData = this.extractSpecificRequests();
            this.leadData.specificRequests = requestsData.summary;
            this.leadData.requestDetails = requestsData.details;
            this.leadData.hasUrgentRequests = requestsData.hasSpecificRequests;
            
            // Add topic-specific data
            this.leadData.topicResponses = {};
            this.topics.forEach(topic => {
                if (topic.responses && topic.responses.length > 0) {
                    this.leadData.topicResponses[topic.id] = {
                        name: topic.name,
                        responses: topic.responses,
                        completed: topic.done,
                        responseCount: topic.responses.length
                    };
                }
            });
            
            // Add conversation flow (last 10 messages with metadata)
            this.leadData.conversationFlow = this.conversation.slice(-10).map(msg => ({
                sender: msg.sender,
                message: msg.message,
                timestamp: msg.timestamp,
                length: msg.message.length
            }));
            
            // Add lead quality scoring
            this.leadData.leadScore = this.calculateLeadScore(contextData.metrics, requestsData);
            
            // Save to Firebase with enhanced data structure
            if (this.firebaseDB) {
                const enhancedLeadData = {
                    ...this.leadData,
                    enhanced: true,
                    version: '2.5',
                    savedAt: new Date().toISOString(),
                    platform: 'WWWWW.AI',
                    chatbotId: 'hampton-blue-pools'
                };
                
                const docRef = await this.firebaseDB.collection('leads').add(enhancedLeadData);
                console.log('Enhanced lead saved with ID:', docRef.id);
                console.log('Lead data:', enhancedLeadData);
                this.showNotification('Lead saved with enhanced context!', 'success');
            }
        } catch (error) {
            console.error('Error saving enhanced lead:', error);
            this.showNotification('Error saving lead', 'error');
        }
    }
    
    // Calculate lead quality score based on engagement and requests
    calculateLeadScore(metrics, requestsData) {
        let score = 0;
        
        // Base score from completion rate
        score += metrics.completionRate * 0.4; // 40% weight
        
        // Engagement score
        const engagementScore = {
            'High': 30,
            'Medium': 20,
            'Low': 10
        }[metrics.engagement] || 10;
        score += engagementScore;
        
        // Message count bonus (more engagement)
        if (metrics.messageCount > 10) score += 15;
        else if (metrics.messageCount > 5) score += 10;
        else score += 5;
        
        // Specific requests bonus
        if (requestsData.hasSpecificRequests) score += 20;
        if (requestsData.details.urgency) score += 15;
        if (requestsData.details.business) score += 10;
        
        // Duration bonus (engaged conversation)
        if (metrics.duration > 5) score += 10;
        else if (metrics.duration > 2) score += 5;
        
        return Math.min(Math.round(score), 100); // Cap at 100
    }
    
    // Generate context summary from conversation - Enhanced
    generateContextSummary() {
        const completedTopics = this.topics.filter(t => t.done);
        const activeTopics = this.topics.filter(t => !t.done);
        const totalMessages = this.conversation.length;
        const userMessages = this.conversation.filter(msg => msg.sender === 'user').length;
        const botMessages = this.conversation.filter(msg => msg.sender === 'bot').length;
        
        // Calculate conversation duration
        const duration = Date.now() - new Date(this.leadData.timestamp).getTime();
        const durationMinutes = Math.round(duration / 60000);
        
        // Analyze conversation engagement
        const avgMessageLength = this.conversation
            .filter(msg => msg.sender === 'user')
            .reduce((sum, msg) => sum + msg.message.length, 0) / userMessages || 0;
        
        const engagementLevel = avgMessageLength > 50 ? 'High' : avgMessageLength > 20 ? 'Medium' : 'Low';
        
        // Topic progress analysis
        const topicProgress = {
            completed: completedTopics.map(t => t.id),
            active: activeTopics.map(t => t.id),
            completionRate: Math.round((completedTopics.length / this.topics.length) * 100)
        };
        
        // Build comprehensive summary
        const summary = {
            overview: `${completedTopics.length}/${this.topics.length} topics completed (${topicProgress.completionRate}%)`,
            engagement: `${totalMessages} total messages (${userMessages} user, ${botMessages} bot) - ${engagementLevel} engagement`,
            duration: `${durationMinutes} minutes conversation time`,
            topicDetails: {
                completed: completedTopics.map(t => ({ id: t.id, name: t.name, responses: t.responses?.length || 0 })),
                remaining: activeTopics.map(t => ({ id: t.id, name: t.name }))
            },
            conversationFlow: this.conversation.slice(-5).map(msg => ({ 
                sender: msg.sender, 
                preview: msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
                timestamp: msg.timestamp 
            }))
        };
        
        return {
            shortSummary: `${topicProgress.completionRate}% complete | ${totalMessages} messages | ${durationMinutes}min | ${engagementLevel} engagement`,
            detailedSummary: summary,
            metrics: {
                completionRate: topicProgress.completionRate,
                messageCount: totalMessages,
                duration: durationMinutes,
                engagement: engagementLevel,
                avgMessageLength: Math.round(avgMessageLength)
            }
        };
    }
    
    // Extract specific requests from conversation - Enhanced
    extractSpecificRequests() {
        const userMessages = this.conversation
            .filter(msg => msg.sender === 'user')
            .map(msg => msg.message);
        
        const allUserText = userMessages.join(' ').toLowerCase();
        
        // Enhanced keyword categories
        const urgencyKeywords = ['urgent', 'asap', 'emergency', 'immediately', 'today', 'now'];
        const serviceKeywords = ['repair', 'fix', 'broken', 'leak', 'install', 'replace', 'maintenance', 'cleaning'];
        const businessKeywords = ['quote', 'estimate', 'price', 'cost', 'budget', 'consultation', 'appointment'];
        const problemKeywords = ['green', 'cloudy', 'algae', 'chemical', 'ph', 'chlorine', 'filter', 'pump', 'heater'];
        
        const foundUrgency = urgencyKeywords.filter(keyword => allUserText.includes(keyword));
        const foundServices = serviceKeywords.filter(keyword => allUserText.includes(keyword));
        const foundBusiness = businessKeywords.filter(keyword => allUserText.includes(keyword));
        const foundProblems = problemKeywords.filter(keyword => allUserText.includes(keyword));
        
        // Build detailed request summary
        const requests = {
            urgency: foundUrgency.length > 0 ? foundUrgency : null,
            services: foundServices.length > 0 ? foundServices : null,
            business: foundBusiness.length > 0 ? foundBusiness : null,
            problems: foundProblems.length > 0 ? foundProblems : null,
            rawMessages: userMessages.slice(-3), // Last 3 user messages for context
            totalMessages: userMessages.length
        };
        
        // Generate summary string
        let summary = [];
        if (requests.urgency) summary.push(`Urgency: ${requests.urgency.join(', ')}`);
        if (requests.services) summary.push(`Services: ${requests.services.join(', ')}`);
        if (requests.business) summary.push(`Business: ${requests.business.join(', ')}`);
        if (requests.problems) summary.push(`Problems: ${requests.problems.join(', ')}`);
        
        return {
            summary: summary.length > 0 ? summary.join(' | ') : 'General inquiry',
            details: requests,
            hasSpecificRequests: summary.length > 0
        };
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HamptonBluePoolsChatbot();
});
