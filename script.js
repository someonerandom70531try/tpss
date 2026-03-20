// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ==========================================
// 2. AUTHENTICATION & USER MANAGEMENT
// ==========================================
async function handleSignUp(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value;
    const messageDiv = document.getElementById('auth-message');

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        if (data.user) {
            const { error: dbError } = await supabaseClient
                .from('app_users')
                .insert([{ id: data.user.id, email: email, username: username }]);

            if (dbError) throw dbError;

            // Create an empty profile for the new user automatically
            await supabaseClient.from('profiles').insert([{ user_id: data.user.id }]);

            messageDiv.style.display = 'block';
            messageDiv.className = 'auth-message success';
            messageDiv.textContent = 'Account created successfully! You can now log in.';
            document.getElementById('signup-form').reset();
        }
    } catch (error) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'auth-message error';
        messageDiv.textContent = error.message;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageDiv = document.getElementById('auth-message');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        if (data.user) {
            const { data: userData } = await supabaseClient
                .from('app_users')
                .select('username')
                .eq('id', data.user.id)
                .single();

            localStorage.setItem('currentUserId', data.user.id);
            localStorage.setItem('currentUser', userData ? userData.username : email.split('@')[0]);
            window.location.href = 'index.html';
        }
    } catch (error) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'auth-message error';
        messageDiv.textContent = 'Invalid email or password.';
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function updateUIForUser() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (currentUser && currentUserId) {
        document.getElementById('logged-out-ui').style.display = 'none';
        document.getElementById('logged-in-ui').style.display = 'flex';
        document.getElementById('dropdown-username').textContent = currentUser;
        
        loadUserAvatarToNav(currentUserId);
        loadTopConnections();
    } else {
        document.getElementById('logged-out-ui').style.display = 'block';
        document.getElementById('logged-in-ui').style.display = 'none';
    }
}

async function loadUserAvatarToNav(userId) {
    const { data } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', userId).single();
    const avatarImg = document.getElementById('nav-avatar-img');
    const avatarInitial = document.getElementById('avatar-initial');
    const username = localStorage.getItem('currentUser') || 'U';

    if (data && data.avatar_url) {
        avatarImg.src = data.avatar_url;
        avatarImg.style.display = 'block';
        avatarInitial.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarInitial.style.display = 'block';
        avatarInitial.textContent = username.charAt(0).toUpperCase();
        document.getElementById('user-avatar-btn').style.backgroundColor = '#C1D3FE';
        document.getElementById('user-avatar-btn').style.color = '#111827';
    }
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
    document.getElementById('connections-dropdown').classList.remove('show');
}

function toggleConnectionsDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('connections-dropdown');
    dropdown.classList.toggle('show');
    document.getElementById('user-dropdown').classList.remove('show');
}

window.onclick = function(event) {
    if (!event.target.closest('#user-avatar-btn') && !event.target.closest('#user-dropdown')) {
        document.getElementById('user-dropdown')?.classList.remove('show');
    }
    if (!event.target.closest('.icon-btn[title="My Network"]') && !event.target.closest('#connections-dropdown')) {
        document.getElementById('connections-dropdown')?.classList.remove('show');
    }
};

// ==========================================
// 3. PROFILE MANAGEMENT (PRIVATE)
// ==========================================
let currentEditField = '';

async function loadUserProfile() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    document.getElementById('profile-page-name').textContent = localStorage.getItem('currentUser');

    const { data, error } = await supabaseClient.from('profiles').select('*').eq('user_id', currentUserId).single();
    
    if (data) {
        document.getElementById('profile-headline').textContent = data.headline || 'Add a headline...';
        document.getElementById('profile-location').innerHTML = data.location ? `<i data-lucide="map-pin" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 4px;"></i>${data.location}` : 'Add location...';
        document.getElementById('profile-bio').textContent = data.bio || 'Write a bit about yourself...';
        
        renderProfileSkills('profile-skills-container', data.skills_have, 'have');
        renderProfileSkills('profile-wanted-skills-container', data.skills_want, 'want');

        const initialDiv = document.getElementById('profile-page-initial');
        const avatarImg = document.getElementById('profile-avatar-img');
        if (data.avatar_url) {
            avatarImg.src = data.avatar_url;
            avatarImg.style.display = 'block';
            initialDiv.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            initialDiv.style.display = 'flex';
            initialDiv.textContent = localStorage.getItem('currentUser').charAt(0).toUpperCase();
        }

        const bannerImg = document.getElementById('profile-banner-img');
        if (data.banner_url) {
            bannerImg.src = data.banner_url;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }
    }
    lucide.createIcons();
}

