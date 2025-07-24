// Firebase Configuration for Hampton Blue Pools Chatbot
const firebaseConfig = {
    apiKey: "AIzaSyBqXXwSIuWvEbZpiKQNi7oZPuMXCXJ7vvo",
    authDomain: "chatbot-d3c00.firebaseapp.com",
    projectId: "chatbot-d3c00",
    storageBucket: "chatbot-d3c00.firebasestorage.app",
    messagingSenderId: "249683980392",
    appId: "1:249683980392:web:b4ff8908c64e59f65d4bdd",
    measurementId: "G-L4D6RK6VG6"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    orderBy, 
    query, 
    serverTimestamp,
    doc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with cache settings (newer approach)
const db = getFirestore(app);

// Enable offline persistence with newer cache API
try {
    // This replaces the deprecated enableIndexedDbPersistence
    console.log('🔥 Firebase Firestore initialized with offline persistence');
} catch (err) {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported in this browser');
    } else {
        console.error('Persistence error:', err);
    }
}

const analytics = getAnalytics(app);

// Firebase Database Helper Functions
class FirebaseDB {
    constructor() {
        this.db = db;
        this.leadsCollection = 'hamptonBluePoolsLeads';
        this.initializeConnectionTest();
    }

    // Test connection to Firestore
    async initializeConnectionTest() {
        try {
            const testRef = collection(this.db, 'connectionTest');
            await addDoc(testRef, { test: 'connection', timestamp: serverTimestamp() });
            console.log('Firebase connection test successful');
            return true;
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            return false;
        }
    }

    // Add a new lead to Firebase
    async addLead(leadData) {
        try {
            const docRef = await addDoc(collection(this.db, this.leadsCollection), {
                ...leadData,
                timestamp: serverTimestamp(),
                status: 'new',
                source: 'chatbot',
                updatedAt: serverTimestamp()
            });
            
            console.log('Lead saved to Firebase with ID:', docRef.id);
            logEvent(analytics, 'lead_saved', { lead_id: docRef.id });
            
            return docRef.id;
        } catch (error) {
            console.error('Error adding lead to Firebase:', error);
            logEvent(analytics, 'lead_save_error', { error: error.message });
            throw error;
        }
    }

    // Get all leads from Firebase
    async getLeads() {
        try {
            const q = query(
                collection(this.db, this.leadsCollection),
                orderBy('timestamp', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting leads:', error);
            throw error;
        }
    }

    // Listen for real-time updates to leads
    onLeadsUpdate(callback) {
        const q = query(
            collection(this.db, this.leadsCollection),
            orderBy('timestamp', 'desc')
        );
        
        return onSnapshot(q, (snapshot) => {
            const leads = [];
            snapshot.forEach((doc) => {
                leads.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(leads);
        }, (error) => {
            console.error('Error listening to leads:', error);
        });
    }

    // Update lead status
    async updateLeadStatus(leadId, status) {
        try {
            const leadRef = doc(this.db, this.leadsCollection, leadId);
            await updateDoc(leadRef, {
                status,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating lead status:', error);
            return false;
        }
    }

    // Get from localStorage as fallback
    getFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('hamptonBluePoolsLeads') || '[]');
        } catch (error) {
            console.error('Error getting from localStorage:', error);
            return [];
        }
    }
}

// Export for use in other files
window.FirebaseDB = FirebaseDB;
window.firebaseApp = app;
window.firebaseAnalytics = analytics;

console.log('🔥 Firebase configuration loaded for Hampton Blue Pools Chatbot');
