// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================

lucide.createIcons();

const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. HOME PAGE LOGIC
// ==========================================

async function loadSkills() {
    const grid = document.getElementById('skills-grid');
    if (!grid) return; 

    const { data: skills, error } = await supabaseClient.from('skills').select('*').order('created_at', { ascending: false });
    
    if (error) {
        grid.innerHTML = `<p>Error loading skills. Please try again later.</p>`;
        return;
    }

    if (!skills || skills.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #6b7280;">No skills posted yet. Be the first!</p>`;
        return;
    }

    grid.innerHTML = skills.map(skill => `
        <div class="skill-card" style="border: 1px solid #eee; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <span class="badge" style="font-size:0.75rem; color:#8b5cf6; background:#f5f3ff; padding:4px 8px; border-radius:4px;">${skill.category}</span>
            <h3 style="margin-top: 10px">${skill.title}</h3>
            <p style="color: #6b7280; margin: 10px 0">${skill.description || 'No description provided.'}</p>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================

let isLoginMode = true;

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const msgBox = document.getElementById('auth-message');

    if (!signinForm || !signupForm) return;

    if (msgBox) msgBox.style.display = 'none';

    if (isLoginMode) {
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Enter your details to sign in';
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = 'Sign up';
    } else {
        signinForm.style.display = 'none';
        signupForm.style.display = 'block';
        authTitle.innerText = 'Create an Account';
        authSubtitle.innerText = 'Join the community to start swapping skills';
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = 'Sign in';
    }
}

function showAuthMessage(message, isError = true) {
    const msgBox = document.getElementById('auth-message');
    if (!msgBox) return;
    msgBox.innerText = message;
    msgBox.className = isError ? 'auth-message error' : 'auth-message success';
    msgBox.style.display = 'block';
}

async function handleSignUp(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        showAuthMessage("Password requires 8+ chars, 1 uppercase, 1 lowercase, and 1 number.");
        return;
    }

    const { data: existingUsers } = await supabaseClient.from('app_users').select('*').or(`username.eq.${username},email.eq.${email}`);

    if (existingUsers && existingUsers.length > 0) {
        showAuthMessage("That username or email is already taken.");
        return;
    }

    const { data: newUser, error: insertError } = await supabaseClient.from('app_users').insert([{ email, username, password }]).select().single();

    if (insertError) {
        showAuthMessage("Error creating account. Please try again.");
        return;
    }

    if (newUser) {
        await supabaseClient.from('profiles').insert([{ user_id: newUser.id }]);
    }

    document.getElementById('signup-form').reset();
    showAuthMessage("Account created successfully! Please sign in.", false);
    toggleAuthMode(); 
}

async function handleSignIn(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    const { data, error } = await supabaseClient.from('app_users').select('*').eq('email', email).eq('password', password);

    if (error || !data || data.length === 0) {
        showAuthMessage("Invalid email or password.");
        return;
    }

    const user = data[0];
    localStorage.setItem('currentUserId', user.id);
    localStorage.setItem('currentUser', user.username);
    window.location.href = "index.html";
}


// ==========================================
// 4. UI LOGIC (Dropdowns & Session)
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
        loggedOutUI.style.display = 'none';
        loggedInUI.style.display = 'flex';
        
        if (avatarInitial) avatarInitial.innerText = currentUser.charAt(0).toUpperCase();
        if (avatarBtn) avatarBtn.title = `Logged in as ${currentUser}`;
        if (dropdownUsername) dropdownUsername.innerText = currentUser;
    } else {
        loggedOutUI.style.display = 'block';
        loggedInUI.style.display = 'none';
    }
}

function toggleDropdown(event) {
    event.stopPropagation(); 
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

window.onclick = function(event) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
}

function handleLogout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
}

// ==========================================
// 5. PROFILE PAGE LOGIC
// ==========================================

async function loadUserProfile() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
        window.location.href = 'auth.html';
        return;
    }

    const { data: user } = await supabaseClient.from('app_users').select('username').eq('id', userId).single();
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', userId).single();

    if (user) {
        document.getElementById('profile-page-name').innerText = user.username;
        const initialDiv = document.getElementById('profile-page-initial');
        if (!profile || !profile.avatar_url) {
            initialDiv.innerText = user.username.charAt(0).toUpperCase();
            initialDiv.style.display = 'flex';
        }
    }

    if (profile) {
        document.getElementById('profile-headline').innerText = profile.headline || "";
        document.getElementById('profile-location').innerText = profile.location || "";
        document.getElementById('profile-bio').innerText = profile.bio || "";
        
        const bannerImg = document.getElementById('profile-banner-img');
        if (profile.banner_url) {
            bannerImg.style.display = 'block';
            bannerImg.src = profile.banner_url;
            bannerImg.parentElement.style.backgroundColor = 'transparent';
        } else {
            bannerImg.style.display = 'none'; 
            bannerImg.parentElement.style.backgroundColor = '#d1d5db'; 
        }

        const imgElement = document.getElementById('profile-avatar-img');
        if (profile.avatar_url) {
            document.getElementById('profile-page-initial').style.display = 'none';
            imgElement.style.display = 'block';
            imgElement.src = profile.avatar_url;
        } else {
            imgElement.style.display = 'none';
        }

        const skillsContainer = document.getElementById('profile-skills-container');
        if (profile.profile_skills) {
            const skillsArray = profile.profile_skills.split(',');
            skillsContainer.innerHTML = skillsArray.map(skill => 
                skill.trim() !== "" ? `<span class="skill-tag">${skill.trim()}</span>` : ""
            ).join('');
        } else {
            skillsContainer.innerHTML = "";
        }
    }
}

// --- CUSTOM MODAL LOGIC ---
function closeModal() {
    const modal = document.getElementById('custom-edit-modal');
    if (modal) modal.style.display = 'none';
}

function editProfileField(fieldName, promptMessage) {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const modal = document.getElementById('custom-edit-modal');
    const title = document.getElementById('modal-title');
    const input = document.getElementById('modal-input');
    const saveBtn = document.getElementById('modal-save-btn');

    if (!modal) return;

    title.innerText = promptMessage;
    input.value = ''; 
    modal.style.display = 'flex';

    saveBtn.onclick = async function() {
        const newValue = input.value.trim();
        closeModal();

        if (newValue === "" && fieldName === 'username') {
            console.error("Username cannot be empty");
            return; 
        }

        if (fieldName === 'username') {
            const { error } = await supabaseClient.from('app_users').update({ username: newValue }).eq('id', userId);
            if (!error) {
                localStorage.setItem('currentUser', newValue);
                updateUIForUser(); 
                loadUserProfile(); 
            }
        } else {
            const { error } = await supabaseClient.from('profiles').update({ [fieldName]: newValue }).eq('user_id', userId);
            if (!error) {
                loadUserProfile(); 
            }
        }
    };
}

// ==========================================
// 6. RUN ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSkills();
    updateUIForUser();
    
    if (document.getElementById('profile-page-name')) {
        loadUserProfile();
    }
});