function renderProfileSkills(containerId, skillsArray, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!skillsArray || skillsArray.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Add skills you ${type}...</p>`;
        return;
    }

    skillsArray.forEach((skill, index) => {
        const skillEl = document.createElement('div');
        skillEl.className = 'skill-tag';
        skillEl.style.display = 'flex';
        skillEl.style.alignItems = 'center';
        skillEl.style.gap = '8px';
        skillEl.style.cursor = 'grab';
        skillEl.innerHTML = `
            <i data-lucide="grip-vertical" style="width: 14px; height: 14px; color: #9ca3af; cursor: grab;"></i>
            <span>${skill}</span>
            <button onclick="deleteSkillItem('${type}', ${index})" style="background:none; border:none; cursor:pointer; padding:0; display:flex; color: #ef4444;">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        container.appendChild(skillEl);
    });

    Sortable.create(container, {
        animation: 150,
        handle: '.lucide-grip-vertical',
        onEnd: function (evt) {
            updateSkillOrder(type, evt.oldIndex, evt.newIndex);
        }
    });

    lucide.createIcons();
}

async function addSingleSkill() {
    const currentUserId = localStorage.getItem('currentUserId');
    const skill = prompt("Enter a skill you have:");
    if (!skill || skill.trim() === '') return;

    const { data: profile } = await supabaseClient.from('profiles').select('skills_have').eq('user_id', currentUserId).single();
    let currentSkills = profile.skills_have || [];
    currentSkills.push(skill.trim());

    await supabaseClient.from('profiles').update({ skills_have: currentSkills }).eq('user_id', currentUserId);
    loadUserProfile();
}

async function addWantedSkill() {
    const currentUserId = localStorage.getItem('currentUserId');
    const skill = prompt("Enter a skill you want to learn:");
    if (!skill || skill.trim() === '') return;

    const { data: profile } = await supabaseClient.from('profiles').select('skills_want').eq('user_id', currentUserId).single();
    let currentSkills = profile.skills_want || [];
    currentSkills.push(skill.trim());

    await supabaseClient.from('profiles').update({ skills_want: currentSkills }).eq('user_id', currentUserId);
    loadUserProfile();
}

async function deleteSkillItem(type, index) {
    const currentUserId = localStorage.getItem('currentUserId');
    const fieldName = type === 'have' ? 'skills_have' : 'skills_want';
    
    const { data: profile } = await supabaseClient.from('profiles').select(fieldName).eq('user_id', currentUserId).single();
    let currentSkills = profile[fieldName] || [];
    
    currentSkills.splice(index, 1);
    await supabaseClient.from('profiles').update({ [fieldName]: currentSkills }).eq('user_id', currentUserId);
    loadUserProfile();
}

async function updateSkillOrder(type, oldIndex, newIndex) {
    const currentUserId = localStorage.getItem('currentUserId');
    const fieldName = type === 'have' ? 'skills_have' : 'skills_want';
    
    const { data: profile } = await supabaseClient.from('profiles').select(fieldName).eq('user_id', currentUserId).single();
    let currentSkills = profile[fieldName] || [];
    
    const movedItem = currentSkills.splice(oldIndex, 1)[0];
    currentSkills.splice(newIndex, 0, movedItem);
    
    await supabaseClient.from('profiles').update({ [fieldName]: currentSkills }).eq('user_id', currentUserId);
}

function editProfileField(field, promptText) {
    currentEditField = field;
    document.getElementById('modal-title').textContent = promptText;
    
    let currentValue = '';
    if (field === 'username') currentValue = localStorage.getItem('currentUser');
    else if (field === 'bio') currentValue = document.getElementById('profile-bio').textContent;
    else if (field === 'headline') currentValue = document.getElementById('profile-headline').textContent;
    else if (field === 'location') currentValue = document.getElementById('profile-location').textContent.trim();

    if (currentValue.includes('...')) currentValue = '';
    
    document.getElementById('modal-input').value = currentValue;
    document.getElementById('custom-edit-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('custom-edit-modal').style.display = 'none';
    currentEditField = '';
}

document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
    const newValue = document.getElementById('modal-input').value.trim();
    const currentUserId = localStorage.getItem('currentUserId');

    if (currentEditField === 'username') {
        if (!newValue) return alert("Username cannot be empty");
        await supabaseClient.from('app_users').update({ username: newValue }).eq('id', currentUserId);
        localStorage.setItem('currentUser', newValue);
        updateUIForUser();
    } else {
        await supabaseClient.from('profiles').update({ [currentEditField]: newValue }).eq('user_id', currentUserId);
    }
    
    closeModal();
    loadUserProfile();
});

