// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================
lucide.createIcons();

const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// SUPABASE OAUTH LISTENER (For Google Login)
// ==========================================
// ==========================================
// SUPABASE OAUTH LISTENER (For Google Login)
// ==========================================
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        const googleUser = session.user;
        const email = googleUser.email;
        const username = googleUser.user_metadata?.full_name || email.split('@')[0];

        const { data: existingUser } = await supabaseClient.from('app_users').select('*').eq('email', email);

        let currentAppUserId;
        let currentAppUsername;
        let roleToSave = 'user'; 

        if (!existingUser || existingUser.length === 0) {
            // First time Google login
            const { data: newUser } = await supabaseClient.from('app_users').insert([{
                email: email,
                username: username,
                password: 'GOOGLE_OAUTH_USER' 
            }]).select().single();

            if (newUser) {
                await supabaseClient.from('profiles').insert([{ user_id: newUser.id, is_available: true, role: 'user' }]);
                currentAppUserId = newUser.id;
                currentAppUsername = newUser.username;
            }
        } else {
            // Returning Google user
            currentAppUserId = existingUser[0].id;
            currentAppUsername = existingUser[0].username;
            
            // Fetch their role so admins don't lose powers logging in with Google
            const { data: prof } = await supabaseClient.from('profiles').select('role').eq('user_id', currentAppUserId).single();
            if (prof && prof.role) roleToSave = prof.role;
        }

        if (currentAppUserId) {
            localStorage.setItem('currentUserId', currentAppUserId);
            localStorage.setItem('currentUser', currentAppUsername);
            localStorage.setItem('currentUserRole', roleToSave);
            
            // THE FIX: Immediately destroy the internal Supabase session so they 
            // match the exact behavior of our custom email/password users!
            await supabaseClient.auth.signOut();

            if (window.location.pathname.includes('auth.html')) {
                window.location.href = "index.html"; 
            } else {
                if (typeof updateUIForUser === 'function') updateUIForUser(); 
            }
        }
    }
});

function getAvatarHtml(user, size = 36) {
    let url = null;
    if (user.profiles) url = Array.isArray(user.profiles) ? user.profiles[0]?.avatar_url : user.profiles.avatar_url;
    if (url) return `<img src="${url}" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="${user.username}">`;
    return `<div class="connection-avatar" style="width: ${size}px; height: ${size}px; font-size: ${size/2.5}px; background-color: ${getColorForUsername(user.username)}; flex-shrink: 0;">${user.username.charAt(0).toUpperCase()}</div>`;
}

function getColorForUsername(username) {
    if (!username) return '#8b5cf6';
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}





// ==========================================
// 1.5 AUTHENTICATION & UI LOGIC
// ==========================================
let isLoginMode = true;

window.toggleAuthMode = function(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;
    const authTitle = document.getElementById('auth-title') || document.getElementById('form-title'); 
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('toggle-text'); 
    const toggleLink = document.getElementById('toggle-link');
    const msgBox = document.getElementById('auth-message') || document.getElementById('auth-error'); 
    const usernameContainer = document.getElementById('username-container');
    const usernameInput = document.getElementById('auth-username') || document.getElementById('username'); 
    const passwordHint = document.getElementById('password-hint');
    const submitBtn = document.getElementById('auth-submit-btn') || document.getElementById('submit-btn');

    if (msgBox) msgBox.style.display = 'none';
    if (isLoginMode) {
        if(authTitle) authTitle.innerText = 'Welcome Back'; 
        if(authSubtitle) authSubtitle.innerText = 'Enter your details to sign in';
        if(toggleText) toggleText.innerText = "Don't have an account?"; 
        if(toggleLink) toggleLink.innerText = 'Sign up';
        if(usernameContainer) usernameContainer.style.display = 'none'; 
        if(usernameInput) usernameInput.removeAttribute('required');
        if(passwordHint) passwordHint.style.display = 'none'; 
        if(submitBtn) submitBtn.innerText = 'Sign In';
    } else {
        if(authTitle) authTitle.innerText = 'Create an Account'; 
        if(authSubtitle) authSubtitle.innerText = 'Join the community to start swapping skills';
        if(toggleText) toggleText.innerText = "Already have an account?"; 
        if(toggleLink) toggleLink.innerText = 'Sign in';
        if(usernameContainer) usernameContainer.style.display = 'block'; 
        if(usernameInput) usernameInput.setAttribute('required', 'true');
        if(passwordHint) passwordHint.style.display = 'block'; 
        if(submitBtn) submitBtn.innerText = 'Create Account';
    }
}

window.showAuthMessage = function(message, isError = true) {
    const msgBox = document.getElementById('auth-message') || document.getElementById('auth-error'); 
    if (!msgBox) { alert(message); return; }
    msgBox.innerText = message; 
    msgBox.className = isError ? 'auth-message error' : 'auth-message success'; 
    msgBox.style.display = 'block';
    if (msgBox.id === 'auth-error') msgBox.style.color = isError ? '#ef4444' : '#10b981';
}

window.handleAuthSubmit = async function(event) { 
    if (event) event.preventDefault(); 
    const authTitle = document.getElementById('auth-title') || document.getElementById('form-title');
    if (authTitle && authTitle.innerText.includes('Create')) { isLoginMode = false; } 
    else if (authTitle && authTitle.innerText.includes('Welcome')) { isLoginMode = true; }

    if (isLoginMode) await handleSignIn(); 
    else await handleSignUp(); 
}

window.handleAuth = window.handleAuthSubmit;

window.signInWithGoogle = async function(event) {
    if (event) event.preventDefault();
    const { data, error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) { showAuthMessage("Error signing in with Google."); console.error(error); }
}

window.handleSignUp = async function() {
    const emailInput = document.getElementById('auth-email') || document.getElementById('email');
    const usernameInput = document.getElementById('auth-username') || document.getElementById('username');
    const passwordInput = document.getElementById('auth-password') || document.getElementById('password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim(); 
    const username = usernameInput ? usernameInput.value.trim() : email.split('@')[0]; 
    const password = passwordInput.value;
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) { showAuthMessage("Password requires 8+ chars, 1 uppercase, 1 lowercase, and 1 number."); return; }
    
    const { data: existingUsers } = await supabaseClient.from('app_users').select('*').or(`username.eq.${username},email.eq.${email}`);
    if (existingUsers && existingUsers.length > 0) { showAuthMessage("That username or email is already taken."); return; }
    
    const { data: newUser, error: insertError } = await supabaseClient.from('app_users').insert([{ email, username, password }]).select().single();
    if (insertError) { showAuthMessage("Error creating account. Please try again."); return; }
    
    if (newUser) await supabaseClient.from('profiles').insert([{ user_id: newUser.id, is_available: true }]);
    
    const authForm = document.getElementById('auth-form') || document.querySelector('form');
    if (authForm) authForm.reset(); 
    
    showAuthMessage("Account created successfully! Logging you in...", false); 
    setTimeout(() => {
        localStorage.setItem('currentUserId', newUser.id); 
        localStorage.setItem('currentUser', newUser.username); 
        window.location.href = "index.html";
    }, 1000);
}

