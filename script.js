// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================
lucide.createIcons();

const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function getAvatarHtml(user, size = 36) {
    let url = null;
    if (user.profiles) url = Array.isArray(user.profiles) ? user.profiles[0]?.avatar_url : user.profiles.avatar_url;
    if (url) return `<img src="${url}" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="${user.username}">`;
    return `<div class="connection-avatar" style="width: ${size}px; height: ${size}px; font-size: ${size/2.5}px; background-color: ${getColorForUsername(user.username)}; flex-shrink: 0;">${user.username.charAt(0).toUpperCase()}</div>`;
}

function getColorForUsername(username) {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ==========================================
// 2. HOME PAGE (EXPLORE SKILLS) LOGIC
// ==========================================
async function loadSkills() {
    const carouselTrack = document.getElementById('skills-carousel');
    if (!carouselTrack) return; 

    const currentUserId = localStorage.getItem('currentUserId');
    const { data: rawSkills } = await supabaseClient.from('skills').select('*').order('created_at', { ascending: false });
    
    if (!rawSkills || rawSkills.length === 0) {
        carouselTrack.innerHTML = `<p style="text-align: center; color: #6b7280; width: 100%;">No skills posted yet. Be the first!</p>`;
        if(typeof updateCarouselArrows === 'function') updateCarouselArrows();
        return;
    }

    const userIds = [...new Set(rawSkills.map(s => s.user_id))];
    const { data: users } = await supabaseClient.from('app_users').select('id, username, profiles(avatar_url)').in('id', userIds);

    const userMap = {};
    if (users) users.forEach(u => userMap[u.id] = u);

    carouselTrack.innerHTML = rawSkills.map(skill => {
        const u = userMap[skill.user_id] || { username: 'Unknown' };
        const shortDesc = skill.description.length > 80 ? skill.description.substring(0, 80) + '...' : skill.description;
        const isOwner = skill.user_id == currentUserId;

        return `
        <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: white; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="openSkillDetailModal(${skill.id})">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size:0.75rem; font-weight: 600; color:#8b5cf6; background:#f5f3ff; padding:4px 10px; border-radius:6px;">${skill.category}</span>
                    <div style="position: relative;">
                        <button onclick="togglePostMenu(event, ${skill.id})" class="icon-btn" style="padding: 4px; margin: -4px;"><i data-lucide="more-horizontal" style="width: 20px; height: 20px; color: #9ca3af;"></i></button>
                        <div id="post-menu-${skill.id}" class="post-options-menu dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; width: 140px; padding: 5px; z-index: 20; cursor: default; margin-top: 5px;">
                            ${isOwner ? `<button onclick="deletePost(event, ${skill.id})" style="width: 100%; text-align: left; color: #ef4444; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 4px;" onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='transparent'">Remove Post</button>` : ''}
                            <button onclick="reportPost(event, ${skill.id})" style="width: 100%; text-align: left; color: #4b5563; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">Report</button>
                        </div>
                    </div>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; color: #111827;">${skill.title}</h3>
                <p style="color: #4b5563; font-size: 0.9rem; line-height: 1.5; margin: 0 0 20px 0;">${shortDesc}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; border-top: 1px solid #f3f4f6; padding-top: 15px;" class="edit-hover-group" onclick="event.stopPropagation(); window.location.href='view-profile.html?id=${u.id}'">
                ${getAvatarHtml(u)}
                <div style="line-height: 1.2;">
                    <p style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #111827;">${u.username}</p>
                    <p style="margin: 0; font-size: 0.8rem; color: #6b7280;">Skill Exchanger</p>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    lucide.createIcons();
    if(typeof updateCarouselArrows === 'function') updateCarouselArrows();
}

window.scrollCarousel = function(direction) {
    const track = document.getElementById('skills-carousel');
    if (!track) return;
    
    // Ensure smooth behavior is on when clicking arrows
    track.style.scrollBehavior = 'smooth';
    
    const scrollAmount = 320 * 2;
    if (direction === 'left') track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    else track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

window.updateCarouselArrows = function() {
    const track = document.getElementById('skills-carousel');
    const leftBtn = document.getElementById('scroll-left-btn');
    const rightBtn = document.getElementById('scroll-right-btn');
    if (!track || !leftBtn || !rightBtn) return;
    
    const isScrollable = track.scrollWidth > track.clientWidth;
    if (isScrollable) {
        leftBtn.style.display = track.scrollLeft > 0 ? 'flex' : 'none';
        const maxScrollLeft = track.scrollWidth - track.clientWidth;
        rightBtn.style.display = track.scrollLeft >= maxScrollLeft - 1 ? 'none' : 'flex';
    } else {
        leftBtn.style.display = 'none';
        rightBtn.style.display = 'none';
    }
}

window.togglePostMenu = function(event, postId) {
    event.stopPropagation(); 
    const menus = document.querySelectorAll('.post-options-menu');
    menus.forEach(m => { if (m.id !== `post-menu-${postId}`) m.style.display = 'none'; });
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
window.deletePost = async function(event, postId) {
    event.stopPropagation(); await supabaseClient.from('skills').delete().eq('id', postId); loadSkills(); 
    if (document.getElementById('profile-page-name')) loadUserProfile();
}
window.reportPost = function(event, postId) { event.stopPropagation(); document.getElementById(`post-menu-${postId}`).style.display = 'none'; }


// --- SKILL DEEP DIVE MODAL ---
async function checkConnectionStatus(userA, userB) {
    if(userA == userB) return 'self';
    const { data } = await supabaseClient.from('connections').select('status, requester_id').or(`and(requester_id.eq.${userA},receiver_id.eq.${userB}),and(requester_id.eq.${userB},receiver_id.eq.${userA})`).single();
    if(!data) return 'none';
    if(data.status === 'accepted') return 'accepted';
    if(data.requester_id == userA) return 'pending_sent';
    return 'pending_received';
}

async function openSkillDetailModal(skillId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = "auth.html"; return; }

    const content = document.getElementById('skill-detail-content');
    content.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 30px;">Loading details...</p>`;
    document.getElementById('skill-detail-modal').style.display = 'flex';

    // Fetch Skill, User, Profile, and Certificate data
    const { data: skill } = await supabaseClient.from('skills').select('*').eq('id', skillId).single();
    if (!skill) return;
    const { data: user } = await supabaseClient.from('app_users').select('id, username, profiles(avatar_url, wanted_skills)').eq('id', skill.user_id).single();
    
    let certHtml = '';
    if (skill.certificate_id) {
        const { data: cert } = await supabaseClient.from('certificates').select('*').eq('id', skill.certificate_id).single();
        if (cert) {
            certHtml = `
                <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <span style="font-size: 0.8rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Attached Certificate</span>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <a href="${cert.pdf_url}" target="_blank" style="flex-shrink: 0; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; width: 80px; height: 60px;">
                            <img src="${cert.thumbnail_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="${cert.title}">
                        </a>
                        <div style="font-size: 0.95rem; font-weight: 500; color: #111827;">${cert.title}</div>
                    </div>
                </div>`;
        }
    }

    const connStatus = await checkConnectionStatus(currentUserId, skill.user_id);
    let connectBtnHtml = '';
    if(connStatus === 'self') connectBtnHtml = `<span style="font-size: 0.75rem; color: #6b7280; font-style: italic;">Your Post</span>`;
    else if(connStatus === 'accepted') connectBtnHtml = `<span style="font-size: 0.8rem; color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i data-lucide="check" style="width: 16px; height: 16px;"></i> Connected</span>`;
    else if(connStatus === 'pending_sent') connectBtnHtml = `<span style="font-size: 0.8rem; color: #6b7280; font-weight: 500; background: #f3f4f6; padding: 6px 12px; border-radius: 4px;">Requested</span>`;
    else if(connStatus === 'pending_received') connectBtnHtml = `<button onclick="closeSkillDetailModal(); openRequestsModal();" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">Review Request</button>`;
    else connectBtnHtml = `<button onclick="connectWithUserFromModal(${skill.user_id}, ${skill.id})" class="btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">Connect</button>`;

    // Format Wanted Skills
    let wantedHtml = `<p style="font-size: 0.9rem; color: #6b7280; font-style: italic; margin: 0;">No specific skills listed.</p>`;
    if (user.profiles && user.profiles.length > 0 && user.profiles[0].wanted_skills) {
        const skillsArray = user.profiles[0].wanted_skills.split(',');
        wantedHtml = skillsArray.map(s => {
            if (s.trim() !== "") return `<span class="skill-tag" style="background-color: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;">${s.trim()}</span>`;
            return "";
        }).join('');
    }

    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='view-profile.html?id=${user.id}'">
                ${getAvatarHtml(user, 48)}
                <div>
                    <h4 style="margin: 0; font-size: 1.1rem; color: #111827;">${user.username}</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">Skill Exchanger</p>
                </div>
            </div>
            <div>${connectBtnHtml}</div>
        </div>

        <span style="font-size:0.75rem; font-weight: 600; color:#8b5cf6; background:#f5f3ff; padding:4px 10px; border-radius:6px;">${skill.category}</span>
        <h2 style="margin: 10px 0; color: #111827; font-size: 1.5rem;">${skill.title}</h2>
        <p style="color: #4b5563; font-size: 1rem; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${skill.description}</p>
        
        ${certHtml}

        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
            <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #4b5563;">Skills ${user.username} wants to learn:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${wantedHtml}
            </div>
            <div style="margin-top: 25px; text-align: center;">
                <p style="margin: 0; font-size: 0.9rem; color: #111827; font-weight: 500;">Can you teach them?</p>
                <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #6b7280;">Connect with ${user.username} to start exchanging!</p>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function closeSkillDetailModal() { document.getElementById('skill-detail-modal').style.display = 'none'; }

async function connectWithUserFromModal(receiverId, skillId) {
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('connections').insert([{ requester_id: currentUserId, receiver_id: receiverId, status: 'pending' }]);
    openSkillDetailModal(skillId); // Refresh modal instantly
}

// --- POSTING A SKILL ---
async function checkWantedSkillsBeforePosting() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = "auth.html"; return; }

    const { data: profile } = await supabaseClient.from('profiles').select('wanted_skills').eq('user_id', currentUserId).single();
    
    if (!profile || !profile.wanted_skills || profile.wanted_skills.trim() === "") {
        document.getElementById('warning-modal').style.display = 'flex';
    } else {
        openPostSkillModalForm();
    }
}
function closeWarningModal() { document.getElementById('warning-modal').style.display = 'none'; }
function continueToPostSkill() { closeWarningModal(); openPostSkillModalForm(); }

async function openPostSkillModalForm() {
    const currentUserId = localStorage.getItem('currentUserId');
    const certSelect = document.getElementById('post-skill-cert');
    certSelect.innerHTML = '<option value="">Loading your certificates...</option>';
    document.getElementById('post-skill-modal').style.display = 'flex';

    const { data: certs } = await supabaseClient.from('certificates').select('id, title').eq('user_id', currentUserId);
    certSelect.innerHTML = '<option value="">-- No certificate attached --</option>';
    if (certs) certs.forEach(cert => { certSelect.innerHTML += `<option value="${cert.id}">${cert.title}</option>`; });

    document.getElementById('post-skill-name').value = '';
    document.getElementById('post-skill-tag').value = '';
    document.getElementById('post-skill-desc').value = '';
}
function closePostSkillModal() { document.getElementById('post-skill-modal').style.display = 'none'; }
async function submitPostSkill() {
    const userId = localStorage.getItem('currentUserId');
    const name = document.getElementById('post-skill-name').value.trim();
    const tag = document.getElementById('post-skill-tag').value.trim();
    const desc = document.getElementById('post-skill-desc').value.trim();
    const certId = document.getElementById('post-skill-cert').value;

    if (!name || !tag || !desc) return; 

    const payload = { user_id: userId, title: name, category: tag, description: desc };
    if (certId && certId !== "") payload.certificate_id = parseInt(certId); 

    const { error: insertError } = await supabaseClient.from('skills').insert([payload]);
    if (insertError) return; 

    const { data: profile } = await supabaseClient.from('profiles').select('profile_skills').eq('user_id', userId).single();
    let currentSkills = profile && profile.profile_skills ? profile.profile_skills.split(',').map(s => s.trim()) : [];
    
    if (!currentSkills.some(s => s.toLowerCase() === name.toLowerCase())) {
        currentSkills.unshift(name);
        const updatedStr = currentSkills.filter(s => s !== "").join(', ');
        await supabaseClient.from('profiles').update({ profile_skills: updatedStr }).eq('user_id', userId);
    }
    closePostSkillModal();
    loadSkills(); 
}


// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
let isLoginMode = true;

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    const authTitle = document.getElementById('auth-title'); const authSubtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-text'); const toggleLink = document.getElementById('toggle-link');
    const msgBox = document.getElementById('auth-message'); const usernameContainer = document.getElementById('username-container');
    const usernameInput = document.getElementById('auth-username'); const passwordHint = document.getElementById('password-hint');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (msgBox) msgBox.style.display = 'none';
    if (isLoginMode) {
        authTitle.innerText = 'Welcome Back'; authSubtitle.innerText = 'Enter your details to sign in';
        toggleText.innerText = "Don't have an account?"; toggleLink.innerText = 'Sign up';
        usernameContainer.style.display = 'none'; usernameInput.removeAttribute('required');
        passwordHint.style.display = 'none'; submitBtn.innerText = 'Sign In';
    } else {
        authTitle.innerText = 'Create an Account'; authSubtitle.innerText = 'Join the community to start swapping skills';
        toggleText.innerText = "Already have an account?"; toggleLink.innerText = 'Sign in';
        usernameContainer.style.display = 'block'; usernameInput.setAttribute('required', 'true');
        passwordHint.style.display = 'block'; submitBtn.innerText = 'Create Account';
    }
}
function showAuthMessage(message, isError = true) {
    const msgBox = document.getElementById('auth-message'); if (!msgBox) return;
    msgBox.innerText = message; msgBox.className = isError ? 'auth-message error' : 'auth-message success'; msgBox.style.display = 'block';
}
async function handleAuthSubmit(event) { event.preventDefault(); if (isLoginMode) await handleSignIn(); else await handleSignUp(); }

async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim(); const username = document.getElementById('auth-username').value.trim(); const password = document.getElementById('auth-password').value;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) { showAuthMessage("Password requires 8+ chars, 1 uppercase, 1 lowercase, and 1 number."); return; }
    const { data: existingUsers } = await supabaseClient.from('app_users').select('*').or(`username.eq.${username},email.eq.${email}`);
    if (existingUsers && existingUsers.length > 0) { showAuthMessage("That username or email is already taken."); return; }
    const { data: newUser, error: insertError } = await supabaseClient.from('app_users').insert([{ email, username, password }]).select().single();
    if (insertError) { showAuthMessage("Error creating account. Please try again."); return; }
    if (newUser) await supabaseClient.from('profiles').insert([{ user_id: newUser.id }]);
    document.getElementById('auth-form').reset(); showAuthMessage("Account created successfully! Please sign in.", false); toggleAuthMode(); 
}
async function handleSignIn() {
    const email = document.getElementById('auth-email').value.trim(); const password = document.getElementById('auth-password').value;
    const { data, error } = await supabaseClient.from('app_users').select('*').eq('email', email).eq('password', password);
    if (error || !data || data.length === 0) { showAuthMessage("Invalid email or password."); return; }
    localStorage.setItem('currentUserId', data[0].id); localStorage.setItem('currentUser', data[0].username); window.location.href = "index.html";
}


