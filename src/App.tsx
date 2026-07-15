import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, LayoutGrid, User } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import SwipeView from "./components/SwipeView";
import ChatView from "./components/ChatView";
import ProfileView from "./components/ProfileView";
import MovieListView from "./components/MovieListView";

type Tab = "chat" | "swipe" | "profile" | "movies";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [accentColor, setAccentColor] = useState("#c9c6c5");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("userId"));
  const [movieListType, setMovieListType] = useState<'Watched' | 'Watchlist'>('Watched');


  // Global theme update based on accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-glow', accentColor);
  }, [accentColor]);

  const renderContent = () => {
    if (!isAuthenticated) return <LoginView onLogin={(id) => { localStorage.setItem("userId", id); setIsAuthenticated(true); }} />;
    switch (activeTab) {
      case "chat": return <ChatView />;
      case "swipe": return <SwipeView onColorExtracted={setAccentColor} />;
      case "profile": return <ProfileView onViewList={(type) => { setMovieListType(type); setActiveTab("movies"); }} />;
      case "movies": return <MovieListView listType={movieListType} onBack={() => setActiveTab("profile")} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={(id) => { localStorage.setItem("userId", id); setIsAuthenticated(true); }} />;
  }

  return (
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

      <header id="main-header" className={`${activeTab === 'profile' ? 'absolute' : 'fixed'} top-0 w-full bg-[#141313]/80 backdrop-blur-3xl border-b border-white/10 flex justify-center items-center px-6 h-16 z-50`}>
        <div className="font-bold text-2xl tracking-tighter text-[#c9c6c5] font-display">WatchIt</div>
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <nav id="bottom-nav" className="flex items-center gap-2 p-2 bg-[#1c1b1b]/90 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full">
          <NavItem 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={<MessageSquare className="w-5 h-5 flex-shrink-0" />} 
            label="Chat"
            accentColor={accentColor}
          />
          <NavItem 
            active={activeTab === 'swipe'} 
            onClick={() => setActiveTab('swipe')} 
            icon={<LayoutGrid className="w-5 h-5 flex-shrink-0" />} 
            label="Swipe"
            accentColor={accentColor}
          />
          <NavItem 
            active={activeTab === 'profile' || activeTab === 'movies'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User className="w-5 h-5 flex-shrink-0" />} 
            label="Profile"
            accentColor={accentColor}
          />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, accentColor }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, accentColor: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center transition-all duration-300 rounded-full px-5 py-3 overflow-hidden ${active ? 'bg-white/10' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
      style={{ color: active ? accentColor : undefined }}
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
              className="text-sm font-bold tracking-wide whitespace-nowrap"
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

function LoginView({ onLogin }: { onLogin: (id: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(isRegister ? "/api/register" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (res.ok && data.id) {
        onLogin(data.id);
      } else {
        setError(data.error || (isRegister ? "Registration failed" : "Login failed"));
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-white/10 relative overflow-hidden">
      {/* Hidden preloader for the swipe page */}
      <div className="hidden pointer-events-none" aria-hidden="true">
        <SwipeView onColorExtracted={() => {}} />
      </div>

      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(201,198,197,0.15)_0%,transparent_100%)] pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-bold mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-[#c9c6c5]">WatchIt</h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest">{isRegister ? "Create an account" : "Welcome back"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username" 
              className="w-full bg-black/50 text-white px-5 py-4 rounded-xl border border-white/10 outline-none focus:border-[#c9c6c5] transition-all placeholder:text-white/30"
              required
            />
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password" 
              className="w-full bg-black/50 text-white px-5 py-4 rounded-xl border border-white/10 outline-none focus:border-[#c9c6c5] transition-all placeholder:text-white/30"
              required
            />
          </div>
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.p>
          )}
          <button 
            type="submit" 
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-[#e5e2e1] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            {loading ? (isRegister ? "Creating..." : "Entering...") : (isRegister ? "Sign Up" : "Sign In")}
          </button>
        </form>
        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