window.handleSignIn = async function() {
    const emailInput = document.getElementById('auth-email') || document.getElementById('email');
    const passwordInput = document.getElementById('auth-password') || document.getElementById('password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim(); 
    const password = passwordInput.value;
    const { data, error } = await supabaseClient.from('app_users').select('*').eq('email', email).eq('password', password);
    
    if (error || !data || data.length === 0) { showAuthMessage("Invalid email or password."); return; }
    localStorage.setItem('currentUserId', data[0].id); 
    localStorage.setItem('currentUser', data[0].username); 
    window.location.href = "index.html";
}

window.handleLogout = async function() { 
    localStorage.removeItem('currentUserId'); 
    localStorage.removeItem('currentUser'); 
    localStorage.removeItem('currentUserRole');
    window.location.href = "index.html"; 
}

window.updateUIForUser = async function() {
    const loggedOutUI = document.getElementById('logged-out-ui'); const loggedInUI = document.getElementById('logged-in-ui');
    const avatarBtn = document.getElementById('user-avatar-btn'); const avatarInitial = document.getElementById('avatar-initial');
    const dropdownUsername = document.getElementById('dropdown-username'); const navAvatarImg = document.getElementById('nav-avatar-img');
    if (!loggedOutUI || !loggedInUI) return;
    
    const currentUser = localStorage.getItem('currentUser'); const currentUserId = localStorage.getItem('currentUserId');

    if (currentUser) {
        loggedOutUI.style.display = 'none'; loggedInUI.style.display = 'flex';
        if (avatarBtn) avatarBtn.title = `Logged in as ${currentUser}`; if (dropdownUsername) dropdownUsername.innerText = currentUser;
        
        if (currentUserId) {
            const { data: profile } = await supabaseClient.from('profiles').select('avatar_url, role').eq('user_id', currentUserId).single();
            if (profile) {
                localStorage.setItem('currentUserRole', profile.role);
                
                if (profile.avatar_url && navAvatarImg) {
                    if (avatarInitial) avatarInitial.style.display = 'none'; navAvatarImg.src = profile.avatar_url; navAvatarImg.style.display = 'block';
                    if (avatarBtn) { avatarBtn.style.backgroundColor = 'transparent'; avatarBtn.style.border = '2px solid #22c55e'; }
                } else {
                    if (navAvatarImg) navAvatarImg.style.display = 'none';
                    if (avatarInitial) { avatarInitial.innerText = currentUser.charAt(0).toUpperCase(); avatarInitial.style.display = 'flex'; if (avatarBtn) avatarBtn.style.backgroundColor = getColorForUsername(currentUser); }
                }

                const adminLink = document.getElementById('admin-dashboard-link');
                if (adminLink) {
                    if (profile.role === 'admin' || profile.role === 'super_admin') { adminLink.style.display = 'block'; } 
                    else { adminLink.style.display = 'none'; }
                }
            }
        }
    } else { loggedOutUI.style.display = 'block'; loggedInUI.style.display = 'none'; }
}

window.toggleDropdown = function(event) {
    event.stopPropagation(); 
    const userDropdown = document.getElementById('user-dropdown'); const connDropdown = document.getElementById('connections-dropdown'); const inboxDropdown = document.getElementById('inbox-dropdown');
    if (connDropdown) connDropdown.classList.remove('show'); 
    if (inboxDropdown) inboxDropdown.classList.remove('show');
    if (userDropdown) userDropdown.classList.toggle('show');
}

window.toggleConnectionsDropdown = function(event) {
    event.stopPropagation(); 
    const userDropdown = document.getElementById('user-dropdown'); 
    const connDropdown = document.getElementById('connections-dropdown'); 
    const inboxDropdown = document.getElementById('inbox-dropdown');
    if (userDropdown) userDropdown.classList.remove('show'); 
    if (inboxDropdown) inboxDropdown.classList.remove('show');
    if (connDropdown) { 
        connDropdown.classList.toggle('show'); 
        if (connDropdown.classList.contains('show') && document.getElementById('connection-search') && document.getElementById('connection-search').value === '') {
            if (typeof loadTopConnections === 'function') loadTopConnections();
        }
    }
};

window.onclick = function(event) {
    const userDropdown = document.getElementById('user-dropdown'); const connDropdown = document.getElementById('connections-dropdown'); const inboxDropdown = document.getElementById('inbox-dropdown');
    if (userDropdown && userDropdown.classList.contains('show')) userDropdown.classList.remove('show');
    if (connDropdown && connDropdown.classList.contains('show') && !event.target.closest('#connections-dropdown') && !event.target.closest('button[title="My Network"]')) connDropdown.classList.remove('show');
    if (inboxDropdown && inboxDropdown.classList.contains('show') && !event.target.closest('#inbox-dropdown') && !event.target.closest('button[title="Notifications"]')) inboxDropdown.classList.remove('show');
    document.querySelectorAll('.post-options-menu').forEach(m => m.style.display = 'none');
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
                track.scrollLeft = carouselTargetScroll; isCarouselAnimating = false;
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
    const currentUserRole = localStorage.getItem('currentUserRole');
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';

    const { data: rawSkills } = await supabaseClient.from('skills').select('*').eq('is_active', true).order('created_at', { ascending: false });
    
    if (!rawSkills || rawSkills.length === 0) {
        carouselTrack.innerHTML = `<p style="text-align: center; color: #6b7280; width: 100%;">No skills posted yet. Be the first!</p>`;
        if(typeof updateCarouselArrows === 'function') updateCarouselArrows();
        return;
    }

    const userIds = [...new Set(rawSkills.map(s => s.user_id))];
    const { data: users } = await supabaseClient.from('app_users').select('id, username, profiles(avatar_url)').in('id', userIds);
    const userMap = {}; if (users) users.forEach(u => userMap[u.id] = u);

    carouselTrack.innerHTML = rawSkills.map(skill => {
        const u = userMap[skill.user_id] || { username: 'Unknown' };
        const shortDesc = skill.description.length > 80 ? skill.description.substring(0, 80) + '...' : skill.description;
        const isOwner = skill.user_id == currentUserId;

        const deleteAction = isAdmin && !isOwner ? `adminDeletePost(event, ${skill.id})` : `deletePost(event, ${skill.id})`;

        return `
        <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: white; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="openSkillDetailModal(${skill.id})">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size:0.75rem; font-weight: 600; color:#8b5cf6; background:#f5f3ff; padding:4px 10px; border-radius:6px;">${skill.category}</span>
                    <div style="position: relative;">
                        <button onclick="togglePostMenu(event, ${skill.id})" class="icon-btn" style="padding: 4px; margin: -4px;"><i data-lucide="more-horizontal" style="width: 20px; height: 20px; color: #9ca3af;"></i></button>
                        <div id="post-menu-${skill.id}" class="post-options-menu dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; width: 140px; padding: 5px; z-index: 20; cursor: default; margin-top: 5px;">
                            ${(isOwner || isAdmin) ? `<button onclick="${deleteAction}" style="width: 100%; text-align: left; color: #ef4444; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 4px;" onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='transparent'">Remove Post</button>` : ''}
                            ${!isOwner ? `<button onclick="reportPost(event, ${skill.id})" style="width: 100%; text-align: left; color: #4b5563; background: none; border: none; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">Report</button>` : ''}
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

window.adminDeletePost = async function(event, postId) {
    event.stopPropagation(); 
    if(confirm("Admin: Are you sure you want to remove this post from the public feed?")) {
        await supabaseClient.from('skills').update({ is_active: false }).eq('id', postId);
        loadSkills(); 
        showToast("Post removed by Admin.");
    }
}

window.scrollCarousel = function(direction) {
    const track = document.getElementById('skills-carousel');
    if (!track) return;
    if (!isCarouselAnimating) carouselTargetScroll = track.scrollLeft;
    const scrollAmount = 320 * 2;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (direction === 'left') carouselTargetScroll -= scrollAmount;
    else carouselTargetScroll += scrollAmount;
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

// --- SKILL DEEP DIVE MODAL ---
async function openSkillDetailModal(skillId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = "auth.html"; return; }

    const content = document.getElementById('skill-detail-content');
    content.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 30px;">Loading details...</p>`;
    document.getElementById('skill-detail-modal').style.display = 'flex';

    const { data: skill } = await supabaseClient.from('skills').select('*').eq('id', skillId).single();
    if (!skill) { closeSkillDetailModal(); return; }
    
    const { data: user } = await supabaseClient.from('app_users').select('id, username, profiles(avatar_url, wanted_skills)').eq('id', skill.user_id).single();
    const { data: currentProfile } = await supabaseClient.from('profiles').select('is_available').eq('user_id', currentUserId).single();
    const amIAvailable = currentProfile ? currentProfile.is_available : true;

    const { data: existingOffer } = await supabaseClient.from('swap_requests').select('status').eq('requester_id', currentUserId).eq('skill_id', skillId).single();

    let actionBtnHtml = ''; let ownerOffersHtml = '';

    if (skill.user_id == currentUserId) {
        actionBtnHtml = `<span style="font-size: 0.75rem; color: #6b7280; font-style: italic;">Your Post</span>`;
        const { data: pendingOffers } = await supabaseClient.from('swap_requests').select('id, requester_id, app_users!swap_requests_requester_id_fkey(username, profiles(avatar_url))').eq('skill_id', skillId).eq('status', 'pending');

        if (pendingOffers && pendingOffers.length > 0) {
            ownerOffersHtml = `
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
                <h4 style="margin: 0 0 15px 0; font-size: 1rem; color: #111827;">Pending Swap Offers (${pendingOffers.length})</h4>
                ${!amIAvailable ? `<div style="background: #fee2e2; color: #ef4444; padding: 10px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 15px; border: 1px solid #fecaca;"><i data-lucide="alert-circle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> You must finish your current active swap before accepting new ones.</div>` : ''}
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${pendingOffers.map(offer => {
                        const requester = offer.app_users;
                        const acceptBtnHtml = amIAvailable 
                            ? `<button onclick="handleAcceptOffer(${offer.id}, ${skillId})" class="icon-btn" style="color: #10b981; background: #d1fae5; padding: 6px; border-radius: 6px;" title="Accept"><i data-lucide="check" style="width: 16px; height: 16px;"></i></button>`
                            : `<button class="icon-btn" style="color: #9ca3af; background: #f3f4f6; padding: 6px; border-radius: 6px; cursor: not-allowed;" title="Finish current swap first"><i data-lucide="check" style="width: 16px; height: 16px;"></i></button>`;

                        return `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f9fafb; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <div style="display: flex; align-items: center; gap: 10px; cursor:pointer;" onclick="window.location.href='view-profile.html?id=${offer.requester_id}'">
                                ${getAvatarHtml(requester, 32)}
                                <span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${requester.username}</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                ${acceptBtnHtml}
                                <button onclick="handleRejectOffer(${offer.id}, ${skillId})" class="icon-btn" style="color: #ef4444; background: #fee2e2; padding: 6px; border-radius: 6px;" title="Reject"><i data-lucide="x" style="width: 16px; height: 16px;"></i></button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            ownerOffersHtml = `<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center;"><p style="color: #6b7280; font-size: 0.9rem; margin: 0;">No swap offers yet. Stay tuned!</p></div>`;
        }
    } 
    else {
        if (!amIAvailable) {
            actionBtnHtml = `<button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; opacity: 0.7; cursor: not-allowed; border: 1px solid #d1d5db;" disabled>Finish Current Swap First</button>`;
        } else if (existingOffer && existingOffer.status === 'pending') {
            actionBtnHtml = `<button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; cursor: not-allowed;" disabled>Offer Pending</button>`;
        } else {
            const safeTitle = skill.title.replace(/'/g, "\\'");
            actionBtnHtml = `<button onclick="makeSwapOffer(${skill.user_id}, ${skill.id}, '${safeTitle}')" class="btn-primary" style="padding: 8px 24px; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">SWAP</button>`;
        }
    }

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
            ${skill.user_id == currentUserId ? `<div>${actionBtnHtml}</div>` : ''}
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
            
            ${skill.user_id != currentUserId ? `
            <div style="margin-top: 30px; text-align: center; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px 0; font-size: 1rem; color: #111827; font-weight: 600;">Can you teach them?</p>
                ${actionBtnHtml}
                ${!amIAvailable ? `<p style="margin: 10px 0 0 0; font-size: 0.75rem; color: #ef4444;">You must finish your current active swap before making new offers.</p>` : ''}
            </div>` : ''}
            
            ${ownerOffersHtml}
        </div>
    `;
    lucide.createIcons();
}

function closeSkillDetailModal() { document.getElementById('skill-detail-modal').style.display = 'none'; }

async function makeSwapOffer(receiverId, skillId, skillTitle) {
    const currentUserId = localStorage.getItem('currentUserId');
    const currentUserName = localStorage.getItem('currentUser');
    const { error: offerError } = await supabaseClient.from('swap_requests').insert([{ requester_id: currentUserId, receiver_id: receiverId, skill_id: skillId, status: 'pending' }]);
    if (offerError) { showToast("Error sending offer."); return; }
    await supabaseClient.from('notifications').insert([{ user_id: receiverId, type: 'new_offer', message: `New Swap Offer! ${currentUserName} wants to swap for your skill: "${skillTitle}"` }]);
    showToast("Swap offer sent successfully!");
    openSkillDetailModal(skillId); 
}

async function handleAcceptOffer(offerId, skillId) {
    showToast("Processing swap...");
    const { error } = await supabaseClient.rpc('accept_swap_offer', { target_offer_id: offerId });
    if (error) { console.error(error); showToast("Error accepting offer. It may have already been resolved."); return; }
    closeSkillDetailModal();
    showToast("Swap Accepted! Check your messages.");
    loadSkills(); 
    if (document.getElementById('profile-page-name')) loadUserProfile(); 
}

async function handleRejectOffer(offerId, skillId) {
    await supabaseClient.from('swap_requests').update({ status: 'rejected' }).eq('id', offerId);
    const { data: req } = await supabaseClient.from('swap_requests').select('requester_id, skills(title)').eq('id', offerId).single();
    if(req) { await supabaseClient.from('notifications').insert([{ user_id: req.requester_id, type: 'rejected', message: `Your offer for "${req.skills.title}" was declined.` }]); }
    showToast("Offer rejected.");
    openSkillDetailModal(skillId); 
}

// --- POSTING A SKILL ---
async function checkWantedSkillsBeforePosting() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) { window.location.href = "auth.html"; return; }
    const { data: profile } = await supabaseClient.from('profiles').select('wanted_skills').eq('user_id', currentUserId).single();
    if (!profile || !profile.wanted_skills || profile.wanted_skills.trim() === "") { document.getElementById('warning-modal').style.display = 'flex'; } 
    else { openPostSkillModalForm(); }
}
function closeWarningModal() { document.getElementById('warning-modal').style.display = 'none'; }
function continueToPostSkill() { closeWarningModal(); openPostSkillModalForm(); }

async function openPostSkillModalForm() {
    const currentUserId = localStorage.getItem('currentUserId');
    const certSelect = document.getElementById('post-skill-cert');
    if(certSelect) certSelect.innerHTML = '<option value="">Loading your certificates...</option>';
    const modal = document.getElementById('post-skill-modal');
    if(modal) modal.style.display = 'flex';

    if(certSelect) {
        const { data: certs } = await supabaseClient.from('certificates').select('id, title').eq('user_id', currentUserId);
        certSelect.innerHTML = '<option value="">-- No certificate attached --</option>';
        if (certs) certs.forEach(cert => { certSelect.innerHTML += `<option value="${cert.id}">${cert.title}</option>`; });
    }
    const name = document.getElementById('post-skill-name'); if(name) name.value = '';
    const tag = document.getElementById('post-skill-tag'); if(tag) tag.value = '';
    const desc = document.getElementById('post-skill-desc'); if(desc) desc.value = '';
}
function closePostSkillModal() { document.getElementById('post-skill-modal').style.display = 'none'; }

async function submitPostSkill() {
    const userId = localStorage.getItem('currentUserId');
    const name = document.getElementById('post-skill-name').value.trim();
    const tag = document.getElementById('post-skill-tag').value.trim();
    const desc = document.getElementById('post-skill-desc').value.trim();
    const certId = document.getElementById('post-skill-cert') ? document.getElementById('post-skill-cert').value : null;

    if (!name || !tag || !desc) return; 

    const payload = { user_id: userId, title: name, category: tag, description: desc, is_active: true };
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
// 5. MESSAGING SYSTEM LOGIC
// ==========================================
let currentChatUserId = null;
let activeContextMenuMsgId = null;
let activeContextMenuMsgContent = null;

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
                } else if (lastMsg.content.startsWith('[WB_STATE]:')) {
                    lastMsgText = prefix + "Started a Whiteboard";
                } else if (lastMsg.content === '[SWAP_END_REQUEST]') {
                    lastMsgText = prefix + "Sent a completion request";
                } else if (lastMsg.content === '[SWAP_ENDED]') {
                    lastMsgText = "✅ Swap officially completed!";
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
    const { data: activeSwaps } = await supabaseClient.from('swap_requests')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${currentUserId})`)
        .limit(1);

    const endSwapBtn = document.getElementById('end-swap-btn');
    if (endSwapBtn) {
        endSwapBtn.style.display = (activeSwaps && activeSwaps.length > 0) ? 'flex' : 'none';
    }
    
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
        if (!msg.content.startsWith('[WB_STATE]:')) {
            chatArea.innerHTML += createMessageHtml(msg, msg.sender_id == currentUserId);
        }
    });
    
    chatArea.scrollTop = chatArea.scrollHeight;
    lucide.createIcons();
}

function createMessageHtml(msg, isSender) {
    let align = isSender ? 'align-self: flex-end;' : 'align-self: flex-start;';
    let bg = isSender ? 'background: #dcfce7; border: 1px solid #bbf7d0;' : 'background: #ffffff; border: 1px solid #e5e7eb;';
    const radius = isSender ? 'border-radius: 12px 12px 0 12px;' : 'border-radius: 12px 12px 12px 0;';
    
    const date = new Date(msg.created_at || Date.now());
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHtml = '';
    let metaHtml = '';
    let rightClickEvent = '';
    let maxW = '70%';

    if (msg.is_deleted) {
        contentHtml = `<div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-style: italic;">
                        <i data-lucide="ban" style="width: 14px; height: 14px;"></i> This message was deleted
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: right;">${timeString}</span>`;
        bg = isSender ? 'background: #f3f4f6; border: 1px solid #e5e7eb;' : 'background: #f9fafb; border: 1px solid #e5e7eb;';
    } 
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
        contentHtml = `<div style="display:flex; align-items:center; justify-content: center; gap:8px; font-weight: 500; color: #4b5563;">
                        <i data-lucide="phone" style="width:16px; height:16px;"></i> Call lasted ${duration}
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px; display: block; text-align: center;">${timeString}</span>`;
        bg = 'background: #f3f4f6; border: 1px solid #e5e7eb;';
        align = 'align-self: center;';
        maxW = '85%';
        rightClickEvent = ''; 
    }
    else if (msg.content === '[CALL_MISSED]') {
        contentHtml = `<div style="display:flex; align-items:center; justify-content: center; gap:8px; font-weight: 500; color: #ef4444;">
                        <i data-lucide="phone-missed" style="width:16px; height:16px;"></i> Missed Call
                       </div>`;
        metaHtml = `<span style="font-size: 0.7rem; color: #ef4444; margin-top: 4px; display: block; text-align: center; opacity: 0.8;">${timeString}</span>`;
        bg = 'background: #fef2f2; border: 1px solid #fecaca;';
        align = 'align-self: center;';
        maxW = '85%';
        rightClickEvent = ''; 
    }
    else if (msg.content === '[SWAP_END_REQUEST]') {
        if (isSender) {
            contentHtml = `<div style="display:flex; flex-direction:column; align-items:center; gap:8px; font-weight: 500; color: #4b5563; text-align:center;">
                            <span>You requested to end this swap. Waiting for confirmation.</span>
                           </div>`;
            bg = 'background: #f3f4f6; border: 1px solid #e5e7eb;';
        } else {
            contentHtml = `<div style="display:flex; flex-direction:column; align-items:center; gap:8px; font-weight: 500; color: #111827; text-align:center;">
                            <span style="margin-bottom: 5px;">The other user wants to mark this swap as complete. Do you agree?</span>
                            <button onclick="confirmEndSwap(${msg.id}, ${msg.sender_id})" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight:600;">Confirm & End Swap</button>
                           </div>`;
            bg = 'background: #ffffff; border: 2px solid #10b981;';
        }
        align = 'align-self: center;';
        maxW = '85%';
        metaHtml = '';
        rightClickEvent = '';
    }
    else if (msg.content === '[SWAP_ENDED]') {
        contentHtml = `<div style="display:flex; align-items:center; justify-content: center; gap:8px; font-weight: 600; color: #059669;">
                        <i data-lucide="party-popper" style="width:18px; height:18px;"></i> Swap Officially Completed! You are both free to make new offers.
                       </div>`;
        bg = 'background: #dcfce7; border: 1px solid #6ee7b7;';
        align = 'align-self: center;';
        maxW = '85%';
        metaHtml = '';
        rightClickEvent = ''; 
    }
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
        <div ${rightClickEvent} style="${align} ${bg} ${radius} padding: 10px 15px; max-width: ${maxW}; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 5px; font-size: 0.95rem; word-wrap: break-word; color: #111827; cursor: ${isSender && !msg.is_deleted && rightClickEvent !== '' ? 'context-menu' : 'default'};">
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

async function requestEndSwap() {
    const currentUserId = localStorage.getItem('currentUserId');
    if(!currentUserId || !currentChatUserId) return;
    
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: currentChatUserId, content: '[SWAP_END_REQUEST]'
    }]);
    
    document.getElementById('end-swap-btn').style.display = 'none';
    loadChatMessages(currentChatUserId);
    loadChatConnections();
}

async function confirmEndSwap(msgId, partnerId) {
    const currentUserId = localStorage.getItem('currentUserId');
    
    const { data: swapArray } = await supabaseClient.from('swap_requests')
        .select('skill_id, skills(title, user_id)')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(requester_id.eq.${partnerId},receiver_id.eq.${currentUserId})`);

    if (swapArray && swapArray.length > 0) {
        const swapData = swapArray[0];
        if (swapData.skills) {
            const skillTitle = swapData.skills.title;
            const ownerId = swapData.skills.user_id;

            const { data: ownerProfile } = await supabaseClient.from('profiles').select('trophy_skills').eq('user_id', ownerId).single();
            let trophies = ownerProfile && ownerProfile.trophy_skills ? ownerProfile.trophy_skills.split(',').map(s => s.trim()) : [];

            if (!trophies.includes(skillTitle)) {
                trophies.push(skillTitle);
                await supabaseClient.from('profiles').update({ trophy_skills: trophies.join(', ') }).eq('user_id', ownerId);
            }
        }
    }

    await supabaseClient.from('swap_requests')
        .update({ status: 'completed' })
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(requester_id.eq.${partnerId},receiver_id.eq.${currentUserId})`);
        
    await supabaseClient.from('profiles')
        .update({ is_available: true })
        .in('user_id', [currentUserId, partnerId]);

    await supabaseClient.from('messages').update({ is_deleted: true }).eq('id', msgId);
    
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: partnerId, content: '[SWAP_ENDED]'
    }]);
    
    const endBtn = document.getElementById('end-swap-btn');
    if (endBtn) endBtn.style.display = 'none';
    
    loadChatMessages(partnerId);
    loadChatConnections();
}

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
            badge.innerText = count > 99 ? '99+' : count;
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

        const { data: activePosts } = await supabaseClient.from('skills').select('title').eq('user_id', userId).eq('is_active', true);
        let activeSkillNames = activePosts ? activePosts.map(p => p.title.toLowerCase()) : [];

        const { data: ongoingSwaps } = await supabaseClient.from('swap_requests')
            .select('skills(title)')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
            
        if (ongoingSwaps) {
            ongoingSwaps.forEach(swap => {
                if (swap.skills && swap.skills.title) {
                    activeSkillNames.push(swap.skills.title.toLowerCase());
                }
            });
        }

        const skillsContainer = document.getElementById('profile-skills-container');
        if (profile.profile_skills && profile.profile_skills.trim() !== "") {
            const skillsArray = profile.profile_skills.split(',');
            const trophySkills = profile.trophy_skills ? profile.trophy_skills.split(',').map(s => s.trim().toLowerCase()) : [];

            skillsContainer.innerHTML = skillsArray.map(skill => {
                const s = skill.trim();
                if (s !== "") {
                    const isActive = activeSkillNames.includes(s.toLowerCase());
                    const isTrophy = trophySkills.includes(s.toLowerCase());
                    
                    let bgStyle = "";
                    let removeBtn = `<i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: #9ca3af;" onclick="removeSingleSkill('${s}')" title="Remove ${s}"></i>`;

                    if (isTrophy) {
                        bgStyle = "background: linear-gradient(90deg, #8b5cf6, #d946ef); color: white; border: none;";
                        if (isActive) {
                            removeBtn = ""; 
                        } else {
                            removeBtn = `<i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer; color: white; opacity: 0.8;" onclick="removeSingleSkill('${s}')" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8" title="Remove ${s}"></i>`;
                        }
                    } else if (isActive) {
                        bgStyle = "background-color: #dcfce7; color: #059669; border: 1px solid #a7f3d0;";
                        removeBtn = "";
                    }
                    
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
    const userId = localStorage.getItem('currentUserId'); 
    const { data: profile } = await supabaseClient.from('profiles').select('profile_skills, trophy_skills').eq('user_id', userId).single();
    if (profile && profile.profile_skills) { 
        let skillsArray = profile.profile_skills.split(',').map(s => s.trim()); 
        const updatedSkills = skillsArray.filter(s => s !== skillToRemove && s !== "").join(', '); 
        let updateData = { profile_skills: updatedSkills };
        
        if (profile.trophy_skills) {
            let trophyArray = profile.trophy_skills.split(',').map(s => s.trim());
            if (trophyArray.includes(skillToRemove)) {
                updateData.trophy_skills = trophyArray.filter(s => s !== skillToRemove && s !== "").join(', ');
            }
        }
        
        const { error } = await supabaseClient.from('profiles').update(updateData).eq('user_id', userId); 
        if (!error) loadUserProfile(); 
    }
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
        
        const { data: activePosts } = await supabaseClient.from('skills').select('title').eq('user_id', targetUserId).eq('is_active', true); 
        let activeSkillNames = activePosts ? activePosts.map(p => p.title.toLowerCase()) : [];

        const { data: ongoingSwaps } = await supabaseClient.from('swap_requests')
            .select('skills(title)')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);
            
        if (ongoingSwaps) {
            ongoingSwaps.forEach(swap => {
                if (swap.skills && swap.skills.title) {
                    activeSkillNames.push(swap.skills.title.toLowerCase());
                }
            });
        }
        
        const skillsContainer = document.getElementById('public-skills-container');
        if (profile.profile_skills && profile.profile_skills.trim() !== "") {
            const skillsArray = profile.profile_skills.split(',');
            const trophySkills = profile.trophy_skills ? profile.trophy_skills.split(',').map(s => s.trim().toLowerCase()) : [];
            
            skillsContainer.innerHTML = skillsArray.map(skill => { 
                const s = skill.trim(); 
                if (s !== "") { 
                    const isActive = activeSkillNames.includes(s.toLowerCase()); 
                    const isTrophy = trophySkills.includes(s.toLowerCase());
                    
                    let bgStyle = "";
                    if (isTrophy) bgStyle = "background: linear-gradient(90deg, #8b5cf6, #d946ef); color: white; border: none;";
                    else if (isActive) bgStyle = "background-color: #dcfce7; color: #059669; border: 1px solid #a7f3d0;";
                    
                    return `<span class="skill-tag" style="display: flex; align-items: center; gap: 6px; ${bgStyle}">${s}</span>`; 
                } 
                return ""; 
            }).join('');
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
let isCleaningUp = false;

function setupRealtimeListeners() {
    const currentUserId = localStorage.getItem('currentUserId');

    supabaseClient
        .channel('master-db-channel')
        .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            const table = payload.table;
            const data = payload.new || payload.old;

            if (table === 'skills' || table === 'swap_requests') {
                if (document.getElementById('skills-grid') || document.getElementById('skills-carousel')) loadSkills();
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
            }

            if (table === 'notifications' && currentUserId) {
                if (data && data.user_id == currentUserId) {
                    updateInboxBadge();
                    const inboxDropdown = document.getElementById('inbox-dropdown');
                    if (inboxDropdown && inboxDropdown.classList.contains('show')) {
                        loadInboxNotifications();
                    }
                }
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

            if (table === 'messages' && currentUserId) {
                if (data && (data.sender_id == currentUserId || data.receiver_id == currentUserId)) {
                    if (data.receiver_id == currentUserId && payload.eventType === 'INSERT') {
                        
                        if (isWaitingForPickup && currentChatUserId == data.sender_id && !data.content.startsWith('[')) {
                            cleanupVideoEngine(); 
                        }

                        if (data.content.startsWith('[CALL_INVITE]:')) {
                            const roomName = data.content.split(':')[1];
                            supabaseClient.from('app_users').select('username, profiles(avatar_url)').eq('id', data.sender_id).single().then(({data: caller}) => {
                                if (caller) {
                                    let avatar = null;
                                    if (caller.profiles) avatar = Array.isArray(caller.profiles) ? caller.profiles[0]?.avatar_url : caller.profiles.avatar_url;
                                    showIncomingCallModal(data.sender_id, caller.username || "Someone", avatar, roomName);
                                }
                            }).catch(e => console.error("Error displaying call popup:", e));
                        }
                        else if (data.content.startsWith('[CALL_ENDED]:')) {
                            if ((isCallConnected || isWaitingForPickup) && !isCleaningUp) {
                                cleanupVideoEngine();
                            }
                        }
                        else if (data.content === '[CALL_MISSED]') {
                            const popup = document.getElementById('incoming-call-popup');
                            if(popup) popup.remove();
                            if ((isCallConnected || isWaitingForPickup) && !isCleaningUp) {
                                cleanupVideoEngine();
                            }
                        }
                        else if (data.content.startsWith('[WB_STATE]:')) {
                            const parts = data.content.split(':');
                            const state = parts[1] === 'true';
                            if (state) joinWhiteboardRoom(parts[2]);
                            else closeWhiteboardRoom();
                        }

                        if (currentChatUserId && data.sender_id == currentChatUserId) {
                            supabaseClient.from('messages').update({ is_read: true }).eq('id', data.id).then();
                            const chatArea = document.getElementById('chat-messages-area');
                            if (chatArea && chatArea.innerHTML.includes('Say hi')) chatArea.innerHTML = '';
                            if (chatArea) {
                                if (!data.content.startsWith('[WB_STATE]:')) {
                                    chatArea.innerHTML += createMessageHtml(data, false);
                                }
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
    updateInboxBadge();
    
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
// 13. AGORA VIDEO ENGINE & LAYOUT MANAGER
// ==========================================
const AGORA_APP_ID = "8adb28c71a9e40f8905245db411405ff"; 

let rtc = {
    localAudioTrack: null,
    localVideoTrack: null,
    client: null,
    screenClient: null,
    screenTrack: null
};

let options = { appId: AGORA_APP_ID, channel: null, token: null, uid: null };

let isAudioMuted = false;
let isVideoMuted = false;
let noCameraDetected = false;
let isCallConnected = false;
let isWaitingForPickup = false;
let isScreenSharing = false;
let isWhiteboardActive = false;
let isSplitScreen = false;
let fastboardApp = null; 

const connectAudio = new Audio('https://actions.google.com/sounds/v1/ui/positive_notification.ogg');

function playConnectSound() {
    connectAudio.currentTime = 0;
    let playPromise = connectAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => console.log("Connect sound blocked by browser autoplay policy."));
    }
}

async function fetchAgoraToken(channelName) {
    try {
        const response = await fetch(`/rtcToken?channelName=${channelName}&t=${Date.now()}`);
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error("Error fetching token:", error);
        return null;
    }
}

function generateSafeRoomName(id1, id2) {
    const sortedIds = [String(id1), String(id2)].sort();
    let safeName = `SkillSwap_${sortedIds[0]}_${sortedIds[1]}`.replace(/[^a-zA-Z0-9_]/g, '_');
    return safeName.substring(0, 64);
}

function updateAvatarOverlay(uid, isMuted, usernameStr) {
    let overlayId = uid === "local" ? "local-avatar-overlay" : `avatar-overlay-${uid}`;
    let overlay = document.getElementById(overlayId);
    
    if (!overlay && uid !== "local") {
        const playerContainer = document.getElementById(`player-${uid}`);
        if (!playerContainer) return;
        
        overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.style.cssText = "display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #3c4043; align-items: center; justify-content: center; z-index: 5;";
        
        const initial = usernameStr ? usernameStr.charAt(0).toUpperCase() : "U";
        const color = usernameStr ? getColorForUsername(usernameStr) : "#8b5cf6";
        
        overlay.innerHTML = `<div style="width: 60px; height: 60px; border-radius: 50%; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 600;">${initial}</div>`;
        playerContainer.appendChild(overlay);
    }
    
    if (overlay) {
        overlay.style.display = isMuted ? 'flex' : 'none';
        
        if(uid === "local" && isMuted) {
            const myName = localStorage.getItem('currentUser') || "M";
            const circle = document.getElementById("local-avatar-circle");
            if(circle) {
                circle.innerText = myName.charAt(0).toUpperCase();
                circle.style.backgroundColor = getColorForUsername(myName);
            }
        }
    }
}

// ------------------------------------------
// THE LAYOUT ENGINE
// ------------------------------------------
function resetBoxStyle(box) {
    box.style.position = 'relative';
    box.style.bottom = 'auto';
    box.style.right = 'auto';
    box.style.left = 'auto';
    box.style.top = 'auto';
    box.style.width = '100%';
    box.style.height = '100%';
    box.style.border = 'none';
    box.style.borderRadius = '8px';
    box.style.boxShadow = 'none';
    box.style.zIndex = '1';
    box.style.cursor = 'pointer';
    box.style.pointerEvents = 'auto';
    box.style.flex = 'none';
}

function updateVideoLayout() {
    const localCam = document.getElementById('local-player');
    const localScreen = document.getElementById('local-screen-preview');
    const wbContainer = document.getElementById('whiteboard-container');
    const remotePlayers = Array.from(document.querySelectorAll('[id^="player-"]'));

    let allBoxes = [localCam, localScreen, ...remotePlayers].filter(el => el !== null);

    if (isWhiteboardActive) {
        wbContainer.style.display = 'flex';
        if (!allBoxes.includes(wbContainer)) allBoxes.push(wbContainer);
    } else {
        wbContainer.style.display = 'none';
        allBoxes = allBoxes.filter(b => b !== wbContainer);
        const centerStage = document.getElementById('center-stage');
        if (wbContainer.parentElement !== centerStage) {
            centerStage.appendChild(wbContainer); 
        }
    }

    const centerStage = document.getElementById('center-stage');
    const sidebarZone = document.getElementById('sidebar-zone');
    const defaultZone = document.getElementById('default-zone');

    const hasPresentation = localScreen || remotePlayers.length > 1 || isWhiteboardActive;

    if (hasPresentation) {
        centerStage.style.display = 'flex';
        sidebarZone.style.display = 'flex';
        defaultZone.style.display = 'none';

        let heroes = Array.from(centerStage.children).filter(child => 
            child.id === 'local-screen-preview' || 
            child.id === 'whiteboard-container' || 
            child.id.startsWith('player-') ||
            child.id === 'local-player'
        );

        heroes = heroes.filter(h => allBoxes.includes(h));

        let targetHeroCount = isSplitScreen ? 2 : 1;

        while (heroes.length < targetHeroCount && heroes.length < allBoxes.length) {
            let candidate = allBoxes.find(b => !heroes.includes(b) && (b.id === 'local-screen-preview' || b.id.includes('scr')));
            if (!candidate) candidate = allBoxes.find(b => !heroes.includes(b) && b.id === 'whiteboard-container');
            if (!candidate) candidate = allBoxes.find(b => !heroes.includes(b) && b.id.startsWith('player-'));
            if (!candidate) candidate = allBoxes.find(b => !heroes.includes(b));
            
            if (candidate) heroes.push(candidate);
        }

        if (heroes.length > targetHeroCount) {
            heroes = heroes.slice(0, targetHeroCount);
        }

        allBoxes.forEach(box => {
            resetBoxStyle(box);
            if (heroes.includes(box)) {
                centerStage.appendChild(box);
                box.style.flex = '1';
                box.style.minWidth = '0'; 
                box.style.border = 'none';
                box.style.cursor = 'default';
                box.onclick = null; 
            } else {
                sidebarZone.appendChild(box);
                box.style.flex = 'none'; 
                box.style.height = '160px';
                box.style.border = '2px solid #5f6368'; 
                box.onclick = () => swapToHero(box);
            }
        });

    } else {
        centerStage.style.display = 'none';
        sidebarZone.style.display = 'none';
        defaultZone.style.display = 'flex';

        if (remotePlayers.length > 0) {
            const remoteBox = remotePlayers[0];
            resetBoxStyle(remoteBox);
            defaultZone.appendChild(remoteBox);
            remoteBox.style.cursor = 'default';
            remoteBox.onclick = null;
        }

        if (localCam) {
            resetBoxStyle(localCam);
            defaultZone.appendChild(localCam);
            localCam.style.position = 'absolute';
            localCam.style.bottom = '20px';
            localCam.style.right = '20px';
            localCam.style.width = '240px';
            localCam.style.height = '160px';
            localCam.style.border = '1px solid #5f6368';
            localCam.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            localCam.style.zIndex = '10';
            localCam.style.cursor = 'default';
            localCam.onclick = null;
        }
    }
}

function swapToHero(clickedBox) {
    const centerStage = document.getElementById('center-stage');
    let heroes = Array.from(centerStage.children).filter(child => 
        child.id === 'local-screen-preview' || 
        child.id === 'whiteboard-container' || 
        child.id.startsWith('player-') ||
        child.id === 'local-player'
    );

    if (heroes.length > 0) {
        const heroToDemote = heroes[0];
        centerStage.insertBefore(clickedBox, heroToDemote);
        document.getElementById('sidebar-zone').appendChild(heroToDemote);
        updateVideoLayout(); 
    }
}

// ------------------------------------------
// CORE VIDEO FUNCTIONS
// ------------------------------------------
async function startVideoCall() {
    if (!currentChatUserId) return;
    
    isWaitingForPickup = true;
    const currentUserId = localStorage.getItem('currentUserId');

    const roomName = generateSafeRoomName(currentUserId, currentChatUserId);
    options.channel = roomName;

    const token = await fetchAgoraToken(roomName);
    if (!token) {
        isWaitingForPickup = false;
        return;
    }
    
    options.token = token;

    document.getElementById('call-room-name').innerText = `Room: ${roomName}`;
    document.getElementById('call-time').innerText = "Calling...";
    document.getElementById('video-call-overlay').style.display = 'flex';

    const messageContent = `[CALL_INVITE]:${roomName}`;
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: currentChatUserId, content: messageContent
    }]);
    loadChatMessages(currentChatUserId);
    
    await joinCall();
}

async function joinVideoRoomFromInvite(roomName) {
    options.channel = roomName;
    const token = await fetchAgoraToken(roomName);
    if (!token) return;
    options.token = token;

    document.getElementById('call-room-name').innerText = `Room: ${roomName}`;
    document.getElementById('call-time').innerText = "Connecting...";
    document.getElementById('video-call-overlay').style.display = 'flex';
    
    await joinCall();
}

async function joinCall() {
    rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    rtc.client.on("user-info-updated", (uid, msg) => {
        if (msg === "mute-video") {
            const chatName = document.getElementById('chat-header-name').innerText || "U";
            updateAvatarOverlay(uid, true, chatName);
        } else if (msg === "unmute-video") {
            updateAvatarOverlay(uid, false);
        }
    });

    rtc.client.on("user-published", async (user, mediaType) => {
        await rtc.client.subscribe(user, mediaType);
        
        isWaitingForPickup = false; 

        if (!isCallConnected) {
            startCallTimer();
            isCallConnected = true;
            playConnectSound(); 
        }

        if (mediaType === "video") {
            if (document.getElementById(`player-${user.uid}`) === null) {
                const playerContainer = document.createElement("div");
                playerContainer.id = `player-${user.uid}`;
                playerContainer.style.background = "#202124"; 
                document.body.appendChild(playerContainer); 
            }
            user.videoTrack.play(`player-${user.uid}`, { fit: "contain" });
            updateVideoLayout();
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    });

    rtc.client.on("user-unpublished", user => {
        const playerContainer = document.getElementById(`player-${user.uid}`);
        if (playerContainer) {
            playerContainer.style.display = 'none';
            playerContainer.remove();
        }
        updateVideoLayout();
    });

    rtc.client.on("user-left", (user) => {
        if (user.uid == currentChatUserId && !isCleaningUp) {
            const chatName = document.getElementById('chat-header-name').innerText || "The other user";
            showToast(`${chatName} disconnected.`);
            setTimeout(() => {
                endCallButtonAction(); 
            }, 1500);
        }
    });

    options.uid = await rtc.client.join(options.appId, options.channel, options.token, null);

    try {
        noCameraDetected = false; 
        [rtc.localAudioTrack, rtc.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        const localPlayer = document.getElementById("local-player");
        if (localPlayer.querySelector('i[data-lucide="video-off"]')) {
            const children = Array.from(localPlayer.children);
            children.forEach(c => {
                if (c.id !== "local-avatar-overlay") c.remove();
            });
        }
        
        rtc.localVideoTrack.play("local-player", { fit: "cover" }); 
        await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
        updateVideoLayout();
    } catch (error) {
        if (error.message.includes("DEVICE_NOT_FOUND") || error.name === "NotFoundError") {
            noCameraDetected = true;
            
            const camBtn = document.getElementById('btn-cam');
            if(camBtn) {
                camBtn.classList.add('active-off');
                camBtn.innerHTML = `<i data-lucide="video-off" style="width: 20px; height: 20px;"></i>`;
            }

            const localPlayer = document.getElementById("local-player");
            const errDiv = document.createElement("div");
            errDiv.style.cssText = "color: #9ca3af; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 8px; position:absolute; top:0; left:0; width:100%; z-index:4;";
            errDiv.innerHTML = `<i data-lucide="video-off" style="width: 24px; height: 24px;"></i> No Camera Found`;
            localPlayer.appendChild(errDiv);
            lucide.createIcons(); 
            
            showToast("Camera not detected. Falling back to audio-only.");

            try {
                rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                await rtc.client.publish([rtc.localAudioTrack]);
            } catch (audioError) {
                errDiv.innerHTML = `<i data-lucide="mic-off" style="width: 24px; height: 24px;"></i> No Hardware`;
                errDiv.style.color = "#ef4444";
                lucide.createIcons();
            }
        }
    }
}

async function endCallButtonAction() {
    if (isCleaningUp) return;
    isCleaningUp = true;

    if (isCallConnected && currentChatUserId) {
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        const durationStr = `${mins}:${secs}`;
        
        const currentUserId = localStorage.getItem('currentUserId');
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId, 
            receiver_id: currentChatUserId, 
            content: `[CALL_ENDED]:${durationStr}`
        }]);
    } else if (isWaitingForPickup && currentChatUserId) {
        const currentUserId = localStorage.getItem('currentUserId');
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId, 
            receiver_id: currentChatUserId, 
            content: `[CALL_MISSED]`
        }]);
    }
    
    cleanupVideoEngine();
}

async function cleanupVideoEngine() {
    isCleaningUp = true; 
    await stopScreenShare(); 
    closeWhiteboardRoom();
    
    if (rtc.localAudioTrack) { rtc.localAudioTrack.close(); rtc.localAudioTrack = null; }
    if (rtc.localVideoTrack) { rtc.localVideoTrack.close(); rtc.localVideoTrack = null; }
    if (rtc.client) { await rtc.client.leave(); }

    const overlay = document.getElementById('video-call-overlay');
    if (overlay) overlay.style.display = 'none';
    
    const remoteList = document.getElementById("remote-playerlist");
    if (remoteList) remoteList.innerHTML = ""; 
    
    const heroZone = document.getElementById("hero-zone");
    if (heroZone) heroZone.innerHTML = "";
    
    const sidebarZone = document.getElementById("sidebar-zone");
    if (sidebarZone) sidebarZone.innerHTML = "";

    stopCallTimer();

    isAudioMuted = false;
    isVideoMuted = false;
    noCameraDetected = false;
    isCallConnected = false;
    isWaitingForPickup = false;
    isWhiteboardActive = false;
    isSplitScreen = false;
    
    const camBtn = document.getElementById('btn-cam');
    if(camBtn) { camBtn.classList.remove('active-off'); camBtn.innerHTML = `<i data-lucide="video" style="width: 20px; height: 20px;"></i>`; }
    const micBtn = document.getElementById('btn-mic');
    if(micBtn) { micBtn.classList.remove('active-off'); micBtn.innerHTML = `<i data-lucide="mic" style="width: 20px; height: 20px;"></i>`; }
    const wbBtn = document.getElementById('btn-whiteboard');
    if(wbBtn) { wbBtn.style.background = ""; wbBtn.style.color = ""; }
    const splitBtn = document.getElementById('btn-layout');
    if(splitBtn) { splitBtn.style.background = ""; }
    
    updateAvatarOverlay("local", false);
    lucide.createIcons();

    setTimeout(() => { isCleaningUp = false; }, 1000); 
}

// ------------------------------------------
// FEATURE TOGGLES
// ------------------------------------------
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
    
    updateAvatarOverlay("local", isVideoMuted);
    lucide.createIcons();
}

async function toggleScreenShare() {
    if (!isCallConnected) {
        showToast("You must be connected to share your screen.");
        return;
    }

    if (!isScreenSharing) {
        try {
            rtc.screenTrack = await AgoraRTC.createScreenVideoTrack();
            rtc.screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            const screenToken = await fetchAgoraToken(options.channel);
            
            await rtc.screenClient.join(options.appId, options.channel, screenToken, null);
            await rtc.screenClient.publish(rtc.screenTrack);

            isScreenSharing = true;
            
            const previewContainer = document.createElement("div");
            previewContainer.id = `local-screen-preview`;
            previewContainer.style.background = "#202124";
            document.body.appendChild(previewContainer); 
            
            rtc.screenTrack.play(previewContainer, { fit: "contain" });
            updateVideoLayout(); 

            const btn = document.getElementById('btn-screen');
            if(btn) {
                btn.style.background = "#8b5cf6"; 
                btn.style.color = "white";
            }

            showToast("Screen sharing started.");

            rtc.screenTrack.on("track-ended", () => {
                stopScreenShare();
            });

        } catch (error) {
            console.error("Screen sharing failed:", error);
            if (error.name === "NotAllowedError" || error.message.includes("Permission denied")) {
                showToast("Screen share cancelled. Make sure you click the picture of the screen before hitting Share!");
            } else {
                showToast("Screen sharing failed to start.");
            }
        }
    } else {
        stopScreenShare();
    }
}

async function stopScreenShare() {
    if (!isScreenSharing) return;
    
    if (rtc.screenTrack) {
        rtc.screenTrack.close();
        rtc.screenTrack = null;
    }
    if (rtc.screenClient) {
        await rtc.screenClient.leave();
        rtc.screenClient = null;
    }
    isScreenSharing = false;
    
    const preview = document.getElementById('local-screen-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.remove();
    }
    updateVideoLayout(); 
    
    const btn = document.getElementById('btn-screen');
    if(btn) {
        btn.style.background = ""; 
        btn.style.color = "";
    }
}

// --- FASTBOARD API LOGIC ---
async function toggleWhiteboard() {
    if (!isCallConnected) {
        showToast("You must be connected to use the whiteboard.");
        return;
    }

    if (!isWhiteboardActive) {
        showToast("Generating secure Whiteboard token...");
        try {
            const res = await fetch('/wbCreate');
            if(!res.ok) throw new Error("Backend failed to create board.");
            
            const { uuid, token, appIdentifier } = await res.json();
            await injectFastboard(appIdentifier, uuid, token);

            isWhiteboardActive = true;
            const btn = document.getElementById('btn-whiteboard');
            if(btn) { btn.style.background = "#8b5cf6"; btn.style.color = "white"; }
            
            updateVideoLayout();

            const currentUserId = localStorage.getItem('currentUserId');
            await supabaseClient.from('messages').insert([{
                sender_id: currentUserId, receiver_id: currentChatUserId, content: `[WB_STATE]:true:${uuid}`
            }]);

        } catch (e) {
            console.error(e);
            showToast("Error connecting to Whiteboard server.");
        }

    } else {
        closeWhiteboardRoom();
        const currentUserId = localStorage.getItem('currentUserId');
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId, receiver_id: currentChatUserId, content: `[WB_STATE]:false`
        }]);
    }
}