// ==========================================
// 4. UI LOGIC & NAVBAR DROPDOWNS
// ==========================================
async function updateUIForUser() {
    const loggedOutUI = document.getElementById('logged-out-ui'); const loggedInUI = document.getElementById('logged-in-ui');
    const avatarBtn = document.getElementById('user-avatar-btn'); const avatarInitial = document.getElementById('avatar-initial');
    const dropdownUsername = document.getElementById('dropdown-username'); const navAvatarImg = document.getElementById('nav-avatar-img');
    if (!loggedOutUI || !loggedInUI) return;
    const currentUser = localStorage.getItem('currentUser'); const currentUserId = localStorage.getItem('currentUserId');

    if (currentUser) {
        loggedOutUI.style.display = 'none'; loggedInUI.style.display = 'flex';
        if (avatarBtn) avatarBtn.title = `Logged in as ${currentUser}`; if (dropdownUsername) dropdownUsername.innerText = currentUser;
        if (currentUserId) {
            const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', currentUserId).single();
            if (profile && profile.avatar_url && navAvatarImg) {
                if (avatarInitial) avatarInitial.style.display = 'none'; navAvatarImg.src = profile.avatar_url; navAvatarImg.style.display = 'block';
                if (avatarBtn) { avatarBtn.style.backgroundColor = 'transparent'; avatarBtn.style.border = '2px solid #22c55e'; }
            } else {
                if (navAvatarImg) navAvatarImg.style.display = 'none';
                if (avatarInitial) { avatarInitial.innerText = currentUser.charAt(0).toUpperCase(); avatarInitial.style.display = 'block'; if (avatarBtn) avatarBtn.style.backgroundColor = getColorForUsername(currentUser); }
            }
        }
    } else { loggedOutUI.style.display = 'block'; loggedInUI.style.display = 'none'; }
}

