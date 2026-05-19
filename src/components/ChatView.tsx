import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, PlusCircle, ArrowUp, Menu, Plus, MessageSquare, X } from "lucide-react";
import Markdown from "react-markdown";

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Ah, welcome to the lobby. Tell me, what kind of cinematic journey are you seeking today? Give me a vibe, a feeling, or even a rainy day mood." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setCurrentConversationId(id);
        setIsSidebarOpen(false);
      }
    } catch (e) {
      console.error('Failed to load conversation', e);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([{ role: 'ai', content: "Ah, welcome to the lobby. Tell me, what kind of cinematic journey are you seeking today? Give me a vibe, a feeling, or even a rainy day mood." }]);
    setIsSidebarOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, conversationId: currentConversationId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        fetchConversations();
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Forgive me, the projector seems to have jammed. Could you try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-160px)] flex flex-col relative w-full">
      {/* Top Bar Navigation */}
      <div className="w-full flex justify-between px-6 pt-4 z-20 shrink-0">
        <button onClick={() => setIsSidebarOpen(true)} className="glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={startNewChat} className="glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center text-center mt-2 mb-8 space-y-3 px-6">
        <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center shadow-xl">
          <Sparkles className="w-8 h-8 text-[#c9c6c5]" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Vibe Engine</h1>
        <p className="text-white/60">Your personal cinematic curator.</p>
      </div>

      <div className="flex-grow overflow-y-auto space-y-6 pb-24 scrollbar-hide px-6">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-[#2b2a2a] text-white rounded-br-sm shadow-xl' 
                : 'glass-panel text-[#e5e2e1] rounded-bl-sm border-white/10'
            }`}>
              <div className="markdown-body">
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex justify-start"
          >
            <div className="glass-panel p-4 rounded-2xl rounded-bl-sm border-white/10 flex gap-2">
              <span className="w-2 h-2 bg-[#c9c6c5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#c9c6c5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#c9c6c5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Floating Input */}
      <div className="fixed bottom-24 left-0 w-full px-6 flex justify-center z-40 block">
        <div className="w-full max-w-2xl relative">
          <div className="glass-panel rounded-full p-1 flex items-center border border-white/10 focus-within:border-white/30 transition-all shadow-2xl">
            <button className="p-3 text-white/40 hover:text-[#c9c6c5] transition-colors rounded-full">
              <PlusCircle className="w-6 h-6" />
            </button>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-grow bg-transparent border-none text-white placeholder:text-white/20 focus:ring-0 px-2 h-12 outline-none" 
              placeholder="Tell me what you're feeling..." 
              type="text"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-[#2b2a2a] text-white p-3 rounded-full w-10 h-10 flex items-center justify-center mr-1 hover:bg-[#3b3a3a] disabled:opacity-50 transition-all"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar for Chat History */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 w-72 h-full bg-[#141313]/95 backdrop-blur-3xl border-r border-white/10 z-[65] shadow-2xl flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h2 className="text-xl font-display font-bold text-white">History</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <button onClick={startNewChat} className="flex shrink-0 items-center gap-3 w-full text-left p-3 rounded-xl bg-[#c9c6c5] text-[#141313] font-semibold mb-6 shadow-lg hover:bg-white transition-colors">
                 <Plus className="w-5 h-5" /> New Chat
              </button>

              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pb-20">
                 {conversations.map(c => (
                   <button 
                      key={c.id} 
                      onClick={() => loadConversation(c.id)} 
                      className={`w-full text-left p-3 rounded-xl flex border border-white/5 items-center gap-3 hover:bg-white/10 transition-colors ${c.id === currentConversationId ? 'bg-white/10 text-white' : 'text-white/60'}`}
                   >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium truncate">{c.title}</span>
                   </button>
                 ))}
                 {conversations.length === 0 && (
                    <p className="text-sm text-white/40 text-center mt-10">No past conversations.</p>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