async function joinWhiteboardRoom(uuid) {
    try {
        const res = await fetch(`/wbJoin?uuid=${uuid}`);
        if(!res.ok) throw new Error("Backend failed to generate join token.");
        
        const { token, appIdentifier } = await res.json();
        await injectFastboard(appIdentifier, uuid, token);
        
        isWhiteboardActive = true;
        const btn = document.getElementById('btn-whiteboard');
        if(btn) { btn.style.background = "#8b5cf6"; btn.style.color = "white"; }
        updateVideoLayout();
    } catch(e) {
        console.error(e);
    }
}

async function injectFastboard(appId, uuid, token) {
    const mountEl = document.getElementById('fastboard-mount');
    mountEl.innerHTML = ""; 
    
    if (!window.Fastboard) {
        mountEl.innerHTML = "<div style='padding:20px; color:#ef4444; text-align:center;'>Fastboard SDK not loaded. Please refresh or check ad-blockers.</div>";
        return;
    }

    try {
        fastboardApp = await window.Fastboard.createFastboard({
            appIdentifier: appId,
            roomUUID: uuid,
            roomToken: token,
            region: "in-mum", 
            container: mountEl
        });
    } catch(e) {
        console.error(e);
        mountEl.innerHTML = "<div style='padding:20px; color:#ef4444; text-align:center;'>API Keys rejected or network error.</div>";
    }
}