function toggleDropdown(event) {
    event.stopPropagation(); const userDropdown = document.getElementById('user-dropdown'); const connDropdown = document.getElementById('connections-dropdown');
    if (connDropdown) connDropdown.classList.remove('show'); if (userDropdown) userDropdown.classList.toggle('show');
}
function toggleConnectionsDropdown(event) {
    event.stopPropagation(); const userDropdown = document.getElementById('user-dropdown'); const connDropdown = document.getElementById('connections-dropdown');
    if (userDropdown) userDropdown.classList.remove('show'); 
    if (connDropdown) { connDropdown.classList.toggle('show'); if (connDropdown.classList.contains('show') && document.getElementById('connection-search').value === '') loadTopConnections(); }
}
window.onclick = function(event) {
    const userDropdown = document.getElementById('user-dropdown'); const connDropdown = document.getElementById('connections-dropdown');
    if (userDropdown && userDropdown.classList.contains('show')) userDropdown.classList.remove('show');
    if (connDropdown && connDropdown.classList.contains('show') && !event.target.closest('#connections-dropdown')) connDropdown.classList.remove('show');
    document.querySelectorAll('.post-options-menu').forEach(m => m.style.display = 'none');
}
function handleLogout() { localStorage.removeItem('currentUserId'); localStorage.removeItem('currentUser'); window.location.href = "index.html"; }


// ==========================================
// 5. MESSAGING SYSTEM LOGIC (Standalone Page)
// ==========================================
let currentChatUserId = null;

async function initMessagesPage() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = 'auth.html'; return; }
    
    document.getElementById('chat-input-area').style.display = 'none';
    document.getElementById('chat-header-name').innerText = "Skill Swap Chat";
    document.getElementById('chat-header-status').innerText = "Select a connection";
    document.getElementById('chat-header-avatar').innerHTML = `<i data-lucide="user" style="color: white; width: 24px; height: 24px;"></i>`;
    lucide.createIcons();
    
    loadChatConnections();
    
    // Attach listener to input 
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-msg-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
    if (chatInput) chatInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendChatMessage(); });
}