// ==========================================
// 4. PUBLIC PROFILE (READ-ONLY)
// ==========================================
async function loadPublicProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');

    if (!targetUserId) {
        document.getElementById('public-page-name').textContent = "User not found";
        return;
    }

    const { data: user } = await supabaseClient.from('app_users').select('username').eq('id', targetUserId).single();
    if (user) document.getElementById('public-page-name').textContent = user.username;

    const { data, error } = await supabaseClient.from('profiles').select('*').eq('user_id', targetUserId).single();
    
    if (data) {
        document.getElementById('public-headline').textContent = data.headline || '';
        document.getElementById('public-location').innerHTML = data.location ? `<i data-lucide="map-pin" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 4px;"></i>${data.location}` : '';
        document.getElementById('public-bio').textContent = data.bio || 'No bio provided.';
        
        renderPublicSkills('public-skills-container', data.skills_have);
        renderPublicSkills('public-wanted-skills-container', data.skills_want);

        const initialDiv = document.getElementById('public-page-initial');
        const avatarImg = document.getElementById('public-avatar-img');
        if (data.avatar_url) {
            avatarImg.src = data.avatar_url;
            avatarImg.style.display = 'block';
            initialDiv.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            initialDiv.style.display = 'flex';
            initialDiv.textContent = (user ? user.username.charAt(0).toUpperCase() : 'U');
        }

        const bannerImg = document.getElementById('public-banner-img');
        if (data.banner_url) {
            bannerImg.src = data.banner_url;
            bannerImg.style.display = 'block';
        } else {
            bannerImg.style.display = 'none';
        }
    }
    lucide.createIcons();
}

function renderPublicSkills(containerId, skillsArray) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!skillsArray || skillsArray.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">None listed.</p>`;
        return;
    }

    skillsArray.forEach(skill => {
        const skillEl = document.createElement('div');
        skillEl.className = 'skill-tag';
        skillEl.textContent = skill;
        container.appendChild(skillEl);
    });
}

// ==========================================
// 5. IMAGE CROPPER LOGIC
// ==========================================
let currentImageType = ''; 
let cropper = null;

function openImageEditor(imageType) {
    currentImageType = imageType;
    document.getElementById('image-modal-title').textContent = imageType === 'avatar_url' ? 'Update Profile Picture' : 'Update Banner Image';
    document.getElementById('image-editor-modal').style.display = 'flex';
    document.getElementById('image-source-options').style.display = 'block';
    document.getElementById('cropper-container').style.display = 'none';
    document.getElementById('save-cropped-btn').style.display = 'none';
    if(cropper) cropper.destroy();
}

function closeImageEditor() {
    document.getElementById('image-editor-modal').style.display = 'none';
    if(cropper) { cropper.destroy(); cropper = null; }
    document.getElementById('link-upload-input').value = '';
}

function loadFileIntoCropper(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => initCropper(e.target.result);
        reader.readAsDataURL(file);
    }
}

function loadLinkIntoCropper() {
    const url = document.getElementById('link-upload-input').value.trim();
    if (url) initCropper(url);
}

function initCropper(imageSrc) {
    document.getElementById('image-source-options').style.display = 'none';
    document.getElementById('cropper-container').style.display = 'block';
    document.getElementById('save-cropped-btn').style.display = 'inline-block';
    
    const image = document.getElementById('image-to-crop');
    image.src = imageSrc;

    if (cropper) cropper.destroy();

    const aspectRatio = currentImageType === 'avatar_url' ? 1 : 16/9;

    cropper = new Cropper(image, {
        aspectRatio: aspectRatio,
        viewMode: 1,
        autoCropArea: 1,
    });
}

async function saveCroppedImage() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({
        width: currentImageType === 'avatar_url' ? 400 : 1200,
        height: currentImageType === 'avatar_url' ? 400 : 675,
    });
    
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const currentUserId = localStorage.getItem('currentUserId');

    await supabaseClient.from('profiles').update({ [currentImageType]: croppedDataUrl }).eq('user_id', currentUserId);
    
    closeImageEditor();
    loadUserProfile();
    if(currentImageType === 'avatar_url') updateUIForUser();
}

// ==========================================
// 6. CERTIFICATE PDF LOGIC
// ==========================================
async function uploadCertificate(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') return alert('Please upload a valid PDF file.');
    
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return alert("Please log in.");

    const certTitle = prompt("Enter a title for this certificate (e.g., AWS Cloud Practitioner):");
    if (!certTitle) return;

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('certificates').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicData } = supabaseClient.storage.from('certificates').getPublicUrl(fileName);
        const fileUrl = publicData.publicUrl;

        const thumbnailUrl = await generatePdfThumbnail(file);

        await supabaseClient.from('certificates').insert([{
            user_id: currentUserId,
            title: certTitle,
            file_url: fileUrl,
            thumbnail_url: thumbnailUrl
        }]);

        loadCertificates();
    } catch (error) {
        alert("Upload failed: " + error.message);
    }
}

