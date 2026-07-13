// 1. FIREBASE CONFIGURATION & IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, setDoc, getDoc, doc, updateDoc,
    query, where, orderBy, onSnapshot, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// This import is here for push notifications!
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// My EXACT FIREBASE CONFIG BLOCKS ARE HERE!
const firebaseConfig = {
    apiKey: "AIzaSyAI0dqurlrTM-aeWgc2kjtJNzkkaktu6Tg",
    authDomain: "cloud-chat-6417e.firebaseapp.com",
    projectId: "cloud-chat-6417e",
    storageBucket:"cloud-chat-6417e.firebasestorage.app",
    messagingSenderId: "317091363884",
    appId: "1:317091363884:web:e38110aa7375eeaae46589"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// 2. DOM ELEMENTS (Getting HTML items)
const messageContainer = document.getElementById("message-container");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const myUsernameDisplay = document.getElementById("my-username-display");
const currentRoomTitle = document.getElementById("current-room-title");
const chatTypeSubtitle = document.getElementById("chat-type-subtitle");
const userSearchInput = document.getElementById("user-search-input");
const searchResults = document.getElementById("search-results");
const activeDmList = document.getElementById("active-dm-list");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const roomItems = document.querySelectorAll(".room-item");
const muteBtn = document.getElementById('mute-btn');

// 3. STATE VARIABLES (App settings while running)
let currentUsername = localStorage.getItem("username");
let currentRoom = "general"; // Default public room
let activeUnsubscribe = null; // Keeps track of our live database listener

// --- EXCLUSIVE USERNAME PROTECTION SYSTEM ---
async function verifyAndRegisterUser() {
    if (!currentUsername) {
        window.location.href = "index.html";
        return;
    }

    // Clean up username formatting
    currentUsername = currentUsername.trim().toLowerCase();
    myUsernameDisplay.textContent = `@${currentUsername}`;

    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = "dev_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("deviceId", deviceId);
    }

    const userDocRef = doc(db, "users", currentUsername);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const existingData = userDocSnap.data();
        // If the username exists, but the browser's deviceId doesn't match, block them!
        if (existingData.deviceId !== deviceId) {
            alert("❌ Username is already taken! Please go back and choose a different nickname.");
            localStorage.removeItem("username");
            window.location.href = "index.html";
            return;
        }
    } else {
        // If the username is totally new, register it to this device in the cloud!
        await setDoc(userDocRef, {
            username: currentUsername,
            deviceId: deviceId,
            lastActive: Date.now()
        });
    }

    // Everything is safe! Start listening for messages.
    checkIfRoomIsMuted(currentRoom);
}

// Execute the safety check immediately when the dashboard loads
verifyAndRegisterUser();

// Trigger the notification setup right after the user successfully passes safety checks
setupPushNotifications();

// 4. REAL-TIME MESSAGE STREAM ENGINE
function listenForMessages() {
    // If we are already listening to a room, turn it off before switching rooms
    if (activeUnsubscribe) {
        activeUnsubscribe();
    }

    const messagesCollection = collection(db, "messages");
    const q = query(
        messagesCollection, 
        where("room", "==", currentRoom),
        orderBy("timestamp", "asc")
    );

    // Start live tracking messages inside the current room
    activeUnsubscribe = onSnapshot(q, (snapshot) => {
        messageContainer.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();
            const msgDiv = document.createElement("div");

            // Timestamp cleaner formatting (e.g., "04:20 PM")
            let timeString = "";
            if (data.timestamp) {
                const date = new Date(data.timestamp);
                timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            if (data.sender === currentUsername) {
                msgDiv.className = "message outgoing";
                msgDiv.innerHTML = `
                    <p class="message-text">${data.text}</p>
                    <span class="message-time">${timeString}</span>
                `;
            } else {
                msgDiv.className = "message incoming";
                msgDiv.innerHTML = `
                    <span class="sender-name">@${data.sender}</span>
                    <p class="message-text">${data.text}</p>
                    <span class="message-time">${timeString}</span>
                `;
            }
            messageContainer.appendChild(msgDiv);
        });

        // Auto-scroll screen down to latest messages
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, (error) => {
        console.error("Firestore Error:", error);
    });
}


// 5. SENDING MESSAGES
messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textToSend = messageInput.value.trim();
    if (!textToSend) return;

    messageInput.value = ""; // Instantly clear input field for fluid typing

    try {
        await addDoc(collection(db, "messages"), {
            text: textToSend,
            sender: currentUsername,
            room: currentRoom,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error("Error sending message:", err);
    }
});


// 6. REAL-TIME USER SEARCH SEARCH BAR (For DMs)
userSearchInput.addEventListener("input", (e) => {
    const searchVal = e.target.value.trim().toLowerCase();
    
    if (!searchVal) {
        searchResults.classList.add("hidden");
        return;
    }

    // Query Firestore to find usernames starting with the input value
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", ">=", searchVal), where("username", "<=", searchVal + "\uf8ff"));

    onSnapshot(q, (snapshot) => {
        searchResults.innerHTML = "";
        let count = 0;

        snapshot.forEach((doc) => {
            const user = doc.data();
            // Don't show your own name in the search results
            if (user.username !== currentUsername) {
                count++;
                const div = document.createElement("div");
                div.textContent = `💬 @${user.username}`;
                div.addEventListener("click", () => startPrivateDM(user.username));
                searchResults.appendChild(div);
            }
        });

        if (count > 0) {
            searchResults.classList.remove("hidden");
        } else {
            searchResults.classList.add("hidden");
        }
    });
});


