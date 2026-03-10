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
// 3. AUTHENTICATION LOGIC (SINGLE FORM)
// ==========================================

let isLoginMode = true;

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const msgBox = document.getElementById('auth-message');
    
    const usernameContainer = document.getElementById('username-container');
    const usernameInput = document.getElementById('auth-username');
    const passwordHint = document.getElementById('password-hint');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (msgBox) msgBox.style.display = 'none';

    if (isLoginMode) {
        // Switch to Sign In UI
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Enter your details to sign in';
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = 'Sign up';
        
        usernameContainer.style.display = 'none';
        usernameInput.removeAttribute('required'); // Remove required constraint
        passwordHint.style.display = 'none';
        submitBtn.innerText = 'Sign In';
    } else {
        // Switch to Sign Up UI
        authTitle.innerText = 'Create an Account';
        authSubtitle.innerText = 'Join the community to start swapping skills';
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = 'Sign in';
        
        usernameContainer.style.display = 'block';
        usernameInput.setAttribute('required', 'true'); // Enforce username
        passwordHint.style.display = 'block';
        submitBtn.innerText = 'Create Account';
    }
}

function showAuthMessage(message, isError = true) {
    const msgBox = document.getElementById('auth-message');
    if (!msgBox) return;
    msgBox.innerText = message;
    msgBox.className = isError ? 'auth-message error' : 'auth-message success';
    msgBox.style.display = 'block';
}

// Master handler that redirects the click to the correct function
async function handleAuthSubmit(event) {
    event.preventDefault(); 
    if (isLoginMode) {
        await handleSignIn();
    } else {
        await handleSignUp();
    }
}

async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;

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

    document.getElementById('auth-form').reset();
    showAuthMessage("Account created successfully! Please sign in.", false);
    toggleAuthMode(); 
}

async function handleSignIn() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

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
// 4. UI LOGIC & NAVBAR DROPDOWNS
// ==========================================

function getColorForUsername(username) {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
        '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
        '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

async function updateUIForUser() {
    const loggedOutUI = document.getElementById('logged-out-ui');
    const loggedInUI = document.getElementById('logged-in-ui');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const avatarInitial = document.getElementById('avatar-initial');
    const dropdownUsername = document.getElementById('dropdown-username');
    const navAvatarImg = document.getElementById('nav-avatar-img');

    if (!loggedOutUI || !loggedInUI) return;

    const currentUser = localStorage.getItem('currentUser');
    const currentUserId = localStorage.getItem('currentUserId');

    if (currentUser) {
        loggedOutUI.style.display = 'none';
        loggedInUI.style.display = 'flex';
        
        if (avatarBtn) avatarBtn.title = `Logged in as ${currentUser}`;
        if (dropdownUsername) dropdownUsername.innerText = currentUser;

        if (currentUserId) {
            const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', currentUserId).single();

            if (profile && profile.avatar_url && navAvatarImg) {
                if (avatarInitial) avatarInitial.style.display = 'none';
                navAvatarImg.src = profile.avatar_url;
                navAvatarImg.style.display = 'block';
                if (avatarBtn) {
                    avatarBtn.style.backgroundColor = 'transparent';
                    avatarBtn.style.border = '2px solid #22c55e'; 
                }
            } else {
                if (navAvatarImg) navAvatarImg.style.display = 'none';
                if (avatarInitial) {
                    avatarInitial.innerText = currentUser.charAt(0).toUpperCase();
                    avatarInitial.style.display = 'block';
                    if (avatarBtn) avatarBtn.style.backgroundColor = getColorForUsername(currentUser);
                }
            }
        }
    } else {
        loggedOutUI.style.display = 'block';
        loggedInUI.style.display = 'none';
    }
}

function toggleDropdown(event) {
    event.stopPropagation(); 
    const userDropdown = document.getElementById('user-dropdown');
    const connDropdown = document.getElementById('connections-dropdown');
    
    if (connDropdown) connDropdown.classList.remove('show'); 
    if (userDropdown) userDropdown.classList.toggle('show');
}

function toggleConnectionsDropdown(event) {
    event.stopPropagation(); 
    const userDropdown = document.getElementById('user-dropdown');
    const connDropdown = document.getElementById('connections-dropdown');
    
    if (userDropdown) userDropdown.classList.remove('show'); 
    if (connDropdown) {
        connDropdown.classList.toggle('show');
        if (connDropdown.classList.contains('show') && document.getElementById('connection-search').value === '') {
            loadTopConnections();
        }
    }
}

window.onclick = function(event) {
    const userDropdown = document.getElementById('user-dropdown');
    const connDropdown = document.getElementById('connections-dropdown');
    
    if (userDropdown && userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show');
    }
    if (connDropdown && connDropdown.classList.contains('show') && !event.target.closest('#connections-dropdown')) {
        connDropdown.classList.remove('show');
    }
}

function handleLogout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
}

