// 1. Import the Firebase tools we need from Google's servers
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. Security Check: Make sure they actually picked a nickname first
const currentUsername = localStorage.getItem('savedUsername');
if (!currentUsername) {
    window.location.href = 'index.html';
}

// 3. YOUR FIREBASE CONFIGURATION (Paste your real keys from your Firebase tab here!)
const firebaseConfig = {
    apiKey: "AIzaSyAI0dqurlrTM-aeWgc2kjtJNzkkaktu6Tg",
    authDomain: "cloud-chat-6417e.firebaseapp.com",
    projectId: "cloud-chat-6417e",
    storageBucket: "cloud-chat-6417e.firebasestorage.app",
    messagingSenderId: "317091363884",
    appId: "1:317091363884:web:e38110aa7375eeaae46589"
};

// 4. Wake up Firebase and connect to the database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesCollection = collection(db, "messages");

// 5. FIND OUR HTML ELEMENTS
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const messageContainer = document.getElementById('message-container');

// 6. SENDING MESSAGES: What happens when you hit the "Send" button?
chatForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Stop page from refreshing
    
    const messageText = msgInput.value.trim();
    if (messageText === "") return;

    try {
        // Drop the message data straight into the cloud filing cabinet
        await addDoc(messagesCollection, {
            sender: currentUsername,
            text: messageText,
            timestamp: Date.now() // Saves exact time so messages stay in order
        });
        
        msgInput.value = ""; // Clear the text box so you can type again
    } catch (error) {
        console.error("Error sending message: ", error);
    }
});

// 7. RECEIVING MESSAGES: Listen to the cloud database in real-time!
const q = query(messagesCollection, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    messageContainer.innerHTML = ""; 

    snapshot.forEach((doc) => {
        const data = doc.data();
        const msgDiv = document.createElement('div');
        
        // --- NEW TIME FORMATTING LOGIC ---
        // Converts the long database number into a clean "11:35 PM" format
        let timeString = "";
        if (data.timestamp) {
            const date = new Date(data.timestamp);
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // ---------------------------------

        if (data.sender === currentUsername) {
            msgDiv.className = "message outgoing";
            msgDiv.innerHTML = `
                <p class="message-text">${data.text}</p>
                <span class="message-time">${timeString}</span>
            `;
        } else {
            msgDiv.className = "message incoming";
            msgDiv.innerHTML = `
                <span class="sender-name">${data.sender}</span>
                <p class="message-text">${data.text}</p>
                <span class="message-time">${timeString}</span>
            `;
        }
        
        messageContainer.appendChild(msgDiv);
    });

    messageContainer.scrollTop = messageContainer.scrollHeight;
});