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

let carouselTargetScroll = 0;
let isCarouselAnimating = false;

function animateCarouselScroll(track) {
    if (!isCarouselAnimating) {
        isCarouselAnimating = true;
        track.style.scrollBehavior = 'auto'; 
        
        const animate = () => {
            const distance = carouselTargetScroll - track.scrollLeft;
            if (Math.abs(distance) < 1) {
                track.scrollLeft = carouselTargetScroll;
                isCarouselAnimating = false;
                if(typeof updateCarouselArrows === 'function') updateCarouselArrows();
                return;
            }
            track.scrollLeft += distance * 0.15;
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
}

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
    
    if (!isCarouselAnimating) {
        carouselTargetScroll = track.scrollLeft;
    }
    
    const scrollAmount = 320 * 2;
    const maxScroll = track.scrollWidth - track.clientWidth;
    
    if (direction === 'left') {
        carouselTargetScroll -= scrollAmount;
    } else {
        carouselTargetScroll += scrollAmount;
    }
    
    carouselTargetScroll = Math.max(0, Math.min(carouselTargetScroll, maxScroll));
    animateCarouselScroll(track);
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
// 3. AUTHENTICATION LOGIC (WITH GOOGLE BRIDGE)
// ==========================================
let isLoginMode = true;

// Trigger Supabase's native Google OAuth
window.signInWithGoogle = async function() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) showAuthMessage("Error connecting to Google.", true);
}

// The "Bridge": This catches the Google redirect, checks the custom app_users table, and syncs them
window.checkOAuthSession = async function() {
    // This tells Supabase to read the #access_token from the URL if it exists
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session && session.user) {
        const btn = document.getElementById('auth-submit-btn');
        if(btn) btn.innerText = "Connecting Google...";
        
        const email = session.user.email;
        let name = session.user.user_metadata.full_name || session.user.user_metadata.name || email.split('@')[0];

        // 1. Check if user already exists in our CUSTOM app_users table
        const { data: existingUsers } = await supabaseClient.from('app_users').select('*').eq('email', email);

        let localUser;
        if (existingUsers && existingUsers.length > 0) {
            localUser = existingUsers[0];
        } else {
            // 2. User is new! Create their custom app_users profile
            const uniqueUsername = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
            
            const { data: newUser, error: insertError } = await supabaseClient.from('app_users').insert([{ 
                email: email, 
                username: uniqueUsername, 
                password: 'google_oauth_user_' + Date.now() // Dummy password for custom table
            }]).select().single();
            
            if(newUser) {
                await supabaseClient.from('profiles').insert([{ user_id: newUser.id }]);
                localUser = newUser;
            }
        }

        // 3. Log them in normally
        if (localUser) {
            localStorage.setItem('currentUserId', localUser.id);
            localStorage.setItem('currentUser', localUser.username);
            window.location.href = "index.html";
        }
    }
}

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

// Clears the standard login AND the Supabase Google session
async function handleLogout() { 
    localStorage.removeItem('currentUserId'); 
    localStorage.removeItem('currentUser'); 
    await supabaseClient.auth.signOut();
    window.location.href = "index.html"; 
}


// ==========================================
// 5. MESSAGING SYSTEM LOGIC (Standalone Page)
// ==========================================
let currentChatUserId = null;
let activeContextMenuMsgId = null;
let activeContextMenuMsgContent = null;

// Hide the right-click menu if the user clicks anywhere else on the screen
document.addEventListener('click', () => {
    const menu = document.getElementById('msg-context-menu');
    if (menu) menu.style.display = 'none';
});