// ==========================================
// 5. CONNECTIONS & SEARCH SYSTEM
// ==========================================

async function searchUsers(event) {
    const query = event.target.value.trim();
    const list = document.getElementById('connections-list');
    const currentUserId = localStorage.getItem('currentUserId');

    if (!query) {
        loadTopConnections();
        return;
    }

    list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">Searching...</p>`;

    const { data: users, error } = await supabaseClient
        .from('app_users')
        .select('id, username')
        .ilike('username', `${query}%`) 
        .neq('id', currentUserId)
        .order('username', { ascending: true })
        .limit(5);

    if (error || !users || users.length === 0) {
        list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">No users found.</p>`;
        return;
    }

    // Fetch all connections to know their current status
    const { data: myConnections } = await supabaseClient
        .from('connections')
        .select('requester_id, receiver_id, status')
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    // Map the connection status securely
    const connectionMap = {};
    if (myConnections) {
        myConnections.forEach(conn => {
            const otherId = conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id;
            if (conn.status === 'accepted') {
                connectionMap[otherId] = 'accepted';
            } else if (conn.status === 'pending') {
                connectionMap[otherId] = conn.requester_id == currentUserId ? 'pending_sent' : 'pending_received';
            }
        });
    }

    renderConnectionList(users, "Search Results", connectionMap);
}

async function loadTopConnections() {
    const list = document.getElementById('connections-list');
    const currentUserId = localStorage.getItem('currentUserId');
    
    list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">Loading connections...</p>`;

    // Only show ACCEPTED connections on the main list
    const { data: connections, error } = await supabaseClient
        .from('connections')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .limit(3);

    if (error || !connections || connections.length === 0) {
        list.innerHTML = `
            <p style="font-size: 0.85rem; font-weight: 600; color: #4b5563; margin: 0 0 10px 0;">Connections</p>
            <p style="text-align:center; font-size:0.85rem; color:#9ca3af; margin: 0;">No connections yet. Search to find people!</p>
        `;
        return;
    }

    const connectedUserIds = connections.map(conn => conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id);

    const { data: users } = await supabaseClient.from('app_users').select('id, username').in('id', connectedUserIds);

    // Build a mock map where everyone is 'accepted' for the top list
    const connectionMap = {};
    connectedUserIds.forEach(id => connectionMap[id] = 'accepted');

    renderConnectionList(users || [], "Frequent Connections", connectionMap);
}

function renderConnectionList(users, title, connectionMap = {}) {
    const list = document.getElementById('connections-list');
    let html = `<p style="font-size: 0.85rem; font-weight: 600; color: #4b5563; margin: 0 0 10px 0;">${title}</p>`;
    
    html += users.map(u => {
        const status = connectionMap[u.id];
        let actionHtml = '';

        if (status === 'accepted') {
            actionHtml = `<span style="font-size: 0.75rem; color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i> Connected</span>`;
        } else if (status === 'pending_sent') {
            actionHtml = `<span style="font-size: 0.75rem; color: #6b7280; font-weight: 500; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">Requested</span>`;
        } else if (status === 'pending_received') {
            actionHtml = `<button onclick="openRequestsModal()" class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">Review</button>`;
        } else {
            actionHtml = `<button onclick="connectWithUser(${u.id})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">Connect</button>`;
        }

        return `
            <div class="connection-item">
                <div class="connection-user-info">
                    <div class="connection-avatar" style="background-color: ${getColorForUsername(u.username)}">${u.username.charAt(0).toUpperCase()}</div>
                    <span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${u.username}</span>
                </div>
                ${actionHtml}
            </div>
        `;
    }).join('');

    list.innerHTML = html;
    lucide.createIcons(); 
}

