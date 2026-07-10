const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Stop page refresh
    
    // 1. Grab the exact text the user typed into the username box
    const typedUsername = document.getElementById('username').value;
    
    // 2. Write it on the browser's "sticky note" named 'savedUsername'
    localStorage.setItem('savedUsername', typedUsername);
    
    // 3. Go to the chat room
    window.location.href = 'chat.html';
});