async function initMessagesPage() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = 'auth.html'; return; }
    
    document.getElementById('chat-input-area').style.display = 'none';
    document.getElementById('chat-header-name').innerText = "Skill Swap Chat";
    document.getElementById('chat-header-status').innerText = "Select a connection";
    document.getElementById('chat-header-avatar').innerHTML = `<i data-lucide="user" style="color: white; width: 24px; height: 24px;"></i>`;
    lucide.createIcons();
    
    loadChatConnections();
    
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-msg-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
    if (chatInput) chatInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendChatMessage(); });
}

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

        let lastMsgText = "Tap to view chat";
        let isUnread = false;
        
        if (messages) {
            const lastMsg = messages.find(m => (m.sender_id == user.id && m.receiver_id == currentUserId) || (m.sender_id == currentUserId && m.receiver_id == user.id));
            if (lastMsg) {
                const prefix = lastMsg.sender_id == currentUserId ? "You: " : "";
                
                if (lastMsg.is_deleted) {
                    lastMsgText = prefix + "🚫 This message was deleted";
                } else if (lastMsg.content.startsWith('[CALL_INVITE]:')) {
                    lastMsgText = prefix + "🎥 Video Call Started";
                } else if (lastMsg.content.startsWith('[CALL_ENDED]:')) {
                    lastMsgText = prefix + "📞 Call ended";
                } else if (lastMsg.content === '[CALL_MISSED]') {
                    lastMsgText = prefix + "📞 Missed Call";
                } else {
                    lastMsgText = prefix + lastMsg.content;
                }
                
                if (lastMsg.sender_id == user.id && !lastMsg.is_read) isUnread = true;
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
    
    document.getElementById('chat-header-name').innerText = username;
    document.getElementById('chat-header-status').innerText = "Connected";
    const avatarHtml = avatarUrl 
        ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${getColorForUsername(username)}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${username.charAt(0).toUpperCase()}</div>`;
    document.getElementById('chat-header-avatar').innerHTML = avatarHtml;
    
    document.getElementById('chat-input-area').style.display = 'flex';
    
    const videoBtn = document.getElementById('video-call-btn');
    if (videoBtn) videoBtn.style.display = 'flex';
    
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').update({ is_read: true }).eq('sender_id', userId).eq('receiver_id', currentUserId).eq('is_read', false);
    
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
        chatArea.innerHTML = '<div style="text-align: center; color: #6b7280; margin-top: auto; margin-bottom: auto;"><div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><i data-lucide="message-circle" style="width: 32px; height: 32px; color: #8b5cf6; margin-bottom: 10px;"></i><p style="margin: 0; font-size: 0.95rem; font-weight: 500; color: #374151;">Say hi to start the swap! 👋</p></div></div>';
        lucide.createIcons();
        return;
    }
    
    messages.forEach(msg => {
        chatArea.innerHTML += createMessageHtml(msg, msg.sender_id == currentUserId);
    });
    
    chatArea.scrollTop = chatArea.scrollHeight;
    lucide.createIcons();
}

function createMessageHtml(msg, isSender) {
    const align = isSender ? 'align-self: flex-end;' : 'align-self: flex-start;';
    let bg = isSender ? 'background: #dcfce7; border: 1px solid #bbf7d0;' : 'background: #ffffff; border: 1px solid #e5e7eb;';
    const radius = isSender ? 'border-radius: 12px 12px 0 12px;' : 'border-radius: 12px 12px 12px 0;';
    
    // Format timestamp
    const date = new Date(msg.created_at || Date.now());
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHtml = '';
    let metaHtml = '';
    let rightClickEvent = '';

    // Handle Soft Deleted Messages
    if (msg.is_deleted) {
        contentHtml = `<div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-style: italic;">
                        <i data-lucide="ban" style="width: 14px; height: 14px;"></i> This message was deleted
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${timeString}</span>`;
        bg = isSender ? 'background: #f3f4f6; border: 1px solid #e5e7eb;' : 'background: #f9fafb; border: 1px solid #e5e7eb;';
    } 
    // Handle System Tags
    else if (msg.content.startsWith('[CALL_INVITE]:')) {
        contentHtml = `<div style="display:flex; align-items:center; gap:8px; font-weight: 500; color: #4f46e5;">
                        <i data-lucide="video" style="width:18px; height:18px;"></i> Video Call Started
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${timeString}</span>`;
        bg = isSender ? 'background: #e0e7ff; border: 1px solid #c7d2fe;' : 'background: #ffffff; border: 1px solid #e5e7eb;';
        rightClickEvent = ''; 
    } 
    else if (msg.content.startsWith('[CALL_ENDED]:')) {
        const parts = msg.content.split(':');
        const duration = parts.length >= 3 ? parts[1] + ":" + parts[2] : "Unknown";
        contentHtml = `<div style="display:flex; align-items:center; gap:8px; font-weight: 500; color: #4b5563;">
                        <i data-lucide="phone" style="width:16px; height:16px;"></i> Call ended • ${duration}
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${timeString}</span>`;
        bg = 'background: #f3f4f6; border: 1px solid #e5e7eb;';
        rightClickEvent = ''; 
    }
    else if (msg.content === '[CALL_MISSED]') {
        contentHtml = `<div style="display:flex; align-items:center; gap:8px; font-weight: 500; color: #ef4444;">
                        <i data-lucide="phone-missed" style="width:16px; height:16px;"></i> Missed Call
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${timeString}</span>`;
        bg = 'background: #fef2f2; border: 1px solid #fecaca;';
        rightClickEvent = ''; 
    }
    // Normal Message
    else {
        contentHtml = msg.content;
        const editedMark = msg.is_edited ? 'Edited ' : '';
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${editedMark}${timeString}</span>`;
        
        if (isSender) {
            const safeContent = msg.content.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            rightClickEvent = `oncontextmenu="showContextMenu(event, ${msg.id}, '${safeContent}')"`;
        }
    }
    
    return `
        <div ${rightClickEvent} style="${align} ${bg} ${radius} padding: 10px 15px; max-width: 70%; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 5px; font-size: 0.95rem; word-wrap: break-word; color: #111827; cursor: ${isSender && !msg.is_deleted && rightClickEvent !== '' ? 'context-menu' : 'default'};">
            ${contentHtml}
            ${metaHtml}
        </div>
    `;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (!content || !currentChatUserId) return;
    input.value = ''; 
    
    // Insert into DB
    const { error } = await supabaseClient.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: currentChatUserId,
        content: content
    }]);

    if (error) {
        console.error("Error sending message:", error);
        return;
    }

    loadChatMessages(currentChatUserId);
    loadChatConnections();
}