function closeWhiteboardRoom() {
    if(fastboardApp) {
        fastboardApp.destroy();
        fastboardApp = null;
    }
    const mountEl = document.getElementById('fastboard-mount');
    if (mountEl) mountEl.innerHTML = "";
    
    isWhiteboardActive = false;
    const btn = document.getElementById('btn-whiteboard');
    if(btn) { btn.style.background = ""; btn.style.color = ""; }
    
    updateVideoLayout();
}

function toggleSplitScreen() {
    isSplitScreen = !isSplitScreen;
    const btn = document.getElementById('btn-layout');
    if(btn) {
        btn.style.background = isSplitScreen ? "#8b5cf6" : "";
        btn.style.color = isSplitScreen ? "white" : "";
    }
    updateVideoLayout();
}

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
// 14. GLOBAL INCOMING CALL POPUP LOGIC 
// ==========================================
function showIncomingCallModal(callerId, callerName, avatarUrl, roomName) {
    const existing = document.getElementById('incoming-call-popup');
    if (existing) existing.remove();

    if ("Notification" in window && Notification.permission === 'granted') {
        new Notification(`Incoming Call`, {
            body: `${callerName} is calling you on SkillSwap!`,
            icon: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3059/3059983.png'
        });
    }

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

window.rejectCall = async function(callerId) {
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: callerId, content: "I'm busy right now."
    }]);
    
    if (window.location.pathname.includes('messages.html') && currentChatUserId == callerId) {
        loadChatMessages(callerId);
    }
};