// FETCHES AND DISPLAYS MESSAGE PREVIEWS IN SIDEBAR
async function loadChatConnections() {
    const currentUserId = localStorage.getItem('currentUserId');
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '<p style="text-align:center; color:#6b7280; padding: 20px;">Loading...</p>';

    const { data: myConnections } = await supabaseClient.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
    
    if (!myConnections || myConnections.length === 0) {
        chatList.innerHTML = '<p style="text-align:center; color:#6b7280; padding: 20px; font-size: 0.9rem;">You have no connections yet. Make a connection to start chatting!</p>';
        return;
    }

    const connectedIdsMap = {}; 
    myConnections.forEach(conn => connectedIdsMap[conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id] = true);
    const otherUserIds = Object.keys(connectedIdsMap); 
    
    const { data: users } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).in('id', otherUserIds);
    
    // FETCH LATEST MESSAGES TO DISPLAY PREVIEWS
    const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });
    
    chatList.innerHTML = users.map(user => {
        let avatarUrl = null;
        if (user.profiles) avatarUrl = Array.isArray(user.profiles) ? user.profiles[0]?.avatar_url : user.profiles.avatar_url;
        const avatarStr = avatarUrl ? `'${avatarUrl}'` : null;
        const activeBg = currentChatUserId == user.id ? 'background: #f3f4f6;' : '';

        // Find the most recent message between you and this specific user
        let lastMsgText = "Tap to view chat";
        let isUnread = false;
        
        if (messages) {
            const lastMsg = messages.find(m => (m.sender_id == user.id && m.receiver_id == currentUserId) || (m.sender_id == currentUserId && m.receiver_id == user.id));
            if (lastMsg) {
                // If you sent it, add "You: " to the front
                const prefix = lastMsg.sender_id == currentUserId ? "You: " : "";
                lastMsgText = prefix + lastMsg.content;
                
                // If they sent it and you haven't read it yet, flag it
                if (lastMsg.sender_id == user.id && !lastMsg.is_read) {
                    isUnread = true;
                }
            }
        }

        const msgStyle = isUnread ? "color: #111827; font-weight: 600;" : "color: #6b7280;";

        return `
        <div onclick="openChatWithUser(${user.id}, '${user.username.replace(/'/g, "\\'")}', ${avatarStr})" style="display: flex; align-items: center; gap: 12px; padding: 15px; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background 0.2s; ${activeBg}" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='${activeBg ? '#f3f4f6' : 'transparent'}'">
            ${getAvatarHtml(user, 48)}
            <div style="flex: 1; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h4 style="margin: 0; font-size: 0.95rem; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.username}</h4>
                    ${isUnread ? '<div style="width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%;"></div>' : ''}
                </div>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; ${msgStyle} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsgText}</p>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function openChatWithUser(userId, username, avatarUrl) {
    currentChatUserId = userId;
    
    // Update Header
    document.getElementById('chat-header-name').innerText = username;
    document.getElementById('chat-header-status').innerText = "Connected";
    const avatarHtml = avatarUrl 
        ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${getColorForUsername(username)}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${username.charAt(0).toUpperCase()}</div>`;
    document.getElementById('chat-header-avatar').innerHTML = avatarHtml;
    
    document.getElementById('chat-input-area').style.display = 'flex';
    
    // Immediately mark unread messages from this user as READ
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').update({ is_read: true }).eq('sender_id', userId).eq('receiver_id', currentUserId).eq('is_read', false);
    
    // Reload sidebar to highlight active user and remove unread dots
    loadChatConnections();
    updateMessagesBadge();
    loadChatMessages(userId);
}

async function loadChatMessages(otherUserId) {
    const currentUserId = localStorage.getItem('currentUserId');
    const chatArea = document.getElementById('chat-messages-area');
    chatArea.innerHTML = '<p style="text-align:center; color:#6b7280; margin-top: 20px;">Loading messages...</p>';
    
    const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
        
    chatArea.innerHTML = '';
    
    if (!messages || messages.length === 0) {
        chatArea.innerHTML = '<p style="text-align:center; color:#6b7280; margin-top: auto; margin-bottom: auto; font-size: 0.9rem; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); align-self: center;">Say hi to start the swap! 👋</p>';
        return;
    }
    
    messages.forEach(msg => {
        chatArea.innerHTML += createMessageHtml(msg.content, msg.sender_id == currentUserId);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

function createMessageHtml(content, isSender) {
    const align = isSender ? 'align-self: flex-end;' : 'align-self: flex-start;';
    const bg = isSender ? 'background: #dcfce7; border: 1px solid #bbf7d0;' : 'background: #ffffff; border: 1px solid #e5e7eb;';
    const radius = isSender ? 'border-radius: 12px 12px 0 12px;' : 'border-radius: 12px 12px 12px 0;';
    
    return `
        <div style="${align} ${bg} ${radius} padding: 10px 15px; max-width: 70%; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 5px; font-size: 0.95rem; word-wrap: break-word; color: #111827;">
            ${content}
        </div>
    `;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (!content || !currentChatUserId) return;
    input.value = ''; 
    
    const chatArea = document.getElementById('chat-messages-area');
    if (chatArea.innerHTML.includes('Say hi')) chatArea.innerHTML = '';
    chatArea.innerHTML += createMessageHtml(content, true);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    // Insert into DB
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: currentChatUserId,
        content: content
    }]);

    // Update the sidebar so it immediately shows "You: [message]"
    loadChatConnections();
}

// Function to dynamically count UNREAD messages
async function updateMessagesBadge() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    // Fetch the total count of messages where we are the receiver and is_read is false
    const { count } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);

    const badge = document.getElementById('messages-badge');
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}


// ==========================================
// 6. CONNECTIONS & SEARCH SYSTEM
// ==========================================
async function searchUsers(event) {
    const query = event.target.value.trim(); const list = document.getElementById('connections-list'); const currentUserId = localStorage.getItem('currentUserId');
    if (!query) { loadTopConnections(); return; }
    list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">Searching...</p>`;
    const { data: users, error } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).ilike('username', `${query}%`).neq('id', currentUserId).order('username', { ascending: true }).limit(5);
    if (error || !users || users.length === 0) { list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">No users found.</p>`; return; }
    const { data: myConnections } = await supabaseClient.from('connections').select('requester_id, receiver_id, status').or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
    const connectionMap = {};
    if (myConnections) myConnections.forEach(conn => {
        const otherId = conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id;
        if (conn.status === 'accepted') connectionMap[otherId] = 'accepted'; else if (conn.status === 'pending') connectionMap[otherId] = conn.requester_id == currentUserId ? 'pending_sent' : 'pending_received';
    });
    renderConnectionList(users, "Search Results", connectionMap);
}

async function loadTopConnections() {
    const list = document.getElementById('connections-list'); const currentUserId = localStorage.getItem('currentUserId');
    list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280;">Loading connections...</p>`;
    const { data: connections, error } = await supabaseClient.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).limit(3);
    if (error || !connections || connections.length === 0) { list.innerHTML = `<p style="font-size: 0.85rem; font-weight: 600; color: #4b5563; margin: 0 0 10px 0;">Connections</p><p style="text-align:center; font-size:0.85rem; color:#9ca3af; margin: 0;">No connections yet.</p>`; return; }
    const connectedUserIds = connections.map(conn => conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id);
    const { data: users } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).in('id', connectedUserIds);
    const connectionMap = {}; connectedUserIds.forEach(id => connectionMap[id] = 'accepted');
    renderConnectionList(users || [], "Frequent Connections", connectionMap);
}