// ==========================================
// Right-Click Context Menu Actions
// ==========================================
window.showContextMenu = function(e, msgId, content) {
    e.preventDefault(); 
    activeContextMenuMsgId = msgId;
    activeContextMenuMsgContent = content;

    const menu = document.getElementById('msg-context-menu');
    if (menu) {
        menu.style.display = 'block';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
    }
}

window.closeDeleteModal = function() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.style.display = 'none';
}

window.handleMenuDelete = function() {
    if(!activeContextMenuMsgId) return;
    document.getElementById('msg-context-menu').style.display = 'none';

    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('confirm-delete-btn').onclick = async function() {
            await supabaseClient.from('messages').update({ 
                is_deleted: true,
                deleted_at: new Date().toISOString()
            }).eq('id', activeContextMenuMsgId);
            
            loadChatMessages(currentChatUserId);
            closeDeleteModal();
        };
    }
}

window.handleMenuEdit = async function() {
    if(!activeContextMenuMsgId) return;
    
    const modal = document.getElementById('custom-edit-modal');
    if (!modal) return;
    
    document.getElementById('modal-title').innerText = "Edit Message";
    document.getElementById('modal-input').value = activeContextMenuMsgContent;
    document.getElementById('modal-input').placeholder = "Type your edited message...";
    modal.style.display = 'flex';
    
    document.getElementById('modal-save-btn').onclick = async function() {
        const newContent = document.getElementById('modal-input').value.trim();
        closeModal();
        
        if (newContent !== "" && newContent !== activeContextMenuMsgContent) {
            await supabaseClient.from('messages').update({ 
                content: newContent,
                is_edited: true 
            }).eq('id', activeContextMenuMsgId);
            
            loadChatMessages(currentChatUserId);
        }
    };
    
    document.getElementById('msg-context-menu').style.display = 'none';
}

async function updateMessagesBadge() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

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

function openAllCertsModal() {
    const modal = document.getElementById('all-certs-modal'); const grid = document.getElementById('light-cert-grid'); const isPublicView = window.location.pathname.includes('view-profile.html');
    grid.innerHTML = allCertificates.map(cert => `<div class="modal-cert-item" ${isPublicView ? '' : `data-id="${cert.id}" style="cursor: grab;"`} style="position: relative; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${isPublicView ? '' : `<div style="position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.9); border-radius: 4px; padding: 2px; z-index: 5;"><i data-lucide="grip-horizontal" style="width: 16px; height: 16px; color: #6b7280;"></i></div>`}<a href="${cert.pdf_url}" target="_blank" style="display: block;"><img src="${cert.thumbnail_url}" style="width: 100%; height: 150px; object-fit: cover; border-bottom: 1px solid #e5e7eb;" alt="${cert.title}"></a><div style="padding: 12px; font-size: 0.85rem; text-align: center; color: #1f2937; font-weight: 500;">${cert.title}</div></div>`).join('');
    modal.style.display = 'flex'; lucide.createIcons(); 
    if (!isPublicView) {
        if (window.modalCertSortable) window.modalCertSortable.destroy();
        window.modalCertSortable = new Sortable(grid, { animation: 150, ghostClass: 'sortable-ghost', forceFallback: true, fallbackOnBody: true, onEnd: async function (evt) { const movedItem = allCertificates.splice(evt.oldIndex, 1)[0]; allCertificates.splice(evt.newIndex, 0, movedItem); for (let i = 0; i < allCertificates.length; i++) { allCertificates[i].display_order = i; await supabaseClient.from('certificates').update({ display_order: i }).eq('id', allCertificates[i].id); } renderCertificatesUI(); } });
    }
}
function closeAllCertsModal() { document.getElementById('all-certs-modal').style.display = 'none'; }