window.rejectCallWithReason = async function(callerId) {
    const select = document.getElementById(`reject-reason-${callerId}`);
    const reason = select.value;
    
    if (!reason) {
        rejectCall(callerId); 
        return;
    }
    
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId, receiver_id: callerId, content: reason
    }]);
    
    if (window.location.pathname.includes('messages.html') && currentChatUserId == callerId) {
        loadChatMessages(callerId);
    }
};

window.acceptCall = function(callerId, roomName) {
    const popup = document.getElementById('incoming-call-popup');
    if(popup) popup.remove();
    
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

// ==========================================
// 15. PREVENT ACCIDENTAL DISCONNECTS
// ==========================================
window.addEventListener('beforeunload', function (e) {
    if (isCallConnected || isWaitingForPickup) {
        e.preventDefault();
        e.returnValue = ''; 
    }
});

// ==========================================
// 16. INBOX & NOTIFICATIONS LOGIC
// ==========================================
function toggleInboxDropdown(event) {
    event.stopPropagation(); 
    const userDropdown = document.getElementById('user-dropdown'); 
    const connDropdown = document.getElementById('connections-dropdown');
    const inboxDropdown = document.getElementById('inbox-dropdown');
    
    if (userDropdown) userDropdown.classList.remove('show'); 
    if (connDropdown) connDropdown.classList.remove('show'); 
    
    if (inboxDropdown) { 
        inboxDropdown.classList.toggle('show'); 
        if (inboxDropdown.classList.contains('show')) {
            loadInboxNotifications(); 
        }
    }
}

async function loadInboxNotifications() {
    const currentUserId = localStorage.getItem('currentUserId');
    const list = document.getElementById('inbox-list');
    if(!list) return;
    
    list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#6b7280; margin: 0;">Loading...</p>`;
    
    // CLEANUP: Delete any 'read' notifications that are older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseClient.from('notifications')
        .delete()
        .eq('user_id', currentUserId)
        .eq('is_read', true)
        .lt('created_at', oneDayAgo);
    
    // Fetch remaining notifications
    const { data: notifications } = await supabaseClient.from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);
        
    if (!notifications || notifications.length === 0) {
        list.innerHTML = `<p style="text-align:center; font-size:0.85rem; color:#9ca3af; margin: 0; padding: 20px 0;">No new notifications</p>`;
        return;
    }
    
    list.innerHTML = notifications.map(notif => {
        let icon = 'bell';
        let color = '#6b7280';
        let bg = '#f3f4f6';
        
        if (notif.type === 'new_offer') { icon = 'inbox'; color = '#3b82f6'; bg = '#dbeafe'; }
        if (notif.type === 'accepted') { icon = 'check-circle'; color = '#10b981'; bg = '#d1fae5'; }
        if (notif.type === 'rejected') { icon = 'x-circle'; color = '#ef4444'; bg = '#fee2e2'; }
        
        const isUnread = !notif.is_read ? 'border-left: 3px solid #8b5cf6;' : 'border-left: 3px solid transparent;';
        const date = new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        return `
        <div style="${isUnread} background: #f9fafb; padding: 12px; border-radius: 6px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="background: ${bg}; color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
            </div>
            <div>
                <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: #111827; line-height: 1.4;">${notif.message}</p>
                <span style="font-size: 0.7rem; color: #9ca3af;">${date}</span>
            </div>
        </div>`;
    }).join('');
    
    lucide.createIcons();
}

