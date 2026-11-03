import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth states
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const googleBtnContainerRef = useRef(null);

  // 1. Fetch Auth Config (Google Client ID) and load Google Identity Services
  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      })
      .catch((err) => console.log('[Auth] Config load error:', err));
  }, []);

  useEffect(() => {
    if (googleClientId) {
      loadGoogleGSI(googleClientId);
    }
  }, [googleClientId]);

  const loadGoogleGSI = (clientId) => {
    if (window.google?.accounts?.id) {
      initGoogleGSI(clientId);
      return;
    }

    const existing = document.getElementById('google-gsi-client');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleGSI(clientId);
      document.head.appendChild(script);
    } else {
      existing.onload = () => initGoogleGSI(clientId);
    }
  };

  const initGoogleGSI = (clientId) => {
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const isDark = document.documentElement.classList.contains('dark');

    if (googleBtnContainerRef.current) {
      googleBtnContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        width: 360,
        shape: 'pill',
        text: 'continue_with',
      });
      setGsiLoaded(true);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setFeedback({ type: 'success', message: `Welcome, ${data.user.name}!` });
        setTimeout(() => onAuthSuccess(data.user), 600);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Google Sign-In failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Could not connect to authentication server.' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Direct 1-Click Google OAuth Trigger
  const handleGoogleButtonClick = () => {
    setGoogleLoading(true);
    setFeedback(null);

    // 1. If Google GIS OAuth2 Token Client is available, launch native Google popup
    if (window.google?.accounts?.oauth2 && googleClientId) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              setFeedback({ type: 'error', message: 'Google sign-in was cancelled or closed.' });
              return;
            }
            if (tokenResponse.access_token) {
              try {
                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ access_token: tokenResponse.access_token }),
                });
                const data = await res.json();
                if (res.ok && data.user) {
                  setFeedback({ type: 'success', message: `Welcome, ${data.user.name}!` });
                  setTimeout(() => onAuthSuccess(data.user), 600);
                } else {
                  setFeedback({ type: 'error', message: data.message || 'Google verification failed.' });
                }
              } catch {
                setFeedback({ type: 'error', message: 'Failed to authenticate with server.' });
              } finally {
                setGoogleLoading(false);
              }
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('[Google OAuth] TokenClient popup error, falling back to redirect:', err);
      }
    }

    // 2. Direct server-side Google OAuth 2.0 redirect fallback
    window.location.href = '/api/auth/google/login';
  };

  // 2. Standard Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setFeedback({ type: 'success', message: `Welcome back, ${data.user.name}!` });
        setTimeout(() => onAuthSuccess(data.user), 600);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Invalid email or password.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Cannot reach server. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Simple Account Registration (No clinical role, no specialization, no age)
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if ((res.ok || res.status === 201) && data.user) {
        setFeedback({ type: 'success', message: 'Account created! Signing you in...' });
        setTimeout(() => onAuthSuccess(data.user), 600);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Registration failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Cannot reach server. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50 dark:from-obsidian-950 dark:via-slate-950 dark:to-obsidian-950 p-4">
      <div className="w-full max-w-md">

        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-3">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Medi-Assist
          </h1>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase mt-0.5">
            Personal Health AI Guide
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('login'); setFeedback(null); }}
              className={`flex-1 py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setFeedback(null); }}
              className={`flex-1 py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
          </div>

          <div className="p-6 sm:p-7">
            {/* Feedback Alert */}
            {feedback && (
              <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {feedback.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  : <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                }
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

            {/* ── GOOGLE SIGN-IN PRIMARY BUTTON ── */}
            <div className="mb-5">
              {/* GIS official rendered Google button */}
              <div ref={googleBtnContainerRef} className="flex justify-center" />

              {/* Fallback button if GIS hasn't loaded */}
              {!gsiLoaded && (
                <button
                  type="button"
                  onClick={handleGoogleButtonClick}
                  disabled={googleLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-3 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-all active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white dark:bg-obsidian-900 px-3 text-slate-400">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* ── LOGIN FORM ── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="user@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all mt-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── CLEAN REGISTER FORM (No clinical role, specialization, or age) ── */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your Full Name"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="user@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all mt-1"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4">
          Personal health data is stored locally in SQLite with zero cloud telemetry.
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