// ==========================================
// 11. PAGE LOAD & REALTIME LISTENERS
// ==========================================
function setupRealtimeListeners() {
    const currentUserId = localStorage.getItem('currentUserId');

    supabaseClient
        .channel('master-db-channel')
        .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            const table = payload.table;
            const data = payload.new || payload.old;

            if (table === 'skills') {
                if (document.getElementById('skills-grid') || document.getElementById('skills-carousel')) loadSkills();
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
            }

            if (table === 'connections' && currentUserId) {
                if (data && (data.requester_id == currentUserId || data.receiver_id == currentUserId)) {
                    updateRequestsBadge();
                    loadTopConnections();
                    const searchInput = document.getElementById('connection-search');
                    if (searchInput && searchInput.value.trim() !== '') searchUsers({ target: searchInput });
                    if (document.getElementById('requests-modal') && document.getElementById('requests-modal').style.display === 'flex') openRequestsModal();
                    if (document.getElementById('manage-connections-modal') && document.getElementById('manage-connections-modal').style.display === 'flex') openManageConnectionsModal();
                }
            }

            if (table === 'profiles') {
                if (payload.new && payload.new.user_id == currentUserId) updateUIForUser();
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
                if (document.getElementById('skills-grid') || document.getElementById('skills-carousel')) loadSkills();
            }

            if (table === 'app_users') {
                if (payload.new && payload.new.id == currentUserId) {
                    localStorage.setItem('currentUser', payload.new.username);
                    updateUIForUser();
                }
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
                if (document.getElementById('skills-grid') || document.getElementById('skills-carousel')) loadSkills();
            }

            // MESSAGING REALTIME (Includes Call Triggers & Rejections)
            if (table === 'messages' && currentUserId) {
                if (data && (data.sender_id == currentUserId || data.receiver_id == currentUserId)) {
                    if (data.receiver_id == currentUserId && payload.eventType === 'INSERT') {
                        
                        // IF WE ARE DIALING, AND THEY SENT A MESSAGE, THEY REJECTED THE CALL.
                        // Make sure it wasn't just a system sync message
                        if (isCallDialing && currentChatUserId == data.sender_id && !data.content.startsWith('[')) {
                            cleanupVideoEngine(); 
                        }

                        // Catch the special CALL_INVITE signaling tag
                        if (data.content.startsWith('[CALL_INVITE]:')) {
                            const roomName = data.content.split(':')[1];
                            supabaseClient.from('app_users').select('username, profiles(avatar_url)').eq('id', data.sender_id).single().then(({data: caller}) => {
                                if (caller) {
                                    let avatar = caller.profiles && caller.profiles.avatar_url ? caller.profiles.avatar_url : null;
                                    showIncomingCallModal(data.sender_id, caller.username, avatar, roomName);
                                }
                            });
                        }
                        
                        // Catch the Mutual End Call Signal
                        else if (data.content.startsWith('[CALL_ENDED]:')) {
                            if (isCallConnected || isCallDialing || isCallRinging) {
                                cleanupVideoEngine();
                            }
                        }
                        // Catch Missed Call Cancelation
                        else if (data.content === '[CALL_MISSED]') {
                            const popup = document.getElementById('incoming-call-popup');
                            if(popup) popup.remove();
                            stopRingtone();
                            if (isCallRinging) {
                                cleanupVideoEngine();
                            }
                        }

                        if (currentChatUserId && data.sender_id == currentChatUserId) {
                            supabaseClient.from('messages').update({ is_read: true }).eq('id', data.id).then();
                            const chatArea = document.getElementById('chat-messages-area');
                            if (chatArea && chatArea.innerHTML.includes('Say hi')) chatArea.innerHTML = '';
                            if (chatArea) {
                                chatArea.innerHTML += createMessageHtml(data, false);
                                chatArea.scrollTop = chatArea.scrollHeight;
                                lucide.createIcons();
                            }
                            if (window.location.pathname.includes('messages.html')) loadChatConnections();
                        } else {
                            updateMessagesBadge();
                            if (window.location.pathname.includes('messages.html')) loadChatConnections();
                        }
                    } else if (payload.eventType === 'UPDATE') {
                         if (currentChatUserId && (data.sender_id == currentChatUserId || data.receiver_id == currentChatUserId)) {
                             loadChatMessages(currentChatUserId);
                         }
                    } else if (data.sender_id == currentUserId && payload.eventType === 'INSERT') {
                         if (window.location.pathname.includes('messages.html')) loadChatConnections();
                    }
                }
            }
        })
        .subscribe();
}