async function connectWithUser(receiverId) {
    const currentUserId = localStorage.getItem('currentUserId');
    
    // Insert with status 'pending'
    await supabaseClient.from('connections').insert([{
        requester_id: currentUserId,
        receiver_id: receiverId,
        status: 'pending' 
    }]);

    // Silently refresh the search so the button turns into "Requested"
    searchUsers({ target: document.getElementById('connection-search') });
}

// --- NEW: MUTUAL REQUEST LOGIC ---
async function updateRequestsBadge() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    const { count } = await supabaseClient
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending');

    const badge = document.getElementById('requests-badge');
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function openRequestsModal() {
    const currentUserId = localStorage.getItem('currentUserId');
    const modal = document.getElementById('requests-modal');
    const list = document.getElementById('requests-modal-list');
    
    list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">Loading requests...</p>`;
    modal.style.display = 'flex';

    // Fetch pending requests where the current user is the receiver
    const { data: pendingRequests } = await supabaseClient
        .from('connections')
        .select('id, requester_id')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending');

    if (!pendingRequests || pendingRequests.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">You have no pending requests.</p>`;
        return;
    }

    const requesterIds = pendingRequests.map(req => req.requester_id);
    const { data: users } = await supabaseClient.from('app_users').select('id, username').in('id', requesterIds);

    list.innerHTML = pendingRequests.map(req => {
        const user = users.find(u => u.id === req.requester_id);
        if (!user) return '';
        return `
            <div class="connection-item">
                <div class="connection-user-info">
                    <div class="connection-avatar" style="background-color: ${getColorForUsername(user.username)}">${user.username.charAt(0).toUpperCase()}</div>
                    <span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${user.username}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="acceptRequest(${req.id})" class="btn-primary" style="padding: 4px 12px; font-size: 0.8rem;">Accept</button>
                    <button onclick="declineRequest(${req.id})" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem; border: 1px solid #d1d5db; background: white;">Decline</button>
                </div>
            </div>
        `;
    }).join('');
}

async function acceptRequest(connectionId) {
    await supabaseClient.from('connections').update({ status: 'accepted' }).eq('id', connectionId);
    openRequestsModal(); 
    loadTopConnections(); 
    updateRequestsBadge();
}

async function declineRequest(connectionId) {
    await supabaseClient.from('connections').delete().eq('id', connectionId);
    openRequestsModal(); 
    updateRequestsBadge();
}

function closeRequestsModal() {
    document.getElementById('requests-modal').style.display = 'none';
}