// 7. PRIVATE DM CREATION LOGIC (Deterministic Room IDs)
function startPrivateDM(targetUser) {
    searchResults.classList.add("hidden");
    userSearchInput.value = "";

    // The Alphabetical formula (Always generates the exact same room ID string for both users)
    const dmRoomId = currentUsername < targetUser 
        ? `dm_${currentUsername}_${targetUser}` 
        : `dm_${targetUser}_${currentUsername}`;

    currentRoom = dmRoomId;
    currentRoomTitle.textContent = `🔒 Chat with @${targetUser}`;
    chatTypeSubtitle.textContent = "Private Direct Message";

    // De-activate all public room visual highlights
    roomItems.forEach(i => i.classList.remove("active"));

    // Add target friend to the active DM side-list if they aren't already pinned there
    if (!document.getElementById(`dm-sidebar-${targetUser}`)) {
        const li = document.createElement("li");
        li.id = `dm-sidebar-${targetUser}`;
        li.textContent = `👤 @${targetUser}`;
        li.addEventListener("click", () => {
            currentRoom = dmRoomId;
            currentRoomTitle.textContent = `🔒 Chat with @${targetUser}`;
            chatTypeSubtitle.textContent = "Private Direct Message";
            document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
            li.classList.add("active");
            checkIfRoomIsMuted(currentRoom);
        });
        activeDmList.appendChild(li);
    }

    // Set this DM as visually active
    document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
    document.getElementById(`dm-sidebar-${targetUser}`).classList.add("active");

    // Close sidebar overlay automatically if user is browsing on phone
    sidebar.classList.remove("open");

    // Pull messages from the private cloud room
    checkIfRoomIsMuted(currentRoom);
}


// 8. SIDEBAR PUBLIC CHANNELS CLICKS SWITCHING
roomItems.forEach((item) => {
    item.addEventListener("click", () => {
        // Clear old highlights, select current item
        document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const roomSelected = item.getAttribute("data-room");
        currentRoom = roomSelected;
        currentRoomTitle.textContent = `# ${roomSelected}`;
        chatTypeSubtitle.textContent = "Public Global Room";

        sidebar.classList.remove("open"); // Mobile auto-close drawer
        listenForMessages();
    });
});


// 9. MOBILE MENU HAMBURGER DRAWER SWAP
menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

// Close search menu dropdown if user clicks anywhere outside of it
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
        searchResults.classList.add("hidden");
    }
});

// it's the UI for mute button
muteBtn.addEventListener('click', async () => {
    // Check what the current icon is
    const isCurrentlyMuted = muteBtn.innerText === '🔕';

    if (isCurrentlyMuted) {
        // UNMUTE: Change back to bell
        muteBtn.innerText = '🔔';
        muteBtn.title = 'Mute Room';
        await updateMuteStatusInDatabase(false);
    } else {
        //MUTE: Change to silenced bell
        muteBtn.innerText = '🔕';
        muteBtn.title = 'Unmute Room';
        await updateMuteStatusInDatabase(true);
    }
});

async function updateMuteStatusInDatabase(isMuting) {
    try {
        // v10 Syntax to target the specific user
        const userRef = doc(db, 'users', currentUsername);

        if (isMuting) {
            await updateDoc(userRef, {
                mutedRooms: arrayUnion(currentRoom)
            });
            console.log(`Muted room: ${currentRoom}`);
        } else {
            await updateDoc(userRef, {
                mutedRooms: arrayRemove(currentRoom)
            });
            console.log(`Unmuted room: ${currentRoom}`);
        } 
    } catch (error) {
        console.error("Error updating mute status: ", error);
        muteBtn.innerText = isMuting ? '🔔' : '🔕'; // Revert if it fails
    }
}

async function checkIfRoomIsMuted(roomId) {
    try {
        const userRef = doc(db, 'users', currentUsername);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check if the array exists and includes the room
            if (userData.mutedRooms && userData.mutedRooms.includes(roomId)) {
                muteBtn.innerText = '🔕';
                muteBtn.title = 'Unmute Room';
            } else {
                muteBtn.innerText = '🔔';
                muteBtn.title = 'Mute Room';
            }
        }
    } catch (error) {
        console.error("Error checking mute status:", error);
    }
}

async function setupPushNotifications() {
    try {
        // 1. Request permission from the user
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
        return;
        }

        // 2. Get the unique device token from Firenase cosnole!
        const token = await getToken(messaging);

        if (token) {
            console.log ("FCM Device Token Generated:", token);

            // 3. Save this token directly into the user's Firestore document
            const userRef = doc(db, 'users', currentUsername);
            await updateDoc(userRef, {
                fcmToken: token
            });
        } else {
        console.log('No registration token available. Request permission to generate one.');
        }
    } catch (error) {
        console.error('An error occured while setting up notifications:', error);
    }
}
// Listen for messages while the app is actively OPEN in the foreground
onMessage(messaging, (payload)=> {
    console.log('Forground message received:', payload);
    // You can choose to skip showing a banner popup if they are already looking at the chat!
})