function renderConnectionList(users, title, connectionMap = {}) {
    const list = document.getElementById('connections-list'); let html = `<p style="font-size: 0.85rem; font-weight: 600; color: #4b5563; margin: 0 0 10px 0;">${title}</p>`;
    html += users.map(u => {
        const status = connectionMap[u.id]; let actionHtml = '';
        if (status === 'accepted') actionHtml = `<button onclick="window.location.href='messages.html'" class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">Message</button>`;
        else if (status === 'pending_sent') actionHtml = `<span style="font-size: 0.75rem; color: #6b7280; font-weight: 500; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">Requested</span>`;
        else if (status === 'pending_received') actionHtml = `<button onclick="openRequestsModal()" class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">Review</button>`;
        else actionHtml = `<button onclick="connectWithUser(${u.id})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">Connect</button>`;
        return `<div class="connection-item"><div class="connection-user-info" style="cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='view-profile.html?id=${u.id}'">${getAvatarHtml(u)}<span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${u.username}</span></div>${actionHtml}</div>`;
    }).join('');
    list.innerHTML = html; lucide.createIcons(); 
}

async function connectWithUser(receiverId) {
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('connections').insert([{ requester_id: currentUserId, receiver_id: receiverId, status: 'pending' }]);
    searchUsers({ target: document.getElementById('connection-search') });
}

async function updateRequestsBadge() {
    const currentUserId = localStorage.getItem('currentUserId'); if (!currentUserId) return;
    const { count } = await supabaseClient.from('connections').select('*', { count: 'exact', head: true }).eq('receiver_id', currentUserId).eq('status', 'pending');
    const badge = document.getElementById('requests-badge');
    if (badge) { if (count > 0) { badge.innerText = count; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; } }
}

async function openRequestsModal() {
    const currentUserId = localStorage.getItem('currentUserId'); const modal = document.getElementById('requests-modal'); const list = document.getElementById('requests-modal-list');
    list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">Loading requests...</p>`; modal.style.display = 'flex';
    const { data: pendingRequests } = await supabaseClient.from('connections').select('id, requester_id').eq('receiver_id', currentUserId).eq('status', 'pending');
    if (!pendingRequests || pendingRequests.length === 0) { list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">You have no pending requests.</p>`; return; }
    const requesterIds = pendingRequests.map(req => req.requester_id); const { data: users } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).in('id', requesterIds);
    list.innerHTML = pendingRequests.map(req => {
        const user = users.find(u => u.id === req.requester_id); if (!user) return '';
        return `<div class="connection-item"><div class="connection-user-info" style="cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='view-profile.html?id=${user.id}'">${getAvatarHtml(user)}<span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${user.username}</span></div><div style="display: flex; gap: 8px;"><button onclick="acceptRequest(${req.id})" class="btn-primary" style="padding: 4px 12px; font-size: 0.8rem;">Accept</button><button onclick="declineRequest(${req.id})" class="btn-secondary" style="padding: 4px 12px; font-size: 0.8rem; border: 1px solid #d1d5db; background: white;">Decline</button></div></div>`;
    }).join('');
}

async function acceptRequest(connectionId) { await supabaseClient.from('connections').update({ status: 'accepted' }).eq('id', connectionId); openRequestsModal(); loadTopConnections(); updateRequestsBadge(); }
async function declineRequest(connectionId) { await supabaseClient.from('connections').delete().eq('id', connectionId); openRequestsModal(); updateRequestsBadge(); }
function closeRequestsModal() { document.getElementById('requests-modal').style.display = 'none'; }

