import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, LayoutGrid, User } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { loginWithGoogle, auth, loginGuest, registerGuest } from "./lib/firebase.ts";
import { onAuthStateChanged } from "firebase/auth";
import SwipeView from "./components/SwipeView";
import ChatView from "./components/ChatView";
import ProfileView from "./components/ProfileView";
import MovieListView from "./components/MovieListView";
import SplashAnimation from "./components/SplashAnimation";
import LogoAnimation from "./components/LogoAnimation";

type Tab = "chat" | "swipe" | "profile" | "movies";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [logoAnimTrigger, setLogoAnimTrigger] = useState(0);
  const [accentColor, setAccentColor] = useState("#c9c6c5");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  useEffect(() => {
    const guestToken = localStorage.getItem('guest_token');
    if (guestToken) {
      setIsAuthenticated(true);
      setIsAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);
  const [movieListType, setMovieListType] = useState<'Watched' | 'Watchlist'>('Watched');
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  useEffect(() => { setLogoAnimTrigger(p => p + 1); }, [activeTab]);

  // Global theme update based on accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-glow', accentColor);
  }, [accentColor]);

  const renderContent = () => {
    if (isAuthLoading) return null;
    if (!isAuthenticated) return <LoginView />;
    switch (activeTab) {
      case "chat": return <ChatView onSidebarToggle={setIsChatSidebarOpen} />;
      case "swipe": return <SwipeView onColorExtracted={setAccentColor} />;
      case "profile": return <ProfileView onViewList={(type) => { setMovieListType(type); setActiveTab("movies"); }} />;
      case "movies": return <MovieListView listType={movieListType} onBack={() => setActiveTab("profile")} />;
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <>
      {showSplash && <SplashAnimation onComplete={() => setShowSplash(false)} />}
      <div 
        className="min-h-screen text-[#e5e2e1] font-sans selection:bg-white/10 overflow-x-hidden transition-colors duration-700 bg-black"
      >
      {/* Ambient background glow that follows accent color */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-1000 z-0 opacity-50"
        style={{
          background: activeTab === 'chat' 
            ? 'transparent'
            : activeTab === 'swipe'
            ? `radial-gradient(ellipse at 50% -20%, ${accentColor}80 0%, transparent 80%)`
            : `radial-gradient(circle at top center, ${accentColor}20 0%, transparent 70%)`,
        }}
      />

      <header id="main-header" className={`${activeTab === 'profile' ? 'absolute' : 'fixed'} top-0 w-full bg-transparent flex justify-center items-center px-6 h-16 z-50 pointer-events-none transition-opacity duration-300 ${isChatSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>
        <LogoAnimation trigger={logoAnimTrigger} />
      </header>

      <main className="pt-16 pb-24 md:pb-0 md:pt-16 min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <nav id="bottom-nav" className="flex items-center gap-1 p-1.5 bg-[#1c1b1b]/90 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full">
          <NavItem 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<MessageSquare className="w-[18px] h-[18px] flex-shrink-0" />} 
            label="Chat"
          />
          <NavItem 
            active={activeTab === 'swipe'} 
            onClick={() => setActiveTab('swipe')} 
            icon={<CardsIcon className="w-[18px] h-[18px] flex-shrink-0" />} 
            label="Swipe"
          />
          <NavItem 
            active={activeTab === 'profile' || activeTab === 'movies'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User className="w-[18px] h-[18px] flex-shrink-0" />} 
            label="Profile"
          />
        </nav>
      </div>
    </div>
    </>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center transition-all duration-300 rounded-full px-4 py-2.5 overflow-hidden ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
    >
      <div className={`relative z-10 flex items-center justify-center gap-2 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
        {icon}
        <AnimatePresence mode="popLayout">
          {active && (
            <motion.span 
              initial={{ opacity: 0, width: 0, scale: 0.8 }}
              animate={{ opacity: 1, width: "auto", scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-bold tracking-wide whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {active && (
        <motion.div 
          layoutId="nav-bg"
          className="absolute inset-0 bg-white/5 rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}


function LoginView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("");
      } else {
        console.error(err);
        setError(err.message || "Google Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    if (loading) return;
    if (!username || !password) {
      setError("Please provide both username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }
      localStorage.setItem('guest_token', data.token);
      window.location.reload(); // Reload to update auth state across the app
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-white/10 relative overflow-hidden">
      <div className="hidden" aria-hidden="true"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(201,198,197,0.15)_0%,transparent_100%)] pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10 bg-[#111] backdrop-blur-md"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-2"><LogoAnimation trigger={0} /></div>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest mt-2">{isRegister ? "Create Guest Account" : "Welcome back"}</p>
        </div>

        <div className="space-y-5">
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.p>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none outline-none focus:border-[#c9c6c5] focus:bg-white/10 transition-all placeholder:text-white/30"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none outline-none focus:border-[#c9c6c5] focus:bg-white/10 transition-all placeholder:text-white/30"
            />
            <button 
              onClick={handleGuestAuth}
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-[#e5e2e1] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              {loading ? "Entering..." : isRegister ? "Register" : "Sign In"}
            </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-wider font-medium">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          <div className="pt-2 text-center">
            <button 
              onClick={() => { setIsRegister(!isRegister); setError(""); }} 
              className="text-white/40 text-sm hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
            >
              {isRegister ? "Already have an account? Sign in." : "New here? Create guest account."}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
function CardsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="7" y="5" width="10" height="14" rx="2" transform="rotate(-30 12 19)" />
      <rect x="7" y="5" width="10" height="14" rx="2" transform="rotate(30 12 19)" />
      <rect x="7" y="5" width="10" height="14" rx="2" fill="#1c1b1b" />
    </svg>
  );
}
