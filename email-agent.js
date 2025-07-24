/**
 * WWWWW.AI Email Agent System
 * Automatically finds service businesses and sends them information about our chatbot platform
 */

class WWWWWEmailAgent {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.emailConfig = {
            service: 'gmail',
            user: 'hello@wwwww.ai',
            pass: process.env.EMAIL_PASSWORD
        };
        
        this.businessTypes = [
            'pool service',
            'landscaping',
            'plumbing',
            'hvac',
            'electrical',
            'roofing',
            'cleaning service',
            'pest control',
            'home repair',
            'auto repair',
            'restaurant',
            'dental office',
            'law firm',
            'real estate',
            'insurance agency'
        ];
        
        this.locations = [
            'New York, NY',
            'Los Angeles, CA',
            'Chicago, IL',
            'Houston, TX',
            'Phoenix, AZ',
            'Philadelphia, PA',
            'San Antonio, TX',
            'San Diego, CA',
            'Dallas, TX',
            'San Jose, CA'
        ];
        
        this.emailTemplates = {
            initial: `Subject: Transform Your Website Visitors into Qualified Leads with AI

Hi {name},

I hope this email finds you well. I came across {business_name} while researching {business_type} businesses in {location}, and I was impressed by your {compliment}.

My name is [Your Name], and I'm reaching out from WWWWW.AI, a platform that helps service businesses like yours convert website visitors into qualified leads using intelligent chatbots.

Here's what caught my attention about your business:
{business_insights}

I'd love to learn more about your business philosophy and approach to customer service. Understanding your unique value proposition helps us create more effective chatbot experiences.

Could you share a bit about:
- What sets {business_name} apart from competitors?
- Your core values and approach to customer service?
- Any specific challenges you face in converting website visitors to customers?

In return, I'd be happy to show you how businesses similar to yours are using AI chatbots to:
✅ Qualify leads 24/7, even when you're not available
✅ Answer common questions instantly
✅ Collect contact information naturally through conversation
✅ Increase conversion rates by 30-50%

If this sounds interesting, I'd love to create a custom demo chatbot for your website at no cost. It would take about 10 minutes to set up and you could see it in action immediately.

Would you be open to a brief 15-minute conversation this week?

Best regards,
[Your Name]
WWWWW.AI Team

P.S. Here's our philosophy: Great businesses deserve great technology that works as hard as they do. We believe in creating tools that enhance human connections, not replace them.`,

            followUp: `Subject: Custom Chatbot Demo Ready for {business_name}

Hi {name},

Thank you for sharing your insights about {business_name}! Based on what you told me about {business_insights}, I've created a custom chatbot demo specifically for your business.

Here's what I've built for you:
{demo_features}

You can see it in action here: {demo_link}

The chatbot is designed to:
- Reflect your business values: {business_values}
- Ask the right qualifying questions for {business_type}
- Capture leads in a conversational, non-pushy way
- Integrate seamlessly with your existing website

If you like what you see, you can activate it on your live website with just one line of code. The setup takes less than 5 minutes.

Interested in taking the next step? Click here to create your account and customize it further: {signup_link}

Questions? Just reply to this email or schedule a quick call: {calendar_link}

Best regards,
[Your Name]
WWWWW.AI Team`,

            conversion: `Subject: Ready to activate your chatbot for {business_name}?

Hi {name},

I hope you had a chance to test the custom chatbot demo I created for {business_name}. 

Several businesses similar to yours have already activated their chatbots and are seeing great results:
- Pool Service Co. in Miami: 40% increase in qualified leads
- HVAC Experts in Phoenix: 25% reduction in phone calls for basic questions
- Landscaping Pro in Austin: 60% of website visitors now engage with the chatbot

Your demo chatbot is ready to go live whenever you are. Here's what happens next:

1. Click here to activate: {activation_link}
2. Copy one line of code to your website
3. Start capturing qualified leads immediately

The first month is free, and you can cancel anytime. No contracts, no setup fees.

Ready to give it a try?

Best regards,
[Your Name]
WWWWW.AI Team

P.S. If you have any questions or want to customize anything before going live, just reply to this email. I'm here to help!`
        };
        