async function updateInboxBadge() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    const { count } = await supabaseClient.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

    const badge = document.getElementById('inbox-badge');
    if (badge) {
        if (count > 0) { badge.innerText = count; badge.style.display = 'flex'; } 
        else { badge.style.display = 'none'; }
    }
}

async function markInboxRead() {
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
    updateInboxBadge();
    loadInboxNotifications();
}

window.addEventListener('click', function(event) {
    const inboxDropdown = document.getElementById('inbox-dropdown');
    if (inboxDropdown && inboxDropdown.classList.contains('show') && !event.target.closest('#inbox-dropdown') && !event.target.closest('button[title="Notifications"]')) {
        inboxDropdown.classList.remove('show');
    }
});


// ==========================================
// 17. ADMIN & MODERATION SYSTEM
// ==========================================
let currentAdminRole = null;

async function checkAdminAccess() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return false;

    const { data: profile } = await supabaseClient.from('profiles')
        .select('role')
        .eq('user_id', currentUserId)
        .single();

    if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
        currentAdminRole = profile.role;
        return true;
    }
    return false;
}

let currentReportSkillId = null;

window.reportPost = function(event, skillId) { 
    event.stopPropagation(); 
    
    const menu = document.getElementById(`post-menu-${skillId}`);
    if (menu) menu.style.display = 'none'; 
    
    currentReportSkillId = skillId;
    
    const select = document.getElementById('report-reason-select');
    const text = document.getElementById('report-reason-text');
    if(select) select.value = '';
    if(text) { text.value = ''; text.style.display = 'none'; }
    
    const modal = document.getElementById('report-modal');
    if(modal) {
        modal.style.display = 'flex';
        lucide.createIcons();
    }
}