async function generatePdfThumbnail(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } catch(e) { reject(e); }
        };
        fileReader.readAsArrayBuffer(file);
    });
}

function createCertElement(cert, isPublic = false) {
    const certEl = document.createElement('div');
    certEl.className = 'cert-card-wrapper';
    certEl.style.cssText = 'display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--white); cursor: pointer; position: relative; width: 100%; box-sizing: border-box;';
    
    certEl.innerHTML = `
        <div style="width: 100px; height: 75px; flex-shrink: 0; background-color: var(--bg-main); border-right: 1px solid var(--border); overflow: hidden;">
            ${cert.thumbnail_url 
                ? `<img src="${cert.thumbnail_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail">` 
                : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"><i data-lucide="file-text" style="color: #9ca3af; width: 32px; height: 32px;"></i></div>`
            }
        </div>
        <div style="padding: 15px; flex-grow: 1; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500; color: #111827; font-size: 0.95rem;">${cert.title}</span>
            <i data-lucide="external-link" style="width: 16px; height: 16px; color: #9ca3af;"></i>
        </div>
        ${!isPublic ? `
        <div class="cert-actions-overlay" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); padding: 5px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; gap: 5px;">
            <button onclick="deleteCertificate('${cert.id}', event)" class="icon-btn" style="color: #ef4444; padding: 6px;" title="Delete">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        </div>` : ''}
    `;

    certEl.onclick = (e) => {
        if (!e.target.closest('.cert-actions-overlay')) {
            window.open(cert.file_url, '_blank');
        }
    };
    return certEl;
}

// Private cert loading
let allPrivateCerts = [];
let showingAllPrivate = false;

async function loadCertificates() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    const { data } = await supabaseClient.from('certificates').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
    allPrivateCerts = data || [];
    renderPrivateCertificates();
}

function renderPrivateCertificates() {
    const container = document.getElementById('profile-certificates-container');
    const actionsDiv = document.getElementById('cert-actions');
    const showMoreBtn = document.getElementById('cert-show-more-btn');
    container.innerHTML = '';

    if (allPrivateCerts.length === 0) {
        container.innerHTML = `<p id="cert-placeholder" style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">Add your certifications and licenses...</p>`;
        actionsDiv.style.display = 'none';
        return;
    }

    const maxInitial = 3;
    const certsToShow = showingAllPrivate ? allPrivateCerts : allPrivateCerts.slice(0, maxInitial);

    certsToShow.forEach(cert => container.appendChild(createCertElement(cert, false)));

    if (allPrivateCerts.length > maxInitial) {
        actionsDiv.style.display = 'flex';
        showMoreBtn.textContent = showingAllPrivate ? "Show less" : "Show more";
    } else {
        actionsDiv.style.display = 'none';
    }
    lucide.createIcons();
}

function showMoreCertificates() {
    showingAllPrivate = !showingAllPrivate;
    renderPrivateCertificates();
}

async function deleteCertificate(certId, event) {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this certificate?")) {
        await supabaseClient.from('certificates').delete().eq('id', certId);
        loadCertificates();
    }
}

// Public cert loading
let allPublicCerts = [];
let showingAllPublic = false;

async function loadPublicCertificates() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');
    if (!targetUserId) return;

    const { data } = await supabaseClient.from('certificates').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
    allPublicCerts = data || [];
    renderPublicCertificates();
}

function renderPublicCertificates() {
    const container = document.getElementById('public-certificates-container');
    const actionsDiv = document.getElementById('public-cert-actions');
    const showMoreBtn = document.getElementById('public-show-more-btn');
    container.innerHTML = '';

    if (allPublicCerts.length === 0) {
        container.innerHTML = `<p style="color: #9ca3af; font-size: 0.95rem; font-style: italic; margin: 0;">No certificates listed.</p>`;
        if(actionsDiv) actionsDiv.style.display = 'none';
        return;
    }

    const maxInitial = 3;
    const certsToShow = showingAllPublic ? allPublicCerts : allPublicCerts.slice(0, maxInitial);

    certsToShow.forEach(cert => container.appendChild(createCertElement(cert, true)));

    if (allPublicCerts.length > maxInitial && actionsDiv) {
        actionsDiv.style.display = 'flex';
        showMoreBtn.textContent = showingAllPublic ? "Show less" : "Show more";
    } else if (actionsDiv) {
        actionsDiv.style.display = 'none';
    }
    lucide.createIcons();
}

