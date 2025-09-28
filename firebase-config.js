// Firebase Configuration


const firebaseConfig = {
    apiKey: "AIzaSyCEKi67AeT5VGDCCfu-eP0EyLM4NXdrdAQ",
    authDomain: "error404-37fd9.firebaseapp.com",
    projectId: "error404-37fd9",
    storageBucket: "error404-37fd9.firebasestorage.app",
    messagingSenderId: "637666754253",
    appId: "1:637666754253:web:6978eb993230f3b5d67384",
    measurementId: "G-LG5HXBE42P"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support all of the features required to enable persistence');
        }
    });

// Export for use in other files
window.auth = auth;
window.db = db;