async function openManageConnectionsModal() {
    const currentUserId = localStorage.getItem('currentUserId'); const modal = document.getElementById('manage-connections-modal'); const list = document.getElementById('manage-connections-list');
    list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">Loading your network...</p>`; modal.style.display = 'flex';
    const { data: myConnections } = await supabaseClient.from('connections').select('id, requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
    if (!myConnections || myConnections.length === 0) { list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px 0;">You don't have any connections yet.</p>`; return; }
    const connectedIdsMap = {}; myConnections.forEach(conn => connectedIdsMap[conn.requester_id == currentUserId ? conn.receiver_id : conn.requester_id] = conn.id);
    const otherUserIds = Object.keys(connectedIdsMap); const { data: users } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).in('id', otherUserIds);
    list.innerHTML = users.map(user => `<div class="connection-item"><div class="connection-user-info" style="cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.location.href='view-profile.html?id=${user.id}'">${getAvatarHtml(user)}<span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${user.username}</span></div><button onclick="removeConnection(${connectedIdsMap[user.id]})" class="btn-outline" style="padding: 4px 12px; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;">Remove</button></div>`).join('');
}
function closeManageConnectionsModal() { document.getElementById('manage-connections-modal').style.display = 'none'; }
async function removeConnection(connectionId) { await supabaseClient.from('connections').delete().eq('id', connectionId); openManageConnectionsModal(); loadTopConnections(); const searchInput = document.getElementById('connection-search'); if (searchInput && searchInput.value.trim() !== '') searchUsers({ target: searchInput }); }


// ==========================================
// 7. PRIVATE PROFILE PAGE LOGIC
// ==========================================
async function loadUserProfile() {
    const userId = localStorage.getItem('currentUserId'); if (!userId) { window.location.href = 'auth.html'; return; }
    const { data: user } = await supabaseClient.from('app_users').select('username').eq('id', userId).single();
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', userId).single();
    if (user) {
        document.getElementById('profile-page-name').innerText = user.username; const initialDiv = document.getElementById('profile-page-initial');
        if (!profile || !profile.avatar_url) { initialDiv.innerText = user.username.charAt(0).toUpperCase(); initialDiv.style.backgroundColor = getColorForUsername(user.username); initialDiv.style.display = 'flex'; }
    }
    if (profile) {
        document.getElementById('profile-headline').innerText = profile.headline || ""; document.getElementById('profile-location').innerText = profile.location || "Where are you based?"; document.getElementById('profile-bio').innerText = profile.bio || "Tell us about yourself...";
        const bannerImg = document.getElementById('profile-banner-img');
        if (profile.banner_url) { bannerImg.style.display = 'block'; bannerImg.src = profile.banner_url; bannerImg.parentElement.style.backgroundColor = 'transparent'; } else { bannerImg.style.display = 'none'; bannerImg.parentElement.style.backgroundColor = '#d1d5db'; }
        const imgElement = document.getElementById('profile-avatar-img');
        if (profile.avatar_url) { document.getElementById('profile-page-initial').style.display = 'none'; imgElement.style.display = 'block'; imgElement.src = profile.avatar_url; } else { imgElement.style.display = 'none'; }

        const { data: activePosts } = await supabaseClient.from('skills').select('title').eq('user_id', userId);
        const activeSkillNames = activePosts ? activePosts.map(p => p.title.toLowerCase()) : [];

        const skillsContainer = document.getElementById('profile-skills-container');
        if (profile.profile_skills && profile.profile_skills.trim() !== "") {
            const skillsArray = profile.profile_skills.split(',');
            skillsContainer.innerHTML = skillsArray.map(skill => {
                const s = skill.trim();
                if (s !== "") {
                    const isActive = activeSkillNames.includes(s.toLowerCase());
                    const bgStyle = isActive ? "background-color: #dcfce7; color: #059669; border: 1px solid #a7f3d0;" : "";
                    const removeBtn = isActive ? "" : `<i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: #9ca3af;" onclick="removeSingleSkill('${s}')" title="Remove ${s}"></i>`;
                    return `<span class="skill-tag" data-skill="${s}" style="display: flex; align-items: center; gap: 6px; cursor: grab; ${bgStyle}">${s}${removeBtn}</span>`;
                }
                return "";
            }).join('');
            if (window.skillsSortable) window.skillsSortable.destroy();
            window.skillsSortable = new Sortable(skillsContainer, {
                animation: 150, ghostClass: 'sortable-ghost',
                onEnd: async function () { const newSkills = Array.from(skillsContainer.querySelectorAll('.skill-tag')).map(el => el.getAttribute('data-skill')).join(', '); await supabaseClient.from('profiles').update({ profile_skills: newSkills }).eq('user_id', userId); }
            });
        } else { skillsContainer.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Display your skills...</p>`; }

        const wantedSkillsContainer = document.getElementById('profile-wanted-skills-container');
        if (profile.wanted_skills && profile.wanted_skills.trim() !== "") {
            const wantedSkillsArray = profile.wanted_skills.split(',');
            wantedSkillsContainer.innerHTML = wantedSkillsArray.map(skill => {
                const s = skill.trim(); if (s !== "") return `<span class="skill-tag" data-skill="${s}" style="display: flex; align-items: center; gap: 6px; cursor: grab; background-color: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;">${s}<i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: #f472b6;" onclick="removeWantedSkill('${s}')" title="Remove ${s}"></i></span>`; return "";
            }).join('');
            if (window.wantedSkillsSortable) window.wantedSkillsSortable.destroy();
            window.wantedSkillsSortable = new Sortable(wantedSkillsContainer, {
                animation: 150, ghostClass: 'sortable-ghost',
                onEnd: async function () { const newSkills = Array.from(wantedSkillsContainer.querySelectorAll('.skill-tag')).map(el => el.getAttribute('data-skill')).join(', '); await supabaseClient.from('profiles').update({ wanted_skills: newSkills }).eq('user_id', userId); }
            });
        } else { wantedSkillsContainer.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">What do you want to learn?</p>`; }
        lucide.createIcons(); 
    }
}
function closeModal() { const modal = document.getElementById('custom-edit-modal'); if (modal) modal.style.display = 'none'; }
function editProfileField(fieldName, promptMessage) {
    const userId = localStorage.getItem('currentUserId'); if (!userId) return;
    const modal = document.getElementById('custom-edit-modal'); if (!modal) return;
    document.getElementById('modal-title').innerText = promptMessage; document.getElementById('modal-input').value = ''; document.getElementById('modal-input').placeholder = "Type here..."; modal.style.display = 'flex';
    document.getElementById('modal-save-btn').onclick = async function() {
        const newValue = document.getElementById('modal-input').value.trim(); closeModal(); if (newValue === "" && fieldName === 'username') return; 
        if (fieldName === 'username') { const { error } = await supabaseClient.from('app_users').update({ username: newValue }).eq('id', userId); if (!error) { localStorage.setItem('currentUser', newValue); updateUIForUser(); loadUserProfile(); } } else { const { error } = await supabaseClient.from('profiles').update({ [fieldName]: newValue }).eq('user_id', userId); if (!error) loadUserProfile(); }
    };
}
function addSingleSkill() {
    const userId = localStorage.getItem('currentUserId'); if (!userId) return;
    const modal = document.getElementById('custom-edit-modal'); document.getElementById('modal-title').innerText = "Add a skill you have"; document.getElementById('modal-input').value = ''; document.getElementById('modal-input').placeholder = "e.g., Penetration Testing, JavaScript..."; modal.style.display = 'flex';
    document.getElementById('modal-save-btn').onclick = async function() {
        const newSkill = document.getElementById('modal-input').value.trim(); closeModal(); if (newSkill === "") return;
        const { data: profile } = await supabaseClient.from('profiles').select('profile_skills').eq('user_id', userId).single(); let updatedSkills = profile && profile.profile_skills ? profile.profile_skills : "";
        if (updatedSkills.length > 0) { if (updatedSkills.split(',').map(s => s.trim().toLowerCase()).includes(newSkill.toLowerCase())) return; updatedSkills += `, ${newSkill}`; } else { updatedSkills = newSkill; }
        const { error } = await supabaseClient.from('profiles').update({ profile_skills: updatedSkills }).eq('user_id', userId); if (!error) loadUserProfile(); 
    };
}
async function removeSingleSkill(skillToRemove) {
    const userId = localStorage.getItem('currentUserId'); const { data: profile } = await supabaseClient.from('profiles').select('profile_skills').eq('user_id', userId).single();
    if (profile && profile.profile_skills) { let skillsArray = profile.profile_skills.split(',').map(s => s.trim()); const updatedSkills = skillsArray.filter(s => s !== skillToRemove && s !== "").join(', '); const { error } = await supabaseClient.from('profiles').update({ profile_skills: updatedSkills }).eq('user_id', userId); if (!error) loadUserProfile(); }
}
function addWantedSkill() {
    const userId = localStorage.getItem('currentUserId'); const modal = document.getElementById('custom-edit-modal'); document.getElementById('modal-title').innerText = "Add a skill you want to learn"; document.getElementById('modal-input').value = ''; document.getElementById('modal-input').placeholder = "e.g., Python, Public Speaking..."; modal.style.display = 'flex';
    document.getElementById('modal-save-btn').onclick = async function() {
        const newSkill = document.getElementById('modal-input').value.trim(); closeModal(); if (newSkill === "") return;
        const { data: profile } = await supabaseClient.from('profiles').select('wanted_skills').eq('user_id', userId).single(); let updatedSkills = profile && profile.wanted_skills ? profile.wanted_skills : "";
        if (updatedSkills.length > 0) { if (updatedSkills.split(',').map(s => s.trim().toLowerCase()).includes(newSkill.toLowerCase())) return; updatedSkills += `, ${newSkill}`; } else { updatedSkills = newSkill; }
        const { error } = await supabaseClient.from('profiles').update({ wanted_skills: updatedSkills }).eq('user_id', userId); if (!error) loadUserProfile(); 
    };
}
async function removeWantedSkill(skillToRemove) {
    const userId = localStorage.getItem('currentUserId'); const { data: profile } = await supabaseClient.from('profiles').select('wanted_skills').eq('user_id', userId).single();
    if (profile && profile.wanted_skills) { let skillsArray = profile.wanted_skills.split(',').map(s => s.trim()); const updatedSkills = skillsArray.filter(s => s !== skillToRemove && s !== "").join(', '); const { error } = await supabaseClient.from('profiles').update({ wanted_skills: updatedSkills }).eq('user_id', userId); if (!error) loadUserProfile(); }
}

