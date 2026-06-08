// Firebase CDN Native ES Integration Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4vBm4STwbUvTGlvxOtWNIqyLvTT5ht2E",
  authDomain: "bhai-bhai-somiti.firebaseapp.com",
  databaseURL: "https://bhai-bhai-somiti-default-rtdb.firebaseio.com",
  projectId: "bhai-bhai-somiti",
  storageBucket: "bhai-bhai-somiti.firebasestorage.app",
  messagingSenderId: "163524207732",
  appId: "1:163524207732:web:507913c067bcfca3049d21",
  measurementId: "G-M3K5W1FP4V"
};

// Expose standard configuration configuration globally for app.js standard scripting
window.firebaseConfig = firebaseConfig;
console.log("Firebase Standalone configuration embedded.");
