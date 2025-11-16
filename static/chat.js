// ================================================================
// DOM Elements and Constants
// ================================================================
const sidebar = document.getElementById('sidebar');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const THEME_TOGGLE = document.getElementById('themeToggle');
const tipsBtn = document.getElementById('quickTipsBtn');
const tipsPanel = document.getElementById('tipsPanel');
const closeTips = document.getElementById('closeTips');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');

const langDesktop = document.getElementById('langSelectDesktop');
const langDropdown = document.getElementById('langDropdown');

const messages = document.getElementById('messages');
const textInput = document.getElementById('text');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const uploadInput = document.getElementById('uploadInput');

const newChatBtn = document.getElementById('newChatBtn');
// IMPORTANT: We now target the History link's parent <div> to insert the conversation list
const historyLink = document.querySelector('.sidebar-link[href="#"]'); 
const navLinksDiv = document.querySelector('.nav-links'); // For inserting the history list

// Languages
const LANGS = {
  en: { label: 'English', placeholder: 'Ask about symptoms, tests or upload a report...' },
  hi: { label: 'हिन्दी', placeholder: 'हिन्दी में पूछें...' },
  ta: { label: 'தமிழ்', placeholder: 'தமிழில் கேளுங்கள்...' },
  te: { label: 'తెలుగు', placeholder: 'తెలుగులో అడగండి...' }
};
let selectedLang = localStorage.getItem('med_lang') || 'en';
let activeConversationId = null; // Track the currently active chat thread

