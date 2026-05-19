import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, LayoutGrid, User, Bell, Film } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import SwipeView from "./components/SwipeView";
import ChatView from "./components/ChatView";
import ProfileView from "./components/ProfileView";

type Tab = "chat" | "swipe" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [accentColor, setAccentColor] = useState("#c9c6c5");

  // Global theme update based on accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-glow', accentColor);
  }, [accentColor]);

  const renderContent = () => {
    switch (activeTab) {
      case "chat": return <ChatView />;
      case "swipe": return <SwipeView onColorExtracted={setAccentColor} />;
      case "profile": return <ProfileView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#141313] text-[#e5e2e1] font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Ambient background glow that follows accent color */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 transition-all duration-1000 z-0"
        style={{
          background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)`,
          filter: 'blur(100px)'
        }}
      />

      <header id="main-header" className="fixed top-0 w-full bg-[#141313]/80 backdrop-blur-3xl border-b border-white/10 flex justify-between items-center px-6 h-16 z-50">
        <div className="flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer">
          <Film className="w-5 h-5" />
        </div>
        <div className="font-bold text-2xl tracking-tighter text-[#c9c6c5] font-display">CINE NOIR</div>
        <div className="flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer">
          <Bell className="w-5 h-5" />
        </div>
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
      <nav id="bottom-nav" className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-3 pb-6 px-6 bg-[#141313]/95 backdrop-blur-3xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <NavItem 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')} 
          icon={<MessageSquare className="w-6 h-6" />} 
          label="Chat"
          accentColor={accentColor}
        />
        <NavItem 
          active={activeTab === 'swipe'} 
          onClick={() => setActiveTab('swipe')} 
          icon={<LayoutGrid className="w-6 h-6" />} 
          label="Swipe"
          accentColor={accentColor}
        />
        <NavItem 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
          icon={<User className="w-6 h-6" />} 
          label="Profile"
          accentColor={accentColor}
        />
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, accentColor }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, accentColor: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center transition-all duration-300 group ${active ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
      style={{ color: active ? accentColor : undefined }}
    >
      <div className={`relative ${active ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="w-1 h-1 rounded-full mt-1"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
        />
      )}
    </button>
  );
}