// ==========================================
// 6. PROFILE PAGE LOGIC 
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
            initialDiv.style.backgroundColor = getColorForUsername(user.username);
            initialDiv.style.display = 'flex';
        }
    }

    if (profile) {
        document.getElementById('profile-headline').innerText = profile.headline || "";
        document.getElementById('profile-location').innerText = profile.location || "Where are you based?";
        document.getElementById('profile-bio').innerText = profile.bio || "Tell us about yourself...";
        
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
        if (profile.profile_skills && profile.profile_skills.trim() !== "") {
            const skillsArray = profile.profile_skills.split(',');
            skillsContainer.innerHTML = skillsArray.map(skill => {
                const s = skill.trim();
                if (s !== "") {
                    return `
                    <span class="skill-tag" data-skill="${s}" style="display: flex; align-items: center; gap: 6px; cursor: grab;">
                        ${s}
                        <i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: #9ca3af;" onclick="removeSingleSkill('${s}')" title="Remove ${s}"></i>
                    </span>`;
                }
                return "";
            }).join('');
            lucide.createIcons(); 
            
            if (window.skillsSortable) window.skillsSortable.destroy();
            window.skillsSortable = new Sortable(skillsContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: async function () {
                    const newSkills = Array.from(skillsContainer.querySelectorAll('.skill-tag'))
                        .map(el => el.getAttribute('data-skill'))
                        .join(', ');
                    await supabaseClient.from('profiles').update({ profile_skills: newSkills }).eq('user_id', userId);
                }
            });
            
        } else {
            skillsContainer.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Display your skills...</p>`;
        }
    }
}

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
    input.placeholder = "Type here...";
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
            if (!error) loadUserProfile(); 
        }
    };
}

function addSingleSkill() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const modal = document.getElementById('custom-edit-modal');
    const title = document.getElementById('modal-title');
    const input = document.getElementById('modal-input');
    const saveBtn = document.getElementById('modal-save-btn');

    if (!modal) return;

    title.innerText = "Add a new skill";
    input.value = ''; 
    input.placeholder = "e.g., Penetration Testing, JavaScript...";
    modal.style.display = 'flex';

    saveBtn.onclick = async function() {
        const newSkill = input.value.trim();
        closeModal();

        if (newSkill === "") return;

        const { data: profile } = await supabaseClient.from('profiles').select('profile_skills').eq('user_id', userId).single();
        let updatedSkills = profile && profile.profile_skills ? profile.profile_skills : "";
        
        if (updatedSkills.length > 0) {
            const currentSkillsArray = updatedSkills.split(',').map(s => s.trim().toLowerCase());
            if (currentSkillsArray.includes(newSkill.toLowerCase())) return; 
            updatedSkills += `, ${newSkill}`;
        } else {
            updatedSkills = newSkill;
        }

        const { error } = await supabaseClient.from('profiles').update({ profile_skills: updatedSkills }).eq('user_id', userId);
        if (!error) loadUserProfile(); 
    };
}

async function removeSingleSkill(skillToRemove) {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const { data: profile } = await supabaseClient.from('profiles').select('profile_skills').eq('user_id', userId).single();
    if (profile && profile.profile_skills) {
        let skillsArray = profile.profile_skills.split(',').map(s => s.trim());
        skillsArray = skillsArray.filter(s => s !== skillToRemove && s !== "");
        const updatedSkills = skillsArray.join(', ');
        
        const { error } = await supabaseClient.from('profiles').update({ profile_skills: updatedSkills }).eq('user_id', userId);
        if (!error) loadUserProfile();
    }
}

// ==========================================
// 7. IMAGE UPLOAD & CROP LOGIC
// ==========================================

let cropper = null;
let currentImageField = ''; 

function openImageEditor(fieldName) {
    currentImageField = fieldName;
    
    document.getElementById('image-modal-title').innerText = fieldName === 'avatar_url' ? 'Update Profile Picture' : 'Update Banner';
    document.getElementById('image-editor-modal').style.display = 'flex';
    document.getElementById('image-source-options').style.display = 'block';
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('save-cropped-btn').style.display = 'none';
    document.getElementById('link-upload-input').value = '';
    
    if(cropper) { cropper.destroy(); cropper = null; }
}

function closeImageEditor() {
    document.getElementById('image-editor-modal').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
}

function loadFileIntoCropper(event) {
    const file = event.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    initCropper(url);
}

function loadLinkIntoCropper() {
    const url = document.getElementById('link-upload-input').value.trim();
    if(!url) return;
    initCropper(url);
}

function initCropper(imageUrl) {
    const imageElement = document.getElementById('image-to-crop');
    imageElement.crossOrigin = "anonymous"; 
    imageElement.src = imageUrl;
    
    document.getElementById('image-source-options').style.display = 'none';
    document.getElementById('cropper-container').style.display = 'block';
    document.getElementById('save-cropped-btn').style.display = 'block';

    const ratio = currentImageField === 'avatar_url' ? 1 / 1 : 4 / 1;

    if(cropper) cropper.destroy();
    cropper = new Cropper(imageElement, {
        aspectRatio: ratio,
        viewMode: 1, 
        background: false,
        zoomable: true,
        dragMode: 'move'
    });
}

async function saveCroppedImage() {
    if(!cropper) return;
    
    const saveBtn = document.getElementById('save-cropped-btn');
    saveBtn.innerText = "Uploading...";
    saveBtn.disabled = true;

    cropper.getCroppedCanvas().toBlob(async (blob) => {
        const userId = localStorage.getItem('currentUserId');
        const fileName = `${userId}_${currentImageField}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseClient.storage
            .from('images')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
            console.error("Upload failed:", uploadError);
            saveBtn.innerText = "Save Image";
            saveBtn.disabled = false;
            return;
        }

        const { data: urlData } = supabaseClient.storage.from('images').getPublicUrl(fileName);
        const finalUrl = urlData.publicUrl;

        await supabaseClient.from('profiles').update({ [currentImageField]: finalUrl }).eq('user_id', userId);

        closeImageEditor();
        loadUserProfile();
        updateUIForUser(); 
        
        saveBtn.innerText = "Save Image";
        saveBtn.disabled = false;
    }, 'image/jpeg');
}