document.addEventListener('DOMContentLoaded', () => {
    loadSkills();
    updateUIForUser();
    updateRequestsBadge();
    updateMessagesBadge();
    
    setupRealtimeListeners();

    const track = document.getElementById('skills-carousel');
    if (track) {
        track.addEventListener('scroll', updateCarouselArrows);
        window.addEventListener('resize', updateCarouselArrows);
        
        track.addEventListener('wheel', (e) => {
            const isScrollable = track.scrollWidth > track.clientWidth;
            if (isScrollable && e.deltaY !== 0) {
                e.preventDefault(); 
                
                if (!isCarouselAnimating) {
                    carouselTargetScroll = track.scrollLeft;
                }
                
                carouselTargetScroll += e.deltaY * 1.5;
                const maxScroll = track.scrollWidth - track.clientWidth;
                carouselTargetScroll = Math.max(0, Math.min(carouselTargetScroll, maxScroll));

                animateCarouselScroll(track);
            }
        }, { passive: false });
    }
    
    // Check if we need to auto-join a call (from accepting the popup on another page)
    if (window.location.pathname.includes('messages.html')) {
        initMessagesPage();
        
        const urlParams = new URLSearchParams(window.location.search);
        const joinRoom = urlParams.get('joinCall');
        const callerId = urlParams.get('callerId');
        
        if (joinRoom && callerId) {
            window.history.replaceState({}, document.title, window.location.pathname);
            
            supabaseClient.from('app_users').select('username, profiles(avatar_url)').eq('id', callerId).single().then(({data: caller}) => {
                if (caller) {
                    let avatar = caller.profiles && caller.profiles.avatar_url ? caller.profiles.avatar_url : null;
                    setTimeout(() => {
                        openChatWithUser(callerId, caller.username, avatar);
                        joinVideoRoomFromInvite(joinRoom);
                    }, 500); 
                }
            });
        }
    }
    
    if (document.getElementById('profile-page-name')) {
        loadUserProfile();
        loadCertificates(); 
    }
    if (window.location.pathname.includes('view-profile.html')) {
        loadPublicProfile();
        loadPublicCertificates();
    }
});