window.closeReportModal = function() {
    const modal = document.getElementById('report-modal');
    if(modal) modal.style.display = 'none';
    currentReportSkillId = null;
}

window.toggleReportOtherReason = function() {
    const select = document.getElementById('report-reason-select');
    const text = document.getElementById('report-reason-text');
    if (select && text) {
        if (select.value === 'Other') {
            text.style.display = 'block';
        } else {
            text.style.display = 'none';
        }
    }
}

window.submitReport = async function() {
    if (!currentReportSkillId) return;

    const select = document.getElementById('report-reason-select');
    const text = document.getElementById('report-reason-text');
    
    let reason = select ? select.value : '';
    
    if (reason === 'Other' && text) {
        reason = text.value.trim();
    }

    if (!reason || reason.trim() === "") {
        showToast("Please provide a reason for the report.");
        return;
    }

    const currentUserId = localStorage.getItem('currentUserId');
    const { error } = await supabaseClient.from('reports').insert([{
        reporter_id: currentUserId,
        reported_skill_id: currentReportSkillId,
        reason: reason,
        status: 'pending'
    }]);

    if (error) {
        showToast("Error submitting report.");
    } else {
        showToast("Report submitted to moderation team.");
    }
    
    closeReportModal();
}

window.initAdminDashboard = async function() {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
        alert("Access Denied. You do not have administrator privileges.");
        window.location.href = "index.html";
        return;
    }

    const badge = document.getElementById('admin-role-badge');
    if (badge) badge.innerText = currentAdminRole.replace('_', ' ');

    loadAdminReports();
    loadAdminUsers();
}

window.switchAdminTab = function(tabName) {
    const reportsBtn = document.getElementById('tab-reports');
    const usersBtn = document.getElementById('tab-users');
    const reportsSec = document.getElementById('section-reports');
    const usersSec = document.getElementById('section-users');

    reportsBtn.style.background = 'transparent'; reportsBtn.style.color = '#4b5563';
    usersBtn.style.background = 'transparent'; usersBtn.style.color = '#4b5563';
    reportsSec.style.display = 'none';
    usersSec.style.display = 'none';

    if (tabName === 'reports') {
        reportsBtn.style.background = '#e0e7ff'; reportsBtn.style.color = '#4f46e5';
        reportsSec.style.display = 'block';
        loadAdminReports();
    } else {
        usersBtn.style.background = '#e0e7ff'; usersBtn.style.color = '#4f46e5';
        usersSec.style.display = 'block';
        loadAdminUsers();
    }
}