// ==========================================
// 8. CERTIFICATES & PDF LOGIC
// ==========================================

let allCertificates = [];
let visibleCertsCount = 2; 

async function loadCertificates() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const { data: certs } = await supabaseClient
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false }); 

    allCertificates = certs || [];
    renderCertificatesUI();
}

function renderCertificatesUI() {
    const container = document.getElementById('profile-certificates-container');
    const actionsDiv = document.getElementById('cert-actions');
    const showMoreBtn = document.getElementById('cert-show-more-btn');
    const showAllBtn = document.getElementById('cert-show-all-btn');

    if (!container || !actionsDiv) return;

    if (allCertificates.length === 0) {
        container.innerHTML = `<p id="cert-placeholder" style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Add your certifications and licenses...</p>`;
        actionsDiv.style.display = 'none';
        return;
    }

    const visibleCerts = allCertificates.slice(0, visibleCertsCount);
    
    container.innerHTML = visibleCerts.map(cert => `
        <div class="cert-card-wrapper" data-id="${cert.id}" style="position: relative; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; width: 100%; display: flex; flex-direction: column; background: white; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div class="cert-actions-overlay" style="position: absolute; top: 10px; right: 10px; display: flex; gap: 8px; z-index: 10;">
                <button onclick="renameCertificate(${cert.id}, '${cert.title.replace(/'/g, "\\'")}')" class="icon-btn" style="background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.15); padding: 6px;" title="Rename">
                    <i data-lucide="pencil" style="width: 16px; height: 16px; color: #4b5563;"></i>
                </button>
                <button onclick="deleteCertificate(${cert.id})" class="icon-btn" style="background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.15); padding: 6px;" title="Delete">
                    <i data-lucide="x" style="width: 16px; height: 16px; color: #ef4444;"></i>
                </button>
            </div>
            <a href="${cert.pdf_url}" target="_blank" style="display: block; width: 100%; background: #f9fafb; text-align: center;">
                <img src="${cert.thumbnail_url}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-bottom: 1px solid #e5e7eb;" alt="${cert.title}">
            </a>
            <div style="padding: 15px; font-size: 1rem; font-weight: 500; text-align: center; color: #111827;">${cert.title}</div>
        </div>
    `).join('');

    lucide.createIcons(); 

    actionsDiv.style.display = 'flex';
    
    if (visibleCertsCount >= allCertificates.length) {
        showMoreBtn.style.display = 'none';
    } else {
        showMoreBtn.style.display = 'inline-block';
    }

    if (allCertificates.length > 2) {
        showAllBtn.style.display = 'inline-block';
    } else {
        showAllBtn.style.display = 'none';
    }
}

function showMoreCertificates() {
    visibleCertsCount += 2; 
    renderCertificatesUI();
}

