// FOR SCRIPT.JS
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Stop page refresh
    
    // 1. Grab the exact text the user typed into the username box
    const typedUsername = document.getElementById('username').value;
    
    // 2. Write it on the browser's "sticky note" using the EXACT key chat.js expects
    localStorage.setItem('username', typedUsername);
    
    // 3. Go to the chat room safely
    window.location.href = 'chat.html';
});