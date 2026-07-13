// Import the Firebase scripts required for background workers
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initializing Firebase inside the service worker
firebase.initializeApp({
    apiKey: "AIzaSyAI0dqurlrTM-aeWgc2kjtJNzkkaktu6Tg",
    authDomain: "cloud-chat-6417e.firebaseapp.com",
    projectId: "cloud-chat-6417e",
    storageBucket: "cloud-chat-6417e.firebasestorage.app",
    messagingSenderId: "317091363884",
    appId: "1:317091363884:web:e38110aa7375eeaae46589"
});

const messaging = firebase.messaging();

// This listens for messages when the browser tab is closed or minimized
messaging.onBackgroundMessage((payload) => {
    console.log('Background message received: ', payload);

    //Grab the notification details sent from the cloud
    const notificationTitle = payload.data.title || "New Message!";
    const notificationOptions = {
        body: payload.data.body || "You received a message on Squad Chat.",
        icon: 'icon.png', //I have to add an app logo of my app!
        tag: payload.data.room // Groups notification together by room
    };

    // Show the native notification popup on the phone/PC screen
    self.registration.showNotification(notificationTitle, notoficationOptions);
});