async function uploadCertificate(event) {
    const file = event.target.files[0];
    if (!file || file.type !== "application/pdf") {
        console.error("Please select a valid PDF file.");
        return;
    }

    const modal = document.getElementById('custom-edit-modal');
    const titleEl = document.getElementById('modal-title');
    const inputEl = document.getElementById('modal-input');
    const saveBtn = document.getElementById('modal-save-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    titleEl.innerText = "Name your Certificate";
    inputEl.value = "";
    inputEl.placeholder = "e.g., AWS Cloud Practitioner";
    modal.style.display = 'flex';

    saveBtn.onclick = async function() {
        const title = inputEl.value.trim();
        if (!title) return; 
        
        closeModal();
        await processAndUploadCertificate(file, title);
    };

    const originalCancel = cancelBtn.onclick;
    cancelBtn.onclick = function() {
        closeModal();
        event.target.value = ''; 
        cancelBtn.onclick = originalCancel; 
    };
}

async function processAndUploadCertificate(file, title) {
    const userId = localStorage.getItem('currentUserId');
    const timestamp = Date.now();
    const pdfPath = `${userId}/cert_${timestamp}.pdf`;
    const thumbPath = `${userId}/thumb_${timestamp}.jpg`;

    const container = document.getElementById('profile-certificates-container');
    container.innerHTML = `<p style="color: #8b5cf6; font-weight: 500; font-size: 0.95rem; text-align: center;">Processing PDF and uploading... Please wait.</p>`;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1); 
        
        const viewport = page.getViewport({ scale: 1.5 }); 
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const thumbBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

        await supabaseClient.storage.from('certificates').upload(pdfPath, file);
        const { data: pdfUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(pdfPath);

        await supabaseClient.storage.from('certificates').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });
        const { data: thumbUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(thumbPath);

        await supabaseClient.from('certificates').insert([{
            user_id: userId,
            title: title,
            pdf_url: pdfUrlData.publicUrl,
            thumbnail_url: thumbUrlData.publicUrl,
            display_order: 0 
        }]);

        loadCertificates();

    } catch (error) {
        console.error("Error processing certificate:", error);
        loadCertificates(); 
    }
}

function renameCertificate(id, currentTitle) {
    const modal = document.getElementById('custom-edit-modal');
    const titleEl = document.getElementById('modal-title');
    const inputEl = document.getElementById('modal-input');
    const saveBtn = document.getElementById('modal-save-btn');

    titleEl.innerText = "Rename Certificate";
    inputEl.value = currentTitle;
    inputEl.placeholder = "Enter new name...";
    modal.style.display = 'flex';

    saveBtn.onclick = async function() {
        const newTitle = inputEl.value.trim();
        closeModal();

        if (!newTitle || newTitle === currentTitle) return;

        const { error } = await supabaseClient
            .from('certificates')
            .update({ title: newTitle })
            .eq('id', id);

        if (!error) loadCertificates();
    };
}

async function deleteCertificate(id) {
    const { error } = await supabaseClient
        .from('certificates')
        .delete()
        .eq('id', id);

    if (!error) loadCertificates();
}

function openAllCertsModal() {
    const modal = document.getElementById('all-certs-modal');
    const grid = document.getElementById('light-cert-grid');

    grid.innerHTML = allCertificates.map(cert => `
        <div class="modal-cert-item" data-id="${cert.id}" style="cursor: grab; position: relative; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.9); border-radius: 4px; padding: 2px; z-index: 5;">
                <i data-lucide="grip-horizontal" style="width: 16px; height: 16px; color: #6b7280;"></i>
            </div>
            <a href="${cert.pdf_url}" target="_blank" style="display: block;">
                <img src="${cert.thumbnail_url}" style="width: 100%; height: 150px; object-fit: cover; border-bottom: 1px solid #e5e7eb;" alt="${cert.title}">
            </a>
            <div style="padding: 12px; font-size: 0.85rem; text-align: center; color: #1f2937; font-weight: 500;">${cert.title}</div>
        </div>
    `).join('');

    modal.style.display = 'flex';
    lucide.createIcons(); 

    if (window.modalCertSortable) window.modalCertSortable.destroy();
    window.modalCertSortable = new Sortable(grid, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async function (evt) {
            const movedItem = allCertificates.splice(evt.oldIndex, 1)[0];
            allCertificates.splice(evt.newIndex, 0, movedItem);
            
            for (let i = 0; i < allCertificates.length; i++) {
                allCertificates[i].display_order = i;
                await supabaseClient.from('certificates')
                    .update({ display_order: i })
                    .eq('id', allCertificates[i].id);
            }
            
            renderCertificatesUI(); 
        }
    });
}

function closeAllCertsModal() {
    document.getElementById('all-certs-modal').style.display = 'none';
}

// ==========================================
// 9. RUN ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSkills();
    updateUIForUser();
    updateRequestsBadge();
    
    if (document.getElementById('profile-page-name')) {
        loadUserProfile();
        loadCertificates(); 
    }
});