// ==========================================
// 12. UI HELPERS (TOASTS)
// ==========================================
function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.cssText = "position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #1f2937; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10001; font-size: 0.95rem; font-weight: 500; display: none; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); transition: opacity 0.3s ease; display: flex; align-items: center; gap: 10px;";
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i data-lucide="info" style="width: 18px; height: 18px; color: #60a5fa;"></i> ${message}`;
    lucide.createIcons();
    
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.style.display = 'none', 300);
    }, 3500);
}


// ==========================================
// 13. AGORA VIDEO CALLING ENGINE 
// ==========================================
const AGORA_APP_ID = "8adb28c71a9e40f8905245db411405ff"; 

let rtc = {
    localAudioTrack: null,
    localVideoTrack: null,
    client: null
};

let options = {
    appId: AGORA_APP_ID,
    channel: null,
    token: null,
    uid: null
};

let isAudioMuted = false;
let isVideoMuted = false;
let noCameraDetected = false;
let isCallConnected = false;

// Audio Handlers
let isCallRinging = false;
let isCallDialing = false;

const ringAudio = new Audio('https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg');
ringAudio.loop = true;

const dialAudio = new Audio('https://actions.google.com/sounds/v1/communications/calling_connect_beep.ogg');
dialAudio.loop = true;

function playRingtone() { 
    isCallRinging = true; 
    ringAudio.play().catch(e => console.log("Browser autoplay policy blocked ringtone")); 
}
function stopRingtone() { 
    isCallRinging = false; 
    ringAudio.pause(); 
    ringAudio.currentTime = 0; 
}

function playDialtone() { 
    isCallDialing = true; 
    dialAudio.play().catch(e => console.log("Browser autoplay policy blocked dialtone")); 
}
function stopDialtone() { 
    isCallDialing = false; 
    dialAudio.pause(); 
    dialAudio.currentTime = 0; 
}


// 1. Fetch Token from Backend
async function fetchAgoraToken(channelName) {
    try {
        const response = await fetch(`/rtcToken?channelName=${channelName}`);
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error("Error fetching token:", error);
        return null;
    }
}

// 2. Trigger the Call (Caller Side)
async function startVideoCall() {
    if (!currentChatUserId) return;
    const currentUserId = localStorage.getItem('currentUserId');

    const roomName = `SkillSwap_${Math.min(currentUserId, currentChatUserId)}_${Math.max(currentUserId, currentChatUserId)}`;
    options.channel = roomName;

    const token = await fetchAgoraToken(roomName);
    if (!token) return;
    options.token = token;
    options.uid = currentUserId; 

    document.getElementById('call-room-name').innerText = `Room: ${roomName}`;
    document.getElementById('call-time').innerText = "Calling...";
    document.getElementById('video-call-overlay').style.display = 'flex';

    // Send invite and start playing dialing sound
    const messageContent = `[CALL_INVITE]:${roomName}`;
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: currentChatUserId, content: messageContent
    }]);
    loadChatMessages(currentChatUserId);
    
    playDialtone();
    await joinCall();
}

// Automatically called when a user Accepts the call from the popup
async function joinVideoRoomFromInvite(roomName) {
    const currentUserId = localStorage.getItem('currentUserId');
    options.channel = roomName;
    const token = await fetchAgoraToken(roomName);
    if (!token) return;
    options.token = token;
    options.uid = currentUserId;

    document.getElementById('call-room-name').innerText = `Room: ${roomName}`;
    document.getElementById('call-time').innerText = "Connecting...";
    document.getElementById('video-call-overlay').style.display = 'flex';
    
    await joinCall();
}

// 3. Connect to Agora (Hardware Bulletproof Version)
async function joinCall() {
    rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Listen for when the OTHER user joins and turns on their camera
    rtc.client.on("user-published", async (user, mediaType) => {
        await rtc.client.subscribe(user, mediaType);
        
        // They picked up! Stop dialing.
        stopDialtone();

        // ** PERFECT TIMER SYNC **
        // This only fires when the two users have actually connected
        if (!isCallConnected) {
            startCallTimer();
            isCallConnected = true;
        }

        if (mediaType === "video") {
            if (document.getElementById(`player-${user.uid}`) === null) {
                const playerContainer = document.createElement("div");
                playerContainer.id = `player-${user.uid}`;
                playerContainer.style.width = "100%";
                playerContainer.style.height = "100%";
                playerContainer.style.background = "#3c4043";
                playerContainer.style.borderRadius = "8px";
                playerContainer.style.overflow = "hidden";
                document.getElementById("remote-playerlist").append(playerContainer);
            }
            user.videoTrack.play(`player-${user.uid}`);
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    });

    // Listen for when the OTHER user leaves ungracefully (tab closed)
    rtc.client.on("user-left", (user) => {
        showToast("The other user disconnected.");
        setTimeout(() => {
            endCallButtonAction(); 
        }, 1000);
    });

    await rtc.client.join(options.appId, options.channel, options.token, options.uid);

    try {
        noCameraDetected = false; 
        [rtc.localAudioTrack, rtc.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        rtc.localVideoTrack.play("local-player");
        await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
    } catch (error) {
        if (error.message.includes("DEVICE_NOT_FOUND") || error.name === "NotFoundError") {
            
            noCameraDetected = true;
            
            // Force the UI button to look disabled
            const camBtn = document.getElementById('btn-cam');
            if(camBtn) {
                camBtn.classList.add('active-off');
                camBtn.innerHTML = `<i data-lucide="video-off" style="width: 20px; height: 20px;"></i>`;
            }

            const localPlayer = document.getElementById("local-player");
            localPlayer.innerHTML = `<div style="color: #9ca3af; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 8px;"><i data-lucide="video-off" style="width: 24px; height: 24px;"></i> No Camera Found</div>`;
            lucide.createIcons(); 
            
            showToast("Camera not detected. Falling back to audio-only.");

            try {
                rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                await rtc.client.publish([rtc.localAudioTrack]);
            } catch (audioError) {
                localPlayer.innerHTML = `<div style="color: #ef4444; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 8px;"><i data-lucide="mic-off" style="width: 24px; height: 24px;"></i> No Hardware</div>`;
                lucide.createIcons();
            }
        }
    }
}

// 4. End Call Logic & Clean Up
async function endCallButtonAction() {
    if (isCallConnected && currentChatUserId) {
        // Send actual duration to the chat
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        const durationStr = `${mins}:${secs}`;
        
        const currentUserId = localStorage.getItem('currentUserId');
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId, 
            receiver_id: currentChatUserId, 
            content: `[CALL_ENDED]:${durationStr}`
        }]);
    } else if (isCallDialing && currentChatUserId) {
        // We cancelled the call before they picked up
        const currentUserId = localStorage.getItem('currentUserId');
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId, 
            receiver_id: currentChatUserId, 
            content: `[CALL_MISSED]`
        }]);
    }
    
    cleanupVideoEngine();
}

// Handles the actual hardware cleanup and UI reset for both users
async function cleanupVideoEngine() {
    stopDialtone();
    stopRingtone();
    
    if (rtc.localAudioTrack) { rtc.localAudioTrack.close(); rtc.localAudioTrack = null; }
    if (rtc.localVideoTrack) { rtc.localVideoTrack.close(); rtc.localVideoTrack = null; }
    if (rtc.client) { await rtc.client.leave(); }

    const overlay = document.getElementById('video-call-overlay');
    if (overlay) overlay.style.display = 'none';
    
    const remoteList = document.getElementById("remote-playerlist");
    if (remoteList) remoteList.innerHTML = ""; 
    
    stopCallTimer();

    // Reset globals for next call
    isAudioMuted = false;
    isVideoMuted = false;
    noCameraDetected = false;
    isCallConnected = false;
    isCallDialing = false;
    isCallRinging = false;
    
    const camBtn = document.getElementById('btn-cam');
    if(camBtn) {
        camBtn.classList.remove('active-off');
        camBtn.innerHTML = `<i data-lucide="video" style="width: 20px; height: 20px;"></i>`;
    }
    const micBtn = document.getElementById('btn-mic');
    if(micBtn) {
        micBtn.classList.remove('active-off');
        micBtn.innerHTML = `<i data-lucide="mic" style="width: 20px; height: 20px;"></i>`;
    }
    lucide.createIcons();
}


// 5. Button Actions (Mic & Camera)
function toggleMic() {
    if(!rtc.localAudioTrack) return;
    isAudioMuted = !isAudioMuted;
    rtc.localAudioTrack.setMuted(isAudioMuted);
    
    const btn = document.getElementById('btn-mic');
    if(isAudioMuted) {
        btn.classList.add('active-off');
        btn.innerHTML = `<i data-lucide="mic-off" style="width: 20px; height: 20px;"></i>`;
    } else {
        btn.classList.remove('active-off');
        btn.innerHTML = `<i data-lucide="mic" style="width: 20px; height: 20px;"></i>`;
    }
    lucide.createIcons();
}

function toggleCam() {
    if(noCameraDetected) {
        showToast("Cannot toggle. No camera detected on your device.");
        return;
    }
    
    if(!rtc.localVideoTrack) return;
    isVideoMuted = !isVideoMuted;
    rtc.localVideoTrack.setMuted(isVideoMuted);
    
    const btn = document.getElementById('btn-cam');
    if(isVideoMuted) {
        btn.classList.add('active-off');
        btn.innerHTML = `<i data-lucide="video-off" style="width: 20px; height: 20px;"></i>`;
    } else {
        btn.classList.remove('active-off');
        btn.innerHTML = `<i data-lucide="video" style="width: 20px; height: 20px;"></i>`;
    }
    lucide.createIcons();
}

// 6. Simple Timer Logic
let callInterval;
let callSeconds = 0;

function startCallTimer() {
    callSeconds = 0;
    const timeDisplay = document.getElementById('call-time');
    timeDisplay.innerText = "00:00"; 
    
    callInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        timeDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopCallTimer() {
    clearInterval(callInterval);
}

// ==========================================
// 14. GLOBAL INCOMING CALL POPUP LOGIC (LIGHT THEME)
// ==========================================
function showIncomingCallModal(callerId, callerName, avatarUrl, roomName) {
    const existing = document.getElementById('incoming-call-popup');
    if (existing) existing.remove();

    playRingtone();

    const avatarHtml = avatarUrl 
        ? `<img src="${avatarUrl}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">` 
        : `<div style="width: 70px; height: 70px; border-radius: 50%; background: ${getColorForUsername(callerName)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: bold; border: 3px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${callerName.charAt(0).toUpperCase()}</div>`;

    const html = `
    <div id="incoming-call-popup" style="position: fixed; bottom: 30px; right: 30px; width: 280px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 10000; padding: 25px 20px; text-align: center; color: #111827; font-family: 'Inter', sans-serif; animation: slideUp 0.3s ease-out;">
        <style>
            @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
            .call-btn { width: 50px; height: 50px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
            .call-btn:hover { transform: scale(1.1); }
            .btn-accept { background: #22c55e; color: white; animation: pulseRing 2s infinite; }
            .btn-reject { background: #ef4444; color: white; }
            .quick-reply-select { width: 100%; margin-top: 15px; padding: 10px; border-radius: 6px; background: #f9fafb; color: #111827; border: 1px solid #d1d5db; font-size: 0.85rem; outline: none; appearance: none; cursor: pointer; }
            .quick-reply-btn { margin-top: 15px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px 12px; border-radius: 6px; color: #374151; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: background 0.2s; }
            .quick-reply-btn:hover { background: #e5e7eb; color: #111827; }
        </style>
        
        <div style="display: flex; justify-content: center; margin-bottom: 15px;">
            ${avatarHtml}
        </div>
        <h3 style="margin: 0 0 5px 0; font-size: 1.25rem;">${callerName}</h3>
        <p style="margin: 0 0 25px 0; color: #6b7280; font-size: 0.9rem;">Incoming Video Call...</p>
        
        <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 15px;">
            <button class="call-btn btn-reject" onclick="rejectCall(${callerId})" title="Reject">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.59 13.41 12 12m0 0 1.41-1.41M12 12l1.41 1.41M12 12l-1.41-1.41M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button class="call-btn btn-accept" onclick="acceptCall('${callerId}', '${roomName}')" title="Accept">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
            <select id="reject-reason-${callerId}" class="quick-reply-select">
                <option value="">-- Or reply with a message --</option>
                <option value="I'm busy right now, I'll call you back.">I'm busy right now</option>
                <option value="Give me 15 minutes.">Give me 15 mins</option>
                <option value="In a meeting, text me!">In a meeting</option>
                <option value="Can we text instead?">Can we text instead?</option>
            </select>
            <button class="quick-reply-btn" onclick="rejectCallWithReason(${callerId})">Send</button>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// Red Button Logic
window.rejectCall = async function(callerId) {
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    stopRingtone();
    
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: callerId, content: "I'm busy right now."
    }]);
    
    if (window.location.pathname.includes('messages.html') && currentChatUserId == callerId) {
        loadChatMessages(callerId);
    }
};

// Dropdown Button Logic
window.rejectCallWithReason = async function(callerId) {
    const select = document.getElementById(`reject-reason-${callerId}`);
    const reason = select.value;
    
    if (!reason) {
        rejectCall(callerId); 
        return;
    }
    
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    stopRingtone();
    
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: callerId, content: reason
    }]);
    
    if (window.location.pathname.includes('messages.html') && currentChatUserId == callerId) {
        loadChatMessages(callerId);
    }
};

// Green Button Logic
window.acceptCall = function(callerId, roomName) {
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    stopRingtone();
    
    if (window.location.pathname.includes('messages.html')) {
        supabaseClient.from('app_users').select('username, profiles(avatar_url)').eq('id', callerId).single().then(({data: caller}) => {
            if (caller) {
                let avatar = caller.profiles && caller.profiles.avatar_url ? caller.profiles.avatar_url : null;
                openChatWithUser(callerId, caller.username, avatar);
                joinVideoRoomFromInvite(roomName);
            }
        });
    } else {
        window.location.href = `messages.html?joinCall=${roomName}&callerId=${callerId}`;
    }
};