function showMorePublicCertificates() {
    showingAllPublic = !showingAllPublic;
    renderPublicCertificates();
}

// Light theme gallery modal
function openAllCertsModal() {
    const grid = document.getElementById('light-cert-grid');
    grid.innerHTML = '';
    const certsToUse = document.getElementById('public-page-name') ? allPublicCerts : allPrivateCerts;

    certsToUse.forEach(cert => {
        const item = document.createElement('div');
        item.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--white); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;';
        item.onmouseover = () => { item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; };
        item.onmouseout = () => { item.style.transform = 'translateY(0)'; item.style.boxShadow = 'none'; };
        item.onclick = () => window.open(cert.file_url, '_blank');
        
        item.innerHTML = `
            <div style="width: 100%; aspect-ratio: 4/3; background-color: var(--bg-main); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${cert.thumbnail_url 
                    ? `<img src="${cert.thumbnail_url}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<i data-lucide="file-text" style="color: #9ca3af; width: 40px; height: 40px;"></i>`
                }
            </div>
            <div style="padding: 12px;">
                <p style="margin: 0; font-weight: 500; color: #111827; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${cert.title}">${cert.title}</p>
                <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: #6b7280;">View Document</p>
            </div>
        `;
        grid.appendChild(item);
    });

    document.getElementById('all-certs-modal').style.display = 'flex';
    lucide.createIcons();
}

function closeAllCertsModal() {
    document.getElementById('all-certs-modal').style.display = 'none';
}


// ==========================================
// 7. SKILLS BOARD LOGIC (WITH NEW PASTEL COLORS)
// ==========================================
async function loadSkills() {
    const { data: skills, error } = await supabaseClient
        .from('skills')
        .select(`
            *,
            app_users ( username ),
            profiles ( avatar_url )
        `)
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    const grid = document.getElementById('skills-grid');
    if (!grid) return; // Only run on main page

    grid.innerHTML = '';
    const currentUserId = localStorage.getItem('currentUserId');

    skills.forEach(skill => {
        const username = skill.app_users ? skill.app_users.username : 'Unknown';
        const avatarUrl = skill.profiles ? skill.profiles.avatar_url : null;
        
        const card = document.createElement('div');
        card.style.cssText = `
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
            position: relative;
        `;
        card.onmouseover = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; };
        card.onmouseout = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = 'none'; };
        card.onclick = (e) => {
            if(!e.target.closest('.delete-btn') && !e.target.closest('a')) {
                openSkillDetailModal(skill);
            }
        };

        const deleteBtn = (currentUserId === skill.user_id) 
            ? `<button class="delete-btn icon-btn" onclick="deleteSkillCard('${skill.id}', event)" style="position: absolute; top: 15px; right: 15px; color: #ef4444;"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>`
            : '';

        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 10px;">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: var(--text-dark); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; margin-right: 10px;">${username.charAt(0).toUpperCase()}</div>`;

        card.innerHTML = `
            ${deleteBtn}
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                ${avatarHtml}
                <a href="view-profile.html?id=${skill.user_id}" style="text-decoration: none; color: inherit; font-weight: 500; font-size: 0.95rem;">${username}</a>
            </div>
            <h3 style="margin: 0 0 10px 0; color: #111827; padding-right: 25px;">${skill.title}</h3>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; color:#111827; background:#E2EAFC; border: 1px solid #C1D3FE; margin-bottom: 15px;">
                ${skill.category}
            </span>
            <p style="color: #4b5563; font-size: 0.95rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${skill.description}
            </p>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

async function checkWantedSkillsBeforePosting() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return window.location.href = 'auth.html';

    const { data } = await supabaseClient.from('profiles').select('skills_want').eq('user_id', currentUserId).single();
    
    if (!data.skills_want || data.skills_want.length === 0) {
        document.getElementById('warning-modal').style.display = 'flex';
    } else {
        continueToPostSkill();
    }
}

function closeWarningModal() { document.getElementById('warning-modal').style.display = 'none'; }

async function continueToPostSkill() {
    closeWarningModal();
    const currentUserId = localStorage.getItem('currentUserId');
    const certSelect = document.getElementById('post-skill-cert');
    certSelect.innerHTML = '<option value="">-- No certificate attached --</option>';

    const { data: certs } = await supabaseClient.from('certificates').select('*').eq('user_id', currentUserId);
    if (certs) {
        certs.forEach(cert => {
            const opt = document.createElement('option');
            opt.value = cert.id;
            opt.textContent = cert.title;
            certSelect.appendChild(opt);
        });
    }
    
    document.getElementById('post-skill-modal').style.display = 'flex';
}

function closePostSkillModal() { document.getElementById('post-skill-modal').style.display = 'none'; }

async function submitPostSkill() {
    const currentUserId = localStorage.getItem('currentUserId');
    const title = document.getElementById('post-skill-name').value.trim();
    const category = document.getElementById('post-skill-tag').value.trim();
    const desc = document.getElementById('post-skill-desc').value.trim();
    const certId = document.getElementById('post-skill-cert').value;

    if (!title || !category || !desc) return alert("Please fill all fields.");

    await supabaseClient.from('skills').insert([{
        user_id: currentUserId,
        title: title,
        category: category,
        description: desc,
        certificate_id: certId || null
    }]);

    document.getElementById('post-skill-name').value = '';
    document.getElementById('post-skill-tag').value = '';
    document.getElementById('post-skill-desc').value = '';
    closePostSkillModal();
    // Realtime listener will automatically reload the grid
}

async function deleteSkillCard(skillId, event) {
    event.stopPropagation();
    if(confirm("Delete this posted skill?")) {
        await supabaseClient.from('skills').delete().eq('id', skillId);
    }
}

async function openSkillDetailModal(skill) {
    const content = document.getElementById('skill-detail-content');
    content.innerHTML = '<p>Loading details...</p>';
    document.getElementById('skill-detail-modal').style.display = 'flex';

    const { data: fullSkill } = await supabaseClient
        .from('skills')
        .select(`*, app_users ( username ), profiles ( avatar_url, skills_want ), certificates ( title, file_url )`)
        .eq('id', skill.id)
        .single();

    const username = fullSkill.app_users ? fullSkill.app_users.username : 'Unknown';
    const avatarUrl = fullSkill.profiles ? fullSkill.profiles.avatar_url : null;
    const wantedSkills = fullSkill.profiles && fullSkill.profiles.skills_want ? fullSkill.profiles.skills_want : [];

    const avatarHtml = avatarUrl 
        ? `<img src="${avatarUrl}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">`
        : `<div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: var(--text-dark); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.2rem;">${username.charAt(0).toUpperCase()}</div>`;

    const certHtml = fullSkill.certificates 
        ? `<div style="margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
             <div style="display:flex; align-items:center; gap: 10px;">
                <i data-lucide="award" style="color: #f59e0b; width: 20px; height: 20px;"></i>
                <span style="font-weight: 500; color: #111827;">${fullSkill.certificates.title}</span>
             </div>
             <a href="${fullSkill.certificates.file_url}" target="_blank" class="btn-outline" style="padding: 6px 12px; font-size: 0.85rem; text-decoration: none;">View</a>
           </div>` 
        : '';

    let wantedHtml = '<p style="color: #6b7280; font-size: 0.9rem; font-style: italic;">User has not specified what they want to learn.</p>';
    if (wantedSkills.length > 0) {
        wantedHtml = `<div style="display: flex; flex-wrap: wrap; gap: 8px;">` + 
            wantedSkills.map(s => `<span style="background: #f3f4f6; padding: 4px 10px; border-radius: 15px; font-size: 0.85rem; color: #4b5563; border: 1px solid #e5e7eb;">${s}</span>`).join('') + 
            `</div>`;
    }

    content.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
            ${avatarHtml}
            <div>
                <a href="view-profile.html?id=${fullSkill.user_id}" style="margin: 0; font-weight: 600; font-size: 1.1rem; color: #111827; text-decoration: none;">${username}</a>
                <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">Skill Provider</p>
            </div>
        </div>
        <h2 style="margin: 0 0 10px 0; color: #111827;">${fullSkill.title}</h2>
        <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; color:#111827; background:#E2EAFC; border: 1px solid #C1D3FE; margin-bottom: 20px;">
            ${fullSkill.category}
        </span>
        <div style="background: var(--bg-main); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 0.95rem;">About this skill</h4>
            <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.6; margin: 0; white-space: pre-wrap;">${fullSkill.description}</p>
        </div>
        ${certHtml}
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border);">
            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 0.95rem;">Skills ${username} is looking for:</h4>
            ${wantedHtml}
        </div>
    `;
    lucide.createIcons();
}

function closeSkillDetailModal() { document.getElementById('skill-detail-modal').style.display = 'none'; }


// ==========================================
// 8. CONNECTIONS & SEARCH LOGIC
// ==========================================
async function searchUsers(event) {
    const query = event.target.value.trim().toLowerCase();
    const list = document.getElementById('connections-list');
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (!query) { loadTopConnections(); return; }

    const { data: users } = await supabaseClient
        .from('app_users')
        .select(`id, username, profiles ( avatar_url )`)
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId)
        .limit(5);

    list.innerHTML = '';
    
    if (!users || users.length === 0) {
        list.innerHTML = `<div style="padding: 10px; text-align: center; color: #6b7280; font-size: 0.9rem;">No users found</div>`;
        return;
    }

    for (const user of users) {
        const { data: existingConn } = await supabaseClient
            .from('connections')
            .select('*')
            .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(requester_id.eq.${user.id},receiver_id.eq.${currentUserId})`)
            .single();

        let actionBtn = `<button onclick="requestConnection('${user.id}')" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">Connect</button>`;
        
        if (existingConn) {
            if (existingConn.status === 'pending') {
                actionBtn = `<span style="font-size: 0.8rem; color: #f59e0b; font-weight: 500;">Pending</span>`;
            } else if (existingConn.status === 'accepted') {
                actionBtn = `<span style="font-size: 0.8rem; color: #10b981; font-weight: 500;"><i data-lucide="check" style="width: 14px; height: 14px; display: inline-block; vertical-align: bottom;"></i> Connected</span>`;
            }
        }

        const avatarUrl = user.profiles ? user.profiles.avatar_url : null;
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" class="connection-avatar" style="object-fit: cover;">`
            : `<div class="connection-avatar" style="background: var(--primary); color: var(--text-dark);">${user.username.charAt(0).toUpperCase()}</div>`;

        list.innerHTML += `
            <div class="connection-item">
                <div class="connection-user-info">
                    ${avatarHtml}
                    <span style="font-size: 0.9rem; font-weight: 500; color: #1f2937;">${user.username}</span>
                </div>
                ${actionBtn}
            </div>
        `;
    }
    lucide.createIcons();
}

