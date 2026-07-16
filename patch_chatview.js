import fs from 'fs';
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf-8');

const oldMessageContent = `const MessageContent = ({ content }: { content: string }) => {
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
              <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-display font-bold text-white text-lg leading-tight">{rec.title}</h3>
                  <span className="text-xs font-bold bg-white/10 text-white/80 px-2 py-1 rounded-md shrink-0">{rec.year}</span>
                </div>
                <p className="text-xs text-white/60 line-clamp-3">{rec.synopsis}</p>
                <div className="mt-auto pt-2 border-t border-white/5">
                  <p className="text-[10px] text-[#00dce5] uppercase font-bold tracking-wider mb-1">Why it matches</p>
                  <p className="text-xs text-white/80 italic">"{rec.why_it_matches}"</p>
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
};`;

const newMessageContent = `const MessageContent = ({ content }: { content: string }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

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
};`;

code = code.replace(oldMessageContent, newMessageContent);

const oldDiv = `<div className={\`max-w-[85%] md:max-w-[75%] rounded-2xl \${
                  msg.role === 'user' 
                    ? 'bg-[#2b2a2a] text-white rounded-br-sm shadow-xl px-4 py-2' 
                    : 'glass-panel text-[#e5e2e1] rounded-bl-sm border-white/10 p-4 w-full'
                }\`}>`;
                
const newDiv = `<div className={\`\${msg.role === 'user' ? 'max-w-[85%] md:max-w-[75%]' : 'w-full max-w-full md:max-w-[95%]'} rounded-2xl \${
                  msg.role === 'user' 
                    ? 'bg-[#2b2a2a] text-white rounded-br-sm shadow-xl px-4 py-2' 
                    : 'glass-panel text-[#e5e2e1] rounded-bl-sm border-white/10 p-4'
                }\`}>`;
                
code = code.replace(oldDiv, newDiv);
fs.writeFileSync('src/components/ChatView.tsx', code);
