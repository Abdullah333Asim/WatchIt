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

const MessageContent = ({ content, existingWatchlistIds }: { content: string, existingWatchlistIds: Set<string> }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAddedIds(new Set(existingWatchlistIds));
  }, [existingWatchlistIds]);

  const handleAddWatchlist = async (movieId: string) => {
    if (!movieId || addedIds.has(movieId)) return;
    try {
      await fetchWithUser('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, action: 'Watchlist' })
      });
      setAddedIds(prev => new Set(prev).add(movieId));
    } catch(e) {}
  };

  try {
    const data = JSON.parse(content);
    if (data.reply && data.recommendations) {
      return (
        <div className="flex flex-col gap-4">
          <div className="markdown-body">
            <Markdown>{data.reply}</Markdown>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {data.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-lg">
                {rec.poster_url && (
                  <div className="h-48 w-full shrink-0 relative">
                    <img src={rec.poster_url} alt={rec.title} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1 gap-2 relative z-10 -mt-10">
                  <div className="flex justify-between items-start gap-2 drop-shadow-md">
                    <h3 className="font-display font-bold text-white text-lg leading-tight">{rec.title}</h3>
                    <span className="text-xs font-bold bg-black/60 text-white/90 px-2 py-1 rounded-md shrink-0 border border-white/10">{rec.year}</span>
                  </div>
                  <p className="text-xs text-white/80 mt-2">{rec.synopsis}</p>
                  <div className="mt-auto pt-4 flex flex-col gap-3">
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-[10px] text-[#00dce5] uppercase font-bold tracking-wider mb-1">Why it matches</p>
                      <p className="text-xs text-white/80 italic">"{rec.why_it_matches}"</p>
                    </div>
                    {rec.movie_id && (
                      <button 
                        onClick={() => handleAddWatchlist(rec.movie_id)}
                        disabled={addedIds.has(rec.movie_id)}
                        className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10 mt-1"
                      >
                        {addedIds.has(rec.movie_id) ? <><Sparkles className="w-3 h-3" /> Added to Watchlist</> : <><Plus className="w-3 h-3" /> Add to Watchlist</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  } catch (e) {
    // Not valid JSON, fallback to markdown
  }
  return (
    <div className="markdown-body">
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default function ChatView({ onSidebarToggle }: { onSidebarToggle?: (isOpen: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
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
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await fetchWithUser('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const ids = data.history
          .filter((item: any) => item.action === 'Watchlist' || item.action === 'Watched')
          .map((item: any) => item.id);
        setWatchlistIds(new Set(ids));
      }
    } catch (e) {}
  };

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
    <div className="h-[calc(100vh-160px)] flex flex-col relative w-full">
      {/* Top Bar Navigation */}
      <div className="w-full flex justify-between px-6 pt-4 z-20 shrink-0 md:fixed md:top-16 md:left-0 md:w-auto md:flex-col md:gap-2 md:pt-4 md:pl-6 pointer-events-none md:[&>*]:pointer-events-auto">
        <button onClick={() => setIsSidebarOpen(true)} className="pointer-events-auto glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={startNewChat} className="pointer-events-auto glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="max-w-2xl mx-auto w-full flex flex-col relative flex-grow overflow-hidden">


      <div className={`flex-grow overflow-y-auto pb-24 scrollbar-hide px-6 ${messages.length === 0 ? 'flex flex-col items-center justify-center -mt-16 md:mt-0' : 'pt-4 space-y-6'}`}>
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
                <div className={`${msg.role === 'user' ? 'max-w-[85%] md:max-w-[75%]' : 'w-full max-w-full md:max-w-[95%]'} rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#2b2a2a] text-white rounded-br-sm shadow-xl px-4 py-2' 
                    : 'glass-panel text-[#e5e2e1] rounded-bl-sm border-white/10 p-4'
                }`}>
                  <MessageContent content={msg.content} existingWatchlistIds={watchlistIds} />
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
    </div>
  );
}