// ================================================================
// Theme Logic
// ================================================================
let theme = localStorage.getItem('med_theme') || 'light';
function applyTheme(mode){
  if(mode === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');

  if(THEME_TOGGLE) THEME_TOGGLE.innerHTML = mode === 'light' ? '<i class="bi bi-moon-stars-fill"></i><span>Theme</span>' : '<i class="bi bi-sun-fill"></i><span>Theme</span>';
  localStorage.setItem('med_theme', mode);
}
applyTheme(theme);
if(THEME_TOGGLE) THEME_TOGGLE.addEventListener('click', ()=> { theme = theme === 'light' ? 'dark' : 'light'; applyTheme(theme); });

// ================================================================
// Sidebar & Dropdowns
// ================================================================
// Sidebar toggles
menuToggleBtn && menuToggleBtn.addEventListener('click', ()=> sidebar.classList.toggle('open'));
closeSidebarBtn && closeSidebarBtn.addEventListener('click', ()=> sidebar.classList.remove('open'));

// Tips panel
tipsBtn && tipsBtn.addEventListener('click', ()=> tipsPanel.classList.toggle('open'));
closeTips && closeTips.addEventListener('click', ()=> tipsPanel.classList.remove('open'));

// User dropdown
userMenuBtn && userMenuBtn.addEventListener('click', (e)=> { e.stopPropagation(); userDropdown.classList.toggle('show'); });
document.addEventListener('click', ()=> userDropdown.classList.remove('show'));

// Logout (calls backend /logout)
async function doLogout(){
  try{
    const res = await fetch('/logout', { method: 'POST' });
    if(res.ok){ window.location.href = '/login'; }
    else {
      try { const j = await res.json(); alert(j.message || 'Logout failed'); } catch(e) { alert('Logout failed'); }
    }
  }catch(e){ console.error(e); alert('Logout failed'); }
}
logoutBtn && logoutBtn.addEventListener('click', doLogout);
dropdownLogoutBtn && dropdownLogoutBtn.addEventListener('click', doLogout);


// ================================================================
// Language Controls
// ================================================================
function buildLangPills(){
  if(!langDesktop) return;
  langDesktop.innerHTML = '';
  Object.entries(LANGS).forEach(([k,v])=>{
    const b = document.createElement('button');
    b.className = 'lang-pill';
    b.textContent = v.label;
    if(k === selectedLang) b.classList.add('active');
    b.onclick = ()=> setLanguage(k);
    langDesktop.appendChild(b);
  });
}
if(langDropdown){
  langDropdown.value = selectedLang;
  langDropdown.addEventListener('change', ()=> setLanguage(langDropdown.value));
}

function setLanguage(code){
  selectedLang = code;
  localStorage.setItem('med_lang', code);
  if(textInput) textInput.placeholder = LANGS[code].placeholder;
  buildLangPills();
  if(langDropdown) langDropdown.value = code;
  addSystemMessage(`Language set to ${LANGS[code].label}`);
}
setLanguage(selectedLang);


// ================================================================
// Messaging and History Helpers (MODIFIED)
// ================================================================
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function addMessage(kind, html, shouldScroll = true){ 
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + (kind === 'user' ? 'user' : 'bot');
  const bubble = document.createElement('div');
  bubble.className = 'bubble' + (kind === 'user' ? ' user' : '');
  bubble.innerHTML = html;
  wrapper.appendChild(bubble);
  messages.appendChild(wrapper);
  
  if(shouldScroll) {
    messages.scrollTop = messages.scrollHeight;
  }
  return wrapper;
}
function addSystemMessage(txt){ addMessage('bot', `<div style="color:var(--text-muted);font-size:.92rem">${txt}</div>`); }


/**
 * Clears chat and loads a specific conversation thread.
 * If id is null, it resets the session to start a new chat.
 */
async function loadConversation(id = null) {
  messages.innerHTML = '';
  
  // Check if the requested chat ID is the one currently active
  if (id === activeConversationId) {
    addSystemMessage('Conversation already active.');
    return;
  }

  if (!id) {
    // Start a completely new chat (calls backend to reset current_chat_id)
    try {
      await fetch('/end_chat', { method: 'POST' });
    } catch (e) {
      console.error("Failed to end chat session:", e);
    }
    activeConversationId = null;
    addSystemMessage('New conversation started. Upload a report or ask a question.');
    return;
  }

  // Load existing thread
  try {
    const res = await fetch(`/conversation/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    
    const data = await res.json();
    
    data.messages.forEach(msg => {
      const kind = msg.role; 
      const content = kind === 'bot' ? marked.parse(msg.message || '') : escapeHtml(msg.message || '');
      addMessage(kind, content, false); 
    });
    
    activeConversationId = data.conversation_id;
    messages.scrollTop = messages.scrollHeight; 
    addSystemMessage(`Loaded conversation: ${data.messages[0].message.substring(0, 40)}...`);
    
  } catch (err) {
    console.error('Error loading conversation:', err);
    addSystemMessage('Could not load chat history. Starting a new session.');
    activeConversationId = null;
  }
}


/**
 * Fetches and displays the list of past conversations in the sidebar.
 */
async function toggleHistoryList(e) {
    e.preventDefault();
    
    // Check if the history list container already exists
    let listContainer = document.getElementById('historyListContainer');
    
    // If the list is open, close it (toggle behavior)
    if (listContainer) {
        listContainer.remove();
        historyLink.classList.remove('active');
        return;
    }

    // Mark the link as active
    historyLink.classList.add('active');
    
    // Create the container for the list
    listContainer = document.createElement('div');
    listContainer.id = 'historyListContainer';
    listContainer.className = 'history-list-container';
    
    // Find the position after the History link to insert the list
    historyLink.insertAdjacentElement('afterend', listContainer);

    try {
        const res = await fetch('/conversations');
        if (!res.ok) throw new Error('Failed to fetch conversation list');
        
        const data = await res.json();
        
        if (data.conversations && data.conversations.length > 0) {
            data.conversations.forEach(conv => {
                const item = document.createElement('a');
                item.href = `#chat-${conv.id}`;
                item.className = 'sidebar-link history-item';
                item.title = conv.title;
                item.innerHTML = `<i class="bi bi-chat-text"></i> <span>${escapeHtml(conv.title)}...</span>`;
                
                // Click handler to load the specific conversation
                item.onclick = (e) => {
                    e.preventDefault();
                    // Close the sidebar on mobile after clicking a thread
                    sidebar.classList.remove('open'); 
                    // Load the conversation and update the activeConversationId
                    loadConversation(conv.id); 
                };
                listContainer.appendChild(item);
            });
        } else {
            listContainer.innerHTML = '<span style="padding: 0.55rem 0.6rem; color: var(--text-muted); font-size: 0.9rem;">No past chats found.</span>';
        }

    } catch (err) {
        listContainer.innerHTML = '<span style="padding: 0.55rem 0.6rem; color: var(--danger); font-size: 0.9rem;">Error loading history.</span>';
        console.error('Error fetching conversation list:', err);
    }
}


// ================================================================
// Core Chat Functionality
// ================================================================