async function requestConnection(receiverId) {
    const currentUserId = localStorage.getItem('currentUserId');
    await supabaseClient.from('connections').insert([{
        requester_id: currentUserId,
        receiver_id: receiverId,
        status: 'pending'
    }]);
    
    // Refresh search list immediately to show "Pending"
    const searchInput = document.getElementById('connection-search');
    if (searchInput.value) searchUsers({ target: searchInput });
    else loadTopConnections();
}

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
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function loadTopConnections() {
    const list = document.getElementById('connections-list');
    if (!list) return;
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;

    const { data: conns } = await supabaseClient
        .from('connections')
        .select(`
            *,
            requester:app_users!connections_requester_id_fkey(id, username),
            receiver:app_users!connections_receiver_id_fkey(id, username)
        `)
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted')
        .limit(5);

    list.innerHTML = '';

    if (!conns || conns.length === 0) {
        list.innerHTML = `<div style="padding: 10px; text-align: center; color: #6b7280; font-size: 0.9rem;">No recent connections. Search for users above!</div>`;
        return;
    }

    for (const conn of conns) {
        const otherUser = conn.requester_id === currentUserId ? conn.receiver : conn.requester;
        const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', otherUser.id).single();
        
        const avatarUrl = profile ? profile.avatar_url : null;
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" class="connection-avatar" style="object-fit: cover;">`
            : `<div class="connection-avatar" style="background: var(--primary); color: var(--text-dark);">${otherUser.username.charAt(0).toUpperCase()}</div>`;

        list.innerHTML += `
            <div class="connection-item">
                <div class="connection-user-info">
                    ${avatarHtml}
                    <a href="view-profile.html?id=${otherUser.id}" style="font-size: 0.9rem; font-weight: 500; color: #1f2937; text-decoration: none;">${otherUser.username}</a>
                </div>
                <a href="view-profile.html?id=${otherUser.id}" class="icon-btn" style="padding: 4px; color: #6b7280;"><i data-lucide="external-link" style="width: 16px; height: 16px;"></i></a>
            </div>
        `;
    }
    lucide.createIcons();
}

