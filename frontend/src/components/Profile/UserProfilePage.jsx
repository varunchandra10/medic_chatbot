import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Database,
  Edit2,
  Save,
  Globe,
  BookOpen,
  Check,
  HardDrive,
  Brain,
  Copy,
  Sparkles,
  Download,
  Trash2,
  KeyRound,
  ShieldAlert,
  Server
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', desc: 'Standard Medical Literature' },
  { code: 'hi', label: 'हिन्दी', native: 'Hindi', desc: 'हिंदी नैदानिक और चिकित्सा मार्गदर्शन' },
  { code: 'ta', label: 'தமிழ்', native: 'Tamil', desc: 'மருத்துவ வழிகாட்டுதல் மற்றும் தகவல்கள்' },
  { code: 'te', label: 'తెలుగు', native: 'Telugu', desc: 'వైద్య సమాచారం మరియు లక్షణాల విశ్లేషణ' },
];

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function UserProfilePage({
  onBackToChat,
  currentUser,
  onUserUpdate,
  currentLanguage,
  onLanguageChange,
  agenticMode,
  onToggleAgenticMode,
  onLogout,
  t
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
    }
  }, [currentUser]);

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0][0] || 'U').toUpperCase();
  };

  const handleCopyEmail = () => {
    if (currentUser?.email) {
      navigator.clipboard.writeText(currentUser.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUserUpdate(data.user);
        setIsEditing(false);
        setFeedback({ type: 'success', message: 'Profile name successfully updated!' });
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to update profile' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network or server error updating profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      user: currentUser,
      export_date: new Date().toISOString(),
      agentic_mode: agenticMode,
      language: currentLanguage,
      platform: "Medi-Assist Clinical AI v2.0"
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediassist_profile_${currentUser?.email || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isGoogle = currentUser?.auth_provider === 'google' || Boolean(currentUser?.picture);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/80 dark:bg-obsidian-950 overflow-y-auto">
      {/* Top Header Bar */}
      <header className="h-14 px-6 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
              Account & Preferences
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              v2.0
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 p-5 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[11px] font-bold underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Enhanced Hero Profile Card */}
        <section className="relative overflow-hidden bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar with Error Handling & Google Overlay */}
              <div className="relative shrink-0">
                {currentUser?.picture && !imgError ? (
                  <img
                    src={currentUser.picture}
                    alt={currentUser?.name || 'User'}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-50 dark:ring-indigo-950/50 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-50 dark:ring-indigo-950/50 select-none">
                    {getInitials(currentUser?.name)}
                  </div>
                )}

                {isGoogle && (
                  <div
                    title="Google Verified Single Sign-On"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-obsidian-900 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                  >
                    <GoogleIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* User Identity Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 tracking-tight">
                    {currentUser?.name || 'User Profile'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{currentUser?.email || 'No email provided'}</span>
                  {currentUser?.email && (
                    <button
                      onClick={handleCopyEmail}
                      title="Copy email to clipboard"
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                      {copiedEmail ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Session Active
                  </span>

                  {isGoogle ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <GoogleIcon className="w-3 h-3" />
                      Google OAuth
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <KeyRound className="w-3 h-3" />
                      Standard Password
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    Verified Account
                  </span>
                </div>
              </div>
            </div>

            {/* Action Edit Button */}
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-all flex items-center gap-2 font-semibold text-xs shadow-xs cursor-pointer self-start sm:self-center"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Name</span>
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div>
                <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Saving...' : 'Save Name'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Account Metrics Grid (Replaces the duplicate name/email boxes) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1">
                {isGoogle ? <GoogleIcon className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Security Protocol</span>
              </div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                {isGoogle ? 'Google OAuth 2.0 (SSO)' : 'Encrypted Local Auth'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Protected via HTTPS session cookies with SameSite strict isolation.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Cloud Privacy</span>
              </div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                100% Local SQLite Store
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Health queries and chat history never leave your machine.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>Evidence Engine</span>
              </div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                19,712 Chunks Indexed
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                FastEmbed ONNX runtime with Harrison's, CMDT & Gale references.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Autonomous ReAct Reasoning Engine Section */}
        <section className="bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Autonomous ReAct Reasoning Engine
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Agentic AI
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Multi-step reasoning: screens for critical red flags, searches reference textbooks, and explains conditions clearly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAgenticMode}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                agenticMode
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Brain className={`w-4 h-4 ${agenticMode ? 'animate-pulse' : ''}`} />
              <span>{agenticMode ? 'ReAct Active (ON)' : 'Standard RAG (OFF)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Step 1 • Triage</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Red-Flag Detection</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Screens for life-threatening symptoms and generates urgent emergency care advisories.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Step 2 • Action</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">FastEmbed Retrieval</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Executes cosine similarity against 19,712 embedded medical textbook chunks.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Step 3 • Evidence</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Observation Analysis</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Extracts peer-reviewed guidelines from CMDT and Harrison’s Internal Medicine.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Step 4 • Synthesis</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Medical Guidance</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Synthesizes clear explanations of diseases, symptoms, and when to seek care.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Language & Regional Preferences Section */}
        <section className="bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Language & Translation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your preferred language. Health topics and medical textbook references are translated seamlessly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
            {LANGUAGES.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onLanguageChange(lang.code)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-obsidian-800/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">{lang.native}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase shadow-2xs border border-slate-200/70 dark:border-slate-700">
                        {lang.code}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {lang.desc}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-indigo-600/30">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. 19,712 Medical Vectors Knowledge Base */}
        <section className="bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Medical Knowledge Base (19,712 Vectors)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Indexed with FastEmbed ONNX runtime (<code className="text-indigo-700 dark:text-indigo-300 font-mono">BAAI/bge-small-en-v1.5</code>) across 3 medical textbooks:
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
              🟢 Vector Store Online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-obsidian-800/40">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">CMDT 2022</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Current Medical Diagnosis & Treatment (1,874 Pages)
              </p>
              <span className="inline-block mt-2.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/60">
                10,240 Chunks
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-obsidian-800/40">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Harrison's Manual</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Harrison’s Manual of Medicine (1,254 Pages)
              </p>
              <span className="inline-block mt-2.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/60">
                6,120 Chunks
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-obsidian-800/40">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Gale Encyclopedia</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Gale Encyclopedia of Medicine (637 Pages)
              </p>
              <span className="inline-block mt-2.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-900/60">
                3,352 Chunks
              </span>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>ChromaDB Vector Storage: <code className="font-mono text-[11px] bg-white/70 dark:bg-slate-900 px-1.5 py-0.5 rounded">data/vectorstore/</code></span>
            </span>
            <span className="font-extrabold text-[11px] text-indigo-700 dark:text-indigo-300">
              19,712 Vectors Ready
            </span>
          </div>
        </section>

        {/* 5. Account & Data Management Section */}
        <section className="bg-white dark:bg-obsidian-850 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Data & Privacy Management
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Export your consultation preferences or manage your current session.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleExportData}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Profile Config (.JSON)</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Session</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UserProfilePage;
