import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, LayoutGrid, User } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { loginWithGoogle, auth } from "./lib/firebase.ts";
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

  if (!isAuthenticated) {
    return (
      <>
        {showSplash && <SplashAnimation onComplete={() => setShowSplash(false)} />}
        <LoginView />
      </>
    );
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
  
  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setError("Login failed");
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
        className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-bold mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-[#c9c6c5]">WatchIt</h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest">Welcome back</p>
        </div>
        <div className="space-y-6">
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
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-[#e5e2e1] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            {loading ? "Entering..." : "Sign in with Google"}
          </button>
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