async function loadAdminReports() {
    const container = document.getElementById('admin-reports-container');
    if (!container) return;

    const { data: reports } = await supabaseClient.from('reports')
        .select(`
            id, reason, created_at,
            reporter:app_users!reports_reporter_id_fkey(username),
            skill:skills!reports_reported_skill_id_fkey(id, title, description, app_users!skills_user_id_fkey(username))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (!reports || reports.length === 0) {
        container.innerHTML = `<p style="color: #6b7280; text-align: center; padding: 40px;">No pending reports.</p>`;
        return;
    }

    container.innerHTML = reports.map(report => {
        if (!report.skill) return '';

        return `
        <div style="border: 1px solid #fee2e2; border-radius: 8px; padding: 15px; background: #fffcfc;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                    <span style="background: #fef2f2; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Reported Skill</span>
                    <h4 style="margin: 8px 0 4px 0; color: #111827;">${report.skill.title}</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">Posted by: <strong>${report.skill.app_users.username}</strong></p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="resolveReport(${report.id}, ${report.skill.id})" class="btn-primary" style="background: #ef4444; border: none; padding: 6px 12px; font-size: 0.8rem;">Delete Post</button>
                    <button onclick="dismissReport(${report.id})" class="btn-secondary" style="border: 1px solid #d1d5db; background: white; padding: 6px 12px; font-size: 0.8rem;">Dismiss</button>
                </div>
            </div>
            <div style="background: white; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; font-size: 0.9rem; color: #4b5563; margin-bottom: 10px;">
                <em>" ${report.skill.description} "</em>
            </div>
            <p style="margin: 0; font-size: 0.85rem; color: #374151;"><strong>Reason:</strong> ${report.reason} <span style="color: #9ca3af; font-size: 0.75rem;">(Reported by ${report.reporter.username})</span></p>
        </div>
        `;
    }).join('');
}

window.resolveReport = async function(reportId, skillId) {
    if(confirm("Are you sure you want to remove this skill post from the public feed?")) {
        await supabaseClient.from('skills').update({ is_active: false }).eq('id', skillId);
        await supabaseClient.from('reports').update({ status: 'resolved' }).eq('id', reportId);
        loadAdminReports();
        showToast("Post removed from feed and report resolved.");
    }
}

window.dismissReport = async function(reportId) {
    await supabaseClient.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    loadAdminReports();
    showToast("Report dismissed.");
}

async function loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table');
    if (!tableBody) return;
    
    // Fixed: Ensure the search input exists before checking its value
    const searchInput = document.getElementById('admin-user-search');
    const searchVal = searchInput ? searchInput.value.trim() : '';

    let query = supabaseClient.from('app_users').select('id, username, profiles(role)');
    if (searchVal) query = query.ilike('username', `%${searchVal}%`);

    const { data: users } = await query.order('username', { ascending: true }).limit(20);

    if (!users || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #6b7280;">No users found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = users.map(user => {
        const role = user.profiles ? (Array.isArray(user.profiles) ? user.profiles[0]?.role : user.profiles.role) : 'user';
        
        let roleBadge = `<span style="background: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">User</span>`;
        if (role === 'admin') roleBadge = `<span style="background: #e0e7ff; color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Admin</span>`;
        if (role === 'super_admin') roleBadge = `<span style="background: #fce7f3; color: #be185d; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Super Admin</span>`;

        let actionHtml = `<button onclick="viewAdminNetwork(${user.id}, '${user.username}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.75rem;">View Network</button>`;

        if (currentAdminRole === 'super_admin') {
            if (role === 'user') {
                actionHtml += `<button onclick="changeUserRole(${user.id}, 'admin')" class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem; margin-left: 8px;">Promote</button>`;
            } else if (role === 'admin') {
                actionHtml += `<button onclick="changeUserRole(${user.id}, 'user')" class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; border: 1px solid #d1d5db; background: white; margin-left: 8px;">Demote</button>`;
            }
        }

        return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px 15px; color: #111827; font-weight: 500;">${user.username}</td>
            <td style="padding: 12px 15px;">${roleBadge}</td>
            <td style="padding: 12px 15px;">${actionHtml}</td>
        </tr>
        `;
    }).join('');
}

window.changeUserRole = async function(targetUserId, newRole) {
    if(confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        await supabaseClient.from('profiles').update({ role: newRole }).eq('user_id', targetUserId);
        loadAdminUsers();
        showToast(`User role updated to ${newRole}.`);
    }
}

window.viewAdminNetwork = async function(targetId, targetName) {
    document.getElementById('network-modal-title').innerText = `${targetName}'s Network`;
    const list = document.getElementById('admin-network-list');
    list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px;">Loading...</p>`;
    document.getElementById('admin-network-modal').style.display = 'flex';

    const { data: connections } = await supabaseClient.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${targetId},receiver_id.eq.${targetId}`);
    
    if (!connections || connections.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#6b7280; padding: 20px;">No connections.</p>`;
        return;
    }

    const connectedUserIds = connections.map(conn => conn.requester_id == targetId ? conn.receiver_id : conn.requester_id);
    const { data: users } = await supabaseClient.from('app_users').select(`id, username, profiles(avatar_url)`).in('id', connectedUserIds);

    list.innerHTML = users.map(u => `
        <div class="connection-item">
            <div class="connection-user-info">
                ${getAvatarHtml(u)}
                <span style="font-size: 0.9rem; font-weight: 500; color: #111827;">${u.username}</span>
            </div>
        </div>
    `).join('');
}


// ==========================================
// 18. OMNIBOX SEARCH & FILTER SYSTEM
// ==========================================
let searchTimeout = null;

// Opens and closes the filter settings box
window.toggleSearchFilters = function(event) {
    if(event) event.stopPropagation();
    const filterBox = document.getElementById('search-filter-dropdown');
    const resultsBox = document.getElementById('search-results-popup');
    
    if (filterBox.style.display === 'none' || filterBox.style.display === '') {
        filterBox.style.display = 'block';
        // Hide results if we are opening filters, to keep UI clean
        resultsBox.style.display = 'none'; 
    } else {
        filterBox.style.display = 'none';
        // If there is text in the search bar, show results again when closing filters
        if(document.getElementById('main-search-input').value.trim() !== '') {
            resultsBox.style.display = 'block';
        }
    }
}

// Triggers when the user types in the main search bar
window.handleSearchInput = function(event) {
    const query = event.target.value.trim();
    const resultsBox = document.getElementById('search-results-popup');
    const filterBox = document.getElementById('search-filter-dropdown');
    
    // Auto-close filters when typing starts
    if(filterBox) filterBox.style.display = 'none';

    if (query === '') {
        resultsBox.style.display = 'none';
        return;
    }

    resultsBox.style.display = 'block';
    document.getElementById('search-results-content').innerHTML = `<p style="text-align:center; padding: 20px; color:#6b7280; font-size: 0.9rem;">Searching...</p>`;

    // DEBOUNCE: Wait 300ms after the user stops typing before hitting the database
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        executeSearch(query);
    }, 300);
}

// Triggers when a user types a tag or clicks a filter checkbox
window.triggerFilterSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        executeSearch();
    }, 300);
}

// Executes the Supabase query with all filters applied
window.executeSearch = async function(overrideQuery = null) {
    const inputEl = document.getElementById('main-search-input');
    const query = overrideQuery !== null ? overrideQuery : inputEl.value.trim();
    const resultsBox = document.getElementById('search-results-popup');
    
    if (query === '') return;
    resultsBox.style.display = 'block';

    const tagFilter = document.getElementById('filter-tag') ? document.getElementById('filter-tag').value.trim() : '';
    const reqCert = document.getElementById('filter-cert') ? document.getElementById('filter-cert').checked : false;

    // Build the Supabase query dynamically based on active filters
    let dbQuery = supabaseClient.from('skills')
        .select(`*, app_users!inner(username, profiles!inner(avatar_url))`)
        .eq('is_active', true)
        .ilike('title', `%${query}%`);

    // Use ilike so it matches partial tags seamlessly
    if (tagFilter !== '') dbQuery = dbQuery.ilike('category', `%${tagFilter}%`);
    if (reqCert) dbQuery = dbQuery.not('certificate_id', 'is', null);

    const { data: results, error } = await dbQuery.limit(10);

    const contentDiv = document.getElementById('search-results-content');

    if (error || !results || results.length === 0) {
        contentDiv.innerHTML = `<p style="text-align:center; padding: 20px; color:#6b7280; font-size: 0.9rem;">No matching skills found.</p>`;
        return;
    }

    contentDiv.innerHTML = results.map(skill => {
        const u = skill.app_users || { username: 'Unknown', profiles: {} };
        const shortDesc = skill.description.length > 60 ? skill.description.substring(0, 60) + '...' : skill.description;
        const certBadge = skill.certificate_id ? `<span style="font-size: 0.65rem; background: #fef3c7; color: #047857; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0; margin-left: 6px;"><i data-lucide="award" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle;"></i> Cert</span>` : '';

        return `
        <div onclick="openSkillDetailModal(${skill.id}); document.getElementById('search-results-popup').style.display='none';" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
            ${getAvatarHtml(u, 40)}
            <div style="flex: 1; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h4 style="margin: 0; font-size: 0.95rem; color: #111827;">${skill.title}</h4>
                    <span style="font-size: 0.7rem; font-weight: 600; color: #8b5cf6;">${skill.category}</span>
                </div>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${shortDesc}</p>
                <div style="margin-top: 4px; display: flex; align-items: center; font-size: 0.75rem; color: #4b5563;">
                    By <strong style="margin-left: 4px; color: #111827;">${u.username}</strong> ${certBadge}
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    lucide.createIcons();
}

// Global click listener to close popups when clicking outside
const originalOnClick = window.onclick;
window.onclick = function(event) {
    if(originalOnClick) originalOnClick(event); // Keep existing dropdown logic running

    const container = document.getElementById('global-search-container');
    if (container && !container.contains(event.target)) {
        const resultsBox = document.getElementById('search-results-popup');
        const filterBox = document.getElementById('search-filter-dropdown');
        if (resultsBox) resultsBox.style.display = 'none';
        if (filterBox) filterBox.style.display = 'none';
    }
}


