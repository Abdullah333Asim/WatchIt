import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, PlusCircle, ArrowUp, Menu, Plus, MessageSquare, X } from "lucide-react";
import Markdown from "react-markdown";
import { fetchWithUser } from "../lib/api";

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatView({ onSidebarToggle }: { onSidebarToggle?: (isOpen: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    onSidebarToggle?.(isSidebarOpen);
  }, [isSidebarOpen, onSidebarToggle]);

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
      const res = await fetchWithUser('/api/conversations');
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
      const res = await fetchWithUser(`/api/conversations/${id}`);
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
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetchWithUser('/api/chat', {
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

      <div className={`flex-grow overflow-y-auto pb-24 scrollbar-hide px-6 ${messages.length === 0 ? 'flex flex-col items-center justify-center -mt-16' : 'pt-4 space-y-6'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-sans font-normal text-[#c9c6c5] tracking-tight mb-2 shadow-sm drop-shadow">
              What are we watching today?
            </h1>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Floating Input */}
      <div className="fixed bottom-24 left-0 w-full px-6 flex justify-center z-40 block">
        <div className="w-full max-w-2xl relative">
          <div className="bg-[#1a1a1a]/80 backdrop-blur-3xl rounded-full p-1.5 pl-4 flex items-center border border-white/10 focus-within:border-white/30 focus-within:bg-[#2b2a2a]/90 transition-all shadow-2xl">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-grow bg-transparent border-none text-white placeholder:text-white/40 focus:ring-0 px-2 h-10 outline-none text-base" 
              placeholder="Ask WatchIt" 
              type="text"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={`p-2 rounded-full w-10 h-10 flex items-center justify-center mr-0.5 transition-all ${
                input.trim() && !loading 
                  ? 'bg-white text-black hover:bg-gray-200 shadow-lg' 
                  : 'bg-[#2b2a2a] text-white/30'
              }`}
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
              className="fixed top-0 left-0 w-72 h-full bg-[#111111] border-r border-white/5 z-[65] shadow-2xl flex flex-col p-4"
            >
              <div className="flex items-center mb-6 shrink-0 pt-2">
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              
              <button onClick={startNewChat} className="flex shrink-0 items-center gap-3 w-fit text-left px-4 py-2.5 rounded-full bg-[#222] hover:bg-[#333] text-white text-sm font-medium mb-8 transition-colors">
                 <Plus className="w-4 h-4" /> New chat
              </button>

              <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pb-20">
                 <div className="text-xs font-semibold text-white/40 mb-3 px-4">Recent</div>
                 {conversations.map(c => (
                   <button 
                      key={c.id} 
                      onClick={() => loadConversation(c.id)} 
                      className={`w-full text-left px-4 py-2.5 rounded-full flex items-center gap-3 transition-colors ${c.id === currentConversationId ? 'bg-[#2b2a2a] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                   >
                      <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="text-sm font-normal truncate">{c.title}</span>
                   </button>
                 ))}
                 {conversations.length === 0 && (
                    <p className="text-sm text-white/40 px-4 mt-2">No recent chats.</p>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
