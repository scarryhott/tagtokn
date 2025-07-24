# Firebase & Google Sheets Integration Setup Guide

This guide will help you set up Firebase database integration with automatic Google Sheets synchronization for the Hampton Blue Pools chatbot.

## 🔥 Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `hampton-blue-pools-chatbot`
4. Enable Google Analytics (optional)
5. Create project

### Step 2: Set Up Firestore Database
1. In your Firebase project, go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

### Step 3: Get Firebase Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (`</>`)
4. Register app name: `Hampton Blue Pools Chatbot`
5. Copy the `firebaseConfig` object

### Step 4: Update Firebase Configuration
1. Open `firebase-config.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## 📊 Google Sheets Integration Setup

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: `Hampton Blue Pools - Lead Database`
4. Copy the Sheet ID from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the `SHEET_ID_HERE` part

### Step 2: Create Google Apps Script
1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the content from `google-apps-script.js`
4. Update the `SPREADSHEET_ID` variable with your Sheet ID:

```javascript
const SPREADSHEET_ID = 'your-actual-sheet-id';
```

### Step 3: Deploy Apps Script as Web App
1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Description: "Hampton Blue Pools Sheets Integration"
4. Execute as: "Me"
5. Who has access: "Anyone"
6. Click "Deploy"
7. Copy the Web App URL

### Step 4: Update Sheets Integration
1. Open `sheets-integration.js`
2. Update the configuration:

```javascript
constructor() {
    this.sheetsWebAppUrl = 'your-web-app-url-here';
    this.isEnabled = true; // Enable integration
}
```

## 🔐 Security Configuration (Production)

### Firebase Security Rules
Update Firestore rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hamptonBluePoolsLeads/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Environment Variables (Recommended)
For production, move sensitive data to environment variables:

```javascript
// Use environment variables instead of hardcoded values
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    // ... other config
};
```

## 🧪 Testing the Integration

### Test Firebase Connection
1. Open the chatbot in your browser
2. Open browser console (F12)
3. Look for: `"Firebase integration initialized"`
4. Start a conversation and check for: `"Lead saved to Firebase"`

### Test Google Sheets Sync
1. Complete a conversation in the chatbot
2. Check your Google Sheet for new data
3. Look for console message: `"Lead successfully sent to Google Sheets"`

### Test Admin Panel
1. Open `admin.html`
2. Check for: `"✅ Connected to Firebase"`
3. Verify leads appear in real-time

## 📋 Data Structure

### Firebase Collection: `hamptonBluePoolsLeads`
```javascript
{
  sessionId: "unique-session-id",
  timestamp: "2024-01-01T00:00:00.000Z",
  createdAt: Timestamp,
  status: "complete" | "in_progress",
  location: "Southampton",
  timing: "As soon as possible",
  serviceNeeded: "maintenance",
  contactInfo: {
    phone: "631-555-0123",
    email: "user@example.com",
    preferred: "phone"
  },
  brandAlignment: true,
  conversationHistory: [
    { role: "user", content: "I need pool maintenance" },
    { role: "bot", content: "I can help with that!" }
  ]
}
```

### Google Sheets Columns
| Column | Description |
|--------|-------------|
| Timestamp | When lead was created |
| Session ID | Unique conversation identifier |
| Status | complete or in_progress |
| Location | Customer location |
| Timing | When service is needed |
| Service Needed | Type of service requested |
| Phone | Customer phone number |
| Email | Customer email address |
| Preferred Contact | phone or email |
| Eco-Friendly Interest | Yes/No |
| Conversation Length | Number of messages |
| Last Message | Preview of last message |

## 🚀 Features Enabled

✅ **Real-time Database**: Firebase Firestore with live updates  
✅ **Automatic Sheets Sync**: Every lead automatically added to Google Sheets  
✅ **Fallback System**: localStorage backup if Firebase fails  
✅ **Admin Dashboard**: Real-time lead monitoring  
✅ **Data Validation**: Phone/email validation before saving  
✅ **Session Tracking**: Unique session IDs for each conversation  
✅ **Status Management**: Track lead completion status  

## 🔧 Troubleshooting

### Firebase Not Working
- Check browser console for errors
- Verify Firebase config values
- Ensure Firestore rules allow writes
- Check network connectivity

### Sheets Integration Not Working
- Verify Google Apps Script deployment
- Check Web App URL is correct
- Ensure script has proper permissions
- Test with a simple POST request

### Admin Panel Issues
- Check if Firebase scripts are loaded
- Verify admin.html includes firebase-config.js
- Look for JavaScript errors in console

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify all configuration values are correct
3. Test each component individually
4. Ensure all files are properly linked

The system includes comprehensive fallbacks, so even if Firebase/Sheets fail, the chatbot will continue working with localStorage backup.