async function openRequestsModal() {
    const currentUserId = localStorage.getItem('currentUserId');
    const modal = document.getElementById('requests-modal');
    const list = document.getElementById('requests-modal-list');
    list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Loading requests...</p>';
    modal.style.display = 'flex';

    const { data: requests } = await supabaseClient
        .from('connections')
        .select(`id, requester:app_users!connections_requester_id_fkey(id, username)`)
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending');

    list.innerHTML = '';

    if (!requests || requests.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No pending requests.</p>';
        return;
    }

    for (const req of requests) {
        const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', req.requester.id).single();
        const avatarUrl = profile ? profile.avatar_url : null;
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: var(--text-dark); display: flex; align-items: center; justify-content: center; font-weight: 600;">${req.requester.username.charAt(0).toUpperCase()}</div>`;

        list.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarHtml}
                    <a href="view-profile.html?id=${req.requester.id}" style="font-weight: 500; color: #111827; text-decoration: none;">${req.requester.username}</a>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="acceptConnection('${req.id}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.85rem;">Accept</button>
                    <button onclick="rejectConnection('${req.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem; background: var(--white);">Decline</button>
                </div>
            </div>
        `;
    }
}

function closeRequestsModal() { document.getElementById('requests-modal').style.display = 'none'; }

async function acceptConnection(connId) {
    await supabaseClient.from('connections').update({ status: 'accepted' }).eq('id', connId);
    openRequestsModal();
    updateRequestsBadge();
    loadTopConnections();
}

async function rejectConnection(connId) {
    await supabaseClient.from('connections').delete().eq('id', connId);
    openRequestsModal();
    updateRequestsBadge();
}

async function openManageConnectionsModal() {
    const currentUserId = localStorage.getItem('currentUserId');
    const modal = document.getElementById('manage-connections-modal');
    const list = document.getElementById('manage-connections-list');
    list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Loading connections...</p>';
    modal.style.display = 'flex';

    const { data: conns } = await supabaseClient
        .from('connections')
        .select(`
            id,
            requester:app_users!connections_requester_id_fkey(id, username),
            receiver:app_users!connections_receiver_id_fkey(id, username)
        `)
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

    list.innerHTML = '';

    if (!conns || conns.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">You have no active connections yet.</p>';
        return;
    }

    for (const conn of conns) {
        const otherUser = conn.requester.id === currentUserId ? conn.receiver : conn.requester;
        const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', otherUser.id).single();
        
        const avatarUrl = profile ? profile.avatar_url : null;
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: var(--text-dark); display: flex; align-items: center; justify-content: center; font-weight: 600;">${otherUser.username.charAt(0).toUpperCase()}</div>`;

        list.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarHtml}
                    <a href="view-profile.html?id=${otherUser.id}" style="font-weight: 500; color: #111827; text-decoration: none;">${otherUser.username}</a>
                </div>
                <button onclick="removeConnection('${conn.id}')" class="icon-btn" style="color: #ef4444; padding: 8px;" title="Remove Connection">
                    <i data-lucide="user-minus" style="width: 18px; height: 18px;"></i>
                </button>
            </div>
        `;
    }
    lucide.createIcons();
}

function closeManageConnectionsModal() { document.getElementById('manage-connections-modal').style.display = 'none'; }

async function removeConnection(connId) {
    if(confirm("Are you sure you want to remove this connection?")) {
        await supabaseClient.from('connections').delete().eq('id', connId);
        openManageConnectionsModal();
        loadTopConnections();
    }
}

// ==========================================
// 9. REALTIME LISTENERS (MASTER CHANNEL)
// ==========================================
function setupRealtimeListeners() {
    const currentUserId = localStorage.getItem('currentUserId');
    console.log("Attempting to connect to Supabase Realtime...");

    supabaseClient
        .channel('master-db-channel')
        .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            console.log("🔥 REALTIME UPDATE RECEIVED:", payload.table, payload.event);
            const table = payload.table;
            const data = payload.new || payload.old;

            // 1. SKILLS TABLE CHANGES
            if (table === 'skills') {
                if (document.getElementById('skills-grid')) loadSkills();
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
            }

            // 2. CONNECTIONS TABLE CHANGES
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

            // 3. PROFILES TABLE CHANGES
            if (table === 'profiles') {
                if (payload.new && payload.new.user_id == currentUserId) updateUIForUser();
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
                if (document.getElementById('skills-grid')) loadSkills();
            }

            // 4. APP_USERS TABLE CHANGES
            if (table === 'app_users') {
                if (payload.new && payload.new.id == currentUserId) {
                    localStorage.setItem('currentUser', payload.new.username);
                    updateUIForUser();
                }
                if (document.getElementById('profile-page-name')) loadUserProfile();
                if (document.getElementById('public-page-name')) loadPublicProfile();
                if (document.getElementById('skills-grid')) loadSkills();
            }
        })
        .subscribe((status) => {
            console.log("📡 Realtime Connection Status:", status);
        });
}


// ==========================================
// 10. PAGE LOAD INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSkills();
    updateUIForUser();
    updateRequestsBadge();
    
    // Start listening for instant updates the moment any page loads!
    setupRealtimeListeners();
    
    if (document.getElementById('profile-page-name')) {
        loadUserProfile();
        loadCertificates(); 
    }

    if (window.location.pathname.includes('view-profile.html')) {
        loadPublicProfile();
        loadPublicCertificates();
    }
});
