(() => {
  "use strict";

  // ================================================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ================================================================
  document.addEventListener("DOMContentLoaded", async () => {
    const DOM = {
      sidebar: document.getElementById("sidebar"),
      menuToggleBtn: document.getElementById("menuToggleBtn"),
      closeSidebarBtn: document.getElementById("closeSidebarBtn"),
      themeToggle: document.getElementById("themeToggle"),
      tipsBtn: document.getElementById("quickTipsBtn"),
      tipsPanel: document.getElementById("tipsPanel"),
      closeTips: document.getElementById("closeTips"),
      userMenuBtn: document.getElementById("userMenuBtn"),
      userDropdown: document.getElementById("userDropdown"),
      logoutBtn: document.getElementById("logoutBtn"),
      dropdownLogoutBtn: document.getElementById("dropdownLogoutBtn"),

      langDesktop: document.getElementById("langSelectDesktop"),
      langDropdown: document.getElementById("langDropdown"),

      messages: document.getElementById("messages"),
      textInput: document.getElementById("text"),
      sendBtn: document.getElementById("sendBtn"),
      attachBtn: document.getElementById("attachBtn"),
      uploadInput: document.getElementById("uploadInput"),

      newChatBtn: document.getElementById("newChatBtn"),
      historyLink: document.getElementById("historyLink"),
      deleteModal: document.getElementById("deleteModal"),
      cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
      confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
      newsBtn: document.getElementById("newsBtn"),
    };

    // Call this AFTER DOM is ready

    // Language configuration
    const LANGS = {
      en: { label: "English", native: "English" },
      hi: { label: "हिन्दी", native: "Hindi" },
      ta: { label: "தமிழ்", native: "Tamil" },
      te: { label: "తెలుగు", native: "Telugu" },
    };

    let translations = {};
    let currentLang = localStorage.getItem("med_lang") || "en";

    // Load translations.json once
    async function loadTranslations() {
      try {
        const res = await fetch("/static/translations.json");
        translations = await res.json();
        applyTranslations(currentLang);
      } catch (err) {
        console.warn("translations.json not found – running in English only");
        translations = { en: {} };
      }
    }

    // Apply translation to all [data-i18n] elements
    function applyTranslations(lang) {
      currentLang = lang;
      document.documentElement.lang = lang;

      const dict = translations[lang] || translations["en"] || {};

      // Translate text content
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
      });

      // Translate placeholder
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (dict[key]) el.placeholder = dict[key];
      });

      // Update page title
      const titleKey = document
        .querySelector("title")
        ?.getAttribute("data-i18n");
      if (titleKey && dict[titleKey]) {
        document.title = dict[titleKey];
      }
    }

    // State
    let state = {
      theme: localStorage.getItem("med_theme") || "light",
      activeConversationId: null,
      conversationToDelete: null,
      typingMarker: null,
    };

    // ================================================================
    // 2. UTILITIES
    // ================================================================
    const Utils = {
      escapeHtml(str) {
        if (!str) return "";
        return str.replace(
          /[&<>"]/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
            }[c])
        );
      },

      addMessage(kind, html, shouldScroll = true) {
        const wrapper = document.createElement("div");
        wrapper.className = `msg ${kind === "user" ? "user" : "bot"}`;

        const bubble = document.createElement("div");
        bubble.className = `bubble${kind === "user" ? " user" : ""}`;
        bubble.innerHTML = html;
        wrapper.appendChild(bubble);
        DOM.messages.appendChild(wrapper);

        if (shouldScroll) {
          DOM.messages.scrollTop = DOM.messages.scrollHeight;
        }
        return wrapper;
      },

      addSystemMessage(text) {
        this.addMessage(
          "bot",
          `<div style="color:var(--text-muted);font-size:.92rem">${text}</div>`
        );
      },

      showTyping() {
        this.hideTyping();
        state.typingMarker = this.addMessage(
          "bot",
          `<div style="display:flex;gap:.4rem">
          <span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s infinite"></span>
          <span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s .15s infinite"></span>
          <span style="width:8px;height:8px;border-radius:99px;background:var(--primary);animation:blink 1s .3s infinite"></span>
        </div>`
        );
      },

      hideTyping() {
        if (state.typingMarker) {
          state.typingMarker.remove();
          state.typingMarker = null;
        }
      },
    };

    // ================================================================
    // 3. THEME MODULE
    // ================================================================
    const Theme = {
      apply(mode) {
        if (mode === "dark") {
          document.body.classList.add("dark");
        } else {
          document.body.classList.remove("dark");
        }

        if (DOM.themeToggle) {
          DOM.themeToggle.innerHTML =
            mode === "light"
              ? '<i class="bi bi-moon-stars-fill"></i><span>Theme</span>'
              : '<i class="bi bi-sun-fill"></i><span>Theme</span>';
        }

        localStorage.setItem("med_theme", mode);
      },

      toggle() {
        state.theme = state.theme === "light" ? "dark" : "light";
        this.apply(state.theme);
      },

      init() {
        this.apply(state.theme);
        DOM.themeToggle?.addEventListener("click", () => this.toggle());
      },
    };

    // ================================================================
    // 4. SIDEBAR & UI PANELS MODULE
    // ================================================================
    const UI = {
      init() {
        // Mobile menu
        DOM.menuToggleBtn?.addEventListener("click", () =>
          DOM.sidebar.classList.toggle("open")
        );
        DOM.closeSidebarBtn?.addEventListener("click", () =>
          DOM.sidebar.classList.remove("open")
        );

        // Tips panel
        DOM.tipsBtn?.addEventListener("click", () =>
          DOM.tipsPanel.classList.toggle("open")
        );
        DOM.closeTips?.addEventListener("click", () =>
          DOM.tipsPanel.classList.remove("open")
        );

        // User dropdown
        DOM.userMenuBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          DOM.userDropdown.classList.toggle("show");
        });
        document.addEventListener("click", () =>
          DOM.userDropdown.classList.remove("show")
        );

        // Logout
        const logout = async () => {
          try {
            const res = await fetch("/logout", { method: "POST" });
            if (res.ok) window.location.href = "/login";
            else {
              const data = await res.json().catch(() => ({}));
              alert(data.message || "Logout failed");
            }
          } catch (e) {
            console.error(e);
            alert("Logout failed");
          }
        };
        DOM.logoutBtn?.addEventListener("click", logout);
        DOM.dropdownLogoutBtn?.addEventListener("click", logout);
      },
    };

    // ================================================================
    // 5. LANGUAGE MODULE
    // ================================================================
    const Language = {
      async init() {
        await loadTranslations();
        this.buildPills();
        this.syncDropdown();
        this.attachListeners();
        applyTranslations(currentLang);
      },

      buildPills() {
        if (!DOM.langDesktop) return;
        DOM.langDesktop.innerHTML = "";

        Object.entries(LANGS).forEach(([code, { label }]) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "lang-pill";
          btn.textContent = label;
          btn.dataset.lang = code;

          if (code === currentLang) btn.classList.add("active");

          btn.addEventListener("click", () => this.set(code));
          DOM.langDesktop.appendChild(btn);
        });
      },

      syncDropdown() {
        if (DOM.langDropdown) DOM.langDropdown.value = currentLang;
      },

      attachListeners() {
        DOM.langDropdown?.addEventListener("change", (e) =>
          this.set(e.target.value)
        );
      },

      // Helper: Get translated string safely
      t(key, fallback) {
        const dict = translations[currentLang] || translations["en"] || {};
        return dict[key] || fallback;
      },

      set(code) {
        if (!LANGS[code]) return;

        const previousLang = currentLang;
        currentLang = code;
        localStorage.setItem("med_lang", code);

        this.buildPills();
        this.syncDropdown();
        applyTranslations(code);

        // Show feedback in the NEW language
        const feedbackMsg =
          this.t("msg_language_changed", "Language changed to") +
          ` ${LANGS[code].label}`;
        Utils.addSystemMessage(feedbackMsg);
      },
    };

    // ================================================================
    // 6. CONVERSATION & HISTORY MODULE
    // ================================================================
    const Conversation = {
      // Helper: Get translated string safely

      t(key, fallback) {
        const dict = translations[currentLang] || translations["en"] || {};
        return dict[key] || fallback;
      },

      async load(id = null) {
        DOM.messages.innerHTML = "";

        if (id === state.activeConversationId) {
          Utils.addSystemMessage(
            Conversation.t(
              "msg_welcome_back",
              "Welcome back! Ask me any medical question or upload a report."
            )
          );
          return;
        }

        if (!id) {
          try {
            await fetch("/end_chat", { method: "POST" });
          } catch (e) {
            console.error("End chat error:", e);
          }
          state.activeConversationId = null;
          Utils.addSystemMessage(
            Conversation.t(
              "msg_new_conversation_started",
              "New conversation started. Upload a report or ask a question."
            )
          );
          return;
        }

        try {
          const res = await fetch(`/conversation/${id}`);
          if (!res.ok) throw new Error("Failed to load");
          const data = await res.json();

          data.messages.forEach((msg) => {
            const content =
              msg.role === "bot"
                ? marked.parse(msg.message || "")
                : Utils.escapeHtml(msg.message || "");
            Utils.addMessage(msg.role, content, false);
          });

          state.activeConversationId = data.conversation_id;
          DOM.messages.scrollTop = DOM.messages.scrollHeight;

          const firstMsg = data.messages[0]?.message || "";
          const preview =
            firstMsg.length > 40 ? firstMsg.substring(0, 40) + "..." : firstMsg;
          Utils.addSystemMessage(
            Conversation.t("msg_loaded_conversation", "Loaded conversation") +
              `: ${preview}`
          );
        } catch (err) {
          console.error("Load conversation error:", err);
          Utils.addSystemMessage(
            Conversation.t(
              "msg_could_not_load_history",
              "Could not load chat history. Starting a new session."
            )
          );
          state.activeConversationId = null;
        }
      },

      async toggleHistoryList(e) {
        e.preventDefault();
        let container = document.getElementById("historyListContainer");

        if (container) {
          container.remove();
          DOM.historyLink.classList.remove("active");
          return;
        }

        DOM.historyLink.classList.add("active");
        container = document.createElement("div");
        container.id = "historyListContainer";
        container.className = "history-list-container";
        DOM.historyLink.insertAdjacentElement("afterend", container);

        try {
          const res = await fetch("/conversations");
          const { conversations = [] } = await res.json();

          if (!conversations.length) {
            container.innerHTML = `
          <span style="padding:6px;color:var(--text-muted);">
            ${Conversation.t("msg_no_past_chats", "No past chats.")}
          </span>`;
            return;
          }

          conversations.forEach((conv) => {
            const row = document.createElement("div");
            row.className = "history-item-row";
            row.innerHTML = `
          <a href="#" class="sidebar-link history-item" data-id="${conv.id}">
            <i class="bi bi-chat-text"></i>
            <span>${Utils.escapeHtml(conv.title)}...</span>
          </a>
          <button class="delete-chat-btn" data-id="${conv.id}" title="${Conversation.t(
              "btn_delete",
              "Delete"
            )}">
            <i class="bi bi-trash"></i>
          </button>
        `;

            row.querySelector(".history-item").onclick = (ev) => {
              ev.preventDefault();
              DOM.sidebar.classList.remove("open");
              Conversation.load(conv.id);
            };

            row.querySelector(".delete-chat-btn").onclick = (ev) => {
              ev.stopPropagation();
              state.conversationToDelete = { id: conv.id, row };
              DOM.deleteModal.classList.remove("hidden");
            };

            container.appendChild(row);
          });
        } catch (err) {
          console.error("History Fetch Error:", err);
          container.innerHTML = `
        <span style="padding:6px;color:red;">
          ${Conversation.t("msg_error_loading_history", "Error loading history.")}
        </span>`;
        }
      },

      init() {
        DOM.newChatBtn?.addEventListener("click", () => this.load(null));
        DOM.historyLink?.addEventListener("click", (e) =>
          Conversation.toggleHistoryList(e)
        );

        // Delete modal — now fully translated
        DOM.cancelDeleteBtn.onclick = () => {
          DOM.deleteModal.classList.add("hidden");
          state.conversationToDelete = null;
        };

        DOM.confirmDeleteBtn.onclick = async () => {
          if (!state.conversationToDelete) return;
          const { id, row } = state.conversationToDelete;

          try {
            const res = await fetch(`/conversation/delete/${id}`, {
              method: "POST",
            });
            const data = await res.json();

            if (data.status === "success") {
              row.remove();
              if (state.activeConversationId === id) this.load(null);
              Utils.addSystemMessage(
                Conversation.t("msg_chat_deleted", "Conversation deleted.")
              );
            } else {
              alert(Conversation.t("msg_delete_failed", "Failed to delete chat."));
            }
          } catch (err) {
            console.error(err);
            alert(Conversation.t("msg_server_error", "Server error."));
          }

          DOM.deleteModal.classList.add("hidden");
          state.conversationToDelete = null;
        };
      },
    };

    // ================================================================
    // 7. CHAT INPUT & SEND MODULE
    // ================================================================
    const Chat = {
      async send(text) {
        if (!text.trim()) return;
        Utils.addMessage("user", Utils.escapeHtml(text));
        DOM.textInput.value = "";
        DOM.textInput.style.height = "auto";
        Utils.showTyping();

        try {
          const data = new URLSearchParams();
          data.append("msg", text);
          data.append("lang", currentLang);

          const res = await fetch("/get", { method: "POST", body: data });
          const response = await res.text();
          Utils.hideTyping();
          Utils.addMessage("bot", marked.parse(response || "No response"));

          // Refresh history if new conversation started
          if (
            !state.activeConversationId &&
            document.getElementById("historyListContainer")
          ) {
            document.getElementById("historyListContainer").remove();
            Conversation.toggleHistoryList(new Event("click"));
          }
        } catch (err) {
          Utils.hideTyping();
          Utils.addMessage(
            "bot",
            `<div style="color:var(--danger)">Error: could not reach server.</div>`
          );
          console.error(err);
        }
      },

      async upload(file) {
        if (!file) return;
        Utils.addMessage(
          "user",
          `<strong>Uploaded:</strong> ${Utils.escapeHtml(file.name)}`
        );
        Utils.showTyping();

        const fd = new FormData();
        fd.append("file", file);

        try {
          const res = await fetch("/upload_report", {
            method: "POST",
            body: fd,
          });
          const text = await res.text();
          Utils.hideTyping();
          Utils.addMessage(
            "bot",
            marked.parse(text || "No interpretation returned.")
          );
        } catch (err) {
          Utils.hideTyping();
          Utils.addMessage(
            "bot",
            `<div style="color:var(--danger)">Upload failed.</div>`
          );
        } finally {
          DOM.uploadInput.value = "";
        }
      },

      init() {
        DOM.sendBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          this.send(DOM.textInput.value.trim());
        });

        DOM.textInput?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            DOM.sendBtn.click();
          }
        });

        DOM.textInput?.addEventListener("input", () => {
          DOM.textInput.style.height = "auto";
          DOM.textInput.style.height =
            Math.min(220, DOM.textInput.scrollHeight) + "px";
        });

        DOM.attachBtn?.addEventListener("click", () => DOM.uploadInput.click());
        DOM.uploadInput?.addEventListener("change", (e) =>
          this.upload(e.target.files[0])
        );
      },
    };

    // ================================================================
    // 8. NEWS MODULE
    // ================================================================
    const News = {
      async show() {
        DOM.messages.innerHTML = "";

        const header = document.createElement("div");
        header.style.padding = "12px 8px";
        header.innerHTML = `<div style="font-weight:700;color:var(--primary);font-size:1.1rem">Latest Medical News</div>`;
        DOM.messages.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "news-grid";
        DOM.messages.appendChild(grid);

        const loading = document.createElement("div");
        loading.className = "news-loading";
        loading.textContent = "Loading news...";
        grid.appendChild(loading);

        try {
          const res = await fetch(`/news?lang=${currentLang}`);
          const data = await res.json();

          grid.innerHTML = "";

          if (!data?.news?.length) {
            grid.innerHTML =
              "<div style='color:var(--text-muted)'>No news available.</div>";
            return;
          }

          data.news.forEach((item) => {
            const imgSrc = item.image || "/static/default-news.png";
            const card = document.createElement("article");
            card.className = "news-tile";
            card.innerHTML = `
            <div class="news-card">
              <div class="news-img-wrap">
                <img class="news-img" src="${imgSrc}" onerror="this.src='/static/default-news.png'">
              </div>
              <div class="news-content">
                <h3 class="news-title">${Utils.escapeHtml(item.title)}</h3>
                <p class="news-summary">${Utils.escapeHtml(
                  (item.summary || "").slice(0, 200)
                )}...</p>
                <a class="news-link" href="${
                  item.link
                }" target="_blank">Read full article →</a>
              </div>
            </div>
          `;
            grid.appendChild(card);
          });

          DOM.messages.scrollTop = 0;
        } catch (err) {
          console.error("News fetch error:", err);
          grid.innerHTML =
            "<div style='color:red;padding:12px;'>Error loading news.</div>";
        }
      },

      init() {
        DOM.newsBtn?.addEventListener("click", () => this.show());
      },
    };

    // ================================================================
    // 9. RESPONSIVE & INITIALIZATION
    // ================================================================
    const Responsive = {
      adjustLangControls() {
        const pills = document.querySelector(".lang-pills");
        const dropdown = document.querySelector(".lang-dropdown");
        if (!pills || !dropdown) return;

        if (window.innerWidth <= 900) {
          dropdown.style.display = "block";
          pills.style.display = "none";
        } else {
          dropdown.style.display = "none";
          pills.style.display = "flex";
        }
      },

      init() {
        window.addEventListener("resize", () => this.adjustLangControls());
        this.adjustLangControls();
      },
    };

    // Inject required CSS (unchanged)
    const style = document.createElement("style");
    style.innerHTML = `
    @keyframes blink{0%{transform:scale(.6);opacity:.25}50%{transform:scale(1);opacity:1}100%{transform:scale(.6);opacity:.25}}
    .history-list-container { display: flex; flex-direction: column; padding-bottom: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--border); }
    .history-item { padding: 0.55rem 0.6rem; margin-left: 0.5rem; border-radius: 0.6rem; border-left: 3px solid transparent; }
    .history-item:hover { border-left: 3px solid var(--primary); }
  `;
    document.head.appendChild(style);

    // ================================================================
    // 10. APP INITIALIZATION
    // ================================================================
    Theme.init();
    UI.init();

    // Language must load FIRST
    await Language.init(); // ← Wait for translations to load

    Conversation.init();
    Chat.init();
    News.init();
    Responsive.init();

    // Now safe: translations are ready → system messages will be translated
    Conversation.load(null);

    // FINAL: Re-apply translations in case DOM changed after load
    applyTranslations(currentLang);
  });
})();
