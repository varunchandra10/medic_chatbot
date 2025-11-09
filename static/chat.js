// static/chat.js

const $msgArea = $('#messages');
const $input = $('#text');
const $form = $('#messageArea');
const $placeholder = $('#text');

// Language config
const LANGUAGES = {
    en: { name: 'English', placeholder: 'Ask in English...', flag: 'GB' },
    hi: { name: 'हिंदी', placeholder: 'हिन्दी में पूछें...', flag: 'IN' },
    ta: { name: 'தமிழ்', placeholder: 'தமிழில் கேளுங்கள்...', flag: 'IN' },
    te: { name: 'తెలుగు', placeholder: 'తెలుగులో అడగండి...', flag: 'IN' }
};

let selectedLang = 'en';  // Default

// Flag emoji mapper
function getFlagEmoji(flagCode) {
    const emojis = {
        'GB': '🇬🇧',
        'IN': '🇮🇳'
    };
    return emojis[flagCode] || '🌐';
}

// === INITIAL LANGUAGE PROMPT ===
function showLanguagePrompt() {
    const langHTML = `
        <div class="msg bot animate__animated animate__fadeInLeft">
            <div class="bubble language-prompt">
                <strong>Select your preferred language:</strong><br><br>
                <div class="language-grid">
                    ${Object.entries(LANGUAGES).map(([code, lang]) => `
                        <button class="lang-btn" data-lang="${code}">
                            <span class="flag-emoji">${getFlagEmoji(lang.flag)}</span>
                            ${lang.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>`;
    $msgArea.append(langHTML);
    scrollBottom();

    // Bind language buttons
    $('.lang-btn').on('click', function() {
        $('.lang-btn').removeClass('selected');
        $(this).addClass('selected animate__animated animate__pulse');
        const lang = $(this).data('lang');
        setTimeout(() => selectLanguage(lang), 300);  // Slight delay for animation
    });
}

function selectLanguage(lang) {
    selectedLang = lang;
    const langInfo = LANGUAGES[lang];
    $placeholder.attr('placeholder', langInfo.placeholder);

    // Remove language prompt
    $msgArea.find('.msg').first().remove();

    // Send confirmation
    const confirmHTML = `
        <div class="msg bot animate__animated animate__fadeInLeft">
            <div class="bubble">
                <i class="bi bi-check-circle-fill" style="color: var(--success, #28a745); margin-right: 8px;"></i>
                Language set to <strong>${langInfo.name}</strong> ${getFlagEmoji(langInfo.flag)}. Ask your health question!
            </div>
            <time>${fmtTime()}</time>
        </div>`;
    $msgArea.append(confirmHTML);
    scrollBottom();
}

// === UTILS ===
function fmtTime(d = new Date()) {
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
function scrollBottom() {
    $msgArea[0].scrollTop = $msgArea[0].scrollHeight;
}

// === THEME TOGGLE ===
const toggle = document.getElementById('themeToggle');
const setTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    toggle.innerHTML = dark ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
};

// Apply theme on load
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) setTheme(true);

// Add event listener for theme toggle
if (toggle) {
    toggle.addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));
}

// === CHAT LOGIC ===
let isFirstMessage = true; // This variable is currently unused, but kept for context

$form.on('submit', e => {
    e.preventDefault();
    const txt = $input.val().trim();
    if (!txt) return;
    $input.val('');

    // Show user message
    const userHTML = `
        <div class="msg user animate__animated animate__fadeInRight" style="opacity:0; transform:translateX(30px);">
            <div class="bubble">${txt}</div>
            <time>${fmtTime()}</time>
        </div>`;
    $msgArea.append(userHTML);
    scrollBottom();
    const $newMsg = $msgArea.find('.msg.user').last();
    $newMsg[0].offsetHeight;
    $newMsg.css({ opacity: 1, transform: 'translateX(0)', transition: 'all 0.3s ease' });

    // Show typing
    const typingHTML = `
        <div class="msg bot typing-indicator">
            <div class="bubble"><span></span><span></span><span></span></div>
            <time></time>
        </div>`;
    $msgArea.append(typingHTML);
    scrollBottom();

    // Send to backend with language
    $.post('/get', { msg: txt, lang: selectedLang })
        .done(botTxt => {
            $msgArea.find('.typing-indicator').remove();
            const botHTML = `
                <div class="msg bot animate__animated animate__fadeInLeft" style="opacity:0; transform:translateX(-30px);">
                    <div class="bubble markdown-body">${botTxt}</div>
                    <time>${fmtTime()}</time>
                </div>`;
            $msgArea.append(botHTML);
            scrollBottom();
            const $botMsg = $msgArea.find('.msg.bot').last();
            $botMsg[0].offsetHeight;
            $botMsg.css({ opacity: 1, transform: 'translateX(0)', transition: 'all 0.3s ease' });
        });
});

// === MARKDOWN ===
// Using ajaxComplete ensures the markdown parsing runs after any AJAX request completes (i.e., when a bot message is received)
$(document).ajaxComplete(() => {
    $('.markdown-body').each(function() {
        // Only parse if the content hasn't been parsed before (or has content)
        if (this.textContent.trim().length > 0 && !$(this).data('parsed')) {
            this.innerHTML = marked.parse(this.textContent.trim());
            $(this).data('parsed', true); // Mark as parsed
        }
    });
});

// === INIT ===
// When the entire document is ready, show the language prompt
$(document).ready(() => {
    showLanguagePrompt();
});