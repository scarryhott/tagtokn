# Hampton Blue Pools - AI Chatbot with Firebase Integration

An intelligent, AI-powered chatbot for Hampton Blue Pools that integrates Google Gemini for natural language understanding, Firebase for real-time data storage, and automatic Google Sheets synchronization for lead management.

## 🚀 Features

### 🤖 **AI-Powered Conversations**
- **Google Gemini Integration**: Natural language understanding with context awareness
- **Smart Context Management**: Avoids repetitive responses using full conversation history
- **Website Database Search**: References actual Hampton Blue Pools services and information
- **Concise Responses**: Optimized for under 80 words per response

### 🔥 **Firebase Integration**
- **Real-time Database**: Firestore integration with live updates
- **Automatic Backup**: localStorage fallback if Firebase is unavailable
- **Session Management**: Unique session tracking for each conversation
- **Data Validation**: Phone number and email validation before storage

### 📊 **Google Sheets Sync**
- **Automatic Export**: Every lead automatically synced to Google Sheets
- **Structured Data**: Organized columns for easy CRM integration
- **Real-time Updates**: Instant data synchronization
- **Batch Operations**: Bulk sync capabilities

### 📱 **Admin Dashboard**
- **Real-time Monitoring**: Live lead updates without page refresh
- **Lead Analytics**: Statistics and status tracking
- **Conversation Preview**: Full chat history for each lead
- **Multi-source Data**: Works with Firebase or localStorage

### 🎯 **Lead Capture System**
- **5 W's Framework**: Location, Timing, Contact, Service, Brand Alignment
- **Smart Extraction**: Automatic phone/email detection from messages
- **Progressive Collection**: Builds information naturally through conversation
- **Contact Validation**: Ensures real phone numbers and emails are captured

## 📁 Project Structure

```
chatbot/
├── index.html                 # Main chatbot interface
├── admin.html                # Admin dashboard for lead management
├── chatbot.js                # Core chatbot logic with AI integration
├── styles.css                # Styling for chatbot interface
├── firebase-config.js        # Firebase configuration and database helpers
├── sheets-integration.js     # Google Sheets synchronization
├── google-apps-script.js     # Apps Script code for Sheets integration
├── FIREBASE_SETUP_GUIDE.md   # Detailed setup instructions
└── README.md                 # This file
```

## 🛠️ Setup Instructions

### Quick Start (localStorage only)
1. Open `index.html` in a web browser
2. Start chatting with the AI assistant
3. View leads in `admin.html`

### Full Setup (Firebase + Sheets)
1. **Follow the detailed setup guide**: See `FIREBASE_SETUP_GUIDE.md`
2. **Configure Firebase**: Update `firebase-config.js` with your project credentials
3. **Set up Google Sheets**: Deploy the Apps Script and update integration settings
4. **Test the integration**: Verify real-time sync is working

## ⚙️ Configuration

### Firebase Configuration
Update `firebase-config.js` with your Firebase project details:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... other config
};
```

### Google Sheets Integration
Update `sheets-integration.js` with your Web App URL:
```javascript
this.sheetsWebAppUrl = 'your-google-apps-script-web-app-url';
this.isEnabled = true;
```

### Gemini AI Configuration
The chatbot uses Google Gemini Pro API. The API key is currently hardcoded in `chatbot.js`:
```javascript
this.GEMINI_API_KEY = 'your-gemini-api-key';
```

**⚠️ Security Note**: For production, move the API key to environment variables or a secure backend proxy.

## 🎨 Customization

### Business Information
Update the business context in `chatbot.js`:
```javascript
this.businessContext = `You are a chatbot for Hampton Blue Pools...`;
this.websiteContent = {
    services: [...],
    areas: [...],
    // ... customize for your business
};
```

### Conversation Flow
Modify the conversation pillars and response logic:
- **Location detection**: Update area keywords
- **Service categories**: Add/modify service types
- **Brand alignment**: Customize eco-friendly messaging

### UI Styling
Customize the appearance in `styles.css`:
- Colors and branding
- Chat bubble styles
- Button designs
- Responsive layout

## 📊 Data Structure

### Lead Data Format
```javascript
{
  sessionId: "unique-session-id",
  timestamp: "ISO-date-string",
  status: "complete" | "in_progress",
  location: "customer-location",
  timing: "service-timing",
  serviceNeeded: "service-type",
  contactInfo: {
    phone: "phone-number",
    email: "email-address",
    preferred: "phone" | "email"
  },
  brandAlignment: boolean,
  conversationHistory: [
    { role: "user" | "bot", content: "message" }
  ]
}
```

## 🔧 Technical Details

### AI Integration
- **Model**: Google Gemini 2.5 Flash
- **Context Window**: Full conversation history + website data
- **Response Optimization**: Under 80 words, context-aware
- **Fallback System**: Rule-based responses if AI fails

### Database Architecture
- **Primary**: Firebase Firestore (real-time, scalable)
- **Backup**: localStorage (browser-based fallback)
- **Sync**: Automatic Google Sheets export
- **Session Management**: UUID-based session tracking

### Performance Features
- **Lazy Loading**: Scripts load as needed
- **Error Handling**: Graceful degradation
- **Real-time Updates**: Live admin dashboard
- **Caching**: Website content cached for faster responses

## 🚀 Deployment

### Local Development
1. Serve files from a local web server (required for ES6 modules)
2. Use tools like `python -m http.server` or `live-server`
3. Access via `http://localhost:port`

### Production Deployment
1. **Static Hosting**: Deploy to Netlify, Vercel, or GitHub Pages
2. **Security**: Move API keys to environment variables
3. **Firebase Rules**: Update Firestore security rules
4. **Domain Setup**: Configure custom domain and SSL

## 📈 Analytics & Monitoring

### Built-in Analytics
- Lead conversion rates
- Conversation completion status
- Popular service requests
- Geographic distribution

### Integration Options
- Google Analytics for web traffic
- Firebase Analytics for user behavior
- Custom dashboards via Google Sheets
- CRM integration via API

## 🔒 Security Considerations

### Production Security
- Move API keys to environment variables
- Implement Firebase Authentication
- Set up proper Firestore security rules
- Use HTTPS for all communications
- Validate all user inputs

### Data Privacy
- GDPR compliance considerations
- User consent for data collection
- Data retention policies
- Secure data transmission

## 🆘 Troubleshooting

### Common Issues
1. **Firebase not connecting**: Check config values and network
2. **Sheets not syncing**: Verify Apps Script deployment and permissions
3. **AI responses failing**: Check Gemini API key and quota
4. **Admin panel empty**: Ensure scripts are loaded and Firebase is configured

### Debug Mode
Enable console logging to troubleshoot:
```javascript
console.log('Debug: Firebase initialized:', this.firebaseDB);
```

## 📞 Support & Maintenance

### Regular Maintenance
- Monitor Firebase usage and costs
- Update Gemini API quotas as needed
- Review and clean old conversation data
- Update business information and services

### Feature Requests
The chatbot is designed to be extensible. Common enhancements:
- Voice input/output
- Multi-language support
- Advanced analytics
- CRM integrations
- Mobile app version

---

**Hampton Blue Pools Chatbot** - Powered by AI, backed by Firebase, synced with Google Sheets. 🏊‍♂️✨