        this.init();
    }
    
    async init() {
        console.log('🤖 WWWWW.AI Email Agent Starting...');
        this.setupDatabase();
        this.startEmailCampaign();
    }
    
    setupDatabase() {
        // Initialize database to track contacted businesses
        this.contactedBusinesses = new Map();
        this.leadPipeline = new Map();
    }
    
    async startEmailCampaign() {
        console.log('📧 Starting email campaign...');
        
        for (const location of this.locations) {
            for (const businessType of this.businessTypes) {
                try {
                    await this.processBusinessType(businessType, location);
                    
                    // Rate limiting - wait between requests
                    await this.sleep(2000);
                    
                } catch (error) {
                    console.error(`Error processing ${businessType} in ${location}:`, error);
                }
            }
        }
    }
    
    async processBusinessType(businessType, location) {
        console.log(`🔍 Searching for ${businessType} businesses in ${location}...`);
        
        // Find businesses using Google Maps API
        const businesses = await this.findBusinesses(businessType, location);
        
        for (const business of businesses) {
            if (this.shouldContactBusiness(business)) {
                await this.processBusiness(business, businessType, location);
                
                // Rate limiting between emails
                await this.sleep(5000);
            }
        }
    }
    
    async findBusinesses(businessType, location) {
        const query = `${businessType} ${location}`;
        
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`
            );
            
            const data = await response.json();
            
            if (data.status === 'OK') {
                return data.results.slice(0, 10); // Limit to first 10 results
            } else {
                console.error('Google Maps API error:', data.status);
                return [];
            }
        } catch (error) {
            console.error('Error finding businesses:', error);
            return [];
        }
    }
    
    shouldContactBusiness(business) {
        // Check if we've already contacted this business
        const businessId = business.place_id;
        
        if (this.contactedBusinesses.has(businessId)) {
            return false;
        }
        
        // Check if business has a website (more likely to be interested in web tools)
        if (!business.website && business.rating < 4.0) {
            return false;
        }
        
        // Skip chains/franchises (look for unique names)
        const chainKeywords = ['mcdonald', 'starbucks', 'subway', 'domino', 'pizza hut'];
        const businessName = business.name.toLowerCase();
        
        for (const keyword of chainKeywords) {
            if (businessName.includes(keyword)) {
                return false;
            }
        }
        
        return true;
    }
    
    async processBusiness(business, businessType, location) {
        console.log(`📋 Processing business: ${business.name}`);
        
        try {
            // Get detailed business information
            const businessDetails = await this.getBusinessDetails(business.place_id);
            
            // Analyze business website if available
            let websiteAnalysis = null;
            if (businessDetails.website) {
                websiteAnalysis = await this.analyzeBusinessWebsite(businessDetails.website);
            }
            
            // Generate personalized email content
            const emailContent = await this.generatePersonalizedEmail(
                businessDetails,
                websiteAnalysis,
                businessType,
                location
            );
            
            // Find contact email
            const contactEmail = await this.findContactEmail(businessDetails);
            
            if (contactEmail) {
                // Send initial email
                await this.sendEmail(contactEmail, emailContent);
                
                // Track in database
                this.trackBusinessContact(business.place_id, {
                    business: businessDetails,
                    contactEmail,
                    emailSent: new Date(),
                    status: 'initial_contact',
                    businessType,
                    location
                });
                
                console.log(`✅ Email sent to ${business.name} (${contactEmail})`);
            } else {
                console.log(`❌ No contact email found for ${business.name}`);
            }
            
        } catch (error) {
            console.error(`Error processing ${business.name}:`, error);
        }
    }
    
    async getBusinessDetails(placeId) {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,website,formatted_phone_number,formatted_address,rating,reviews,types&key=${this.apiKey}`
            );
            
            const data = await response.json();
            
            if (data.status === 'OK') {
                return data.result;
            } else {
                throw new Error(`Google Places API error: ${data.status}`);
            }
        } catch (error) {
            console.error('Error getting business details:', error);
            return null;
        }
    }
    
    async analyzeBusinessWebsite(websiteUrl) {
        try {
            console.log(`🔍 Analyzing website: ${websiteUrl}`);
            
            // Fetch website content
            const response = await fetch(websiteUrl);
            const html = await response.text();
            
            // Extract key information
            const analysis = {
                title: this.extractTitle(html),
                description: this.extractDescription(html),
                services: this.extractServices(html),
                hasContact: this.hasContactForm(html),
                hasChat: this.hasExistingChat(html),
                technology: this.detectTechnology(html)
            };
            
            // Use AI to generate insights
            const aiInsights = await this.generateAIInsights(analysis, websiteUrl);
            
            return {
                ...analysis,
                aiInsights
            };
            
        } catch (error) {
            console.error('Error analyzing website:', error);
            return null;
        }
    }
    
    extractTitle(html) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : '';
    }
    
    extractDescription(html) {
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        return descMatch ? descMatch[1].trim() : '';
    }
    
    extractServices(html) {
        const services = [];
        const serviceKeywords = ['service', 'repair', 'installation', 'maintenance', 'cleaning', 'consultation'];
        
        // Look for service-related content
        serviceKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
            const matches = html.match(regex);
            if (matches) {
                services.push(...matches.slice(0, 3)); // Limit to 3 per keyword
            }
        });
        
        return [...new Set(services)].slice(0, 10); // Remove duplicates, limit to 10
    }
    
    hasContactForm(html) {
        return /contact.*form|form.*contact/i.test(html) || /<form[^>]*>/i.test(html);
    }
    
    hasExistingChat(html) {
        const chatKeywords = ['chat', 'intercom', 'zendesk', 'livechat', 'tawk', 'drift'];
        return chatKeywords.some(keyword => html.toLowerCase().includes(keyword));
    }
    
    detectTechnology(html) {
        const technologies = [];
        
        if (html.includes('wordpress')) technologies.push('WordPress');
        if (html.includes('shopify')) technologies.push('Shopify');
        if (html.includes('squarespace')) technologies.push('Squarespace');
        if (html.includes('wix')) technologies.push('Wix');
        if (html.includes('react')) technologies.push('React');
        
        return technologies;
    }
    
    async generateAIInsights(analysis, websiteUrl) {
        try {
            const prompt = `Analyze this business website and provide insights for a personalized email:
            
Website: ${websiteUrl}
Title: ${analysis.title}
Description: ${analysis.description}
Services: ${analysis.services.join(', ')}
Has Contact Form: ${analysis.hasContact}
Has Existing Chat: ${analysis.hasChat}
Technology: ${analysis.technology.join(', ')}

Generate 3 specific, personalized compliments about this business that could be used in an outreach email. Focus on their services, website quality, or unique positioning. Be specific and genuine.

Format as JSON:
{
  "compliments": ["compliment1", "compliment2", "compliment3"],
  "pain_points": ["potential pain point 1", "potential pain point 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            // Parse JSON response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return null;
            
        } catch (error) {
            console.error('Error generating AI insights:', error);
            return null;
        }
    }
    
    async findContactEmail(businessDetails) {
        // Try to extract email from business details or website
        let email = null;
        
        // Check if website has contact email
        if (businessDetails.website) {
            try {
                const response = await fetch(businessDetails.website);
                const html = await response.text();
                
                // Look for email addresses
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const emails = html.match(emailRegex);
                
                if (emails) {
                    // Filter out common non-contact emails
                    const validEmails = emails.filter(email => 
                        !email.includes('noreply') && 
                        !email.includes('no-reply') &&
                        !email.includes('example.com')
                    );
                    
                    if (validEmails.length > 0) {
                        email = validEmails[0];
                    }
                }
            } catch (error) {
                console.error('Error extracting email from website:', error);
            }
        }
        
        // Fallback: generate likely email addresses
        if (!email && businessDetails.name) {
            const businessName = businessDetails.name.toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
            
            const domain = businessDetails.website ? 
                new URL(businessDetails.website).hostname : 
                `${businessName}.com`;
            
            // Try common email patterns
            const emailPatterns = [
                `info@${domain}`,
                `contact@${domain}`,
                `hello@${domain}`,
                `admin@${domain}`
            ];
            
            // For demo purposes, we'll use the first pattern
            // In production, you'd want to verify these emails exist
            email = emailPatterns[0];
        }
        
        return email;
    }
    
    async generatePersonalizedEmail(businessDetails, websiteAnalysis, businessType, location) {
        const template = this.emailTemplates.initial;
        
        // Extract business name
        const businessName = businessDetails.name;
        const ownerName = this.extractOwnerName(businessName) || 'there';
        
        // Generate compliments and insights
        let compliment = `professional ${businessType} services`;
        let businessInsights = `Your focus on quality ${businessType} services in ${location}`;
        
        if (websiteAnalysis && websiteAnalysis.aiInsights) {
            compliment = websiteAnalysis.aiInsights.compliments[0] || compliment;
            businessInsights = websiteAnalysis.aiInsights.compliments.join('\n- ');
        }
        
        // Replace template variables
        return template
            .replace(/{name}/g, ownerName)
            .replace(/{business_name}/g, businessName)
            .replace(/{business_type}/g, businessType)
            .replace(/{location}/g, location)
            .replace(/{compliment}/g, compliment)
            .replace(/{business_insights}/g, businessInsights);
    }
    
    extractOwnerName(businessName) {
        // Try to extract owner name from business name
        const namePatterns = [
            /([A-Z][a-z]+)\s+[A-Z][a-z]+\s+(Services?|Co\.?|Inc\.?|LLC)/,
            /([A-Z][a-z]+)'s\s+/,
            /([A-Z][a-z]+)\s+&\s+/
        ];
        
        for (const pattern of namePatterns) {
            const match = businessName.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }
    
    async sendEmail(to, content) {
        // In a real implementation, this would use a proper email service
        // like SendGrid, Mailgun, or AWS SES
        
        console.log(`📧 Sending email to: ${to}`);
        console.log(`Subject: ${content.split('\n')[0].replace('Subject: ', '')}`);
        
        // For demo purposes, we'll just log the email
        // In production, you'd integrate with your email service:
        
        /*
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: this.emailConfig.user,
                pass: this.emailConfig.pass
            }
        });
        
        await transporter.sendMail({
            from: this.emailConfig.user,
            to: to,
            subject: content.split('\n')[0].replace('Subject: ', ''),
            text: content.split('\n').slice(1).join('\n')
        });
        */
        
        return true;
    }
    
    trackBusinessContact(placeId, data) {
        this.contactedBusinesses.set(placeId, {
            ...data,
            contactedAt: new Date()
        });
        
        // In production, save to database
        console.log(`📊 Tracked contact: ${data.business.name}`);
    }
    
    async handleEmailResponse(email, response) {
        // This would be called when a business responds to our email
        console.log(`📬 Received response from: ${email}`);
        
        // Analyze response sentiment and content
        const analysis = await this.analyzeEmailResponse(response);
        
        if (analysis.interested) {
            // Create demo chatbot
            await this.createDemoChatbot(email, analysis);
            
            // Send follow-up email with demo
            const followUpEmail = this.generateFollowUpEmail(analysis);
            await this.sendEmail(email, followUpEmail);
        }
    }
    
    async analyzeEmailResponse(response) {
        // Use AI to analyze if the business is interested
        const prompt = `Analyze this email response and determine if the business owner is interested in learning more about AI chatbots:

Email: "${response}"

Respond with JSON:
{
  "interested": true/false,
  "sentiment": "positive/neutral/negative",
  "key_points": ["point1", "point2"],
  "next_action": "demo/call/more_info/not_interested"
}`;

        try {
            const aiResponse = await this.callGeminiAPI(prompt);
            return JSON.parse(aiResponse);
        } catch (error) {
            console.error('Error analyzing email response:', error);
            return { interested: false, sentiment: 'neutral' };
        }
    }
    
    async createDemoChatbot(email, businessData) {
        // Create a demo chatbot based on the business information
        console.log(`🤖 Creating demo chatbot for: ${email}`);
        
        // This would integrate with the main chatbot creation system
        const demoConfig = {
            name: businessData.businessName + ' Assistant',
            businessType: businessData.businessType,
            demoMode: true,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        
        // Generate demo URL
        const demoUrl = `https://demo.wwwww.ai/${this.generateDemoId()}`;
        
        return demoUrl;
    }
    
    generateDemoId() {
        return 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async callGeminiAPI(prompt) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Analytics and reporting
    generateReport() {
        const report = {
            totalBusinessesContacted: this.contactedBusinesses.size,
            responseRate: this.calculateResponseRate(),
            conversionRate: this.calculateConversionRate(),
            topPerformingLocations: this.getTopLocations(),
            topPerformingBusinessTypes: this.getTopBusinessTypes()
        };
        
        console.log('📊 Email Agent Report:', report);
        return report;
    }
    
    calculateResponseRate() {
        // Calculate percentage of businesses that responded
        let responses = 0;
        for (const [id, data] of this.contactedBusinesses) {
            if (data.responded) responses++;
        }
        return (responses / this.contactedBusinesses.size) * 100;
    }
    
    calculateConversionRate() {
        // Calculate percentage that became customers
        let conversions = 0;
        for (const [id, data] of this.contactedBusinesses) {
            if (data.status === 'converted') conversions++;
        }
        return (conversions / this.contactedBusinesses.size) * 100;
    }
    
    getTopLocations() {
        const locationStats = {};
        for (const [id, data] of this.contactedBusinesses) {
            const location = data.location;
            locationStats[location] = (locationStats[location] || 0) + 1;
        }
        return Object.entries(locationStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
    
    getTopBusinessTypes() {
        const typeStats = {};
        for (const [id, data] of this.contactedBusinesses) {
            const type = data.businessType;
            typeStats[type] = (typeStats[type] || 0) + 1;
        }
        return Object.entries(typeStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WWWWWEmailAgent;
}

// Usage example:
// const emailAgent = new WWWWWEmailAgent();
// emailAgent.startEmailCampaign();
