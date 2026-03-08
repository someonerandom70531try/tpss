lucide.createIcons();

const mockSkills = [
    { title: "React & TypeScript", category: "Programming", user: "Jordan Smith", avatar: "JS", level: "Expert" },
    { title: "Photography 101", category: "Arts", user: "Maria Garcia", avatar: "MG", level: "Intermediate" },
    { title: "Sourdough Baking", category: "Cooking", user: "Sam Wilson", avatar: "SW", level: "Beginner" }
];

function render() {
    const grid = document.getElementById('skills-grid');
    grid.innerHTML = mockSkills.map(skill => `
        <div class="skill-card">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
                <span style="font-size:0.75rem; font-weight:600; color:var(--primary); background:#f5f3ff; padding:4px 8px; border-radius:4px;">${skill.category}</span>
                <i data-lucide="more-horizontal" style="color:var(--gray-600); cursor:pointer"></i>
            </div>
            <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:8px;">${skill.title}</h3>
            <p style="color:var(--gray-600); font-size:0.9rem; margin-bottom:20px;">Master the fundamentals and advanced techniques in this comprehensive workshop.</p>
            
            <div style="display:flex; align-items:center; gap:12px; border-top:1px solid var(--gray-100); padding-top:16px;">
                <div style="width:36px; height:36px; background:var(--gray-200); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">${skill.avatar}</div>
                <div>
                    <div style="font-weight:600; font-size:0.9rem;">${skill.user}</div>
                    <div style="font-size:0.75rem; color:var(--gray-600);">${skill.level}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', render);

// Auth Logic
function handleLogin(event) {
    event.preventDefault(); // Prevents the page from refreshing
    const email = document.getElementById('email').value;
    
    // In a real app, you would send this to your Hono backend here
    console.log("Logging in with:", email);
    
    // Simulate a successful login redirect
    alert("Welcome back! Redirecting to dashboard...");
    window.location.href = "index.html"; 
}

// Initialize Supabase
const SUPABASE_URL = 'https://jndlevikdpkbgmssrqyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZGxldmlrZHBrYmdtc3NycXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzM2NTgsImV4cCI6MjA4ODIwOTY1OH0.m-M5FEMr8eZZaT4bJ-HspQZGl03sLcZ6glQ03slZba0';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