// ==========================================
// 8. PUBLIC VIEW PROFILE LOGIC 
// ==========================================
async function loadPublicProfile() {
    const urlParams = new URLSearchParams(window.location.search); const targetUserId = urlParams.get('id'); if (!targetUserId) { window.location.href = 'index.html'; return; }
    const { data: user } = await supabaseClient.from('app_users').select('username').eq('id', targetUserId).single(); const { data: profile } = await supabaseClient.from('profiles').select('*').eq('user_id', targetUserId).single();
    if (user) { document.getElementById('public-page-name').innerText = user.username; const initialDiv = document.getElementById('public-page-initial'); if (!profile || !profile.avatar_url) { initialDiv.innerText = user.username.charAt(0).toUpperCase(); initialDiv.style.backgroundColor = getColorForUsername(user.username); initialDiv.style.display = 'flex'; } }
    if (profile) {
        document.getElementById('public-headline').innerText = profile.headline || ""; document.getElementById('public-location').innerText = profile.location || ""; document.getElementById('public-bio').innerText = profile.bio || "No bio provided.";
        const bannerImg = document.getElementById('public-banner-img'); if (profile.banner_url) { bannerImg.style.display = 'block'; bannerImg.src = profile.banner_url; bannerImg.parentElement.style.backgroundColor = 'transparent'; } else { bannerImg.style.display = 'none'; bannerImg.parentElement.style.backgroundColor = '#d1d5db'; }
        const imgElement = document.getElementById('public-avatar-img'); if (profile.avatar_url) { document.getElementById('public-page-initial').style.display = 'none'; imgElement.style.display = 'block'; imgElement.src = profile.avatar_url; } else { imgElement.style.display = 'none'; }
        const { data: activePosts } = await supabaseClient.from('skills').select('title').eq('user_id', targetUserId); const activeSkillNames = activePosts ? activePosts.map(p => p.title.toLowerCase()) : [];
        const skillsContainer = document.getElementById('public-skills-container');
        if (profile.profile_skills && profile.profile_skills.trim() !== "") {
            const skillsArray = profile.profile_skills.split(',');
            skillsContainer.innerHTML = skillsArray.map(skill => { const s = skill.trim(); if (s !== "") { const isActive = activeSkillNames.includes(s.toLowerCase()); const bgStyle = isActive ? "background-color: #dcfce7; color: #059669; border: 1px solid #a7f3d0;" : ""; return `<span class="skill-tag" style="display: flex; align-items: center; gap: 6px; ${bgStyle}">${s}</span>`; } return ""; }).join('');
        } else { skillsContainer.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">No skills listed.</p>`; }
        const wantedSkillsContainer = document.getElementById('public-wanted-skills-container');
        if (profile.wanted_skills && profile.wanted_skills.trim() !== "") {
            const wantedSkillsArray = profile.wanted_skills.split(',');
            wantedSkillsContainer.innerHTML = wantedSkillsArray.map(skill => { const s = skill.trim(); if (s !== "") return `<span class="skill-tag" style="display: flex; align-items: center; gap: 6px; background-color: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8;">${s}</span>`; return ""; }).join('');
        } else { wantedSkillsContainer.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">No skills listed.</p>`; }
    }
}

async function loadPublicCertificates() {
    const urlParams = new URLSearchParams(window.location.search); const targetUserId = urlParams.get('id'); if (!targetUserId) return;
    const { data: certs } = await supabaseClient.from('certificates').select('*').eq('user_id', targetUserId).order('display_order', { ascending: true }).order('created_at', { ascending: false }); 
    allCertificates = certs || []; renderPublicCertificatesUI();
}

function renderPublicCertificatesUI() {
    const container = document.getElementById('public-certificates-container'); const actionsDiv = document.getElementById('public-cert-actions'); const showMoreBtn = document.getElementById('public-show-more-btn'); const showAllBtn = document.getElementById('public-show-all-btn');
    if (!container || !actionsDiv) return;
    if (allCertificates.length === 0) { container.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">No certificates added yet.</p>`; actionsDiv.style.display = 'none'; return; }
    const visibleCerts = allCertificates.slice(0, visibleCertsCount);
    container.innerHTML = visibleCerts.map(cert => `<div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; width: 100%; display: flex; flex-direction: column; background: white; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"><a href="${cert.pdf_url}" target="_blank" style="display: block; width: 100%; background: #f9fafb; text-align: center;"><img src="${cert.thumbnail_url}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-bottom: 1px solid #e5e7eb;" alt="${cert.title}"></a><div style="padding: 15px; font-size: 1rem; font-weight: 500; text-align: center; color: #111827;">${cert.title}</div></div>`).join('');
    actionsDiv.style.display = 'flex'; if (visibleCertsCount >= allCertificates.length) showMoreBtn.style.display = 'none'; else showMoreBtn.style.display = 'inline-block';
    if (allCertificates.length > 2) showAllBtn.style.display = 'inline-block'; else showAllBtn.style.display = 'none';
}
function showMorePublicCertificates() { visibleCertsCount += 2; renderPublicCertificatesUI(); }

// ==========================================
// 9. IMAGE UPLOAD & PDF CROP LOGIC
// ==========================================
let cropper = null; let currentImageField = ''; 
function openImageEditor(fieldName) { currentImageField = fieldName; document.getElementById('image-modal-title').innerText = fieldName === 'avatar_url' ? 'Update Profile Picture' : 'Update Banner'; document.getElementById('image-editor-modal').style.display = 'flex'; document.getElementById('image-source-options').style.display = 'block'; document.getElementById('cropper-container').style.display = 'none'; document.getElementById('save-cropped-btn').style.display = 'none'; document.getElementById('link-upload-input').value = ''; if(cropper) { cropper.destroy(); cropper = null; } }
function closeImageEditor() { document.getElementById('image-editor-modal').style.display = 'none'; if(cropper) { cropper.destroy(); cropper = null; } }
function loadFileIntoCropper(event) { const file = event.target.files[0]; if(!file) return; initCropper(URL.createObjectURL(file)); }
function loadLinkIntoCropper() { const url = document.getElementById('link-upload-input').value.trim(); if(!url) return; initCropper(url); }
function initCropper(imageUrl) { const imageElement = document.getElementById('image-to-crop'); imageElement.crossOrigin = "anonymous"; imageElement.src = imageUrl; document.getElementById('image-source-options').style.display = 'none'; document.getElementById('cropper-container').style.display = 'block'; document.getElementById('save-cropped-btn').style.display = 'block'; const ratio = currentImageField === 'avatar_url' ? 1 / 1 : 4 / 1; if(cropper) cropper.destroy(); cropper = new Cropper(imageElement, { aspectRatio: ratio, viewMode: 1, background: false, zoomable: true, dragMode: 'move' }); }
async function saveCroppedImage() {
    if(!cropper) return; const saveBtn = document.getElementById('save-cropped-btn'); saveBtn.innerText = "Uploading..."; saveBtn.disabled = true;
    cropper.getCroppedCanvas().toBlob(async (blob) => {
        const userId = localStorage.getItem('currentUserId'); const fileName = `${userId}_${currentImageField}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseClient.storage.from('images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (!uploadError) { const { data: urlData } = supabaseClient.storage.from('images').getPublicUrl(fileName); await supabaseClient.from('profiles').update({ [currentImageField]: urlData.publicUrl }).eq('user_id', userId); closeImageEditor(); loadUserProfile(); updateUIForUser(); }
        saveBtn.innerText = "Save Image"; saveBtn.disabled = false;
    }, 'image/jpeg');
}

// ==========================================
// 10. CERTIFICATES ENGINE 
// ==========================================
let allCertificates = []; let visibleCertsCount = 2; 
async function loadCertificates() {
    const userId = localStorage.getItem('currentUserId'); if (!userId) return;
    const { data: certs } = await supabaseClient.from('certificates').select('*').eq('user_id', userId).order('display_order', { ascending: true }).order('created_at', { ascending: false }); 
    allCertificates = certs || []; renderCertificatesUI();
}
function renderCertificatesUI() {
    const container = document.getElementById('profile-certificates-container'); const actionsDiv = document.getElementById('cert-actions'); const showMoreBtn = document.getElementById('cert-show-more-btn'); const showAllBtn = document.getElementById('cert-show-all-btn');
    if (!container || !actionsDiv) return;
    if (allCertificates.length === 0) { container.innerHTML = `<p id="cert-placeholder" style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Add your certifications and licenses...</p>`; actionsDiv.style.display = 'none'; return; }
    const visibleCerts = allCertificates.slice(0, visibleCertsCount);
    container.innerHTML = visibleCerts.map(cert => `<div class="cert-card-wrapper" data-id="${cert.id}" style="position: relative; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; width: 100%; display: flex; flex-direction: column; background: white; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"><div class="cert-actions-overlay" style="position: absolute; top: 10px; right: 10px; display: flex; gap: 8px; z-index: 10;"><button onclick="renameCertificate(${cert.id}, '${cert.title.replace(/'/g, "\\'")}')" class="icon-btn" style="background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.15); padding: 6px;" title="Rename"><i data-lucide="pencil" style="width: 16px; height: 16px; color: #4b5563;"></i></button><button onclick="deleteCertificate(${cert.id})" class="icon-btn" style="background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.15); padding: 6px;" title="Delete"><i data-lucide="x" style="width: 16px; height: 16px; color: #ef4444;"></i></button></div><a href="${cert.pdf_url}" target="_blank" style="display: block; width: 100%; background: #f9fafb; text-align: center;"><img src="${cert.thumbnail_url}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-bottom: 1px solid #e5e7eb;" alt="${cert.title}"></a><div style="padding: 15px; font-size: 1rem; font-weight: 500; text-align: center; color: #111827;">${cert.title}</div></div>`).join('');
    lucide.createIcons(); actionsDiv.style.display = 'flex';
    if (visibleCertsCount >= allCertificates.length) showMoreBtn.style.display = 'none'; else showMoreBtn.style.display = 'inline-block';
    if (allCertificates.length > 2) showAllBtn.style.display = 'inline-block'; else showAllBtn.style.display = 'none';
}
function showMoreCertificates() { visibleCertsCount += 2; renderCertificatesUI(); }

async function uploadCertificate(event) {
    const file = event.target.files[0]; if (!file || file.type !== "application/pdf") return;
    const modal = document.getElementById('custom-edit-modal'); document.getElementById('modal-title').innerText = "Name your Certificate"; document.getElementById('modal-input').value = ""; document.getElementById('modal-input').placeholder = "e.g., AWS Cloud Practitioner"; modal.style.display = 'flex';
    document.getElementById('modal-save-btn').onclick = async function() { const title = document.getElementById('modal-input').value.trim(); if (!title) return; closeModal(); await processAndUploadCertificate(file, title); };
    const cancelBtn = document.getElementById('modal-cancel-btn'); const originalCancel = cancelBtn.onclick; cancelBtn.onclick = function() { closeModal(); event.target.value = ''; cancelBtn.onclick = originalCancel; };
}
async function processAndUploadCertificate(file, title) {
    const userId = localStorage.getItem('currentUserId'); const timestamp = Date.now(); const pdfPath = `${userId}/cert_${timestamp}.pdf`; const thumbPath = `${userId}/thumb_${timestamp}.jpg`;
    document.getElementById('profile-certificates-container').innerHTML = `<p style="color: #8b5cf6; font-weight: 500; font-size: 0.95rem; text-align: center;">Processing PDF and uploading... Please wait.</p>`;
    try {
        const arrayBuffer = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument(arrayBuffer).promise; const page = await pdf.getPage(1); 
        const viewport = page.getViewport({ scale: 1.5 }); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const thumbBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        await supabaseClient.storage.from('certificates').upload(pdfPath, file); const { data: pdfUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(pdfPath);
        await supabaseClient.storage.from('certificates').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' }); const { data: thumbUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(thumbPath);
        await supabaseClient.from('certificates').insert([{ user_id: userId, title: title, pdf_url: pdfUrlData.publicUrl, thumbnail_url: thumbUrlData.publicUrl, display_order: 0 }]); loadCertificates();
    } catch (error) { console.error("Error:", error); loadCertificates(); }
}
function renameCertificate(id, currentTitle) {
    const modal = document.getElementById('custom-edit-modal'); document.getElementById('modal-title').innerText = "Rename Certificate"; document.getElementById('modal-input').value = currentTitle; document.getElementById('modal-input').placeholder = "Enter new name..."; modal.style.display = 'flex';
    document.getElementById('modal-save-btn').onclick = async function() { const newTitle = document.getElementById('modal-input').value.trim(); closeModal(); if (!newTitle || newTitle === currentTitle) return; await supabaseClient.from('certificates').update({ title: newTitle }).eq('id', id); loadCertificates(); };
}
async function deleteCertificate(id) { await supabaseClient.from('certificates').delete().eq('id', id); loadCertificates(); }
