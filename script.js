// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================

// Initialize Lucide Icons
lucide.createIcons();

// Replace these with your actual Supabase URL and anon public key
const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';

// Create the Supabase connection
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ==========================================
// 2. HOME PAGE LOGIC (index.html)
// ==========================================

async function loadSkills() {
    const grid = document.getElementById('skills-grid');
    // If we aren't on the home page (no grid found), stop running this function
    if (!grid) return; 

    // Fetch skills from the database
    const { data: skills, error } = await supabaseClient
        .from('skills')
        .select('*')
        .order('created_at', { ascending: false }); // Show newest first
    
    if (error) {
        console.error("Error fetching skills:", error);
        grid.innerHTML = `<p>Error loading skills. Please try again later.</p>`;
        return;
    }

    if (!skills || skills.length === 0) {
        grid.innerHTML = `<p>No skills posted yet. Be the first!</p>`;
        return;
    }

    // Inject the skills into the HTML
    grid.innerHTML = skills.map(skill => `
        <div class="skill-card" style="border: 1px solid #eee; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <span class="badge" style="font-size:0.75rem; color:#8b5cf6; background:#f5f3ff; padding:4px 8px; border-radius:4px;">${skill.category}</span>
            <h3 style="margin-top: 10px">${skill.title}</h3>
            <p style="color: #6b7280; margin: 10px 0">${skill.description || 'No description provided.'}</p>
        </div>
    `).join('');
    
    // Re-initialize icons for the newly added HTML
    lucide.createIcons();
}


// ==========================================
// 3. AUTHENTICATION UI TOGGLE (auth.html)
// ==========================================

let isLoginMode = true;

// Swaps the form between Sign In and Sign Up modes
function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');

    // Make sure we are actually on the auth page before trying to change things
    if (!signinForm || !signupForm) return;

    if (isLoginMode) {
        // Show Login UI
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Enter your details to sign in';
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = 'Sign up';
    } else {
        // Show Sign Up UI
        signinForm.style.display = 'none';
        signupForm.style.display = 'block';
        authTitle.innerText = 'Create an Account';
        authSubtitle.innerText = 'Join the community to start swapping skills';
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = 'Sign in';
    }
}


// ==========================================
// 4. MANUAL SIGN UP LOGIC (auth.html)
// ==========================================

async function handleSignUp(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;

    // Password Rules Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        alert("Password must be at least 8 characters long, and include an uppercase letter, a lowercase letter, and a number.");
        return;
    }

    // Check if username or email is already taken in 'app_users'
    const { data: existingUsers, error: checkError } = await supabaseClient
        .from('app_users')
        .select('*')
        .or(`username.eq.${username},email.eq.${email}`);

    if (checkError) {
        console.error("Database error during validation:", checkError);
        return;
    }

    if (existingUsers && existingUsers.length > 0) {
        alert("That username or email is already taken! Please choose another.");
        return;
    }

    // Insert new user into 'app_users' table
    const { data: newUser, error: insertError } = await supabaseClient
        .from('app_users')
        .insert([{ email: email, username: username, password: password }])
        .select() // Ask Supabase to return the data it just inserted
        .single();

    if (insertError) {
        alert("Error creating account: " + insertError.message);
        return;
    }

    // Link a blank profile to the new user in the 'profiles' table
    if (newUser) {
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([{ user_id: newUser.id }]);
            
        if (profileError) {
            console.error("Warning: Profile link failed, but user was created.", profileError);
        }
    }

    alert("Account created successfully! Please sign in with your new credentials.");
    
    // Clear the form and flip back to the Sign In view
    document.getElementById('signup-form').reset();
    toggleAuthMode(); 
}


// ==========================================
// 5. MANUAL SIGN IN LOGIC (auth.html)
// ==========================================

async function handleSignIn(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    // Ask the 'app_users' table if these exact credentials exist
    const { data, error } = await supabaseClient
        .from('app_users')
        .select('*')
        .eq('email', email)
        .eq('password', password);

    if (error) {
        console.error("Database error during login:", error);
        alert("An error occurred. Please try again.");
        return;
    }

    // If a match is found, log them in
    if (data && data.length > 0) {
        const user = data[0];
        
        // Save user data locally so the browser remembers they are logged in
        localStorage.setItem('currentUserId', user.id);
        localStorage.setItem('currentUser', user.username);
        
        alert(`Sign in successful! Welcome back, ${user.username}!`);
        window.location.href = "index.html";
    } else {
        alert("Invalid email or password. Please try again.");
    }
}


// ==========================================
// DYNAMIC UI & DROPDOWN LOGIC
// ==========================================

function updateUIForUser() {
    const loggedOutUI = document.getElementById('logged-out-ui');
    const loggedInUI = document.getElementById('logged-in-ui');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const avatarInitial = document.getElementById('avatar-initial');
    const dropdownUsername = document.getElementById('dropdown-username');

    if (!loggedOutUI || !loggedInUI) return;

    const currentUser = localStorage.getItem('currentUser');

    if (currentUser) {
        // User IS logged in
        loggedOutUI.style.display = 'none';
        loggedInUI.style.display = 'flex';
        
        // Put the first letter of their name in the orange circle (capitalized)
        if (avatarInitial) avatarInitial.innerText = currentUser.charAt(0).toUpperCase();
        
        // This creates the hover effect with basic info
        if (avatarBtn) avatarBtn.title = `Logged in as ${currentUser}`;
        
        // Put their full name in the dropdown header
        if (dropdownUsername) dropdownUsername.innerText = currentUser;
    } else {
        // User is NOT logged in
        loggedOutUI.style.display = 'block';
        loggedInUI.style.display = 'none';
    }
}

// Shows/Hides the dropdown when the avatar is clicked
function toggleDropdown(event) {
    event.stopPropagation(); // Stops the click from immediately hiding it again
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

// Automatically close the dropdown if the user clicks anywhere else on the page
window.onclick = function(event) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
}

function handleLogout() {
    // Clear the user from the browser's memory
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    
    // Refresh the page so the UI resets
    window.location.reload();
}


// ==========================================
// 6. RUN ON PAGE LOAD
// ==========================================

// When the HTML is fully loaded, trigger the initial functions
document.addEventListener('DOMContentLoaded', () => {
    loadSkills();
    updateUIForUser();
});
