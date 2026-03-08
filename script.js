// Initialize Icons
lucide.createIcons();

// 1. Connection Setup (Replace with your actual URL and Key again)
const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';

// FIX: Renamed the variable to 'supabaseClient' and use 'window.supabase'
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Fetch Data for Home Page ---
async function loadSkills() {
    const grid = document.getElementById('skills-grid');
    if (!grid) return; // Only run on index.html

    // FIX: Using supabaseClient
    const { data: skills, error } = await supabaseClient.from('skills').select('*');
    
    if (error) {
        console.error("Error fetching skills:", error);
        return;
    }

    grid.innerHTML = skills.map(skill => `
        <div class="skill-card">
            <span class="badge" style="font-size:0.75rem; color:#8b5cf6; background:#f5f3ff; padding:4px 8px; border-radius:4px;">${skill.category}</span>
            <h3 style="margin-top: 10px">${skill.title}</h3>
            <p style="color: #6b7280; margin: 10px 0">${skill.bio || 'No description provided.'}</p>
            <div style="display: flex; align-items: center; gap: 8px; border-top: 1px solid #eee; padding-top: 15px">
                <div style="width: 30px; height: 30px; border-radius: 50%; background: #ddd; display:flex; justify-content:center; align-items:center;">
                    <i data-lucide="user" style="width:16px;"></i>
                </div>
                <span style="font-weight: 600; font-size: 0.9rem">${skill.author_name || 'Anonymous'}</span>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// --- Auth Logic for Login Page ---
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // FIX: Using supabaseClient
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Login failed: " + error.message);
    } else {
        alert("Success! Redirecting...");
        window.location.href = "index.html";
    }
}

// --- Auth Logic for Signup Page ---
async function handleSignup(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        alert("Password does not meet the requirements. Please ensure it has 8+ characters, an uppercase letter, a lowercase letter, and a number.");
        return;
    }

    // FIX: Using supabaseClient
    const { data: existingUser, error: checkError } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

    if (existingUser) {
        alert("That username is already taken! Please choose another one.");
        return;
    }

    // FIX: Using supabaseClient
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (authError) {
        alert("Signup error: " + authError.message);
        return;
    }

    if (authData.user) {
        // FIX: Using supabaseClient
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([
                { id: authData.user.id, email: email, username: username }
            ]);

        if (profileError) {
            console.error("Error saving profile details:", profileError);
            alert("Account created, but there was an error saving your username.");
            return;
        }

        alert("Account created successfully! You can now log in.");
        window.location.href = "login.html";
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', loadSkills);

// --- Manual Auth Logic for Login Page ---
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    // Get the values the user typed in
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Ask our custom table for a row matching BOTH the email and password
    const { data, error } = await supabaseClient
        .from('custom_users')
        .select('*')
        .eq('email', email)
        .eq('password', password);

    if (error) {
        console.error("Database error:", error);
        alert("An error occurred connecting to the database.");
        return;
    }

    // Check if the database handed back exactly 1 matching row
    if (data && data.length > 0) {
        const loggedInUser = data[0]; // Grab the user's details
        
        alert(`Welcome back, ${loggedInUser.username}!`);
        
        // Save the username to the browser so the Home page knows who is logged in
        localStorage.setItem('currentUser', loggedInUser.username);
        
        // Send them to the home page
        window.location.href = "index.html";
    } else {
        // If the array is empty, no match was found
        alert("Invalid email or password!");
    }
}
