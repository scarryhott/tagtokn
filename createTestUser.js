const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'test@example.com';
const password = 'Test123!';

// Create a new user
admin.auth().createUser({
  email: email,
  emailVerified: false,
  password: password,
  displayName: 'Test User',
  disabled: false
})
.then((userRecord) => {
  console.log('Successfully created new user:', userRecord.uid);
  console.log('Email:', email);
  console.log('Password:', password);
  process.exit(0);
})
.catch((error) => {
  if (error.code === 'auth/email-already-exists') {
    console.log('User already exists. You can use these credentials to log in:');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } else {
    console.error('Error creating new user:', error);
    process.exit(1);
  }
});