// Typing indicator
let typingMarker = null;
function showTyping(){
  hideTyping();
  typingMarker = addMessage('bot', '<div style="display:flex;gap:.4rem"><span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s infinite"></span><span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s .15s infinite"></span><span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s .3s infinite"></span></div>');
}
function hideTyping(){ if(typingMarker){ typingMarker.remove(); typingMarker = null; } }
const styleEl = document.createElement('style'); 
// Ensure CSS for history list item spacing is added
styleEl.innerHTML = `
    @keyframes blink{0%{transform:scale(.6);opacity:.25}50%{transform:scale(1);opacity:1}100%{transform:scale(.6);opacity:.25}}
    .history-list-container { display: flex; flex-direction: column; padding-bottom: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--border); }
    .history-item { padding: 0.55rem 0.6rem; margin-left: 0.5rem; border-radius: 0.6rem; border-left: 3px solid transparent; }
    .history-item:hover { border-left: 3px solid var(--primary); }
`; 
document.head.appendChild(styleEl);


// Send query to backend
async function sendQuery(text){
  addMessage('user', escapeHtml(text));
  textInput.value = '';
  textInput.style.height = 'auto';
  showTyping();
  try{
    const data = new URLSearchParams();
    data.append('msg', text);
    data.append('lang', selectedLang);
    // Backend will automatically get/create the current_chat_id from the session
    const res = await fetch('/get', { method: 'POST', body: data }); 
    const txt = await res.text();
    hideTyping();
    
    // Use marked.parse for rendering bot response
    addMessage('bot', marked.parse(txt || 'No response'));
    
    // After the first message, update the history list to show the new thread
    if (!activeConversationId) {
        // Simple reload of the history list, but keep it closed
        // This is a minimal implementation; a cleaner way would be to just update the active list if open
        if (document.getElementById('historyListContainer')) {
             document.getElementById('historyListContainer').remove();
             toggleHistoryList(new Event('click')); // Re-render the list
        }
    }
    
  }catch(err){
    hideTyping();
    addMessage('bot', `<div style="color:var(--danger)">Error: could not reach server.</div>`);
    console.error(err);
  }
}

// Form submit & keyboard
sendBtn && sendBtn.addEventListener('click', (e)=>{ e.preventDefault(); const t = textInput.value.trim(); if(!t) return; sendQuery(t); });
textInput && textInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendBtn.click(); }});
textInput && textInput.addEventListener('input', ()=>{ textInput.style.height='auto'; textInput.style.height = Math.min(220, textInput.scrollHeight) + 'px'; });

// Upload
attachBtn && attachBtn.addEventListener('click', ()=> uploadInput.click());
uploadInput && uploadInput.addEventListener('change', async (e)=> {
  const file = e.target.files[0]; if(!file) return;
  addMessage('user', `<strong>Uploaded:</strong> ${escapeHtml(file.name)}`);
  showTyping();
  const fd = new FormData(); fd.append('file', file);
  try{
    const res = await fetch('/upload_report', { method:'POST', body: fd });
    const txt = await res.text();
    hideTyping();
    addMessage('bot', marked.parse(txt || 'No interpretation returned.'));
  }catch(err){
    hideTyping();
    addMessage('bot', `<div style="color:var(--danger)">Upload failed. Backend endpoint /upload_report required.</div>`);
  } finally { uploadInput.value = ''; }
});


// ================================================================
// Initial Load & Event Listeners
// ================================================================

// New chat button now calls loadConversation(null) to reset the session
newChatBtn && newChatBtn.addEventListener('click', ()=> loadConversation(null));

// History link now calls the function to display the list
historyLink && historyLink.addEventListener('click', toggleHistoryList);


// Initial action on load: load the *current* conversation thread
window.addEventListener('load', () => {
    // Attempt to load the conversation currently saved in the session (if any)
    // If the session ID is null, loadConversation(null) will start a new chat.
    loadConversation(null); 
});


// Responsive language controls
function adjustLangControls(){
  const pills = document.querySelector('.lang-pills');
  const dropdown = document.querySelector('.lang-dropdown');
  if(!pills || !dropdown) return;
  
  if(window.innerWidth <= 900){ dropdown.style.display = 'block'; pills.style.display = 'none'; }
  else { dropdown.style.display = 'none'; pills.style.display = 'flex'; }
}
window.addEventListener('resize', adjustLangControls);
adjustLangControls();
buildLangPills();